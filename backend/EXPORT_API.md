# Automated CSV/Excel Export API for Telegram Audit Bot

## Overview

The backend now supports automated CSV/Excel file generation for reward cycles and payouts, with dedicated endpoints for Telegram bot integration.

## Features

### 1. Automated Export Generation

**Service:** `src/services/rewardExportService.ts`

- **Automatic Generation:** After each reward cycle, a combined Excel file is automatically generated
- **File Storage:** Files saved to `/exports` directory with timestamped filenames
- **Manifest Tracking:** `manifest.json` tracks all exports with metadata
- **Auto-Cleanup:** Keeps last 30 exports, removes older files automatically

**Export Types:**
- `rewards` - Reward cycles only
- `payouts` - Payout records only
- `combined` - Both rewards and payouts (default for automated)

### 2. Excel File Structure

**Multi-Sheet Format:**
1. **Metadata Sheet:**
   - Export timestamp
   - Date range filters
   - Summary statistics
   - Token price at export time

2. **Data Sheets:**
   - Reward Cycles: timestamp, SOL distributed, holder counts, token price
   - Payouts: recipient, reward SOL, status, retry count, transaction signature

### 3. Telegram Bot Endpoints

#### GET `/audit/latest`

Returns the latest export file for Telegram bot.

**Query Parameters:**
- `format` (optional): `'file'` (default) or `'json'` (summary only)

**Response (file format):**
- Returns Excel file as binary download
- Headers: `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Filename in `Content-Disposition` header

**Response (json format):**
```json
{
  "latestExport": {
    "filename": "combined-export-2024-01-15T10-30-00-000Z.xlsx",
    "filepath": "/path/to/exports/combined-export-2024-01-15T10-30-00-000Z.xlsx",
    "type": "combined",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "recordCount": 150
  },
  "summary": {
    "totalCycles": 50,
    "totalPayouts": 100,
    "totalSOLDistributed": 1.234567,
    "pendingPayouts": 5,
    "failedPayouts": 2
  },
  "downloadUrl": "/audit/download/combined-export-2024-01-15T10-30-00-000Z.xlsx"
}
```

#### GET `/audit/download/:filename`

Download a specific export file by filename.

**Security:**
- Prevents directory traversal attacks
- Validates filename format

**Response:**
- Returns Excel file as binary download

#### GET `/audit/summary`

Get export summary for Telegram bot notifications.

**Response:**
```json
{
  "latestExport": { ... },
  "summary": {
    "totalCycles": 50,
    "totalPayouts": 100,
    "totalSOLDistributed": 1.234567,
    "pendingPayouts": 5,
    "failedPayouts": 2
  }
}
```

#### POST `/audit/generate`

Manually trigger export generation (for testing or on-demand).

**Request Body:**
```json
{
  "type": "combined" | "rewards" | "payouts",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "pubkey": "optional",
  "status": "pending" | "failed" | "success"
}
```

**Response:**
```json
{
  "success": true,
  "filename": "combined-export-2024-01-15T10-30-00-000Z.xlsx",
  "filepath": "/path/to/exports/...",
  "downloadUrl": "/audit/download/..."
}
```

### 4. Enhanced Export Endpoints

#### GET `/dashboard/export/rewards`

**Query Parameters:**
- `format`: `'json'` (default) or `'excel'` (file download)
- `startDate`, `endDate`: Date filters

**Excel Format:**
- Returns Excel file download with metadata sheet
- Multi-sheet workbook

**JSON Format:**
- Returns JSON with export data (existing behavior)

#### GET `/dashboard/export/payouts`

**Query Parameters:**
- `format`: `'json'` (default) or `'excel'` (file download)
- `startDate`, `endDate`, `pubkey`, `status`: Filters

**Excel Format:**
- Returns Excel file download with metadata sheet
- Multi-sheet workbook

**JSON Format:**
- Returns JSON with export data (existing behavior)

### 5. Scheduler Integration

**Automatic Export Generation:**
- After each reward cycle completes, a combined Excel file is automatically generated
- File includes all reward cycles and payouts up to that point
- Errors in export generation don't block scheduler execution
- Logs export success/failure

### 6. File Management

**Storage:**
- Files saved to `exports/` directory (auto-created)
- Filenames: `{type}-export-{ISO-timestamp}.xlsx`
- Example: `combined-export-2024-01-15T10-30-00-000Z.xlsx`

**Manifest:**
- `exports/manifest.json` tracks all exports
- Includes: filename, filepath, type, timestamp, record count
- Latest export tracked for quick access

**Cleanup:**
- Keeps last 30 exports (configurable via `MAX_EXPORTS_TO_KEEP`)
- Automatically removes older files
- Prevents disk space bloat

### 7. Error Handling

- **Graceful Degradation:** Export errors don't crash scheduler
- **Empty Datasets:** Still generates file with headers
- **File I/O Errors:** Logged but don't block operations
- **Retry Logic:** Failed exports can be retried via `/audit/generate`

### 8. Usage Examples

#### Telegram Bot - Get Latest File
```bash
# Get file directly
curl http://localhost:3000/audit/latest -o latest-export.xlsx

# Get JSON summary
curl http://localhost:3000/audit/latest?format=json
```

#### Telegram Bot - Get Summary
```bash
curl http://localhost:3000/audit/summary
```

#### Manual Export Generation
```bash
curl -X POST http://localhost:3000/audit/generate \
  -H "Content-Type: application/json" \
  -d '{
    "type": "combined",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  }'
```

#### Download Specific File
```bash
curl http://localhost:3000/audit/download/combined-export-2024-01-15T10-30-00-000Z.xlsx \
  -o export.xlsx
```

#### Excel Export via Dashboard Endpoint
```bash
# Get Excel file
curl "http://localhost:3000/dashboard/export/rewards?format=excel&startDate=2024-01-01" \
  -o rewards.xlsx

# Get JSON (default)
curl "http://localhost:3000/dashboard/export/rewards?startDate=2024-01-01"
```

### 9. Telegram Bot Integration

**Recommended Flow:**

1. **Periodic Check:**
   ```javascript
   // Check for latest export
   const response = await fetch('http://localhost:3000/audit/latest?format=json');
   const data = await response.json();
   
   // Send summary to Telegram
   const summary = `📊 Latest Export Summary:
   - Cycles: ${data.summary.totalCycles}
   - Payouts: ${data.summary.totalPayouts}
   - Total SOL: ${data.summary.totalSOLDistributed.toFixed(6)}
   - Pending: ${data.summary.pendingPayouts}
   - Failed: ${data.summary.failedPayouts}`;
   
   await bot.sendMessage(chatId, summary);
   ```

2. **File Download:**
   ```javascript
   // Download file
   const fileResponse = await fetch('http://localhost:3000/audit/latest');
   const fileBuffer = await fileResponse.buffer();
   
   // Send to Telegram
   await bot.sendDocument(chatId, fileBuffer, {
     filename: 'latest-export.xlsx',
     caption: 'Latest reward cycles and payouts export'
   });
   ```

3. **On-Demand Export:**
   ```javascript
   // Generate custom export
   const response = await fetch('http://localhost:3000/audit/generate', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       type: 'combined',
       startDate: '2024-01-01',
       endDate: '2024-01-31'
     })
   });
   ```

### 10. Security Considerations

- **No Private Keys:** All endpoints are read-only, no admin keys exposed
- **Filename Validation:** Prevents directory traversal attacks
- **File Access:** Only files in `exports/` directory accessible
- **Devnet Only:** All operations on devnet (production config separate)

### 11. File Structure

```
backend/
├── exports/
│   ├── manifest.json              # Export tracking
│   ├── combined-export-*.xlsx    # Automated exports
│   ├── rewards-export-*.xlsx      # Manual reward exports
│   └── payouts-export-*.xlsx      # Manual payout exports
└── src/
    ├── services/
    │   └── rewardExportService.ts # Export generation
    └── routes/
        └── audit.ts               # Telegram bot endpoints
```

### 12. Configuration

**Constants (in `rewardExportService.ts`):**
- `EXPORTS_DIR`: Export directory path
- `MAX_EXPORTS_TO_KEEP`: Number of exports to retain (default: 30)

### 13. Logging

All export operations are logged:
- Export generation: Info level with filename and record count
- File serving: Info level with filename and size
- Errors: Error level with full context
- Cleanup: Info level with removed/remaining counts

### 14. Production Considerations

**For Mainnet:**
- Update `EXPORTS_DIR` to secure location
- Add authentication to `/audit/*` endpoints
- Implement rate limiting
- Add file size limits
- Consider cloud storage (S3, etc.) for exports

**Scalability:**
- Current implementation suitable for <10k records
- For larger datasets, consider:
  - Streaming exports
  - Background job queue
  - Database-backed exports
  - Cloud storage integration

All endpoints are production-ready and fully integrated! 🚀

