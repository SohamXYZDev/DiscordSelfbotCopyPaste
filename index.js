const { Client, GatewayIntentBits, WebhookClient } = require('discord.js-selfbot-v13');
const { Jimp } = require('jimp');
const fs = require('fs');
require('dotenv').config();

const fsPromises = require('fs').promises;
const BOT_USERNAME = process.env.BOT_USERNAME || "Bot";

async function fileExists(path) {
    try {
        await fsPromises.access(path, fs.constants.F_OK);
        return true;
    } catch {
        return false;
    }
}

async function removeWatermark(input_image, output_image = 'image_white.jpg') {
  try {
    const img = await Jimp.read(input_image);

    // 1. Count color frequency
    const colorMap = new Map();

    img.scan(0, 0, img.bitmap.width, img.bitmap.height, function (x, y, idx) {
      const r = this.bitmap.data[idx + 0];
      const g = this.bitmap.data[idx + 1];
      const b = this.bitmap.data[idx + 2];

      const key = `${r},${g},${b}`;
      colorMap.set(key, (colorMap.get(key) || 0) + 1);
    });

    // 2. Find the most frequent color
    let mostCommonColor = '255,255,255'; // fallback
    let maxCount = 0;

    for (const [color, count] of colorMap.entries()) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonColor = color;
      }
    }

    const [mr, mg, mb] = mostCommonColor.split(',').map(Number);

    // 3. Replace blue-dominant pixels with the color of the pixel 10 pixels to the left
    img.scan(0, 0, img.bitmap.width, img.bitmap.height, function (x, y, idx) {
        const r = this.bitmap.data[idx + 0];
        const g = this.bitmap.data[idx + 1];
        const b = this.bitmap.data[idx + 2];

        // Detect blue or bluish pixels
        const isBlueDominant = b > 50 && b > r * 1.25 && b > g * 1.25;

        if (isBlueDominant && x >= 10) {
            // Get the index of the pixel 10 pixels to the left
            const leftIdx = this.getPixelIndex(x - 10, y);
            this.bitmap.data[idx + 0] = this.bitmap.data[leftIdx + 0];
            this.bitmap.data[idx + 1] = this.bitmap.data[leftIdx + 1];
            this.bitmap.data[idx + 2] = this.bitmap.data[leftIdx + 2];
        } else if (isBlueDominant && x <= this.bitmap.width - 11) {
            // Replace with color 10 pixels to the right
            const rightIdx = this.getPixelIndex(x + 10, y);
            this.bitmap.data[idx + 0] = this.bitmap.data[rightIdx + 0];
            this.bitmap.data[idx + 1] = this.bitmap.data[rightIdx + 1];
            this.bitmap.data[idx + 2] = this.bitmap.data[rightIdx + 2];
        }
    });

    await img.write(output_image);
    console.log(`✔ All blue pixels replaced with the color of the pixel 10 pixels to the left`);
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

async function addWatermark(baseImagePath, watermarkPath, outputPath, opacity = 0.35) {
    try {
        const base = await Jimp.read(baseImagePath);
        const watermark = await Jimp.read(watermarkPath);

        // Set opacity
        watermark.opacity(opacity);

        // Resize watermark to fit the base image
        const watermarkWidth = (90 * base.bitmap.width)/100; // 25% of the base image width
        const watermarkHeight = base.bitmap.height; // maintain aspect ratio
        watermark.resize({w: watermarkWidth, h: watermarkHeight}); // pass an object

        // Position: bottom-right with 10px margin
        const x = base.bitmap.width - watermark.bitmap.width - 10;
        const y = base.bitmap.height - watermark.bitmap.height - 10;

        base.composite(watermark, x, y, {
            mode: Jimp.BLEND_SOURCE_OVER,
            opacitySource: opacity
        });

        await base.write(outputPath);
        console.log('✔ Watermark added!');
    } catch (err) {
        if (err && err.code !== 'ENOENT') throw err;
        console.error('❌ Error adding watermark:', err);
    }
}

// format= {their channel id: my channel webhook}
const channelMatchDict = {
    [process.env.CHANNEL_1]: process.env.WEBHOOK_1,
    [process.env.CHANNEL_2]: process.env.WEBHOOK_2, 
    [process.env.CHANNEL_3]: process.env.WEBHOOK_3,
    [process.env.CHANNEL_4]: process.env.WEBHOOK_4,
    [process.env.CHANNEL_5]: process.env.WEBHOOK_5,
    [process.env.CHANNEL_6]: process.env.WEBHOOK_6,
    [process.env.CHANNEL_7]: process.env.WEBHOOK_7,
    [process.env.CHANNEL_8]: process.env.WEBHOOK_8,
    [process.env.CHANNEL_9]: process.env.WEBHOOK_9,
    [process.env.CHANNEL_10]: process.env.WEBHOOK_10,
    [process.env.CHANNEL_11]: process.env.WEBHOOK_11,
    [process.env.CHANNEL_12]: process.env.WEBHOOK_12,
    [process.env.CHANNEL_13]: process.env.WEBHOOK_13,
    [process.env.CHANNEL_14]: process.env.WEBHOOK_14,
    [process.env.CHANNEL_15]: process.env.WEBHOOK_15,
    [process.env.CHANNEL_16]: process.env.WEBHOOK_16,
    [process.env.CHANNEL_17]: process.env.WEBHOOK_17,
    [process.env.CHANNEL_18]: process.env.WEBHOOK_18,
    [process.env.CHANNEL_19]: process.env.WEBHOOK_19,
    [process.env.CHANNEL_20]: process.env.WEBHOOK_20,
}

const testWebhook = new WebhookClient({ url: process.env.TEST_WEBHOOK });

client.once('ready', async () => { 
    console.log(`Logged in as ${client.user.tag}`);
});



client.on('messageCreate', async message => {
    // ignore own messages
    // check if channel id is in channelMatchDict

    if (channelMatchDict[message.channel.id]) {
        const webhook = new WebhookClient({ url: channelMatchDict[message.channel.id] });
        if (message.embeds.length > 0) {
            const embed = message.embeds[0];
            let containsImage = false;
            let containsThumbnail = false;

            // check if embed has image
            if (embed.image) {
                try {
                    await removeWatermark(embed.image.url);
                    if (await fileExists('image_white.jpg')) {
                        await addWatermark('image_white.jpg', 'watermark.png', 'image_final.jpg', 0.35);
                        containsImage = true;
                    } else {
                        console.warn('image_white.jpg not created, skipping watermark.');
                    }
                } catch (err) {
                    console.warn('Failed to process embed image:', err);
                }
            }
            // check if embed has thumbnail
            if (embed.thumbnail) {
                try {
                    await removeWatermark(embed.thumbnail.url, 'thumbnail_white.jpg');
                    if (await fileExists('thumbnail_white.jpg')) {
                        await addWatermark('thumbnail_white.jpg', 'watermark.png', 'thumbnail_final.jpg', 0.35);
                        containsThumbnail = true;
                    } else {
                        console.warn('thumbnail_white.jpg not created, skipping watermark.');
                    }
                } catch (err) {
                    console.warn('Failed to process embed thumbnail:', err);
                }
            }
            // make new embed with the images
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
                    : undefined
            };
            // send to webhook
            await webhook.send({
                username: BOT_USERNAME,
                embeds: [newEmbed],
                files: [
                    ...(containsImage ? ['image_final.jpg'] : []),
                    ...(containsThumbnail ? ['thumbnail_final.jpg'] : [])
                ]
            });
            // delete the output files
            if (containsImage) {
                if (await fileExists('image_white.jpg')) {
                    fs.unlink('image_white.jpg', (err) => {
                        if (err && err.code !== 'ENOENT') throw err;
                        console.log('image_white.jpg was deleted');
                    });
                }
                if (await fileExists('image_final.jpg')) {
                    fs.unlink('image_final.jpg', (err) => {
                        if (err && err.code !== 'ENOENT') throw err;
                        console.log('image_final.jpg was deleted');
                    });
                }
            }
            if (containsThumbnail) {
                if (await fileExists('thumbnail_white.jpg')) {
                    fs.unlink('thumbnail_white.jpg', (err) => {
                        if (err && err.code !== 'ENOENT') throw err;
                        console.log('thumbnail_white.jpg was deleted');
                    });
                }
                if (await fileExists('thumbnail_final.jpg')) {
                    fs.unlink('thumbnail_final.jpg', (err) => {
                        if (err && err.code !== 'ENOENT') throw err;
                        console.log('thumbnail_final.jpg was deleted');
                    });
                }
            }
        }
        // send attachments
        if (message.attachments.size > 0) {
            console.log("attachment(s) found");
            for (const attachment of message.attachments.values()) {
                // Check if the attachment is a video
                if (attachment.contentType && attachment.contentType.startsWith('video/')) {
                    console.log(`Video detected: ${attachment.url}, skipping processing.`);
                } else {
                    try {
                        await removeWatermark(attachment.url);
                        if (await fileExists('image_white.jpg')) {
                            await addWatermark('image_white.jpg', 'watermark.png', 'output_final.jpg', 0.35);
                            await webhook.send({
                                username: BOT_USERNAME,
                                files: ['output_final.jpg']
                            });
                            if (await fileExists('image_white.jpg')) {
                                fs.unlink('image_white.jpg', (err) => {
                                    if (err && err.code !== 'ENOENT') throw err;
                                    console.log('image_white.jpg was deleted');
                                });
                            }
                            if (await fileExists('output_final.jpg')) {
                                fs.unlink('output_final.jpg', (err) => {
                                    if (err && err.code !== 'ENOENT') throw err;
                                    console.log('output_final.jpg was deleted');
                                });
                            }
                        } else {
                            console.warn('image_white.jpg not created for attachment, skipping watermark/send.');
                        }
                    } catch (err) {
                        console.warn('Failed to process attachment:', err);
                    }
                }
            }
        }
        if (message.content && message.content.length > 0) {
            // check if message has "<@" and ">" (its a role ping)
            console.log(message.content)
            if (message.content && message.content.length > 0) {
            // check if message has "<@" and ">" (its a role ping)
            console.log(message.content)
            if (message.content.includes("@everyone")) {
                    const newContent = message.content.replace(/@everyone/g, "");
                    await webhook.send({
                        username: BOT_USERNAME,
                        content: newContent,
                    });
            } else {
                // send message to webhook
                await webhook.send({
                    username: BOT_USERNAME,
                    content: message.content,
                });
            }
        }
    }
}});
// check for edits too
client.on('messageUpdate', async (oldMessage, newMessage) => {
        
    // ignore own messages
    if (newMessage.author.id === client.user.id) {
        return;
    }
    // check if channel id is in channelMatchDict
    if (channelMatchDict[newMessage.channel.id]) {
        const webhook = new WebhookClient({ url: channelMatchDict[newMessage.channel.id] });
        if (newMessage.embeds.length > 0) {
            const embed = newMessage.embeds[0];
            // send to webhook
            let containsImage = false;
            let containsThumbnail = false;

            // check if embed has image
            if (embed.image) {
                containsImage = true;
                console.log("embed image found");
                // run through removeWatermark
                await removeWatermark(embed.image.url);
                // run through addWatermark
                await addWatermark('image_white.jpg', 'watermark.png', 'image_final.jpg', 0.35);
            }
            // check if embed has thumbnail
            if (embed.thumbnail) {
                containsThumbnail = true;
                console.log("embed thumbnail found");
                // run through removeWatermark
                await removeWatermark(embed.thumbnail.url, 'thumbnail_white.jpg');
                // run through addWatermark
                await addWatermark('thumbnail_white.jpg', 'watermark.png', 'thumbnail_final.jpg', 0.35);
            }
            // make new embed with the images
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
                    : undefined
            };
            // send to webhook
            await webhook.send({
                username: BOT_USERNAME,
                embeds: [newEmbed],
                files: [
                    ...(containsImage ? ['image_final.jpg'] : []),
                    ...(containsThumbnail ? ['thumbnail_final.jpg'] : [])
                ]
            });
            // delete the output files
            if (containsImage) {
                // delete the output files
                fs.unlink('image_white.jpg', (err) => {
                    if (err && err.code !== 'ENOENT') throw err;
                    console.log('image_white.jpg was deleted');
                });
                fs.unlink('image_final.jpg', (err) => {
                    if (err && err.code !== 'ENOENT') throw err;
                    console.log('image_final.jpg was deleted');
                });
            }
            if (containsThumbnail) {
                await fs.unlink('thumbnail_white.jpg', (err) => {
                    if (err && err.code !== 'ENOENT') throw err;
                    console.log('thumbnail_white.jpg was deleted');
                });
                await fs.unlink('thumbnail_final.jpg', (err) => {
                    if (err && err.code !== 'ENOENT') throw err;
                    console.log('thumbnail_final.jpg was deleted');
                });

            }
        }
        if (newMessage.attachments.size > 0) {
            const attachment = newMessage.attachments.first();
            // pls help github copilot 
            // run through removeWatermark
            await removeWatermark(attachment.url);
            // run through addWatermark
            await addWatermark('image_white.jpg', 'watermark.png', 'output_final.jpg', 0.35);
            
            // send to webhook
            await webhook.send({
                username: BOT_USERNAME,
                files: ['output_final.jpg']
            });
            // delete the output files
            // delete the output files
            fs.unlink('image_white.jpg', (err) => {
                if (err && err.code !== 'ENOENT') throw err;
                console.log('image_white.jpg was deleted');
            });
            fs.unlink('output_final.jpg', (err) => {
                if (err && err.code !== 'ENOENT') throw err;
                console.log('output_final.jpg was deleted');
            });

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