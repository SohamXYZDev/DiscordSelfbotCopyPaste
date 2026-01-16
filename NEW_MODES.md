# New Features Added

## 🤖 Bot Mode

Instead of using webhooks, you can now use a separate bot account to forward messages. This allows:

- ✅ **Replying to messages** - Bot can reply to specific messages
- ✅ **Editing messages** - Bot can edit previously sent messages  
- ✅ **Full message control** - More Discord API features available

### Setup Bot Mode:

1. Create a bot at https://discord.com/developers/applications
2. Add bot to your target server with permissions:
   - Send Messages
   - Embed Links
   - Attach Files
   - Read Message History
3. Copy the bot token
4. Update `.env`:
   ```env
   USE_BOT_MODE=true
   BOT_TOKEN=your_bot_token_here
   ```

## 🌐 Full Server Copy Mode

Instead of listing individual channels, copy ALL messages from an entire server:

- ✅ **No channel IDs needed** - Just provide source server ID
- ✅ **All text channels monitored** - Automatically detects all channels
- ✅ **Dynamic updates** - New channels added to source server are picked up on restart

### Setup Full Server Mode:

Update `.env`:
```env
FULL_SERVER_COPY=true
SOURCE_GUILD_ID=your_source_server_id_here
```

This will ignore all `CHANNEL_X` settings and copy the entire server.

## Configuration Combinations

### Mode 1: Webhook Mode + Individual Channels (Original)
```env
USE_BOT_MODE=false
FULL_SERVER_COPY=false
CHANNEL_1=123...
CHANNEL_2=456...
```

### Mode 2: Bot Mode + Individual Channels
```env
USE_BOT_MODE=true
BOT_TOKEN=your_bot_token
FULL_SERVER_COPY=false
CHANNEL_1=123...
CHANNEL_2=456...
```

### Mode 3: Webhook Mode + Full Server Copy
```env
USE_BOT_MODE=false
FULL_SERVER_COPY=true
SOURCE_GUILD_ID=789...
```

### Mode 4: Bot Mode + Full Server Copy (Recommended for large operations)
```env
USE_BOT_MODE=true
BOT_TOKEN=your_bot_token
FULL_SERVER_COPY=true
SOURCE_GUILD_ID=789...
```

## Benefits of Each Mode

| Feature | Webhook Mode | Bot Mode |
|---------|--------------|----------|
| Setup Complexity | ✅ Simple | ⚠️ Needs bot account |
| Can Reply | ❌ No | ✅ Yes |
| Can Edit | ❌ No | ✅ Yes |
| Rate Limits | ✅ Lower | ⚠️ Higher |
| Custom Username | ✅ Yes | ❌ Shows bot name |

| Feature | Individual Channels | Full Server |
|---------|---------------------|-------------|
| Setup | ⚠️ List each channel | ✅ Just server ID |
| Selective | ✅ Choose specific channels | ❌ Copies everything |
| Channel Count | ⚠️ Manual updates | ✅ Auto-detects all |

## Notes

- Bot mode requires the bot to be in BOTH source and target servers
- Full server copy mode loads channel list on startup
- Channel mappings are still saved in `webhooks.json` for persistence
- You can switch between modes by changing `.env` and restarting
