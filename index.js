const { Client, WebhookClient } = require('discord.js-selfbot-v13');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const BOT_USERNAME = process.env.BOT_USERNAME || "Bot";
const TARGET_GUILD_ID = process.env.TARGET_GUILD_ID;
const TARGET_CATEGORY_ID = process.env.TARGET_CATEGORY_ID || null;
const COPY_CATEGORY_STRUCTURE = process.env.COPY_CATEGORY_STRUCTURE === 'true';
const WEBHOOKS_FILE = path.join(__dirname, 'webhooks.json');
const CHANNELS_FILE = path.join(__dirname, 'channels.json');

// New modes
const USE_BOT_MODE = process.env.USE_BOT_MODE === 'true';
const BOT_TOKEN = process.env.BOT_TOKEN || null;
const SOURCE_GUILD_ID = process.env.SOURCE_GUILD_ID || null;
const FULL_SERVER_COPY = process.env.FULL_SERVER_COPY === 'true';

// Storage for channel mappings: { sourceChannelId: { webhookUrl, targetChannelId, targetChannelName } }
let channelWebhookMap = {};

// Lock to prevent concurrent webhook creation for the same channel
const creationLocks = new Map();

// Load existing webhook mappings from file
function loadWebhookMappings() {
    try {
        if (fs.existsSync(WEBHOOKS_FILE)) {
            const data = fs.readFileSync(WEBHOOKS_FILE, 'utf8');
            channelWebhookMap = JSON.parse(data);
            console.log('📂 Loaded existing webhook mappings:', Object.keys(channelWebhookMap).length);
        } else {
            console.log('📂 No existing webhook mappings found, starting fresh');
        }
    } catch (error) {
        console.error('❌ Error loading webhook mappings:', error.message);
        channelWebhookMap = {};
    }
}

// Save webhook mappings to file
function saveWebhookMappings() {
    try {
        fs.writeFileSync(WEBHOOKS_FILE, JSON.stringify(channelWebhookMap, null, 2));
        console.log('💾 Saved webhook mappings to file');
    } catch (error) {
        console.error('❌ Error saving webhook mappings:', error.message);
    }
}

// Helper function to extract slip identifiers for your mapping system
function extractSlipIdentifiers(message) {
    const identifiers = {
        messageId: message.id,
        channelId: message.channel.id,
        timestamp: message.createdTimestamp,
        cdnParams: {},
        interactionId: message.interaction?.id || null,
        commandName: message.interaction?.name || null,
        triggerUser: message.interaction?.user?.username || null
    };
    
    // Extract CDN parameters from image URLs (these change per slip)
    if (message.embeds && message.embeds.length > 0) {
        message.embeds.forEach(embed => {
            if (embed.image?.url) {
                try {
                    const url = new URL(embed.image.url);
                    identifiers.cdnParams = Object.fromEntries(url.searchParams);
                    
                    // Extract attachment ID from Discord CDN path
                    const pathParts = url.pathname.split('/');
                    const attachmentId = pathParts.find(part => /^\d{17,19}$/.test(part));
                    if (attachmentId) {
                        identifiers.attachmentId = attachmentId;
                    }
                } catch (e) {
                    console.log('Failed to parse image URL:', e.message);
                }
            }
        });
    }
    
    console.log('📋 Slip Identifiers Extracted:', identifiers);
    return identifiers;
}

// Load source channel IDs from .env (supports unlimited channels)
let sourceChannelIds = [];
let channelCount = 0;

// Function to load channels from JSON file
function loadChannelsFromFile() {
    try {
        if (fs.existsSync(CHANNELS_FILE)) {
            const data = fs.readFileSync(CHANNELS_FILE, 'utf8');
            const config = JSON.parse(data);
            const newChannels = config.channels || [];
            
            const added = newChannels.filter(ch => !sourceChannelIds.includes(ch));
            const removed = sourceChannelIds.filter(ch => !newChannels.includes(ch));
            
            sourceChannelIds = [...newChannels];
            channelCount = sourceChannelIds.length;
            
            if (added.length > 0) {
                console.log(`✅ Added ${added.length} new channel(s):`, added);
            }
            if (removed.length > 0) {
                console.log(`🗑️ Removed ${removed.length} channel(s):`, removed);
            }
            
            console.log(`📊 Total channels loaded: ${channelCount}`);
            return true;
        }
    } catch (error) {
        console.error('❌ Error loading channels from file:', error.message);
    }
    return false;
}

// Watch for changes to channels.json
function watchChannelsFile() {
    console.log('👀 Watching channels.json for changes...');
    fs.watch(CHANNELS_FILE, (eventType, filename) => {
        if (eventType === 'change') {
            console.log('\n🔄 Detected change in channels.json, reloading...');
            setTimeout(() => {
                loadChannelsFromFile();
            }, 100); // Small delay to ensure file is fully written
        }
    });
}

if (FULL_SERVER_COPY) {
    if (!SOURCE_GUILD_ID) {
        console.error('❌ FULL_SERVER_COPY enabled but SOURCE_GUILD_ID not configured!');
        process.exit(1);
    }
    console.log(`🌐 FULL SERVER COPY MODE enabled for server: ${SOURCE_GUILD_ID}`);
    console.log('📡 Will monitor ALL channels in the source server');
} else {
    console.log('🔍 Loading source channel IDs...');
    
    // First try loading from channels.json
    const loadedFromFile = loadChannelsFromFile();
    
    // If channels.json doesn't exist or is empty, fall back to .env
    if (!loadedFromFile || channelCount === 0) {
        console.log('📝 Loading from .env file...');
        for (let i = 1; i <= 200; i++) {
            const channelKey = `CHANNEL_${i}`;
            const channelId = process.env[channelKey];
            
            if (!channelId) {
                if (channelCount > 0) {
                    break; // Stop if we've found channels and now hit a gap
                }
                continue; // Skip gaps in numbering
            }
            
            sourceChannelIds.push(channelId);
            channelCount++;
            console.log(`✅ Loaded source channel ${i}: ${channelId}`);
        }
    }
    
    // Start watching for changes to channels.json
    if (fs.existsSync(CHANNELS_FILE)) {
        watchChannelsFile();
    }

    if (channelCount === 0) {
        console.error('❌ No source channels configured! Add CHANNEL_1, CHANNEL_2, etc. to .env');
        process.exit(1);
    }
}

if (!TARGET_GUILD_ID) {
    console.error('❌ TARGET_GUILD_ID not configured! Add it to .env');
    process.exit(1);
}

console.log(`\n📊 Mode: ${USE_BOT_MODE ? '🤖 BOT MODE' : '🪝 WEBHOOK MODE'}`);
if (FULL_SERVER_COPY) {
    console.log(`🌐 Full server copy: ENABLED (Source: ${SOURCE_GUILD_ID})`);
} else {
    console.log(`📊 Total source channels to monitor: ${channelCount}`);
}
console.log(`🎯 Target guild ID: ${TARGET_GUILD_ID}`);
if (TARGET_CATEGORY_ID) {
    console.log(`📁 Target category ID: ${TARGET_CATEGORY_ID}`);
}
if (COPY_CATEGORY_STRUCTURE) {
    console.log(`📋 Category structure copying: ENABLED`);
}
if (USE_BOT_MODE && BOT_TOKEN) {
    console.log(`🤖 Bot mode: Using separate bot account for forwarding`);
}

// Load existing webhook mappings
loadWebhookMappings();

// Function to get or create webhook for a source channel
async function getOrCreateWebhook(sourceChannel, client) {
    const sourceChannelId = sourceChannel.id;
    const sourceChannelName = sourceChannel.name;
    
    console.log(`\n🔍 Processing channel: ${sourceChannelName} (${sourceChannelId})`);
    
    // Check if we already have a webhook for this channel
    if (channelWebhookMap[sourceChannelId] && channelWebhookMap[sourceChannelId].webhookUrl) {
        console.log(`✅ Using existing webhook for ${sourceChannelName}`);
        return channelWebhookMap[sourceChannelId].webhookUrl;
    }
    
    // Check if creation is already in progress for this channel
    if (creationLocks.has(sourceChannelId)) {
        console.log(`⏳ Waiting for existing creation process for ${sourceChannelName}...`);
        return await creationLocks.get(sourceChannelId);
    }
    
    console.log(`🆕 No webhook found, creating new channel and webhook...`);
    
    // Create a promise for this creation process and store it in the lock
    const creationPromise = (async () => {
        try {
            // Get target guild
        const targetGuild = await client.guilds.fetch(TARGET_GUILD_ID);
        if (!targetGuild) {
            console.error(`❌ Could not fetch target guild: ${TARGET_GUILD_ID}`);
            return null;
        }
        
        console.log(`📍 Target guild: ${targetGuild.name}`);
        
        // Determine category for new channel
        let categoryId = TARGET_CATEGORY_ID;
        
        if (COPY_CATEGORY_STRUCTURE && sourceChannel.parent) {
            // Try to find or create matching category
            const sourceCategoryName = sourceChannel.parent.name;
            console.log(`📂 Source category: ${sourceCategoryName}`);
            
            let targetCategory = targetGuild.channels.cache.find(
                c => c.type === 4 && c.name === sourceCategoryName
            );
            
            if (!targetCategory) {
                console.log(`🆕 Creating category: ${sourceCategoryName}`);
                targetCategory = await targetGuild.channels.create(sourceCategoryName, {
                    type: 4 // Category type
                });
            } else {
                console.log(`✅ Found existing category: ${sourceCategoryName}`);
            }
            
            categoryId = targetCategory.id;
        }
        
        // Check if channel with same name already exists
        let targetChannel = targetGuild.channels.cache.find(
            c => c.name === sourceChannelName && c.type === 0 // Text channel
        );
        
        if (!targetChannel) {
            console.log(`🆕 Creating channel: ${sourceChannelName}`);
            targetChannel = await targetGuild.channels.create(sourceChannelName, {
                type: 0, // Text channel
                parent: categoryId
            });
            console.log(`✅ Created channel: ${targetChannel.name} (${targetChannel.id})`);
        } else {
            console.log(`✅ Found existing channel: ${targetChannel.name} (${targetChannel.id})`);
        }
        
        // Create webhook in target channel (skip if bot mode only)
        let webhook = null;
        if (!USE_BOT_MODE || !BOT_TOKEN) {
            console.log(`🔗 Creating webhook in ${targetChannel.name}...`);
            webhook = await targetChannel.createWebhook(
                BOT_USERNAME || 'Mirror Bot'
            );
            console.log(`✅ Created webhook: ${webhook.url.substring(0, 50)}...`);
        }
        
        // Store mapping (works for both webhook and bot mode)
        channelWebhookMap[sourceChannelId] = {
            webhookUrl: webhook?.url || null,
            targetChannelId: targetChannel.id,
            targetChannelName: targetChannel.name,
            sourceChannelName: sourceChannelName,
            createdAt: new Date().toISOString()
        };
        
        saveWebhookMappings();
        
            return webhook?.url || targetChannel.id;
        
        } catch (error) {
            console.error(`❌ Error creating webhook for ${sourceChannelName}:`, error.message);
            if (error.code) {
                console.error(`   Error code: ${error.code}`);
            }
            return null;
        } finally {
            // Remove the lock after completion (success or failure)
            creationLocks.delete(sourceChannelId);
        }
    })();
    
    // Store the promise in the lock map
    creationLocks.set(sourceChannelId, creationPromise);
    
    // Wait for and return the result
    return await creationPromise;
}

const client = new Client({
    checkUpdate: false
});

// Bot client for bot mode (if enabled)
let botClient = null;
if (USE_BOT_MODE && BOT_TOKEN) {
    botClient = new Client({
        checkUpdate: false
    });
    
    botClient.once('ready', () => {
        console.log(`🤖 Bot logged in as ${botClient.user.tag}`);
    });
    
    botClient.login(BOT_TOKEN).catch(err => {
        console.error('❌ Failed to login bot:', err.message);
        console.log('⚠️ Continuing in webhook mode only');
        botClient = null;
    });
}

client.once('ready', async () => { 
    console.log(`\n✅ Logged in as ${client.user.tag}`);
    
    // If full server copy mode, populate channel IDs from the source server
    if (FULL_SERVER_COPY && SOURCE_GUILD_ID) {
        try {
            const sourceGuild = await client.guilds.fetch(SOURCE_GUILD_ID);
            const textChannels = sourceGuild.channels.cache.filter(ch => ch.type === 0); // Text channels only
            sourceChannelIds = textChannels.map(ch => ch.id);
            console.log(`🌐 Loaded ${sourceChannelIds.length} text channels from source server: ${sourceGuild.name}`);
            textChannels.forEach(ch => console.log(`   - ${ch.name} (${ch.id})`));
        } catch (error) {
            console.error(`❌ Failed to load source server channels: ${error.message}`);
            process.exit(1);
        }
    }
    
    console.log(`📡 Monitoring ${sourceChannelIds.length} source channels`);
    console.log(`🔄 Ready to mirror messages!\n`);
});

// Helper function to forward message using bot mode
async function forwardWithBot(message, targetChannel) {
    try {
        const payload = {
            content: message.content || undefined
        };
        
        // Add embeds
        if (message.embeds.length > 0) {
            payload.embeds = message.embeds.map(embed => ({
                title: embed.title || undefined,
                description: embed.description || undefined,
                url: embed.url || undefined,
                color: embed.color || undefined,
                timestamp: embed.timestamp || undefined,
                footer: embed.footer ? {
                    text: embed.footer.text,
                    icon_url: embed.footer.iconURL
                } : undefined,
                image: embed.image ? { url: embed.image.url } : undefined,
                thumbnail: embed.thumbnail ? { url: embed.thumbnail.url } : undefined,
                author: embed.author ? {
                    name: embed.author.name,
                    icon_url: embed.author.iconURL,
                    url: embed.author.url
                } : undefined,
                fields: embed.fields || undefined
            }));
        }
        
        // Add attachments
        if (message.attachments.size > 0) {
            payload.files = Array.from(message.attachments.values()).map(att => att.url);
        }
        
        // Send the message
        const sentMessage = await targetChannel.send(payload);
        
        return sentMessage;
    } catch (error) {
        console.error(`❌ Bot mode forwarding error: ${error.message}`);
        return null;
    }
}

client.on('messageCreate', async message => {
    // Ignore own messages
    if (message.author.id === client.user.id) {
        return;
    }
    
    // Check if this is a monitored source channel
    if (!sourceChannelIds.includes(message.channel.id)) {
        return;
    }
    
    console.log(`\n📨 Message received in ${message.channel.name} (${message.channel.id})`);
    console.log(`   Author: ${message.author.tag}`);
    console.log(`   Content: ${message.content ? message.content.substring(0, 50) + '...' : 'No text'}`);
    console.log(`   Embeds: ${message.embeds.length}, Attachments: ${message.attachments.size}`);
    
    // Bot mode: use bot to send directly
    if (USE_BOT_MODE && botClient) {
        // Get or create target channel (reuse webhook mapping storage for channel IDs)
        let targetChannelId = channelWebhookMap[message.channel.id]?.targetChannelId;
        
        if (!targetChannelId) {
            // Create channel if it doesn't exist
            const result = await getOrCreateWebhook(message.channel, client);
            targetChannelId = channelWebhookMap[message.channel.id]?.targetChannelId;
        }
        
        if (!targetChannelId) {
            console.error(`❌ Failed to get target channel for ${message.channel.name}`);
            return;
        }
        
        try {
            const targetChannel = await botClient.channels.fetch(targetChannelId);
            if (!targetChannel) {
                console.error(`❌ Bot cannot access target channel: ${targetChannelId}`);
                return;
            }
            
            console.log(`🤖 Forwarding via bot to ${targetChannel.name}...`);
            await forwardWithBot(message, targetChannel);
            console.log(`✅ Message forwarded via bot mode\n`);
            return;
        } catch (error) {
            console.error(`❌ Bot mode error: ${error.message}`);
            return;
        }
    }
    
    // Webhook mode (original behavior)
    const webhookUrl = await getOrCreateWebhook(message.channel, client);
    
    if (!webhookUrl) {
        console.error(`❌ Failed to get webhook for channel ${message.channel.name}`);
        return;
    }
    
    try {
        const webhook = new WebhookClient({ url: webhookUrl });
        
        // Check for components and extract slip reference data
        if (message.components && message.components.length > 0) {
            console.log('\n🎯 === SLIP REFERENCE EXTRACTION ===');
            console.log('Detected message with components, extracting slip identifiers...');
            
            // Create slip reference object for your mapping system
            let slipReference = {
                messageId: message.id,
                channelId: message.channel.id,
                authorId: message.author.id,
                timestamp: message.createdTimestamp,
                interactionId: message.interaction?.id,
                commandName: message.interaction?.name,
                triggerUser: message.interaction?.user?.username,
                cdnParameters: {},
                slipIdentifiers: [],
                buttonData: {}
            };
            
            console.log('\n📸 SLIP IMAGE ANALYSIS:');
            message.embeds.forEach((embed, embedIndex) => {
                if (embed.image?.url) {
                    const imageUrl = embed.image.url;
                    console.log(`Image ${embedIndex + 1} URL: ${imageUrl}`);
                    
                    try {
                        const url = new URL(imageUrl);
                        const params = Object.fromEntries(url.searchParams);
                        slipReference.cdnParameters = params;
                        
                        console.log(`🔑 CDN PARAMETERS (Slip Identifiers):`);
                        console.log(`  ex: ${params.ex}`);
                        console.log(`  is: ${params.is}`);
                        console.log(`  hm: ${params.hm?.substring(0, 16)}...`);
                        
                        // Extract Discord attachment ID
                        const pathParts = url.pathname.split('/');
                        const attachmentId = pathParts.find(part => /^\d{17,19}$/.test(part));
                        if (attachmentId) {
                            slipReference.attachmentId = attachmentId;
                            console.log(`  attachment_id: ${attachmentId}`);
                        }
                        
                        // Add primary identifiers
                        slipReference.slipIdentifiers.push({
                            type: 'cdn_ex',
                            value: params.ex,
                            note: 'Likely expiration parameter'
                        });
                        slipReference.slipIdentifiers.push({
                            type: 'cdn_is',
                            value: params.is,
                            note: 'Likely image signature'
                        });
                        
                    } catch (e) {
                        console.log(`URL parse error: ${e.message}`);
                    }
                }
            });
            
            console.log('\n🎮 BUTTON ANALYSIS:');
            message.components.forEach((actionRow, rowIndex) => {
                if (actionRow.components) {
                    actionRow.components.forEach((component, compIndex) => {
                        const customId = component.custom_id || component.customId || component.id;
                        console.log(`\nButton ${compIndex + 1}: ${component.label}`);
                        console.log(`  Custom ID: ${customId}`);
                        console.log(`  Style: ${component.style}`);
                        
                        // Store button data
                        slipReference.buttonData[customId] = {
                            label: component.label,
                            style: component.style,
                            type: component.type
                        };
                        
                        if (customId === 'view_slip') {
                            console.log(`\n🎯 VIEW_SLIP BUTTON FOUND:`);
                            console.log(`This button would reveal your unblurred slip.`);
                            console.log(`Since you generate these with /hideplay, you can map:`);
                            console.log(`  Message ID → Unblurred Slip: ${message.id}`);
                            console.log(`  CDN 'ex' param → Slip ID: ${slipReference.cdnParameters.ex}`);
                            console.log(`  CDN 'is' param → Image Sig: ${slipReference.cdnParameters.is}`);
                        }
                    });
                }
            });
            
            // Extract interaction data from your /hideplay command
            if (message.interaction) {
                console.log(`\n🎮 YOUR /HIDEPLAY COMMAND DATA:`);
                console.log(`  Command: /${message.interaction.name}`);
                console.log(`  Triggered by: ${message.interaction.user.username}`);
                console.log(`  Interaction ID: ${message.interaction.id}`);
                console.log(`  Timestamp: ${new Date(parseInt(message.interaction.id) >> 22 + 1420070400000)}`);
            }
            
            // Look for additional slip IDs in embed content
            console.log('\n🔍 EMBED CONTENT ANALYSIS:');
            message.embeds.forEach((embed, embedIndex) => {
                if (embed.footer?.text) {
                    const footerIds = embed.footer.text.match(/[a-zA-Z0-9]{6,}/g);
                    if (footerIds) {
                        footerIds.forEach(id => {
                            slipReference.slipIdentifiers.push({
                                type: 'footer_id',
                                value: id,
                                note: 'Found in embed footer'
                            });
                        });
                        console.log(`Footer IDs: ${footerIds.join(', ')}`);
                    }
                }
                
                if (embed.description) {
                    // Look for hidden slip data in spoiler tags or code blocks
                    const spoilerMatches = embed.description.match(/\|\|([^|]+)\|\|/g);
                    if (spoilerMatches) {
                        console.log(`Spoiler content: ${spoilerMatches.join(', ')}`);
                        spoilerMatches.forEach(spoiler => {
                            const content = spoiler.replace(/\|\|/g, '');
                            if (content.length >= 6) {
                                slipReference.slipIdentifiers.push({
                                    type: 'spoiler_id',
                                    value: content,
                                    note: 'Found in spoiler tags'
                                });
                            }
                        });
                    }
                }
            });
            
            // Final slip reference object
            console.log(`\n📦 COMPLETE SLIP REFERENCE FOR YOUR SYSTEM:`);
            console.log(JSON.stringify(slipReference, null, 2));
            
            console.log(`\n💡 RECOMMENDED MAPPING STRATEGY:`);
            console.log(`1. Primary Key: Message ID (${message.id})`);
            console.log(`2. Secondary Key: CDN 'ex' param (${slipReference.cdnParameters.ex})`);
            console.log(`3. Tertiary Key: CDN 'is' param (${slipReference.cdnParameters.is})`);
            console.log(`4. Interaction ID: ${slipReference.interactionId}`);
            console.log(`\nWhen someone clicks 'View Slip', you can use these IDs to serve the unblurred version.`);
            
            console.log('🎯 === END SLIP REFERENCE EXTRACTION ===\n');
        }
        
        // Send embeds
        if (message.embeds.length > 0) {
            console.log(`📤 Forwarding ${message.embeds.length} embed(s)...`);
            const embed = message.embeds[0];

            // make new embed
            const newEmbed = {
                title: embed.title || '',
                description: embed.description || 'No description',
                url: embed.url || '',
                color: embed.color || null,
                timestamp: embed.timestamp || null,
                footer: embed.footer && embed.footer.text
                    ? {
                        text: embed.footer.text,
                        icon_url: embed.footer.icon_url
                    }
                    : undefined,
                image: embed.image ? { url: embed.image.url } : undefined,
                thumbnail: embed.thumbnail ? { url: embed.thumbnail.url } : undefined
            };

            // Send embed with images included
            await webhook.send({
                username: BOT_USERNAME,
                embeds: [newEmbed]
            });
            console.log(`✅ Embed(s) forwarded`);
        }
        
        // Send attachments
        if (message.attachments.size > 0) {
            console.log(`📎 Forwarding ${message.attachments.size} attachment(s)...`);
            for (const attachment of message.attachments.values()) {
                await webhook.send({
                    username: BOT_USERNAME,
                    files: [attachment.url]
                });
            }
            console.log(`✅ Attachment(s) forwarded`);
        }
        
        // Send text content
        if (message.content && message.content.length > 0) {
            console.log(`💬 Forwarding text content...`);
            // Forward message content, but strip @everyone mentions
            if (message.content.includes("@everyone")) {
                const newContent = message.content.replace(/@everyone/g, "");
                await webhook.send({
                    username: BOT_USERNAME,
                    content: newContent,
                });
            } else {
                await webhook.send({
                    username: BOT_USERNAME,
                    content: message.content,
                });
            }
            console.log(`✅ Text content forwarded`);
        }
        
        console.log(`\n✅ Message successfully mirrored from ${message.channel.name}\n`);
        
    } catch (error) {
        console.error(`❌ Error forwarding message from ${message.channel.name}:`, error.message);
    }
});

// Handle message updates (DISABLED to prevent duplicate forwarding)
// Uncomment if you need to forward edited messages
/*
client.on('messageUpdate', async (oldMessage, newMessage) => {
    // Ignore own messages
    if (newMessage.author.id === client.user.id) {
        return;
    }

    // Check if this is a monitored source channel
    if (!sourceChannelIds.includes(newMessage.channel.id)) {
        return;
    }
    
    console.log(`\n✏️ Message updated in ${newMessage.channel.name} (${newMessage.channel.id})`);
    
    // Get or create webhook for this channel
    const webhookUrl = await getOrCreateWebhook(newMessage.channel, client);
    
    if (!webhookUrl) {
        console.error(`❌ Failed to get webhook for channel ${newMessage.channel.name}`);
        return;
    }
    
    try {
        const webhook = new WebhookClient({ url: webhookUrl });
        
        // Check for components in updated message with slip ID extraction
        if (newMessage.components && newMessage.components.length > 0) {
            console.log('\n🎯 === SLIP ID EXTRACTION MODE ===');
            
            // Extract key identifiers for your slip mapping system
            console.log('📊 SLIP IDENTIFICATION DATA:');
            
            let slipIdentifiers = {
                messageId: newMessage.id,
                channelId: newMessage.channel.id,
                timestamp: new Date().toISOString(),
                cdnParams: {},
                interactionData: {},
                attachmentId: null
            };
            
            // Extract CDN parameters that likely contain slip IDs
            newMessage.embeds.forEach((embed, embedIndex) => {
                if (embed.image?.url) {
                    console.log(`\n� SLIP ID EXTRACTION FROM IMAGE ${embedIndex + 1}:`);
                    const imageUrl = embed.image.url;
                    
                    try {
                        const url = new URL(imageUrl);
                        
                        // Extract the key parameters that change per slip
                        const cdnParams = Object.fromEntries(url.searchParams);
                        slipIdentifiers.cdnParams = cdnParams;
                        
                        // Extract attachment ID from path
                        const pathParts = url.pathname.split('/');
                        const attachmentId = pathParts[pathParts.length - 2]; // The ID before filename
                        slipIdentifiers.attachmentId = attachmentId;
                        
                        console.log(`🎯 PRIMARY SLIP IDENTIFIERS:`);
                        console.log(`  ex parameter: ${cdnParams.ex}`);
                        console.log(`  is parameter: ${cdnParams.is}`);
                        console.log(`  hm parameter: ${cdnParams.hm?.substring(0, 16)}...`);
                        console.log(`  attachment_id: ${attachmentId}`);
                        console.log(`  message_id: ${newMessage.id}`);
                        
                        // These are likely your slip identifiers
                        console.log(`\n� RECOMMENDED SLIP MAPPING:`);
                        console.log(`  Slip ID 1: ${cdnParams.ex}`);
                        console.log(`  Slip ID 2: ${cdnParams.is}`);
                        console.log(`  Full Hash: ${cdnParams.hm}`);
                        
                    } catch (e) {
                        console.log(`Failed to parse URL: ${e.message}`);
                    }
                }
            });
            
            // Extract interaction data if available
            if (newMessage.interaction) {
                slipIdentifiers.interactionData = {
                    id: newMessage.interaction.id,
                    name: newMessage.interaction.name,
                    user: newMessage.interaction.user.username
                };
                
                console.log(`\n� INTERACTION INFO:`);
                console.log(`  Command: /${newMessage.interaction.name}`);
                console.log(`  Triggered by: ${newMessage.interaction.user.username}`);
                console.log(`  Interaction ID: ${newMessage.interaction.id}`);
            }
            
            // Log final slip identifier object for your reference
            console.log(`\n📦 COMPLETE SLIP IDENTIFIER PACKAGE:`);
            console.log(JSON.stringify(slipIdentifiers, null, 2));
            
            // Check if this is a view_slip button for reference
            newMessage.components.forEach((actionRow) => {
                if (actionRow.components) {
                    actionRow.components.forEach((component) => {
                        const customId = component.custom_id || component.customId || component.id;
                        
                        if (customId === 'view_slip') {
                            console.log(`\n🎮 VIEW_SLIP BUTTON DETECTED:`);
                            console.log(`This button would normally reveal the unblurred slip.`);
                            console.log(`Since you're generating these slips, you can use the identifiers above`);
                            console.log(`to correlate this preview with your original unblurred data.`);
                        }
                    });
                }
            });
            
            console.log('🎯 === END SLIP ID EXTRACTION ===\n');
        }
        
        // Send updated content
        if (newMessage.embeds.length > 0) {
            console.log(`📤 Forwarding updated embed(s)...`);
            const embed = newMessage.embeds[0];

            // make new embed
            const newEmbed = {
                title: embed.title || '',
                description: embed.description || 'No description',
                url: embed.url || '',
                color: embed.color || null,
                timestamp: embed.timestamp || null,
                footer: embed.footer && embed.footer.text
                    ? {
                        text: embed.footer.text,
                        icon_url: embed.footer.icon_url
                    }
                    : undefined,
                image: embed.image ? { url: embed.image.url } : undefined,
                thumbnail: embed.thumbnail ? { url: embed.thumbnail.url } : undefined
            };

            // Send embed with images included
            await webhook.send({
                username: BOT_USERNAME,
                embeds: [newEmbed]
            });
            console.log(`✅ Updated embed(s) forwarded`);
        }
        
        if (newMessage.attachments.size > 0) {
            console.log(`📎 Forwarding updated attachment(s)...`);
            for (const attachment of newMessage.attachments.values()) {
                await webhook.send({
                    username: BOT_USERNAME,
                    files: [attachment.url]
                });
            }
            console.log(`✅ Updated attachment(s) forwarded`);
        }

        if (newMessage.content && newMessage.content.length > 0) {
            console.log(`💬 Forwarding updated text content...`);
            await webhook.send({
                username: BOT_USERNAME,
                content: newMessage.content,
            });
            console.log(`✅ Updated text content forwarded`);
        }
        
        console.log(`\n✅ Updated message successfully mirrored from ${newMessage.channel.name}\n`);
        
    } catch (error) {
        console.error(`❌ Error forwarding updated message from ${newMessage.channel.name}:`, error.message);
    }
});
*/

client.login(process.env.TOKEN);