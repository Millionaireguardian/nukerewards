# Raydium Pool Info API Update

## Summary
Updated NUKE token price fetching to use Raydium Devnet `/pools/info/ids` endpoint instead of `/pairs` endpoint.

## Changes Made

### Backend - `priceService.ts`
**Updated:**
- Changed API endpoint from `/pairs` to `/pools/info/ids?ids=<RAYDIUM_POOL_ID>`
- Updated interface from `RaydiumPair[]` to `RaydiumPoolInfo[]`
- Simplified pool lookup (direct fetch by ID instead of filtering array)
- Updated logging message: `"NUKE token price fetched from Raydium (SOL)"`
- Updated diagnostic function to show correct API URL

**API Endpoint:**
```
GET https://api-v3-devnet.raydium.io/pools/info/ids?ids=<RAYDIUM_POOL_ID>
```

**Response Structure:**
- Returns array with single pool object (or empty if not found)
- Pool object contains: `id`, `baseMint`, `quoteMint`, `baseTokenTotal`, `quoteTokenTotal`, `priceNative`, etc.

**Price Extraction:**
1. Primary: Use `priceNative` if available (adjusts for token order)
2. Fallback: Calculate from reserves: `quoteTokenTotal / baseTokenTotal` (adjusted for decimals)

### Backend - `rewardService.ts`
**Status:** ✅ Already compatible
- Uses `getNUKEPriceSOL()` from `priceService.ts`
- Has `calculateHoldingSOL()` helper function
- All eligibility calculations use SOL price
- Converts `MIN_HOLDING_USD` to `MIN_HOLDING_SOL` using fixed devnet rate (100 SOL = 1 USD)

### Dashboard - `dashboard.ts`
**Status:** ✅ Already compatible
- `/dashboard/rewards` returns `tokenPrice.sol` (USD set to `null`)
- `/dashboard/diagnostics` shows SOL price with source "raydium"
- No Jupiter API calls
- No USD price calculations

### Telegram Bot - `index.ts`
**Status:** ✅ Already compatible
- `/rewards` command displays: `• Price: 0.00001234 SOL (Raydium)`
- Auto-broadcast messages use same format
- Shows "N/A (Raydium pool unavailable)" if price is null
- No USD conversion or Jupiter API usage

## Environment Variables

Required:
- `RAYDIUM_POOL_ID` - Raydium devnet pool ID (e.g., `GFPwg4JVyRbsmNSvPGd8Wi3vvR3WVyChkjY56U7FKrc9`)
- `TOKEN_MINT` - NUKE token mint address
- `SOLANA_NETWORK` - Should be `devnet`

## API Response Example

```json
{
  "success": true,
  "data": [
    {
      "id": "GFPwg4JVyRbsmNSvPGd8Wi3vvR3WVyChkjY56U7FKrc9",
      "baseMint": "CzPWFT9ezPy53mQUj48T17Jm4ep7sPcKwjpWw9tACTyq",
      "quoteMint": "So11111111111111111111111111111111111111112",
      "baseTokenTotal": 1000000000,
      "quoteTokenTotal": 12000000,
      "baseDecimals": 6,
      "quoteDecimals": 9,
      "priceNative": 0.000012,
      ...
    }
  ],
  "time": 1234567890
}
```

## Price Calculation

1. **If `priceNative` is available:**
   - If `baseMint === NUKE_MINT`: `price = priceNative` (SOL per NUKE)
   - If `quoteMint === NUKE_MINT`: `price = 1 / priceNative` (invert)

2. **Fallback (calculate from reserves):**
   - If `baseMint === NUKE_MINT`: `price = quoteAmount / baseAmount`
   - If `quoteMint === NUKE_MINT`: `price = baseAmount / quoteAmount`
   - Adjusts for decimals: `amount = total / 10^decimals`

## Logging

**Success:**
```
"NUKE token price fetched from Raydium (SOL): <price>"
```

**Error Cases:**
- Missing `RAYDIUM_POOL_ID`: Returns `{ price: null, source: null }`
- API request fails: Returns `{ price: null, source: 'raydium' }`
- Pool not found: Returns `{ price: null, source: 'raydium' }`
- Invalid price data: Returns `{ price: null, source: 'raydium' }`

## Testing Checklist

- [x] `RAYDIUM_POOL_ID` is set in environment
- [x] `/dashboard/rewards` returns `tokenPrice.sol` with correct value
- [x] Telegram `/rewards` command shows SOL price correctly
- [x] Logs show: `"NUKE token price fetched from Raydium (SOL): <price>"`
- [x] No Jupiter or USD conversion logs appear
- [x] Error handling works when pool is unavailable

## Benefits

1. **Direct Pool Lookup:** No need to filter through all pairs
2. **Faster:** Single API call with specific pool ID
3. **More Reliable:** Less data to parse, fewer edge cases
4. **Simpler:** Direct pool info response structure

## Migration Notes

- Changed from `/pairs` endpoint (returns all pairs) to `/pools/info/ids` (returns specific pool)
- Updated response interface to match new API structure
- Simplified pool lookup logic (no array filtering needed)
- All other services remain compatible (no changes needed)

