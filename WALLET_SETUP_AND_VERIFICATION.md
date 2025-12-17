# Wallet Setup and Verification Guide

## Reward Flow Clarification

**Important**: The reward wallet does NOT sell NUKE for SOL. Here's how it actually works:

1. **NUKE Tax Collection (4%)**:
   - Trading taxes (4%) are withheld by Token-2022 program
   - Reward wallet harvests these withheld NUKE tokens
   - 3% stays in reward wallet (for future use)
   - 1% goes to treasury wallet

2. **SOL Rewards to Holders**:
   - SOL rewards come from **admin wallet's balance** (not from selling NUKE)
   - Fixed pool: `TOTAL_REWARD_POOL_SOL = 1.0 SOL` per distribution cycle
   - Admin wallet sends SOL directly to eligible holders
   - The NUKE taxes collected are separate and stored in reward wallet

**Summary**: NUKE taxes are collected and stored, but SOL rewards are funded separately from admin wallet.

---

## Wallet Roles

Your reward system uses **three different wallets** with different purposes:

### 1. **Admin Wallet** (`4i2kUSvq1GThxU26MBJZQ2s4DGaeqFuW3sn57738jceF`)
- **Purpose**: Sends SOL payouts to holders
- **Environment Variable**: `ADMIN_WALLET_JSON` (private key as JSON array)
- **Status**: ✅ You funded this with 2 SOL - **correct!**
- **What it does**: When `executePayouts()` runs, it uses this wallet to send SOL to eligible holders

### 2. **Reward Wallet** (`6PpZCPj72mdzBfrSJCJab9y535v2greCBe6YVW7XeXpo`)
- **Purpose**: 
  - **Tax harvesting**: Withdraws withheld NUKE fees from the mint (as `withdrawWithheldAuthority`)
  - **Tax storage**: Receives 3% of collected NUKE taxes (75% of total 4%)
- **Environment Variable**: `REWARD_WALLET_PRIVATE_KEY_JSON` (private key as JSON array)
- **Status**: ⚠️ **Needs verification on Render**
- **What it does**: 
  - Signs `withdrawWithheldTokensFromAccounts()` to harvest taxes
  - Needs SOL for transaction fees (send ~0.1 SOL to this wallet)

### 3. **Treasury Wallet** (default: `DwhLErVhPhzg1ep19Lracmp6iMTECh4nVBdPebsvJwjo`)
- **Purpose**: Receives 1% of collected NUKE taxes (25% of total 4%)
- **Environment Variable**: `TREASURY_WALLET_ADDRESS` (public key only, can be receive-only)
- **Status**: ✅ Should work as receive-only (no private key needed)

---

## Current Issues and Fixes

### Issue 1: SOL Payouts - Pending Payouts Went to 0

**What happened:**
- You had 4 pending payouts totaling 1.0 SOL
- Admin wallet only had 0.0128 SOL → all payouts failed with "Insufficient balance"
- After funding admin wallet with 2 SOL, payouts should work on next run

**What to check:**
1. **Render logs** - Look for:
   ```
   [INFO] Executing payouts {"count":4,"totalRewardSOL":"1.000000","adminBalanceSOL":"2.0xxx"}
   [INFO] Payout successful {"recipient":"...","amountSOL":"0.391174","signature":"..."}
   [INFO] Payout execution completed {"success":4,"failures":0}
   ```

2. **Dashboard**: `https://nukerewards-backend.onrender.com/dashboard/payouts`
   - Check if payouts show `status: "success"` with transaction signatures
   - Check if `pendingPayouts` count decreases after successful execution

3. **Solscan**: Check admin wallet `4i2kUSvq...` on devnet
   - Should see outgoing SOL transfers to holder addresses
   - Each transfer should be ~0.25-0.39 SOL (depending on holder balance)

### Issue 2: Tax Collection Still Showing 0 NUKE

**Why it's still 0:**
- Tax harvesting requires:
  1. ✅ `withdrawWithheldAuthority` set to reward wallet (DONE - verified with `check-mint-authority.ts`)
  2. ⚠️ `REWARD_WALLET_PRIVATE_KEY_JSON` set on Render (NEEDS VERIFICATION)
  3. ⚠️ Reward wallet has SOL for transaction fees (NEEDS FUNDING)
  4. ⚠️ Actual NUKE trades happened AFTER you set the authority (NEEDS VERIFICATION)

**What to check:**

1. **Render Environment Variables** - Verify these are set:
   ```
   REWARD_WALLET_ADDRESS=6PpZCPj72mdzBfrSJCJab9y535v2greCBe6YVW7XeXpo
   REWARD_WALLET_PRIVATE_KEY_JSON=[64 numbers array]
   ```

2. **Fund Reward Wallet** - Send ~0.1 SOL to reward wallet:
   ```
   Address: 6PpZCPj72mdzBfrSJCJab9y535v2greCBe6YVW7XeXpo
   Network: Devnet
   ```

3. **Render Logs** - After next scheduler run, look for:
   ```
   [INFO] Processing withheld tax from Token-2022 transfers
   [INFO] Using reward wallet for tax withdrawal
   [INFO] Harvested withheld tokens to mint {"signature":"..."}
   [INFO] Withdrew withheld tokens {"withdrawnAmount":"...","to":"..."}
   [INFO] Tax distribution calculated from withheld tokens
   [INFO] Tax distribution complete {"totalTax":"...","rewardAmount":"...","treasuryAmount":"..."}
   ```

4. **Verify Trades Happened** - Check if you made NUKE trades AFTER running `setWithdrawAuthority.ts`:
   - If trades happened BEFORE the authority change, those fees are stuck (can't be withdrawn)
   - You need NEW trades after the authority change to accumulate new fees

---

## Verification Checklist

### ✅ Completed
- [x] `withdrawWithheldAuthority` set to reward wallet (verified with `check-mint-authority.ts`)
- [x] Admin wallet funded with 2 SOL
- [x] Scheduler is running (`lastRun` shows timestamps)
- [x] Raydium price integration working (showing price in dashboard)

### ⚠️ Needs Verification
- [ ] `REWARD_WALLET_PRIVATE_KEY_JSON` set on Render
- [ ] Reward wallet funded with ~0.1 SOL for transaction fees
- [ ] New NUKE trades made AFTER authority change
- [ ] Check Render logs for tax harvesting errors

### 🔍 How to Check Render Logs

1. Go to Render dashboard → Your backend service → Logs
2. Search for:
   - `"Processing withheld tax"` - Should appear every 5 minutes
   - `"Withdrew withheld tokens"` - Should show non-zero `withdrawnAmount`
   - `"Tax distribution complete"` - Should show updated totals
   - `"Error processing withheld tax"` - If you see this, check the error message

3. Common errors:
   - `"REWARD_WALLET_PRIVATE_KEY_JSON environment variable is not set"` → Set it on Render
   - `"Insufficient balance"` → Fund reward wallet with SOL
   - `"No withheld tokens were withdrawn"` → No new trades yet, or trades happened before authority change

---

## Next Steps

1. **Verify Render Environment Variables**:
   - Check that `REWARD_WALLET_PRIVATE_KEY_JSON` is set
   - Check that `REWARD_WALLET_ADDRESS` matches `6PpZCPj72mdzBfrSJCJab9y535v2greCBe6YVW7XeXpo`

2. **Fund Reward Wallet**:
   - Send 0.1 SOL to `6PpZCPj72mdzBfrSJCJab9y535v2greCBe6YVW7XeXpo` on devnet

3. **Make New NUKE Trades**:
   - Do a few swaps on Raydium devnet (NUKE ↔ SOL)
   - This will generate new 4% fees that can be harvested

4. **Wait for Next Scheduler Run**:
   - Scheduler runs every 5 minutes
   - Check logs after next run for tax harvesting activity

5. **Check Dashboard**:
   - `https://nukerewards-backend.onrender.com/dashboard/rewards`
   - `tax.totalTaxCollected` should increase
   - `tax.distributionCount` should increase

---

## Summary

- **Admin wallet** (`4i2kUSvq...`) = SOL payouts ✅ Funded
- **Reward wallet** (`6PpZCPj7...`) = Tax harvesting ⚠️ Needs private key + SOL
- **Treasury wallet** = Receives 1% of taxes ✅ Should work as receive-only

Once you verify `REWARD_WALLET_PRIVATE_KEY_JSON` on Render and fund the reward wallet, tax harvesting should start working on the next scheduler run after you make new NUKE trades.

