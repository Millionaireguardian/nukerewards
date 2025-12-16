# NUKE Token Pricing Model

## Overview

This document explains the hybrid pricing model used for NUKE token on Solana devnet. This model is **intentional and correct** for devnet tokens and will work seamlessly on mainnet without code changes.

## Pricing Formula

```
NUKE_USD = (NUKE_SOL from Raydium devnet) × (SOL_USD from mainnet reference)
```

## Components

### 1. Primary Price Source: Raydium DEX (Devnet)

- **Source**: Raydium AMM pool on Solana devnet
- **Data**: NUKE/SOL ratio (WSOL per NUKE)
- **Method**: Reads pool vault balances directly from blockchain
- **Location**: `backend/src/services/raydiumService.ts`

**Why devnet?**
- Token is only listed on Raydium devnet
- This represents the real AMM ratio from the actual liquidity pool
- Provides accurate trading price based on pool reserves

### 2. USD Conversion: Mainnet Reference Price

- **Source**: Jupiter API (mainnet SOL/USD price)
- **Fallback**: CoinGecko or static default if Jupiter fails
- **Location**: `backend/src/services/raydiumService.ts` → `getSOLPriceUSD()`

**Why mainnet?**
- Devnet has no real USD price data
- Mainnet SOL/USD is a reliable reference price
- This hybrid approach is standard for devnet tokens

### 3. Final Calculation

The `getRaydiumPriceUSD()` function multiplies:
- NUKE/SOL ratio (from devnet Raydium pool)
- SOL/USD price (from mainnet reference)

Result: Accurate NUKE/USD price for devnet token

## Fallback Order

1. **Raydium** (primary)
   - Fetches NUKE/SOL from devnet pool
   - Converts using mainnet SOL/USD
   - Source: `"raydium"`

2. **Jupiter** (secondary)
   - Direct USD price if available
   - Source: `"jupiter"`

3. **Static Default** (last fallback)
   - DEFAULT_NUKE_PRICE_USD = 0.01
   - Source: `"fallback"`

## Implementation Details

### Backend Price Service

**File**: `backend/src/services/priceService.ts`

- `getNUKEPriceUSD()` - Main entry point
- Priority: Raydium → Jupiter → Fallback
- Caches price for 5 minutes
- Tracks source in `priceSource` variable

### Raydium Service

**File**: `backend/src/services/raydiumService.ts`

- `getRaydiumData()` - Fetches pool data from devnet
- `getRaydiumPriceUSD()` - Calculates USD price using hybrid model
- `getSOLPriceUSD()` - Fetches mainnet SOL/USD reference price

### Dashboard API

**File**: `backend/src/routes/dashboard.ts`

- `/dashboard/rewards` - Returns price with source metadata
- `tokenPrice.source` - Reflects: `"raydium"` | `"jupiter"` | `"fallback"`
- `dex.priceUSD` - Raydium USD price when available

### Telegram Bot

**File**: `telegram-bot/src/index.ts`

- Uses same price from `/dashboard/rewards`
- Shows price source in messages
- Displays PL (Pool Liquidity) from Raydium

## Source Metadata

The `tokenPrice.source` field in API responses indicates:

- `"raydium"` - Using Raydium devnet pool + mainnet SOL/USD
- `"jupiter"` - Using Jupiter direct USD price
- `"fallback"` - Using static default price

## Important Notes

✅ **This hybrid model is intentional and correct for devnet**

✅ **No attempt is made to fetch "USD price from devnet"** (it doesn't exist)

✅ **The same logic will work seamlessly on mainnet** without code changes

✅ **All components (backend, dashboard, Telegram bot) use the same price source**

## Code Comments

All pricing functions include inline comments explaining:
- Why SOL/USD comes from mainnet
- Why NUKE/SOL comes from devnet
- The hybrid pricing formula
- That this is intentional behavior

## Verification

To verify the pricing model is working:

1. Check `/dashboard/rewards` response:
   ```json
   {
     "tokenPrice": {
       "usd": 0.001234,
       "source": "raydium"
     },
     "dex": {
       "name": "raydium",
       "price": 0.00001234,
       "priceUSD": 0.001234,
       "liquidityUSD": 12345.67
     }
   }
   ```

2. Check Telegram bot `/rewards` command - should show same price

3. Check logs - should show "Raydium data fetched" with price calculations

## Future (Mainnet)

When token moves to mainnet:
- Same code will work without changes
- Raydium pool will be on mainnet
- SOL/USD will still come from mainnet reference
- Formula remains: NUKE_USD = NUKE_SOL × SOL_USD

