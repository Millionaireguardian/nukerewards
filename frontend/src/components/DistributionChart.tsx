import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useState, useEffect } from 'react';
import { fetchRewards } from '../services/api';
import type { RewardsResponse } from '../types/api';
import './DistributionChart.css';

export function DistributionChart() {
  const [data, setData] = useState<RewardsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetchRewards();
        setData(response);
      } catch (error) {
        console.error('Error loading distribution data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    const interval = setInterval(loadData, 300000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !data || !data.tax) {
    return <div className="chart-loading">Loading distribution data...</div>;
  }

  const tax = data.tax;
  const totalSolDistributed = parseFloat(tax.totalSolDistributed || '0') / 1e9;
  const totalSolToTreasury = parseFloat(tax.totalSolToTreasury || '0') / 1e9;
  const totalSol = totalSolDistributed + totalSolToTreasury;

  // Get theme colors
  const getThemeColor = (colorName: string) => {
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);
    return computedStyle.getPropertyValue(`--chart-${colorName}`).trim() || '#3b82f6';
  };

  const chartData = [
    {
      name: 'Holders (75%)',
      value: totalSolDistributed,
      color: getThemeColor('blue'),
    },
    {
      name: 'Treasury (25%)',
      value: totalSolToTreasury,
      color: getThemeColor('purple'),
    },
  ].filter(item => item.value > 0);

  if (totalSol === 0) {
    return (
      <div className="distribution-chart-container">
        <div className="chart-no-data">No distribution data available</div>
      </div>
    );
  }

  const holdersPercent = totalSol > 0 ? ((totalSolDistributed / totalSol) * 100).toFixed(0) : '0';
  const treasuryPercent = totalSol > 0 ? ((totalSolToTreasury / totalSol) * 100).toFixed(0) : '0';

  return (
    <div className="distribution-chart-container">
      <div className="distribution-chart-wrapper">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={80}
              outerRadius={120}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => `${(value || 0).toFixed(6)} SOL`}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
        <div className="distribution-center">
          <div className="distribution-total">
            {totalSol.toFixed(6)} SOL
          </div>
          <div className="distribution-label">Total Distributed</div>
        </div>
      </div>
      <div className="distribution-breakdown">
        <div className="breakdown-item">
          <div className="breakdown-color" style={{ backgroundColor: getThemeColor('blue') }}></div>
          <div className="breakdown-info">
            <div className="breakdown-label">Holders</div>
            <div className="breakdown-value">{holdersPercent}%</div>
          </div>
        </div>
        <div className="breakdown-item">
          <div className="breakdown-color" style={{ backgroundColor: getThemeColor('purple') }}></div>
          <div className="breakdown-info">
            <div className="breakdown-label">Treasury</div>
            <div className="breakdown-value">{treasuryPercent}%</div>
          </div>
        </div>
      </div>
    </div>
  );
}

