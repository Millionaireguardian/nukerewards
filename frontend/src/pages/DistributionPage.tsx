import { useState, useEffect } from 'react';
import { fetchPayouts } from '../services/api';
import type { Payout } from '../types/api';
import { Table } from '../components/Table';
import type { TableColumn } from '../components/Table';
import { exportToExcel } from '../utils/exportUtils';
import { showNotification } from '../components/Notifications';
import './DistributionPage.css';

export function DistributionPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetchPayouts({ limit: 1000 });
        setPayouts(response.payouts);
      } catch (error) {
        console.error('Error loading distribution data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  const columns: TableColumn<Payout>[] = [
    {
      key: 'pubkey',
      header: 'Recipient',
      accessor: (row) => (
        <span className="pubkey-cell" title={row.pubkey}>
          {`${row.pubkey.substring(0, 8)}...${row.pubkey.substring(row.pubkey.length - 8)}`}
        </span>
      ),
      sortable: false,
    },
    {
      key: 'rewardSOL',
      header: 'Reward SOL',
      accessor: (row) => (
        <span style={{ color: '#4a90e2', fontWeight: 600 }}>
          {(row.rewardSOL || 0).toFixed(6)} SOL
        </span>
      ),
      sortable: true,
      sortFn: (a, b) => a.rewardSOL - b.rewardSOL,
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (row) => {
        const statusClass = row.status === 'pending' ? 'status-pending' : 'status-failed';
        return <span className={`status-badge ${statusClass}`}>{row.status}</span>;
      },
      sortable: true,
      sortFn: (a, b) => a.status.localeCompare(b.status),
    },
    {
      key: 'retryCount',
      header: 'Retry Count',
      accessor: (row) => row.retryCount,
      sortable: true,
      sortFn: (a, b) => a.retryCount - b.retryCount,
    },
    {
      key: 'queuedAt',
      header: 'Queued At',
      accessor: (row) => new Date(row.queuedAt).toLocaleString(),
      sortable: true,
      sortFn: (a, b) => new Date(a.queuedAt).getTime() - new Date(b.queuedAt).getTime(),
    },
    {
      key: 'lastReward',
      header: 'Last Reward',
      accessor: (row) =>
        row.lastReward ? new Date(row.lastReward).toLocaleString() : 'Never',
      sortable: true,
      sortFn: (a, b) => {
        if (!a.lastReward && !b.lastReward) return 0;
        if (!a.lastReward) return 1;
        if (!b.lastReward) return -1;
        return new Date(a.lastReward).getTime() - new Date(b.lastReward).getTime();
      },
    },
  ];

  const statusFilter = {
    key: 'status',
    label: 'Status',
    options: [
      { value: 'pending', label: 'Pending' },
      { value: 'failed', label: 'Failed' },
    ],
  };

  const handleExcelExport = () => {
    try {
      if (payouts.length === 0) {
        showNotification('No data to export', 'warning');
        return;
      }

      const pendingCount = payouts.filter((p) => p.status === 'pending').length;
      const failedCount = payouts.filter((p) => p.status === 'failed').length;
      const totalSOL = payouts.reduce((sum, p) => sum + (p.rewardSOL || 0), 0);

      // Prepare summary sheet
      const summaryData = [
        ['Distribution History Summary'],
        [''],
        ['Total Payouts', payouts.length],
        ['Pending Payouts', pendingCount],
        ['Failed Payouts', failedCount],
        ['Total SOL', (totalSOL || 0).toFixed(6)],
        [''],
        ['Export Date', new Date().toLocaleString()],
      ];

      // Prepare distribution sheet
      const distributionData = payouts.map((payout) => ({
        'Recipient Pubkey': payout.pubkey,
        'Reward SOL': (payout.rewardSOL || 0).toFixed(6),
        Status: payout.status,
        'Retry Count': payout.retryCount,
        'Queued At': new Date(payout.queuedAt).toLocaleString(),
        'Last Reward': payout.lastReward
          ? new Date(payout.lastReward).toLocaleString()
          : 'Never',
      }));

      exportToExcel(
        [
          {
            name: 'Summary',
            data: summaryData.map((row) => ({ '': row[0], Value: row[1] || '' })),
            headers: ['Metric', 'Value'],
          },
          {
            name: 'Distribution History',
            data: distributionData,
          },
        ],
        'distribution-history-report'
      );

      showNotification('Excel export started', 'success');
    } catch (error) {
      console.error('Export error:', error);
      showNotification('Failed to export Excel file', 'error');
    }
  };

  return (
    <div className="distribution-page">
      <div className="page-header">
        <h2>Distribution History</h2>
        <p className="page-subtitle">SOL payout distribution records and status</p>
      </div>

      <div className="distribution-summary">
        <div className="summary-stat">
          <span className="stat-label">Total Payouts:</span>
          <span className="stat-value">{payouts.length}</span>
        </div>
        <div className="summary-stat">
          <span className="stat-label">Pending:</span>
          <span className="stat-value stat-pending">
            {payouts.filter((p) => p.status === 'pending').length}
          </span>
        </div>
        <div className="summary-stat">
          <span className="stat-label">Failed:</span>
          <span className="stat-value stat-failed">
            {payouts.filter((p) => p.status === 'failed').length}
          </span>
        </div>
        <div className="summary-stat highlight">
          <span className="stat-label">Total SOL:</span>
          <span className="stat-value stat-sol">
            {payouts.reduce((sum, p) => sum + (p.rewardSOL || 0), 0).toFixed(6)} SOL
          </span>
        </div>
      </div>

      <div className="export-toolbar">
        <button
          onClick={handleExcelExport}
          className="export-excel-btn"
        >
          Export to Excel
        </button>
      </div>

      <Table
        data={payouts}
        columns={columns}
        searchable={true}
        searchPlaceholder="Search by pubkey..."
        searchKeys={['pubkey']}
        filterable={true}
        filters={[statusFilter]}
        onFilter={(row, filterKey, filterValue) => {
          if (filterKey === 'status') {
            return row.status === filterValue;
          }
          return true;
        }}
        exportable={true}
        exportFilename="distribution-history"
        exportHeaders={columns.map((col) => col.header)}
        pagination={true}
        pageSize={50}
        loading={loading}
        emptyMessage="No distribution records available"
      />
    </div>
  );
}

