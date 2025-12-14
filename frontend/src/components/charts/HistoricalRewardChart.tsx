import { useState, useEffect, useRef } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { fetchRewards } from '../../services/api';
import { exportChartAsPNG } from '../../utils/exportUtils';
import { showNotification } from '../Notifications';
import './HistoricalRewardChart.css';

interface HistoricalDataPoint {
  timestamp: string;
  date: string;
  totalSOL: number;
  eligibleHolders: number;
  pendingPayouts: number;
}

type TimeRange = '7d' | '30d' | '90d';

export function HistoricalRewardChart() {
  const [data, setData] = useState<HistoricalDataPoint[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [chartType, setChartType] = useState<'line' | 'area'>('area');
  const [loading, setLoading] = useState(true);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadHistoricalData = async () => {
      try {
        setLoading(true);
        const response = await fetchRewards();
        
        // Create data point from current response
        const now = new Date();
        const dataPoint: HistoricalDataPoint = {
          timestamp: now.toISOString(),
          date: now.toLocaleDateString(),
          totalSOL: response.statistics.totalSOLDistributed,
          eligibleHolders: response.statistics.eligibleHolders,
          pendingPayouts: response.statistics.pendingPayouts,
        };

        // Load from localStorage for historical data
        const stored = localStorage.getItem('historicalRewardData');
        let historicalData: HistoricalDataPoint[] = stored ? JSON.parse(stored) : [];

        // Add new data point (avoid duplicates)
        const lastPoint = historicalData[historicalData.length - 1];
        if (!lastPoint || lastPoint.timestamp !== dataPoint.timestamp) {
          historicalData.push(dataPoint);
          
          // Keep only data within selected time range
          const daysToKeep = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
          
          historicalData = historicalData.filter(
            (point) => new Date(point.timestamp) >= cutoffDate
          );
          
          // Save to localStorage
          localStorage.setItem('historicalRewardData', JSON.stringify(historicalData));
        }

        setData(historicalData);
      } catch (error) {
        console.error('Error loading historical data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadHistoricalData();
    const interval = setInterval(loadHistoricalData, 60000);
    return () => clearInterval(interval);
  }, [timeRange]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading && data.length === 0) {
    return (
      <div className="historical-chart-container">
        <div className="chart-loading">Loading historical data...</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="historical-chart-container">
        <div className="chart-no-data">
          No historical data available yet. Data will be collected over time.
        </div>
      </div>
    );
  }

  const ChartComponent = chartType === 'area' ? AreaChart : LineChart;
  const DataComponent = chartType === 'area' ? Area : Line;

  const handleExportPNG = async () => {
    try {
      if (!chartContainerRef.current) {
        showNotification('Chart element not found', 'error');
        return;
      }
      await exportChartAsPNG('historical-chart-container', 'historical-reward-trends');
      showNotification('Chart exported as PNG', 'success');
    } catch (error) {
      console.error('Export error:', error);
      showNotification('Failed to export chart', 'error');
    }
  };

  return (
    <div className="historical-chart-container" id="historical-chart-container" ref={chartContainerRef}>
      <div className="chart-header">
        <h3>Historical Reward Trends</h3>
        <div className="chart-controls">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            className="time-range-select"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <div className="chart-type-toggle">
            <button
              onClick={() => setChartType('area')}
              className={chartType === 'area' ? 'active' : ''}
            >
              Area
            </button>
            <button
              onClick={() => setChartType('line')}
              className={chartType === 'line' ? 'active' : ''}
            >
              Line
            </button>
          </div>
          <button onClick={handleExportPNG} className="export-chart-btn">
            Export PNG
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <ChartComponent data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorSOL" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4a90e2" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#4a90e2" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorHolders" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#28a745" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#28a745" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            angle={-45}
            textAnchor="end"
            height={80}
            interval="preserveStartEnd"
          />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip
            formatter={(value: number, name: string) => {
              if (name === 'Total SOL') {
                return [`${value.toFixed(6)} SOL`, name];
              }
              return [value.toLocaleString(), name];
            }}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Legend />
          <DataComponent
            yAxisId="right"
            type="monotone"
            dataKey="totalSOL"
            stroke="#4a90e2"
            fill={chartType === 'area' ? 'url(#colorSOL)' : undefined}
            name="Total SOL"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <DataComponent
            yAxisId="left"
            type="monotone"
            dataKey="eligibleHolders"
            stroke="#28a745"
            fill={chartType === 'area' ? 'url(#colorHolders)' : undefined}
            name="Eligible Holders"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <DataComponent
            yAxisId="left"
            type="monotone"
            dataKey="pendingPayouts"
            stroke="#ffc107"
            name="Pending Payouts"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </ChartComponent>
      </ResponsiveContainer>

      <div className="chart-summary">
        <div className="summary-item">
          <span className="summary-label">Data Points:</span>
          <span className="summary-value">{data.length}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Latest SOL:</span>
          <span className="summary-value">
            {data[data.length - 1]?.totalSOL.toFixed(6)} SOL
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Latest Eligible:</span>
          <span className="summary-value">
            {data[data.length - 1]?.eligibleHolders.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

