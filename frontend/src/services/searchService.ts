import { fetchHolders, fetchPayouts, fetchHistoricalPayouts } from './api';
import type { Payout, HistoricalPayout } from '../types/api';

export interface SearchResult {
  type: 'wallet' | 'transaction';
  data: WalletSearchResult | TransactionSearchResult;
}

export interface WalletSearchResult {
  pubkey: string;
  balance?: string;
  usdValue?: number;
  eligibilityStatus?: 'eligible' | 'excluded' | 'blacklisted';
  pendingPayouts?: number;
  totalSOLForHolder?: number;
  lastReward?: string | null;
  recentPayouts?: Array<{
    rewardSOL: number;
    status: string;
    timestamp: string;
    transactionSignature?: string | null;
  }>;
}

export interface TransactionSearchResult {
  signature: string;
  pubkey: string;
  rewardSOL: number;
  status: string;
  timestamp: string;
  executedAt?: string | null;
}

/**
 * Check if a string is a valid Solana address (base58, 32-44 chars)
 */
function isValidSolanaAddress(str: string): boolean {
  // Solana addresses are base58 encoded, typically 32-44 characters
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(str);
}

/**
 * Check if a string looks like a transaction signature (base58, longer)
 */
function isValidTransactionSignature(str: string): boolean {
  // Transaction signatures are base58 encoded, typically 88 characters
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{80,}$/;
  return base58Regex.test(str);
}

/**
 * Search for wallet address or transaction hash
 */
export async function search(query: string): Promise<SearchResult | null> {
  const trimmedQuery = query.trim();
  
  if (!trimmedQuery) {
    return null;
  }

  // Determine if it's a wallet address or transaction signature
  const isWallet = isValidSolanaAddress(trimmedQuery) && !isValidTransactionSignature(trimmedQuery);
  const isTransaction = isValidTransactionSignature(trimmedQuery);

  if (isWallet) {
    return await searchWallet(trimmedQuery);
  } else if (isTransaction) {
    return await searchTransaction(trimmedQuery);
  } else {
    // Try both if format is unclear
    const walletResult = await searchWallet(trimmedQuery);
    if (walletResult) {
      return walletResult;
    }
    return await searchTransaction(trimmedQuery);
  }
}

/**
 * Search for a wallet address
 */
async function searchWallet(pubkey: string): Promise<SearchResult | null> {
  try {
    // Search in holders
    const holdersResponse = await fetchHolders({ limit: 1 });
    const holder = holdersResponse.holders.find(h => h.pubkey === pubkey);

    // Search in payouts
    const payoutsResponse = await fetchPayouts({ pubkey, limit: 10 });
    
    // Search in historical payouts
    const historicalPayoutsResponse = await fetchHistoricalPayouts({ 
      pubkey, 
      limit: 10 
    });

    // If no results found, return null
    if (!holder && payoutsResponse.payouts.length === 0 && historicalPayoutsResponse.payouts.length === 0) {
      return null;
    }

    // Combine recent payouts
    const recentPayouts = [
      ...payoutsResponse.payouts.map((p: Payout) => ({
        rewardSOL: p.rewardSOL,
        status: p.status,
        timestamp: p.queuedAt,
        transactionSignature: null,
      })),
      ...historicalPayoutsResponse.payouts
        .filter((p: HistoricalPayout) => p.status === 'success')
        .map((p: HistoricalPayout) => ({
          rewardSOL: p.rewardSOL,
          status: p.status,
          timestamp: p.executedAt || p.timestamp,
          transactionSignature: p.transactionSignature,
        })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
     .slice(0, 10);

    const result: WalletSearchResult = {
      pubkey,
      balance: holder?.balance,
      usdValue: holder?.usdValue,
      eligibilityStatus: holder?.eligibilityStatus,
      lastReward: holder?.lastReward,
      pendingPayouts: payoutsResponse.payouts.filter(p => p.status === 'pending').length,
      recentPayouts: recentPayouts.length > 0 ? recentPayouts : undefined,
    };

    return {
      type: 'wallet',
      data: result,
    };
  } catch (error) {
    console.error('Error searching wallet:', error);
    return null;
  }
}

/**
 * Search for a transaction signature
 */
async function searchTransaction(signature: string): Promise<SearchResult | null> {
  try {
    // Search in historical payouts (they have transactionSignature)
    const historicalPayoutsResponse = await fetchHistoricalPayouts({ limit: 1000 });
    
    const matchingPayout = historicalPayoutsResponse.payouts.find(
      (p: HistoricalPayout) => p.transactionSignature === signature
    );

    if (!matchingPayout) {
      return null;
    }

    const result: TransactionSearchResult = {
      signature: matchingPayout.transactionSignature!,
      pubkey: matchingPayout.pubkey,
      rewardSOL: matchingPayout.rewardSOL,
      status: matchingPayout.status,
      timestamp: matchingPayout.timestamp,
      executedAt: matchingPayout.executedAt,
    };

    return {
      type: 'transaction',
      data: result,
    };
  } catch (error) {
    console.error('Error searching transaction:', error);
    return null;
  }
}

