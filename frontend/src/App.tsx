import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { WalletContextProvider } from './contexts/WalletContext';
import { TopNav } from './components/TopNav';
import { SecondaryNav } from './components/SecondaryNav';
import { NotificationManager } from './components/Notifications';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Dashboard } from './pages/Dashboard';
import { HarvestingPage } from './pages/HarvestingPage';
import { DistributionPage } from './pages/DistributionPage';
import { HoldersPage } from './pages/HoldersPage';
import { PayoutsPage } from './pages/PayoutsPage';
import './App.css';

function DocsPage() {
  return (
    <div className="dashboard-page">
      <h1 className="dashboard-title">Documentation</h1>
      <p className="dashboard-subtitle">Documentation coming soon...</p>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <WalletContextProvider>
        <ThemeProvider>
          <BrowserRouter>
            <div className="app">
              <TopNav />
              <SecondaryNav />
              <NotificationManager />
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/harvesting" element={<HarvestingPage />} />
                <Route path="/distribution" element={<DistributionPage />} />
                <Route path="/holders" element={<HoldersPage />} />
                <Route path="/payouts" element={<PayoutsPage />} />
                <Route path="/docs" element={<DocsPage />} />
              </Routes>
            </div>
          </BrowserRouter>
        </ThemeProvider>
      </WalletContextProvider>
    </ErrorBoundary>
  );
}

export default App;
