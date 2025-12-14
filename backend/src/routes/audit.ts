import { Router, Request, Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import {
  getLatestExport,
  getExportFileBuffer,
  getExportSummary,
  generateCombinedExcel,
} from '../services/rewardExportService';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /audit/latest
 * Returns the latest export file for Telegram bot
 * Query params:
 *   - format: 'file' (default) or 'json' (summary only)
 */
router.get('/latest', async (req: Request, res: Response): Promise<void> => {
  try {
    const format = (req.query.format as string) || 'file';
    const latestExport = getLatestExport();

    if (!latestExport) {
      res.status(404).json({
        error: 'No export files available',
        message: 'No exports have been generated yet. Wait for the next reward cycle.',
      });
      return;
    }

    if (format === 'json') {
      // Return JSON summary only
      const summary = await getExportSummary();
      res.status(200).json({
        latestExport,
        summary: summary.summary,
        downloadUrl: `/audit/download/${latestExport.filename}`,
      });
      return;
    }

    // Return file buffer
    const fileBuffer = getExportFileBuffer(latestExport.filepath);

    if (!fileBuffer) {
      res.status(404).json({
        error: 'Export file not found',
        filename: latestExport.filename,
      });
      return;
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${latestExport.filename}"`);
    res.setHeader('Content-Length', fileBuffer.length.toString());

    logger.info('Serving latest export file', {
      filename: latestExport.filename,
      size: fileBuffer.length,
    });

    res.send(fileBuffer);
  } catch (error) {
    logger.error('Error serving latest export', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /audit/download/:filename
 * Download a specific export file by filename
 */
router.get('/download/:filename', (req: Request, res: Response): void => {
  try {
    const filename = req.params.filename;
    
    // Security: prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      res.status(400).json({ error: 'Invalid filename' });
      return;
    }

    const filepath = path.join(process.cwd(), 'exports', filename);

    if (!fs.existsSync(filepath)) {
      res.status(404).json({ error: 'File not found', filename });
      return;
    }

    const fileBuffer = fs.readFileSync(filepath);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', fileBuffer.length.toString());

    logger.info('Serving export file', {
      filename,
      size: fileBuffer.length,
    });

    res.send(fileBuffer);
  } catch (error) {
    logger.error('Error serving export file', {
      error: error instanceof Error ? error.message : String(error),
      filename: req.params.filename,
    });
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /audit/summary
 * Get export summary for Telegram bot notifications
 */
router.get('/summary', async (_req: Request, res: Response): Promise<void> => {
  try {
    const summary = await getExportSummary();
    res.status(200).json(summary);
  } catch (error) {
    logger.error('Error getting export summary', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /audit/generate
 * Manually trigger export generation (for testing or on-demand)
 */
router.post('/generate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, startDate, endDate, pubkey, status } = req.body;

    logger.info('Manual export generation requested', {
      type,
      startDate,
      endDate,
      pubkey,
      status,
    });

    let filepath: string;

    switch (type) {
      case 'combined':
        filepath = await generateCombinedExcel({ startDate, endDate, pubkey, status });
        break;
      case 'rewards':
        const { generateRewardsExcel } = await import('../services/rewardExportService');
        filepath = await generateRewardsExcel({ startDate, endDate });
        break;
      case 'payouts':
        const { generatePayoutsExcel } = await import('../services/rewardExportService');
        filepath = await generatePayoutsExcel({ startDate, endDate, pubkey, status });
        break;
      default:
        res.status(400).json({ error: 'Invalid type. Use: combined, rewards, or payouts' });
        return;
    }

    const filename = path.basename(filepath);

    res.status(200).json({
      success: true,
      filename,
      filepath,
      downloadUrl: `/audit/download/${filename}`,
    });
  } catch (error) {
    logger.error('Error generating export', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

