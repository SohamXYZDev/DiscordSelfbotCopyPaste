# Discord Message Mirror Bot with Component Interaction

A Discord selfbot that monitors specified channels and mirrors messages to your own server via webhooks, with automatic Discord component (button) detection and interaction capabilities.

## ⚠️ IMPORTANT DISCLAIMER

**This project uses a Discord selfbot, which violates Discord's Terms of Service. Use at your own risk. Your account may be banned if detected by Discord.**
**Therefore,**
**This code is served "as-is" and for experimentation and learning purposes only.**

## Features

- 🔄 **Message Mirroring**: Automatically forwards messages from monitored channels to your server
- 🖼️ **Image Forwarding**: Forwards images from embeds and attachments
- � **Component Interaction**: Automatically detects and clicks Discord buttons (especially "View Slip" buttons)
- 📎 **Attachment Support**: Forwards image attachments and embeds
- ✏️ **Edit Tracking**: Monitors message edits and updates mirrored messages
- 🎭 **Custom Branding**: Uses configurable bot username for forwarded messages
- � **Debug Logging**: Detailed component detection and interaction logging

## How It Works

### Component Detection

1. **Button Scanning**: Monitors all messages for Discord components (buttons, select menus, etc.)
2. **Auto-Interaction**: Automatically clicks buttons with specific custom IDs (like "view_slip")
3. **Detailed Logging**: Shows component properties, types, styles, and interaction results

### Message Forwarding

- Preserves embed structure (title, description, color, footer, etc.)
- Forwards images both within embeds and as separate attachments
- Handles @everyone mentions by removing them
- Supports up to 20 channel-to-webhook mappings

## Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd DiscordSelfbotCopyPaste
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   - Copy `.env.example` to `.env` (if available) or create a new `.env` file
   - Configure all required variables (see Configuration section)

## Configuration

### Required Environment Variables

```env
# Discord Bot Token (Your account token)
TOKEN=your_discord_token_here

# Bot Display Name (Optional, defaults to "Bot")
BOT_USERNAME=Your Bot or Webhook Name

# Test Webhook (Optional - only needed for testing)
TEST_WEBHOOK=https://discord.com/api/webhooks/your_test_webhook_here

# Channel IDs to monitor (you only need the ones you want to use)
CHANNEL_1=channel_id_to_monitor
CHANNEL_2=another_channel_id
# ... up to CHANNEL_20 (only define what you need)

# Corresponding webhook URLs for your server
WEBHOOK_1=https://discord.com/api/webhooks/your_webhook_url
WEBHOOK_2=https://discord.com/api/webhooks/another_webhook_url
# ... up to WEBHOOK_20 (only define what you need)
CHANNEL_2=another_channel_id
CHANNEL_2=another_channel_id
# ... up to CHANNEL_20 (only define what you need)

# Corresponding webhook URLs for your server
WEBHOOK_1=https://discord.com/api/webhooks/your_webhook_url
WEBHOOK_2=https://discord.com/api/webhooks/another_webhook_url
# ... up to WEBHOOK_20 (only define what you need)
```

### Channel-Webhook Mapping

The bot maps source channels to destination webhooks:

- `CHANNEL_1` → `WEBHOOK_1`
- `CHANNEL_2` → `WEBHOOK_2`
- And so on...

### Component Interaction Configuration

The bot automatically detects and interacts with Discord components:

- **Auto-Click**: Automatically clicks buttons with `custom_id: "view_slip"`
- **Logging**: Shows detailed information about all detected components
- **Fallback Methods**: Uses multiple interaction methods for better compatibility

## Usage

1. **Start the bot**

   ```bash
   node index.js
   ```

2. **Monitor the console**

   - The bot will log when it's ready: `Logged in as YourUsername#1234`
   - Component detection will show detailed information about Discord buttons
   - Auto-clicking will show success/failure messages

3. **Test functionality**
   - Send a message with an embed/image in a monitored channel
   - Check your destination channel for the mirrored message
   - Watch for component interaction logs when buttons appear

## Console Output Examples

### Component Detection

```
=== MESSAGE RECEIVED ===
Channel ID: 1415090591447908499
Message ID: 1415728338361651432
Author: someuser#1234

=== COMPONENTS FOUND ===
Component: View Slip (ID: view_slip)
Component: Show All Slips (ID: show_all)
🎯 FOUND VIEW_SLIP BUTTON - ATTEMPTING TO CLICK
✅ Successfully clicked view_slip button
```

## File Structure

```
DiscordSelfbotCopyPaste/
├── index.js           # Main bot code
├── package.json       # Dependencies
├── .env              # Configuration file
├── .env.example      # Example configuration
└── README.md         # This file
```

## Technical Details

### Dependencies

- `discord.js-selfbot-v13` - Discord selfbot functionality
- `dotenv` - Environment variable management
- `axios` - HTTP requests

### Component Interaction

The bot automatically:

- Detects Discord components (buttons, select menus)
- Logs detailed component information
- Auto-clicks buttons with `custom_id: "view_slip"`
- Uses fallback interaction methods for compatibility

## Supported Content Types

### ✅ Supported

- Text messages
- Image attachments (PNG, JPG, GIF, etc.)
- Embed images and thumbnails
- Discord components (buttons, select menus)
- Message edits and updates
- Message edits and updates

### ❌ Not Supported

- Video files (forwarded but not processed)
- Audio files
- Other file types

## Limitations

- **Discord ToS**: Using selfbots violates Discord's Terms of Service
- **Rate Limits**: Subject to Discord's API rate limits
- **Component Access**: Can only interact with components the user account has access to
- **Channel Limit**: Maximum 20 monitored channels
- **Webhook Validation**: Only creates webhooks for valid URLs

## Troubleshooting

### Common Issues

1. **Bot won't start**

   - Check if your token is valid
   - Ensure webhook URLs are valid Discord webhook URLs
   - Verify environment variables are set correctly

2. **Components not detected**

   - Check console logs for component detection messages
   - Ensure the bot has access to the channel
   - Verify the message actually contains components

3. **Button clicks failing**

   - Check if the bot has permission to interact with components
   - Verify the component's `custom_id` matches "view_slip"
   - Look for error messages in console logs

4. **Images not forwarding**

   - Check if images are being detected in console logs
   - Verify webhook has permission to send files
   - Ensure image URLs are accessible

### Error Messages

- `WEBHOOK_URL_INVALID` - Check your webhook URLs in .env file
- `Failed to click button` - Component interaction failed, check permissions
- `No view_slip button found` - The message doesn't contain the expected button
- `No components detected` - The message doesn't have any interactive elements

### Debug Information

The bot provides detailed logging for troubleshooting:

- **Message Reception**: Shows when messages are received and their basic info
- **Component Detection**: Lists all components found in messages
- **Interaction Attempts**: Shows success/failure of button clicks
- **Channel Filtering**: Only logs information for monitored channels

## Legal Notice

This project is for educational purposes only. The authors are not responsible for any consequences of using this software, including but not limited to Discord account suspension or termination.

## Contributing

Feel free to submit issues, feature requests, or pull requests to improve the bot's functionality.

Created & maintained by Soham Mitra (SohamXYZ)

- 🌐 Website: [https://sohamxyz.com](https://sohamxyz.com)
- 📧 Email: soham@sohamxyz.com
- 💬 Discord: sohamxyz
- 🧠 discord bot/automation inquiries welcome!

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is provided as-is without any warranty. Use at your own risk.

---

**⚠️ Remember: This violates Discord's Terms of Service. Use responsibly and at your own risk.**
