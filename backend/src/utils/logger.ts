/**
 * Simple logger utility
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function formatTimestamp(): string {
  return new Date().toISOString();
}

function formatLog(level: LogLevel, message: string, data?: unknown): string {
  const timestamp = formatTimestamp();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  
  if (data !== undefined) {
    return `${prefix} ${message} ${JSON.stringify(data)}`;
  }
  
  return `${prefix} ${message}`;
}

export const logger = {
  info: (message: string, data?: unknown): void => {
    console.log(formatLog('info', message, data));
  },
  
  warn: (message: string, data?: unknown): void => {
    console.warn(formatLog('warn', message, data));
  },
  
  error: (message: string, data?: unknown): void => {
    console.error(formatLog('error', message, data));
  },
  
  debug: (message: string, data?: unknown): void => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(formatLog('debug', message, data));
    }
  },
};
