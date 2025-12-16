# SOL-Only Pricing Implementation

## Overview

Updated the Nuke Rewards system to use **SOL-only pricing** from Raydium devnet pool. All Jupiter, CoinGecko, and USD conversion logic has been removed for devnet testing.

## Changes Made

### 1. Backend Price Service (`backend/src/services/priceService.ts`)

**Removed:**
- Jupiter API fetching
- USD conversion logic
- Fallback USD prices
- Hybrid pricing model

**Added:**
- `getNUKEPriceSOL()` - Returns `{ price: number | null, source: 'raydium' | null }`
  - `price`: WSOL per NUKE from Raydium devnet pool
  - `source`: Always `'raydium'` when available
- Legacy `getNUKEPriceUSD()` returns `0` for devnet compatibility

**Key Features:**
- Price fetched directly from Raydium devnet pool using `RAYDIUM_POOL_ID`
- 5-minute cache TTL
- Returns `null` if Raydium unavailable (no fallbacks)

### 2. Reward Service (`backend/src/services/rewardService.ts`)

**Updated:**
- Eligibility checks now use SOL price from Raydium
- Converts `MIN_HOLDING_USD` to SOL using fixed devnet rate (100 SOL = 1 USD)
- `calculateHoldingSOL()` function for SOL-based calculations
- All holder status calculations use SOL price

**Eligibility Logic:**
```typescript
// Convert MIN_HOLDING_USD to SOL
const SOL_TO_USD_RATE = 100; // Devnet conversion rate
const minHoldingSOL = minHoldingUSD / SOL_TO_USD_RATE;

// Check eligibility using SOL
if (holdingSOL >= minHoldingSOL) {
  // Eligible
}
```

### 3. Dashboard API (`backend/src/routes/dashboard.ts`)

**Updated Endpoints:**

#### `/dashboard/rewards`
- Returns `tokenPrice.sol` (SOL per NUKE)
- Returns `tokenPrice.usd` as `null` (devnet)
- Returns `tokenPrice.source` as `'raydium'` or `null`
- Removed USD price calculations and Jupiter references

**Response Format:**
```json
{
  "tokenPrice": {
    "sol": 0.00001234,
    "usd": null,
    "source": "raydium"
  },
  "dex": {
    "name": "raydium",
    "price": 0.00001234,
    "source": "raydium",
    "updatedAt": "2025-12-16T..."
  }
}
```

#### `/dashboard/raydium`
- Returns only SOL price (no USD conversion)
- Removed `priceUSD` and `liquidityUSD` fields

#### `/dashboard/diagnostics`
- Updated to show SOL price
- Removed USD price references

### 4. Telegram Bot (`telegram-bot/src/index.ts`)

**Updated:**
- `/rewards` command shows price in SOL
- Auto-broadcast messages display SOL price
- Removed all USD conversion logic
- Removed Jupiter/CoinGecko references

**Message Format:**
```
📊 Reward System Status

Last Run: ...
Next Run: ...
Status: ...

Statistics:
• Price: 0.00001234 SOL (Raydium)
• Total Holders: ...
• Pending Payouts: ...
• SOL Distributed: ...
```

### 5. Environment Variables

**Required:**
- `RAYDIUM_POOL_ID` - Raydium devnet pool ID (e.g., `GFPwg4JVyRbsmNSvPGd8Wi3vvR3WVyChkjY56U7FKrc9`)

**Removed/Not Used:**
- No Jupiter API keys needed
- No CoinGecko API keys needed
- No USD conversion rates needed

## Price Flow

1. **Backend** fetches NUKE/SOL price from Raydium devnet pool
2. **Price cached** for 5 minutes to reduce API calls
3. **Dashboard** displays price in SOL
4. **Telegram bot** shows price in SOL
5. **Eligibility checks** use SOL price (converted from USD threshold)

## Logging

All price fetches are logged:
```
[INFO] NUKE token price fetched from Raydium (SOL) {
  priceSOL: 0.00001234,
  source: 'raydium',
  description: '0.00001234 WSOL per NUKE'
}
```

## Testing

1. **Verify Raydium Pool ID is set:**
   ```bash
   echo $RAYDIUM_POOL_ID
   ```

2. **Check price endpoint:**
   ```bash
   curl https://your-backend-url/dashboard/rewards
   ```
   Should return `tokenPrice.sol` with Raydium price

3. **Check Telegram bot:**
   - Send `/rewards` command
   - Should show price in SOL format

4. **Check logs:**
   - Look for "NUKE token price fetched from Raydium (SOL)"
   - Should not see Jupiter or USD conversion logs

## Notes

- **Devnet Only**: This implementation is for devnet testing
- **No Fallbacks**: If Raydium is unavailable, price returns `null`
- **SOL Display**: All user-facing displays show SOL price
- **Eligibility**: Uses fixed conversion rate (100 SOL = 1 USD) for devnet eligibility checks
- **Compatibility**: Legacy `getNUKEPriceUSD()` returns `0` for backward compatibility

## Migration Path

When moving to mainnet:
1. Update `RAYDIUM_POOL_ID` to mainnet pool
2. Optionally add USD conversion back if needed
3. Update SOL/USD conversion rate for eligibility checks

