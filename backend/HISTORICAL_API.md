# Historical Reward Cycles & Export API

## Overview

The backend now supports persistent storage of historical reward cycles and payout records, with export-ready endpoints for frontend analytics and reporting.

## Features

### 1. Historical Reward Cycles Storage

**Service:** `src/services/rewardHistoryService.ts`

- **Storage:** JSON-based file storage (`reward-history.json`)
- **Data Structure:**
  - Reward cycles with full statistics
  - Historical payout records
  - Automatic deduplication (idempotency)
  - Automatic cleanup (keeps last 10,000 entries)

**Reward Cycle Fields:**
```typescript
{
  id: string;                    // ISO timestamp
  timestamp: string;              // ISO string
  totalSOLDistributed: number;
  eligibleHoldersCount: number;
  excludedHoldersCount: number;
  blacklistedHoldersCount: number;
  totalHoldersCount: number;
  tokenPriceUSD: number;
  rewardDetails?: Array<{         // Optional detailed breakdown
    pubkey: string;
    rewardSOL: number;
    eligibilityStatus: 'eligible' | 'excluded' | 'blacklisted';
    retryCount: number;
  }>;
}
```

**Historical Payout Fields:**
```typescript
{
  id: string;                    // Unique identifier
  timestamp: string;              // ISO string
  pubkey: string;
  rewardSOL: number;
  status: 'pending' | 'failed' | 'success';
  retryCount: number;
  queuedAt: string;              // ISO string
  executedAt?: string;           // ISO string (if successful)
  transactionSignature?: string;  // If successful
}
```

### 2. API Endpoints

#### GET `/dashboard/historical/rewards`

Returns historical reward cycles with filters and pagination.

**Query Parameters:**
- `startDate` (optional): ISO date string - filter cycles from this date
- `endDate` (optional): ISO date string - filter cycles until this date
- `limit` (optional, default: 100): Max results per page (max: 1000)
- `offset` (optional, default: 0): Pagination offset

**Response:**
```json
{
  "total": 150,
  "limit": 100,
  "offset": 0,
  "hasMore": true,
  "cycles": [
    {
      "id": "2024-01-15T10:30:00.000Z",
      "timestamp": "2024-01-15T10:30:00.000Z",
      "totalSOLDistributed": 1.234567,
      "eligibleHoldersCount": 45,
      "excludedHoldersCount": 12,
      "blacklistedHoldersCount": 3,
      "totalHoldersCount": 60,
      "tokenPriceUSD": 0.012345,
      "rewardDetails": [...]
    }
  ]
}
```

#### GET `/dashboard/historical/payouts`

Returns historical payout records with filters and pagination.

**Query Parameters:**
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string
- `pubkey` (optional): Filter by holder pubkey
- `status` (optional): Filter by status (`pending`, `failed`, `success`)
- `limit` (optional, default: 100): Max results per page (max: 1000)
- `offset` (optional, default: 0): Pagination offset

**Response:**
```json
{
  "total": 500,
  "limit": 100,
  "offset": 0,
  "hasMore": true,
  "payouts": [
    {
      "id": "abc123...",
      "timestamp": "2024-01-15T10:30:00.000Z",
      "pubkey": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
      "rewardSOL": 0.001234,
      "status": "success",
      "retryCount": 0,
      "queuedAt": "2024-01-15T10:29:00.000Z",
      "executedAt": "2024-01-15T10:30:00.000Z",
      "transactionSignature": "5j7s8K9..."
    }
  ]
}
```

#### GET `/dashboard/export/rewards`

Returns export-ready reward cycles data (CSV/Excel format).

**Query Parameters:**
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string

**Response:**
```json
{
  "format": "csv",
  "count": 150,
  "data": [
    {
      "Timestamp": "2024-01-15T10:30:00.000Z",
      "Total SOL Distributed": "1.234567",
      "Eligible Holders": 45,
      "Excluded Holders": 12,
      "Blacklisted Holders": 3,
      "Total Holders": 60,
      "Token Price USD": "0.012345"
    }
  ],
  "metadata": {
    "exportedAt": "2024-01-15T12:00:00.000Z",
    "dateRange": {
      "start": "2024-01-01",
      "end": "2024-01-15"
    }
  }
}
```

#### GET `/dashboard/export/payouts`

Returns export-ready payout data (CSV/Excel format).

**Query Parameters:**
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string
- `pubkey` (optional): Filter by holder pubkey
- `status` (optional): Filter by status

**Response:**
```json
{
  "format": "csv",
  "count": 500,
  "data": [
    {
      "Timestamp": "2024-01-15T10:30:00.000Z",
      "Recipient Pubkey": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
      "Reward SOL": "0.001234",
      "Status": "success",
      "Retry Count": 0,
      "Queued At": "2024-01-15T10:29:00.000Z",
      "Executed At": "2024-01-15T10:30:00.000Z",
      "Transaction Signature": "5j7s8K9..."
    }
  ],
  "metadata": {
    "exportedAt": "2024-01-15T12:00:00.000Z",
    "dateRange": {
      "start": "2024-01-01",
      "end": "2024-01-15"
    },
    "filters": {
      "pubkey": "all",
      "status": "all"
    }
  }
}
```

### 3. Scheduler Integration

**Automatic History Tracking:**

After each reward distribution run:
1. **Reward Cycle Saved:**
   - Captures all cycle statistics
   - Includes eligible/excluded/blacklisted counts
   - Records token price at time of run
   - Includes optional reward details

2. **Payout Records Saved:**
   - Every payout attempt (success/failed/skipped)
   - Includes transaction signatures for successful transfers
   - Tracks retry counts
   - Records timestamps for queued/executed

**Idempotency:**
- Duplicate cycles are automatically detected and skipped
- Uses ISO timestamp as unique identifier
- Safe to retry failed operations

**Error Handling:**
- History saving errors don't block scheduler
- Logs errors but continues execution
- Graceful degradation if history file is unavailable

### 4. File Structure

```
backend/
├── src/
│   ├── services/
│   │   └── rewardHistoryService.ts    # History persistence & retrieval
│   ├── routes/
│   │   └── historical.ts              # Historical & export endpoints
│   └── scheduler/
│       └── rewardScheduler.ts         # Integrated with history saving
└── reward-history.json                 # Persistent storage (auto-generated)
```

### 5. Usage Examples

#### Fetch Historical Cycles
```bash
# Get last 50 cycles
curl "http://localhost:3000/dashboard/historical/rewards?limit=50"

# Get cycles from date range
curl "http://localhost:3000/dashboard/historical/rewards?startDate=2024-01-01&endDate=2024-01-31"

# Paginated results
curl "http://localhost:3000/dashboard/historical/rewards?limit=100&offset=100"
```

#### Fetch Historical Payouts
```bash
# Get all successful payouts
curl "http://localhost:3000/dashboard/historical/payouts?status=success"

# Get payouts for specific holder
curl "http://localhost:3000/dashboard/historical/payouts?pubkey=7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"

# Get failed payouts in date range
curl "http://localhost:3000/dashboard/historical/payouts?status=failed&startDate=2024-01-01"
```

#### Export Data
```bash
# Export all reward cycles
curl "http://localhost:3000/dashboard/export/rewards"

# Export payouts for date range
curl "http://localhost:3000/dashboard/export/payouts?startDate=2024-01-01&endDate=2024-01-31"
```

### 6. Frontend Integration

The frontend can now:
1. **Display Historical Charts:**
   - Use `/dashboard/historical/rewards` for time-series data
   - Plot trends over time (SOL distributed, holder counts)
   - Filter by date ranges

2. **Show Payout History:**
   - Use `/dashboard/historical/payouts` for detailed payout records
   - Filter by status, holder, date range
   - Display transaction signatures for successful transfers

3. **Export Reports:**
   - Use `/dashboard/export/*` endpoints for CSV/Excel generation
   - Include metadata (export date, filters applied)
   - Ready for direct download or further processing

### 7. Performance Considerations

- **Storage Limits:** Keeps last 10,000 cycles/payouts (configurable)
- **Pagination:** All endpoints support pagination (max 1000 per page)
- **Filtering:** Efficient in-memory filtering for date ranges and status
- **File I/O:** Atomic writes prevent data corruption
- **Error Recovery:** Graceful handling of file system errors

### 8. TypeScript Types

All interfaces are fully typed:
- `RewardCycle` - Historical reward cycle structure
- `HistoricalPayout` - Historical payout record structure
- Export functions return typed arrays
- API responses match TypeScript interfaces

### 9. Logging

All operations are logged:
- Cycle saves: Info level with cycle ID and count
- Payout saves: Info level with count
- Errors: Error level with full context
- API requests: Info level with query params and duration

### 10. Constraints & Safety

- **Read-only endpoints:** No private keys exposed
- **Devnet only:** All SOL transfers on devnet
- **Idempotent:** Safe to retry operations
- **Atomic writes:** Prevents partial data corruption
- **Error isolation:** History errors don't affect scheduler

## Next Steps

1. **Frontend Integration:**
   - Update HistoricalRewardChart to use `/dashboard/historical/rewards`
   - Add payout history table using `/dashboard/historical/payouts`
   - Integrate export endpoints with Excel export functionality

2. **Optional Enhancements:**
   - Database migration (PostgreSQL/MySQL) for production
   - Redis caching for frequently accessed data
   - WebSocket updates for real-time history
   - Scheduled cleanup of old records

All endpoints are production-ready and fully integrated! 🚀

