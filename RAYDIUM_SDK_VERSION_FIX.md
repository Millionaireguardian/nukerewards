# Raydium SDK Version Field Fix

## Problem

The swap was failing with:
```
Error: invalid version (argument="poolKeys.version"), value=undefined), code=INVALID_ARGUMENT, module=Liquidity
```

The Raydium SDK's `makeSwapInstruction()` requires a `version` field in the pool keys object, but it was missing after calling `jsonInfo2PoolKeys()`.

## Root Cause

The `jsonInfo2PoolKeys()` function from the Raydium SDK expects pool data to include a `version` field that indicates the pool type:
- **Version 4**: Standard AMM v4 pools
- **Version 6**: CPMM pools
- **Version 7**: CLMM pools

The API response from Raydium might not always include this field, or it might be in a different format, so we need to explicitly add it based on the pool type.

## Solution

Following the [Chainstack guide](https://docs.chainstack.com/docs/solana-how-to-perform-token-swaps-using-the-raydium-sdk), we:

1. **Added version field to pool keys data** before calling `jsonInfo2PoolKeys()`
   - Check if API response includes `version` field
   - If not, infer version from pool type:
     - `cpmm` → version 6
     - `clmm` → version 7
     - Default → version 4 (Standard AMM v4)

2. **Updated validation logic** to preserve the `version` field
   - Added `version` to `allowedNumericFields` array
   - Validation now allows numeric `version` field while still rejecting other numeric metadata

3. **Added verification** after `jsonInfo2PoolKeys()` conversion
   - Verify that `version` is set in the resulting pool keys
   - Throw clear error if version is still missing

## Code Changes

### Before (Missing Version)
```typescript
const sdkPoolKeysData: any = {
  id: sdkPoolInfo.id,
  programId: sdkPoolInfo.programId,
};
// ... other fields ...
const poolKeys = jsonInfo2PoolKeys(sdkPoolKeysData);
// poolKeys.version is undefined ❌
```

### After (With Version)
```typescript
const sdkPoolKeysData: any = {
  id: sdkPoolInfo.id,
  programId: sdkPoolInfo.programId,
};

// CRITICAL: Add version field - SDK requires this for makeSwapInstruction
if (sdkPoolInfo.version !== undefined) {
  sdkPoolKeysData.version = sdkPoolInfo.version;
} else {
  // Infer version from pool type
  const poolTypeLower = (sdkPoolInfo.type || poolInfo.poolType || '').toLowerCase();
  if (poolTypeLower === 'cpmm') {
    sdkPoolKeysData.version = 6;
  } else if (poolTypeLower === 'clmm') {
    sdkPoolKeysData.version = 7;
  } else {
    sdkPoolKeysData.version = 4; // Standard AMM v4
  }
}

// ... other fields ...
const poolKeys = jsonInfo2PoolKeys(sdkPoolKeysData);

// Verify version is set
if (!poolKeys.version) {
  throw new Error(`Pool keys missing version field after jsonInfo2PoolKeys conversion`);
}
// poolKeys.version is now set ✅
```

## Version Mapping

| Pool Type | Version | Description |
|-----------|---------|-------------|
| Standard | 4 | Standard AMM v4 pools |
| CPMM | 6 | Constant Product Market Maker pools |
| CLMM | 7 | Concentrated Liquidity Market Maker pools |

## Testing

After this fix:
- ✅ Pool keys will include the `version` field
- ✅ Version is inferred from pool type if not in API response
- ✅ `makeSwapInstruction()` will receive valid pool keys with version
- ✅ The "invalid version" error should be resolved

## References

- [Chainstack Guide: Solana Token Swaps with Raydium SDK](https://docs.chainstack.com/docs/solana-how-to-perform-token-swaps-using-the-raydium-sdk)
- [Raydium SDK Documentation](https://github.com/raydium-io/raydium-sdk)

