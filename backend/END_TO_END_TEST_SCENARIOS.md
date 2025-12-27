# End-to-End Test Scenarios

This document describes comprehensive end-to-end test scenarios for the complete reward system.

## Prerequisites

1. Backend server running
2. Environment variables configured
3. Token mint and wallets set up on devnet
4. Sufficient SOL in reward wallet for testing
5. Some token holders exist with balances

## Test Setup

### Environment Configuration for Testing

```bash
# Set test-friendly thresholds (lower than production for testing)
export MIN_PAYOUT_TOKEN=1          # Very low for testing accumulation
export MIN_PAYOUT_USD=0.0001       # Very low for testing
export MIN_TAX_THRESHOLD_TOKEN=100 # Low threshold for testing
export MIN_TAX_THRESHOLD_USD=0.001 # Low threshold for testing
export MAX_HARVEST_TOKEN=1000000   # Low batch threshold for testing
export MAX_HARVEST_USD=100         # Low batch threshold for testing
export BATCH_COUNT=2               # Fewer batches for faster testing
export BATCH_DELAY_TOKEN_MODE=5000 # Shorter delay for testing (5 seconds)
export BATCH_DELAY_USD_MODE=5000   # Shorter delay for testing

# Set mode
export REWARD_VALUE_MODE=TOKEN     # or USD for USD mode testing
```

---

## Test Scenario 1: Below Tax Threshold

### Objective
Verify that tax below minimum threshold is skipped and rolls over to next epoch.

### Setup
1. Set `MIN_TAX_THRESHOLD_TOKEN=10000` (or appropriate value)
2. Ensure collected tax is below threshold (e.g., 5000 tokens)

### Steps
1. Check current tax amount in logs or via `/dashboard/rewards` endpoint
2. Trigger tax processing (wait for scheduler or manually trigger)
3. Observe logs for threshold check

### Expected Results

**Logs to verify:**
```
Tax threshold check (TOKEN mode)
  status: FAILED
  totalTaxAmountHuman: 5.000000
  threshold: 10
  thresholdMet: false
  action: Harvest will be skipped (tax rolling over)
```

**Behavior:**
- ✅ Tax harvest is skipped
- ✅ Tax remains on-chain (not harvested)
- ✅ Next epoch will check again with accumulated tax
- ✅ No swap transaction occurs
- ✅ No distribution occurs
- ✅ Log shows "Tax below minimum threshold, rolling over"

### Verification Commands

```bash
# Check logs for threshold check
grep "Tax threshold check" backend/logs/*.log

# Check tax statistics (should show tax collected but not distributed)
curl http://localhost:3000/dashboard/rewards | jq '.tax'

# Verify no swap signature in recent logs
grep "Swap transaction" backend/logs/*.log | tail -5
```

### Success Criteria
- [ ] Threshold check log shows FAILED status
- [ ] No harvest transaction occurs
- [ ] Tax amount remains on-chain
- [ ] Epoch summary shows harvestStatus: "SKIPPED_THRESHOLD"
- [ ] No distribution occurred

---

## Test Scenario 2: Normal Harvest

### Objective
Verify single harvest executes correctly when tax is above minimum but below batch threshold.

### Setup
1. Set `MIN_TAX_THRESHOLD_TOKEN=1000`
2. Set `MAX_HARVEST_TOKEN=10000000` (high, so no batching)
3. Ensure collected tax is between thresholds (e.g., 50000 tokens)

### Steps
1. Check current tax amount
2. Trigger tax processing
3. Monitor logs for harvest and distribution

### Expected Results

**Logs to verify:**
```
Tax threshold check (TOKEN mode)
  status: PASSED
  totalTaxAmountHuman: 50.000000
  threshold: 1
  thresholdMet: true
  action: Harvest will proceed

Starting SOL distribution to holders
  totalSolLamports: <amount>

📊 Epoch Summary Report
  tax: {
    harvestStatus: "EXECUTED"
    wasBatched: false
    nukeHarvested: "50000"
    solToHolders: "<amount>"
    swapSignature: "<signature>"
    swapSignatureCount: 1
  }
```

**Behavior:**
- ✅ Tax threshold check passes
- ✅ Single harvest executes (no batching)
- ✅ Single swap transaction occurs
- ✅ SOL is distributed to holders
- ✅ Treasury receives 25% of SOL
- ✅ Holders receive 75% of SOL

### Verification Commands

```bash
# Check for single swap signature
curl http://localhost:3000/dashboard/rewards | jq '.tax.lastSwapTx'

# Verify swap signature on Solscan
# Should show single NUKE→SOL swap transaction

# Check distribution results
grep "SOL distribution completed" backend/logs/*.log | tail -1 | jq '.'

# Verify rewards were calculated correctly
grep "Calculated rewards for distribution" backend/logs/*.log | tail -1
```

### Success Criteria
- [ ] Threshold check log shows PASSED status
- [ ] Single harvest executes (not batched)
- [ ] Single swap transaction signature exists
- [ ] Distribution occurs to eligible holders
- [ ] Epoch summary shows harvestStatus: "EXECUTED", wasBatched: false
- [ ] Swap signature count is 1

---

## Test Scenario 3: Batch Harvest

### Objective
Verify batch harvest executes correctly when tax exceeds batch threshold.

### Setup
1. Set `MIN_TAX_THRESHOLD_TOKEN=1000`
2. Set `MAX_HARVEST_TOKEN=100000` (low, to trigger batching)
3. Set `BATCH_COUNT=4`
4. Ensure collected tax exceeds batch threshold (e.g., 500000 tokens)

### Steps
1. Check current tax amount
2. Trigger tax processing
3. Monitor logs for batch execution
4. Verify timing between batches

### Expected Results

**Logs to verify:**
```
Starting batch harvest
  totalAmountHuman: 500.000000
  batchCount: 4
  batchSizeHuman: 125.000000

Executing batch 1/4
  batchNumber: 1
  startTime: <timestamp>

Batch 1/4 completed
  executionTimeMs: <time>
  cumulativeSolHuman: <amount>

Waiting 5000ms before next batch
  batchNumber: 1
  nextBatch: 2

[Batch 2, 3, 4 execute similarly...]

Batch harvest completed
  successfulBatches: 4
  totalExecutionTimeMs: <time>
  averageBatchTimeMs: <time>
```

**Behavior:**
- ✅ Tax threshold check passes
- ✅ Batch harvest is triggered (amount > MAX_HARVEST)
- ✅ 4 batches execute sequentially
- ✅ Correct delay between batches (BATCH_DELAY_TOKEN_MODE)
- ✅ All batches complete successfully
- ✅ Multiple swap signatures generated (one per batch)
- ✅ Total SOL received is correct

### Verification Commands

```bash
# Check for multiple swap signatures (comma-separated)
curl http://localhost:3000/dashboard/rewards | jq '.tax.lastSwapTx'

# Verify all batch logs
grep "Batch.*completed" backend/logs/*.log | tail -4

# Check timing between batches
grep "Waiting.*before next batch" backend/logs/*.log | tail -3

# Verify batch harvest summary
grep "Batch harvest completed" backend/logs/*.log | tail -1 | jq '.'
```

### Success Criteria
- [ ] Batch harvest is triggered
- [ ] 4 batches execute (or configured BATCH_COUNT)
- [ ] Correct delay between batches (BATCH_DELAY_TOKEN_MODE or BATCH_DELAY_USD_MODE)
- [ ] All batches complete successfully
- [ ] Swap signature count matches batch count
- [ ] Epoch summary shows wasBatched: true
- [ ] Total execution time is reasonable (batches × delay + execution time)

---

## Test Scenario 4: Dust Accumulation

### Objective
Verify small rewards accumulate across multiple epochs until threshold is met.

### Setup
1. Set `MIN_PAYOUT_TOKEN=1` (very low for testing)
2. Ensure some holders have very small rewards (below threshold)
3. Have multiple eligible holders

### Steps
1. Run first epoch with small rewards
2. Verify rewards accumulate (check unpaid-rewards.json)
3. Run second epoch with more small rewards
4. Verify accumulated amount increases
5. Continue until accumulated + current >= threshold
6. Verify payout triggers

### Expected Results

**Epoch 1 Logs:**
```
Reward accumulated for wallet
  wallet: <address>
  currentRewardSOL: 0.000050
  previousAccumulatedSOL: 0.000000
  newAccumulatedSOL: 0.000050
  thresholdSOL: 0.001000
  status: ACCUMULATED
  reason: Total (0.000050 SOL) < threshold (0.001000 SOL)
```

**Epoch 2 Logs:**
```
Reward accumulated for wallet
  wallet: <address>
  currentRewardSOL: 0.000030
  previousAccumulatedSOL: 0.000050
  newAccumulatedSOL: 0.000080
  thresholdSOL: 0.001000
  status: ACCUMULATED
```

**Final Epoch (when threshold met) Logs:**
```
SOL payout successful
  wallet: <address>
  amountSOL: 0.001200
  wasAccumulated: true
  accumulatedBeforeClear: 0.000900
  accumulatedCleared: true
  resetStatus: RESET
  status: PAID
```

**Behavior:**
- ✅ Small rewards accumulate in unpaid-rewards.json
- ✅ Accumulated amount persists between epochs
- ✅ Each epoch adds to accumulated amount
- ✅ Payout triggers when accumulated + current >= threshold
- ✅ Accumulated reward is cleared after successful payout
- ✅ Total payout includes both current and accumulated amounts

### Verification Commands

```bash
# Check accumulated rewards after epoch 1
cat unpaid-rewards.json | jq '.unpaidRewards'

# Check accumulated rewards after epoch 2 (should be higher)
cat unpaid-rewards.json | jq '.unpaidRewards'

# Verify accumulation logs
grep "Reward accumulated for wallet" backend/logs/*.log | tail -10

# Verify payout includes accumulated amount
grep "SOL payout successful" backend/logs/*.log | grep "wasAccumulated.*true" | tail -5

# Check that accumulated reward was cleared after payout
# Wallet should not appear in unpaid-rewards.json after successful payout
```

### Success Criteria
- [ ] Rewards accumulate in unpaid-rewards.json
- [ ] Accumulated amounts persist between epochs
- [ ] Accumulation logs show correct amounts
- [ ] Payout triggers when threshold met
- [ ] Payout includes accumulated amount
- [ ] Accumulated reward is cleared after payout
- [ ] Multiple epochs can accumulate before payout

---

## Test Scenario 5: Mode Switching

### Objective
Verify thresholds apply correctly in both TOKEN and USD modes.

### Setup
1. Test in TOKEN mode first
2. Then switch to USD mode
3. Verify threshold calculations differ appropriately

### Steps - TOKEN Mode
1. Set `REWARD_VALUE_MODE=TOKEN`
2. Set `MIN_PAYOUT_TOKEN=60`
3. Restart backend
4. Check threshold calculation in logs

### Steps - USD Mode
1. Set `REWARD_VALUE_MODE=USD`
2. Set `MIN_PAYOUT_USD=0.001`
3. Restart backend
4. Check threshold calculation in logs

### Expected Results

**TOKEN Mode:**
```
📊 Application Configuration
  mode: TOKEN
  minPayoutConfig: { token: 60, usd: 0.001 }

Minimum payout threshold calculated (TOKEN mode)
  mode: TOKEN
  thresholdToken: 60
  nukePriceSOL: <price>
  thresholdSOL: <calculated>
```

**USD Mode:**
```
📊 Application Configuration
  mode: USD
  minPayoutConfig: { token: 60, usd: 0.001 }

Minimum payout threshold calculated (USD mode)
  mode: USD
  thresholdUSD: 0.001
  solToUsdRate: 100
  thresholdSOL: 0.00001
```

**Tax Threshold Check - TOKEN Mode:**
```
Tax threshold check (TOKEN mode)
  status: PASSED
  threshold: 20000
  mode: TOKEN
```

**Tax Threshold Check - USD Mode:**
```
Tax threshold check (USD mode)
  status: PASSED
  threshold: 5
  mode: USD
```

### Verification Commands

```bash
# Check startup configuration log
grep "Application Configuration" backend/logs/*.log | tail -1 | jq '.'

# Check threshold calculation
grep "Minimum payout threshold calculated" backend/logs/*.log | tail -1 | jq '.'

# Check tax threshold in appropriate mode
grep "Tax threshold check.*mode" backend/logs/*.log | tail -1 | jq '.'
```

### Success Criteria
- [ ] Startup log shows correct mode
- [ ] TOKEN mode uses MIN_PAYOUT_TOKEN and MIN_TAX_THRESHOLD_TOKEN
- [ ] USD mode uses MIN_PAYOUT_USD and MIN_TAX_THRESHOLD_USD
- [ ] Threshold calculations are mode-appropriate
- [ ] Tax threshold checks use correct thresholds for mode
- [ ] Batch harvest thresholds use correct mode (MAX_HARVEST_TOKEN vs MAX_HARVEST_USD)

---

## Test Scenario 6: Eligible Wallets Optimization

### Objective
Verify eligible wallets tracking works correctly and optimizes processing.

### Setup
1. Ensure eligible wallets list is populated (via updateEligibleWallets)
2. Have some eligible and some ineligible holders

### Steps
1. Trigger updateEligibleWallets (or wait for automatic update)
2. Run distribution
3. Verify only eligible wallets are processed
4. Check logs for eligible wallets metrics

### Expected Results

**Eligible Wallets Update:**
```
Updating eligible wallets list (periodic update)
  timeSinceLastUpdate: <seconds>

Eligible wallets list updated successfully
  eligibleCount: <count>
  lastUpdated: <timestamp>
```

**Distribution Logs:**
```
Calculated rewards for distribution with accumulation logic
  eligibleWalletsCount: <count>
  eligibleHoldersProcessed: <count>
  rewardsToPay: <count>
  rewardsAccumulated: <count>
```

**Behavior:**
- ✅ Eligible wallets list is updated periodically (every hour)
- ✅ Distribution only processes wallets in eligible list
- ✅ Logs show eligibleWalletsCount vs eligibleHoldersProcessed
- ✅ Processing is faster (only eligible wallets checked)

### Verification Commands

```bash
# Check eligible wallets file
cat eligible-wallets.json | jq '.'

# Check eligible wallets metadata
# (via API or logs)

# Verify distribution uses eligible wallets
grep "eligibleWalletsCount" backend/logs/*.log | tail -1 | jq '.'

# Compare processing time (should be faster with optimization)
grep "SOL distribution completed" backend/logs/*.log | tail -5 | jq '.duration'
```

### Success Criteria
- [ ] Eligible wallets list is created/updated
- [ ] Distribution logs show eligibleWalletsCount
- [ ] Only eligible wallets are processed
- [ ] Processing is optimized (fewer wallets processed)
- [ ] Eligible wallets update runs periodically (hourly)

---

## Test Scenario 7: Error Handling

### Objective
Verify error handling and recovery for various failure scenarios.

### Test Cases

### 7a. Accumulation Write Error
**Setup**: Make unpaid-rewards.json read-only (or disk full scenario)

**Expected:**
```
❌ Failed to accumulate reward (write error)
  wallet: <address>
  error: <error message>
  errorType: Error
  stack: <stack trace>
```

**Behavior:**
- ✅ Error is logged with full details
- ✅ Other wallets continue processing
- ✅ System continues operating

### 7b. Payout Transaction Error
**Setup**: Insufficient balance in reward wallet

**Expected:**
```
Payout skipped: insufficient balance
  wallet: <address>
  reason: INSUFFICIENT_BALANCE
  status: SKIPPED

❌ SOL payout transaction failed
  wallet: <address>
  status: TRANSACTION_FAILED
```

**Behavior:**
- ✅ Failed payout is logged
- ✅ Error details included
- ✅ Other payouts continue
- ✅ Accumulated reward is NOT cleared (payout failed)

### 7c. Threshold Calculation Error
**Setup**: Price service unavailable

**Expected:**
```
Error calculating minimum payout threshold in TOKEN mode
  error: <error message>
  mode: TOKEN
```

**Behavior:**
- ✅ Error is logged
- ✅ Falls back to legacy MIN_SOL_PAYOUT
- ✅ System continues operating

### Verification Commands

```bash
# Check for error logs
grep "❌" backend/logs/*.log | tail -10

# Verify errors don't break the system
# System should continue processing other operations
```

### Success Criteria
- [ ] Errors are logged with full context
- [ ] Errors include stack traces where available
- [ ] System continues operating despite errors
- [ ] Partial failures don't stop entire process

---

## Test Scenario 8: Epoch Summary Report

### Objective
Verify comprehensive epoch summary report contains all required information.

### Steps
1. Run a complete epoch (tax processing + distribution)
2. Check logs for epoch summary report

### Expected Results

```
📊 Epoch Summary Report
  epoch: <timestamp>
  duration: <ms>
  tax: {
    totalCollected: "<amount>"
    harvestStatus: "EXECUTED" | "SKIPPED_THRESHOLD" | "NO_TAX"
    wasBatched: true | false
    nukeHarvested: "<amount>"
    solToHolders: "<amount>"
    solToTreasury: "<amount>"
    swapSignature: "<signature>" | null
    swapSignatureCount: <number>
  }
  payouts: {
    sent: <number>
    skipped: <number>
    failed: <number>
    totalDistributedSOL: "<amount>"
  }
  accumulatedRewards: {
    walletsWithAccumulatedRewards: <number>
    totalPendingRewardsSOL: "<amount>"
  }
  holders: {
    total: <number>
    eligible: <number>
    excluded: <number>
    blacklisted: <number>
  }
  tokenPrice: {
    usd: <price>
  }
```

### Verification Commands

```bash
# Check epoch summary
grep "📊 Epoch Summary Report" backend/logs/*.log | tail -1 | jq '.'

# Verify all sections present
# - tax section
# - payouts section
# - accumulatedRewards section
# - holders section
# - tokenPrice section
```

### Success Criteria
- [ ] Summary report is generated each epoch
- [ ] All sections are present and populated
- [ ] Tax information is accurate
- [ ] Payout statistics are accurate
- [ ] Accumulated rewards statistics are accurate
- [ ] Holder statistics are accurate

---

## Test Execution Checklist

### Pre-Test Setup
- [ ] Backup current state files (reward-state.json, unpaid-rewards.json, eligible-wallets.json)
- [ ] Set test-friendly configuration values
- [ ] Ensure sufficient SOL in reward wallet
- [ ] Document current state for comparison

### During Tests
- [ ] Monitor logs in real-time
- [ ] Capture log output for each scenario
- [ ] Verify expected behaviors occur
- [ ] Note any unexpected behaviors

### Post-Test Verification
- [ ] Restore original configuration
- [ ] Review all logs for errors
- [ ] Verify state files are consistent
- [ ] Document test results

---

## Test Results Template

For each scenario, document:

```markdown
### Scenario X: <Name>
- **Date**: <date>
- **Mode**: TOKEN/USD
- **Configuration**: <relevant config values>
- **Status**: PASS/FAIL/SKIP
- **Notes**: <any issues or observations>
- **Log Excerpts**: <relevant log snippets>
```

---

## Automated Test Script

Run the automated test suite:

```bash
cd backend
npx tsx test-end-to-end-system.ts
```

This verifies:
- Configuration loading
- Unpaid rewards service functionality
- Eligible wallets service functionality
- State file persistence
- Threshold calculations

---

## Manual Testing Notes

Some scenarios require manual setup because they depend on:
- Actual blockchain state (tax amounts on-chain)
- Real transactions (harvesting, swapping, distributing)
- Multiple epochs over time
- Network conditions and timing

For these scenarios, follow the detailed steps in each test scenario above and verify the expected behaviors.

---

## Troubleshooting

### Tests Failing

1. **Check configuration**: Verify environment variables are set correctly
2. **Check logs**: Review error logs for details
3. **Check state files**: Verify state files are not corrupted
4. **Check network**: Ensure RPC connection is working
5. **Check balances**: Ensure wallets have sufficient SOL

### Common Issues

- **Threshold calculation returns null**: Price service unavailable, check RPC connection
- **Accumulation not working**: Check file permissions for unpaid-rewards.json
- **Eligible wallets empty**: Run updateEligibleWallets() manually
- **Tax not harvesting**: Check tax threshold and actual tax amount on-chain
