import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface BotConfig {
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHAT_ID: string;
  BACKEND_URL: string;
  POLLING_INTERVAL_MS: number;
  RETRY_ATTEMPTS: number;
  RETRY_DELAY_MS: number;
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value && !defaultValue) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || defaultValue!;
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    return defaultValue;
  }
  return parsed;
}

/**
 * Loads and validates environment variables
 */
export function loadConfig(): BotConfig {
  return {
    TELEGRAM_BOT_TOKEN: getEnvVar('TELEGRAM_BOT_TOKEN'),
    TELEGRAM_CHAT_ID: getEnvVar('TELEGRAM_CHAT_ID'),
    BACKEND_URL: getEnvVar('BACKEND_URL', 'http://localhost:3000'),
    POLLING_INTERVAL_MS: getEnvNumber('POLLING_INTERVAL_MS', 300000), // 5 minutes default
    RETRY_ATTEMPTS: getEnvNumber('RETRY_ATTEMPTS', 3),
    RETRY_DELAY_MS: getEnvNumber('RETRY_DELAY_MS', 1000),
  };
}

