# Diagnose Tax Distribution Issue

## Quick Diagnostic Steps

### 1. Check Render Logs

Look for the most recent scheduler run (every 5 minutes). Search for these key messages:

**Harvest Status:**
```
[INFO] Harvest completed - verifying results
[INFO] ✅ Harvest successfully moved tokens to mint
```

**Withdrawal Status:**
```
[INFO] Mint withheld amount after harvest
[INFO] Tokens found in mint after harvest - proceeding with withdrawal
[INFO] Withdrew withheld tokens from mint
```

**OR (if failing):**
```
[INFO] No tokens in mint after harvest - nothing to withdraw
[ERROR] Failed to withdraw withheld tokens from mint
[INFO] No withheld tokens were withdrawn
```

**Swap Status:**
```
[INFO] NUKE swapped to SOL successfully
```

**OR (if failing):**
```
[ERROR] Failed to swap NUKE to SOL - aborting distribution
```

**Distribution Status:**
```
[INFO] SOL distribution to holders completed
```

**OR (if skipped):**
```
[INFO] No eligible holders, skipping distribution
```

### 2. Check Mint Withheld Amount

The mint account should show withheld tokens. Check:
- Solscan: https://solscan.io/token/CzPWFT9ezPy53mQUj48T17Jm4ep7sPcKwjpWw9tACTyq?cluster=devnet
- Look for "Withheld Amount" in the token metadata

### 3. Check Reward Wallet Balance

Check your reward wallet on Solscan:
- Address: `6PpZCPj72mdzBfrSJCJab9y535v2greCBe6YVW7XeXpo`
- Token Account: Should show NUKE token balance
- If balance is 0, tokens are not being withdrawn from mint

### 4. Expected Behavior

**Working Flow:**
1. ✅ Harvest: Token accounts → Mint (you see these transactions)
2. ❓ Withdraw: Mint → Reward Wallet (should happen but might be failing)
3. ❌ Swap: NUKE → SOL (can't happen if withdraw fails)
4. ❌ Distribute: SOL to holders (can't happen if swap fails)

## Most Likely Issues

### Issue 1: Withdraw Authority Mismatch
**Symptom:** `[ERROR] Failed to withdraw withheld tokens from mint` with authority error

**Solution:** The mint's `withdrawWithheldAuthority` must match the reward wallet address.

### Issue 2: Tokens Already Withdrawn
**Symptom:** `[INFO] No tokens in mint after harvest - nothing to withdraw`

**Solution:** Tokens might already be in reward wallet from a previous cycle. Check reward wallet balance.

### Issue 3: Very Small Amounts
**Symptom:** Withdraw succeeds but swap fails because amount is too small

**Solution:** Check minimum swap threshold in logs.

### Issue 4: No Eligible Holders
**Symptom:** Swap succeeds but distribution is skipped

**Solution:** Check if you have holders meeting minimum USD threshold.

## What to Share

Please share the relevant log lines from your Render backend logs for the most recent scheduler run. Look for:
- Harvest results
- Mint withheld amount after harvest
- Withdrawal success/failure
- Swap success/failure
- Distribution results

This will help identify exactly where the flow is breaking!

