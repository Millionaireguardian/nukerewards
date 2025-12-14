# Dashboard Features & Navigation

## Overview

The dashboard now includes advanced table features, new monitoring pages, and a navigation toolbar with React Router.

## New Features

### 1. Reusable Table Component

**Location:** `src/components/Table.tsx`

A fully-featured, reusable table component with:

- **Search**: Debounced search (300ms) across specified columns
- **Filtering**: Dropdown filters for column values
- **Sorting**: Click column headers to sort (ascending/descending)
- **Pagination**: Configurable page size with navigation
- **Export**: Export filtered/sorted data to CSV
- **Loading States**: Shows loading indicator during data fetch
- **Empty States**: Customizable empty state messages

**Usage:**
```tsx
<Table
  data={dataArray}
  columns={columnDefinitions}
  searchable={true}
  filterable={true}
  exportable={true}
  pagination={true}
  pageSize={50}
/>
```

### 2. Navigation Toolbar

**Location:** `src/components/Toolbar.tsx`

- Sticky navigation bar at top of page
- Active route highlighting
- Responsive design (mobile-friendly)
- Navigation items:
  - Dashboard
  - Analytics
  - Holders
  - Payouts
  - Harvest
  - Distribution

### 3. New Pages

#### Dashboard (`/`)
- Reward Summary cards
- Charts section
- Overview of system status

#### Analytics (`/analytics`)
- All charts and visualizations
- Real-time analytics

#### Holders (`/holders`)
- Full holders table with:
  - Search by pubkey
  - Filter by eligibility status
  - Sort by balance, USD value, status
  - Export to CSV
  - Pagination

#### Payouts (`/payouts`)
- Pending payouts table
- Same advanced features as Holders table

#### Harvest (`/harvest`)
- Reward cycle history
- Shows each harvest cycle with:
  - Timestamp
  - Total/eligible/excluded/blacklisted holders
  - Total SOL distributed
  - Token price
- Summary cards for current status
- Export functionality

#### Distribution (`/distribution`)
- Distribution/payout history
- Shows all payout records with:
  - Recipient pubkey
  - Reward SOL amount
  - Status (pending/failed)
  - Retry count
  - Timestamps
- Filter by status
- Search by pubkey
- Export to CSV

## Table Features

### Search
- Debounced input (300ms delay)
- Searches across specified columns
- Real-time filtering
- Case-insensitive

### Filtering
- Dropdown filters for categorical data
- Multiple filters can be active simultaneously
- "All" option to clear filter

### Sorting
- Click column header to sort
- Visual indicator (↑ ↓) shows sort direction
- Toggle between ascending/descending
- Only sortable columns show indicator

### Pagination
- Configurable page size (default: 50)
- Previous/Next navigation
- Page number display
- Shows "X of Y entries"

### Export
- Exports current filtered/sorted view
- CSV format with headers
- Filename includes date
- Includes all visible columns

## Routing

React Router is configured with the following routes:

- `/` - Dashboard (home)
- `/analytics` - Analytics & Charts
- `/holders` - Holders table
- `/payouts` - Payouts table
- `/harvest` - Harvest cycles
- `/distribution` - Distribution history

## Component Structure

```
src/
├── components/
│   ├── Table.tsx/css          # Reusable table component
│   ├── Toolbar.tsx/css        # Navigation toolbar
│   └── ... (existing components)
├── pages/
│   ├── Dashboard.tsx          # Main dashboard
│   ├── AnalyticsPage.tsx      # Charts page
│   ├── HoldersPage.tsx        # Holders table page
│   ├── PayoutsPage.tsx        # Payouts table page
│   ├── HarvestPage.tsx        # Harvest cycles page
│   └── DistributionPage.tsx   # Distribution history page
└── App.tsx                    # Router setup
```

## Usage Examples

### Using Table Component

```tsx
import { Table } from '../components/Table';
import type { TableColumn } from '../components/Table';

const columns: TableColumn<MyDataType>[] = [
  {
    key: 'name',
    header: 'Name',
    accessor: (row) => row.name,
    sortable: true,
    sortFn: (a, b) => a.name.localeCompare(b.name),
  },
  // ... more columns
];

<Table
  data={myData}
  columns={columns}
  searchable={true}
  searchKeys={['name', 'email']}
  filterable={true}
  filters={[
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
      ],
    },
  ]}
  onFilter={(row, filterKey, filterValue) => {
    if (filterKey === 'status') {
      return row.status === filterValue;
    }
    return true;
  }}
  exportable={true}
  exportFilename="my-data"
  pagination={true}
  pageSize={50}
/>
```

## Real-time Updates

All pages maintain 60-second auto-refresh:
- Data automatically updates
- Tables re-render with new data
- Charts update in real-time
- No manual refresh needed

## Responsive Design

- Mobile-friendly navigation (collapsible on small screens)
- Tables scroll horizontally on mobile
- Filters stack vertically on mobile
- Touch-friendly controls

## TypeScript

All components are fully typed:
- Table props are generic and type-safe
- Column definitions are typed
- API responses are typed
- No `any` types used

## Performance

- Debounced search reduces API calls
- Memoized filtering and sorting
- Efficient re-renders
- Pagination reduces DOM size

## Export Format

CSV exports include:
- Column headers in first row
- All visible data rows
- Formatted values (dates, numbers)
- Filename: `{exportFilename}-{date}.csv`

Example: `token-holders-2024-12-14.csv`

