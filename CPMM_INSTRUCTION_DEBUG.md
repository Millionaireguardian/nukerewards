# CPMM Instruction Format Debug Guide

## Current Issue

The swap is failing with `InstructionFallbackNotFound (Custom 101)` error. This indicates the instruction discriminator doesn't match what the CPMM program expects.

## What We've Changed

1. **Updated to Anchor 8-byte discriminator format** (was using 1-byte)
2. **Using sha256("global:swap")[0:8] as discriminator**
3. **Instruction data format**: [8-byte discriminator][8-byte amountIn][8-byte minimumAmountOut] = 24 bytes

## Current Instruction Format

```typescript
// Discriminator: first 8 bytes of sha256("global:swap")
const discriminator = createHash('sha256').update('global:swap').digest().slice(0, 8);

// Instruction data (24 bytes total):
// [0-7]:   8-byte discriminator
// [8-15]:  8-byte amountIn (u64, little-endian)
// [16-23]: 8-byte minimumAmountOut (u64, little-endian)
```

## Account Order (Current)

```
0. poolId (writable)
1. userSourceTokenAccount (writable) - NUKE (Token-2022)
2. userDestinationTokenAccount (writable) - WSOL (SPL Token)
3. poolSourceTokenAccount (writable) - Pool NUKE vault (Token-2022)
4. poolDestinationTokenAccount (writable) - Pool WSOL vault (SPL Token)
5. poolCoinMint - NUKE mint (Token-2022)
6. poolPcMint - WSOL mint (SPL Token)
7. userWallet (signer, writable)
8. tokenProgramId - TOKEN_2022_PROGRAM_ID
9. systemProgram
```

## Possible Issues

1. **Wrong instruction name**: May need "swap" instead of "global:swap"
2. **Wrong account order**: CPMM pools may require different account order
3. **Missing accounts**: May need Associated Token Program, Rent sysvar, Clock sysvar
4. **Wrong discriminator calculation**: Some programs use different hash algorithms

## Next Steps to Debug

1. **Check pool's IDL** (if available) to get exact instruction format
2. **Try different instruction names**:
   - "swap" (without namespace)
   - "raydium_cpmm:swap"
   - "cpmm:swap"
3. **Try different account orders** (may need to reorder based on pool implementation)
4. **Add additional accounts** if required (Rent, Clock, Associated Token Program)

## Alternative Approach

If manual instruction building continues to fail, consider:
- Using Raydium SDK (if available for CPMM)
- Fetching the pool's IDL and using Anchor's instruction builder
- Checking Raydium's official documentation/examples for CPMM swap format

## Logging

The code now logs the discriminator hex value. Compare this with what the pool program expects (if you have access to the IDL or source code).

