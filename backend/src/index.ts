import dotenv from 'dotenv';
import { createApp, startServer } from './server';

// Load environment variables from .env file
dotenv.config();

/**
 * Application entry point
 */
async function main(): Promise<void> {
  try {
    const app = createApp();
    startServer(app);
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

main();
