# Discord Selfbot with Dynamic Channel Mirroring

A Discord selfbot that automatically mirrors messages from source channels to dynamically created mirror channels with automatic webhook management.

## ⚠️ IMPORTANT DISCLAIMER

**This project uses a Discord selfbot, which violates Discord's Terms of Service. Use at your own risk. Your account may be banned if detected by Discord.**  
**This code is provided "as-is" for experimentation and learning purposes only.**

## ✨ Features

- **🤖 Automatic Channel Creation**: Automatically creates mirror channels in your target server with matching names
- **🔗 Dynamic Webhook Management**: Creates and stores webhooks automatically - no manual setup required!
- **📁 Category Structure Options**:
  - Create all mirror channels in a specified category
  - OR copy the source channel's category structure automatically
- **♾️ Unlimited Channels**: Monitor as many source channels as you want
- **💾 Persistent Storage**: Webhooks are saved to `webhooks.json` for reuse across restarts
- **🎯 Slip ID Extraction**: Detects and extracts slip identifiers from Discord messages with components
- **📊 Comprehensive Logging**: Detailed console output for debugging and monitoring
- **✏️ Edit Tracking**: Monitors message edits and updates mirrored messages

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and configure the **required** settings:

```env
# REQUIRED: Your Discord selfbot token
TOKEN=your_discord_token_here

# REQUIRED: Server ID where mirror channels will be created
TARGET_GUILD_ID=your_target_guild_id_here

# REQUIRED: Source channels to monitor
CHANNEL_1=source_channel_id_1
CHANNEL_2=source_channel_id_2
# Add as many as you need...
```

**How to get IDs:**

- Enable Developer Mode in Discord (Settings → Advanced → Developer Mode)
- Right-click server/channel → Copy ID

**Optional settings:**

```env
# Put all mirror channels in one category
TARGET_CATEGORY_ID=category_id_here

# OR copy source category structure (true/false)
COPY_CATEGORY_STRUCTURE=false

# Customize webhook username
BOT_USERNAME=Mirror Bot
```

### 3. Run the Bot

```bash
node index.js
```

### 4. First Run - What to Expect

On first run, when a message appears in a monitored channel:

1. **Automatic Setup**: Bot creates a mirror channel with the same name
2. **Webhook Creation**: Creates a webhook automatically
3. **Storage**: Saves mapping to `webhooks.json`
4. **Message Forward**: Forwards the message immediately

**Console output:**

```
📨 Message received in channel-name
🆕 No webhook found, creating new channel and webhook...
📍 Target guild: Your Server Name
🆕 Creating channel: channel-name
✅ Created channel: channel-name
🔗 Creating webhook...
✅ Created webhook
💾 Saved webhook mappings
✅ Message successfully mirrored!
```

**Subsequent messages** in the same channel will use the stored webhook instantly!

## ⚙️ Configuration Options

### Required Settings

| Variable          | Description                                      |
| ----------------- | ------------------------------------------------ |
| `TOKEN`           | Your Discord selfbot token                       |
| `TARGET_GUILD_ID` | Server ID where mirror channels will be created  |
| `CHANNEL_X`       | Source channel IDs to monitor (X = 1, 2, 3, ...) |

### Optional Settings

| Variable                  | Default | Description                                                     |
| ------------------------- | ------- | --------------------------------------------------------------- |
| `BOT_USERNAME`            | `"Bot"` | Username displayed in webhook messages                          |
| `TARGET_CATEGORY_ID`      | `null`  | Category ID to create all mirror channels under                 |
| `COPY_CATEGORY_STRUCTURE` | `false` | If `true`, recreates source category structure in target server |

## 📋 How It Works

1. **Startup**: Bot loads source channel IDs and existing webhook mappings from `webhooks.json`
2. **Message Received**: When a message appears in a monitored source channel:
   - Checks if mirror channel/webhook exists
   - If not, creates mirror channel (with same name as source)
   - Creates webhook in mirror channel
   - Saves mapping to `webhooks.json`
   - Forwards the message
3. **Future Messages**: Uses stored webhook for instant forwarding

## 📁 Files Generated

- **`webhooks.json`**: Auto-generated file storing channel/webhook mappings
  ```json
  {
    "source_channel_id": {
      "webhookUrl": "https://discord.com/api/webhooks/...",
      "targetChannelId": "mirror_channel_id",
      "targetChannelName": "channel-name",
      "sourceChannelName": "original-name",
      "createdAt": "2025-12-21T..."
    }
  }
  ```

## 🎯 Slip ID Extraction

When messages with Discord components (buttons) are detected, the bot extracts:

- Message ID and timestamps
- CDN parameters (`ex`, `is`, `hm`) from image URLs
- Interaction metadata (command names, user info)
- Attachment IDs

This is useful for tracking betting slips or other interactive content.

## 🔧 Advanced Usage

### Category Structure Copying

When `COPY_CATEGORY_STRUCTURE=true`:

- Bot detects the source channel's category
- Creates matching category in target server (if doesn't exist)
- Places mirror channel in matching category
- Maintains organized server structure automatically

### Adding More Channels

Simply add new `CHANNEL_X` entries to `.env`:

```env
CHANNEL_26=new_channel_id_here
CHANNEL_27=another_channel_id
# No webhooks needed - they're created automatically!
```

## 🛡️ Security Notes

- This uses Discord selfbot functionality (against Discord ToS)
- Token is sensitive - never share your `.env` file
- Bot requires "Manage Channels" and "Manage Webhooks" permissions in target server
- Webhook URLs are stored locally in `webhooks.json`

## 🐛 Debugging

The bot provides detailed console output:

- ✅ Success messages (green check)
- ❌ Error messages (red X)
- 📊 Status information (chart emoji)
- 🔍 Processing steps (magnifying glass)

Check the console for real-time monitoring of:

- Channel loading status
- Webhook creation progress
- Message forwarding confirmation
- Error details with codes

## 📝 Example Output

```
🔍 Loading source channel IDs from .env...
✅ Loaded source channel 1: 123456789012345678
✅ Loaded source channel 2: 234567890123456789
...

📊 Total source channels to monitor: 25
🎯 Target guild ID: 987654321098765432

📂 Loaded existing webhook mappings: 3

✅ Logged in as YourBot#1234
📡 Monitoring 25 source channels
🔄 Ready to mirror messages!

📨 Message received in general (123456789012345678)
   Author: User#1234
   Content: Hello world...
   Embeds: 1, Attachments: 0

🔍 Processing channel: general (123456789012345678)
✅ Using existing webhook for general
📤 Forwarding 1 embed(s)...
✅ Embed(s) forwarded

✅ Message successfully mirrored from general
```

## 🆘 Troubleshooting

### Common Issues

| Issue                            | Solution                                                                                |
| -------------------------------- | --------------------------------------------------------------------------------------- |
| "TARGET_GUILD_ID not configured" | Add `TARGET_GUILD_ID=your_server_id` to `.env`                                          |
| "Could not fetch target guild"   | 1. Verify your token's account is in the target server<br>2. Check server ID is correct |
| "Error creating channel"         | Bot needs "Manage Channels" permission in target server                                 |
| "Error creating webhook"         | Bot needs "Manage Webhooks" permission in target server                                 |
| "No source channels configured"  | Add at least one `CHANNEL_X` to `.env`                                                  |
| No messages forwarded            | 1. Verify source channel IDs are correct<br>2. Check bot can see those channels         |
| Webhook creation fails           | Make sure target server isn't at webhook limit (15 per channel)                         |

### Permissions Required

Your Discord account needs these permissions in the **target server**:

- ✅ Manage Channels
- ✅ Manage Webhooks
- ✅ Send Messages
- ✅ Embed Links
- ✅ Attach Files

### Reset/Fresh Start

If you need to start over:

1. Delete `webhooks.json`
2. Optionally delete created mirror channels in target server
3. Run bot again - it will recreate everything

### Getting Help

Check the console output for detailed error messages. Every operation is logged with:

- ✅ Success indicators
- ❌ Error details with descriptions
- 🔍 Processing steps

## 📦 What Gets Created

### In Your Target Server

- Mirror channels (one per source channel)
- Webhooks (one per mirror channel)
- Categories (if `COPY_CATEGORY_STRUCTURE=true`)

### In Your Project Folder

- `webhooks.json` - stores all mappings (auto-generated)

**Note:** `webhooks.json` is in `.gitignore` for security - webhook URLs should not be committed.

## Socials

Created & maintained by Soham Mitra (SohamXYZ)

- 🌐 Website: [https://sohamxyz.com](https://sohamxyz.com)
- 📧 Email: soham@sohamxyz.com
- 💬 Discord: sohamxyz
- 🧠 bots/selfbots/automation/dev inquiries welcome!
