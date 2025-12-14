import { ChartsSection } from '../components/ChartsSection';
import { HistoricalRewardChart } from '../components/charts/HistoricalRewardChart';
import './AnalyticsPage.css';

export function AnalyticsPage() {
  return (
    <div className="analytics-page">
      <div className="page-header">
        <h2>Analytics & Visualizations</h2>
        <p className="page-subtitle">Real-time charts and historical trends</p>
      </div>
      <HistoricalRewardChart />
      <ChartsSection />
    </div>
  );
}

