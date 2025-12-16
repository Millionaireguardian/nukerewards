import { REWARD_CONFIG } from '../config/constants';
import { logger } from '../utils/logger';
import {
  getLastRewardRun,
  setLastRewardRun,
  computeRewards,
  queuePendingPayouts,
  executePayouts,
  getEligibleHolders,
} from '../services/rewardService';
import { saveRewardCycle, type RewardCycle } from '../services/rewardHistoryService';
import { generateCombinedExcel } from '../services/rewardExportService';
import { getTokenHolders } from '../services/solanaService';
import { getNUKEPriceUSD } from '../services/priceService';
import { isBlacklisted } from '../config/blacklist';
import { TaxService } from '../services/taxService';

let schedulerInterval: NodeJS.Timeout | null = null;
let isRunning = false;

/**
 * Process reward distribution for pending holders
 */
async function processRewards(): Promise<void> {
  if (isRunning) {
    logger.debug('Reward scheduler already running, skipping');
    return;
  }

  const startTime = Date.now();
  const lastRun = getLastRewardRun();
  const now = startTime;

  // Check if enough time has passed since last run
  if (lastRun !== null && (now - lastRun) < REWARD_CONFIG.MIN_REWARD_INTERVAL) {
    const timeUntilNext = REWARD_CONFIG.MIN_REWARD_INTERVAL - (now - lastRun);
    logger.debug('Skipping reward run - too soon since last run', {
      lastRun: new Date(lastRun).toISOString(),
      timeUntilNext: `${Math.ceil(timeUntilNext / 1000)}s`,
    });
    return;
  }

  isRunning = true;
  logger.info('Starting reward distribution run', {
    startTime: new Date(startTime).toISOString(),
  });

  try {
    // Get eligible holders count for logging
    const eligibleHolders = await getEligibleHolders();
    logger.info('Eligible holders', {
      count: eligibleHolders.length,
    });

    if (eligibleHolders.length === 0) {
      logger.info('No eligible holders, skipping reward distribution');
      setLastRewardRun(now);
      return;
    }

    // Compute rewards for all eligible holders
    const rewards = await computeRewards();
    
    if (rewards.length === 0) {
      logger.info('No rewards computed, skipping payout');
      setLastRewardRun(now);
      return;
    }

    // Queue pending payouts
    await queuePendingPayouts(rewards);

    // Execute payouts
    await executePayouts();

    // Process withheld tax from Token-2022 transfers
    // This distributes accumulated transfer fees (3% to reward wallet, 1% to treasury)
    try {
      logger.info('Processing withheld tax from Token-2022 transfers');
      const taxResult = await TaxService.processWithheldTax();
      if (taxResult) {
        logger.info('Tax distribution completed', {
          totalTax: taxResult.totalTax.toString(),
          rewardAmount: taxResult.rewardAmount.toString(),
          treasuryAmount: taxResult.treasuryAmount.toString(),
        });
      } else {
        logger.debug('No withheld tax to process');
      }
    } catch (taxError) {
      logger.error('Error processing withheld tax', {
        error: taxError instanceof Error ? taxError.message : String(taxError),
      });
      // Don't throw - allow reward distribution to continue
    }

    const endTime = Date.now();
    const duration = endTime - startTime;
    const totalRewardSOL = rewards.reduce((sum, r) => sum + r.rewardSOL, 0);

    // Get additional statistics for historical record
    let excludedHoldersCount = 0;
    let blacklistedHoldersCount = 0;
    let totalHoldersCount = 0;
    let tokenPriceUSD = 0.01; // Fallback

    try {
      const allHolders = await getTokenHolders();
      totalHoldersCount = allHolders.length;
      
      // Count excluded and blacklisted
      const eligiblePubkeys = new Set(eligibleHolders.map(h => h.pubkey));
      for (const holder of allHolders) {
        if (isBlacklisted(holder.owner)) {
          blacklistedHoldersCount++;
        } else if (!eligiblePubkeys.has(holder.owner)) {
          excludedHoldersCount++;
        }
      }

      // Get token price
      try {
        tokenPriceUSD = await getNUKEPriceUSD();
      } catch (priceError) {
        logger.warn('Failed to fetch token price for history, using fallback', {
          error: priceError instanceof Error ? priceError.message : String(priceError),
        });
      }
    } catch (error) {
      logger.warn('Error getting holder statistics for history', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Save reward cycle to history
    try {
      const cycleId = new Date(now).toISOString();
      const cycle: RewardCycle = {
        id: cycleId,
        timestamp: cycleId,
        totalSOLDistributed: totalRewardSOL,
        eligibleHoldersCount: eligibleHolders.length,
        excludedHoldersCount,
        blacklistedHoldersCount,
        totalHoldersCount,
        tokenPriceUSD,
        rewardDetails: rewards.map((r) => ({
          pubkey: r.pubkey,
          rewardSOL: r.rewardSOL,
          eligibilityStatus: 'eligible' as const,
          retryCount: 0,
        })),
      };

      saveRewardCycle(cycle);
      logger.info('Reward cycle saved to history', { cycleId });
    } catch (historyError) {
      logger.error('Failed to save reward cycle to history', {
        error: historyError instanceof Error ? historyError.message : String(historyError),
      });
      // Don't throw - allow scheduler to continue
    }

    logger.info('Reward distribution run completed', {
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      duration: `${duration}ms`,
      eligibleHolders: eligibleHolders.length,
      rewardsComputed: rewards.length,
      totalRewardSOL: totalRewardSOL.toFixed(6),
    });

    // Generate automated export file
    try {
      const exportFilepath = await generateCombinedExcel();
      logger.info('Automated export file generated', {
        filepath: exportFilepath,
      });
    } catch (exportError) {
      logger.error('Failed to generate automated export file', {
        error: exportError instanceof Error ? exportError.message : String(exportError),
      });
      // Don't throw - allow scheduler to continue
    }

    // Update last run timestamp
    setLastRewardRun(now);
  } catch (error) {
    logger.error('Error in reward distribution run', {
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    isRunning = false;
  }
}

/**
 * Start the reward scheduler
 */
export function startRewardScheduler(): void {
  if (schedulerInterval !== null) {
    logger.warn('Reward scheduler already started');
    return;
  }

  logger.info('Starting reward scheduler', {
    interval: `${REWARD_CONFIG.SCHEDULER_INTERVAL / 1000}s`,
    minRewardInterval: `${REWARD_CONFIG.MIN_REWARD_INTERVAL / 1000}s`,
  });

  // Run immediately on startup (if conditions are met)
  processRewards().catch((error) => {
    logger.error('Error in initial reward scheduler run', {
      error: error instanceof Error ? error.message : String(error),
    });
  });

  // Schedule periodic runs
  schedulerInterval = setInterval(() => {
    processRewards().catch((error) => {
      logger.error('Error in scheduled reward run', {
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }, REWARD_CONFIG.SCHEDULER_INTERVAL);
}

/**
 * Stop the reward scheduler
 */
export function stopRewardScheduler(): void {
  if (schedulerInterval !== null) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    logger.info('Reward scheduler stopped');
  }
}

/**
 * Get scheduler status
 */
export function getSchedulerStatus(): {
  isRunning: boolean;
  lastRun: number | null;
  nextRun: number | null;
} {
  const lastRun = getLastRewardRun();
  const now = Date.now();
  
  let nextRun: number | null = null;
  if (lastRun !== null) {
    const timeSinceLastRun = now - lastRun;
    if (timeSinceLastRun < REWARD_CONFIG.MIN_REWARD_INTERVAL) {
      nextRun = lastRun + REWARD_CONFIG.MIN_REWARD_INTERVAL;
    } else {
      // Next run will be at next scheduler interval
      nextRun = now + REWARD_CONFIG.SCHEDULER_INTERVAL;
    }
  } else {
    // First run will be at next scheduler interval
    nextRun = now + REWARD_CONFIG.SCHEDULER_INTERVAL;
  }

  return {
    isRunning,
    lastRun,
    nextRun,
  };
}

