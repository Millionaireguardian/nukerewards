import { AccountInfo } from '@solana/web3.js';
import { TOKEN_2022_PROGRAM_ID, unpackMint, unpackAccount } from '@solana/spl-token';
import { connection, tokenMint } from '../config/solana';
import { logger } from '../utils/logger';

export interface TokenHolder {
  address: string;
  owner: string;
  amount: string;
  decimals: number;
}

export interface MintInfo {
  address: string;
  decimals: number;
  supply: string;
  mintAuthority: string | null;
  freezeAuthority: string | null;
  isInitialized: boolean;
}

// Cache for token holders to reduce RPC calls
interface TokenHoldersCache {
  holders: TokenHolder[];
  timestamp: number;
}

let cachedTokenHolders: TokenHoldersCache | null = null;
const TOKEN_HOLDERS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

// Cache for mint info
interface MintInfoCache {
  info: MintInfo;
  timestamp: number;
}

let cachedMintInfo: MintInfoCache | null = null;
const MINT_INFO_CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

/**
 * Fetch mint account information (with caching)
 */
export async function getMintInfo(): Promise<MintInfo> {
  // Check cache first
  const now = Date.now();
  if (cachedMintInfo && (now - cachedMintInfo.timestamp) < MINT_INFO_CACHE_TTL) {
    logger.debug('Using cached mint info', {
      cachedAt: new Date(cachedMintInfo.timestamp).toISOString(),
    });
    return cachedMintInfo.info;
  }
  try {
    const mintAccountInfo = await connection.getAccountInfo(tokenMint);
    
    if (!mintAccountInfo) {
      throw new Error(`Mint account not found: ${tokenMint.toBase58()}`);
    }

    const parsedMint = unpackMint(tokenMint, mintAccountInfo, TOKEN_2022_PROGRAM_ID);
    
    const mintInfo: MintInfo = {
      address: tokenMint.toBase58(),
      decimals: parsedMint.decimals,
      supply: parsedMint.supply.toString(),
      mintAuthority: parsedMint.mintAuthority ? parsedMint.mintAuthority.toBase58() : null,
      freezeAuthority: parsedMint.freezeAuthority ? parsedMint.freezeAuthority.toBase58() : null,
      isInitialized: parsedMint.mintAuthority !== null,
    };

    // Update cache
    cachedMintInfo = {
      info: mintInfo,
      timestamp: now,
    };

    return mintInfo;
  } catch (error) {
    logger.error('Error fetching mint info', {
      error: error instanceof Error ? error.message : String(error),
      mint: tokenMint.toBase58(),
    });
    throw error;
  }
}

/**
 * Fetch total token supply
 */
export async function getTokenSupply(): Promise<string> {
  try {
    const mintInfo = await getMintInfo();
    return mintInfo.supply;
  } catch (error) {
    logger.error('Error fetching token supply', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Fetch all token holders (token accounts) for the mint (with caching)
 */
export async function getTokenHolders(): Promise<TokenHolder[]> {
  try {
    // Check cache first
    const now = Date.now();
    if (cachedTokenHolders && (now - cachedTokenHolders.timestamp) < TOKEN_HOLDERS_CACHE_TTL) {
      logger.debug('Using cached token holders', {
        count: cachedTokenHolders.holders.length,
        cachedAt: new Date(cachedTokenHolders.timestamp).toISOString(),
      });
      return cachedTokenHolders.holders;
    }

    logger.debug('Fetching token holders from RPC (cache miss or expired)', {
      mint: tokenMint.toBase58(),
    });

    // Token-2022 accounts can have variable sizes due to extensions
    // Remove dataSize filter to get all accounts, then filter by mint
    const tokenAccounts = await connection.getProgramAccounts(TOKEN_2022_PROGRAM_ID, {
      filters: [
        {
          memcmp: {
            offset: 0, // Mint address offset in token account (first 32 bytes)
            bytes: tokenMint.toBase58(),
          },
        },
      ],
    });

    logger.debug('Found token accounts for mint', {
      count: tokenAccounts.length,
      mint: tokenMint.toBase58(),
    });

    const holders: TokenHolder[] = [];
    const mintInfo = await getMintInfo();

    for (const { pubkey, account } of tokenAccounts) {
      try {
        // Parse token account using SPL Token library
        const parsedAccount = unpackAccount(pubkey, account as AccountInfo<Buffer>, TOKEN_2022_PROGRAM_ID);
        
        // Verify this account belongs to our mint
        if (!parsedAccount.mint.equals(tokenMint)) {
          continue;
        }

        // Only include accounts with balance > 0
        if (parsedAccount.amount > 0n) {
          holders.push({
            address: pubkey.toBase58(),
            owner: parsedAccount.owner.toBase58(),
            amount: parsedAccount.amount.toString(),
            decimals: mintInfo.decimals,
          });
        }
      } catch (parseError) {
        logger.warn('Error parsing token account', {
          address: pubkey.toBase58(),
          error: parseError instanceof Error ? parseError.message : String(parseError),
        });
        // Continue with next account
      }
    }

    // Sort by amount (descending)
    holders.sort((a, b) => {
      const amountA = BigInt(a.amount);
      const amountB = BigInt(b.amount);
      if (amountA > amountB) return -1;
      if (amountA < amountB) return 1;
      return 0;
    });

    logger.debug('Fetched token holders', {
      count: holders.length,
      mint: tokenMint.toBase58(),
      totalAccountsFound: tokenAccounts.length,
      accountsWithBalance: holders.length,
    });

    // Update cache
    cachedTokenHolders = {
      holders,
      timestamp: now,
    };

    return holders;
  } catch (error) {
    logger.error('Error fetching token holders', {
      error: error instanceof Error ? error.message : String(error),
      mint: tokenMint.toBase58(),
    });
    throw error;
  }
}

/**
 * Clear token holders cache (useful for testing or forced refresh)
 */
export function clearTokenHoldersCache(): void {
  cachedTokenHolders = null;
  logger.debug('Token holders cache cleared');
}

/**
 * Clear mint info cache (useful for testing or forced refresh)
 */
export function clearMintInfoCache(): void {
  cachedMintInfo = null;
  logger.debug('Mint info cache cleared');
}

