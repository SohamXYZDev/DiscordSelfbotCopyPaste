const { Client, GatewayIntentBits, WebhookClient } = require('discord.js-selfbot-v13');
const { Jimp } = require('jimp');
const fs = require('fs');
require('dotenv').config();

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

    // 3. Replace red-dominant pixels with the color of the pixel 10 pixels to the left
    img.scan(0, 0, img.bitmap.width, img.bitmap.height, function (x, y, idx) {
        const r = this.bitmap.data[idx + 0];
        const g = this.bitmap.data[idx + 1];
        const b = this.bitmap.data[idx + 2];

        // Detect red or pinkish pixels
        const isRedDominant = r > 50 && r > g * 1.25 && r > b * 1.25;

        if (isRedDominant && x >= 10) {
            // Get the index of the pixel 10 pixels to the left
            const leftIdx = this.getPixelIndex(x - 10, y);
            this.bitmap.data[idx + 0] = this.bitmap.data[leftIdx + 0];
            this.bitmap.data[idx + 1] = this.bitmap.data[leftIdx + 1];
            this.bitmap.data[idx + 2] = this.bitmap.data[leftIdx + 2];
        } else if (isRedDominant && x <= this.bitmap.width - 11) {
            // Replace with color 10 pixels to the right
            const rightIdx = this.getPixelIndex(x + 10, y);
            this.bitmap.data[idx + 0] = this.bitmap.data[rightIdx + 0];
            this.bitmap.data[idx + 1] = this.bitmap.data[rightIdx + 1];
            this.bitmap.data[idx + 2] = this.bitmap.data[rightIdx + 2];
        }
    });

    await img.write(output_image);
    console.log(`✔ All red pixels replaced with the color of the pixel 10 pixels to the left`);
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

const client = new Client();

// format= {their channel id: my channel webhook}
const channelMatchDict = {
    "1317453482198044682": "https://discord.com/api/webhooks/1372557360387854347/Zzgj-2eehdSrF_FytyzZu39Gq7RfDIL7PQiinc-Jp4fZS95tZFuwCGLYp_GS8kozeBz7",
    "1317423635799212062": "https://discord.com/api/webhooks/1372574857862320198/wcueRIGSyEQlyCMdW4tZgaCMP71F2webaUB2YDQ3nZAkFN5pMxaJF7CMP7w13pEmflpp", 
    "1317423921662005289": "https://discord.com/api/webhooks/1372557753163321364/mN8_58lc2YdGPP4g_m0SO_QpPlZ2N9qJGJRJu38r0qhTiKJhDfT7XMyt9MknFkecQei_",
    "1317431852864372797": "https://discord.com/api/webhooks/1372557753884606646/JRrqFlv0ohEmNfC-t6RL7lvvl53wZmlGhjva5l4UykLx9DdcdNO-ckhgYwTs2bJO6ulU",
    "1317437878615412746": "https://discord.com/api/webhooks/1372557755516190812/Pxigc_Aziw3ipEEB8D4IzTaXkK3_fLldJhBoooIneLeDofq3lAEevDaZKfixK5xngxfR",
    "1317451047119224852": "https://discord.com/api/webhooks/1372576150232104992/-oYYKTLi7byzF99dk0KA48a1G_tDEEaZ3c7bnU9hZO5zf3bn0pEbY3QNvSi04XY1x1Rz",
    "1278933083327959101": "https://discord.com/api/webhooks/1372557759223955626/sphJX5VAjmVLVhL_88XMzA21zxUNb-2Xri5VPPazyTjm2CBPPW8HVFbt8OjEOkAUj-Dg",
    "1317465860536926271": "https://discord.com/api/webhooks/1372557757395370095/-FTAX5U2dJo83mgt07f9-DSj8m1wL6xIhL-CGqxELcSjh9XhoTQjaOGgS2f5x-d6ShTv",
    "1351264185044177050": "https://discord.com/api/webhooks/1372557761283358750/SLzsrq8AEjjMoG_Xgc_vLqxgkbhpuXiFdXc6PYsjpif7uMY3vQ79J1nk-RrGpx-89q9O",
    "1317463733655572500": "https://discord.com/api/webhooks/1374778747898695770/rSV1XcXr0LsfJ1kvV3dVIf3eQwhhq1W00kfePBpoJMtLiny1uWTVeVXEig25KRrbpDhx",
    "1317463749174759444": "https://discord.com/api/webhooks/1374778945857257646/ljfvSypuAIA1Gx0_hp_0K6ZPFCK3Lim0_kbuV61oCN46-chzs7xM7PJi1BLAx3QcEMTk",
    "1317463761178722445": "https://discord.com/api/webhooks/1374779095283404881/pUDk3hfOwJeOq43dR20grZoM-6N9Y1KdRDHgQngiWfI5Ra5ru8IvInDlhE2VS0VSa3sm",
    "1317463834037977098": "https://discord.com/api/webhooks/1374779251974471710/TOFOSZj8mNZbhq6tNv0RRcFHyxTB3NIWM7AhnviNnmJnBfbPpgRy-NAioOGY9fED-I3S",
    "1364177975917936661": "https://discord.com/api/webhooks/1374779773351628800/XneIV1Bc14kEka883OjXvZf1epjPRkBkS0s2OstNXozIQ3s7wthvawCAVNW6hjEBfhOw",
    "1317447716464361512": "https://discord.com/api/webhooks/1374780093502718194/RKvIAVK4ppOpSKHTYmcbNhzd7sY0B9HmLNtas0ctLPy2PJH8qa2m6TCXd2o_npEDPDen",
    "1317429781628719135": "https://discord.com/api/webhooks/1374780282854576189/vVxBcN1B0UzEkv5MqK4-5VsZoa9kreOIAr2OuH5pvM5V6w4cuq98qkIx_AukcozwHJgA",
    "1317429915607498864": "https://discord.com/api/webhooks/1374780469287190698/nxhcnfO2x3dlhmipkgjttR3OoNXtvial7MJRkVWoFtEU5VezMT7m8fB75KRxkD1jmDcK"
}

const testWebhook = new WebhookClient({ url: "https://discord.com/api/webhooks/1373625036581244928/rtM31SWhuME6MQYSuKwpyjsMu1SQJ9ncJVwImRKwAe9H5FC-mvpYn17vEf368rn0KiMU" });

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
                username: "Stinky's Bot",
                embeds: [newEmbed],
                files: [
                    ...(containsImage ? ['image_final.jpg'] : []),
                    ...(containsThumbnail ? ['thumbnail_final.jpg'] : [])
                ]
            });
            // delete the output files
            if (containsImage) {
                fs.unlink('image_white.jpg', (err) => {
                    if (err && err.code !== 'ENOENT') throw err;
                    console.log('image_white.jpg was deleted');
                });
                fs.unlink('image_final.jpg', (err) => {
                    if (err && err.code !== 'ENOENT') throw err;
                    console.log('output_final.jpg was deleted');
                });
            }
            if (containsThumbnail) {
                fs.unlink('thumbnail_white.jpg', (err) => {
                    if (err && err.code !== 'ENOENT') throw err;
                    console.log('thumbnail_white.jpg was deleted');
                });
                fs.unlink('thumbnail_final.jpg', (err) => {
                    if (err && err.code !== 'ENOENT') throw err;
                    console.log('thumbnail_final.jpg was deleted');
                });

            }
        }
        // send attachments
        if (message.attachments.size > 0) {
            console.log("attachment found");
            let attachment = message.attachments.first();
            // run through removeWatermark
            await removeWatermark(attachment.url);
            // run through addWatermark
            await addWatermark('image_white.jpg', 'watermark.png', 'output_final.jpg', 0.35);
            // send to webhook
            await webhook.send({
                username: "Stinky's Bot",
                files: ['output_final.jpg']
            });
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
        if (message.content && message.content.length > 0) {
            // check if message has "<@" and ">" (its a role ping)
            console.log(message.content)
            const now = Date.now();
            const cooldown = 10000; // 10 seconds
            const lastEveryone = everyoneCooldowns.get(message.channel.id) || 0;
            let sentEveryone = false;
            if (message.content.includes("@everyone")) {
                if (now - lastEveryone > cooldown) {
                    const newContent = message.content.replace(/@everyone/g, "");
                    await webhook.send({
                        username: "Stinky's Bot",
                        content: newContent,
                    });
                    await webhook.send({
                        username: "Stinky's Bot",
                        content: "```You can mute pings from this channel by RIGHT CLICK or HOLD DOWN the channel and changing your NOTIFICATION SETTINGS. \n\n DO THE SAME WITH CATEGORY SETTINGS IF YOU WANT TO MUTE THE ENTIRE CATEGORY```",
                    });
                    everyoneCooldowns.set(message.channel.id, now);
                    sentEveryone = true;
                } // else: skip sending @everyone replacement and warning
            } else if (message.content.includes("<@") && message.content.includes(">")) {
                if (now - lastEveryone > cooldown) {
                    console.log("role ping found");
                    // replace all numbers between with nothing, and replace "<@>" with @everyone 
                    const newContent = message.content.replace(/<@!?\d+>|<@&\d+>/g, '@everyone');
                    // send message to webhook
                    await webhook.send({
                        username: "Stinky's Bot",
                        content: newContent,
                    });
                    await webhook.send({
                        username: "Stinky's Bot",
                        content: "```You can mute pings from this channel by RIGHT CLICK or HOLD DOWN the channel and changing your NOTIFICATION SETTINGS. \n\n DO THE SAME WITH CATEGORY SETTINGS IF YOU WANT TO MUTE THE ENTIRE CATEGORY```",
                    });
                    everyoneCooldowns.set(message.channel.id, now);
                    sentEveryone = true;
                } // else: skip sending @everyone replacement and warning
            }
            if (!sentEveryone) {
                // send message to webhook
                await webhook.send({
                    username: "Stinky's Bot",
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
                username: "Stinky's Bot",
                embeds: [newEmbed],
                files: [
                    ...(containsImage ? ['image_final.jpg'] : []),
                    ...(containsThumbnail ? ['thumbnail_final.jpg'] : [])
                ]
            });
            // delete the output files
            if (containsImage) {
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
                fs.unlink('thumbnail_white.jpg', (err) => {
                    if (err && err.code !== 'ENOENT') throw err;
                    console.log('thumbnail_white.jpg was deleted');
                });
                fs.unlink('thumbnail_final.jpg', (err) => {
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
                username: "Stinky's Bot",
                files: ['output_final.jpg']
            });
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
                username: "Stinky's Bot",
                content: newMessage.content,
            });
        }
    }
});

client.login(process.env.TOKEN);