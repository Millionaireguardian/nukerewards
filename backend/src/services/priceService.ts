import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, getAccount, getMint } from '@solana/spl-token';
import { connection, tokenMint } from '../config/solana';
import { logger } from '../utils/logger';
import { getRaydiumPoolId, WSOL_MINT } from '../config/raydium';

/**
 * Price Service - Devnet Only
 * 
 * Fetches NUKE token price in SOL from Raydium devnet pool only.
 * Directly reads pool vault balances and calculates price.
 * 
 * Returns price in SOL (WSOL per NUKE) from Raydium devnet pool.
 */

// Cache for price to avoid excessive API calls
interface PriceCache {
  price: number | null; // SOL per NUKE
  source: 'raydium' | null;
  timestamp: number;
}

let cachedPrice: PriceCache | null = null;
const PRICE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch Raydium pool vault addresses from pool account
 */
async function getRaydiumPoolVaults(
  conn: Connection,
  poolId: PublicKey
): Promise<{ baseVault: PublicKey; quoteVault: PublicKey } | null> {
  try {
    const poolAccountInfo = await conn.getAccountInfo(poolId);
    if (!poolAccountInfo) {
      logger.warn('Raydium pool account not found', { poolId: poolId.toBase58() });
      return null;
    }

    const data = poolAccountInfo.data;
    
    if (data.length < 112) {
      logger.warn('Raydium pool account data too short', {
        poolId: poolId.toBase58(),
        dataLength: data.length,
      });
      return null;
    }

    // Extract vault addresses (PublicKey is 32 bytes)
    // Raydium AMM pool structure: tokenAVault at offset 48-80, tokenBVault at offset 80-112
    const tokenAVaultBytes = data.slice(48, 80);
    const tokenBVaultBytes = data.slice(80, 112);
    
    const tokenAVault = new PublicKey(tokenAVaultBytes);
    const tokenBVault = new PublicKey(tokenBVaultBytes);

    return {
      baseVault: tokenAVault,
      quoteVault: tokenBVault,
    };
  } catch (error) {
    logger.error('Error fetching Raydium pool vaults', {
      error: error instanceof Error ? error.message : String(error),
      poolId: poolId.toBase58(),
    });
    return null;
  }
}

/**
 * Get NUKE token price in SOL from Raydium devnet pool
 * 
 * Reads RAYDIUM_POOL_ID from environment variables.
 * Fetches pool vault balances for NUKE and SOL tokens.
 * Computes: price_SOL = vault_SOL_balance / vault_NUKE_balance
 * 
 * Returns: { price: number | null, source: 'raydium' | null }
 * - price: SOL per NUKE (from Raydium devnet pool)
 * - source: 'raydium' if successful, null if unavailable
 * 
 * Uses cached price if available and fresh (5 minute TTL)
 */
export async function getNUKEPriceSOL(): Promise<{ price: number | null; source: 'raydium' | null }> {
  try {
    // Check cache first
    const now = Date.now();
    if (cachedPrice && (now - cachedPrice.timestamp) < PRICE_CACHE_TTL) {
      logger.debug('Using cached NUKE price (SOL)', {
        price: cachedPrice.price,
        source: cachedPrice.source,
        cachedAt: new Date(cachedPrice.timestamp).toISOString(),
      });
      return {
        price: cachedPrice.price,
        source: cachedPrice.source,
      };
    }

    // Step 1: Get Raydium pool ID from environment
    const poolId = getRaydiumPoolId();
    if (!poolId) {
      logger.error('RAYDIUM_POOL_ID not set in environment variables - price cannot be fetched');
      logger.error('Please set RAYDIUM_POOL_ID environment variable to the Raydium devnet pool ID');
      cachedPrice = {
        price: null,
        source: null,
        timestamp: now,
      };
      return {
        price: null,
        source: null,
      };
    }

    logger.info('Fetching NUKE price from Raydium pool', {
      poolId: poolId.toBase58(),
      tokenMint: tokenMint.toBase58(),
    });

    // Step 2: Get pool vault addresses
    const vaults = await getRaydiumPoolVaults(connection, poolId);
    if (!vaults) {
      logger.warn('Raydium pool vaults not found', { poolId: poolId.toBase58() });
      cachedPrice = {
        price: null,
        source: 'raydium', // Still 'raydium' source even if unavailable
        timestamp: now,
      };
      return {
        price: null,
        source: 'raydium',
      };
    }

    // Step 3: Fetch vault token accounts (try both TOKEN and TOKEN_2022)
    let baseVaultAccount = null;
    let quoteVaultAccount = null;

    // Try to fetch base vault (NUKE token - TOKEN_2022)
    try {
      baseVaultAccount = await getAccount(connection, vaults.baseVault, 'confirmed', TOKEN_2022_PROGRAM_ID);
    } catch {
      try {
        baseVaultAccount = await getAccount(connection, vaults.baseVault, 'confirmed', TOKEN_PROGRAM_ID);
      } catch (error) {
        logger.debug('Failed to fetch base vault with both program IDs', {
          vault: vaults.baseVault.toBase58(),
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Try to fetch quote vault (WSOL - TOKEN_PROGRAM_ID)
    try {
      quoteVaultAccount = await getAccount(connection, vaults.quoteVault, 'confirmed', TOKEN_PROGRAM_ID);
    } catch {
      try {
        quoteVaultAccount = await getAccount(connection, vaults.quoteVault, 'confirmed', TOKEN_2022_PROGRAM_ID);
      } catch (error) {
        logger.debug('Failed to fetch quote vault with both program IDs', {
          vault: vaults.quoteVault.toBase58(),
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (!baseVaultAccount || !quoteVaultAccount) {
      logger.warn('Failed to fetch Raydium vault accounts', {
        baseVault: vaults.baseVault.toBase58(),
        quoteVault: vaults.quoteVault.toBase58(),
        baseVaultFound: !!baseVaultAccount,
        quoteVaultFound: !!quoteVaultAccount,
      });
      cachedPrice = {
        price: null,
        source: 'raydium',
        timestamp: now,
      };
      return {
        price: null,
        source: 'raydium',
      };
    }

    // Step 4: Determine which vault is NUKE and which is WSOL
    let nukeVaultBalance: bigint;
    let solVaultBalance: bigint;
    let nukeDecimals: number;
    let solDecimals: number;

    // Get mint info to determine which vault is which
    let baseMintInfo = null;
    let quoteMintInfo = null;

    try {
      baseMintInfo = await getMint(connection, baseVaultAccount.mint, 'confirmed', TOKEN_2022_PROGRAM_ID);
    } catch {
      baseMintInfo = await getMint(connection, baseVaultAccount.mint, 'confirmed', TOKEN_PROGRAM_ID);
    }

    try {
      quoteMintInfo = await getMint(connection, quoteVaultAccount.mint, 'confirmed', TOKEN_PROGRAM_ID);
    } catch {
      quoteMintInfo = await getMint(connection, quoteVaultAccount.mint, 'confirmed', TOKEN_2022_PROGRAM_ID);
    }

    // Check which vault contains NUKE token
    if (baseVaultAccount.mint.equals(tokenMint)) {
      // baseVault is NUKE, quoteVault is WSOL
      nukeVaultBalance = baseVaultAccount.amount;
      solVaultBalance = quoteVaultAccount.amount;
      nukeDecimals = baseMintInfo.decimals;
      solDecimals = quoteMintInfo.decimals;
    } else if (quoteVaultAccount.mint.equals(tokenMint)) {
      // quoteVault is NUKE, baseVault is WSOL
      nukeVaultBalance = quoteVaultAccount.amount;
      solVaultBalance = baseVaultAccount.amount;
      nukeDecimals = quoteMintInfo.decimals;
      solDecimals = baseMintInfo.decimals;
    } else {
      logger.warn('Raydium pool vaults do not contain NUKE token', {
        baseVaultMint: baseVaultAccount.mint.toBase58(),
        quoteVaultMint: quoteVaultAccount.mint.toBase58(),
        expectedNUKEMint: tokenMint.toBase58(),
      });
      cachedPrice = {
        price: null,
        source: 'raydium',
        timestamp: now,
      };
      return {
        price: null,
        source: 'raydium',
      };
    }

    // Step 5: Calculate price: SOL per NUKE
    // price_SOL = vault_SOL_balance / vault_NUKE_balance (adjusted for decimals)
    const nukeAmount = Number(nukeVaultBalance) / Math.pow(10, nukeDecimals);
    const solAmount = Number(solVaultBalance) / Math.pow(10, solDecimals);

    let price: number | null = null;
    if (nukeAmount > 0) {
      price = solAmount / nukeAmount; // SOL per NUKE
      logger.info('NUKE token price fetched from Raydium', {
        price,
        priceDescription: `${price} SOL per NUKE`,
        nukeVaultBalance: nukeVaultBalance.toString(),
        solVaultBalance: solVaultBalance.toString(),
        nukeAmount,
        solAmount,
        nukeDecimals,
        solDecimals,
        poolId: poolId.toBase58(),
      });
    } else {
      logger.error('Raydium pool NUKE vault balance is zero - cannot calculate price', {
        nukeVaultBalance: nukeVaultBalance.toString(),
        solVaultBalance: solVaultBalance.toString(),
        nukeAmount: nukeAmount.toString(),
        solAmount: solAmount.toString(),
        poolId: poolId.toBase58(),
      });
    }

    // Update cache
    cachedPrice = {
      price,
      source: price !== null ? 'raydium' : null,
      timestamp: now,
    };

    return {
      price,
      source: price !== null ? 'raydium' : null,
    };
  } catch (error) {
    logger.error('Error fetching NUKE price from Raydium', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    // Return null on error
    const now = Date.now();
    cachedPrice = {
      price: null,
      source: null,
      timestamp: now,
    };
    
    return {
      price: null,
      source: null,
    };
  }
}

/**
 * Get NUKE token price in USD (legacy function for compatibility)
 * Returns 0 for devnet as we only use SOL prices
 */
export async function getNUKEPriceUSD(): Promise<number> {
  logger.debug('getNUKEPriceUSD called - returning 0 for devnet (SOL-only pricing)');
  return 0; // Return 0 for devnet
}

/**
 * Get price source (always 'raydium' or null for devnet)
 */
export function getPriceSource(): 'raydium' | null {
  return cachedPrice?.source || null;
}

/**
 * Clear price cache (useful for testing or forced refresh)
 */
export function clearPriceCache(): void {
  cachedPrice = null;
  logger.debug('Price cache cleared');
}

/**
 * Get diagnostic information about price fetching
 * Useful for debugging why price might not be loading
 */
export async function getPriceDiagnostics(): Promise<{
  poolIdSet: boolean;
  poolId?: string;
  tokenMint: string;
  lastPrice: number | null;
  lastSource: 'raydium' | null;
  lastFetchTime: string | null;
  cacheAge: number | null;
}> {
  const poolId = getRaydiumPoolId();
  const now = Date.now();
  
  return {
    poolIdSet: poolId !== null,
    poolId: poolId?.toBase58(),
    tokenMint: tokenMint.toBase58(),
    lastPrice: cachedPrice?.price || null,
    lastSource: cachedPrice?.source || null,
    lastFetchTime: cachedPrice ? new Date(cachedPrice.timestamp).toISOString() : null,
    cacheAge: cachedPrice ? now - cachedPrice.timestamp : null,
  };
}
