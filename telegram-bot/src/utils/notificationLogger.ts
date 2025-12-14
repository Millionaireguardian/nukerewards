/**
 * Notification Logger Utility
 * 
 * Logs all outgoing Telegram notifications to a local file for auditing.
 * This includes reward alerts, payout alerts, and test notifications.
 * 
 * Safety: All filesystem operations are wrapped in try/catch to prevent crashes.
 */

import * as fs from 'fs';
import * as path from 'path';

interface NotificationLogEntry {
  timestamp: string;
  type: 'reward' | 'payout' | 'test' | 'other';
  chat: string;
  source: string;
  message: string;
}

interface LogNotificationParams {
  type: 'reward' | 'payout' | 'test' | 'other';
  chat: string;
  source: string;
  message: string;
}

class NotificationLogger {
  private logsDir: string;
  private logFile: string;
  private dailyLogFile: string;

  constructor() {
    // Determine logs directory (relative to project root)
    this.logsDir = path.join(process.cwd(), 'logs');
    this.logFile = path.join(this.logsDir, 'notifications.log');
    this.dailyLogFile = this.getDailyLogFile();

    // Ensure logs directory exists
    this.ensureLogsDirectory();
  }

  /**
   * Get daily log file path with date rotation
   */
  private getDailyLogFile(): string {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return path.join(this.logsDir, `notifications-${today}.log`);
  }

  /**
   * Ensure logs directory exists
   */
  private ensureLogsDirectory(): void {
    try {
      if (!fs.existsSync(this.logsDir)) {
        fs.mkdirSync(this.logsDir, { recursive: true });
      }
    } catch (error) {
      // Silently fail - we'll handle this in logNotification
      console.warn('[NotificationLogger] Failed to create logs directory:', error);
    }
  }

  /**
   * Write log entry to file
   */
  private writeLogEntry(entry: NotificationLogEntry): void {
    try {
      const logLine = JSON.stringify(entry) + '\n';

      // Write to main log file
      fs.appendFileSync(this.logFile, logLine, { encoding: 'utf-8' });

      // Also write to daily log file (if different from main)
      if (this.dailyLogFile !== this.logFile) {
        fs.appendFileSync(this.dailyLogFile, logLine, { encoding: 'utf-8' });
      }
    } catch (error) {
      // Never crash the bot - just warn
      console.warn('[NotificationLogger] Failed to write log entry:', error);
    }
  }

  /**
   * Log a notification
   * 
   * @param params - Notification parameters
   */
  logNotification(params: LogNotificationParams): void {
    try {
      const entry: NotificationLogEntry = {
        timestamp: new Date().toISOString(),
        type: params.type,
        chat: params.chat,
        source: params.source,
        message: params.message.substring(0, 500), // Limit message length to prevent huge logs
      };

      this.writeLogEntry(entry);
    } catch (error) {
      // Never crash - just warn
      console.warn('[NotificationLogger] Failed to log notification:', error);
    }
  }
}

// Export singleton instance
const notificationLogger = new NotificationLogger();

/**
 * Log a notification
 * 
 * @param params - Notification parameters
 */
export function logNotification(params: LogNotificationParams): void {
  notificationLogger.logNotification(params);
}

export default notificationLogger;

