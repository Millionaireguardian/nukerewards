# Notification Logging System

## Overview

All outgoing Telegram notifications are automatically logged to local files for auditing purposes. This includes:
- Reward alerts (when new reward runs are detected)
- Payout alerts (when new payouts are added)
- Test notifications (from verification script)

**Note:** User commands (`/help`, `/rewards`, `/payouts`, `/holders`, `/export`) are NOT logged.

## Log Files

### Main Log
- **Location:** `logs/notifications.log`
- **Format:** JSON Lines (one JSON object per line)
- **Content:** All notifications (append-only)

### Daily Logs
- **Location:** `logs/notifications-YYYY-MM-DD.log`
- **Format:** Same as main log
- **Purpose:** Daily rotation for easier archival and analysis
- **Example:** `logs/notifications-2025-12-14.log`

## Log Format

Each log entry is a JSON object on a single line:

```json
{
  "timestamp": "2025-12-14T18:46:31.000Z",
  "type": "reward",
  "chat": "@nukerewards",
  "source": "/dashboard/rewards",
  "message": "🆕 New Reward Run Detected!..."
}
```

### Fields

- **timestamp**: ISO 8601 timestamp (UTC)
- **type**: Notification type (`reward`, `payout`, `test`, or `other`)
- **chat**: Target chat ID or username (e.g., `@nukerewards`)
- **source**: Source of the notification (e.g., `/dashboard/rewards`, `verify-notifications.ts`)
- **message**: Notification message content (truncated to 500 characters)

## Safety Features

✅ **Never crashes the bot** - All filesystem operations are wrapped in try/catch
✅ **Auto-creates directory** - `logs/` directory is created automatically if missing
✅ **Message length limit** - Messages are truncated to 500 characters to prevent huge log files
✅ **Silent failures** - Logging errors only produce console warnings, never throw exceptions

## Usage

Logging is automatic and requires no configuration. The logger is integrated into:

1. **Auto-notification system** (`src/bot.ts`)
   - Logs reward notifications when new runs are detected
   - Logs payout notifications when new payouts are added

2. **Verification script** (`verify-notifications.ts`)
   - Logs test notifications when verification runs

## Viewing Logs

### View latest notifications
```bash
tail -f logs/notifications.log
```

### View today's notifications
```bash
cat logs/notifications-$(date +%Y-%m-%d).log
```

### Search for specific notification type
```bash
grep '"type":"reward"' logs/notifications.log
```

### Count notifications by type
```bash
grep -o '"type":"[^"]*"' logs/notifications.log | sort | uniq -c
```

## Example Log Entries

### Reward Notification
```json
{"timestamp":"2025-12-14T18:46:31.000Z","type":"reward","chat":"@nukerewards","source":"/dashboard/rewards","message":"🆕 *New Reward Run Detected!*\n\n📊 *Reward System Status*\n\n*Last Run:* 12/14/2025, 6:46:00 PM\n..."}
```

### Payout Notification
```json
{"timestamp":"2025-12-14T18:47:15.000Z","type":"payout","chat":"@nukerewards","source":"/dashboard/payouts","message":"🆕 *New Payouts Detected!*\n\n+5 payout(s) added.\n\n💰 *Payouts Status*..."}
```

### Test Notification
```json
{"timestamp":"2025-12-14T18:48:00.000Z","type":"test","chat":"@nukerewards","source":"verify-notifications.ts","message":"🧪 *Test Notification*\n\nThis is a verification message..."}
```

## Implementation Details

- **File:** `src/utils/notificationLogger.ts`
- **Export:** `logNotification(params)` function
- **Dependencies:** `fs`, `path` (Node.js built-in)
- **No external dependencies** required

## Notes

- Logs are append-only (no deletion or modification)
- Daily rotation happens automatically based on date
- Both main log and daily log are written simultaneously
- Logging failures do not affect bot operation
- User commands are intentionally NOT logged (privacy)

