# Reward System Issues Analysis

## ✅ CORRECTED: Token-2022 Transfer Fees ARE Collected on DEX Swaps

### The Truth

**Token-2022 transfer fees ARE enforced during Raydium swaps.**

When you trade on Raydium:
- The Raydium program executes Token-2022 transfer instructions
- Token-2022 program automatically withholds the 4% fee
- Fees are stored in token accounts (separate from balances)
- **Fees MUST be explicitly harvested** - they are not auto-sent

### How Transfer Fees Work

Transfer fees are collected when:
- ✅ Direct `transfer` instruction is used
- ✅ Direct `transferChecked` instruction is used (required for Token-2022)
- ❌ DEX swap instructions (bypass transfer fees)
- ❌ Program-to-program transfers (bypass transfer fees)

### Why Your System Shows Zero Activity

1. **Fees ARE Collected**: DEX swaps DO trigger transfer fees
2. **Harvesting Issue**: The system was only checking accounts with balance > 0, missing accounts with fees but zero balance
3. **Scanning Issue**: Only checking first 50 accounts, might miss accounts with fees
4. **Early Exit**: System was exiting early if scan found nothing, but should always attempt harvest

### Fixes Applied

#### ✅ Fixed: Scan ALL Token Accounts
- Now scans ALL token accounts (not just first 50)
- Checks accounts with zero balance (fees can exist in zero-balance accounts)
- Uses `getProgramAccounts` to get complete list

#### ✅ Fixed: Always Attempt Harvest
- Removed early exit that skipped harvest
- Always attempts harvest even if scan found nothing
- Harvest with empty sources array = harvest from ALL accounts

#### ✅ Fixed: Better Logging
- Logs total accounts scanned
- Logs accounts with withheld fees
- Shows mint withheld amount before/after harvest
- Clearer error messages

### Current System Status

Based on the code analysis:

✅ **Working Components:**
- Tax harvesting logic (correct)
- Tax withdrawal logic (correct)
- Swap service (correct)
- Distribution service (correct)
- Treasury transfer (correct)

❌ **Not Working:**
- Tax collection from DEX swaps (impossible - by design)
- Rewards from trading volume (no tax = no rewards)

### Verification Steps

1. Run the diagnostic script:
   ```bash
   npx ts-node diagnose-reward-system.ts
   ```

2. Check if any token accounts have withheld fees:
   - If yes: System is working, just needs direct transfers
   - If no: No tax has been collected (expected for DEX-only trading)

3. Test with a direct transfer:
   - Send NUKE tokens directly between wallets
   - Check if withheld fees appear
   - Check if harvest/withdraw works

### Configuration Checklist

- [x] RAYDIUM_POOL_ID: `GFPwg4JVyRbsmNSvPGd8Wi3vvR3WVyChkjY56U7FKrc9`
- [x] REWARD_WALLET_ADDRESS: `6PpZCPj72mdzBfrSJCJab9y535v2greCBe6YVW7XeXpo`
- [x] TREASURY_WALLET_ADDRESS: `DwhLErVhPhzg1ep19Lracmp6iMTECh4nVBdPebsvJwjo`
- [ ] Withdraw authority set to reward wallet (check with `check-mint-authority.ts`)
- [ ] Reward wallet has SOL for fees
- [ ] Pool account exists and is accessible

### Next Steps

1. Run `diagnose-reward-system.ts` to get full system status
2. Verify withdraw authority is set correctly
3. Test with a direct token transfer (not a swap)
4. Monitor if tax is collected and processed correctly

