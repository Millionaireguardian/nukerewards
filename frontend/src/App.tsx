import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toolbar } from './components/Toolbar';
import { NotificationManager } from './components/Notifications';
import { Dashboard } from './pages/Dashboard';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { HoldersPage } from './pages/HoldersPage';
import { PayoutsPage } from './pages/PayoutsPage';
import { HarvestPage } from './pages/HarvestPage';
import { DistributionPage } from './pages/DistributionPage';
import { HistoricalRewardsPage } from './pages/HistoricalRewardsPage';
import { PayoutHistoryPage } from './pages/PayoutHistoryPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Toolbar />
        <NotificationManager />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/holders" element={<HoldersPage />} />
          <Route path="/payouts" element={<PayoutsPage />} />
          <Route path="/harvest" element={<HarvestPage />} />
          <Route path="/distribution" element={<DistributionPage />} />
          <Route path="/historical-rewards" element={<HistoricalRewardsPage />} />
          <Route path="/payout-history" element={<PayoutHistoryPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
