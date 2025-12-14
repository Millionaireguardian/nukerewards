import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { logger } from '../utils/logger';
import {
  getHistoricalRewardCycles,
  getHistoricalPayouts,
} from './rewardHistoryService';
import { getNUKEPriceUSD } from './priceService';

const EXPORTS_DIR = path.join(process.cwd(), 'exports');
const MAX_EXPORTS_TO_KEEP = 30; // Keep last 30 exports

interface ExportParams {
  startDate?: string;
  endDate?: string;
  pubkey?: string;
  status?: 'pending' | 'failed' | 'success';
}

interface ExportFile {
  filename: string;
  filepath: string;
  type: 'rewards' | 'payouts' | 'combined';
  timestamp: string;
  recordCount: number;
}

interface ExportManifest {
  latest: ExportFile | null;
  exports: ExportFile[];
  lastUpdated: string;
}

const MANIFEST_FILE = path.join(EXPORTS_DIR, 'manifest.json');

/**
 * Ensure exports directory exists
 */
function ensureExportsDir(): void {
  if (!fs.existsSync(EXPORTS_DIR)) {
    fs.mkdirSync(EXPORTS_DIR, { recursive: true });
    logger.info('Created exports directory', { path: EXPORTS_DIR });
  }
}

/**
 * Load export manifest
 */
function loadManifest(): ExportManifest {
  try {
    if (fs.existsSync(MANIFEST_FILE)) {
      const data = fs.readFileSync(MANIFEST_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    logger.warn('Failed to load export manifest, using defaults', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return {
    latest: null,
    exports: [],
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Save export manifest
 */
function saveManifest(manifest: ExportManifest): void {
  try {
    ensureExportsDir();
    fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2), 'utf-8');
  } catch (error) {
    logger.error('Failed to save export manifest', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Clean up old export files
 */
function cleanupOldExports(): void {
  try {
    const manifest = loadManifest();
    if (manifest.exports.length <= MAX_EXPORTS_TO_KEEP) {
      return;
    }

    // Sort by timestamp (oldest first)
    const sortedExports = [...manifest.exports].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Remove oldest files
    const toRemove = sortedExports.slice(0, sortedExports.length - MAX_EXPORTS_TO_KEEP);
    for (const exportFile of toRemove) {
      try {
        if (fs.existsSync(exportFile.filepath)) {
          fs.unlinkSync(exportFile.filepath);
          logger.debug('Removed old export file', { filename: exportFile.filename });
        }
      } catch (error) {
        logger.warn('Failed to remove old export file', {
          filename: exportFile.filename,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Update manifest
    manifest.exports = sortedExports.slice(-MAX_EXPORTS_TO_KEEP);
    manifest.latest = manifest.exports[manifest.exports.length - 1] || null;
    manifest.lastUpdated = new Date().toISOString();
    saveManifest(manifest);

    logger.info('Cleaned up old export files', {
      removed: toRemove.length,
      remaining: manifest.exports.length,
    });
  } catch (error) {
    logger.error('Error cleaning up old exports', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Generate Excel file for reward cycles
 */
export async function generateRewardsExcel(params?: ExportParams): Promise<string> {
  try {
    ensureExportsDir();

    const { cycles } = getHistoricalRewardCycles({ ...params, limit: 10000 });
    const tokenPrice = await getNUKEPriceUSD().catch(() => 0.01);

    const workbook = XLSX.utils.book_new();

    // Metadata sheet
    const metadataData = [
      ['Reward Cycles Export'],
      [''],
      ['Export Timestamp', new Date().toISOString()],
      ['Date Range', params?.startDate && params?.endDate 
        ? `${params.startDate} to ${params.endDate}`
        : params?.startDate 
        ? `From ${params.startDate}`
        : params?.endDate
        ? `Until ${params.endDate}`
        : 'All Time'],
      ['Total Cycles', cycles.length],
      ['Current Token Price (USD)', tokenPrice.toFixed(6)],
      [''],
      ['Summary Statistics'],
      ['Total SOL Distributed', cycles.reduce((sum, c) => sum + c.totalSOLDistributed, 0).toFixed(6)],
      ['Average Eligible Holders', cycles.length > 0 
        ? (cycles.reduce((sum, c) => sum + c.eligibleHoldersCount, 0) / cycles.length).toFixed(2)
        : '0'],
      ['Average Excluded Holders', cycles.length > 0
        ? (cycles.reduce((sum, c) => sum + c.excludedHoldersCount, 0) / cycles.length).toFixed(2)
        : '0'],
      ['Average Blacklisted Holders', cycles.length > 0
        ? (cycles.reduce((sum, c) => sum + c.blacklistedHoldersCount, 0) / cycles.length).toFixed(2)
        : '0'],
    ];

    const metadataWs = XLSX.utils.aoa_to_sheet(metadataData);
    XLSX.utils.book_append_sheet(workbook, metadataWs, 'Metadata');

    // Reward cycles sheet
    const cyclesData = cycles.map((cycle) => ({
      'Timestamp': cycle.timestamp,
      'Total SOL Distributed': parseFloat(cycle.totalSOLDistributed.toFixed(6)),
      'Eligible Holders': cycle.eligibleHoldersCount,
      'Excluded Holders': cycle.excludedHoldersCount,
      'Blacklisted Holders': cycle.blacklistedHoldersCount,
      'Total Holders': cycle.totalHoldersCount,
      'Token Price (USD)': parseFloat(cycle.tokenPriceUSD.toFixed(6)),
    }));

    if (cyclesData.length > 0) {
      const cyclesWs = XLSX.utils.json_to_sheet(cyclesData);
      XLSX.utils.book_append_sheet(workbook, cyclesWs, 'Reward Cycles');
    } else {
      // Empty sheet with headers
      const emptyWs = XLSX.utils.aoa_to_sheet([
        ['Timestamp', 'Total SOL Distributed', 'Eligible Holders', 'Excluded Holders', 'Blacklisted Holders', 'Total Holders', 'Token Price (USD)'],
      ]);
      XLSX.utils.book_append_sheet(workbook, emptyWs, 'Reward Cycles');
    }

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `rewards-export-${timestamp}.xlsx`;
    const filepath = path.join(EXPORTS_DIR, filename);

    XLSX.writeFile(workbook, filepath);

    // Update manifest
    const manifest = loadManifest();
    const exportFile: ExportFile = {
      filename,
      filepath,
      type: 'rewards',
      timestamp: new Date().toISOString(),
      recordCount: cycles.length,
    };

    manifest.exports.push(exportFile);
    manifest.latest = exportFile;
    manifest.lastUpdated = new Date().toISOString();
    saveManifest(manifest);

    logger.info('Rewards Excel file generated', {
      filename,
      recordCount: cycles.length,
    });

    cleanupOldExports();

    return filepath;
  } catch (error) {
    logger.error('Error generating rewards Excel file', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Generate Excel file for payouts
 */
export async function generatePayoutsExcel(params?: ExportParams): Promise<string> {
  try {
    ensureExportsDir();

    const { payouts } = getHistoricalPayouts({ ...params, limit: 10000 });

    const workbook = XLSX.utils.book_new();

    // Metadata sheet
    const pendingCount = payouts.filter((p) => p.status === 'pending').length;
    const failedCount = payouts.filter((p) => p.status === 'failed').length;
    const successCount = payouts.filter((p) => p.status === 'success').length;
    const totalSOL = payouts.reduce((sum, p) => sum + p.rewardSOL, 0);

    const metadataData = [
      ['Payouts Export'],
      [''],
      ['Export Timestamp', new Date().toISOString()],
      ['Date Range', params?.startDate && params?.endDate 
        ? `${params.startDate} to ${params.endDate}`
        : params?.startDate 
        ? `From ${params.startDate}`
        : params?.endDate
        ? `Until ${params.endDate}`
        : 'All Time'],
      ['Filters', params?.pubkey ? `Pubkey: ${params.pubkey}` : params?.status ? `Status: ${params.status}` : 'None'],
      ['Total Payouts', payouts.length],
      [''],
      ['Summary Statistics'],
      ['Successful Payouts', successCount],
      ['Pending Payouts', pendingCount],
      ['Failed Payouts', failedCount],
      ['Total SOL', totalSOL.toFixed(6)],
    ];

    const metadataWs = XLSX.utils.aoa_to_sheet(metadataData);
    XLSX.utils.book_append_sheet(workbook, metadataWs, 'Metadata');

    // Payouts sheet
    const payoutsData = payouts.map((payout) => ({
      'Timestamp': payout.timestamp,
      'Recipient Pubkey': payout.pubkey,
      'Reward SOL': parseFloat(payout.rewardSOL.toFixed(6)),
      'Status': payout.status,
      'Retry Count': payout.retryCount,
      'Queued At': payout.queuedAt,
      'Executed At': payout.executedAt || 'Never',
      'Transaction Signature': payout.transactionSignature || '',
    }));

    if (payoutsData.length > 0) {
      const payoutsWs = XLSX.utils.json_to_sheet(payoutsData);
      XLSX.utils.book_append_sheet(workbook, payoutsWs, 'Payouts');
    } else {
      // Empty sheet with headers
      const emptyWs = XLSX.utils.aoa_to_sheet([
        ['Timestamp', 'Recipient Pubkey', 'Reward SOL', 'Status', 'Retry Count', 'Queued At', 'Executed At', 'Transaction Signature'],
      ]);
      XLSX.utils.book_append_sheet(workbook, emptyWs, 'Payouts');
    }

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `payouts-export-${timestamp}.xlsx`;
    const filepath = path.join(EXPORTS_DIR, filename);

    XLSX.writeFile(workbook, filepath);

    // Update manifest
    const manifest = loadManifest();
    const exportFile: ExportFile = {
      filename,
      filepath,
      type: 'payouts',
      timestamp: new Date().toISOString(),
      recordCount: payouts.length,
    };

    manifest.exports.push(exportFile);
    manifest.latest = exportFile;
    manifest.lastUpdated = new Date().toISOString();
    saveManifest(manifest);

    logger.info('Payouts Excel file generated', {
      filename,
      recordCount: payouts.length,
    });

    cleanupOldExports();

    return filepath;
  } catch (error) {
    logger.error('Error generating payouts Excel file', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Generate combined Excel file (rewards + payouts)
 */
export async function generateCombinedExcel(params?: ExportParams): Promise<string> {
  try {
    ensureExportsDir();

    const { cycles } = getHistoricalRewardCycles({ ...params, limit: 10000 });
    const { payouts } = getHistoricalPayouts({ ...params, limit: 10000 });
    const tokenPrice = await getNUKEPriceUSD().catch(() => 0.01);

    const workbook = XLSX.utils.book_new();

    // Metadata sheet
    const totalSOL = cycles.reduce((sum, c) => sum + c.totalSOLDistributed, 0);
    const pendingCount = payouts.filter((p) => p.status === 'pending').length;
    const failedCount = payouts.filter((p) => p.status === 'failed').length;
    const successCount = payouts.filter((p) => p.status === 'success').length;

    const metadataData = [
      ['Combined Reward Cycles & Payouts Export'],
      [''],
      ['Export Timestamp', new Date().toISOString()],
      ['Date Range', params?.startDate && params?.endDate 
        ? `${params.startDate} to ${params.endDate}`
        : params?.startDate 
        ? `From ${params.startDate}`
        : params?.endDate
        ? `Until ${params.endDate}`
        : 'All Time'],
      ['Filters', params?.pubkey ? `Pubkey: ${params.pubkey}` : params?.status ? `Status: ${params.status}` : 'None'],
      [''],
      ['Reward Cycles Summary'],
      ['Total Cycles', cycles.length],
      ['Total SOL Distributed', totalSOL.toFixed(6)],
      ['Current Token Price (USD)', tokenPrice.toFixed(6)],
      [''],
      ['Payouts Summary'],
      ['Total Payouts', payouts.length],
      ['Successful', successCount],
      ['Pending', pendingCount],
      ['Failed', failedCount],
    ];

    const metadataWs = XLSX.utils.aoa_to_sheet(metadataData);
    XLSX.utils.book_append_sheet(workbook, metadataWs, 'Metadata');

    // Reward cycles sheet
    const cyclesData = cycles.map((cycle) => ({
      'Timestamp': cycle.timestamp,
      'Total SOL Distributed': parseFloat(cycle.totalSOLDistributed.toFixed(6)),
      'Eligible Holders': cycle.eligibleHoldersCount,
      'Excluded Holders': cycle.excludedHoldersCount,
      'Blacklisted Holders': cycle.blacklistedHoldersCount,
      'Total Holders': cycle.totalHoldersCount,
      'Token Price (USD)': parseFloat(cycle.tokenPriceUSD.toFixed(6)),
    }));

    if (cyclesData.length > 0) {
      const cyclesWs = XLSX.utils.json_to_sheet(cyclesData);
      XLSX.utils.book_append_sheet(workbook, cyclesWs, 'Reward Cycles');
    }

    // Payouts sheet
    const payoutsData = payouts.map((payout) => ({
      'Timestamp': payout.timestamp,
      'Recipient Pubkey': payout.pubkey,
      'Reward SOL': parseFloat(payout.rewardSOL.toFixed(6)),
      'Status': payout.status,
      'Retry Count': payout.retryCount,
      'Queued At': payout.queuedAt,
      'Executed At': payout.executedAt || 'Never',
      'Transaction Signature': payout.transactionSignature || '',
    }));

    if (payoutsData.length > 0) {
      const payoutsWs = XLSX.utils.json_to_sheet(payoutsData);
      XLSX.utils.book_append_sheet(workbook, payoutsWs, 'Payouts');
    }

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `combined-export-${timestamp}.xlsx`;
    const filepath = path.join(EXPORTS_DIR, filename);

    XLSX.writeFile(workbook, filepath);

    // Update manifest
    const manifest = loadManifest();
    const exportFile: ExportFile = {
      filename,
      filepath,
      type: 'combined',
      timestamp: new Date().toISOString(),
      recordCount: cycles.length + payouts.length,
    };

    manifest.exports.push(exportFile);
    manifest.latest = exportFile;
    manifest.lastUpdated = new Date().toISOString();
    saveManifest(manifest);

    logger.info('Combined Excel file generated', {
      filename,
      cyclesCount: cycles.length,
      payoutsCount: payouts.length,
    });

    cleanupOldExports();

    return filepath;
  } catch (error) {
    logger.error('Error generating combined Excel file', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Get latest export file
 */
export function getLatestExport(): ExportFile | null {
  try {
    const manifest = loadManifest();
    return manifest.latest;
  } catch (error) {
    logger.error('Error getting latest export', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Get export file buffer
 */
export function getExportFileBuffer(filepath: string): Buffer | null {
  try {
    if (!fs.existsSync(filepath)) {
      logger.warn('Export file not found', { filepath });
      return null;
    }
    return fs.readFileSync(filepath);
  } catch (error) {
    logger.error('Error reading export file', {
      filepath,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Get export summary for Telegram bot
 */
export async function getExportSummary(): Promise<{
  latestExport: ExportFile | null;
  summary: {
    totalCycles: number;
    totalPayouts: number;
    totalSOLDistributed: number;
    pendingPayouts: number;
    failedPayouts: number;
  };
}> {
  try {
    const latestExport = getLatestExport();
    const { cycles } = getHistoricalRewardCycles({ limit: 1 });
    const { payouts } = getHistoricalPayouts({ limit: 1000 });

    const totalSOL = cycles.reduce((sum, c) => sum + c.totalSOLDistributed, 0);
    const pendingPayouts = payouts.filter((p) => p.status === 'pending').length;
    const failedPayouts = payouts.filter((p) => p.status === 'failed').length;

    return {
      latestExport,
      summary: {
        totalCycles: cycles.length,
        totalPayouts: payouts.length,
        totalSOLDistributed: totalSOL,
        pendingPayouts,
        failedPayouts,
      },
    };
  } catch (error) {
    logger.error('Error getting export summary', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

