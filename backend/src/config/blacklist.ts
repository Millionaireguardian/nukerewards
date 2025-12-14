/**
 * Blacklisted addresses that should be excluded from rewards
 * Includes admin wallets, tax wallets, DEXes, and liquidity pools
 */

export const BLACKLISTED_ADDRESSES = [
  // Admin and system wallets
  '4i2kUSvq1GThxU26MBJZQ2s4DGaeqFuW3sn57738jceF', // Admin payer wallet
  '3Q6AioVrqzmJ46QMxUhgBC5eE24hXEfsJbLzsohvDdDs', // Mint authority
  'AqghyJkVpFgkyLdUHDaischfXK1gQYawUaKMcNSN4Dnj', // Tax destination wallet
  
  // Common DEX and LP addresses (examples - add real addresses as needed)
  // 'So11111111111111111111111111111111111111112', // Wrapped SOL (example)
  // Add more DEX/LP addresses here as needed
] as const;

/**
 * Check if an address is blacklisted
 */
export function isBlacklisted(address: string): boolean {
  return BLACKLISTED_ADDRESSES.includes(address as any);
}

