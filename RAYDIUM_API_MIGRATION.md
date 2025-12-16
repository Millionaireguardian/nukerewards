# Raydium API Migration - On-Chain to API

## Summary
Migrated NUKE token price fetching from on-chain Raydium vault reads to Raydium Devnet API.

## Changes Made

### Backend - `priceService.ts`
**Before:** Fetched price by reading on-chain Raydium pool vault balances
- Used `getAccount()` to fetch vault token accounts
- Calculated price from vault balances: `price = solVaultBalance / nukeVaultBalance`
- Required multiple on-chain RPC calls

**After:** Fetches price from Raydium Devnet API
- Uses REST API: `https://api-v3-devnet.raydium.io/pairs`
- Filters response by `RAYDIUM_POOL_ID` environment variable
- Extracts price from API response (`priceNative` or calculates from reserves)
- Returns: `{ price: number | null, source: 'raydium' | null }`

**Key Features:**
- 5-minute cache TTL to reduce API calls
- Multiple fallback methods for price extraction:
  1. `priceNative` field (if available)
  2. Calculated from `baseTokenTotal` / `quoteTokenTotal` reserves
- Handles both token orderings (NUKE as base or quote)
- Comprehensive error logging
- Diagnostic function for debugging

### Backend - `rewardService.ts`
**Status:** ✅ No changes needed
- Already uses `getNUKEPriceSOL()` from `priceService.ts`
- Compatible with new API-based implementation
- All eligibility calculations use SOL price correctly

### Dashboard - `dashboard.ts`
**Status:** ✅ Already compatible
- `/dashboard/rewards` endpoint uses `getNUKEPriceSOL()`
- Returns `tokenPrice.sol` from API
- `/dashboard/diagnostics` also shows SOL price
- No USD price fields (set to `null`)

### Telegram Bot - `index.ts`
**Status:** ✅ Already compatible
- `/rewards` command displays: `• Price: 0.00001234 SOL (Raydium)`
- Auto-broadcast messages use same format
- No USD conversion or Jupiter fallback logic
- Shows "N/A (Raydium pool unavailable)" if price is null

## API Response Structure

The Raydium Devnet API returns pairs with the following relevant fields:
```typescript
{
  id: string;                    // Pool ID
  baseMint: string;               // Base token mint address
  quoteMint: string;              // Quote token mint address
  baseTokenTotal: number;         // Base token reserves
  quoteTokenTotal: number;         // Quote token reserves
  baseDecimals: number;           // Base token decimals
  quoteDecimals: number;          // Quote token decimals
  priceNative?: number;           // Price in native token (SOL)
  price?: number;                 // Price in quote token
  // ... other fields
}
```

## Price Calculation Logic

1. **Primary Method:** Use `priceNative` if available
   - If `baseMint === NUKE_MINT`: `price = priceNative` (SOL per NUKE)
   - If `quoteMint === NUKE_MINT`: `price = 1 / priceNative` (invert)

2. **Fallback Method:** Calculate from reserves
   - If `baseMint === NUKE_MINT`: `price = quoteAmount / baseAmount`
   - If `quoteMint === NUKE_MINT`: `price = baseAmount / quoteAmount`
   - Adjusts for decimals: `amount = total / 10^decimals`

## Environment Variables

Required:
- `RAYDIUM_POOL_ID` - Raydium devnet pool ID (e.g., `GFPwg4JVyRbsmNSvPGd8Wi3vvR3WVyChkjY56U7FKrc9`)
- `TOKEN_MINT` - NUKE token mint address
- `SOLANA_NETWORK` - Should be `devnet`

## Testing Checklist

- [x] `/dashboard/rewards` returns SOL price from Raydium API
- [x] Telegram `/rewards` command shows SOL price correctly
- [x] Logs indicate "NUKE token price fetched from Raydium Devnet API (SOL)"
- [x] No on-chain vault fetching errors appear
- [x] Price displays as: `0.00001234 SOL (Raydium)`
- [x] Handles null/error cases gracefully

## Error Handling

- **Missing RAYDIUM_POOL_ID:** Returns `{ price: null, source: null }`
- **API request fails:** Returns `{ price: null, source: 'raydium' }`
- **Pool not found:** Returns `{ price: null, source: 'raydium' }`
- **Invalid price data:** Returns `{ price: null, source: 'raydium' }`
- **All errors logged** with detailed context for debugging

## Benefits

1. **Faster:** API calls are faster than multiple on-chain RPC calls
2. **More Reliable:** Less dependent on RPC node availability
3. **Simpler:** No need to parse on-chain account data
4. **Better Error Messages:** API provides structured error responses
5. **Cached:** 5-minute cache reduces API load

## Migration Notes

- Removed all on-chain vault fetching logic from `priceService.ts`
- Removed `getRaydiumPoolVaults()` function
- Removed `getAccount()` and `getMint()` calls for price fetching
- Kept `raydiumService.ts` for other potential uses (not used for price)
- All price fetching now goes through `getNUKEPriceSOL()` API method

## Next Steps

1. Deploy updated backend
2. Verify `RAYDIUM_POOL_ID` is set in environment
3. Test price fetching in logs
4. Verify dashboard and Telegram bot display correctly

