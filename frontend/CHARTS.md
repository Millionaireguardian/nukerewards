# Charts & Analytics Implementation

## Overview

The dashboard now includes comprehensive charts and visual analytics using **Recharts** library. All charts auto-refresh every 60 seconds to provide real-time insights.

## Installed Library

- **Recharts** - React charting library built on D3.js
  ```bash
  npm install recharts
  ```

## Chart Components

### 1. Holder Distribution Chart (Pie Chart)
**Component:** `HolderDistributionChart.tsx`

- **Type:** Pie Chart
- **Data Source:** `/dashboard/rewards` endpoint
- **Shows:**
  - Eligible holders (green)
  - Excluded holders (yellow)
  - Blacklisted holders (red)
- **Features:**
  - Percentage labels
  - Color-coded segments
  - Total holders summary
  - Responsive design

### 2. Payout Status Chart (Bar Chart)
**Component:** `PayoutStatusChart.tsx`

- **Type:** Bar Chart
- **Data Source:** `/dashboard/payouts` endpoint
- **Shows:**
  - Pending payouts (yellow)
  - Failed payouts (red)
- **Features:**
  - Side-by-side comparison
  - Total SOL summary
  - Tooltip with formatted values

### 3. Top Holders by USD Value (Bar Chart)
**Component:** `HoldersValueChart.tsx`

- **Type:** Horizontal Bar Chart
- **Data Source:** `/dashboard/holders` endpoint
- **Shows:**
  - Top 20 holders by USD value
  - Color-coded by eligibility status
  - Truncated pubkeys on X-axis
- **Features:**
  - Rotated labels for readability
  - Status-based coloring
  - Total value summary
  - Interactive tooltips

### 4. Reward Trends Chart (Line Chart)
**Component:** `RewardTrendsChart.tsx`

- **Type:** Multi-line Chart
- **Data Source:** `/dashboard/rewards` endpoint (time-series)
- **Shows:**
  - Eligible holders trend (green line)
  - Pending payouts trend (yellow line)
  - Total SOL distributed trend (blue line)
- **Features:**
  - Last 20 data points
  - Dual Y-axis (left: counts, right: SOL)
  - Real-time trend tracking
  - Current values summary

## Layout

### Charts Section
**Component:** `ChartsSection.tsx`

- Wraps all chart components
- Responsive grid layout
- Full-width charts for detailed views
- Side-by-side for comparison charts

### Dashboard Integration

Charts are integrated into the main dashboard between:
1. Reward Summary (top)
2. **Charts Section** (new)
3. Holders Table
4. Payouts Table

## Styling

### Charts.css
- Consistent chart container styling
- Loading and no-data states
- Summary statistics below charts
- Responsive breakpoints

### ChartsSection.css
- Grid layout for chart arrangement
- Full-width option for large charts
- Mobile-responsive adjustments

## Features

### Real-time Updates
- All charts refresh every 60 seconds
- Automatic data fetching
- Smooth transitions

### Error Handling
- Loading states while fetching
- No-data messages when empty
- Console error logging

### Responsive Design
- Mobile-friendly layouts
- Adaptive grid columns
- Readable labels on all screen sizes

### Interactive Elements
- Tooltips on hover
- Legend toggles
- Formatted values
- Color-coded data

## Usage

Charts are automatically displayed when you open the dashboard at `http://localhost:5173`. No additional configuration needed.

### Data Requirements

- **Holder Distribution:** Requires reward statistics
- **Payout Status:** Requires payout data
- **Top Holders:** Requires holder data with USD values
- **Reward Trends:** Builds over time (collects data points)

## Performance

- Charts use `ResponsiveContainer` for optimal rendering
- Data is cached per component
- Efficient re-renders on updates
- Lazy loading of chart libraries

## Future Enhancements

Potential additions:
- Export chart data to CSV/JSON
- Custom date range selection
- More granular filtering
- Additional chart types (area, scatter, etc.)
- Historical data persistence

## Dependencies

- `recharts` - Charting library
- `react` - UI framework
- `typescript` - Type safety

All charts are fully typed with TypeScript for type safety and better developer experience.

