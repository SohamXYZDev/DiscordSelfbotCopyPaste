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

// Storage for channel mappings: { sourceChannelId: { webhookUrl, targetChannelId, targetChannelName } }
let channelWebhookMap = {};

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
const sourceChannelIds = [];
let channelCount = 0;

console.log('🔍 Loading source channel IDs from .env...');
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

if (channelCount === 0) {
    console.error('❌ No source channels configured! Add CHANNEL_1, CHANNEL_2, etc. to .env');
    process.exit(1);
}

if (!TARGET_GUILD_ID) {
    console.error('❌ TARGET_GUILD_ID not configured! Add it to .env');
    process.exit(1);
}

console.log(`\n📊 Total source channels to monitor: ${channelCount}`);
console.log(`🎯 Target guild ID: ${TARGET_GUILD_ID}`);
if (TARGET_CATEGORY_ID) {
    console.log(`📁 Target category ID: ${TARGET_CATEGORY_ID}`);
}
if (COPY_CATEGORY_STRUCTURE) {
    console.log(`📋 Category structure copying: ENABLED`);
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
    
    console.log(`🆕 No webhook found, creating new channel and webhook...`);
    
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
        
        // Create webhook in target channel
        console.log(`🔗 Creating webhook in ${targetChannel.name}...`);
        const webhook = await targetChannel.createWebhook(
            BOT_USERNAME || 'Mirror Bot'
        );
        
        console.log(`✅ Created webhook: ${webhook.url.substring(0, 50)}...`);
        
        // Store mapping
        channelWebhookMap[sourceChannelId] = {
            webhookUrl: webhook.url,
            targetChannelId: targetChannel.id,
            targetChannelName: targetChannel.name,
            sourceChannelName: sourceChannelName,
            createdAt: new Date().toISOString()
        };
        
        saveWebhookMappings();
        
        return webhook.url;
        
    } catch (error) {
        console.error(`❌ Error creating webhook for ${sourceChannelName}:`, error.message);
        if (error.code) {
            console.error(`   Error code: ${error.code}`);
        }
        return null;
    }
}

const client = new Client({
    checkUpdate: false
});

client.once('ready', async () => { 
    console.log(`\n✅ Logged in as ${client.user.tag}`);
    console.log(`📡 Monitoring ${sourceChannelIds.length} source channels`);
    console.log(`🔄 Ready to mirror messages!\n`);
});

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
    
    // Get or create webhook for this channel
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

            // Collect any image URLs to send as attachments
            const imageUrls = [];
            if (embed.image && embed.image.url) {
                imageUrls.push(embed.image.url);
            }
            if (embed.thumbnail && embed.thumbnail.url) {
                imageUrls.push(embed.thumbnail.url);
            }

            // send to webhook
            if (imageUrls.length > 0) {
                // Send embed and images separately to ensure images are visible
                await webhook.send({
                    username: BOT_USERNAME,
                    embeds: [newEmbed]
                });
                
                // Send images as separate attachments
                for (const imageUrl of imageUrls) {
                    await webhook.send({
                        username: BOT_USERNAME,
                        files: [imageUrl]
                    });
                }
            } else {
                // No images, just send the embed
                await webhook.send({
                    username: BOT_USERNAME,
                    embeds: [newEmbed]
                });
            }
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

// Handle message updates
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

            // Collect any image URLs to send as attachments
            const imageUrls = [];
            if (embed.image && embed.image.url) {
                imageUrls.push(embed.image.url);
            }
            if (embed.thumbnail && embed.thumbnail.url) {
                imageUrls.push(embed.thumbnail.url);
            }

            // send to webhook
            if (imageUrls.length > 0) {
                // Send embed and images separately to ensure images are visible
                await webhook.send({
                    username: BOT_USERNAME,
                    embeds: [newEmbed]
                });
                
                // Send images as separate attachments
                for (const imageUrl of imageUrls) {
                    await webhook.send({
                        username: BOT_USERNAME,
                        files: [imageUrl]
                    });
                }
            } else {
                // No images, just send the embed
                await webhook.send({
                    username: BOT_USERNAME,
                    embeds: [newEmbed]
                });
            }
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

client.login(process.env.TOKEN);