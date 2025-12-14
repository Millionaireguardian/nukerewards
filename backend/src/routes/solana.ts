import { Router, Request, Response } from 'express';
import { getMintInfo, getTokenSupply } from '../services/solanaService';
import { connection, tokenMint } from '../config/solana';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /solana/status
 * Get Solana connection and token status
 */
router.get('/status', async (_req: Request, res: Response): Promise<void> => {
  try {
    // Get connection status
    const version = await connection.getVersion();
    const slot = await connection.getSlot();
    const blockHeight = await connection.getBlockHeight();
    
    // Get token info
    const mintInfo = await getMintInfo();
    const tokenSupply = await getTokenSupply();
    
    res.status(200).json({
      status: 'ok',
      connection: {
        network: 'devnet',
        version: version['solana-core'],
        slot: slot,
        blockHeight: blockHeight,
      },
      token: {
        mint: tokenMint.toBase58(),
        decimals: mintInfo.decimals,
        supply: tokenSupply,
        mintAuthority: mintInfo.mintAuthority,
        freezeAuthority: mintInfo.freezeAuthority,
        isInitialized: mintInfo.isInitialized,
      },
    });
  } catch (error) {
    logger.error('Error fetching Solana status', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

