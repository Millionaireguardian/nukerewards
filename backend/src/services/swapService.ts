/**
 * Swap Service
 * 
 * Handles swapping NUKE tokens to SOL via Raydium (Standard AMM v4 or CPMM) on devnet
 * 
 * IMPORTANT: 
 * - Supports both Standard AMM (v4) and CPMM pool types
 * - Both pool types use the same Raydium AMM v4 program ID and instruction format
 * - NUKE is a Token-2022 transfer-fee token (4% fee), so received amounts account for fees
 * - Rejects CLMM and other unsupported pool types
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
  SendTransactionError,
} from '@solana/web3.js';
import {
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  getAccount,
  getMint,
  createAssociatedTokenAccountInstruction,
  createSyncNativeInstruction,
  NATIVE_MINT,
} from '@solana/spl-token';
import { connection, tokenMint } from '../config/solana';
import { RAYDIUM_CONFIG, WSOL_MINT, getRaydiumPoolId, RAYDIUM_AMM_PROGRAM_ID } from '../config/raydium';
import { logger } from '../utils/logger';
import { loadKeypairFromEnv } from '../utils/loadKeypairFromEnv';

// Official Raydium AMM Program ID (same for devnet and mainnet)
// Standard AMM (v4) and CPMM pools both use this same program ID
// DO NOT use pool IDs, config programs, or API metadata program IDs
const RAYDIUM_AMM_V4_PROGRAM_ID = new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8');

// Note: Hardcoded fallbacks have been removed
// Pool info (mints, vaults, program ID) must come from API response
// Reserves are fetched from chain if API doesn't provide them

// Default slippage tolerance (2%)
const DEFAULT_SLIPPAGE_BPS = 200; // 2% = 200 basis points

// Minimum SOL output to proceed with swap (0.001 SOL)
const MIN_SOL_OUTPUT = 0.001 * LAMPORTS_PER_SOL;

/**
 * Get reward wallet keypair
 */
function getRewardWallet(): Keypair {
  return loadKeypairFromEnv('REWARD_WALLET_PRIVATE_KEY_JSON');
}

// Types for Raydium API response
interface RaydiumApiPoolInfo {
  programId?: string; // Pool's program ID from API
  mintA?: { address: string; decimals?: number; programId?: string };
  mintB?: { address: string; decimals?: number; programId?: string };
  baseMint?: string;
  quoteMint?: string;
  mintAmountA?: number;
  mintAmountB?: number;
  type?: string; // Pool type: "Standard", "Cpmm", "Clmm", etc. (may be undefined)
  vault?: {
    A?: string; // Vault address for mintA
    B?: string; // Vault address for mintB
  };
}

interface RaydiumApiResponse {
  success?: boolean;
  data?: RaydiumApiPoolInfo[];
}

/**
 * Fetch pool info from Raydium API to validate pool type, get reserves, and vault addresses
 * Supports both Standard AMM (v4) and CPMM pools - rejects other types (e.g., CLMM)
 * NOTE: Standard and CPMM use the same program ID and instruction format
 * Uses /pools/key/ids endpoint which includes vault addresses
 */
async function fetchPoolInfoFromAPI(poolId: PublicKey): Promise<{
  poolType: 'Standard' | 'Cpmm';
  poolProgramId: PublicKey;
  mintA: PublicKey;
  mintB: PublicKey;
  reserveA?: bigint; // Reserve amounts from API (undefined if not provided - fetch from chain)
  reserveB?: bigint; // Reserve amounts from API (undefined if not provided - fetch from chain)
  decimalsA: number;
  decimalsB: number;
  vaultA: PublicKey;
  vaultB: PublicKey;
}> {
  // Use /pools/key/ids endpoint which includes vault addresses
  const apiUrl = `https://api-v3-devnet.raydium.io/pools/key/ids?ids=${poolId.toBase58()}`;
  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Raydium API returned ${response.status}`);
  }

  const apiData: RaydiumApiResponse = await response.json() as RaydiumApiResponse;
  
  if (!apiData.success || !apiData.data || apiData.data.length === 0) {
    throw new Error('Pool not found in Raydium API');
  }

  const poolInfo = apiData.data[0];

  // Extract program ID from API response (required)
  if (!poolInfo.programId) {
    throw new Error('Pool API response missing programId');
  }
  const poolProgramId = new PublicKey(poolInfo.programId);

  // Handle pool type - default to "Standard" if not provided (common for Standard AMM v4 pools)
  let normalizedType = 'standard';
  if (poolInfo.type) {
    normalizedType = poolInfo.type.toLowerCase();
  } else {
    logger.info('Pool type not in API response, defaulting to "Standard"', {
      poolId: poolId.toBase58(),
    });
  }

  // Support both Standard AMM (v4) and CPMM pools - reject other types
  if (!['standard', 'cpmm'].includes(normalizedType)) {
    throw new Error(`Unsupported Raydium pool type: "${poolInfo.type}". Only Standard AMM (v4) and CPMM pools are supported.`);
  }

  // Extract mint addresses (required - no fallbacks)
  if (!poolInfo.mintA || !poolInfo.mintB) {
    throw new Error('Pool API response missing mint addresses');
  }
  const mintA = new PublicKey(poolInfo.mintA.address);
  const mintB = new PublicKey(poolInfo.mintB.address);
  const decimalsA = poolInfo.mintA.decimals || 9;
  const decimalsB = poolInfo.mintB.decimals || 6;

  // Extract reserves from API if available (will fetch from chain if missing)
  let reserveA: bigint | undefined;
  let reserveB: bigint | undefined;
  if (poolInfo.mintAmountA !== undefined && poolInfo.mintAmountB !== undefined) {
    reserveA = BigInt(Math.floor(poolInfo.mintAmountA * Math.pow(10, decimalsA)));
    reserveB = BigInt(Math.floor(poolInfo.mintAmountB * Math.pow(10, decimalsB)));
    logger.debug('Reserves extracted from API response', {
      reserveA: reserveA.toString(),
      reserveB: reserveB.toString(),
    });
  } else {
    logger.info('Reserves not in API response - will fetch from chain', {
      poolId: poolId.toBase58(),
    });
  }

  // Extract vault addresses (required - no fallbacks)
  if (!poolInfo.vault?.A || !poolInfo.vault?.B) {
    throw new Error('Pool API response missing vault addresses');
  }
  const vaultA = new PublicKey(poolInfo.vault.A);
  const vaultB = new PublicKey(poolInfo.vault.B);

  // Normalize pool type for return (capitalize first letter)
  const normalizedPoolType = normalizedType === 'standard' ? 'Standard' : 'Cpmm';

  return {
    poolType: normalizedPoolType as 'Standard' | 'Cpmm',
    poolProgramId,
    mintA,
    mintB,
    reserveA, // May be undefined if API doesn't provide reserves
    reserveB, // May be undefined if API doesn't provide reserves
    decimalsA,
    decimalsB,
    vaultA,
    vaultB,
  };
}

/**
 * Fetch vault reserves directly from chain
 * Used when API doesn't provide reserve amounts
 */
async function fetchVaultReservesFromChain(
  vaultA: PublicKey,
  vaultB: PublicKey,
  decimalsA: number,
  decimalsB: number
): Promise<{
  reserveA: bigint;
  reserveB: bigint;
}> {
  logger.info('Fetching vault reserves from chain', {
    vaultA: vaultA.toBase58(),
    vaultB: vaultB.toBase58(),
  });

  // Try TOKEN_2022_PROGRAM_ID first, then TOKEN_PROGRAM_ID
  let vaultAAccount = null;
  let vaultBAccount = null;

  try {
    vaultAAccount = await getAccount(connection, vaultA, 'confirmed', TOKEN_2022_PROGRAM_ID);
  } catch {
    try {
      vaultAAccount = await getAccount(connection, vaultA, 'confirmed', TOKEN_PROGRAM_ID);
    } catch (error) {
      throw new Error(`Failed to fetch vaultA account: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  try {
    vaultBAccount = await getAccount(connection, vaultB, 'confirmed', TOKEN_2022_PROGRAM_ID);
  } catch {
    try {
      vaultBAccount = await getAccount(connection, vaultB, 'confirmed', TOKEN_PROGRAM_ID);
    } catch (error) {
      throw new Error(`Failed to fetch vaultB account: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (!vaultAAccount || !vaultBAccount) {
    throw new Error('Failed to fetch vault accounts from chain');
  }

  logger.info('Vault reserves fetched from chain', {
    reserveA: vaultAAccount.amount.toString(),
    reserveB: vaultBAccount.amount.toString(),
  });

  return {
    reserveA: vaultAAccount.amount,
    reserveB: vaultBAccount.amount,
  };
}

/**
 * Verify pool has sufficient liquidity for the swap
 */
function verifyLiquidity(
  sourceReserve: bigint,
  destReserve: bigint,
  amountIn: bigint,
  minDestAmount: bigint
): { valid: boolean; reason?: string } {
  // Check source reserve is sufficient
  if (sourceReserve === 0n) {
    return { valid: false, reason: 'Source reserve (NUKE) is zero - pool has no liquidity' };
  }

  // Check destination reserve is sufficient
  if (destReserve === 0n) {
    return { valid: false, reason: 'Destination reserve (SOL) is zero - pool has no liquidity' };
  }

  // Check destination reserve has enough liquidity (at least 2x expected output for safety)
  const minLiquidityRatio = 2n;
  const requiredLiquidity = minDestAmount * minLiquidityRatio;
  if (destReserve < requiredLiquidity) {
    return {
      valid: false,
      reason: `Destination reserve (${destReserve.toString()}) is insufficient. Required: ${requiredLiquidity.toString()}, Available: ${destReserve.toString()}`,
    };
  }

  return { valid: true };
}

/**
 * Create Raydium swap instruction (for Standard AMM v4 or CPMM)
 * 
 * Uses the official Raydium AMM v4 program ID and proper instruction format.
 * Standard AMM (v4) and CPMM pools both use this same instruction format.
 * 
 * CRITICAL: For Token-2022 compatibility, we must use TOKEN_2022_PROGRAM_ID when
 * the source token (NUKE) is Token-2022. Raydium supports mixed-program swaps
 * (Token-2022 source, SPL Token destination).
 * 
 * NOTE: Raydium swap instruction format (same for Standard and CPMM):
 * - Instruction discriminator: 9 (Swap)
 * - amountIn: u64 (8 bytes)
 * - minimumAmountOut: u64 (8 bytes)
 * 
 * Accounts (in order):
 * 0. poolId (writable)
 * 1. userSourceTokenAccount (writable) - user's NUKE account (Token-2022)
 * 2. userDestinationTokenAccount (writable) - user's WSOL account (SPL Token)
 * 3. poolSourceTokenAccount (writable) - pool's NUKE vault (Token-2022)
 * 4. poolDestinationTokenAccount (writable) - pool's WSOL vault (SPL Token)
 * 5. poolCoinMint - NUKE mint (Token-2022)
 * 6. poolPcMint - WSOL mint (SPL Token)
 * 7. userWallet (signer, writable)
 * 8. tokenProgramId - TOKEN_2022_PROGRAM_ID (required for Token-2022 source)
 * 9. systemProgram
 * 
 * IMPORTANT: The tokenProgramId account must be TOKEN_2022_PROGRAM_ID when swapping
 * from a Token-2022 token, even if the destination is SPL Token. Raydium handles
 * mixed-program swaps internally.
 */
function createRaydiumSwapInstruction(
  poolId: PublicKey,
  poolProgramId: PublicKey, // Pool's program ID from API response
  userSourceTokenAccount: PublicKey,
  userDestinationTokenAccount: PublicKey,
  poolSourceTokenAccount: PublicKey,
  poolDestinationTokenAccount: PublicKey,
  poolCoinMint: PublicKey,
  poolPcMint: PublicKey,
  amountIn: bigint,
  minimumAmountOut: bigint,
  userWallet: PublicKey,
  sourceTokenProgram: PublicKey // MUST be TOKEN_2022_PROGRAM_ID for Token-2022 source
): TransactionInstruction {
  // Instruction discriminator: 9 (Swap)
  const instructionData = Buffer.alloc(17);
  instructionData.writeUInt8(9, 0);
  instructionData.writeBigUInt64LE(amountIn, 1);
  instructionData.writeBigUInt64LE(minimumAmountOut, 9);

  // CRITICAL: Use TOKEN_2022_PROGRAM_ID for Token-2022 source tokens
  // Raydium supports mixed-program swaps (Token-2022 source, SPL Token destination)
  const tokenProgramId = sourceTokenProgram; // TOKEN_2022_PROGRAM_ID for NUKE

  return new TransactionInstruction({
    programId: poolProgramId, // Use pool's program ID from API response
    keys: [
      { pubkey: poolId, isSigner: false, isWritable: true },
      { pubkey: userSourceTokenAccount, isSigner: false, isWritable: true },
      { pubkey: userDestinationTokenAccount, isSigner: false, isWritable: true },
      { pubkey: poolSourceTokenAccount, isSigner: false, isWritable: true },
      { pubkey: poolDestinationTokenAccount, isSigner: false, isWritable: true },
      { pubkey: poolCoinMint, isSigner: false, isWritable: false },
      { pubkey: poolPcMint, isSigner: false, isWritable: false },
      { pubkey: userWallet, isSigner: true, isWritable: true },
      { pubkey: tokenProgramId, isSigner: false, isWritable: false }, // TOKEN_2022_PROGRAM_ID for NUKE
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: instructionData,
  });
}

/**
 * Swap NUKE tokens to SOL via Raydium (Standard AMM v4 or CPMM)
 * 
 * This function:
 * 1. Validates pool is Standard AMM (v4) or CPMM (rejects CLMM and others)
 * 2. Uses official Raydium AMM v4 program ID (same for both pool types)
 * 3. Handles NUKE's transfer fees (4% - tokens arrive at pool with fee deducted)
 * 4. Simulates transaction before sending
 * 5. Aborts distribution if swap fails
 * 
 * NOTE: Standard AMM (v4) and CPMM use the same program ID and instruction format.
 * The pool type field from the API is metadata; both execute identically.
 * 
 * @param amountNuke - Amount of NUKE to swap (in raw token units, with decimals)
 * @param slippageBps - Slippage tolerance in basis points (default: 200 = 2%)
 * @returns SOL received and transaction signature
 */
export async function swapNukeToSOL(
  amountNuke: bigint,
  slippageBps: number = DEFAULT_SLIPPAGE_BPS
): Promise<{
  solReceived: bigint;
  txSignature: string;
}> {
  try {
    logger.info('Starting NUKE to SOL swap via Raydium', {
      amountNuke: amountNuke.toString(),
      slippageBps,
      programId: RAYDIUM_AMM_V4_PROGRAM_ID.toBase58(),
      note: 'Supports both Standard AMM (v4) and CPMM pools',
    });

    // Step 1: Validate inputs
    if (amountNuke <= 0n) {
      throw new Error('Amount must be greater than zero');
    }

    const poolId = getRaydiumPoolId();
    if (!poolId) {
      throw new Error('RAYDIUM_POOL_ID not set in environment variables');
    }

    // Step 2: Get reward wallet
    const rewardWallet = getRewardWallet();
    const rewardWalletAddress = rewardWallet.publicKey;

    // Step 2.5: Detect Token-2022 vs SPL Token
    // NUKE is Token-2022, WSOL is SPL Token
    const NUKE_IS_TOKEN_2022 = true; // NUKE uses Token-2022 program
    const WSOL_IS_TOKEN_2022 = false; // WSOL uses SPL Token program
    const sourceTokenProgram = TOKEN_2022_PROGRAM_ID; // Required for NUKE (Token-2022)
    const destTokenProgram = TOKEN_PROGRAM_ID; // Required for WSOL (SPL Token)

    logger.info('Token program detection', {
      sourceTokenProgram: sourceTokenProgram.toBase58(),
      destTokenProgram: destTokenProgram.toBase58(),
      isToken2022Source: NUKE_IS_TOKEN_2022,
      isToken2022Dest: WSOL_IS_TOKEN_2022,
      note: 'NUKE is Token-2022, WSOL is SPL Token - Raydium supports mixed-program swaps',
    });

    // Step 3: Fetch pool info from API to validate pool type and get reserves
    logger.info('Fetching pool info from Raydium API', { poolId: poolId.toBase58() });
    const poolInfo = await fetchPoolInfoFromAPI(poolId);
    
    logger.info('Pool validated', {
      poolType: poolInfo.poolType,
      poolProgramId: poolInfo.poolProgramId.toBase58(),
      mintA: poolInfo.mintA.toBase58(),
      mintB: poolInfo.mintB.toBase58(),
      note: 'Using pool program ID from API response',
    });

    // Step 4: Determine swap direction and map mints/vaults
    const nukeMint = tokenMint;
    const solMint = WSOL_MINT;
    
    let poolSourceMint: PublicKey;
    let poolDestMint: PublicKey;
    let poolSourceVault: PublicKey;
    let poolDestVault: PublicKey;
    let sourceDecimals: number;
    let destDecimals: number;

    if (poolInfo.mintA.equals(nukeMint) && poolInfo.mintB.equals(solMint)) {
      // mintA = NUKE, mintB = SOL
      poolSourceMint = poolInfo.mintA;
      poolDestMint = poolInfo.mintB;
      poolSourceVault = poolInfo.vaultA;
      poolDestVault = poolInfo.vaultB;
      sourceDecimals = poolInfo.decimalsA;
      destDecimals = poolInfo.decimalsB;
    } else if (poolInfo.mintB.equals(nukeMint) && poolInfo.mintA.equals(solMint)) {
      // mintB = NUKE, mintA = SOL
      poolSourceMint = poolInfo.mintB;
      poolDestMint = poolInfo.mintA;
      poolSourceVault = poolInfo.vaultB;
      poolDestVault = poolInfo.vaultA;
      sourceDecimals = poolInfo.decimalsB;
      destDecimals = poolInfo.decimalsA;
    } else {
      throw new Error(`Pool does not contain NUKE/SOL pair. Pool mints: ${poolInfo.mintA.toBase58()}, ${poolInfo.mintB.toBase58()}`);
    }

    // Step 4.5: Get reserves (from API if available, otherwise from chain)
    let sourceReserve: bigint;
    let destReserve: bigint;

    if (poolInfo.reserveA !== undefined && poolInfo.reserveB !== undefined) {
      // Use API reserves (map to source/dest based on swap direction)
      if (poolInfo.mintA.equals(poolSourceMint)) {
        sourceReserve = poolInfo.reserveA;
        destReserve = poolInfo.reserveB;
      } else {
        sourceReserve = poolInfo.reserveB;
        destReserve = poolInfo.reserveA;
      }
      logger.info('Using reserves from API', {
        sourceReserve: sourceReserve.toString(),
        destReserve: destReserve.toString(),
      });
    } else {
      // Fetch reserves from chain
      logger.info('API reserves not available, fetching from chain vaults');
      const chainReserves = await fetchVaultReservesFromChain(
        poolSourceVault,
        poolDestVault,
        sourceDecimals,
        destDecimals
      );
      sourceReserve = chainReserves.reserveA;
      destReserve = chainReserves.reserveB;
      logger.info('Using reserves from chain', {
        sourceReserve: sourceReserve.toString(),
        destReserve: destReserve.toString(),
      });
    }

    logger.info('Swap direction and reserves determined', {
      poolSourceMint: poolSourceMint.toBase58(),
      poolDestMint: poolDestMint.toBase58(),
      poolSourceVault: poolSourceVault.toBase58(),
      poolDestVault: poolDestVault.toBase58(),
      sourceReserve: sourceReserve.toString(),
      destReserve: destReserve.toString(),
    });

    // Step 5: Verify liquidity before calculating swap output
    // First, estimate expected output for liquidity check
    const feeMultiplier = 0.9975; // Raydium fee (0.25%)
    const nukeAfterTransferFee = amountNuke * BigInt(96) / BigInt(100); // 4% transfer fee deducted
    
    // Estimate expected output for liquidity verification
    const estimatedDestAmount = (destReserve * nukeAfterTransferFee * BigInt(Math.floor(feeMultiplier * 10000))) / (sourceReserve + nukeAfterTransferFee) / BigInt(10000);
    const estimatedMinDestAmount = (estimatedDestAmount * BigInt(10000 - slippageBps)) / BigInt(10000);

    // Verify liquidity
    const liquidityCheck = verifyLiquidity(sourceReserve, destReserve, amountNuke, estimatedMinDestAmount);
    if (!liquidityCheck.valid) {
      logger.warn('Insufficient liquidity - aborting swap', {
        reason: liquidityCheck.reason,
        sourceReserve: sourceReserve.toString(),
        destReserve: destReserve.toString(),
        amountNuke: amountNuke.toString(),
        estimatedMinDestAmount: estimatedMinDestAmount.toString(),
      });
      throw new Error(`Insufficient liquidity: ${liquidityCheck.reason}`);
    }

    // Step 7: Calculate expected SOL output (final calculation)
    const expectedDestAmount = (destReserve * nukeAfterTransferFee * BigInt(Math.floor(feeMultiplier * 10000))) / (sourceReserve + nukeAfterTransferFee) / BigInt(10000);
    const minDestAmount = (expectedDestAmount * BigInt(10000 - slippageBps)) / BigInt(10000);

    if (minDestAmount < MIN_SOL_OUTPUT) {
      logger.warn('Expected SOL output below minimum threshold', {
        expectedSolLamports: expectedDestAmount.toString(),
        minSolLamports: minDestAmount.toString(),
        minimumThreshold: MIN_SOL_OUTPUT.toString(),
      });
      throw new Error(
        `Expected SOL output too low: ${Number(minDestAmount) / LAMPORTS_PER_SOL} SOL (minimum: ${MIN_SOL_OUTPUT / LAMPORTS_PER_SOL} SOL). Pool may have insufficient liquidity.`
      );
    }

    logger.info('Swap calculation', {
      amountNuke: amountNuke.toString(),
      amountNukeAfterTransferFee: nukeAfterTransferFee.toString(),
      sourceReserve: sourceReserve.toString(),
      destReserve: destReserve.toString(),
      expectedSolLamports: expectedDestAmount.toString(),
      minSolLamports: minDestAmount.toString(),
      slippageBps,
      note: 'NUKE has 4% transfer fee, so pool receives less than amountNuke',
    });

    // Step 7: Get user token accounts
    const rewardNukeAccount = getAssociatedTokenAddressSync(
      tokenMint,
      rewardWalletAddress,
      false,
      TOKEN_2022_PROGRAM_ID
    );

    // Check balance
    let rewardNukeBalance = 0n;
    try {
      const rewardAccount = await getAccount(connection, rewardNukeAccount, 'confirmed', TOKEN_2022_PROGRAM_ID);
      rewardNukeBalance = rewardAccount.amount;
    } catch (error) {
      throw new Error(`Reward wallet NUKE account not found or has no balance: ${error instanceof Error ? error.message : String(error)}`);
    }

    if (rewardNukeBalance < amountNuke) {
      throw new Error(
        `Insufficient NUKE balance. Required: ${amountNuke.toString()}, Available: ${rewardNukeBalance.toString()}`
      );
    }

    const userSolAccount = getAssociatedTokenAddressSync(
      NATIVE_MINT, // WSOL
      rewardWalletAddress,
      false,
      TOKEN_PROGRAM_ID
    );

    // Step 8: Build transaction
    const transaction = new Transaction();
    
    // Create WSOL account if needed
    const userSolAccountInfo = await connection.getAccountInfo(userSolAccount).catch(() => null);
    if (!userSolAccountInfo) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          rewardWalletAddress,
          userSolAccount,
          rewardWalletAddress,
          NATIVE_MINT,
          TOKEN_PROGRAM_ID
        )
      );
    }

    // Create swap instruction using official Raydium AMM v4 program (works for both Standard and CPMM)
    // CRITICAL: Must use TOKEN_2022_PROGRAM_ID for Token-2022 source (NUKE)
    // Raydium supports mixed-program swaps (Token-2022 source, SPL Token destination)
    logger.info('Swap instruction debug - accounts verification', {
      poolId: poolId.toBase58(),
      poolType: poolInfo.poolType,
      poolProgramId: poolInfo.poolProgramId.toBase58(),
      tokenProgramId: sourceTokenProgram.toBase58(),
      sourceMint: poolSourceMint.toBase58(),
      destinationMint: poolDestMint.toBase58(),
      userSourceTokenAccount: rewardNukeAccount.toBase58(),
      userDestTokenAccount: userSolAccount.toBase58(),
      poolSourceVault: poolSourceVault.toBase58(),
      poolDestVault: poolDestVault.toBase58(),
      rewardWallet: rewardWalletAddress.toBase58(),
      isToken2022Source: NUKE_IS_TOKEN_2022,
      isToken2022Dest: WSOL_IS_TOKEN_2022,
      amountIn: amountNuke.toString(),
      minAmountOut: minDestAmount.toString(),
      note: 'Using TOKEN_2022_PROGRAM_ID for Token-2022 source (NUKE)',
    });

    // Verify all accounts exist before building instruction
    // Use getAccount() for token accounts (with proper program ID) and getAccountInfo() for regular accounts
    let rewardNukeAccountExists = false;
    let poolSourceVaultExists = false;
    let poolDestVaultExists = false;
    let userSolAccountExists = false;
    let poolAccountExists = false;

    try {
      await getAccount(connection, rewardNukeAccount, 'confirmed', TOKEN_2022_PROGRAM_ID);
      rewardNukeAccountExists = true;
    } catch {
      // Account doesn't exist or error
    }

    try {
      // Pool source vault (NUKE) - try TOKEN_2022_PROGRAM_ID first, then TOKEN_PROGRAM_ID
      await getAccount(connection, poolSourceVault, 'confirmed', TOKEN_2022_PROGRAM_ID);
      poolSourceVaultExists = true;
    } catch {
      try {
        await getAccount(connection, poolSourceVault, 'confirmed', TOKEN_PROGRAM_ID);
        poolSourceVaultExists = true;
      } catch {
        // Vault doesn't exist
      }
    }

    try {
      // Pool destination vault (WSOL) - try TOKEN_PROGRAM_ID first, then TOKEN_2022_PROGRAM_ID
      await getAccount(connection, poolDestVault, 'confirmed', TOKEN_PROGRAM_ID);
      poolDestVaultExists = true;
    } catch {
      try {
        await getAccount(connection, poolDestVault, 'confirmed', TOKEN_2022_PROGRAM_ID);
        poolDestVaultExists = true;
      } catch {
        // Vault doesn't exist
      }
    }

    try {
      await getAccount(connection, userSolAccount, 'confirmed', TOKEN_PROGRAM_ID);
      userSolAccountExists = true;
    } catch {
      // Account doesn't exist yet (will be created if needed)
    }

    try {
      const poolAccount = await connection.getAccountInfo(poolId);
      poolAccountExists = !!poolAccount;
    } catch {
      // Pool doesn't exist
    }

    logger.info('Account existence checks', {
      rewardNukeAccount: rewardNukeAccountExists ? 'exists' : 'missing',
      userSolAccount: userSolAccountExists ? 'exists' : 'missing (will create if needed)',
      poolSourceVault: poolSourceVaultExists ? 'exists' : 'missing',
      poolDestVault: poolDestVaultExists ? 'exists' : 'missing',
      poolId: poolAccountExists ? 'exists' : 'missing',
    });

    if (!rewardNukeAccountExists) {
      throw new Error(`Reward NUKE account does not exist: ${rewardNukeAccount.toBase58()}`);
    }
    if (!poolSourceVaultExists) {
      throw new Error(`Pool source vault does not exist: ${poolSourceVault.toBase58()}. This may indicate an incorrect pool ID or vault addresses.`);
    }
    if (!poolDestVaultExists) {
      throw new Error(`Pool destination vault does not exist: ${poolDestVault.toBase58()}. This may indicate an incorrect pool ID or vault addresses.`);
    }
    if (!poolAccountExists) {
      throw new Error(`Pool account does not exist: ${poolId.toBase58()}`);
    }

    const swapInstruction = createRaydiumSwapInstruction(
      poolId,
      poolInfo.poolProgramId, // Pool's program ID from API response
      rewardNukeAccount, // userSourceTokenAccount (NUKE - Token-2022)
      userSolAccount, // userDestinationTokenAccount (WSOL - SPL Token)
      poolSourceVault, // poolSourceTokenAccount (NUKE vault - Token-2022)
      poolDestVault, // poolDestinationTokenAccount (WSOL vault - SPL Token)
      poolSourceMint, // poolCoinMint (NUKE - Token-2022)
      poolDestMint, // poolPcMint (WSOL - SPL Token)
      amountNuke, // amountIn (transfer fee will be deducted during transfer)
      minDestAmount, // minimumAmountOut
      rewardWalletAddress, // userWallet
      sourceTokenProgram // TOKEN_2022_PROGRAM_ID (required for Token-2022 source)
    );

    transaction.add(swapInstruction);

    // Step 9: Set transaction properties
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = rewardWalletAddress;

    // Step 10: Simulate transaction before sending
    logger.info('Simulating Raydium swap transaction');
    try {
      const simulation = await connection.simulateTransaction(transaction, [rewardWallet]);
      
      if (simulation.value.err) {
        const errorMessage = JSON.stringify(simulation.value.err);
        logger.error('Transaction simulation failed', {
          error: errorMessage,
          logs: simulation.value.logs || [],
        });
        throw new Error(`Transaction simulation failed: ${errorMessage}`);
      }

      logger.info('Transaction simulation passed', {
        unitsConsumed: simulation.value.unitsConsumed,
        logMessages: simulation.value.logs?.slice(0, 10) || [], // First 10 log lines
      });
    } catch (simError) {
      // If simulation fails with SendTransactionError, extract logs
      if (simError instanceof Error && 'getLogs' in simError && typeof (simError as any).getLogs === 'function') {
        const sendError = simError as SendTransactionError;
        try {
          const logs = await sendError.getLogs(connection);
          logger.error('Transaction simulation failed with detailed logs', {
            error: sendError.message,
            logs: logs || [],
          });
        } catch (logError) {
          logger.error('Transaction simulation failed (could not get logs)', {
            error: sendError.message,
            logError: logError instanceof Error ? logError.message : String(logError),
          });
        }
      }
      throw simError;
    }

    // Step 11: Sign and send transaction
    transaction.sign(rewardWallet);

    logger.info('Sending Raydium swap transaction', {
      expectedSolLamports: expectedDestAmount.toString(),
      minSolLamports: minDestAmount.toString(),
      programId: RAYDIUM_AMM_V4_PROGRAM_ID.toBase58(),
      poolType: poolInfo.poolType,
    });

    let signature: string;
    try {
      signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [rewardWallet],
        {
          commitment: 'confirmed',
          maxRetries: 3,
          skipPreflight: false, // We already simulated, but keep preflight for safety
        }
      );
    } catch (sendError) {
      // If send fails with SendTransactionError, extract logs
      if (sendError instanceof Error && 'getLogs' in sendError && typeof (sendError as any).getLogs === 'function') {
        const txError = sendError as SendTransactionError;
        try {
          const logs = await txError.getLogs(connection);
          logger.error('Transaction send failed with detailed logs', {
            error: txError.message,
            logs: logs || [],
          });
        } catch (logError) {
          logger.error('Transaction send failed (could not get logs)', {
            error: txError.message,
            logError: logError instanceof Error ? logError.message : String(logError),
          });
        }
      }
      throw sendError;
    }

    // Step 12: Verify SOL was received
    const userSolBalance = await getAccount(connection, userSolAccount, 'confirmed', TOKEN_PROGRAM_ID).catch(() => null);
    const solReceived = userSolBalance ? userSolBalance.amount : 0n;

    logger.info('Raydium swap completed successfully', {
      signature,
      solReceived: solReceived.toString(),
      expectedSol: expectedDestAmount.toString(),
    });

    return {
      solReceived: solReceived > 0n ? solReceived : expectedDestAmount, // Use actual if available, else expected
      txSignature: signature,
    };
  } catch (error) {
    logger.error('Error swapping NUKE to SOL via Raydium', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      amountNuke: amountNuke.toString(),
      programId: RAYDIUM_AMM_V4_PROGRAM_ID.toBase58(),
    });
    throw error; // Re-throw to abort reward distribution
  }
}
