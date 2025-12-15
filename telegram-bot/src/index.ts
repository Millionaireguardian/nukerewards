import TelegramBot from 'node-telegram-bot-api';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is required`);
  }
  return value;
}

function parsePollingInterval(): number {
  const raw = process.env.POLLING_INTERVAL_MS || '60000';
  const value = Number.parseInt(raw, 10);
  if (Number.isNaN(value) || value <= 0) {
    throw new Error('POLLING_INTERVAL_MS must be a positive integer');
  }
  return value;
}

function isAuthorizedChat(chatIdEnv: string, msgChatId: number, msgUsername?: string): boolean {
  if (!chatIdEnv) return true;
  const normalizedEnv = chatIdEnv.trim();
  if (normalizedEnv === String(msgChatId)) return true;
  if (msgUsername && normalizedEnv === `@${msgUsername}`) return true;
  return false;
}

async function handleRewardsCommand(bot: TelegramBot, chatId: number, backendUrl: string): Promise<void> {
  try {
    const response = await axios.get(`${backendUrl}/dashboard/rewards`, { timeout: 30000 });
    const rewards = response.data as {
      lastRun: string | null;
      nextRun: string | null;
      isRunning: boolean;
      statistics: { totalHolders: number; eligibleHolders: number; pendingPayouts: number; totalSOLDistributed: number };
      tokenPrice: { usd: number };
    };

    const lastRun = rewards.lastRun ? new Date(rewards.lastRun).toLocaleString() : 'Never';
    const nextRun = rewards.nextRun ? new Date(rewards.nextRun).toLocaleString() : 'N/A';

    const message = [
      '📊 Reward System Status',
      '',
      `Last Run: ${lastRun}`,
      `Next Run: ${nextRun}`,
      `Status: ${rewards.isRunning ? 'Running' : 'Idle'}`,
      '',
      'Statistics:',
      `• Total Holders: ${rewards.statistics.totalHolders}`,
      `• Eligible Holders: ${rewards.statistics.eligibleHolders}`,
      `• Pending Payouts: ${rewards.statistics.pendingPayouts}`,
      `• Total SOL Distributed: ${rewards.statistics.totalSOLDistributed.toFixed(6)}`,
      `• Token Price (USD): ${rewards.tokenPrice.usd.toFixed(4)}`,
    ].join('\n');

    await bot.sendMessage(chatId, message);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    await bot.sendMessage(chatId, `Failed to fetch rewards: ${reason}`);
  }
}

function main(): void {
  try {
    const token = requireEnv('TELEGRAM_BOT_TOKEN');
    const notificationChatId = requireEnv('TELEGRAM_CHAT_ID');
    const backendUrl = requireEnv('BACKEND_URL');
    const pollingInterval = parsePollingInterval();
    const nodeEnv = process.env.NODE_ENV || 'production';

    const bot = new TelegramBot(token, {
      polling: { interval: pollingInterval },
    });

    console.log('[Bot] Telegram bot is running...', {
      env: nodeEnv,
      pollingInterval,
      backendUrl,
    });

    bot.onText(/\/start/, async (msg) => {
      if (!isAuthorizedChat(notificationChatId, msg.chat.id, msg.chat.username || undefined)) {
        await bot.sendMessage(msg.chat.id, 'Unauthorized chat ID');
        return;
      }
      await bot.sendMessage(msg.chat.id, 'Hello! Bot is online and ready. Use /rewards to view the latest rewards summary.');
    });

    bot.onText(/\/rewards/, async (msg) => {
      if (!isAuthorizedChat(notificationChatId, msg.chat.id, msg.chat.username || undefined)) {
        await bot.sendMessage(msg.chat.id, 'Unauthorized chat ID');
        return;
      }
      await handleRewardsCommand(bot, msg.chat.id, backendUrl);
    });
  } catch (error) {
    console.error('[Bot] Failed to start bot:', error);
    process.exit(1);
  }
}

main();
