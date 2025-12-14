import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';

export interface RewardCycle {
  id: string; // ISO timestamp
  timestamp: string; // ISO string
  totalSOLDistributed: number;
  eligibleHoldersCount: number;
  excludedHoldersCount: number;
  blacklistedHoldersCount: number;
  totalHoldersCount: number;
  tokenPriceUSD: number;
  rewardDetails?: Array<{
    pubkey: string;
    rewardSOL: number;
    eligibilityStatus: 'eligible' | 'excluded' | 'blacklisted';
    retryCount: number;
  }>;
}

export interface HistoricalPayout {
  id: string; // Unique identifier
  timestamp: string; // ISO string
  pubkey: string;
  rewardSOL: number;
  status: 'pending' | 'failed' | 'success';
  retryCount: number;
  queuedAt: string; // ISO string
  executedAt?: string; // ISO string (if successful)
  transactionSignature?: string; // If successful
}

interface HistoryState {
  rewardCycles: RewardCycle[];
  historicalPayouts: HistoricalPayout[];
}

const HISTORY_FILE_PATH = path.join(process.cwd(), 'reward-history.json');
const MAX_HISTORY_ENTRIES = 10000; // Keep last 10k cycles

/**
 * Load history state from file
 */
function loadHistory(): HistoryState {
  try {
    if (fs.existsSync(HISTORY_FILE_PATH)) {
      const data = fs.readFileSync(HISTORY_FILE_PATH, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    logger.warn('Failed to load reward history, using defaults', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return {
    rewardCycles: [],
    historicalPayouts: [],
  };
}

/**
 * Save history state to file
 */
function saveHistory(state: HistoryState): void {
  try {
    // Ensure directory exists
    const dir = path.dirname(HISTORY_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(HISTORY_FILE_PATH, JSON.stringify(state, null, 2), 'utf-8');
  } catch (error) {
    logger.error('Failed to save reward history', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Save a reward cycle to history
 */
export function saveRewardCycle(cycle: RewardCycle): void {
  try {
    const state = loadHistory();

    // Check for duplicate (idempotency)
    const exists = state.rewardCycles.find((c) => c.id === cycle.id);
    if (exists) {
      logger.debug('Reward cycle already exists, skipping', { id: cycle.id });
      return;
    }

    // Add new cycle
    state.rewardCycles.push(cycle);

    // Keep only last N cycles
    if (state.rewardCycles.length > MAX_HISTORY_ENTRIES) {
      state.rewardCycles = state.rewardCycles.slice(-MAX_HISTORY_ENTRIES);
    }

    // Sort by timestamp (newest first)
    state.rewardCycles.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    saveHistory(state);

    logger.info('Reward cycle saved to history', {
      id: cycle.id,
      totalCycles: state.rewardCycles.length,
    });
  } catch (error) {
    logger.error('Error saving reward cycle to history', {
      error: error instanceof Error ? error.message : String(error),
      cycleId: cycle.id,
    });
    throw error;
  }
}

/**
 * Save historical payout records
 */
export function saveHistoricalPayouts(payouts: HistoricalPayout[]): void {
  try {
    const state = loadHistory();

    // Add new payouts (avoid duplicates by checking id)
    const existingIds = new Set(state.historicalPayouts.map((p) => p.id));
    const newPayouts = payouts.filter((p) => !existingIds.has(p.id));

    if (newPayouts.length > 0) {
      state.historicalPayouts.push(...newPayouts);

      // Keep only last N payouts
      if (state.historicalPayouts.length > MAX_HISTORY_ENTRIES) {
        state.historicalPayouts = state.historicalPayouts.slice(-MAX_HISTORY_ENTRIES);
      }

      // Sort by timestamp (newest first)
      state.historicalPayouts.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      saveHistory(state);

      logger.info('Historical payouts saved', {
        count: newPayouts.length,
        totalPayouts: state.historicalPayouts.length,
      });
    }
  } catch (error) {
    logger.error('Error saving historical payouts', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Get historical reward cycles with filters
 */
export function getHistoricalRewardCycles(params?: {
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}): { cycles: RewardCycle[]; total: number } {
  try {
    const state = loadHistory();
    let cycles = [...state.rewardCycles];

    // Filter by date range
    if (params?.startDate) {
      const start = new Date(params.startDate).getTime();
      cycles = cycles.filter((c) => new Date(c.timestamp).getTime() >= start);
    }

    if (params?.endDate) {
      const end = new Date(params.endDate).getTime();
      cycles = cycles.filter((c) => new Date(c.timestamp).getTime() <= end);
    }

    const total = cycles.length;

    // Paginate
    const offset = params?.offset || 0;
    const limit = params?.limit || 100;
    cycles = cycles.slice(offset, offset + limit);

    return { cycles, total };
  } catch (error) {
    logger.error('Error getting historical reward cycles', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Get historical payouts with filters
 */
export function getHistoricalPayouts(params?: {
  startDate?: string;
  endDate?: string;
  pubkey?: string;
  status?: 'pending' | 'failed' | 'success';
  limit?: number;
  offset?: number;
}): { payouts: HistoricalPayout[]; total: number } {
  try {
    const state = loadHistory();
    let payouts = [...state.historicalPayouts];

    // Filter by date range
    if (params?.startDate) {
      const start = new Date(params.startDate).getTime();
      payouts = payouts.filter((p) => new Date(p.timestamp).getTime() >= start);
    }

    if (params?.endDate) {
      const end = new Date(params.endDate).getTime();
      payouts = payouts.filter((p) => new Date(p.timestamp).getTime() <= end);
    }

    // Filter by pubkey
    if (params?.pubkey) {
      payouts = payouts.filter((p) => p.pubkey === params.pubkey);
    }

    // Filter by status
    if (params?.status) {
      payouts = payouts.filter((p) => p.status === params.status);
    }

    const total = payouts.length;

    // Paginate
    const offset = params?.offset || 0;
    const limit = params?.limit || 100;
    payouts = payouts.slice(offset, offset + limit);

    return { payouts, total };
  } catch (error) {
    logger.error('Error getting historical payouts', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Get export-ready data for reward cycles (CSV format)
 */
export function getRewardCyclesExport(params?: {
  startDate?: string;
  endDate?: string;
}): Array<Record<string, string | number>> {
  try {
    const { cycles } = getHistoricalRewardCycles({ ...params, limit: 10000 });
    
    return cycles.map((cycle) => ({
      Timestamp: cycle.timestamp,
      'Total SOL Distributed': cycle.totalSOLDistributed.toFixed(6),
      'Eligible Holders': cycle.eligibleHoldersCount,
      'Excluded Holders': cycle.excludedHoldersCount,
      'Blacklisted Holders': cycle.blacklistedHoldersCount,
      'Total Holders': cycle.totalHoldersCount,
      'Token Price USD': cycle.tokenPriceUSD.toFixed(6),
    }));
  } catch (error) {
    logger.error('Error getting reward cycles export', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Get export-ready data for payouts (CSV format)
 */
export function getPayoutsExport(params?: {
  startDate?: string;
  endDate?: string;
  pubkey?: string;
  status?: 'pending' | 'failed' | 'success';
}): Array<Record<string, string | number>> {
  try {
    const { payouts } = getHistoricalPayouts({ ...params, limit: 10000 });
    
    return payouts.map((payout) => ({
      Timestamp: payout.timestamp,
      'Recipient Pubkey': payout.pubkey,
      'Reward SOL': payout.rewardSOL.toFixed(6),
      Status: payout.status,
      'Retry Count': payout.retryCount,
      'Queued At': payout.queuedAt,
      'Executed At': payout.executedAt || 'Never',
      'Transaction Signature': payout.transactionSignature || '',
    }));
  } catch (error) {
    logger.error('Error getting payouts export', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

