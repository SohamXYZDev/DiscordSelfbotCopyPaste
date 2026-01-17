# Discord Selfbot with Dynamic Channel Mirroring

A Discord selfbot that automatically mirrors messages from source channels to dynamically created mirror channels with automatic webhook management.

## ⚠️ IMPORTANT DISCLAIMER

**This project uses a Discord selfbot, which violates Discord's Terms of Service. Use at your own risk. Your account may be banned if detected by Discord.**  
**This code is provided "as-is" for experimentation and learning purposes only.**

## ✨ Features

- **⚙️ Centralized Configuration**: All settings in `config.json` - only tokens in `.env`
- **🤖 Automatic Channel Creation**: Automatically creates mirror channels in your target server with matching names
- **🗺️ Manual Channel Mapping**: Option to map source channels to existing target channels (prevents duplicates!)
- **🔗 Dynamic Webhook Management**: Creates and stores webhooks automatically - no manual setup required!
- **🔄 Hot Reload Config**: Edit `config.json` to change any setting without restarting the bot!
- **📁 Category Structure Options**:
  - Create all mirror channels in a specified category
  - OR copy the source channel's category structure automatically
- **♾️ Unlimited Channels**: Monitor as many source channels as you want
- **🤖 Bot Mode**: Use a separate bot account instead of webhooks for replying and editing
- **🌐 Full Server Copy**: Mirror ALL channels from an entire server automatically
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

Copy `.env.example` to `.env` and add your **tokens** (sensitive data only):

```env
# Your Discord selfbot token (REQUIRED)
TOKEN=your_discord_token_here

# Bot token (only if using bot mode)
BOT_TOKEN=your_bot_token_here
```

### 3. Configure Settings

Copy `config.json.example` to `config.json` and customize (all non-sensitive settings):

```json
{
  "targetGuildId": "your_target_guild_id_here",
  
  "modes": {
    "useBotMode": false,
    "fullServerCopy": false,
    "autoCreateChannels": true
  },
  
  "channels": [
    "source_channel_id_1",
    "source_channel_id_2"
  ],
  
  "categorySettings": {
    "targetCategoryId": "",
    "copyCategoryStructure": false
  },
  
  "botSettings": {
    "username": "Bot"
  }
}
```

**How to get IDs:**
- Enable Developer Mode in Discord (Settings → Advanced → Developer Mode)
- Right-click server/channel/category → Copy ID

### 4. Configure Channels

Edit the `channels` field in `config.json` (supports hot reloading):

### 4. Configure Channels

Edit the `channels` field in `config.json` (supports hot reloading):

**Option A: Auto-create mode (default)** - Array format:
```json
{
  "channels": [
    "959825174453178408",
    "1133806078027644978",
    "1030038318668333066"
  ]
}
```

**Option B: Manual mapping mode** - Object format:
```json
{
  "channels": {
    "source_channel_id_1": "target_channel_id_1",
    "source_channel_id_2": "target_channel_id_2",
    "source_channel_id_3": "target_channel_id_3"
  }
}
```

Use manual mapping when:
- ✅ You already have target channels from a previous setup
- ✅ Source server deletes/remakes channels (prevents duplicate creation)
- ✅ You want specific channel pairing control

To enable manual mapping, also set in `config.json`:
```json
{
  "modes": {
    "autoCreateChannels": false
  }
}
```

**Changes take effect immediately** - no restart needed! Just save `config.json` and the bot automatically detects:
- ✅ Added channels
- 🗑️ Removed channels
- ⚙️ Updated settings

**Optional settings:**

All optional settings are in `config.json`. See `config.json.example` for full list:

```json
{
  "modes": {
    "useBotMode": false,
    "fullServerCopy": false,
    "autoCreateChannels": true
  },
  "sourceGuildId": "",
  "categorySettings": {
    "targetCategoryId": "",
    "copyCategoryStructure": false
  },
  "botSettings": {
    "username": "Bot"
  }
}
```

### 5. Run the Bot

```bash
node index.js
```

### 6. First Run - What to Expect

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

### Operating Modes

#### Mode 1: Individual Channels + Webhooks (Default)
```json
{
  "modes": {
    "useBotMode": false,
    "fullServerCopy": false
  }
}
```
Configure channels in `config.json`. Perfect for selective monitoring with hot reload.

#### Mode 2: Individual Channels + Bot Account
```json
{
  "modes": {
    "useBotMode": true,
    "fullServerCopy": false
  }
}
```
Add `BOT_TOKEN` to `.env`. Allows replying and editing messages.

**Bot Setup:**
1. Create bot at https://discord.com/developers/applications
2. Add to target server with permissions: Send Messages, Embed Links, Attach Files, Read Message History
3. Copy bot token to `.env`

#### Mode 3: Full Server Copy + Webhooks
```json
{
  "modes": {
    "useBotMode": false,
    "fullServerCopy": true
  },
  "sourceGuildId": "source_server_id_here"
}
```
Copies ALL text channels from entire source server. No need to list individual channels.

#### Mode 4: Full Server Copy + Bot Account
```json
{
  "modes": {
    "useBotMode": true,
    "fullServerCopy": true
  },
  "sourceGuildId": "source_server_id_here"
}
```
Best for large operations. Bot must be in both source and target servers.

### Mode Comparison

| Feature | Webhook Mode | Bot Mode |
|---------|--------------|----------|
| Setup Complexity | ✅ Simple | ⚠️ Needs bot account |
| Can Reply | ❌ No | ✅ Yes |
| Can Edit | ❌ No | ✅ Yes |
| Rate Limits | ✅ Lower | ⚠️ Higher |
| Custom Username | ✅ Yes | ❌ Shows bot name |

| Feature | Individual Channels | Full Server |
|---------|---------------------|-------------|
| Setup | `config.json` | Just sourceGuildId |
| Selective | ✅ Choose specific | ❌ Copies everything |
| Hot Reload | ✅ Yes (config.json) | ❌ Restart required |

### Configuration Files

**config.json** (all settings, hot reload supported):
- `targetGuildId` - Target server ID
- `modes` - useBotMode, fullServerCopy, autoCreateChannels
- `channels` - Array or object for channel mapping
- `sourceGuildId` - For full server copy
- `categorySettings` - targetCategoryId, copyCategoryStructure
- `botSettings` - username

**.env** (tokens only, sensitive):
- `TOKEN` - Discord selfbot token
- `BOT_TOKEN` - Bot account token (if using bot mode)

### Required Settings

| Variable/Field     | File         | Description                                      |
| ------------------ | ------------ | ------------------------------------------------ |
| `TOKEN`            | `.env`       | Your Discord selfbot token                       |
| `targetGuildId`    | `config.json`| Server ID where mirror channels will be created  |
| `channels`         | `config.json`| Source channel IDs to monitor                    |

### Optional Settings

All in `config.json`:

| Field                           | Default | Description                                                     |
| ------------------------------- | ------- | --------------------------------------------------------------- |
| `modes.useBotMode`              | `false` | Use bot account instead of webhooks for forwarding              |
| `modes.fullServerCopy`          | `false` | Copy all channels from source server                            |
| `modes.autoCreateChannels`      | `true`  | Auto-create target channels. Set `false` for manual mappings    |
| `sourceGuildId`                 | `""`    | Source server ID (required if `fullServerCopy=true`)            |
| `categorySettings.targetCategoryId` | `""` | Category ID to create all mirror channels under                 |
| `categorySettings.copyCategoryStructure` | `false` | If `true`, recreates source category structure         |
| `botSettings.username`          | `"Bot"` | Username displayed in webhook messages                          |

And in `.env`:

| Variable    | Default | Description                                   |
| ----------- | ------- | --------------------------------------------- |
| `BOT_TOKEN` | `null`  | Bot token (required if `useBotMode=true`)     |

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

- **`config.json`**: Main configuration file (you create/edit this, supports hot reload)
  
  **Array format (auto-create):**
  ```json
  {
    "targetGuildId": "...",
    "channels": [
      "channel_id_1",
      "channel_id_2"
    ]
  }
  ```
  
  **Object format (manual mapping):**
  ```json
  {
    "targetGuildId": "...",
    "modes": {
      "autoCreateChannels": false
    },
    "channels": {
      "source_channel_id_1": "target_channel_id_1",
      "source_channel_id_2": "target_channel_id_2"
    }
  }
  ```

- **`webhooks.json`**: Auto-generated file storing channel/webhook mappings
  ```json
  {
    "source_channel_id": {
      "webhookUrl": "https://discord.com/api/webhooks/...",
      "targetChannelId": "mirror_channel_id",
      "targetChannelName": "channel-name",
      "sourceChannelName": "original-name",
      "createdAt": "2025-12-21T...",
      "manualMapping": false
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

### Manual Channel Mapping

When you want to use existing target channels instead of auto-creating:

1. Set `autoCreateChannels: false` in `config.json` modes
2. Use object format for channels:
   ```json
   {
     "modes": {
       "autoCreateChannels": false
     },
     "channels": {
       "source_channel_id": "target_channel_id"
     }
   }
   ```

**Benefits:**
- Reuse existing channels from previous setups
- Prevents duplicates when source channels are deleted/remade
- Full control over which source maps to which target

**Example:**
```json
{
  "channels": {
    "959825174453178408": "1367853127859966105",
    "1133806078027644978": "1367853127859966106",
    "1030038318668333066": "1367853127859966107"
  }
}
```

Hot reload works with manual mappings too! Edit `config.json`, save, and changes apply instantly.

### Adding More Channels

**With `config.json` (Recommended):**

Simply edit the file and save:

```json
{
  "channels": [
    "existing_channel_id",
    "new_channel_id_here",
    "another_new_channel_id"
  ]
}
```

Bot detects changes and reloads automatically! Console shows:
```
🔄 Detected change in config.json, reloading...
✅ Added 2 new channel(s): [...]
📊 Total channels loaded: 5
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
| "TARGET_GUILD_ID not configured" | Add `targetGuildId` to `config.json`                                                    |
| "Could not fetch target guild"   | 1. Verify your token's account is in the target server<br>2. Check server ID is correct |
| "Error creating channel"         | Bot needs "Manage Channels" permission in target server                                 |
| "Error creating webhook"         | Bot needs "Manage Webhooks" permission in target server                                 |
| "No source channels configured"  | Add at least one channel to `config.json`                                               |
| No messages forwarded            | 1. Verify source channel IDs are correct<br>2. Check bot can see those channels         |
| Webhook creation fails           | Make sure target server isn't at webhook limit (15 per channel)                         |
| "No manual mapping found"        | Using manual mode? Add mapping in `config.json` channels object format                  |
| Duplicate channels created       | Set `autoCreateChannels: false` in config.json and use manual mappings                  |
| Config not loading               | Check `config.json` syntax is valid JSON (use a JSON validator)                         |

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

- `config.json` - main configuration (you create/edit this)
- `webhooks.json` - stores all mappings (auto-generated)

**Note:** Both files are in `.gitignore` for security.

## Socials

Created & maintained by Soham Mitra (SohamXYZ)

- 🌐 Website: [https://sohamxyz.com](https://sohamxyz.com)
- 📧 Email: soham@sohamxyz.com
- 💬 Discord: sohamxyz
- 🧠 bots/selfbots/automation/dev inquiries welcome!
