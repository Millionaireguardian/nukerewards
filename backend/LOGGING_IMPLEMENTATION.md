# Comprehensive Logging Implementation

## Overview

This document describes the comprehensive logging system added to track all operations, errors, and epoch summaries for the reward system.

## Logging Features Added

### 1. Startup Configuration Logging

**Location**: `backend/src/index.ts` - `logStartupConfiguration()`

Logs on application startup:
- Mode status (TOKEN or USD)
- Minimum payout configuration
- Tax threshold configuration
- Batch harvest configuration

**Example Log**:
```
📊 Application Configuration
  mode: TOKEN
  minPayoutConfig: { token: 60, usd: 0.001 }
  taxThresholdConfig: { token: 20000, usd: 5 }
  batchHarvestConfig: { maxHarvestToken: 12000000, ... }
```

### 2. Tax Threshold Check Logging

**Location**: `backend/src/services/taxService.ts` - `checkMinimumTaxThreshold()`

Enhanced logging includes:
- Status: PASSED or FAILED
- Current tax amount
- Threshold value
- Mode (TOKEN/USD/fallback)
- Action taken (Harvest will proceed/skip)

**Example Log**:
```
Tax threshold check (TOKEN mode)
  status: PASSED
  totalTaxAmountHuman: 25000.000000
  threshold: 20000
  thresholdMet: true
  action: Harvest will proceed
```

### 3. Batch Harvest Execution Logging

**Location**: `backend/src/services/taxService.ts` - `executeBatchHarvest()`

Enhanced logging includes:
- Batch start time and total time
- Per-batch execution time
- Batch number, amount, and SOL received
- Cumulative SOL received
- Success/failure status for each batch
- Average batch execution time

**Example Log**:
```
Starting batch harvest
  totalAmountHuman: 5000000.000000
  batchCount: 4
  startTime: 2025-01-15T10:00:00.000Z

Executing batch 1/4
  batchNumber: 1
  batchAmountHuman: 1250000.000000
  startTime: 2025-01-15T10:00:01.000Z

Batch 1/4 completed
  batchNumber: 1
  solReceivedHuman: 1.250000
  executionTimeMs: 2500
  cumulativeSolHuman: 1.250000

Batch harvest completed
  successfulBatches: 4
  totalExecutionTimeMs: 15000
  averageBatchTimeMs: 3750
```

### 4. Reward Accumulation Logging

**Location**: `backend/src/services/solDistributionService.ts`

Enhanced logging includes:
- Wallet address
- Current reward amount
- Previous accumulated amount
- New accumulated amount
- Total reward (current + accumulated)
- Threshold value
- Status: ACCUMULATED
- Reason for accumulation

**Example Log**:
```
Reward accumulated for wallet
  wallet: ABC123...
  currentRewardSOL: 0.000050
  previousAccumulatedSOL: 0.000080
  newAccumulatedSOL: 0.000130
  thresholdSOL: 0.001000
  status: ACCUMULATED
  reason: Total (0.000130 SOL) < threshold (0.001000 SOL)
```

### 5. Payout Skip Logging

**Location**: `backend/src/services/solDistributionService.ts`

Two types of skip logs:

#### A. Below Dust Limit
```
Payout skipped: below dust limit
  wallet: ABC123...
  currentRewardSOL: 0.000001
  dustLimitSOL: 0.0001
  reason: BELOW_DUST_LIMIT
```

#### B. Insufficient Balance
```
Payout skipped: insufficient balance
  wallet: ABC123...
  amountSOL: 0.050000
  availableSOL: 0.020000
  requiredSOL: 0.050005
  shortfallSOL: 0.030005
  accumulatedRewardSOL: 0.010000
  wasAccumulated: true
  reason: INSUFFICIENT_BALANCE
  status: SKIPPED
```

#### C. All Skipped Summary
```
No holders meet minimum payout threshold (including accumulated rewards)
  minPayoutThresholdSOL: 0.001000
  totalEligibleHolders: 100
  accumulatedCount: 45
  totalAccumulatedSOL: 0.045000
  status: ALL_SKIPPED
```

### 6. Successful Payout Logging

**Location**: `backend/src/services/solDistributionService.ts`

Enhanced logging includes:
- Wallet address
- Amount paid (SOL and lamports)
- Transaction signature
- Whether payment included accumulated rewards
- Accumulated amount before clear
- Reset status (RESET or CLEAR_FAILED)
- Status: PAID

**Example Log**:
```
SOL payout successful
  wallet: ABC123...
  amountSOL: 0.050000
  signature: 5KJp8v...
  wasAccumulated: true
  accumulatedBeforeClear: 0.010000
  accumulatedCleared: true
  resetStatus: RESET
  status: PAID
```

### 7. Epoch Summary Report

**Location**: `backend/src/scheduler/rewardScheduler.ts`

Comprehensive summary logged at end of each epoch:

**Example Log**:
```
📊 Epoch Summary Report
  epoch: 2025-01-15T10:00:00.000Z
  duration: 4523ms
  tax: {
    totalCollected: "5000000"
    harvestStatus: "EXECUTED"
    wasBatched: false
    nukeHarvested: "5000000"
    solToHolders: "3.750000"
    solToTreasury: "1.250000"
    swapSignature: "5KJp8v..."
    swapSignatureCount: 1
  }
  payouts: {
    sent: 45
    skipped: 12
    failed: 0
    totalDistributedSOL: "3.750000"
  }
  accumulatedRewards: {
    walletsWithAccumulatedRewards: 67
    totalPendingRewardsSOL: "0.125000"
  }
  holders: {
    total: 1000
    eligible: 150
    excluded: 800
    blacklisted: 50
  }
  tokenPrice: {
    usd: 0.000012
  }
```

**Harvest Status Values**:
- `EXECUTED` - Tax harvested and distributed
- `HARVESTED_ONLY` - Tax harvested but not distributed
- `SKIPPED_THRESHOLD` - Tax below threshold, skipped
- `NO_TAX` - No tax collected

### 8. Error Tracking

All errors are logged with:
- Error message
- Error type
- Stack trace (when available)
- Context (wallet, amounts, etc.)
- Status code/type

#### A. Accumulation Write Errors

**Location**: `backend/src/services/unpaidRewardsService.ts` and `solDistributionService.ts`

```
❌ Failed to accumulate reward (write error)
  wallet: ABC123...
  amount: 0.000050
  previousAmount: 0.000080
  error: Failed to save unpaid rewards state
  errorType: Error
  stack: ...
```

#### B. Payout Transaction Errors

**Location**: `backend/src/services/solDistributionService.ts`

```
❌ SOL payout transaction failed
  wallet: ABC123...
  amountSOL: 0.050000
  wasAccumulated: true
  error: Insufficient balance
  errorType: Error
  stack: ...
  status: TRANSACTION_FAILED
```

#### C. Accumulated Reward Clear Errors

**Location**: `backend/src/services/solDistributionService.ts`

```
❌ Failed to clear accumulated reward after payout (write error)
  wallet: ABC123...
  accumulatedAmountBeforeClear: 0.010000
  error: Failed to save unpaid rewards state
  errorType: Error
  stack: ...
  status: CLEAR_FAILED
```

#### D. Threshold Calculation Errors

**Location**: `backend/src/config/constants.ts` - `getMinimumPayoutThreshold()`

```
Error calculating minimum payout threshold in TOKEN mode
  error: NUKE price unavailable
  mode: TOKEN
  thresholdToken: 60
```

## Log Levels Used

- **INFO**: Normal operations, summary reports, successful operations
- **WARN**: Recoverable issues, skipped operations, fallbacks
- **DEBUG**: Detailed debugging information (threshold calculations, cache hits)
- **ERROR**: Failures, errors that affect functionality (❌ prefix for critical errors)

## Log Structure

All logs follow a consistent structure:
- Structured JSON-like format for easy parsing
- Timestamps included where relevant
- Context information (wallet, amounts, modes)
- Status indicators (PASSED/FAILED, PAID/SKIPPED, etc.)
- Error details with stack traces for debugging

## Testing

To verify logging is working:

1. **Check startup logs**: Look for "📊 Application Configuration" on server start
2. **Check threshold logs**: Look for "Tax threshold check" with PASSED/FAILED status
3. **Check batch harvest logs**: Look for "Starting batch harvest" and per-batch logs
4. **Check accumulation logs**: Look for "Reward accumulated for wallet" with full details
5. **Check payout logs**: Look for "SOL payout successful" or "Payout skipped" logs
6. **Check epoch summary**: Look for "📊 Epoch Summary Report" at end of each epoch
7. **Check error logs**: Look for "❌" prefixed error logs with full error details

## Files Modified

1. `backend/src/index.ts` - Startup configuration logging
2. `backend/src/services/taxService.ts` - Tax threshold and batch harvest logging
3. `backend/src/services/solDistributionService.ts` - Accumulation and payout logging
4. `backend/src/services/unpaidRewardsService.ts` - Accumulation write error logging
5. `backend/src/scheduler/rewardScheduler.ts` - Epoch summary report
6. `backend/src/config/constants.ts` - Threshold calculation error logging

## Notes

- No business logic was modified, only logging added
- All logs use structured logging format for easy parsing
- Error logs include full context for debugging
- Summary reports provide comprehensive epoch overview
- All timing information included for performance monitoring
