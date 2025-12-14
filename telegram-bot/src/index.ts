/**
 * Entry point for Telegram Bot
 * Simply imports and runs the bot
 */

import { RewardSystemBot } from './bot';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Load configuration and start bot
function main(): void {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN environment variable is required');
    }

    const config = {
      token,
      backendUrl: process.env.BACKEND_URL || 'http://localhost:3000',
      notificationChatId: process.env.TELEGRAM_CHAT_ID,
      pollingInterval: parseInt(process.env.POLLING_INTERVAL_MS || '60000', 10),
      retryAttempts: parseInt(process.env.RETRY_ATTEMPTS || '3', 10),
      retryDelay: parseInt(process.env.RETRY_DELAY_MS || '1000', 10),
    };

    const bot = new RewardSystemBot(config);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n[Bot] Received SIGINT, shutting down gracefully...');
      bot.stop();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\n[Bot] Received SIGTERM, shutting down gracefully...');
      bot.stop();
      process.exit(0);
    });

    // Start the bot
    bot.start();
  } catch (error) {
    console.error('[Bot] Failed to start bot:', error);
    process.exit(1);
  }
}

main();
