/**
 * Telegram Bot for Solana Reward System Dashboard
 * 
 * Features:
 * - Commands: /rewards, /payouts, /holders, /export, /help
 * - Auto-notifications for new rewards/payouts
 * - Excel export functionality
 * - Error handling with retries
 * - Real-time data from backend API
 */

import TelegramBot from 'node-telegram-bot-api';
import axios, { AxiosError } from 'axios';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as crypto from 'crypto';
import { logNotification } from './utils/notificationLogger';
import { getLastState, updateState } from './state/notificationState';

// Load environment variables
dotenv.config();

// ============================================================================
// Configuration & Types
// ============================================================================

interface BotConfig {
  token: string;
  backendUrl: string;
  notificationChatId?: string;
  pollingInterval: number;
  retryAttempts: number;
  retryDelay: number;
}

interface RewardsResponse {
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

interface PayoutsResponse {
  total: number;
  payouts: Array<{
    pubkey: string;
    rewardSOL: number;
    queuedAt: string;
    retryCount: number;
    status: 'pending' | 'failed';
  }>;
  summary: {
    pending: number;
    failed: number;
    totalSOL: number;
  };
}

/**
 * Compute a deterministic reward run ID using SHA256 hash of stable backend fields
 * 
 * Uses:
 * - lastRun timestamp (raw ISO string)
 * - total SOL distributed
 * - eligible holder count
 * - pending payout count
 * 
 * Ignores:
 * - nextRun (volatile, changes on every poll)
 * - Formatted dates (volatile)
 * 
 * @param rewards - Rewards response from backend
 * @param payouts - Payouts response from backend (for pending count)
 * @returns SHA256 hash as hex string (deterministic reward run ID)
 */
function computeRewardRunId(rewards: RewardsResponse, payouts: PayoutsResponse): string {
  // Extract stable fields with explicit normalization to prevent floating point issues
  const lastRun = rewards.lastRun || '';
  // Normalize numbers to fixed precision to prevent floating point inconsistencies
  const totalSOLDistributed = rewards.statistics?.totalSOLDistributed || 0;
  const totalSOLDistributedNormalized = typeof totalSOLDistributed === 'number' 
    ? parseFloat(totalSOLDistributed.toFixed(6)) 
    : 0;
  const eligibleHolders = rewards.statistics?.eligibleHolders || 0;
  const eligibleHoldersNormalized = typeof eligibleHolders === 'number' ? Math.floor(eligibleHolders) : 0;
  const pendingPayouts = payouts.summary?.pending || 0;
  const pendingPayoutsNormalized = typeof pendingPayouts === 'number' ? Math.floor(pendingPayouts) : 0;

  // Create a deterministic string from stable fields with explicit ordering
  // Use sorted keys to ensure consistent JSON stringification
  const stableData = JSON.stringify({
    lastRun: String(lastRun), // Ensure string type
    totalSOLDistributed: totalSOLDistributedNormalized,
    eligibleHolders: eligibleHoldersNormalized,
    pendingPayouts: pendingPayoutsNormalized,
  }, Object.keys({ lastRun: '', totalSOLDistributed: 0, eligibleHolders: 0, pendingPayouts: 0 }).sort());

  // Compute SHA256 hash
  const hash = crypto.createHash('sha256');
  hash.update(stableData);
  return hash.digest('hex');
}

/**
 * Generate a unique payout ID from payout data
 */
function generatePayoutId(payouts: PayoutsResponse['payouts']): string {
  // Create a hash-like ID from payout count and first payout timestamp
  if (payouts.length === 0) {
    return 'empty';
  }
  // Use total count and first payout's queuedAt timestamp as unique identifier
  const firstPayout = payouts[0];
  return `${payouts.length}-${firstPayout.queuedAt}`;
}

interface HoldersResponse {
  total: number;
  holders: Array<{
    pubkey: string;
    balance: string;
    usdValue: number;
    eligibilityStatus: 'eligible' | 'excluded' | 'blacklisted';
    lastReward: string | null;
    retryCount: number;
  }>;
}

interface LastCheckState {
  lastRewardsCheck: number;
  lastPayoutsCheck: number;
  lastRewardsRun: string | null;
  lastPayoutsCount: number;
}

// ============================================================================
// Configuration Loading
// ============================================================================

function loadConfig(): BotConfig {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN environment variable is required');
  }

  return {
    token,
    backendUrl: process.env.BACKEND_URL || 'http://localhost:3000',
    notificationChatId: process.env.TELEGRAM_CHAT_ID,
    pollingInterval: parseInt(process.env.POLLING_INTERVAL_MS || '60000', 10), // Default 60 seconds
    retryAttempts: parseInt(process.env.RETRY_ATTEMPTS || '3', 10),
    retryDelay: parseInt(process.env.RETRY_DELAY_MS || '1000', 10),
  };
}

// ============================================================================
// API Client with Retry Logic
// ============================================================================

class BackendAPIClient {
  private baseURL: string;
  private retryAttempts: number;
  private retryDelay: number;

  constructor(baseURL: string, retryAttempts: number, retryDelay: number) {
    this.baseURL = baseURL;
    this.retryAttempts = retryAttempts;
    this.retryDelay = retryDelay;
  }

  /**
   * Retry wrapper for API calls
   */
  private async retryRequest<T>(
    fn: () => Promise<T>,
    context: string
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`[API] ${context} - Attempt ${attempt}/${this.retryAttempts} failed:`, lastError.message);

        if (attempt < this.retryAttempts) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`${context} failed after ${this.retryAttempts} attempts: ${lastError?.message}`);
  }

  /**
   * Fetch rewards data
   */
  async getRewards(): Promise<RewardsResponse> {
    return this.retryRequest(async () => {
      const response = await axios.get<RewardsResponse>(`${this.baseURL}/dashboard/rewards`, {
        timeout: 30000,
      });
      return response.data;
    }, 'getRewards');
  }

  /**
   * Fetch payouts data
   */
  async getPayouts(): Promise<PayoutsResponse> {
    return this.retryRequest(async () => {
      const response = await axios.get<PayoutsResponse>(`${this.baseURL}/dashboard/payouts`, {
        timeout: 30000,
      });
      return response.data;
    }, 'getPayouts');
  }

  /**
   * Fetch holders data
   */
  async getHolders(limit: number = 100): Promise<HoldersResponse> {
    return this.retryRequest(async () => {
      const response = await axios.get<HoldersResponse>(`${this.baseURL}/dashboard/holders`, {
        params: { limit },
        timeout: 30000,
      });
      return response.data;
    }, 'getHolders');
  }

  /**
   * Download latest export file
   */
  async getLatestExport(): Promise<Buffer> {
    return this.retryRequest(async () => {
      const response = await axios.get(`${this.baseURL}/audit/latest`, {
        responseType: 'arraybuffer',
        timeout: 60000,
      });
      return Buffer.from(response.data);
    }, 'getLatestExport');
  }
}

// ============================================================================
// Excel Export Generator
// ============================================================================

class ExcelExporter {
  /**
   * Generate Excel file from dashboard data
   */
  async generateExcel(
    rewards: RewardsResponse,
    payouts: PayoutsResponse,
    holders: HoldersResponse
  ): Promise<Buffer> {
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Summary
    const summaryData = [
      ['Reward System Summary'],
      [''],
      ['Last Run', rewards.lastRun || 'Never'],
      ['Next Run', rewards.nextRun || 'N/A'],
      ['Is Running', rewards.isRunning ? 'Yes' : 'No'],
      [''],
      ['Statistics'],
      ['Total Holders', rewards.statistics.totalHolders],
      ['Eligible Holders', rewards.statistics.eligibleHolders],
      ['Excluded Holders', rewards.statistics.excludedHolders],
      ['Blacklisted Holders', rewards.statistics.blacklistedHolders],
      ['Pending Payouts', rewards.statistics.pendingPayouts],
      ['Total SOL Distributed', rewards.statistics.totalSOLDistributed.toFixed(6)],
      ['Token Price (USD)', rewards.tokenPrice.usd.toFixed(4)],
      [''],
      ['Payouts Summary'],
      ['Total Payouts', payouts.total],
      ['Pending', payouts.summary.pending],
      ['Failed', payouts.summary.failed],
      ['Total SOL in Payouts', payouts.summary.totalSOL.toFixed(6)],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Sheet 2: Payouts
    if (payouts.payouts.length > 0) {
      const payoutsData = [
        ['Pubkey', 'Reward SOL', 'Queued At', 'Retry Count', 'Status'],
        ...payouts.payouts.map(p => [
          p.pubkey,
          p.rewardSOL.toFixed(6),
          new Date(p.queuedAt).toLocaleString(),
          p.retryCount,
          p.status,
        ]),
      ];
      const payoutsSheet = XLSX.utils.aoa_to_sheet(payoutsData);
      XLSX.utils.book_append_sheet(workbook, payoutsSheet, 'Payouts');
    }

    // Sheet 3: Top Holders (top 100)
    if (holders.holders.length > 0) {
      const topHolders = holders.holders.slice(0, 100);
      const holdersData = [
        ['Pubkey', 'Balance', 'USD Value', 'Eligibility Status', 'Last Reward', 'Retry Count'],
        ...topHolders.map(h => [
          h.pubkey,
          h.balance,
          h.usdValue.toFixed(2),
          h.eligibilityStatus,
          h.lastReward ? new Date(h.lastReward).toLocaleString() : 'Never',
          h.retryCount,
        ]),
      ];
      const holdersSheet = XLSX.utils.aoa_to_sheet(holdersData);
      XLSX.utils.book_append_sheet(workbook, holdersSheet, 'Top Holders');
    }

    // Generate buffer
    return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
  }
}

// ============================================================================
// Message Formatters
// ============================================================================

class MessageFormatter {
  /**
   * Format rewards data as Telegram message
   */
  formatRewards(rewards: RewardsResponse): string {
    const stats = rewards.statistics;
    const lastRun = rewards.lastRun
      ? new Date(rewards.lastRun).toLocaleString()
      : 'Never';
    const nextRun = rewards.nextRun
      ? new Date(rewards.nextRun).toLocaleString()
      : 'N/A';

    return `
📊 *Reward System Status*

*Last Run:* ${lastRun}
*Next Run:* ${nextRun}
*Status:* ${rewards.isRunning ? '🟢 Running' : '⚪ Idle'}

*Statistics:*
• Total Holders: ${stats.totalHolders}
• Eligible: ${stats.eligibleHolders}
• Excluded: ${stats.excludedHolders}
• Blacklisted: ${stats.blacklistedHolders}
• Pending Payouts: ${stats.pendingPayouts}
• Total SOL Distributed: ${stats.totalSOLDistributed.toFixed(6)} SOL

*Token Price:* $${rewards.tokenPrice.usd.toFixed(4)}
    `.trim();
  }

  /**
   * Format payouts data as Telegram message
   */
  formatPayouts(payouts: PayoutsResponse): string {
    const summary = payouts.summary;
    const topPayouts = payouts.payouts.slice(0, 10);

    let message = `
💰 *Payouts Status*

*Summary:*
• Total: ${payouts.total}
• Pending: ${summary.pending}
• Failed: ${summary.failed}
• Total SOL: ${summary.totalSOL.toFixed(6)} SOL

*Top 10 Payouts:*
    `.trim();

    if (topPayouts.length === 0) {
      message += '\n\n_No payouts available._';
    } else {
      topPayouts.forEach((p, index) => {
        const pubkey = p.pubkey.substring(0, 8) + '...' + p.pubkey.substring(p.pubkey.length - 8);
        message += `\n${index + 1}. ${pubkey}\n   ${p.rewardSOL.toFixed(6)} SOL | ${p.status} | Retries: ${p.retryCount}`;
      });
    }

    return message;
  }

  /**
   * Format holders data as Telegram message
   */
  formatHolders(holders: HoldersResponse): string {
    const topHolders = holders.holders.slice(0, 10);
    const eligible = holders.holders.filter(h => h.eligibilityStatus === 'eligible').length;
    const excluded = holders.holders.filter(h => h.eligibilityStatus === 'excluded').length;
    const blacklisted = holders.holders.filter(h => h.eligibilityStatus === 'blacklisted').length;

    let message = `
👥 *Token Holders*

*Summary:*
• Total: ${holders.total}
• Eligible: ${eligible}
• Excluded: ${excluded}
• Blacklisted: ${blacklisted}

*Top 10 Holders by USD Value:*
    `.trim();

    if (topHolders.length === 0) {
      message += '\n\n_No holders available._';
    } else {
      topHolders.forEach((h, index) => {
        const pubkey = h.pubkey.substring(0, 8) + '...' + h.pubkey.substring(h.pubkey.length - 8);
        const status = h.eligibilityStatus === 'eligible' ? '✅' : h.eligibilityStatus === 'excluded' ? '⚠️' : '🚫';
        message += `\n${index + 1}. ${status} ${pubkey}\n   $${h.usdValue.toFixed(2)} | ${h.eligibilityStatus}`;
      });
    }

    return message;
  }
}

// ============================================================================
// Telegram Bot Class
// ============================================================================

class RewardSystemBot {
  private bot: TelegramBot;
  private apiClient: BackendAPIClient;
  private excelExporter: ExcelExporter;
  private formatter: MessageFormatter;
  private config: BotConfig;
  private lastCheck: LastCheckState;
  private pollingInterval: NodeJS.Timeout | null = null;

  constructor(config: BotConfig) {
    this.config = config;
    this.bot = new TelegramBot(config.token, { polling: true });
    this.apiClient = new BackendAPIClient(
      config.backendUrl,
      config.retryAttempts,
      config.retryDelay
    );
    this.excelExporter = new ExcelExporter();
    this.formatter = new MessageFormatter();
    this.lastCheck = {
      lastRewardsCheck: Date.now(),
      lastPayoutsCheck: Date.now(),
      lastRewardsRun: null,
      lastPayoutsCount: 0,
    };

    this.setupCommands();
    this.setupErrorHandling();
  }

  /**
   * Setup bot commands
   */
  private setupCommands(): void {
    // /start and /help
    this.bot.onText(/\/start|\/help/, async (msg) => {
      const chatId = msg.chat.id;
      const helpText = `
🤖 *Reward System Bot*

*Available Commands:*

/rewards - Get latest reward system status
/payouts - Get pending payouts information
/holders - Get top token holders
/export - Download dashboard data as Excel file

*Auto Notifications:*
The bot automatically sends notifications when new rewards or payouts are detected.
      `.trim();

      await this.bot.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
    });

    // /rewards command
    this.bot.onText(/\/rewards/, async (msg) => {
      const chatId = msg.chat.id;
      try {
        await this.bot.sendMessage(chatId, '⏳ Fetching rewards data...');
        const rewards = await this.apiClient.getRewards();
        const message = this.formatter.formatRewards(rewards);
        await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      } catch (error) {
        await this.handleError(chatId, error, 'fetching rewards');
      }
    });

    // /payouts command
    this.bot.onText(/\/payouts/, async (msg) => {
      const chatId = msg.chat.id;
      try {
        await this.bot.sendMessage(chatId, '⏳ Fetching payouts data...');
        const payouts = await this.apiClient.getPayouts();
        const message = this.formatter.formatPayouts(payouts);
        await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      } catch (error) {
        await this.handleError(chatId, error, 'fetching payouts');
      }
    });

    // /holders command
    this.bot.onText(/\/holders/, async (msg) => {
      const chatId = msg.chat.id;
      try {
        await this.bot.sendMessage(chatId, '⏳ Fetching holders data...');
        const holders = await this.apiClient.getHolders(100);
        const message = this.formatter.formatHolders(holders);
        await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      } catch (error) {
        await this.handleError(chatId, error, 'fetching holders');
      }
    });

    // /export command
    this.bot.onText(/\/export/, async (msg) => {
      const chatId = msg.chat.id;
      try {
        await this.bot.sendMessage(chatId, '⏳ Generating Excel export...');
        
        // Fetch all data
        const [rewards, payouts, holders] = await Promise.all([
          this.apiClient.getRewards(),
          this.apiClient.getPayouts(),
          this.apiClient.getHolders(1000),
        ]);

        // Generate Excel
        const excelBuffer = await this.excelExporter.generateExcel(rewards, payouts, holders);

        // Save to temp file
        const tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        const filename = `reward-dashboard-${Date.now()}.xlsx`;
        const filepath = path.join(tempDir, filename);
        fs.writeFileSync(filepath, excelBuffer);

        // Send file
        await this.bot.sendDocument(chatId, filepath, {
          caption: `📊 Dashboard Export\nGenerated: ${new Date().toLocaleString()}`,
        });

        // Cleanup
        fs.unlinkSync(filepath);
      } catch (error) {
        await this.handleError(chatId, error, 'generating export');
      }
    });
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    this.bot.on('polling_error', (error) => {
      console.error('[Bot] Polling error:', error);
    });

    this.bot.on('error', (error) => {
      console.error('[Bot] Error:', error);
    });
  }

  /**
   * Handle errors and send user-friendly messages
   */
  private async handleError(chatId: number, error: unknown, context: string): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Bot] Error ${context}:`, errorMessage);

    let userMessage = `❌ Error ${context}. `;
    
    if (error instanceof AxiosError) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        userMessage += 'Backend server is not reachable. Please check if the server is running.';
      } else if (error.response) {
        userMessage += `Server returned error: ${error.response.status} ${error.response.statusText}`;
      } else {
        userMessage += 'Network error occurred. Please try again later.';
      }
    } else {
      userMessage += `Error: ${errorMessage}`;
    }

    try {
      await this.bot.sendMessage(chatId, userMessage);
    } catch (sendError) {
      console.error('[Bot] Failed to send error message:', sendError);
    }
  }

  /**
   * Check for new rewards and send notifications
   */
  private async checkForNewRewards(): Promise<void> {
    if (!this.config.notificationChatId) {
      return; // No notification chat configured
    }

    try {
      // Fetch both rewards and payouts to compute deterministic reward run ID
      const [rewards, payouts] = await Promise.all([
        this.apiClient.getRewards(),
        this.apiClient.getPayouts(),
      ]);

      // Compute deterministic reward run ID from stable backend fields
      const currentRewardRunId = computeRewardRunId(rewards, payouts);

      // Get persisted state to check for duplicates
      const state = getLastState();
      const lastNotifiedRewardRunId = state.lastRewardRunId;

      // Debug: Log reward run ID for every poll
      console.log(`[Bot] Reward run ID: ${currentRewardRunId.substring(0, 16)}... (last: ${lastNotifiedRewardRunId ? lastNotifiedRewardRunId.substring(0, 16) + '...' : 'none'})`);

      // Check if there's a new reward run (compare deterministic IDs)
      if (currentRewardRunId !== lastNotifiedRewardRunId) {
        // CRITICAL: Update state FIRST to prevent race conditions with multiple instances
        // This ensures that even if multiple instances are running, only the first one will send
        updateState({ lastRewardRunId: currentRewardRunId });
        
        // Small delay to ensure file write completes
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Double-check state after update to ensure we're still the first
        const stateAfterUpdate = getLastState();
        if (stateAfterUpdate.lastRewardRunId !== currentRewardRunId) {
          // Another instance already updated the state - skip sending
          console.log(`[Bot] ⚠️  Race condition detected: Another instance already processed this reward run. Skipping notification.`);
          console.log(`[Bot] Expected: ${currentRewardRunId.substring(0, 16)}..., Got: ${stateAfterUpdate.lastRewardRunId ? stateAfterUpdate.lastRewardRunId.substring(0, 16) + '...' : 'none'}`);
          return;
        }
        
        // New reward run detected - send notification
        const message = `🆕 *New Reward Run Detected!*\n\n${this.formatter.formatRewards(rewards)}`;
        await this.bot.sendMessage(
          this.config.notificationChatId,
          message,
          { parse_mode: 'Markdown' }
        );
        
        // Log notification
        logNotification({
          type: 'reward',
          chat: this.config.notificationChatId,
          source: '/dashboard/rewards',
          message: message,
        });
        
        // Log new run detection with full details for debugging
        console.log(`[Bot] ✅ New reward run detected and notification sent`);
        console.log(`[Bot] Reward Run ID: ${currentRewardRunId.substring(0, 16)}...`);
        console.log(`[Bot] Details: lastRun=${rewards.lastRun}, totalSOL=${rewards.statistics?.totalSOLDistributed}, eligible=${rewards.statistics?.eligibleHolders}, pending=${payouts.summary?.pending}`);
        
        // Also update in-memory state (for backward compatibility)
        this.lastCheck.lastRewardsRun = rewards.lastRun;
      } else {
        // Duplicate reward run - skip notification
        console.log(`[Bot] ⏭️  Duplicate reward run skipped (ID: ${currentRewardRunId.substring(0, 16)}...)`);
        console.log(`[Bot] Details: lastRun=${rewards.lastRun}, totalSOL=${rewards.statistics?.totalSOLDistributed}, eligible=${rewards.statistics?.eligibleHolders}, pending=${payouts.summary?.pending}`);
      }
    } catch (error) {
      console.error('[Bot] Error checking for new rewards:', error);
      // Don't throw - allow polling to continue
    }
  }

  /**
   * Check for new payouts and send notifications
   */
  private async checkForNewPayouts(): Promise<void> {
    if (!this.config.notificationChatId) {
      return; // No notification chat configured
    }

    try {
      const payouts = await this.apiClient.getPayouts();
      
      // Generate unique payout ID from current payouts
      const currentPayoutId = generatePayoutId(payouts.payouts);
      
      // Get persisted state to check for duplicates
      const state = getLastState();
      const lastNotifiedPayoutId = state.lastPayoutId;

      // Check if there are new payouts (compare payout ID)
      if (currentPayoutId !== lastNotifiedPayoutId && payouts.total > 0) {
        const diff = payouts.total - (this.lastCheck.lastPayoutsCount || 0);
        const message = `🆕 *New Payouts Detected!*\n\n${diff > 0 ? `+${diff}` : diff} payout(s) added.\n\n${this.formatter.formatPayouts(payouts)}`;
        await this.bot.sendMessage(
          this.config.notificationChatId,
          message,
          { parse_mode: 'Markdown' }
        );
        
        // Log notification
        logNotification({
          type: 'payout',
          chat: this.config.notificationChatId,
          source: '/dashboard/payouts',
          message: message,
        });
        
        // Update persisted state
        updateState({ lastPayoutId: currentPayoutId });
        
        // Also update in-memory state
        this.lastCheck.lastPayoutsCount = payouts.total;
      } else if (currentPayoutId === lastNotifiedPayoutId) {
        // Log when skipping duplicate (optional)
        console.log('[Bot] Skipping duplicate payout notification (already notified for this payout set)');
      }
    } catch (error) {
      console.error('[Bot] Error checking for new payouts:', error);
      // Don't throw - allow polling to continue
    }
  }

  /**
   * Start automatic polling for notifications
   */
  startPolling(): void {
    if (!this.config.notificationChatId) {
      console.log('[Bot] No notification chat configured. Skipping auto-polling.');
      return;
    }

    console.log(`[Bot] Starting auto-polling every ${this.config.pollingInterval}ms`);
    
    this.pollingInterval = setInterval(async () => {
      await this.checkForNewRewards();
      await this.checkForNewPayouts();
      this.lastCheck.lastRewardsCheck = Date.now();
      this.lastCheck.lastPayoutsCheck = Date.now();
    }, this.config.pollingInterval);
  }

  /**
   * Stop automatic polling
   */
  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log('[Bot] Auto-polling stopped');
    }
  }

  /**
   * Start the bot
   */
  start(): void {
    console.log('[Bot] Starting Reward System Telegram Bot...');
    console.log(`[Bot] Backend URL: ${this.config.backendUrl}`);
    console.log(`[Bot] Notification Chat ID: ${this.config.notificationChatId || 'Not configured'}`);
    
    // Load persisted state on startup to prevent duplicate notifications after restart
    const persistedState = getLastState();
    if (persistedState.lastRewardRunId) {
      console.log(`[Bot] Loaded persisted state: last reward run ID = ${persistedState.lastRewardRunId.substring(0, 16)}...`);
      // Note: We don't set lastRewardsRun here anymore since we use deterministic IDs
      // But keep it for backward compatibility if needed
    }
    if (persistedState.lastPayoutId) {
      // Note: We can't directly map payout ID to count, but that's okay
      // The deduplication will work based on payout ID comparison
      console.log(`[Bot] Loaded persisted state: last payout ID = ${persistedState.lastPayoutId}`);
    }
    
    // CRITICAL: Update state BEFORE starting polling to prevent race conditions
    // This ensures we have the latest state before any polling begins
    const currentState = getLastState();
    console.log(`[Bot] Current state: rewardRunId=${currentState.lastRewardRunId ? currentState.lastRewardRunId.substring(0, 16) + '...' : 'none'}, payoutId=${currentState.lastPayoutId || 'none'}`);
    
    this.startPolling();
    
    console.log('[Bot] Bot is running! Use /help to see available commands.');
    console.log('[Bot] ⚠️  WARNING: Only ONE bot instance should be running to prevent duplicate notifications!');
  }

  /**
   * Stop the bot gracefully
   */
  stop(): void {
    console.log('[Bot] Stopping bot...');
    this.stopPolling();
    this.bot.stopPolling();
    console.log('[Bot] Bot stopped');
  }
}

// ============================================================================
// Main Entry Point
// ============================================================================

function main(): void {
  try {
    const config = loadConfig();
    const bot = new RewardSystemBot(config);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n[Bot] Received SIGINT, shutting down gracefully...');
      bot.stop();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\n[Bot] Received SIGTERM, shutting down gracefully...');
      bot.stop();
      process.exit(0);
    });

    // Start the bot
    bot.start();
  } catch (error) {
    console.error('[Bot] Failed to start bot:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

export { RewardSystemBot, BackendAPIClient, ExcelExporter, MessageFormatter };

