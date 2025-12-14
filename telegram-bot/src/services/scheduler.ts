import { logger } from '../utils/logger';
import { loadConfig } from '../config/env';
import { telegramBot } from './bot';
import { backendClient } from './backendClient';

const config = loadConfig();

let schedulerInterval: NodeJS.Timeout | null = null;
let isRunning = false;

/**
 * Send reward cycle notification
 * Placeholder - implement actual notification logic
 */
async function sendRewardCycleNotification(): Promise<void> {
  if (isRunning) {
    logger.debug('Scheduler already running, skipping');
    return;
  }

  isRunning = true;
  const startTime = Date.now();

  try {
    logger.info('Fetching reward cycle summary for notification');

    // TODO: Implement actual notification logic
    const rewardStatus = await backendClient.getRewardStatus();
    const exportSummary = await backendClient.getExportSummary().catch(() => null);

    // TODO: Format notification message
    const notificationMessage = `📊 *Automatic Reward Cycle Update*\n\nPlaceholder - implement notification formatting`;

    await telegramBot.sendNotification(notificationMessage);

    const duration = Date.now() - startTime;
    logger.info('Reward cycle notification sent', {
      duration: `${duration}ms`,
    });
  } catch (error) {
    logger.error('Error sending reward cycle notification', {
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    isRunning = false;
  }
}

/**
 * Start the scheduler
 */
export function startScheduler(): void {
  if (schedulerInterval !== null) {
    logger.warn('Scheduler already started');
    return;
  }

  logger.info('Starting reward cycle notification scheduler', {
    interval: `${config.POLLING_INTERVAL_MS / 1000}s`,
  });

  // Send initial notification
  sendRewardCycleNotification().catch((error) => {
    logger.error('Error in initial notification', {
      error: error instanceof Error ? error.message : String(error),
    });
  });

  // Schedule periodic notifications
  schedulerInterval = setInterval(() => {
    sendRewardCycleNotification().catch((error) => {
      logger.error('Error in scheduled notification', {
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }, config.POLLING_INTERVAL_MS);
}

/**
 * Stop the scheduler
 */
export function stopScheduler(): void {
  if (schedulerInterval !== null) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    logger.info('Reward cycle notification scheduler stopped');
  }
}

/**
 * Get scheduler status
 */
export function getSchedulerStatus(): {
  isRunning: boolean;
  interval: number;
} {
  return {
    isRunning: schedulerInterval !== null,
    interval: config.POLLING_INTERVAL_MS,
  };
}

