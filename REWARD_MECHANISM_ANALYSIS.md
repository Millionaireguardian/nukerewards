# Reward Mechanism Analysis

## Current Flow (What Should Happen)

1. **Harvest** ✅ (Working - you see these transactions)
   - Moves withheld tax fees from token accounts → mint
   - Transaction: `harvestWithheldTokensToMint()`

2. **Withdraw** ❓ (This is likely the issue)
   - Moves tokens from mint → reward wallet
   - Transaction: `withdrawWithheldTokensFromMint()`
   - **If this fails, NUKE tokens stay in the mint (not in reward wallet)**

3. **Swap** ❌ (Can't happen if withdraw fails)
   - Swaps NUKE → SOL via Raydium
   - Requires NUKE in reward wallet

4. **Distribute** ❌ (Can't happen if swap fails)
   - Distributes SOL to eligible holders (75%)
   - Sends SOL to treasury (25%)

## Why You're Not Seeing NUKE in Reward Wallet

### Most Likely Issue: Withdraw Step is Failing

Looking at the code, there are several conditions that can cause withdrawal to fail:

1. **Mint withheld amount is zero after harvest** (Line 651-657)
   ```typescript
   if (mintWithheldAfterHarvest === 0n) {
     logger.info('No tokens in mint after harvest - nothing to withdraw');
     return null;
   }
   ```
   - This happens if harvest moves tokens to mint, but mint already had them
   - Or if harvest didn't actually move anything

2. **Withdraw amount is zero** (Line 713-718)
   ```typescript
   if (withdrawnAmount === BigInt(0)) {
     logger.info('No withheld tokens were withdrawn');
     return null;
   }
   ```

3. **Authority mismatch** (Line 705-710)
   - If withdraw authority doesn't match reward wallet

4. **Swap fails** (Line 748-756)
   - If swap fails, distribution is aborted
   - But tokens would still be in reward wallet

## What You Need to Check

### 1. Check Render Logs

Look for these log messages in your Render backend logs:

**If withdraw is failing:**
```
[INFO] No tokens in mint after harvest - nothing to withdraw
```
OR
```
[INFO] No withheld tokens were withdrawn
```
OR
```
[ERROR] Failed to withdraw withheld tokens from mint
```

**If swap is failing:**
```
[ERROR] Failed to swap NUKE to SOL - aborting distribution
```

**If distribution is being skipped:**
```
[INFO] No eligible holders, skipping distribution
```

### 2. Check Mint Withheld Amount

The mint account stores withheld tokens. After harvest, tokens should be in the mint's `withheldAmount` field.

### 3. Check Reward Wallet Balance

Check your reward wallet on Solscan:
- **Address:** `6PpZCPj72mdzBfrSJCJab9y535v2greCBe6YVW7XeXpo`
- Check if it has any NUKE tokens in its token account

## Debugging Steps

### Step 1: Check Recent Logs

Look at your Render logs for the most recent scheduler run (every 5 minutes). Look for:
- `[INFO] Mint withheld amount after harvest`
- `[INFO] Withdrew withheld tokens from mint`
- `[ERROR] Failed to withdraw`

### Step 2: Verify Withdraw Authority

The mint's `withdrawWithheldAuthority` must match your reward wallet address. Check this in your logs:
```
[INFO] Withdraw withheld authority check
```

### Step 3: Check Transaction Details

The harvest transactions you see should move tokens to the mint. Check:
- Does the mint's withheld amount increase after harvest?
- Are tokens actually moving from token accounts to mint?

## Common Issues

### Issue 1: Tokens Already in Mint
If tokens are already in the mint (from previous harvest), the harvest step might not change the mint's withheld amount, causing the withdraw check to think there's nothing to withdraw.

**Solution:** The code should still withdraw if there are tokens in the mint, but the logic might need adjustment.

### Issue 2: Very Small Amounts
If the withdrawn amount is very small (less than minimum swap amount), the swap might fail or be skipped.

**Solution:** Check if withdrawn amounts are above minimum thresholds.

### Issue 3: No Eligible Holders
Even if swap succeeds, if there are no eligible holders, distribution is skipped.

**Solution:** Check if you have eligible holders (minimum holding USD threshold).

## Next Steps

1. **Check Render logs** - Look for withdrawal errors or "nothing to withdraw" messages
2. **Check reward wallet balance** - See if NUKE tokens are accumulating there
3. **Check mint withheld amount** - Verify tokens are in the mint after harvest
4. **Check eligible holders** - Ensure you have holders that meet minimum threshold

Let me know what you find in the logs, and I can help debug further!

