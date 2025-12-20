# Raydium Swap Service - Technical Analysis & Improvements

## Current Issues Analysis

### 1. Pool Type and Structure Issues

**Problem:** The code uses hardcoded fallbacks when API response is incomplete, which leads to:
- `reserveA = 0n` and `reserveB = 0n` when API doesn't provide `mintAmountA`/`mintAmountB`
- Swap calculations fail because reserves are zero
- "Expected SOL output too low" errors due to zero reserves

**Root Cause:** 
- The `/pools/key/ids` endpoint may not always include reserve amounts
- Hardcoded fallback sets reserves to `0n` instead of fetching from chain
- No validation that reserves are valid before swap calculation

### 2. Previous Render Errors

**"Pool mint information incomplete in API response"**
- Triggered when `mintAmountA` or `mintAmountB` is undefined
- Code falls back to hardcoded mints but reserves stay at `0n`
- Swap calculation fails with division by zero or invalid output

**"Expected SOL output too low"**
- Caused by zero reserves (`reserveA = 0n`, `reserveB = 0n`)
- Constant product formula: `dy = (y * dx) / (x + dx)` produces `0` when `x = 0`
- Minimum output check fails: `minDestAmount < MIN_SOL_OUTPUT`

### 3. Liquidity Over Time

**Current State:**
- No liquidity verification before swap
- Reserves may be zero or insufficient
- No check if pool has enough SOL to fulfill swap

**Required:**
- Fetch current reserves before each swap (fresh data)
- Verify destination reserve (SOL) is sufficient
- Skip swap if liquidity is too low
- Use chain data as fallback if API reserves are missing

### 4. Why Render Job Still Fails

**Issues Identified:**
1. **Zero-reserve fallback**: Hardcoded `reserveA = 0n`, `reserveB = 0n` causes calculation failures
2. **No liquidity check**: Swap attempts even when pool has no/insufficient liquidity
3. **API response inconsistency**: `/pools/key/ids` may not include reserves
4. **Missing chain fallback**: When API reserves are missing, code should fetch from chain, not use `0n`

### 5. Solution Strategy

1. **Fetch fresh pool info** before each swap (no caching for swap logic)
2. **Fetch reserves from chain** if API doesn't provide them
3. **Verify liquidity** before swap calculation
4. **Calculate expected output** and validate against minimum threshold
5. **Skip swap gracefully** if insufficient liquidity
6. **Remove hardcoded reserve fallbacks** - always fetch real data

## Implementation Plan

### Step 1: Fetch Reserves from Chain
When API doesn't provide reserves, fetch from vault token accounts directly.

### Step 2: Liquidity Verification
- Check destination reserve (SOL) > minimum required output
- Verify source reserve (NUKE) can handle swap amount
- Skip swap if liquidity is insufficient

### Step 3: Proper Error Handling
- Return structured errors instead of throwing
- Log detailed diagnostics
- Allow caller to handle "insufficient liquidity" gracefully

