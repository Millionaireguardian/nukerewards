import dotenv from 'dotenv';
import { createApp, startServer } from './server';
import { logger } from './utils/logger';
import { loadKeypairFromEnv, loadKeypairFromEnvOptional } from './utils/loadKeypairFromEnv';
import { PublicKey } from '@solana/web3.js';
import { suppressSolanaRetryMessages } from './utils/rateLimitLogger';
import { isTokenMode, isUsdMode, MIN_PAYOUT_CONFIG, TAX_THRESHOLD_CONFIG, BATCH_HARVEST_CONFIG } from './config/constants';

// Load environment variables from .env file
dotenv.config();

// Suppress Solana web3.js retry messages (limit to 3)
suppressSolanaRetryMessages();

/**
 * Log application configuration on startup
 */
function logStartupConfiguration(): void {
  const mode = isTokenMode() ? 'TOKEN' : 'USD';
  logger.info('📊 Application Configuration', {
    mode,
    isTokenMode: isTokenMode(),
    isUsdMode: isUsdMode(),
    minPayoutConfig: {
      token: MIN_PAYOUT_CONFIG.MIN_PAYOUT_TOKEN,
      usd: MIN_PAYOUT_CONFIG.MIN_PAYOUT_USD,
    },
    taxThresholdConfig: {
      token: TAX_THRESHOLD_CONFIG.MIN_TAX_THRESHOLD_TOKEN,
      usd: TAX_THRESHOLD_CONFIG.MIN_TAX_THRESHOLD_USD,
    },
    batchHarvestConfig: {
      maxHarvestToken: BATCH_HARVEST_CONFIG.MAX_HARVEST_TOKEN,
      maxHarvestUsd: BATCH_HARVEST_CONFIG.MAX_HARVEST_USD,
      batchCount: BATCH_HARVEST_CONFIG.BATCH_COUNT,
      batchDelayTokenMode: BATCH_HARVEST_CONFIG.BATCH_DELAY_TOKEN_MODE,
      batchDelayUsdMode: BATCH_HARVEST_CONFIG.BATCH_DELAY_USD_MODE,
    },
  });
}

/**
 * Validate and load all required wallets on startup
 * This ensures the application fails fast if wallet configuration is invalid
 */
function validateWallets(): void {
  logger.info('Validating wallet configuration...');

  try {
    // Validate reward wallet (required for tax distribution)
    const rewardWallet = loadKeypairFromEnv('REWARD_WALLET_PRIVATE_KEY_JSON');
    logger.info('✅ Reward wallet validated', {
      publicKey: rewardWallet.publicKey.toBase58(),
    });

    // Validate reward wallet address matches (if provided)
    const rewardWalletAddress = process.env.REWARD_WALLET_ADDRESS;
    if (rewardWalletAddress) {
      try {
        const expectedAddress = new PublicKey(rewardWalletAddress);
        if (!rewardWallet.publicKey.equals(expectedAddress)) {
          logger.warn('⚠️ REWARD_WALLET_ADDRESS does not match REWARD_WALLET_PRIVATE_KEY_JSON public key', {
            expected: rewardWalletAddress,
            actual: rewardWallet.publicKey.toBase58(),
          });
        } else {
          logger.info('✅ Reward wallet address matches private key');
        }
      } catch (error) {
        logger.warn('⚠️ Invalid REWARD_WALLET_ADDRESS format', {
          address: rewardWalletAddress,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Validate treasury wallet (optional - can be receive-only)
    const treasuryWallet = loadKeypairFromEnvOptional('TREASURY_WALLET_PRIVATE_KEY_JSON');
    if (treasuryWallet) {
      logger.info('✅ Treasury wallet validated (has private key)', {
        publicKey: treasuryWallet.publicKey.toBase58(),
      });
    } else {
      logger.info('ℹ️ Treasury wallet is receive-only (no private key provided)');
    }

    // Validate treasury wallet address (if provided)
    const treasuryWalletAddress = process.env.TREASURY_WALLET_ADDRESS;
    if (treasuryWalletAddress) {
      try {
        const expectedAddress = new PublicKey(treasuryWalletAddress);
        if (treasuryWallet && !treasuryWallet.publicKey.equals(expectedAddress)) {
          logger.warn('⚠️ TREASURY_WALLET_ADDRESS does not match TREASURY_WALLET_PRIVATE_KEY_JSON public key', {
            expected: treasuryWalletAddress,
            actual: treasuryWallet.publicKey.toBase58(),
          });
        } else if (treasuryWallet) {
          logger.info('✅ Treasury wallet address matches private key');
        } else {
          logger.info('ℹ️ Treasury wallet address set (receive-only mode)', {
            address: treasuryWalletAddress,
          });
        }
      } catch (error) {
        logger.warn('⚠️ Invalid TREASURY_WALLET_ADDRESS format', {
          address: treasuryWalletAddress,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.info('✅ All wallet configurations validated successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('❌ Wallet validation failed - application cannot start', {
      error: errorMessage,
    });
    throw new Error(`Wallet validation failed: ${errorMessage}`);
  }
}

/**
 * Application entry point
 */
async function main(): Promise<void> {
  try {
    // Log configuration on startup
    logStartupConfiguration();

    // Validate wallets before starting server
    validateWallets();

    const app = createApp();
    startServer(app);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Failed to start application:', errorMessage);
    process.exit(1);
  }
}

main();
