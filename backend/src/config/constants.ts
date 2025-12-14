/**
 * Application constants
 */

export const APP_NAME = 'backend';
export const APP_VERSION = '1.0.0';

// Reward scheduler configuration (optional - can be extended)
export const REWARD_CONFIG = {
  SCHEDULER_INTERVAL: 60000, // 60 seconds (check interval)
  MIN_REWARD_INTERVAL: 5 * 60 * 1000, // 5 minutes (minimum time between reward runs)
  MIN_HOLDING_USD: 5, // Minimum holding value in USD to be eligible
  MAX_RETRIES: 3, // Maximum retries for failed reward transfers
  MIN_SOL_PAYOUT: 0.0001, // Minimum SOL amount to send (dust limit)
  TOTAL_REWARD_POOL_SOL: 1.0, // Total SOL reward pool per distribution cycle
} as const;
