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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Failed to start application:', errorMessage);
    process.exit(1);
  }
}

main();
