import { RewardSummary } from '../components/RewardSummary';
import { ChartsSection } from '../components/ChartsSection';
import './Dashboard.css';

export function Dashboard() {
  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>NUKE Token Reward Dashboard</h1>
        <p className="subtitle">Real-time monitoring of token holders, rewards, and payouts</p>
      </header>

      <div className="dashboard-content">
        <RewardSummary />
        <ChartsSection />
      </div>
    </div>
  );
}

