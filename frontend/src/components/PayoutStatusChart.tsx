import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { fetchPayouts } from '../services/api';
import type { PayoutsResponse } from '../types/api';
import './Charts.css';

export function PayoutStatusChart() {
  const [data, setData] = useState<PayoutsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetchPayouts({ limit: 1000 });
        setData(response);
      } catch (error) {
        console.error('Error loading payout chart data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    // Removed auto-refresh - chart data doesn't need frequent updates
    // const interval = setInterval(loadData, 300000); // 5 minutes if needed
    // return () => clearInterval(interval);
  }, []);

  if (loading || !data || !data.summary) {
    return <div className="chart-loading">Loading chart data...</div>;
  }

  const chartData = [
    {
      name: 'Status',
      Pending: data.summary.pending || 0,
      Failed: data.summary.failed || 0,
    },
  ];

  if ((data.summary.pending || 0) === 0 && (data.summary.failed || 0) === 0) {
    return (
      <div className="chart-container">
        <h3>Payout Status</h3>
        <div className="chart-no-data">No payout data available</div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <h3>Payout Status</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim() || 'rgba(59, 130, 246, 0.2)'} opacity={0.3} />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip formatter={(value: number) => value.toLocaleString()} />
          <Legend />
          <Bar dataKey="Pending" fill={getComputedStyle(document.documentElement).getPropertyValue('--accent-warning').trim() || '#f59e0b'} />
          <Bar dataKey="Failed" fill={getComputedStyle(document.documentElement).getPropertyValue('--accent-danger').trim() || '#ef4444'} />
        </BarChart>
      </ResponsiveContainer>
      <div className="chart-summary">
        <div className="summary-item">
          <span className="summary-label">Total SOL:</span>
          <span className="summary-value">
            {(() => {
              const sol = data.summary?.totalSOL;
              if (sol === null || sol === undefined || isNaN(sol)) {
                return '0.000000 SOL';
              }
              return `${Number(sol).toFixed(6)} SOL`;
            })()}
          </span>
        </div>
      </div>
    </div>
  );
}

