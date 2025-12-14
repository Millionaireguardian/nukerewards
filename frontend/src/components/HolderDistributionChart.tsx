import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { fetchRewards } from '../services/api';
import type { RewardsResponse } from '../types/api';
import './Charts.css';

export function HolderDistributionChart() {
  const [data, setData] = useState<RewardsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetchRewards();
        setData(response);
      } catch (error) {
        console.error('Error loading chart data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !data) {
    return <div className="chart-loading">Loading chart data...</div>;
  }

  const chartData = [
    {
      name: 'Eligible',
      value: data.statistics.eligibleHolders,
      color: '#28a745',
    },
    {
      name: 'Excluded',
      value: data.statistics.excludedHolders,
      color: '#ffc107',
    },
    {
      name: 'Blacklisted',
      value: data.statistics.blacklistedHolders,
      color: '#dc3545',
    },
  ].filter(item => item.value > 0);

  if (chartData.length === 0) {
    return (
      <div className="chart-container">
        <h3>Holder Distribution</h3>
        <div className="chart-no-data">No holder data available</div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <h3>Holder Distribution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => value.toLocaleString()} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      <div className="chart-summary">
        <div className="summary-item">
          <span className="summary-label">Total:</span>
          <span className="summary-value">{data.statistics.totalHolders.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

