import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';
import { loadConfig } from '../config/env';
import type { RewardStatus, ExportSummary, ExportFile } from '../types/api';

const config = loadConfig();

class BackendClient {
  private client: AxiosInstance;
  private retryAttempts: number;
  private retryDelay: number;

  constructor() {
    this.client = axios.create({
      baseURL: config.BACKEND_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.retryAttempts = config.RETRY_ATTEMPTS;
    this.retryDelay = config.RETRY_DELAY_MS;

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('Backend API request', {
          method: config.method?.toUpperCase(),
          url: config.url,
        });
        return config;
      },
      (error) => {
        logger.error('Backend API request error', {
          error: error.message,
        });
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        logger.error('Backend API response error', {
          status: error.response?.status,
          message: error.message,
          url: error.config?.url,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Retry wrapper for API calls
   */
  private async retry<T>(
    fn: () => Promise<T>,
    attempt = 1
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (attempt < this.retryAttempts) {
        logger.warn(`Retrying API call (attempt ${attempt + 1}/${this.retryAttempts})`, {
          error: error instanceof Error ? error.message : String(error),
        });
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay * attempt));
        return this.retry(fn, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Get reward status from backend
   * Placeholder - implement actual API call
   */
  async getRewardStatus(): Promise<RewardStatus> {
    return this.retry(async () => {
      // TODO: Implement actual API call to GET /dashboard/rewards
      logger.info('Fetching reward status from backend');
      const response = await this.client.get<RewardStatus>('/dashboard/rewards');
      return response.data;
    });
  }

  /**
   * Get export summary from backend
   * Placeholder - implement actual API call
   */
  async getExportSummary(): Promise<ExportSummary> {
    return this.retry(async () => {
      // TODO: Implement actual API call to GET /audit/summary
      logger.info('Fetching export summary from backend');
      const response = await this.client.get<ExportSummary>('/audit/summary');
      return response.data;
    });
  }

  /**
   * Download latest export file from backend
   * Placeholder - implement actual API call
   */
  async downloadLatestExport(): Promise<Buffer | null> {
    try {
      // TODO: Implement actual API call to GET /audit/latest
      logger.info('Downloading latest export from backend');
      const response = await this.client.get('/audit/latest', {
        responseType: 'arraybuffer',
      });
      return Buffer.from(response.data);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        logger.warn('No export file available yet');
        return null;
      }
      throw error;
    }
  }

  /**
   * Generate export file on backend
   * Placeholder - implement actual API call
   */
  async generateExport(params?: {
    type?: 'combined' | 'rewards' | 'payouts';
    startDate?: string;
    endDate?: string;
  }): Promise<ExportFile> {
    return this.retry(async () => {
      // TODO: Implement actual API call to POST /audit/generate
      logger.info('Generating export on backend', { params });
      const response = await this.client.post<ExportFile>('/audit/generate', params);
      return response.data;
    });
  }
}

export const backendClient = new BackendClient();
