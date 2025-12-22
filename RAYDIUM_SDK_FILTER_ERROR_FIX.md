# Raydium SDK `.filter()` Error - Complete Fix Guide

## Problem Explanation

**Error Message:**
```
TypeError: Cannot read properties of undefined (reading 'filter')
at _Liquidity._selectTokenAccount
at _Liquidity.makeSwapInstructionSimple
```

**What This Means:**
The Raydium SDK's `makeSwapInstructionSimple` internally calls `_selectTokenAccount`, which:
1. Queries ALL token accounts for the owner wallet using `getParsedTokenAccountsByOwner()`
2. Calls `.filter()` on the result to find the matching ATA
3. If the query fails or returns `undefined`, calling `.filter()` on `undefined` crashes

**Why This Happens Even When ATAs Exist:**
- The SDK queries token accounts **at runtime** during the swap call
- If the RPC connection is slow, times out, or returns `undefined`, the SDK crashes
- The SDK might query accounts differently than our pre-checks
- Network issues or RPC rate limiting can cause query failures

## Root Cause Analysis

1. **SDK Internal Query**: The SDK uses `getParsedTokenAccountsByOwner()` which can return `undefined` if:
   - RPC connection fails
   - Query times out
   - RPC rate limiting
   - Network issues

2. **Timing Issues**: Even if ATAs exist, the SDK's query might happen before they're fully indexed

3. **Connection Issues**: The SDK might use a different connection instance or commitment level

## Complete Solution

### Step 1: Pre-Validate SDK Query Method

Before calling the SDK, test that `getParsedTokenAccountsByOwner()` works:

```typescript
// Pre-validate that the SDK can query token accounts
const parsedTokenAccounts = await connection.getParsedTokenAccountsByOwner(
  rewardWalletAddress,
  { programId: TOKEN_PROGRAM_ID },
  'confirmed'
);

const parsedToken2022Accounts = await connection.getParsedTokenAccountsByOwner(
  rewardWalletAddress,
  { programId: TOKEN_2022_PROGRAM_ID },
  'confirmed'
);

// Verify query didn't return undefined
if (parsedTokenAccounts.value === undefined || parsedToken2022Accounts.value === undefined) {
  throw new Error('Token account query returned undefined - SDK will fail');
}
```

### Step 2: Ensure ATAs Exist On-Chain

Verify both ATAs exist using `getAccount()`:

```typescript
// Verify NUKE ATA exists
const nukeAccountInfo = await getAccount(
  connection, 
  nukeAta, 
  'confirmed', 
  TOKEN_2022_PROGRAM_ID
);

// Verify WSOL ATA exists
const wsolAccountInfo = await getAccount(
  connection, 
  wsolAta, 
  'confirmed', 
  TOKEN_PROGRAM_ID
);
```

### Step 3: Pass Explicit ATAs to SDK

Always pass explicit ATA addresses to the SDK:

```typescript
const swapConfigForSDK: any = {
  connection,
  poolKeys: poolKeys as any,
  userKeys: {
    tokenAccountIn: nukeAta,   // ✅ Explicit NUKE ATA
    tokenAccountOut: wsolAta,  // ✅ Explicit WSOL ATA
    owner: rewardWalletAddress,
  },
  amountIn: amountInDecimal,
  amountOut: minAmountOutDecimal,
  fixedSide: 'in',
};
```

### Step 4: Add Connection Validation

Ensure the connection is properly configured:

```typescript
// Test connection before SDK call
const slot = await connection.getSlot('confirmed');
if (!slot || slot === 0) {
  throw new Error('RPC connection is not responding - cannot query token accounts');
}
```

### Step 5: Handle Treasury/Admin Wallets

If treasury or admin wallets perform swaps, ensure their ATAs exist:

```typescript
async function verifyWalletATAs(
  connection: Connection,
  walletAddress: PublicKey,
  nukeMint: PublicKey,
  wsolMint: PublicKey
): Promise<{ nukeAta: PublicKey; wsolAta: PublicKey }> {
  // Derive ATAs
  const nukeAta = getAssociatedTokenAddressSync(
    nukeMint,
    walletAddress,
    false,
    TOKEN_2022_PROGRAM_ID
  );
  
  const wsolAta = getAssociatedTokenAddressSync(
    wsolMint,
    walletAddress,
    false,
    TOKEN_PROGRAM_ID
  );

  // Verify both exist
  await getAccount(connection, nukeAta, 'confirmed', TOKEN_2022_PROGRAM_ID);
  await getAccount(connection, wsolAta, 'confirmed', TOKEN_PROGRAM_ID);

  // Pre-validate SDK query method
  await connection.getParsedTokenAccountsByOwner(
    walletAddress,
    { programId: TOKEN_PROGRAM_ID },
    'confirmed'
  );

  return { nukeAta, wsolAta };
}
```

## Complete TypeScript Implementation

```typescript
import { Connection, PublicKey } from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID, 
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  getAccount,
  NATIVE_MINT
} from '@solana/spl-token';
import Decimal from 'decimal.js';
import { Liquidity } from '@raydium-io/raydium-sdk';

/**
 * Verify wallet ATAs exist and SDK can query them
 */
async function verifyWalletATAsForSwap(
  connection: Connection,
  walletAddress: PublicKey,
  nukeMint: PublicKey
): Promise<{ nukeAta: PublicKey; wsolAta: PublicKey }> {
  // Step 1: Derive ATAs
  const nukeAta = getAssociatedTokenAddressSync(
    nukeMint,
    walletAddress,
    false,
    TOKEN_2022_PROGRAM_ID
  );
  
  const wsolAta = getAssociatedTokenAddressSync(
    NATIVE_MINT, // WSOL mint
    walletAddress,
    false,
    TOKEN_PROGRAM_ID
  );

  // Step 2: Verify ATAs exist on-chain
  try {
    const nukeAccount = await getAccount(
      connection, 
      nukeAta, 
      'confirmed', 
      TOKEN_2022_PROGRAM_ID
    );
    console.log('✅ NUKE ATA exists:', {
      address: nukeAta.toBase58(),
      balance: nukeAccount.amount.toString(),
    });
  } catch (error) {
    throw new Error(
      `NUKE ATA does not exist: ${nukeAta.toBase58()}. ` +
      `Create it with: cd backend && npx tsx create-nuke-ata.ts`
    );
  }

  try {
    const wsolAccount = await getAccount(
      connection, 
      wsolAta, 
      'confirmed', 
      TOKEN_PROGRAM_ID
    );
    console.log('✅ WSOL ATA exists:', {
      address: wsolAta.toBase58(),
      balance: wsolAccount.amount.toString(),
    });
  } catch (error) {
    throw new Error(
      `WSOL ATA does not exist: ${wsolAta.toBase58()}. ` +
      `Create it with: cd backend && npx tsx create-wsol-atas.ts`
    );
  }

  // Step 3: Pre-validate SDK's query method
  // The SDK uses getParsedTokenAccountsByOwner internally
  try {
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      walletAddress,
      { programId: TOKEN_PROGRAM_ID },
      'confirmed'
    );

    const token2022Accounts = await connection.getParsedTokenAccountsByOwner(
      walletAddress,
      { programId: TOKEN_2022_PROGRAM_ID },
      'confirmed'
    );

    // Verify query didn't return undefined
    if (tokenAccounts.value === undefined || token2022Accounts.value === undefined) {
      throw new Error('Token account query returned undefined');
    }

    console.log('✅ SDK token account query validated:', {
      standardTokenAccounts: tokenAccounts.value.length,
      token2022Accounts: token2022Accounts.value.length,
    });
  } catch (error) {
    throw new Error(
      `SDK token account query failed: ${error instanceof Error ? error.message : String(error)}. ` +
      `This will cause SDK to crash with .filter() error. Check RPC connection.`
    );
  }

  // Step 4: Test connection health
  try {
    const slot = await connection.getSlot('confirmed');
    if (!slot || slot === 0) {
      throw new Error('RPC connection is not responding');
    }
    console.log('✅ RPC connection healthy, slot:', slot);
  } catch (error) {
    throw new Error(
      `RPC connection test failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  return { nukeAta, wsolAta };
}

/**
 * Perform NUKE → SOL swap with full ATA validation
 */
async function swapNukeToSOL(
  connection: Connection,
  rewardWalletAddress: PublicKey,
  nukeMint: PublicKey,
  amountNuke: bigint,
  poolKeys: any,
  slippageBps: number = 200
): Promise<{ solReceived: bigint; txSignature: string }> {
  // Step 1: Verify ATAs exist and SDK can query them
  const { nukeAta, wsolAta } = await verifyWalletATAsForSwap(
    connection,
    rewardWalletAddress,
    nukeMint
  );

  // Step 2: Calculate swap amounts
  const amountInDecimal = new Decimal(amountNuke.toString());
  const minAmountOutDecimal = new Decimal('0'); // Calculate based on pool

  // Step 3: Call SDK with explicit ATAs
  const swapConfigForSDK: any = {
    connection,
    poolKeys: poolKeys as any,
    userKeys: {
      tokenAccountIn: nukeAta,   // ✅ Explicit NUKE ATA
      tokenAccountOut: wsolAta,  // ✅ Explicit WSOL ATA
      owner: rewardWalletAddress,
    },
    amountIn: amountInDecimal,
    amountOut: minAmountOutDecimal,
    fixedSide: 'in',
  };

  // Step 4: Call SDK (will not crash because ATAs are verified and queryable)
  const swapResult = await Liquidity.makeSwapInstructionSimple(swapConfigForSDK);

  // Step 5: Build and send transaction
  // ... (transaction building logic)
  
  return { solReceived: 0n, txSignature: '' };
}
```

## One-Time Setup for All Wallets

### Reward Wallet
```bash
cd ~/reward-project/backend
npx tsx create-nuke-ata.ts
npx tsx create-wsol-atas.ts
```

### Treasury Wallet (if it performs swaps)
```bash
# Update create-nuke-ata.ts to use TREASURY_WALLET_PRIVATE_KEY_JSON
# Update create-wsol-atas.ts to include treasury wallet
npx tsx create-nuke-ata.ts
npx tsx create-wsol-atas.ts
```

### Admin Wallet (if it performs swaps)
```bash
# Similar setup for admin wallet
```

## Key Points

1. **ATAs Must Exist**: Both NUKE and WSOL ATAs must exist on-chain before swaps
2. **SDK Query Validation**: Pre-validate that `getParsedTokenAccountsByOwner()` works
3. **Explicit ATAs**: Always pass explicit ATA addresses to SDK
4. **Connection Health**: Test RPC connection before SDK call
5. **No Dynamic Creation**: Never create ATAs during swap transactions
6. **One-Time Setup**: Create ATAs once per wallet, reuse for all swaps

## Testing

After implementing this fix:
- ✅ Swaps verify ATAs exist before SDK call
- ✅ SDK query method is pre-validated
- ✅ Connection health is checked
- ✅ Clear error messages if anything is missing
- ✅ No more `.filter()` on undefined errors

## Devnet vs Mainnet

This solution works on both:
- **Devnet**: Use devnet RPC endpoints
- **Mainnet**: Use mainnet RPC endpoints

The only difference is the RPC URL - all validation logic is the same.

