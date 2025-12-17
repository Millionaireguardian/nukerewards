# Log Optimization Summary

## Changes Made

Reduced log verbosity to focus on **rewards system operations** while keeping important information visible.

### What's Now `logger.debug` (Hidden in Production)

- **Price fetching**: Raydium API calls, price cache hits, price calculations
- **Dashboard API calls**: GET requests to `/dashboard/holders` and `/dashboard/rewards`
- **Holder fetching**: Token account enumeration, eligibility filtering details
- **Non-critical warnings**: Price fetch failures (errors still shown)

### What Stays `logger.info` (Always Visible)

**Reward Scheduler:**
- ✅ `Starting reward distribution run`
- ✅ `Eligible holders` (count)
- ✅ `Computed rewards` (count and total SOL)
- ✅ `Queued pending payouts`
- ✅ `Processing withheld tax from Token-2022 transfers`
- ✅ `Tax distribution completed`
- ✅ `Reward distribution run completed`

**Payout Execution:**
- ✅ `Executing payouts` (count, total SOL, admin balance)
- ✅ `Executing SOL transfer` (recipient, amount)
- ✅ `Payout successful` (signature)
- ✅ `Payout failed, will retry` (error details)
- ✅ `Payout execution completed` (summary with success/failure counts)

**Tax Harvesting:**
- ✅ `Processing withheld tax from Token-2022 transfers`
- ✅ `Harvested withheld tokens to mint`
- ✅ `Withdrew withheld tokens` (amount and destination)
- ✅ `Tax distribution calculated from withheld tokens`
- ✅ `Tax distribution complete` (totals)

**Errors:**
- ✅ All `logger.error()` calls remain visible
- ✅ Critical warnings remain visible

## Result

Your Render logs will now show:
- **Clear reward cycle milestones** (when runs start, eligible holders, rewards computed)
- **Payout execution details** (who got paid, transaction signatures, failures)
- **Tax harvesting activity** (when taxes are collected and distributed)
- **Errors and warnings** (anything that needs attention)

**Hidden:**
- Routine price API calls
- Dashboard page loads
- Holder enumeration details
- Cache operations

## Viewing Debug Logs

If you need to see debug logs for troubleshooting, set:
```
NODE_ENV=development
```

This will show all `logger.debug()` messages in addition to info/warn/error.

