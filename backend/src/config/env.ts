import dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config();

interface EnvConfig {
  NODE_ENV: string;
  PORT: number;
  SOLANA_NETWORK?: string;
  SOLANA_RPC_URL: string;
  TOKEN_MINT: string;
  ADMIN_WALLET_JSON: string;
  REWARD_VALUE_MODE: 'TOKEN' | 'USD';
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

  // Support both HELIUS_RPC_URL (legacy) and SOLANA_RPC_URL (new)
  const rpcUrl = process.env.SOLANA_RPC_URL || process.env.HELIUS_RPC_URL;
  if (!rpcUrl) {
    throw new Error('SOLANA_RPC_URL (or HELIUS_RPC_URL for backward compatibility) environment variable is required');
  }

  if (!process.env.TOKEN_MINT) {
    throw new Error('TOKEN_MINT environment variable is required');
  }

  if (!process.env.ADMIN_WALLET_JSON) {
    throw new Error('ADMIN_WALLET_JSON environment variable is required');
  }

  // REWARD_VALUE_MODE: Controls how reward values are calculated and displayed
  // - "TOKEN": For devnet - uses raw NUKE token amounts (no USD conversion)
  // - "USD": For mainnet - uses USD values converted from token amounts
  // Defaults to "TOKEN" if not specified
  const rewardValueMode = (process.env.REWARD_VALUE_MODE || 'TOKEN').toUpperCase();
  if (rewardValueMode !== 'TOKEN' && rewardValueMode !== 'USD') {
    throw new Error('REWARD_VALUE_MODE must be either "TOKEN" or "USD"');
  }

  return {
    NODE_ENV: nodeEnv,
    PORT: port,
    SOLANA_NETWORK: process.env.SOLANA_NETWORK,
    SOLANA_RPC_URL: rpcUrl,
    TOKEN_MINT: process.env.TOKEN_MINT,
    ADMIN_WALLET_JSON: process.env.ADMIN_WALLET_JSON,
    REWARD_VALUE_MODE: rewardValueMode as 'TOKEN' | 'USD',
  };
}

// Export loaded environment variables
export const env = loadEnv();
