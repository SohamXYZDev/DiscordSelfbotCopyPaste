// Test script to verify channel loading
require('dotenv').config();

const channelMatchDict = {};

// Dynamically load all CHANNEL_X and WEBHOOK_X pairs from .env
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
console.log(`\n📋 Channel IDs loaded:`);
Object.keys(channelMatchDict).forEach((channelId, index) => {
    console.log(`  ${index + 1}. ${channelId}`);
});
