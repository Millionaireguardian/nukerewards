import { useState, useEffect } from 'react';
import { fetchHistoricalPayouts, exportPayouts } from '../services/api';
import type { HistoricalPayout } from '../types/api';
import { Table } from '../components/Table';
import type { TableColumn } from '../components/Table';
import { showNotification } from '../components/Notifications';
import { exportToExcel } from '../utils/exportUtils';
import './PayoutHistoryPage.css';

export function PayoutHistoryPage() {
  const [payouts, setPayouts] = useState<HistoricalPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  const [filters, setFilters] = useState<{
    status?: 'pending' | 'failed' | 'success';
    pubkey?: string;
    startDate?: string;
    endDate?: string;
  }>({});

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const offset = (currentPage - 1) * pageSize;
        const response = await fetchHistoricalPayouts({
          ...filters,
          limit: pageSize,
          offset,
        });

        setPayouts(response.payouts);
        setTotal(response.total);
      } catch (err) {
        console.error('Error loading payout history:', err);
        setError(err instanceof Error ? err.message : 'Failed to load payout history');
        showNotification('Failed to load payout history', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadData();
    // Removed auto-refresh - users can manually refresh if needed
    // Data doesn't need to update every minute
    // const interval = setInterval(loadData, 300000); // 5 minutes if needed
    // return () => clearInterval(interval);
  }, [currentPage, pageSize, filters]);

  const handleExport = async () => {
    try {
      const exportData = await exportPayouts(filters);
      
      // Convert to Excel format
      exportToExcel(
        [
          {
            name: 'Payout History',
            data: exportData.data,
          },
        ],
        'payout-history'
      );

      showNotification('Payout history exported successfully', 'success');
    } catch (err) {
      console.error('Export error:', err);
      showNotification('Failed to export payout history', 'error');
    }
  };

  const columns: TableColumn<HistoricalPayout>[] = [
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
        <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
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
        const statusClass =
          row.status === 'success'
            ? 'status-success'
            : row.status === 'pending'
            ? 'status-pending'
            : 'status-failed';
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
      key: 'executedAt',
      header: 'Executed At',
      accessor: (row) => (row.executedAt ? new Date(row.executedAt).toLocaleString() : 'N/A'),
      sortable: true,
      sortFn: (a, b) => {
        if (!a.executedAt && !b.executedAt) return 0;
        if (!a.executedAt) return 1;
        if (!b.executedAt) return -1;
        return new Date(a.executedAt).getTime() - new Date(b.executedAt).getTime();
      },
    },
    {
      key: 'transactionSignature',
      header: 'Transaction',
      accessor: (row) =>
        row.transactionSignature ? (
          <span className="tx-signature" title={row.transactionSignature}>
            {`${row.transactionSignature.substring(0, 8)}...`}
          </span>
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>N/A</span>
        ),
      sortable: false,
    },
  ];


  const handleFilterChange = (filterKey: string, filterValue: string) => {
    setFilters((prev) => ({
      ...prev,
      [filterKey]: filterValue || undefined,
    }));
    setCurrentPage(1); // Reset to first page on filter change
  };

  const totalPages = Math.ceil(total / pageSize);

  if (error && payouts.length === 0) {
    return (
      <div className="payout-history-page">
        <div className="page-header">
          <h2>Payout History</h2>
          <p className="page-subtitle">Historical payout records and transaction details</p>
        </div>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="payout-history-page">
      <div className="page-header">
        <h2>Payout History</h2>
        <p className="page-subtitle">Historical payout records and transaction details</p>
      </div>

      <div className="page-summary">
        <div className="summary-stat">
          <span className="stat-label">Total Payouts:</span>
          <span className="stat-value">{total.toLocaleString()}</span>
        </div>
        <div className="summary-stat">
          <span className="stat-label">Success:</span>
          <span className="stat-value stat-success">
            {payouts.filter((p) => p.status === 'success').length}
          </span>
        </div>
        <div className="summary-stat">
          <span className="stat-label">Failed:</span>
          <span className="stat-value stat-failed">
            {payouts.filter((p) => p.status === 'failed').length}
          </span>
        </div>
        <div className="summary-stat">
          <span className="stat-label">Pending:</span>
          <span className="stat-value stat-pending">
            {payouts.filter((p) => p.status === 'pending').length}
          </span>
        </div>
      </div>

      <div className="export-toolbar">
        <button onClick={handleExport} className="export-excel-btn">
          Export to Excel
        </button>
      </div>

      <div className="filters-section">
        <input
          type="text"
          placeholder="Search by pubkey..."
          value={filters.pubkey || ''}
          onChange={(e) => handleFilterChange('pubkey', e.target.value)}
          className="filter-input"
        />
        <select
          value={filters.status || ''}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          className="filter-select"
        >
          <option value="">All Statuses</option>
          <option value="success">Success</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
        <input
          type="date"
          value={filters.startDate || ''}
          onChange={(e) => handleFilterChange('startDate', e.target.value)}
          className="filter-date"
          placeholder="Start Date"
        />
        <input
          type="date"
          value={filters.endDate || ''}
          onChange={(e) => handleFilterChange('endDate', e.target.value)}
          className="filter-date"
          placeholder="End Date"
        />
      </div>

      <Table
        data={payouts}
        columns={columns}
        searchable={true}
        searchPlaceholder="Search by pubkey..."
        searchKeys={['pubkey']}
        filterable={false}
        exportable={false}
        pagination={false}
        loading={loading}
        emptyMessage="No payout history available"
      />

      {totalPages > 1 && (
        <div className="pagination-controls">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="pagination-btn"
          >
            Previous
          </button>
          <span className="pagination-info">
            Page {currentPage} of {totalPages} ({total} total)
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="pagination-btn"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

