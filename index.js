const { Client, WebhookClient } = require('discord.js-selfbot-v13');
const fs = require('fs');
const axios = require('axios');
require('dotenv').config();

const BOT_USERNAME = process.env.BOT_USERNAME || "Bot";

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

// only works for simple/solid color watermarks
// idea: find most common color in image, assume its the background color
// then replace all pixels that are close to the watermark color with the color of the pixel 10 pixels to the left (or right if too close to left edge)
// format= {their channel id: my channel webhook}
const channelMatchDict = {};

// Dynamically load all CHANNEL_X and WEBHOOK_X pairs from .env
// This supports unlimited channels - just add CHANNEL_X and WEBHOOK_X to .env
let channelCount = 0;
for (let i = 1; i <= 100; i++) {
    const channelKey = `CHANNEL_${i}`;
    const webhookKey = `WEBHOOK_${i}`;
    
    const channelId = process.env[channelKey];
    const webhookUrl = process.env[webhookKey];
    
    // Stop if both are missing (no more channels configured)
    if (!channelId && !webhookUrl) {
        if (i > 1 && channelCount === 0) {
            continue; // Skip gaps in numbering
        } else if (channelCount > 0) {
            break; // Stop if we've found channels and now hit a gap
        }
    }
    
    // Validate and add the mapping
    if (channelId && webhookUrl && webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
        channelMatchDict[channelId] = webhookUrl;
        channelCount++;
        console.log(`✅ Loaded channel ${i}: ${channelId.substring(0, 8)}...`);
    } else if (channelId || webhookUrl) {
        console.warn(`⚠️ Skipping channel ${i}: Invalid or incomplete configuration`);
    }
}

console.log(`\n📊 Total active channel mappings: ${channelCount}`);

// Only create test webhook if URL is valid and not a placeholder
let testWebhook = null;
if (process.env.TEST_WEBHOOK && 
    process.env.TEST_WEBHOOK.startsWith('https://discord.com/api/webhooks/') &&
    !process.env.TEST_WEBHOOK.includes('your_test_webhook_url')) {
    try {
        testWebhook = new WebhookClient({ url: process.env.TEST_WEBHOOK });
        console.log('Test webhook initialized');
    } catch (error) {
        console.log('Test webhook failed to initialize:', error.message);
    }
} else {
    console.log('Test webhook not configured or invalid');
}

const client = new Client({
    checkUpdate: false
});

client.once('ready', async () => { 
    console.log(`Logged in as ${client.user.tag}`);
});



client.on('messageCreate', async message => {
    // ignore own messages
    // check if channel id is in channelMatchDict

    // Only log debug info for monitored channels
    if (message && message.channel && channelMatchDict[message.channel.id]) {
        // Debug: Log all message properties to understand structure
        console.log('\n=== MESSAGE RECEIVED ===');
        console.log('Channel ID:', message.channel.id);
        console.log('Message ID:', message.id);
        console.log('Author:', message.author ? message.author.tag : 'Unknown');
        console.log('Content:', message.content || 'No text content');
        console.log('Has embeds:', message.embeds?.length > 0);
        console.log('Has attachments:', message.attachments?.size > 0);
        
        // Check for components and extract slip reference data
        if (message.components && message.components.length > 0) {
            console.log('\n🎯 === SLIP REFERENCE EXTRACTION ===');
            console.log('Since you control the /hideplay command, extracting slip identifiers...');
            
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
        console.log('=== END MESSAGE DEBUG ===\n');
    }

    if (message && message.channel && channelMatchDict[message.channel.id]) {
        const webhook = new WebhookClient({ url: channelMatchDict[message.channel.id] });
        if (message.embeds.length > 0) {
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
        }
        // send attachments
        if (message.attachments.size > 0) {
            console.log("attachment(s) found");
            for (const attachment of message.attachments.values()) {
                await webhook.send({
                    username: BOT_USERNAME,
                    files: [attachment.url]
                });
            }
        }
        if (message.content && message.content.length > 0) {
            // forward message content, but strip @everyone mentions
            console.log(message.content);
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
        }
    }
});
// check for edits too
client.on('messageUpdate', async (oldMessage, newMessage) => {
        
    // ignore own messages
    if (newMessage.author.id === client.user.id) {
        return;
    }

    // Only debug updates for monitored channels
    if (channelMatchDict[newMessage.channel.id]) {
        console.log('\n=== MESSAGE UPDATED ===');
        console.log('Channel ID:', newMessage.channel.id);
        console.log('Message ID:', newMessage.id);
        
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
                            console.log(`\n� VIEW_SLIP BUTTON DETECTED:`);
                            console.log(`This button would normally reveal the unblurred slip.`);
                            console.log(`Since you're generating these slips, you can use the identifiers above`);
                            console.log(`to correlate this preview with your original unblurred data.`);
                        }
                    });
                }
            });
            
            console.log('🎯 === END SLIP ID EXTRACTION ===\n');
        } else {
            console.log('No components in updated message');
        }
        console.log('=== END UPDATE DEBUG ===\n');
    }

    // check if channel id is in channelMatchDict
    if (channelMatchDict[newMessage.channel.id]) {
        const webhook = new WebhookClient({ url: channelMatchDict[newMessage.channel.id] });
        if (newMessage.embeds.length > 0) {
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
        }
        if (newMessage.attachments.size > 0) {
            for (const attachment of newMessage.attachments.values()) {
                await webhook.send({
                    username: BOT_USERNAME,
                    files: [attachment.url]
                });
            }
        }

        if (newMessage.content && newMessage.content.length > 0) {
            await webhook.send({
                username: BOT_USERNAME,
                content: newMessage.content,
            });
        }
    }
});

client.login(process.env.TOKEN);