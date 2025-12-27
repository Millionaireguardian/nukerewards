import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';

/**
 * Data structure for unpaid rewards storage
 * Uses Record<string, number> (walletAddress -> accumulatedAmount) instead of Map
 * for JSON serialization compatibility
 */
interface UnpaidRewardsState {
  unpaidRewards: Record<string, number>; // walletAddress -> accumulatedAmount
}

const STORAGE_FILE_PATH = path.join(process.cwd(), 'unpaid-rewards.json');

/**
 * Load unpaid rewards state from persistent storage
 * @returns UnpaidRewardsState object
 */
function loadState(): UnpaidRewardsState {
  try {
    if (fs.existsSync(STORAGE_FILE_PATH)) {
      const data = fs.readFileSync(STORAGE_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      
      // Validate structure
      if (typeof parsed === 'object' && parsed !== null) {
        // Check if it has the new format with unpaidRewards property
        if ('unpaidRewards' in parsed && typeof parsed.unpaidRewards === 'object' && parsed.unpaidRewards !== null) {
          return {
            unpaidRewards: parsed.unpaidRewards,
          };
        }
        
        // Legacy format: if file contains direct object mapping (no unpaidRewards property)
        // This should not happen for new files, but handle it for migration safety
        logger.warn('Detected legacy unpaid rewards format, migrating', {
          file: STORAGE_FILE_PATH,
        });
        return {
          unpaidRewards: parsed,
        };
      }
    }
  } catch (error) {
    logger.warn('Failed to load unpaid rewards state, using defaults', {
      error: error instanceof Error ? error.message : String(error),
      file: STORAGE_FILE_PATH,
    });
  }
  
  // Return default empty state
  return {
    unpaidRewards: {},
  };
}

/**
 * Save unpaid rewards state to persistent storage
 * @param state - UnpaidRewardsState object to save
 */
function saveState(state: UnpaidRewardsState): void {
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
    
    logger.debug('Unpaid rewards state saved', {
      file: STORAGE_FILE_PATH,
      walletsCount: Object.keys(state.unpaidRewards).length,
    });
  } catch (error) {
    logger.error('Failed to save unpaid rewards state', {
      error: error instanceof Error ? error.message : String(error),
      file: STORAGE_FILE_PATH,
    });
    throw error;
  }
}

/**
 * Get accumulated reward amount for a wallet
 * @param wallet - Wallet address (base58 string)
 * @returns Accumulated reward amount in SOL, or 0 if wallet has no accumulated rewards
 */
export function getAccumulatedReward(wallet: string): number {
  try {
    if (!wallet || typeof wallet !== 'string') {
      logger.warn('Invalid wallet address provided to getAccumulatedReward', {
        wallet,
      });
      return 0;
    }
    
    const state = loadState();
    const amount = state.unpaidRewards[wallet];
    
    // Return 0 if wallet not found or amount is invalid
    return typeof amount === 'number' && amount > 0 ? amount : 0;
  } catch (error) {
    logger.error('Error getting accumulated reward', {
      error: error instanceof Error ? error.message : String(error),
      wallet,
    });
    // Return 0 on error to prevent disruption
    return 0;
  }
}

/**
 * Add amount to a wallet's accumulated reward
 * @param wallet - Wallet address (base58 string)
 * @param amount - Amount to add in SOL (must be positive)
 */
export function addToAccumulatedReward(wallet: string, amount: number): void {
  // Capture current amount before try block for error logging
  let previousAmount = 0;
  try {
    const state = loadState();
    previousAmount = state.unpaidRewards[wallet] || 0;
  } catch {
    // If we can't load state, previousAmount remains 0
  }

  try {
    if (!wallet || typeof wallet !== 'string') {
      throw new Error('Invalid wallet address');
    }
    
    if (typeof amount !== 'number' || amount <= 0 || !isFinite(amount)) {
      throw new Error(`Invalid amount: ${amount} (must be positive number)`);
    }
    
    const state = loadState();
    const currentAmount = state.unpaidRewards[wallet] || 0;
    const newAmount = currentAmount + amount;
    
    state.unpaidRewards[wallet] = newAmount;
    saveState(state);
    
    logger.debug('Added to accumulated reward', {
      wallet,
      addedAmount: amount,
      previousAmount: currentAmount,
      newAmount,
    });
  } catch (error) {
    logger.error('❌ Failed to accumulate reward (write error)', {
      error: error instanceof Error ? error.message : String(error),
      wallet,
      amount,
      previousAmount,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * Clear accumulated reward for a wallet (reset to 0)
 * Used after successful payout
 * @param wallet - Wallet address (base58 string)
 */
export function clearAccumulatedReward(wallet: string): void {
  try {
    if (!wallet || typeof wallet !== 'string') {
      throw new Error('Invalid wallet address');
    }
    
    const state = loadState();
    
    // Only clear if wallet exists in state
    if (wallet in state.unpaidRewards) {
      const previousAmount = state.unpaidRewards[wallet];
      delete state.unpaidRewards[wallet];
      saveState(state);
      
      logger.debug('Cleared accumulated reward', {
        wallet,
        previousAmount,
      });
    } else {
      logger.debug('No accumulated reward to clear', {
        wallet,
      });
    }
  } catch (error) {
    logger.error('Error clearing accumulated reward', {
      error: error instanceof Error ? error.message : String(error),
      wallet,
    });
    throw error;
  }
}

/**
 * Get all wallet addresses that have accumulated rewards
 * @returns Array of wallet addresses (base58 strings) that have accumulated rewards > 0
 */
export function getAllWalletsWithAccumulatedRewards(): string[] {
  try {
    const state = loadState();
    const wallets = Object.keys(state.unpaidRewards).filter(wallet => {
      const amount = state.unpaidRewards[wallet];
      return typeof amount === 'number' && amount > 0;
    });
    
    logger.debug('Retrieved wallets with accumulated rewards', {
      count: wallets.length,
    });
    
    return wallets;
  } catch (error) {
    logger.error('Error getting all wallets with accumulated rewards', {
      error: error instanceof Error ? error.message : String(error),
    });
    // Return empty array on error to prevent disruption
    return [];
  }
}

/**
 * Get the full unpaid rewards map (for internal use or testing)
 * @returns Record mapping wallet addresses to accumulated amounts
 */
export function getAllUnpaidRewards(): Record<string, number> {
  try {
    const state = loadState();
    // Return a copy to prevent external modification
    return { ...state.unpaidRewards };
  } catch (error) {
    logger.error('Error getting all unpaid rewards', {
      error: error instanceof Error ? error.message : String(error),
    });
    return {};
  }
}

/**
 * Get total accumulated unpaid rewards across all wallets
 * @returns Total amount in SOL
 */
export function getTotalUnpaidRewards(): number {
  try {
    const state = loadState();
    const total = Object.values(state.unpaidRewards).reduce((sum, amount) => {
      return sum + (typeof amount === 'number' && amount > 0 ? amount : 0);
    }, 0);
    
    return total;
  } catch (error) {
    logger.error('Error getting total unpaid rewards', {
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}
