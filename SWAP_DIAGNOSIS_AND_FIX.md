# Swap Diagnosis and Fix

## Current Error
`InvalidProgramForExecution` during transaction simulation

## Possible Causes

1. **Wrong Pool Address** - Pool ID might not be correct NUKE/SOL pool
2. **Token Mint Mismatch** - Mint addresses don't match pool
3. **Instruction Format** - Standard AMM pools may have different instruction format than CPMM
4. **Account Order** - Accounts array order might be wrong
5. **Token Program ID** - Already using TOKEN_2022_PROGRAM_ID, but might need both programs

## Changes Made

### Added Account Verification
- Verify all accounts exist before building instruction
- Log account existence status for debugging
- Throw clear errors if accounts are missing

### Enhanced Logging
- Log all account addresses in swap instruction
- Log pool type and instruction details
- Better simulation error logging with all context

## Next Steps

The enhanced logging will help identify:
1. If accounts exist
2. If pool structure is correct
3. What the actual simulation error is

If the error persists, we may need to:
1. Verify the pool ID is correct for NUKE/SOL
2. Check if Standard AMM pools use a different instruction format
3. Consider using Raydium SDK instead of manual instruction building

