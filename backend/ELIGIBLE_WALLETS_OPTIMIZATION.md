# Eligible Wallets Tracking Optimization

## Overview

This optimization tracks only reward-eligible wallets to reduce unnecessary processing during reward calculations. Instead of scanning all holders and checking eligibility criteria every distribution cycle, the system maintains a cached list of eligible wallets that is updated periodically.

## Files Created

1. **`backend/src/services/eligibleWalletsService.ts`** - Service for tracking eligible wallets

## Key Features

### 1. Eligible Wallets Tracking List

- **Storage**: `eligible-wallets.json` (in backend directory)
- **Format**: JSON file with structure:
  ```json
  {
    "eligibleWallets": ["wallet1", "wallet2", ...],
    "lastUpdated": 1234567890,
    "totalHolders": 1000,
    "eligibleCount": 150
  }
  ```
- **In-Memory Cache**: 5-minute TTL to avoid repeated file reads

### 2. Update Function

**`updateEligibleWallets(minHoldingUSD?)`**
- Scans all token holders
- Applies eligibility criteria (same as `getEligibleHolders`):
  - Not blacklisted
  - Holding value >= MIN_HOLDING_SOL (converted from MIN_HOLDING_USD)
- Updates the eligible wallets list
- Saves to persistent storage
- Returns count of eligible wallets

### 3. Reward Calculation Optimization

The `distributeSolToHolders()` function now:
- Uses `getEligibleWalletsWithUnpaidRewards()` instead of `getEligibleHolders()`
- Filters token holders to only those in the eligible wallets set
- Reduces processing by skipping ineligible holders entirely

### 4. Integration with Unpaid Rewards

**`getEligibleWalletsWithUnpaidRewards()`**
- Merges eligible wallets with wallets that have unpaid rewards
- Ensures accumulated rewards are checked for all relevant wallets
- Even if a wallet becomes ineligible, it's still checked if it has unpaid rewards

### 5. Periodic Updates

- Updates run every **1 hour** (not every distribution cycle)
- Integrated into reward scheduler
- Prevents unnecessary scans while keeping list current

## Benefits

1. **Performance**: Only processes eligible wallets, not all holders
2. **Reduced RPC Calls**: Eligibility checks happen periodically, not every distribution
3. **Consistency**: Same eligibility criteria as before (no changes)
4. **Persistence**: Eligible wallets list survives server restarts
5. **Caching**: In-memory cache reduces file I/O

## Implementation Details

### Eligibility Criteria (Unchanged)

- Not blacklisted (`isBlacklisted()` check)
- Holding value >= MIN_HOLDING_SOL
  - Converted from MIN_HOLDING_USD using fixed devnet rate (100 SOL = 1 USD)
  - Uses NUKE price in SOL from Raydium

### Distribution Flow

1. Get eligible wallets set (from cache/file)
2. Merge with wallets that have unpaid rewards
3. Fetch all token holders (still needed for balances)
4. Filter holders to only those in eligible wallets set
5. Process rewards only for filtered holders

### Update Schedule

- **Update Interval**: 1 hour (`ELIGIBLE_WALLETS_UPDATE_INTERVAL`)
- **Trigger**: Automatically in reward scheduler
- **On First Run**: Updates immediately if list is empty or stale

## Exported Functions

### From `eligibleWalletsService.ts`

- `updateEligibleWallets(minHoldingUSD?)` - Update the eligible wallets list
- `getEligibleWallets()` - Get eligible wallets as Set
- `getEligibleWalletsArray()` - Get eligible wallets as array
- `isEligibleWallet(wallet)` - Check if a wallet is eligible
- `getEligibleWalletsWithUnpaidRewards()` - Merge with unpaid rewards wallets
- `getEligibleWalletsMetadata()` - Get metadata (count, last updated)

## Files Modified

1. **`backend/src/services/solDistributionService.ts`**
   - Changed to use `getEligibleWalletsWithUnpaidRewards()` instead of `getEligibleHolders()`
   - Filters token holders to eligible wallets only

2. **`backend/src/scheduler/rewardScheduler.ts`**
   - Added periodic call to `updateEligibleWallets()`
   - Updates every hour (configurable via `ELIGIBLE_WALLETS_UPDATE_INTERVAL`)

## Backward Compatibility

- Eligibility criteria unchanged
- Payout amounts unchanged
- Existing eligibility logic preserved
- Graceful fallback if eligible wallets list is empty

## Performance Impact

**Before**: 
- Scan all holders every distribution
- Check eligibility for every holder every time
- Process all holders through reward calculation

**After**:
- Scan all holders once per hour (update phase)
- Filter to eligible wallets only (instant lookup)
- Process only eligible holders in reward calculation

**Expected Improvement**:
- ~90% reduction in eligibility checks during distribution
- Faster distribution cycles
- Lower RPC usage for eligibility checks

## Testing

To test the optimization:

1. **Initial Update**: Run `updateEligibleWallets()` manually or wait for automatic update
2. **Verify List**: Check `eligible-wallets.json` contains expected wallets
3. **Distribution**: Run distribution and verify only eligible wallets are processed
4. **Logs**: Check logs for "eligibleWalletsCount" and "eligibleHoldersProcessed" metrics
5. **Accuracy**: Verify reward calculations remain accurate

## Configuration

Update interval can be modified by changing:
```typescript
const ELIGIBLE_WALLETS_UPDATE_INTERVAL = 60 * 60 * 1000; // 1 hour
```

In `backend/src/scheduler/rewardScheduler.ts`

## Notes

- Eligibility criteria remain unchanged
- Payout amounts and calculations remain unchanged
- The optimization only changes which wallets are processed, not how rewards are calculated
- Wallets with unpaid rewards are always included, even if not currently eligible
