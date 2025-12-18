import { useState, useEffect } from 'react';
import { fetchRewards, fetchHistoricalRewards, fetchDexVolume24h } from '../services/api';
import type { RewardsResponse, RewardCycle } from '../types/api';
import { StatCard } from '../components/StatCard';
import { DistributionCard, type DistributionCardItem } from '../components/DistributionCard';
import { DistributionChart } from '../components/DistributionChart';
import { GlassCard } from '../components/GlassCard';
import './Dashboard.css';

export function Dashboard() {
  const [rewardsData, setRewardsData] = useState<RewardsResponse | null>(null);
  const [distributionHistory, setDistributionHistory] = useState<DistributionCardItem[]>([]);
  const [dexVolume24h, setDexVolume24h] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setError(null);

        // Fetch current rewards data
        const rewardsResponse = await fetchRewards();
        setRewardsData(rewardsResponse);

        // Fetch historical rewards for distribution carousel (last 20)
        const historicalResponse = await fetchHistoricalRewards({ limit: 20 });
        
        // Transform historical data to DistributionCard format
        const transformedHistory: DistributionCardItem[] = historicalResponse.cycles
          .slice(0, 20)
          .map((cycle: RewardCycle) => {
            const d = new Date(cycle.timestamp);
            const hours = d.getHours();
            const minutes = d.getMinutes();
            const period = hours >= 12 ? 'PM' : 'AM';
            const displayHours = hours % 12 || 12;
            const displayMinutes = minutes.toString().padStart(2, '0');
            return {
              date: d.toLocaleDateString(),
              time: `${displayHours}:${displayMinutes} ${period} EST`,
              status: 'Completed',
              harvestedSOL: 0, // This would need to come from tax data
              distributedSOL: cycle.totalSOLDistributed || 0,
              totalHolders: cycle.totalHoldersCount || 0,
            };
          })
          .reverse(); // Show most recent first

        setDistributionHistory(transformedHistory);

        // Fetch DEX volume 24h (using token mint from environment or fallback)
        const tokenMint = import.meta.env.VITE_TOKEN_MINT;
        if (tokenMint) {
          try {
            const volume = await fetchDexVolume24h(tokenMint);
            setDexVolume24h(volume);
          } catch (err) {
            console.warn('Could not fetch DEX volume:', err);
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
        setError(errorMessage);
        console.error('Error loading dashboard data:', err);
      }
    };

    loadData();
    const interval = setInterval(loadData, 300000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, []);

  // If we have no data at all yet, show a simple loading state
  if (!rewardsData) {
  return (
      <div className="dashboard-page">
        {error ? (
          <div className="error-message">Error: {error}</div>
        ) : (
          <div className="loading">Loading dashboard...</div>
        )}
      </div>
    );
  }

  const stats = rewardsData.statistics;
  const tax = rewardsData.tax || {
    totalNukeHarvested: '0',
    totalNukeSold: '0',
    totalSolDistributed: '0',
    totalSolToTreasury: '0',
    lastTaxDistribution: null,
    lastSwapTx: null,
    lastDistributionTx: null,
    distributionCount: 0,
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const getTimeUntilNext = (nextRun: string | null) => {
    if (!nextRun) return 'N/A';
    const now = new Date().getTime();
    const next = new Date(nextRun).getTime();
    const diff = next - now;
    
    if (diff <= 0) return 'Due now';
    
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="dashboard-page">
      {/* Section 1: Two-Column Stats Layout */}
      <section className="dashboard-section">
        <div className="stats-two-column">
          {/* Left Side: Project Statistics */}
          <GlassCard className="dashboard-section-card stats-column">
            <h2 className="section-title">Project Statistics</h2>
            <div className="stats-grid-2x2">
              <StatCard
                label="Total Distributions (SOL)"
                value={(() => {
                  const sol = parseFloat(tax.totalSolDistributed || '0') / 1e9;
                  return sol > 0 ? `${sol.toLocaleString(undefined, { maximumFractionDigits: 2 })} SOL` : '0 SOL';
                })()}
              />
              <StatCard
                label="Last Distribution"
                value={formatDate(tax.lastTaxDistribution)}
              />
              <StatCard
                label="Total Holders"
                value={(stats.totalHolders || 0).toLocaleString()}
              />
              <StatCard
                label="DEX Vol 24h"
                value={dexVolume24h !== null 
                  ? `$${dexVolume24h.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                  : 'N/A'}
              />
            </div>
          </GlassCard>

          {/* Right Side: Next Distribution Statistics */}
          <GlassCard className="dashboard-section-card stats-column">
            <h2 className="section-title">Next Distribution</h2>
            <div className="stats-grid-2x2">
              <StatCard
                label="Next Distribution"
                value={rewardsData.nextRun ? getTimeUntilNext(rewardsData.nextRun) : 'N/A'}
              />
              <StatCard
                label="NUKE Collected"
                value={(() => {
                  const nuke = parseFloat(tax.totalNukeHarvested || '0');
                  return nuke > 0 ? nuke.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0';
                })()}
              />
              <StatCard
                label="Estimated SOL"
                value={(() => {
                  const sol = parseFloat(tax.totalSolDistributed || '0') / 1e9;
                  return sol > 0 ? `${sol.toFixed(6)} SOL` : '0.000000 SOL';
                })()}
              />
              <StatCard
                label="Status"
                value="Harvesting"
              />
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Section 2: Recent Distributions Carousel */}
      <section className="dashboard-section">
        <GlassCard className="dashboard-section-card">
          <h2 className="section-title">Recent Distributions</h2>
        <div className="distribution-carousel">
          {distributionHistory.length > 0 ? (
            <div className="carousel-container">
              {distributionHistory.map((item, index) => (
                <DistributionCard key={index} item={item} />
              ))}
            </div>
          ) : (
            <div className="carousel-container">
              <DistributionCard
                item={{
                  date: '2025-01-01',
                  time: '12:00',
                  status: 'Completed',
                  harvestedSOL: 12.345678,
                  distributedSOL: 9.259258,
                  totalHolders: 1234,
                }}
              />
              <DistributionCard
                item={{
                  date: '2025-01-02',
                  time: '15:30',
                  status: 'Completed',
                  harvestedSOL: 8.123456,
                  distributedSOL: 6.092837,
                  totalHolders: 987,
                }}
              />
              <DistributionCard
                item={{
                  date: '2025-01-03',
                  time: '18:45',
                  status: 'Scheduled',
                  harvestedSOL: 0,
                  distributedSOL: 0,
                  totalHolders: 0,
                }}
              />
            </div>
          )}
        </div>
        </GlassCard>
      </section>

      {/* Section 5: Charts */}
      <section className="dashboard-section">
        <GlassCard className="dashboard-section-card">
          <h2 className="section-title">Distribution Overview</h2>
        <DistributionChart />
        </GlassCard>
      </section>
    </div>
  );
}
