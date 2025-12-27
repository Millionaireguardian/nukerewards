/**
 * SOL Distribution Service
 * 
 * Distributes SOL to eligible holders proportionally based on their NUKE holdings
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { connection, tokenMint } from '../config/solana';
import { logger } from '../utils/logger';
import { loadKeypairFromEnv } from '../utils/loadKeypairFromEnv';
import { getTokenHolders, type TokenHolder } from './solanaService';
import { REWARD_CONFIG, getMinimumPayoutThreshold } from '../config/constants';
import {
  getAccumulatedReward,
  addToAccumulatedReward,
  clearAccumulatedReward,
} from './unpaidRewardsService';
import {
  getEligibleWalletsWithUnpaidRewards,
  getEligibleWalletsMetadata,
} from './eligibleWalletsService';

// Minimum SOL payout threshold (0.0001 SOL) - legacy threshold for dust limit
const MIN_SOL_PAYOUT = REWARD_CONFIG.MIN_SOL_PAYOUT;

/**
 * Get reward wallet keypair
 */
function getRewardWallet(): Keypair {
  return loadKeypairFromEnv('REWARD_WALLET_PRIVATE_KEY_JSON');
}

/**
 * Distribute SOL to eligible holders proportionally
 * 
 * @param totalSol - Total SOL to distribute (in lamports)
 * @returns Distribution result with details
 */
export async function distributeSolToHolders(
  totalSol: bigint
): Promise<{
  distributedCount: number;
  totalDistributed: bigint;
  skippedCount: number;
  signatures: Array<{ pubkey: string; amount: bigint; signature: string }>;
  errors: Array<{ pubkey: string; error: string }>;
}> {
  try {
    logger.info('Starting SOL distribution to holders', {
      totalSolLamports: totalSol.toString(),
      totalSolHuman: (Number(totalSol) / LAMPORTS_PER_SOL).toFixed(6),
    });

    if (totalSol <= 0n) {
      throw new Error('Total SOL amount must be greater than zero');
    }

    // Step 1: Get eligible wallets (optimized - uses cached eligible wallets list)
    const eligibleWalletsSet = getEligibleWalletsWithUnpaidRewards();
    
    if (eligibleWalletsSet.size === 0) {
      const metadata = getEligibleWalletsMetadata();
      logger.info('No eligible wallets, skipping distribution', {
        eligibleWalletsLastUpdated: metadata.lastUpdated ? new Date(metadata.lastUpdated).toISOString() : null,
        eligibleWalletsCount: metadata.count,
      });
      return {
        distributedCount: 0,
        totalDistributed: 0n,
        skippedCount: 0,
        signatures: [],
        errors: [],
      };
    }

    // Step 2: Get all token holders and filter to eligible wallets only
    const allHolders = await getTokenHolders();
    const eligibleHolders: TokenHolder[] = allHolders.filter(holder => 
      eligibleWalletsSet.has(holder.owner)
    );
    
    if (eligibleHolders.length === 0) {
      logger.info('No eligible holders found after filtering', {
        totalHolders: allHolders.length,
        eligibleWalletsCount: eligibleWalletsSet.size,
      });
      return {
        distributedCount: 0,
        totalDistributed: 0n,
        skippedCount: 0,
        signatures: [],
        errors: [],
      };
    }

    // Step 3: Calculate total eligible supply
    const totalEligibleSupply = eligibleHolders.reduce((sum, holder) => {
      return sum + BigInt(holder.amount);
    }, 0n);

    if (totalEligibleSupply === 0n) {
      logger.warn('Total eligible supply is zero, skipping distribution');
      return {
        distributedCount: 0,
        totalDistributed: 0n,
        skippedCount: 0,
        signatures: [],
        errors: [],
      };
    }

    // Step 4: Get minimum payout threshold based on REWARD_VALUE_MODE
    const minPayoutThresholdSOL = await getMinimumPayoutThreshold();
    if (minPayoutThresholdSOL === null) {
      logger.warn('Could not determine minimum payout threshold, using legacy MIN_SOL_PAYOUT', {
        legacyMinSolPayout: MIN_SOL_PAYOUT,
      });
    }
    const thresholdSOL = minPayoutThresholdSOL ?? MIN_SOL_PAYOUT;
    const thresholdLamports = BigInt(Math.floor(thresholdSOL * LAMPORTS_PER_SOL));

    // Step 5: Calculate per-holder rewards and check against accumulated rewards
    const rewardsToPay: Array<{ pubkey: string; amountLamports: bigint; wasAccumulated: boolean }> = [];
    const rewardsToAccumulate: Array<{ pubkey: string; amountLamports: bigint }> = [];
    
    for (const holder of eligibleHolders) {
      const holderBalance = BigInt(holder.amount);
      
      // Calculate current epoch reward: (holder balance / total eligible supply) * total SOL
      const currentRewardLamports = (totalSol * holderBalance) / totalEligibleSupply;
      
      // Skip if current reward is below dust limit
      if (currentRewardLamports < BigInt(Math.floor(MIN_SOL_PAYOUT * LAMPORTS_PER_SOL))) {
        const currentRewardSOL = Number(currentRewardLamports) / LAMPORTS_PER_SOL;
        logger.debug('Payout skipped: below dust limit', {
          wallet: holder.owner,
          currentRewardSOL: currentRewardSOL.toFixed(6),
          dustLimitSOL: MIN_SOL_PAYOUT,
          reason: 'BELOW_DUST_LIMIT',
        });
        continue;
      }
      
      // Get accumulated reward in SOL
      const accumulatedRewardSOL = getAccumulatedReward(holder.owner);
      const accumulatedRewardLamports = BigInt(Math.floor(accumulatedRewardSOL * LAMPORTS_PER_SOL));
      
      // Calculate total: current reward + accumulated reward
      const totalRewardLamports = currentRewardLamports + accumulatedRewardLamports;
      
      // Compare total against threshold
      if (totalRewardLamports >= thresholdLamports) {
        // Total meets threshold: add to payout list (will clear accumulated after successful payout)
        rewardsToPay.push({
          pubkey: holder.owner,
          amountLamports: totalRewardLamports,
          wasAccumulated: accumulatedRewardLamports > 0n,
        });
      } else {
        // Total below threshold: accumulate current reward
        const currentRewardSOL = Number(currentRewardLamports) / LAMPORTS_PER_SOL;
        try {
          addToAccumulatedReward(holder.owner, currentRewardSOL);
          rewardsToAccumulate.push({
            pubkey: holder.owner,
            amountLamports: currentRewardLamports,
          });
          logger.info('Reward accumulated for wallet', {
            wallet: holder.owner,
            currentRewardSOL: currentRewardSOL.toFixed(6),
            previousAccumulatedSOL: accumulatedRewardSOL.toFixed(6),
            newAccumulatedSOL: (accumulatedRewardSOL + currentRewardSOL).toFixed(6),
            totalRewardSOL: (Number(totalRewardLamports) / LAMPORTS_PER_SOL).toFixed(6),
            thresholdSOL: thresholdSOL.toFixed(6),
            status: 'ACCUMULATED',
            reason: `Total (${(Number(totalRewardLamports) / LAMPORTS_PER_SOL).toFixed(6)} SOL) < threshold (${thresholdSOL.toFixed(6)} SOL)`,
          });
        } catch (error) {
          logger.error('❌ Failed to accumulate reward for wallet (write error)', {
            wallet: holder.owner,
            currentRewardSOL: currentRewardSOL.toFixed(6),
            previousAccumulatedSOL: accumulatedRewardSOL.toFixed(6),
            error: error instanceof Error ? error.message : String(error),
            errorType: error instanceof Error ? error.constructor.name : typeof error,
            stack: error instanceof Error ? error.stack : undefined,
          });
          // Continue processing other holders even if accumulation fails
        }
      }
    }

    if (rewardsToPay.length === 0) {
      logger.info('No holders meet minimum payout threshold (including accumulated rewards)', {
        minPayoutThresholdSOL: thresholdSOL.toFixed(6),
        totalEligibleHolders: eligibleHolders.length,
        accumulatedCount: rewardsToAccumulate.length,
        totalAccumulatedSOL: rewardsToAccumulate.reduce((sum, r) => sum + Number(r.amountLamports) / LAMPORTS_PER_SOL, 0).toFixed(6),
        status: 'ALL_SKIPPED',
      });
      return {
        distributedCount: 0,
        totalDistributed: 0n,
        skippedCount: eligibleHolders.length,
        signatures: [],
        errors: [],
      };
    }

    logger.info('Calculated rewards for distribution with accumulation logic', {
      eligibleWalletsCount: eligibleWalletsSet.size,
      eligibleHoldersProcessed: eligibleHolders.length,
      rewardsToPay: rewardsToPay.length,
      rewardsAccumulated: rewardsToAccumulate.length,
      totalRewardLamports: rewardsToPay.reduce((sum, r) => sum + r.amountLamports, 0n).toString(),
      minPayoutThresholdSOL: thresholdSOL,
    });

    // Step 6: Get reward wallet
    const rewardWallet = getRewardWallet();
    const rewardWalletAddress = rewardWallet.publicKey;

    // Step 7: Check reward wallet balance
    const rewardBalance = await connection.getBalance(rewardWalletAddress, 'confirmed');
    const totalRequired = rewardsToPay.reduce((sum, r) => sum + r.amountLamports, 0n) + BigInt(rewardsToPay.length * 5000); // Buffer for fees

    if (rewardBalance < totalRequired) {
      logger.warn('Insufficient reward wallet balance for all distributions', {
        rewardBalance: rewardBalance.toString(),
        required: totalRequired.toString(),
        rewardsCount: rewardsToPay.length,
      });
      // Continue with what we can afford
    }

    // Step 8: Execute SOL transfers
    const signatures: Array<{ pubkey: string; amount: bigint; signature: string }> = [];
    const errors: Array<{ pubkey: string; error: string }> = [];
    let totalDistributed = 0n;
    let distributedCount = 0;
    let skippedCount = 0;

    for (const reward of rewardsToPay) {
      try {
        // Check if we have enough balance
        const currentBalance = await connection.getBalance(rewardWalletAddress, 'confirmed');
        const requiredForThis = reward.amountLamports + BigInt(5000); // Amount + fee buffer

        if (currentBalance < requiredForThis) {
          const amountSOL = Number(reward.amountLamports) / LAMPORTS_PER_SOL;
          const availableSOL = Number(currentBalance) / LAMPORTS_PER_SOL;
          const requiredSOL = Number(requiredForThis) / LAMPORTS_PER_SOL;
          
          // Get accumulated reward for logging
          const accumulatedRewardSOL = getAccumulatedReward(reward.pubkey);
          
          logger.warn('Payout skipped: insufficient balance', {
            wallet: reward.pubkey,
            amountSOL: amountSOL.toFixed(6),
            availableSOL: availableSOL.toFixed(6),
            requiredSOL: requiredSOL.toFixed(6),
            shortfallSOL: (requiredSOL - availableSOL).toFixed(6),
            accumulatedRewardSOL: accumulatedRewardSOL.toFixed(6),
            wasAccumulated: reward.wasAccumulated,
            reason: 'INSUFFICIENT_BALANCE',
            status: 'SKIPPED',
          });
          skippedCount++;
          continue;
        }

        // Create transfer instruction
        const recipient = new PublicKey(reward.pubkey);
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: rewardWalletAddress,
            toPubkey: recipient,
            lamports: Number(reward.amountLamports),
          })
        );

        // Get recent blockhash
        const { blockhash } = await connection.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = rewardWalletAddress;

        // Sign and send
        const signature = await sendAndConfirmTransaction(
          connection,
          transaction,
          [rewardWallet],
          { commitment: 'confirmed', maxRetries: 3 }
        );

        signatures.push({
          pubkey: reward.pubkey,
          amount: reward.amountLamports,
          signature,
        });

        totalDistributed += reward.amountLamports;
        distributedCount++;

        const amountSOL = Number(reward.amountLamports) / LAMPORTS_PER_SOL;
        
        // Get accumulated reward before clearing for logging
        const accumulatedBeforeClear = getAccumulatedReward(reward.pubkey);
        
        // Clear accumulated reward after successful payout
        let accumulatedCleared = false;
        try {
          clearAccumulatedReward(reward.pubkey);
          accumulatedCleared = true;
        } catch (error) {
          logger.error('❌ Failed to clear accumulated reward after payout (write error)', {
            wallet: reward.pubkey,
            accumulatedAmountBeforeClear: accumulatedBeforeClear.toFixed(6),
            error: error instanceof Error ? error.message : String(error),
            errorType: error instanceof Error ? error.constructor.name : typeof error,
            stack: error instanceof Error ? error.stack : undefined,
            status: 'CLEAR_FAILED',
          });
          // Don't fail the payout if clearing accumulated reward fails
        }

        logger.info('SOL payout successful', {
          wallet: reward.pubkey,
          amountSOL: amountSOL.toFixed(6),
          amountLamports: reward.amountLamports.toString(),
          signature,
          wasAccumulated: reward.wasAccumulated,
          accumulatedBeforeClear: accumulatedBeforeClear.toFixed(6),
          accumulatedCleared,
          resetStatus: accumulatedCleared ? 'RESET' : 'CLEAR_FAILED',
          status: 'PAID',
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const amountSOL = Number(reward.amountLamports) / LAMPORTS_PER_SOL;
        
        errors.push({
          pubkey: reward.pubkey,
          error: errorMessage,
        });

        logger.error('❌ SOL payout transaction failed', {
          wallet: reward.pubkey,
          amountSOL: amountSOL.toFixed(6),
          amountLamports: reward.amountLamports.toString(),
          wasAccumulated: reward.wasAccumulated,
          error: errorMessage,
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          stack: error instanceof Error ? error.stack : undefined,
          status: 'TRANSACTION_FAILED',
        });
      }
    }

    logger.info('SOL distribution completed', {
      eligibleWalletsCount: eligibleWalletsSet.size,
      eligibleHoldersProcessed: eligibleHolders.length,
      totalToPay: rewardsToPay.length,
      accumulated: rewardsToAccumulate.length,
      distributed: distributedCount,
      skipped: skippedCount,
      failed: errors.length,
      totalDistributedLamports: totalDistributed.toString(),
      totalDistributedSol: (Number(totalDistributed) / LAMPORTS_PER_SOL).toFixed(6),
      minPayoutThresholdSOL: thresholdSOL,
    });

    return {
      distributedCount,
      totalDistributed,
      skippedCount,
      signatures,
      errors,
    };
  } catch (error) {
    logger.error('Error distributing SOL to holders', {
      error: error instanceof Error ? error.message : String(error),
      totalSol: totalSol.toString(),
    });
    throw error;
  }
}

