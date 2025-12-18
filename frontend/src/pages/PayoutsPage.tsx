import { PayoutsTable } from '../components/PayoutsTable';
import './PayoutsPage.css';

export function PayoutsPage() {
  return (
    <div className="payouts-page">
      <section className="dashboard-section">
      <PayoutsTable />
      </section>
    </div>
  );
}

