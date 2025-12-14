/**
 * TypeScript interfaces for backend API responses
 */

export interface RewardStatus {
  lastRun: string | null;
  nextRun: string | null;
  isRunning: boolean;
  statistics: {
    totalHolders: number;
    eligibleHolders: number;
    excludedHolders: number;
    blacklistedHolders: number;
    pendingPayouts: number;
    totalSOLDistributed: number;
  };
  tokenPrice: {
    usd: number;
  };
}

export interface ExportSummary {
  latestExport: {
    filename: string;
    filepath: string;
    type: 'rewards' | 'payouts' | 'combined';
    timestamp: string;
  } | null;
  summary: {
    totalCycles: number;
    totalPayouts: number;
    totalSOLDistributed: number;
    pendingPayouts: number;
    failedPayouts: number;
  };
}

export interface ExportFile {
  filename: string;
  filepath: string;
  downloadUrl: string;
}

