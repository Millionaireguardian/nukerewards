import { PayoutsTable } from '../components/PayoutsTable';
import './PayoutsPage.css';

export function PayoutsPage() {
  return (
    <div className="payouts-page">
      <div className="page-header">
        <h2>Pending Payouts</h2>
        <p className="page-subtitle">SOL reward payouts awaiting distribution</p>
      </div>
      <PayoutsTable />
    </div>
  );
}

