# Manual Standard AMM v4 Swap Implementation (No SDK)

## Overview

This implementation replaces the Raydium SDK's `makeSwapInstructionSimple` with a **manual Standard AMM v4 instruction builder** that fully supports Token-2022 tokens without SDK query issues.

## Problem Solved

The Raydium SDK's `makeSwapInstructionSimple` internally calls `_selectTokenAccount` which:
- Queries token accounts using `getParsedTokenAccountsByOwner`
- May only query `TOKEN_PROGRAM_ID` accounts, missing Token-2022 accounts
- Calls `.filter()` on the result, causing crashes when Token-2022 accounts aren't found

**Solution**: Bypass the SDK entirely and build swap instructions manually.

## Implementation

### Key Components

1. **`createRaydiumStandardSwapInstruction`** - Manual instruction builder
   - Builds Standard AMM v4 swap instruction with 25 accounts
   - Supports Token-2022 source tokens
   - Uses discriminator 9 (0x09) for swap

2. **`fetchStandardPoolState`** - Fetches pool state from chain
   - Extracts all required accounts from pool account data
   - Parses Serum market accounts
   - No SDK dependency

3. **`swapNukeToSOL`** - Main swap function
   - Validates ATAs exist (both Token-2022 and standard)
   - Calculates swap amounts with slippage
   - Builds transaction manually
   - Sends and confirms transaction

### Code Flow

```
1. Validate inputs and pool type (must be Standard)
2. Verify NUKE ATA exists (Token-2022)
3. Verify WSOL ATA exists (standard token)
4. Calculate swap amounts with slippage
5. Fetch pool state from chain
6. Build swap instruction manually
7. Add compute budget instructions
8. Build and send transaction
9. Unwrap WSOL to native SOL
```

## Features

✅ **No SDK Dependency** - Completely bypasses Raydium SDK  
✅ **Token-2022 Support** - Full support for Token-2022 tokens  
✅ **Standard AMM v4 Only** - Supports Standard pools only  
✅ **Explicit ATA Validation** - Verifies both ATAs exist before swap  
✅ **Slippage Protection** - Configurable slippage tolerance  
✅ **Error Handling** - Comprehensive error messages  
✅ **Production Ready** - Suitable for Render deployment  

## Usage

```typescript
const result = await swapNukeToSOL(
  amountNuke,      // bigint - amount in raw token units
  slippageBps      // number - slippage in basis points (default: 200 = 2%)
);

// Returns:
// {
//   solReceived: bigint,    // SOL received in lamports
//   txSignature: string      // Transaction signature
// }
```

## Requirements

1. **NUKE ATA must exist** (Token-2022 program)
2. **WSOL ATA must exist** (standard token program)
3. **Pool must be Standard AMM v4** (not CPMM or CLMM)
4. **Reward wallet must have sufficient NUKE balance**
5. **Reward wallet must have SOL for transaction fees**

## Error Handling

The implementation includes comprehensive error handling:
- ATA existence validation
- Balance checks
- Pool type validation
- Instruction validation
- Transaction validation
- Clear error messages with actionable diagnostics

## Files Modified

- `backend/src/services/swapService.ts` - Main swap implementation

## Testing

Test on devnet first:
1. Ensure NUKE and WSOL ATAs exist
2. Ensure reward wallet has NUKE balance
3. Call `swapNukeToSOL` with test amount
4. Verify transaction succeeds
5. Verify WSOL is unwrapped to native SOL

## Production Deployment

1. Ensure all ATAs exist on mainnet
2. Set `SOLANA_NETWORK=mainnet`
3. Set `RAYDIUM_POOL_ID` to mainnet pool ID
4. Deploy to Render
5. Monitor logs for swap execution

## Limitations

- **Standard AMM v4 pools only** - Does not support CPMM or CLMM pools
- **Manual instruction building** - Requires pool state fetching from chain
- **25 accounts per swap** - Standard AMM v4 requires many accounts

## Future Enhancements

- Add support for CPMM pools
- Add support for CLMM pools
- Optimize pool state fetching (caching)
- Add retry logic for failed transactions

