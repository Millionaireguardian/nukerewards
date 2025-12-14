import dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config();

interface EnvConfig {
  NODE_ENV: string;
  PORT: number;
  // Solana configuration (optional for basic server startup)
  SOLANA_NETWORK?: string;
  HELIUS_RPC_URL?: string;
  TOKEN_MINT?: string;
  ADMIN_WALLET_PATH?: string;
  // Additional environment variables can be added here as needed
  [key: string]: string | number | undefined;
}

/**
 * Validates and returns environment variables
 */
export function loadEnv(): EnvConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a valid number between 1 and 65535');
  }

  return {
    NODE_ENV: nodeEnv,
    PORT: port,
    // Optional Solana config - won't fail if not provided
    SOLANA_NETWORK: process.env.SOLANA_NETWORK,
    HELIUS_RPC_URL: process.env.HELIUS_RPC_URL,
    TOKEN_MINT: process.env.TOKEN_MINT,
    ADMIN_WALLET_PATH: process.env.ADMIN_WALLET_PATH,
  };
}

// Export loaded environment variables
export const env = loadEnv();
