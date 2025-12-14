import { Router, Request, Response } from 'express';
import * as path from 'path';
import {
  getHistoricalRewardCycles,
  getHistoricalPayouts,
  getRewardCyclesExport,
  getPayoutsExport,
} from '../services/rewardHistoryService';
import {
  generateRewardsExcel,
  generatePayoutsExcel,
  getExportFileBuffer,
} from '../services/rewardExportService';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /dashboard/historical/rewards
 * Get historical reward cycles with filters and pagination
 */
router.get('/rewards', async (req: Request, res: Response): Promise<void> => {
  try {
    const startTime = Date.now();
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    logger.info('Dashboard API: GET /dashboard/historical/rewards', {
      startDate,
      endDate,
      limit,
      offset,
      timestamp: new Date().toISOString(),
    });

    const { cycles, total } = getHistoricalRewardCycles({
      startDate,
      endDate,
      limit: Math.min(limit, 1000), // Max 1000 per page
      offset: Math.max(offset, 0),
    });

    const response = {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
      cycles: cycles.map((cycle) => ({
        id: cycle.id,
        timestamp: cycle.timestamp,
        totalSOLDistributed: parseFloat(cycle.totalSOLDistributed.toFixed(6)),
        eligibleHoldersCount: cycle.eligibleHoldersCount,
        excludedHoldersCount: cycle.excludedHoldersCount,
        blacklistedHoldersCount: cycle.blacklistedHoldersCount,
        totalHoldersCount: cycle.totalHoldersCount,
        tokenPriceUSD: parseFloat(cycle.tokenPriceUSD.toFixed(6)),
        rewardDetails: cycle.rewardDetails || [],
      })),
    };

    const duration = Date.now() - startTime;
    logger.info('Dashboard API: GET /dashboard/historical/rewards completed', {
      duration: `${duration}ms`,
      total,
      returned: cycles.length,
    });

    res.status(200).json(response);
  } catch (error) {
    logger.error('Error fetching historical rewards', {
      error: error instanceof Error ? error.message : String(error),
      query: req.query,
    });
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      cycles: [],
      total: 0,
    });
  }
});

/**
 * GET /dashboard/historical/payouts
 * Get historical payout records with filters and pagination
 */
router.get('/payouts', async (req: Request, res: Response): Promise<void> => {
  try {
    const startTime = Date.now();
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const pubkey = req.query.pubkey as string | undefined;
    const status = req.query.status as 'pending' | 'failed' | 'success' | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    logger.info('Dashboard API: GET /dashboard/historical/payouts', {
      startDate,
      endDate,
      pubkey,
      status,
      limit,
      offset,
      timestamp: new Date().toISOString(),
    });

    const { payouts, total } = getHistoricalPayouts({
      startDate,
      endDate,
      pubkey,
      status,
      limit: Math.min(limit, 1000), // Max 1000 per page
      offset: Math.max(offset, 0),
    });

    const response = {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
      payouts: payouts.map((payout) => ({
        id: payout.id,
        timestamp: payout.timestamp,
        pubkey: payout.pubkey,
        rewardSOL: parseFloat(payout.rewardSOL.toFixed(6)),
        status: payout.status,
        retryCount: payout.retryCount,
        queuedAt: payout.queuedAt,
        executedAt: payout.executedAt || null,
        transactionSignature: payout.transactionSignature || null,
      })),
    };

    const duration = Date.now() - startTime;
    logger.info('Dashboard API: GET /dashboard/historical/payouts completed', {
      duration: `${duration}ms`,
      total,
      returned: payouts.length,
    });

    res.status(200).json(response);
  } catch (error) {
    logger.error('Error fetching historical payouts', {
      error: error instanceof Error ? error.message : String(error),
      query: req.query,
    });
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      payouts: [],
      total: 0,
    });
  }
});

/**
 * GET /dashboard/export/rewards
 * Get export-ready reward cycles data (CSV/Excel format)
 * Query params:
 *   - format: 'json' (default) or 'excel' (file download)
 *   - startDate, endDate: date filters
 */
router.get('/export/rewards', async (req: Request, res: Response): Promise<void> => {
  try {
    const startTime = Date.now();
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const format = (req.query.format as string) || 'json';

    logger.info('Dashboard API: GET /dashboard/export/rewards', {
      startDate,
      endDate,
      format,
      timestamp: new Date().toISOString(),
    });

    if (format === 'excel') {
      // Generate and return Excel file
      const filepath = await generateRewardsExcel({ startDate, endDate });
      const filename = path.basename(filepath);
      const fileBuffer = getExportFileBuffer(filepath);

      if (!fileBuffer) {
        res.status(500).json({ error: 'Failed to generate export file' });
        return;
      }

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', fileBuffer.length.toString());

      const duration = Date.now() - startTime;
      logger.info('Dashboard API: GET /dashboard/export/rewards (Excel) completed', {
        duration: `${duration}ms`,
        filename,
      });

      res.send(fileBuffer);
      return;
    }

    // JSON format (default)
    const exportData = getRewardCyclesExport({ startDate, endDate });

    const response = {
      format: 'csv',
      count: exportData.length,
      data: exportData,
      metadata: {
        exportedAt: new Date().toISOString(),
        dateRange: {
          start: startDate || 'all',
          end: endDate || 'all',
        },
      },
    };

    const duration = Date.now() - startTime;
    logger.info('Dashboard API: GET /dashboard/export/rewards completed', {
      duration: `${duration}ms`,
      count: exportData.length,
    });

    res.status(200).json(response);
  } catch (error) {
    logger.error('Error exporting reward cycles', {
      error: error instanceof Error ? error.message : String(error),
      query: req.query,
    });
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      data: [],
    });
  }
});

/**
 * GET /dashboard/export/payouts
 * Get export-ready payout data (CSV/Excel format)
 * Query params:
 *   - format: 'json' (default) or 'excel' (file download)
 *   - startDate, endDate, pubkey, status: filters
 */
router.get('/export/payouts', async (req: Request, res: Response): Promise<void> => {
  try {
    const startTime = Date.now();
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const pubkey = req.query.pubkey as string | undefined;
    const status = req.query.status as 'pending' | 'failed' | 'success' | undefined;
    const format = (req.query.format as string) || 'json';

    logger.info('Dashboard API: GET /dashboard/export/payouts', {
      startDate,
      endDate,
      pubkey,
      status,
      format,
      timestamp: new Date().toISOString(),
    });

    if (format === 'excel') {
      // Generate and return Excel file
      const filepath = await generatePayoutsExcel({ startDate, endDate, pubkey, status });
      const filename = path.basename(filepath);
      const fileBuffer = getExportFileBuffer(filepath);

      if (!fileBuffer) {
        res.status(500).json({ error: 'Failed to generate export file' });
        return;
      }

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', fileBuffer.length.toString());

      const duration = Date.now() - startTime;
      logger.info('Dashboard API: GET /dashboard/export/payouts (Excel) completed', {
        duration: `${duration}ms`,
        filename,
      });

      res.send(fileBuffer);
      return;
    }

    // JSON format (default)
    const exportData = getPayoutsExport({ startDate, endDate, pubkey, status });

    const response = {
      format: 'csv',
      count: exportData.length,
      data: exportData,
      metadata: {
        exportedAt: new Date().toISOString(),
        dateRange: {
          start: startDate || 'all',
          end: endDate || 'all',
        },
        filters: {
          pubkey: pubkey || 'all',
          status: status || 'all',
        },
      },
    };

    const duration = Date.now() - startTime;
    logger.info('Dashboard API: GET /dashboard/export/payouts completed', {
      duration: `${duration}ms`,
      count: exportData.length,
    });

    res.status(200).json(response);
  } catch (error) {
    logger.error('Error exporting payouts', {
      error: error instanceof Error ? error.message : String(error),
      query: req.query,
    });
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      data: [],
    });
  }
});

export default router;

