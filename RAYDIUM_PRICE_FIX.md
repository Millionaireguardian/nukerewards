# Raydium Price Fetch Fix

## Issue
- Telegram bot showing "Price: N/A (Raydium)"
- Dashboard not loading price correctly
- Price service not correctly fetching from Raydium devnet pool

## Solution

### 1. Rewrote `backend/src/services/priceService.ts`

**Direct Raydium Pool Fetching:**
- Reads `RAYDIUM_POOL_ID` from environment variables
- Directly fetches pool account and extracts vault addresses
- Fetches vault token accounts using correct program IDs:
  - NUKE token: `TOKEN_2022_PROGRAM_ID`
  - WSOL token: `TOKEN_PROGRAM_ID`
- Calculates price: `price_SOL = vault_SOL_balance / vault_NUKE_balance` (adjusted for decimals)

**Key Features:**
- Direct pool account parsing (no dependency on raydiumService)
- Handles both TOKEN and TOKEN_2022 program IDs
- Proper error handling and logging
- Returns `{ price: number | null, source: 'raydium' | null }`

**Logging:**
- Success: `"NUKE token price fetched from Raydium: {price} SOL"`
- Failure: `"Raydium pool not available"` or specific error messages

### 2. Updated `backend/src/routes/dashboard.ts`

- `/dashboard/rewards` endpoint now correctly returns `tokenPrice.sol`
- Validates price is not null and > 0 before returning
- Better error handling for price fetch failures

### 3. Updated `telegram-bot/src/index.ts`

- Prioritizes `tokenPrice.sol` from backend response
- Better fallback logic if price unavailable
- Clearer error message: `"Price: N/A (Raydium pool unavailable)"`

## Price Calculation

```typescript
// Step 1: Get pool ID from environment
const poolId = getRaydiumPoolId(); // From RAYDIUM_POOL_ID env var

// Step 2: Fetch pool account and extract vault addresses
const vaults = await getRaydiumPoolVaults(connection, poolId);

// Step 3: Fetch vault token accounts
const nukeVault = await getAccount(connection, vaults.baseVault, 'confirmed', TOKEN_2022_PROGRAM_ID);
const solVault = await getAccount(connection, vaults.quoteVault, 'confirmed', TOKEN_PROGRAM_ID);

// Step 4: Calculate price
const nukeAmount = Number(nukeVault.amount) / Math.pow(10, nukeDecimals);
const solAmount = Number(solVault.amount) / Math.pow(10, solDecimals);
const price = solAmount / nukeAmount; // SOL per NUKE
```

## Environment Variables Required

- `RAYDIUM_POOL_ID` - Raydium devnet pool ID (e.g., `GFPwg4JVyRbsmNSvPGd8Wi3vvR3WVyChkjY56U7FKrc9`)
- `TOKEN_MINT` - NUKE token mint address
- `SOLANA_NETWORK` - Should be 'devnet'

## Testing

1. **Verify Environment Variables:**
   ```bash
   echo $RAYDIUM_POOL_ID
   echo $TOKEN_MINT
   ```

2. **Check Backend Logs:**
   - Look for: `"Fetching NUKE price from Raydium pool"`
   - Success: `"NUKE token price fetched from Raydium: {price} SOL"`
   - Failure: Check error messages for specific issues

3. **Test Dashboard Endpoint:**
   ```bash
   curl https://your-backend-url/dashboard/rewards
   ```
   Should return `tokenPrice.sol` with a valid number

4. **Test Telegram Bot:**
   - Send `/rewards` command
   - Should show: `• Price: 0.00001234 SOL (Raydium)`
   - Should NOT show: `• Price: N/A`

## Error Handling

- **Pool ID not set:** Returns `{ price: null, source: null }`
- **Pool account not found:** Returns `{ price: null, source: 'raydium' }`
- **Vault accounts not found:** Returns `{ price: null, source: 'raydium' }`
- **Vault balances are zero:** Returns `{ price: null, source: 'raydium' }`
- **Calculation error:** Logs error and returns `{ price: null, source: null }`

## Files Changed

1. `backend/src/services/priceService.ts` - Complete rewrite for direct Raydium fetching
2. `backend/src/routes/dashboard.ts` - Updated price validation
3. `telegram-bot/src/index.ts` - Improved price display logic

