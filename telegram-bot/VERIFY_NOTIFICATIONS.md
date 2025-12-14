# Telegram Bot Notification Verification

This script verifies that the Telegram bot can successfully send notifications to the configured channel.

## Quick Start

```bash
# Option 1: Using npm script (recommended)
npm run verify

# Option 2: Using ts-node directly
npx ts-node verify-notifications.ts
```

## What It Does

1. ✅ Loads configuration from `.env` file
2. ✅ Validates bot token and chat ID
3. ✅ Initializes Telegram bot
4. ✅ Sends a test notification to `@nukerewards` (or configured channel)
5. ✅ Reports success/failure with detailed information

## Expected Output

### Success Case
```
🔍 Telegram Bot Notification Verification
==================================================

📋 Configuration:
   Bot Token: 8507265258...
   Chat ID: @nukerewards
   Backend URL: http://localhost:3000

🤖 Initializing Telegram bot...
✅ Bot initialized successfully

📤 Sending test notification...
   Target: @nukerewards

✅ SUCCESS! Test notification sent successfully!
==================================================

📊 Message Details:
   Message ID: 12345
   Chat ID: -1001234567890
   Chat Type: channel
   Chat Title: NUKE Rewards
   Sent At: 12/14/2025, 3:45:00 PM

✅ Verification complete! The bot can send notifications to the channel.
```

### Failure Case
```
❌ FAILED to send test notification
==================================================

📋 Error Details:
   Error Code: 403
   Description: Forbidden: bot is not a member of the channel

💡 Troubleshooting:
   - The bot does not have permission to send messages to this chat
   - For channels: Add the bot as an administrator with "Post Messages" permission
```

## Troubleshooting

### Error: "bot is not a member of the channel"
- **Solution**: Add the bot to the channel as an administrator
- Steps:
  1. Open your Telegram channel
  2. Go to Channel Settings → Administrators
  3. Add the bot as an administrator
  4. Grant "Post Messages" permission

### Error: "chat not found"
- **Solution**: Verify the chat ID in `.env`
- For channels, use: `@channelname` or numeric ID like `-1001234567890`
- To get channel ID: Forward a message from the channel to @userinfobot

### Error: "Invalid bot token"
- **Solution**: Check `TELEGRAM_BOT_TOKEN` in `.env`
- Get a new token from @BotFather if needed

### Error: "Forbidden: bot is not a member"
- **Solution**: The bot must be added to the channel/group first
- For channels: Add as administrator
- For groups: Add as a member

## Requirements

- `.env` file with `TELEGRAM_BOT_TOKEN` configured
- Bot must be added to the target channel/chat
- Bot must have permission to send messages

## Notes

- This script does NOT modify the existing bot code
- It's a standalone verification tool
- Safe to run multiple times
- No permanent changes to bot configuration

