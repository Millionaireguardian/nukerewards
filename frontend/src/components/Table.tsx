import { useState, useMemo, useEffect } from 'react';
import type { ReactNode } from 'react';
import './Table.css';

export interface TableColumn<T> {
  key: string;
  header: string;
  accessor: (row: T) => ReactNode;
  sortable?: boolean;
  sortFn?: (a: T, b: T) => number;
}

export interface TableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  searchable?: boolean;
  searchPlaceholder?: string;
  searchKeys?: string[];
  filterable?: boolean;
  filters?: Array<{ key: string; label: string; options: Array<{ value: string; label: string }> }>;
  onFilter?: (row: T, filterKey: string, filterValue: string) => boolean;
  exportable?: boolean;
  exportFilename?: string;
  exportHeaders?: string[];
  pagination?: boolean;
  pageSize?: number;
  loading?: boolean;
  emptyMessage?: string;
}

export function Table<T extends Record<string, any>>({
  data,
  columns,
  searchable = true,
  searchPlaceholder = 'Search...',
  searchKeys = [],
  filterable = false,
  filters = [],
  onFilter,
  exportable = false,
  exportFilename = 'export',
  exportHeaders,
  pagination = true,
  pageSize = 50,
  loading = false,
  emptyMessage = 'No data available',
}: TableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Filter data
  const filteredData = useMemo(() => {
    let result = [...data];

    // Apply search
    if (debouncedSearch && searchKeys.length > 0) {
      const searchLower = debouncedSearch.toLowerCase();
      result = result.filter((row) =>
        searchKeys.some((key) => {
          const value = row[key];
          return value && String(value).toLowerCase().includes(searchLower);
        })
      );
    }

    // Apply filters
    if (filterable && onFilter) {
      Object.entries(activeFilters).forEach(([filterKey, filterValue]) => {
        if (filterValue) {
          result = result.filter((row) => onFilter(row, filterKey, filterValue));
        }
      });
    }

    // Apply sorting
    if (sortColumn) {
      const column = columns.find((col) => col.key === sortColumn);
      if (column?.sortable && column.sortFn) {
        result.sort((a, b) => {
          const comparison = column.sortFn!(a, b);
          return sortDirection === 'asc' ? comparison : -comparison;
        });
      }
    }

    return result;
  }, [data, debouncedSearch, activeFilters, sortColumn, sortDirection, searchKeys, filterable, onFilter, columns]);

  // Paginate
  const paginatedData = useMemo(() => {
    if (!pagination) return filteredData;
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize, pagination]);

  const totalPages = Math.ceil(filteredData.length / pageSize);

  // Handle sort
  const handleSort = (columnKey: string) => {
    const column = columns.find((col) => col.key === columnKey);
    if (!column?.sortable) return;

    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Export to CSV
  const handleExport = () => {
    const headers = exportHeaders || columns.map((col) => col.header);
    const rows = filteredData.map((row) =>
      columns.map((col) => {
        const value = col.accessor(row);
        return value !== null && value !== undefined ? String(value).replace(/,/g, ';') : '';
      })
    );

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${exportFilename}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="table-wrapper">
      <div className="table-toolbar">
        {searchable && (
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="table-search"
          />
        )}

        {filterable && filters.length > 0 && (
          <div className="table-filters">
            {filters.map((filter) => (
              <select
                key={filter.key}
                value={activeFilters[filter.key] || ''}
                onChange={(e) => {
                  setActiveFilters({ ...activeFilters, [filter.key]: e.target.value });
                  setCurrentPage(1);
                }}
                className="table-filter"
              >
                <option value="">All {filter.label}</option>
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ))}
          </div>
        )}

        {exportable && (
          <button onClick={handleExport} className="table-export-btn">
            Export CSV
          </button>
        )}
      </div>

      {loading ? (
        <div className="table-loading">Loading...</div>
      ) : (
        <>
          <div className="table-info">
            Showing {paginatedData.length} of {filteredData.length} entries
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      onClick={() => column.sortable && handleSort(column.key)}
                      className={column.sortable ? 'sortable' : ''}
                    >
                      {column.header}
                      {column.sortable && sortColumn === column.key && (
                        <span className="sort-indicator">
                          {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="table-empty">
                      {emptyMessage}
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((row, index) => (
                    <tr key={index}>
                      {columns.map((column) => (
                        <td key={column.key}>{column.accessor(row)}</td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pagination && totalPages > 1 && (
            <div className="table-pagination">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="pagination-btn"
              >
                Previous
              </button>
              <span className="pagination-info">
                Page {currentPage} of {totalPages}
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
        </>
      )}
    </div>
  );
}

