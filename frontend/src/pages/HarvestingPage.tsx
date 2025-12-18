import { useState, useEffect } from 'react';
import { fetchRewards } from '../services/api';
import type { RewardsResponse } from '../types/api';
import { ChartsSection } from '../components/ChartsSection';
import { RewardSummary } from '../components/RewardSummary';
import { StatCard } from '../components/StatCard';
import './HarvestingPage.css';

export function HarvestingPage() {
  const [data, setData] = useState<RewardsResponse | null>(null);
  const [, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null);
        const response = await fetchRewards();
        setData(response);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
        setError(errorMessage);
        console.error('Error loading harvesting data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    const interval = setInterval(loadData, 300000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const getTimeUntilNext = (nextRun: string | null) => {
    if (!nextRun) return 'N/A';
    const now = new Date().getTime();
    const next = new Date(nextRun).getTime();
    const diff = next - now;
    
    if (diff <= 0) return 'Due now';
    
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const stats = data?.statistics || {
    totalHolders: 0,
    eligibleHolders: 0,
    excludedHolders: 0,
    blacklistedHolders: 0,
    pendingPayouts: 0,
    totalSOLDistributed: 0,
  };
  const tax = data?.tax || {
    totalNukeHarvested: '0',
    totalNukeSold: '0',
    totalSolDistributed: '0',
    totalSolToTreasury: '0',
    lastTaxDistribution: null,
    lastSwapTx: null,
    lastDistributionTx: null,
    distributionCount: 0,
  };

  return (
    <div className="harvesting-page">
      {/* Tax & Rewards Statistics */}
      <section className="dashboard-section">
        <RewardSummary refreshInterval={300000} />
      </section>

      {/* Detailed Statistics */}
      <section className="dashboard-section">
        <h2 className="section-title">System Status</h2>
        <div className="stats-grid">
          <StatCard
            label="Scheduler Status"
            value={data?.isRunning ? 'Running' : 'Idle'}
          />
          <StatCard
            label="Last Run"
            value={formatDate(data?.lastRun || null)}
          />
          <StatCard
            label="Next Run"
            value={formatDate(data?.nextRun || null) + ` (${getTimeUntilNext(data?.nextRun || null)})`}
          />
          <StatCard
            label="Distribution Count"
            value={(tax.distributionCount || 0).toLocaleString()}
          />
        </div>
      </section>

      {/* Holder Statistics */}
      <section className="dashboard-section">
        <h2 className="section-title">Holder Statistics</h2>
        <div className="stats-grid">
          <StatCard
            label="Total Holders"
            value={(stats.totalHolders || 0).toLocaleString()}
          />
          <StatCard
            label="Eligible Holders"
            value={(stats.eligibleHolders || 0).toLocaleString()}
          />
          <StatCard
            label="Excluded Holders"
            value={(stats.excludedHolders || 0).toLocaleString()}
          />
          <StatCard
            label="Blacklisted"
            value={(stats.blacklistedHolders || 0).toLocaleString()}
          />
          <StatCard
            label="Pending Payouts"
            value={(stats.pendingPayouts || 0).toLocaleString()}
          />
          <StatCard
            label="Total SOL Distributed"
            value={(() => {
              const sol = stats.totalSOLDistributed;
              if (sol === null || sol === undefined || isNaN(sol)) {
                return '0.000000 SOL';
              }
              return `${Number(sol).toFixed(6)} SOL`;
            })()}
          />
        </div>
      </section>

      {/* Transaction Links */}
      {(tax.lastSwapTx || tax.lastDistributionTx) && (
        <section className="dashboard-section">
          <h2 className="section-title">Recent Transactions</h2>
          <div className="transaction-links">
            {tax.lastSwapTx && (
              <a
                href={`https://solscan.io/tx/${tax.lastSwapTx}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="tx-link"
              >
                Last Swap: {tax.lastSwapTx.slice(0, 8)}...{tax.lastSwapTx.slice(-8)}
              </a>
            )}
            {tax.lastDistributionTx && (
              <a
                href={`https://solscan.io/tx/${tax.lastDistributionTx}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="tx-link"
              >
                Last Distribution: {tax.lastDistributionTx.slice(0, 8)}...{tax.lastDistributionTx.slice(-8)}
              </a>
            )}
          </div>
        </section>
      )}

      {/* Analytics Charts Section */}
      <section className="dashboard-section">
        <h2 className="section-title">Analytics & Trends</h2>
        <ChartsSection />
      </section>
    </div>
  );
}

