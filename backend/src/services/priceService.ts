import { logger } from '../utils/logger';
import { getRaydiumData } from './raydiumService';

/**
 * Price Service - Devnet Only
 * 
 * Fetches NUKE token price in SOL from Raydium devnet pool only.
 * No USD conversions, no Jupiter, no fallbacks.
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
 * Get NUKE token price in SOL from Raydium devnet pool
 * 
 * Returns: { price: number, source: "raydium" }
 * - price: WSOL per NUKE (from Raydium devnet pool)
 * - source: Always "raydium" for devnet
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

    // Fetch from Raydium devnet pool
    const raydiumData = await getRaydiumData();
    
    let price: number | null = null;
    let source: 'raydium' | null = null;

    if (raydiumData && raydiumData.source === 'raydium' && raydiumData.price !== null) {
      price = raydiumData.price; // This is already WSOL per NUKE
      source = 'raydium';
      
      logger.info('NUKE token price fetched from Raydium (SOL)', {
        priceSOL: price,
        source: 'raydium',
        description: `${price} WSOL per NUKE`,
      });
    } else {
      logger.warn('Raydium price unavailable', {
        raydiumSource: raydiumData?.source || 'null',
        raydiumPrice: raydiumData?.price || 'null',
      });
      source = null;
    }

    // Update cache
    cachedPrice = {
      price,
      source,
      timestamp: now,
    };

    return {
      price,
      source,
    };
  } catch (error) {
    logger.error('Error fetching NUKE price from Raydium', {
      error: error instanceof Error ? error.message : String(error),
    });
    
    // Return null on error (no fallback)
    cachedPrice = {
      price: null,
      source: null,
      timestamp: Date.now(),
    };
    
    return {
      price: null,
      source: null,
    };
  }
}

/**
 * Get NUKE token price in USD (legacy function for compatibility)
 * Returns null for devnet as we only use SOL prices
 */
export async function getNUKEPriceUSD(): Promise<number> {
  logger.debug('getNUKEPriceUSD called - returning null for devnet (SOL-only pricing)');
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
