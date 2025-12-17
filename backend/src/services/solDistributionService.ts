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
import { getEligibleHolders } from './rewardService';
import { REWARD_CONFIG } from '../config/constants';

// Minimum SOL payout threshold (0.0001 SOL)
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

    // Step 1: Get eligible holders
    const eligibleHolders = await getEligibleHolders();
    
    if (eligibleHolders.length === 0) {
      logger.info('No eligible holders, skipping distribution');
      return {
        distributedCount: 0,
        totalDistributed: 0n,
        skippedCount: 0,
        signatures: [],
        errors: [],
      };
    }

    // Step 2: Calculate total eligible supply
    const totalEligibleSupply = eligibleHolders.reduce((sum, holder) => {
      return sum + BigInt(holder.balance);
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

    // Step 3: Calculate per-holder rewards
    const rewards: Array<{ pubkey: string; amountLamports: bigint }> = [];
    
    for (const holder of eligibleHolders) {
      const holderBalance = BigInt(holder.balance);
      
      // Calculate reward: (holder balance / total eligible supply) * total SOL
      const rewardLamports = (totalSol * holderBalance) / totalEligibleSupply;
      
      // Only include if above minimum threshold
      if (rewardLamports >= BigInt(Math.floor(MIN_SOL_PAYOUT * LAMPORTS_PER_SOL))) {
        rewards.push({
          pubkey: holder.pubkey,
          amountLamports: rewardLamports,
        });
      }
    }

    if (rewards.length === 0) {
      logger.info('No holders meet minimum payout threshold', {
        minSolPayout: MIN_SOL_PAYOUT,
        totalEligibleHolders: eligibleHolders.length,
      });
      return {
        distributedCount: 0,
        totalDistributed: 0n,
        skippedCount: eligibleHolders.length,
        signatures: [],
        errors: [],
      };
    }

    logger.info('Calculated rewards for distribution', {
      eligibleHolders: eligibleHolders.length,
      rewardsCount: rewards.length,
      totalRewardLamports: rewards.reduce((sum, r) => sum + r.amountLamports, 0n).toString(),
    });

    // Step 4: Get reward wallet
    const rewardWallet = getRewardWallet();
    const rewardWalletAddress = rewardWallet.publicKey;

    // Step 5: Check reward wallet balance
    const rewardBalance = await connection.getBalance(rewardWalletAddress, 'confirmed');
    const totalRequired = rewards.reduce((sum, r) => sum + r.amountLamports, 0n) + BigInt(rewards.length * 5000); // Buffer for fees

    if (rewardBalance < totalRequired) {
      logger.warn('Insufficient reward wallet balance for all distributions', {
        rewardBalance: rewardBalance.toString(),
        required: totalRequired.toString(),
        rewardsCount: rewards.length,
      });
      // Continue with what we can afford
    }

    // Step 6: Execute SOL transfers
    const signatures: Array<{ pubkey: string; amount: bigint; signature: string }> = [];
    const errors: Array<{ pubkey: string; error: string }> = [];
    let totalDistributed = 0n;
    let distributedCount = 0;
    let skippedCount = 0;

    for (const reward of rewards) {
      try {
        // Check if we have enough balance
        const currentBalance = await connection.getBalance(rewardWalletAddress, 'confirmed');
        const requiredForThis = reward.amountLamports + BigInt(5000); // Amount + fee buffer

        if (currentBalance < requiredForThis) {
          logger.warn('Insufficient balance for payout, skipping', {
            recipient: reward.pubkey,
            amount: reward.amountLamports.toString(),
            available: currentBalance.toString(),
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

        logger.info('SOL payout successful', {
          recipient: reward.pubkey,
          amountLamports: reward.amountLamports.toString(),
          amountSol: (Number(reward.amountLamports) / LAMPORTS_PER_SOL).toFixed(6),
          signature,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push({
          pubkey: reward.pubkey,
          error: errorMessage,
        });

        logger.error('SOL payout failed', {
          recipient: reward.pubkey,
          amount: reward.amountLamports.toString(),
          error: errorMessage,
        });
      }
    }

    logger.info('SOL distribution completed', {
      total: rewards.length,
      distributed: distributedCount,
      skipped: skippedCount,
      failed: errors.length,
      totalDistributedLamports: totalDistributed.toString(),
      totalDistributedSol: (Number(totalDistributed) / LAMPORTS_PER_SOL).toFixed(6),
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

