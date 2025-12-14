/**
 * One-shot verification script for Telegram bot notifications
 * 
 * This script tests if the bot can successfully send messages to the configured channel.
 * It does not modify the existing bot logic and can be run independently.
 * 
 * Usage:
 *   npx ts-node verify-notifications.ts
 *   OR
 *   npm run verify
 */

import TelegramBot from 'node-telegram-bot-api';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { logNotification } from './src/utils/notificationLogger';

// Load environment variables
const envPath = path.join(process.cwd(), '.env');
dotenv.config({ path: envPath });

// Configuration
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '@nukerewards';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset): void {
  console.log(`${color}${message}${colors.reset}`);
}

async function verifyNotifications(): Promise<void> {
  log('\n🔍 Telegram Bot Notification Verification\n', colors.cyan);
  log('=' .repeat(50), colors.cyan);

  // Validate configuration
  if (!BOT_TOKEN) {
    log('❌ ERROR: TELEGRAM_BOT_TOKEN not found in .env file', colors.red);
    log('   Please ensure .env file exists and contains TELEGRAM_BOT_TOKEN', colors.yellow);
    process.exit(1);
  }

  if (!CHAT_ID) {
    log('⚠️  WARNING: TELEGRAM_CHAT_ID not configured', colors.yellow);
    log('   Using default: @nukerewards', colors.yellow);
  }

  log(`\n📋 Configuration:`, colors.blue);
  log(`   Bot Token: ${BOT_TOKEN.substring(0, 10)}...${BOT_TOKEN.substring(BOT_TOKEN.length - 5)}`);
  log(`   Chat ID: ${CHAT_ID}`);
  log(`   Backend URL: ${process.env.BACKEND_URL || 'http://localhost:3000'}\n`);

  // Initialize bot
  let bot: TelegramBot;
  try {
    log('🤖 Initializing Telegram bot...', colors.blue);
    bot = new TelegramBot(BOT_TOKEN, { polling: false });
    log('✅ Bot initialized successfully\n', colors.green);
  } catch (error) {
    log('❌ Failed to initialize bot', colors.red);
    log(`   Error: ${error instanceof Error ? error.message : String(error)}`, colors.red);
    process.exit(1);
  }

  // Send test notification
  const testMessage = `🧪 *Test Notification*

This is a verification message from the Reward System Telegram Bot.

*Status:* ✅ Bot is operational
*Time:* ${new Date().toLocaleString()}
*Channel:* ${CHAT_ID}

If you received this message, auto-notifications are working correctly! 🎉

---
*This is an automated test message.*`;

  try {
    log('📤 Sending test notification...', colors.blue);
    log(`   Target: ${CHAT_ID}`, colors.blue);

    const message = await bot.sendMessage(CHAT_ID, testMessage, {
      parse_mode: 'Markdown',
    });

    // Log notification
    logNotification({
      type: 'test',
      chat: CHAT_ID,
      source: 'verify-notifications.ts',
      message: testMessage,
    });

    log('\n✅ SUCCESS! Test notification sent successfully!', colors.green);
    log('=' .repeat(50), colors.green);
    log(`\n📊 Message Details:`, colors.blue);
    log(`   Message ID: ${message.message_id}`);
    log(`   Chat ID: ${message.chat.id}`);
    log(`   Chat Type: ${message.chat.type}`);
    log(`   Chat Title: ${message.chat.title || message.chat.username || 'N/A'}`);
    log(`   Sent At: ${new Date(message.date * 1000).toLocaleString()}\n`);

    log('✅ Verification complete! The bot can send notifications to the channel.', colors.green);
    log('\n💡 Next steps:', colors.cyan);
    log('   - The bot will automatically send notifications when new rewards/payouts are detected');
    log('   - Notifications are sent every 60 seconds (or as configured in POLLING_INTERVAL_MS)');
    log('   - You can test commands: /rewards, /payouts, /holders, /export\n');

  } catch (error: any) {
    log('\n❌ FAILED to send test notification', colors.red);
    log('=' .repeat(50), colors.red);

    if (error.response) {
      const errorCode = error.response.body?.error_code;
      const description = error.response.body?.description;

      log(`\n📋 Error Details:`, colors.yellow);
      log(`   Error Code: ${errorCode}`);
      log(`   Description: ${description}\n`);

      // Provide helpful troubleshooting based on error code
      if (errorCode === 400) {
        log('💡 Troubleshooting:', colors.cyan);
        log('   - Check if the chat ID is correct');
        log('   - For channels, use the format: @channelname or -1001234567890');
        log('   - Make sure the bot is added to the channel as an administrator');
      } else if (errorCode === 403) {
        log('💡 Troubleshooting:', colors.cyan);
        log('   - The bot does not have permission to send messages to this chat');
        log('   - For channels: Add the bot as an administrator with "Post Messages" permission');
        log('   - For groups: Make sure the bot is a member and can send messages');
      } else if (errorCode === 404) {
        log('💡 Troubleshooting:', colors.cyan);
        log('   - Chat not found. Check if the chat ID is correct');
        log('   - For channels: Verify the channel username or ID');
      } else if (errorCode === 401) {
        log('💡 Troubleshooting:', colors.cyan);
        log('   - Invalid bot token. Check TELEGRAM_BOT_TOKEN in .env');
      }
    } else {
      log(`\n📋 Error: ${error.message || String(error)}`, colors.yellow);
    }

    log('\n❌ Verification failed. Please fix the issues above and try again.\n', colors.red);
    process.exit(1);
  }

  // Cleanup
  process.exit(0);
}

// Run verification
verifyNotifications().catch((error) => {
  log('\n❌ Unexpected error:', colors.red);
  log(`   ${error instanceof Error ? error.message : String(error)}`, colors.red);
  process.exit(1);
});

