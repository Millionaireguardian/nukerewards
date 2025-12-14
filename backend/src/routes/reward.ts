import { Router, Request, Response } from 'express';
import { getSchedulerStatus } from '../scheduler/rewardScheduler';
import { getPendingHolders } from '../services/rewardService';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /reward/status
 * Get reward scheduler status
 */
router.get('/status', async (_req: Request, res: Response): Promise<void> => {
  try {
    const status = getSchedulerStatus();
    const pendingHolders = await getPendingHolders();
    
    res.status(200).json({
      lastRun: status.lastRun ? new Date(status.lastRun).toISOString() : null,
      nextRun: status.nextRun ? new Date(status.nextRun).toISOString() : null,
      pendingHolders: pendingHolders.length,
      isRunning: status.isRunning,
    });
  } catch (error) {
    logger.error('Error fetching reward status', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

