import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';
import { getTokenHolders, type TokenHolder } from './solanaService';
import { isBlacklisted } from '../config/blacklist';
import { getNUKEPriceSOL } from './priceService';
import { REWARD_CONFIG } from '../config/constants';

/**
 * Data structure for eligible wallets storage
 * Stores set of wallet addresses that qualify for rewards
 */
interface EligibleWalletsState {
  eligibleWallets: string[]; // Array of wallet addresses (pubkeys)
  lastUpdated: number; // Timestamp of last update
  totalHolders: number; // Total holders scanned (for logging)
  eligibleCount: number; // Count of eligible wallets (for logging)
}

const STORAGE_FILE_PATH = path.join(process.cwd(), 'eligible-wallets.json');

/**
 * Cache for eligible wallets in memory (to avoid reading file repeatedly)
 */
let cachedEligibleWallets: Set<string> | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

/**
 * Load eligible wallets state from persistent storage
 * @returns EligibleWalletsState object
 */
function loadState(): EligibleWalletsState {
  try {
    if (fs.existsSync(STORAGE_FILE_PATH)) {
      const data = fs.readFileSync(STORAGE_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      
      // Validate structure
      if (typeof parsed === 'object' && parsed !== null) {
        // Handle both old format (direct array) and new format (with metadata)
        if (Array.isArray(parsed)) {
          // Legacy format: migrate to new format
          logger.warn('Migrating legacy eligible wallets format', {
            file: STORAGE_FILE_PATH,
          });
          return {
            eligibleWallets: parsed,
            lastUpdated: Date.now(),
            totalHolders: 0,
            eligibleCount: parsed.length,
          };
        } else if (Array.isArray(parsed.eligibleWallets)) {
          return {
            eligibleWallets: parsed.eligibleWallets || [],
            lastUpdated: parsed.lastUpdated || Date.now(),
            totalHolders: parsed.totalHolders || 0,
            eligibleCount: parsed.eligibleCount || (parsed.eligibleWallets?.length || 0),
          };
        }
      }
    }
  } catch (error) {
    logger.warn('Failed to load eligible wallets state, using defaults', {
      error: error instanceof Error ? error.message : String(error),
      file: STORAGE_FILE_PATH,
    });
  }
  
  // Return default empty state
  return {
    eligibleWallets: [],
    lastUpdated: 0,
    totalHolders: 0,
    eligibleCount: 0,
  };
}

/**
 * Save eligible wallets state to persistent storage
 * @param state - EligibleWalletsState object to save
 */
function saveState(state: EligibleWalletsState): void {
  try {
    // Ensure directory exists
    const dir = path.dirname(STORAGE_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write to temporary file first, then rename (atomic operation)
    const tempPath = `${STORAGE_FILE_PATH}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(state, null, 2), 'utf-8');
    
    // Rename temp file to actual file (atomic on most filesystems)
    fs.renameSync(tempPath, STORAGE_FILE_PATH);
    
    // Clear cache
    cachedEligibleWallets = null;
    cacheTimestamp = 0;
    
    logger.debug('Eligible wallets state saved', {
      file: STORAGE_FILE_PATH,
      walletsCount: state.eligibleWallets.length,
      lastUpdated: new Date(state.lastUpdated).toISOString(),
    });
  } catch (error) {
    logger.error('Failed to save eligible wallets state', {
      error: error instanceof Error ? error.message : String(error),
      file: STORAGE_FILE_PATH,
    });
    throw error;
  }
}

/**
 * Calculate SOL value of token holdings
 */
async function calculateHoldingSOL(amount: string, decimals: number, tokenPriceSOL: number): Promise<number> {
  const tokenAmount = Number(amount) / Math.pow(10, decimals);
  return tokenAmount * tokenPriceSOL;
}

/**
 * Update the list of eligible wallets by scanning all holders and applying eligibility criteria
 * 
 * Eligibility criteria (same as getEligibleHolders):
 * - Not blacklisted
 * - Holding value >= MIN_HOLDING_SOL (converted from MIN_HOLDING_USD)
 * 
 * @param minHoldingUSD - Minimum holding value in USD (defaults to REWARD_CONFIG.MIN_HOLDING_USD)
 * @returns Updated eligible wallets count
 */
export async function updateEligibleWallets(minHoldingUSD: number = REWARD_CONFIG.MIN_HOLDING_USD): Promise<number> {
  try {
    logger.info('Updating eligible wallets list', {
      minHoldingUSD,
    });

    // Fetch current NUKE token price in SOL from Raydium
    let tokenPriceSOL: number | null = null;
    try {
      const priceData = await getNUKEPriceSOL();
      if (priceData.price !== null && priceData.source === 'raydium') {
        tokenPriceSOL = priceData.price;
        logger.debug('Using NUKE token price (SOL) for eligibility check', {
          priceSOL: tokenPriceSOL,
          minHoldingUSD,
          source: 'raydium',
        });
      } else {
        logger.warn('Raydium price unavailable, cannot update eligible wallets', {
          priceData,
        });
        throw new Error('Token price unavailable');
      }
    } catch (priceError) {
      logger.error('Failed to fetch token price, cannot update eligible wallets', {
        error: priceError instanceof Error ? priceError.message : String(priceError),
      });
      throw new Error('Failed to fetch token price');
    }

    // Get all token holders
    const allHolders = await getTokenHolders();
    const eligibleWallets: string[] = [];
    
    // Convert MIN_HOLDING_USD to SOL for comparison (using fixed devnet rate)
    const SOL_TO_USD_RATE = 100; // Devnet conversion rate
    const minHoldingSOL = minHoldingUSD / SOL_TO_USD_RATE;
    
    // Apply eligibility criteria
    for (const holder of allHolders) {
      // Skip blacklisted addresses
      if (isBlacklisted(holder.owner)) {
        continue;
      }
      
      // Calculate SOL value using Raydium price
      const holdingSOL = await calculateHoldingSOL(holder.amount, holder.decimals, tokenPriceSOL);
      
      // Check if eligible (holding >= minimum threshold)
      if (holdingSOL >= minHoldingSOL) {
        eligibleWallets.push(holder.owner);
      }
    }
    
    // Save updated list
    const state: EligibleWalletsState = {
      eligibleWallets,
      lastUpdated: Date.now(),
      totalHolders: allHolders.length,
      eligibleCount: eligibleWallets.length,
    };
    
    saveState(state);
    
    logger.info('Eligible wallets list updated', {
      totalHolders: allHolders.length,
      eligibleCount: eligibleWallets.length,
      excludedCount: allHolders.length - eligibleWallets.length,
      minHoldingUSD,
      minHoldingSOL,
      tokenPriceSOL,
      lastUpdated: new Date(state.lastUpdated).toISOString(),
    });
    
    return eligibleWallets.length;
  } catch (error) {
    logger.error('Error updating eligible wallets', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Get the current list of eligible wallets
 * Uses in-memory cache if available and fresh
 * @returns Set of eligible wallet addresses
 */
export function getEligibleWallets(): Set<string> {
  // Check cache first
  const now = Date.now();
  if (cachedEligibleWallets && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedEligibleWallets;
  }
  
  // Load from file
  const state = loadState();
  const walletsSet = new Set<string>(state.eligibleWallets);
  
  // Update cache
  cachedEligibleWallets = walletsSet;
  cacheTimestamp = now;
  
  return walletsSet;
}

/**
 * Check if a wallet is eligible for rewards
 * @param wallet - Wallet address (base58 string)
 * @returns true if wallet is in the eligible list
 */
export function isEligibleWallet(wallet: string): boolean {
  if (!wallet || typeof wallet !== 'string') {
    return false;
  }
  
  const eligibleWallets = getEligibleWallets();
  return eligibleWallets.has(wallet);
}

/**
 * Get all eligible wallets as an array
 * @returns Array of eligible wallet addresses
 */
export function getEligibleWalletsArray(): string[] {
  const walletsSet = getEligibleWallets();
  return Array.from(walletsSet);
}

/**
 * Get eligible wallets with unpaid rewards (merges eligibleWallets with unpaidRewards wallets)
 * This ensures we check accumulated rewards for all relevant wallets
 * @returns Set of wallet addresses that are either eligible or have unpaid rewards
 */
export function getEligibleWalletsWithUnpaidRewards(): Set<string> {
  const eligibleWallets = getEligibleWallets();
  const merged = new Set<string>(eligibleWallets);
  
  // Import dynamically to avoid circular dependency
  try {
    const { getAllWalletsWithAccumulatedRewards } = require('./unpaidRewardsService');
    const unpaidWallets = getAllWalletsWithAccumulatedRewards();
    
    // Merge with wallets that have unpaid rewards (even if not currently eligible)
    for (const wallet of unpaidWallets) {
      merged.add(wallet);
    }
    
    logger.debug('Merged eligible wallets with unpaid rewards', {
      eligibleCount: eligibleWallets.size,
      unpaidCount: unpaidWallets.length,
      mergedCount: merged.size,
    });
  } catch (error) {
    logger.warn('Failed to merge unpaid rewards wallets', {
      error: error instanceof Error ? error.message : String(error),
    });
    // Continue with just eligible wallets if merge fails
  }
  
  return merged;
}

/**
 * Get metadata about the eligible wallets list
 * @returns Metadata including count and last update time
 */
export function getEligibleWalletsMetadata(): {
  count: number;
  lastUpdated: number | null;
  totalHoldersScanned: number;
} {
  const state = loadState();
  return {
    count: state.eligibleWallets.length,
    lastUpdated: state.lastUpdated > 0 ? state.lastUpdated : null,
    totalHoldersScanned: state.totalHolders,
  };
}
