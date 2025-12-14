import { Connection, PublicKey } from '@solana/web3.js';
import { env } from './env';
import { logger } from '../utils/logger';

// Lazy initialization of Solana connection to allow server to start without Solana config
let connectionInstance: Connection | null = null;

function getConnection(): Connection {
  if (!connectionInstance) {
    const rpcUrl = (env.HELIUS_RPC_URL as string) || 'https://api.devnet.solana.com';
    if (!rpcUrl || (typeof rpcUrl === 'string' && !rpcUrl.startsWith('http'))) {
      logger.warn('Invalid or missing HELIUS_RPC_URL, using default devnet RPC');
      connectionInstance = new Connection('https://api.devnet.solana.com', 'confirmed');
    } else {
      connectionInstance = new Connection(rpcUrl, 'confirmed');
    }
  }
  return connectionInstance;
}

export const connection = getConnection();

// Lazy initialization of token mint to allow server to start without Solana config
let tokenMintInstance: PublicKey | null = null;

function getTokenMint(): PublicKey {
  if (!tokenMintInstance) {
    const mintAddress = (env.TOKEN_MINT as string) || '8LF2FBaX47nmaZ1sBqs4Kg88t6VDbgDzjK3MQM7uPZZx';
    if (!mintAddress || typeof mintAddress !== 'string') {
      logger.warn('TOKEN_MINT not set, using default');
      tokenMintInstance = new PublicKey('8LF2FBaX47nmaZ1sBqs4Kg88t6VDbgDzjK3MQM7uPZZx');
    } else {
      tokenMintInstance = new PublicKey(mintAddress);
    }
  }
  return tokenMintInstance;
}

export const tokenMint = getTokenMint();

/**
 * Verify connection on startup (non-blocking)
 */
export async function verifySolanaConnection(): Promise<void> {
  try {
    const conn = getConnection();
    const version = await conn.getVersion();
    const rpcUrl = (env.HELIUS_RPC_URL as string) || 'https://api.devnet.solana.com';
    logger.info('Solana connection verified', {
      network: (env.SOLANA_NETWORK as string) || 'devnet',
      rpcUrl: rpcUrl.replace(/api-key=[^&]+/, 'api-key=***'),
      version: version['solana-core'],
      tokenMint: getTokenMint().toBase58(),
    });
  } catch (error) {
    logger.warn('Failed to verify Solana connection (non-critical)', {
      error: error instanceof Error ? error.message : String(error),
    });
    // Don't throw - allow server to start even if Solana connection fails
  }
}
