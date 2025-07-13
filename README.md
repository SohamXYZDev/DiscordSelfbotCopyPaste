# Discord Message Mirror Bot with Watermark Processing

A Discord selfbot that monitors specified channels and mirrors messages to your own server via webhooks, with automatic watermark removal and replacement functionality for images.

## ⚠️ IMPORTANT DISCLAIMER

**This project uses a Discord selfbot, which violates Discord's Terms of Service. Use at your own risk. Your account may be banned if detected by Discord.**

## Features

- 🔄 **Message Mirroring**: Automatically forwards messages from monitored channels to your server
- 🖼️ **Image Processing**: Removes configurable-color watermarks from images and replaces them with your own watermark
- 🎨 **Configurable Watermark Detection**: Specify any RGB color to detect and remove
- 📎 **Attachment Support**: Processes image attachments and embeds
- ✏️ **Edit Tracking**: Monitors message edits and updates mirrored messages
- 🎭 **Custom Branding**: Replaces watermarks with your own branding
- 📺 **Video Handling**: Skips video processing to avoid errors

## How It Works

### Watermark Removal Algorithm

1. **Color Analysis**: Scans the image to find the most frequent color
2. **Watermark Detection**: Identifies pixels matching the configured watermark color (with tolerance)
3. **Pixel Replacement**: Replaces watermark pixels with colors from adjacent areas (10 pixels left/right)

### Watermark Addition

- Adds your custom watermark (`watermark.png`) to processed images
- Configurable opacity (default: 35%)
- Positioned with proper scaling and margins

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

4. **Add your watermark**
   - Place your watermark image as `watermark.png` in the project root
   - Recommended: PNG format with transparency

## Configuration

### Required Environment Variables

```env
# Discord Bot Token (Your account token)
TOKEN=your_discord_token_here

# Bot Display Name
BOT_USERNAME=Your Bot or Webhook Name

# Watermark Color Detection (RGB values separated by commas)
# This is the color that will be detected and removed from images
# Default: 0,100,255 (blue) - Change to match the watermark color you want to remove
WATERMARK_COLOR=0,100,255

# Test Webhook (Optional)
TEST_WEBHOOK=https://discord.com/api/webhooks/your_test_webhook_here

# Channel IDs to monitor (up to 20 channels)
CHANNEL_1=channel_id_to_monitor
CHANNEL_2=another_channel_id
# ... up to CHANNEL_20

# Corresponding webhook URLs for your server (up to 20 webhooks)
WEBHOOK_1=https://discord.com/api/webhooks/your_webhook_url
WEBHOOK_2=https://discord.com/api/webhooks/another_webhook_url
# ... up to WEBHOOK_20
```

### Channel-Webhook Mapping

The bot maps source channels to destination webhooks:

- `CHANNEL_1` → `WEBHOOK_1`
- `CHANNEL_2` → `WEBHOOK_2`
- And so on...

### Watermark Color Configuration

The `WATERMARK_COLOR` environment variable allows you to specify which color should be detected and removed from images:

- **Format**: RGB values separated by commas (e.g., `255,0,0` for red)
- **Default**: `0,100,255` (blue)
- **Tolerance**: The bot uses a tolerance of ±30 for each RGB component to account for slight color variations
- **Examples**:
  - Blue watermarks: `0,100,255`
  - Red watermarks: `255,0,0`
  - Green watermarks: `0,255,0`
  - White watermarks: `255,255,255`
  - Black watermarks: `0,0,0`

To find the exact color of a watermark, you can use any color picker tool or image editing software.

## Usage

1. **Start the bot**

   ```bash
   node index.js
   ```

2. **Monitor the console**

   - The bot will log when it's ready: `Logged in as YourUsername#1234`
   - Processing messages will show status updates

3. **Test functionality**
   - Send a message with an image in a monitored channel
   - Check your destination channel for the mirrored message with processed image

## File Structure

```
DiscordSelfbotCopyPaste/
├── index.js           # Main bot code
├── package.json       # Dependencies
├── .env              # Configuration file
├── watermark.png     # Your custom watermark image
└── README.md         # This file
```

## Technical Details

### Dependencies

- `discord.js-selfbot-v13` - Discord selfbot functionality
- `jimp` - Image processing
- `dotenv` - Environment variable management
- `axios` - HTTP requests
- `discord.js` - Discord API types

### Temporary Files

The bot creates temporary files during processing:

- `image_white.jpg` - Watermark-removed image
- `image_final.jpg` - Final image with your watermark
- `thumbnail_white.jpg` - Processed thumbnail
- `thumbnail_final.jpg` - Final thumbnail
- `output_final.jpg` - Processed attachment

All temporary files are automatically deleted after processing.

## Supported Content Types

### ✅ Supported

- Text messages
- Image attachments (PNG, JPG, GIF)
- Embed images and thumbnails
- Message edits

### ❌ Not Supported

- Video files (skipped automatically)
- Audio files
- Other file types

## Limitations

- **Discord ToS**: Using selfbots violates Discord's Terms of Service
- **Rate Limits**: Subject to Discord's API rate limits
- **Watermark Detection**: Only removes pixels matching the configured `WATERMARK_COLOR`
- **Image Quality**: Processing may affect image quality
- **Channel Limit**: Maximum 20 monitored channels

## Troubleshooting

### Common Issues

1. **Bot won't start**

   - Check if your token is valid
   - Ensure all required environment variables are set

2. **Images not processing**

   - Verify `watermark.png` exists in the project root
   - Check console for error messages
   - Ensure the `WATERMARK_COLOR` matches the watermark in your images
   - Try adjusting the RGB values in `WATERMARK_COLOR` to better match the watermark

3. **Watermark not being removed**

   - Use a color picker tool to find the exact RGB values of the watermark
   - Update `WATERMARK_COLOR` in your `.env` file with the correct RGB values
   - The bot uses a tolerance of ±30 for each RGB component, so exact matches aren't required

4. **Webhooks failing**
   - Verify webhook URLs are correct and active
   - Check webhook permissions

### Error Messages

- `image_white.jpg not created` - Watermark removal failed
- `Failed to process attachment` - Image processing error
- `Video detected, skipping processing` - Video files are intentionally skipped

## Legal Notice

This project is for educational purposes only. The authors are not responsible for any consequences of using this software, including but not limited to Discord account suspension or termination.

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
