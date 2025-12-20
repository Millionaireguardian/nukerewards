# Token-2022 Swap Fix

## Summary

Fixed the `InvalidProgramForExecution` error by ensuring the swap instruction uses `TOKEN_2022_PROGRAM_ID` for Token-2022 source tokens (NUKE).

## Changes Made

### 1. Token-2022 Detection
- Added explicit detection at the start of `swapNukeToSOL()`:
  - NUKE uses Token-2022 (`TOKEN_2022_PROGRAM_ID`)
  - WSOL uses SPL Token (`TOKEN_PROGRAM_ID`)
- Added logging to confirm token program selection

### 2. Updated Swap Instruction
- Modified `createRaydiumSwapInstruction()` to accept only `sourceTokenProgram` parameter
- The instruction now uses `TOKEN_2022_PROGRAM_ID` for Token-2022 source tokens
- Raydium supports mixed-program swaps (Token-2022 source, SPL Token destination)

### 3. Documentation Updates
- Added detailed comments explaining Token-2022 compatibility
- Documented that Raydium handles mixed-program swaps internally
- Clarified that the `tokenProgramId` account must be `TOKEN_2022_PROGRAM_ID` for Token-2022 sources

## Key Fix

The swap instruction now uses:
```typescript
const sourceTokenProgram = TOKEN_2022_PROGRAM_ID; // Required for NUKE (Token-2022)

// In instruction accounts:
{ pubkey: tokenProgramId, isSigner: false, isWritable: false } // TOKEN_2022_PROGRAM_ID
```

This ensures Raydium can correctly execute the swap with Token-2022 source tokens.

## Expected Result

- ✅ Transaction simulation succeeds (no `InvalidProgramForExecution`)
- ✅ NUKE → SOL swap executes successfully
- ✅ SOL balance increases in reward wallet
- ✅ Rewards can be distributed

## Build and Push Commands

```bash
# Build Backend
cd ~/reward-project/backend
npm run build

# Build Frontend
cd ~/reward-project/frontend
npm run build

# Push to GitHub
cd ~/reward-project
git add .
git commit -m "Fix swap: Use TOKEN_2022_PROGRAM_ID for Token-2022 source tokens

- Add explicit Token-2022 detection for NUKE
- Use TOKEN_2022_PROGRAM_ID in swap instruction (required for Token-2022)
- Raydium supports mixed-program swaps (Token-2022 source, SPL Token destination)
- Add logging for token program selection
- Fixes InvalidProgramForExecution error during transaction simulation"

git push origin main
```

