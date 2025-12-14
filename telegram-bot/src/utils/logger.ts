import * as fs from 'fs';
import * as path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, `bot-${new Date().toISOString().split('T')[0]}.log`);

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

function formatTimestamp(): string {
  return new Date().toISOString();
}

function writeLog(level: LogLevel, message: string, data?: unknown): void {
  const timestamp = formatTimestamp();
  const logEntry = `[${timestamp}] [${level}] ${message}${data ? ` ${JSON.stringify(data)}` : ''}\n`;
  
  // Console output
  if (level === 'ERROR') {
    console.error(logEntry.trim());
  } else if (level === 'WARN') {
    console.warn(logEntry.trim());
  } else {
    console.log(logEntry.trim());
  }
  
  // File output
  try {
    fs.appendFileSync(LOG_FILE, logEntry, 'utf-8');
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
}

export const logger = {
  info: (message: string, data?: unknown): void => {
    writeLog('INFO', message, data);
  },
  
  warn: (message: string, data?: unknown): void => {
    writeLog('WARN', message, data);
  },
  
  error: (message: string, data?: unknown): void => {
    writeLog('ERROR', message, data);
  },
  
  debug: (message: string, data?: unknown): void => {
    if (process.env.NODE_ENV === 'development') {
      writeLog('DEBUG', message, data);
    }
  },
};

