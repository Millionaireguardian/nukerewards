# Raydium SDK Fix - Following Chainstack Pattern

## Problem

The swap was failing with `invalid public key ... value="1765892692"` error because numeric metadata (like `openTime`, `feeRate`, or swap amounts) were being accidentally passed into `jsonInfo2PoolKeys()`.

## Root Cause

The `jsonInfo2PoolKeys()` function from the Raydium SDK expects **only base58 address strings** (mint, vault, authority, pool IDs). When numeric values like timestamps or fee rates are included, the SDK tries to parse them as PublicKeys, causing the error.

### Specific Issue Found

In `swapService.ts` (lines 1300-1302), the code was including `openTime` in the pool keys data:

```typescript
if (sdkPoolInfo.openTime !== undefined) {
  sdkPoolKeysData.openTime = sdkPoolInfo.openTime; // ❌ This is a numeric timestamp!
}
```

`openTime` is a numeric timestamp (e.g., `1765892692`), not a base58 address, so it cannot be parsed as a PublicKey.

## Solution

Following the [Chainstack guide](https://docs.chainstack.com/docs/solana-how-to-perform-token-swaps-using-the-raydium-sdk), we:

1. **Removed numeric metadata** from pool keys data
   - Removed `openTime` (numeric timestamp)
   - Added validation to prevent any numeric fields from being passed

2. **Only include base58 addresses** in `jsonInfo2PoolKeys()`
   - `id` - Pool ID (base58 address)
   - `programId` - Program ID (base58 address)
   - `authority` - Authority address (base58)
   - `mintA` - Token A mint address (base58)
   - `mintB` - Token B mint address (base58)
   - `vaultA` - Vault A address (base58)
   - `vaultB` - Vault B address (base58)
   - `lpMint` - LP mint address (base58, if available)

3. **Added validation** to ensure only string addresses are passed
   - Validates that all fields are strings (base58 addresses)
   - Explicitly excludes known numeric fields: `openTime`, `feeRate`, `tradeFeeRate`, `protocolFeeRate`, `mintAmountA`, `mintAmountB`, `tvl`, `volume`, `price`
   - Logs warnings if non-string fields are detected

4. **Pass amounts only to swap instruction builder**
   - `amountIn` and `amountOut` are passed to `Liquidity.makeSwapInstruction()`, not to `jsonInfo2PoolKeys()`
   - This follows the Chainstack pattern exactly

## Code Changes

### Before (Incorrect)
```typescript
// Authority and openTime if available
if (sdkPoolInfo.authority) {
  sdkPoolKeysData.authority = sdkPoolInfo.authority;
}
if (sdkPoolInfo.openTime !== undefined) {
  sdkPoolKeysData.openTime = sdkPoolInfo.openTime; // ❌ Numeric value!
}
```

### After (Correct)
```typescript
// Authority (must be base58 address string)
if (sdkPoolInfo.authority) {
  sdkPoolKeysData.authority = sdkPoolInfo.authority;
}

// CRITICAL: DO NOT include openTime, feeRate, or any numeric metadata
// These are NOT public keys and will cause "invalid public key" errors
// openTime is a numeric timestamp, NOT a base58 address

// Validate that all included fields are strings (base58 addresses)
const numericFields = ['openTime', 'feeRate', 'tradeFeeRate', 'protocolFeeRate', 'mintAmountA', 'mintAmountB', 'tvl', 'volume', 'price'];
for (const key of Object.keys(sdkPoolKeysData)) {
  if (numericFields.includes(key)) {
    logger.warn(`Removing numeric field ${key} from pool keys data (not a public key)`);
    delete sdkPoolKeysData[key];
  } else if (typeof sdkPoolKeysData[key] !== 'string') {
    logger.warn(`Removing non-string field ${key} from pool keys data (expected base58 address)`);
    delete sdkPoolKeysData[key];
  }
}
```

## Pattern from Chainstack Article

The fix follows the exact pattern from the Chainstack guide:

1. ✅ **Create a separate swapConfig-like structure** - We extract pool info into `sdkPoolKeysData`
2. ✅ **Extract only valid public key fields for pool keys** - Only base58 addresses
3. ✅ **Use jsonInfo2PoolKeys() with pool metadata trimmed** - Numeric fields removed
4. ✅ **Use the SDK's swap builder** - `Liquidity.makeSwapInstruction()`
5. ✅ **Pass amounts only to the swap instruction builder** - `amountIn`/`amountOut` go to `makeSwapInstruction()`, not `jsonInfo2PoolKeys()`

## Testing

After this fix:
- ✅ Pool keys will only contain base58 address strings
- ✅ No numeric metadata will be passed to `jsonInfo2PoolKeys()`
- ✅ Swap amounts are passed correctly to `makeSwapInstruction()`
- ✅ The "invalid public key" error should be resolved

## References

- [Chainstack Guide: Solana Token Swaps with Raydium SDK](https://docs.chainstack.com/docs/solana-how-to-perform-token-swaps-using-the-raydium-sdk)
- [Raydium SDK GitHub Repository](https://github.com/chainstacklabs/raydium-sdk-swap-example-typescript)

