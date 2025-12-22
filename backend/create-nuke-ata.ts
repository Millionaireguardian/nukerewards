/**
 * Script to create NUKE token ATA for the reward wallet
 * Run this ONCE - the ATA should exist permanently
 * 
 * Usage:
 *   cd backend
 *   npx tsx create-nuke-ata.ts
 */

import {
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  TOKEN_2022_PROGRAM_ID,
  getAccount,
} from '@solana/spl-token';
import { loadKeypairFromEnv } from './src/utils/loadKeypairFromEnv';
import { connection, NETWORK, tokenMint } from './src/config/solana';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Reward wallet public key (from your logs)
const REWARD_WALLET_PUBLIC_KEY = '6PpZCPj72mdzBfrSJCJab9y535v2greCBe6YVW7XeXpo';

async function createNukeATA(): Promise<void> {
  console.log('=== NUKE Token ATA Creation Script ===\n');
  console.log(`Network: ${NETWORK}`);
  console.log(`RPC: ${connection.rpcEndpoint}\n`);

  // Get NUKE mint address
  const nukeMint = tokenMint;
  console.log(`NUKE Mint Address: ${nukeMint.toBase58()}\n`);

  // Reward wallet public key
  const rewardWalletPubkey = new PublicKey(REWARD_WALLET_PUBLIC_KEY);
  console.log(`Reward Wallet: ${rewardWalletPubkey.toBase58()}\n`);

  // Derive NUKE ATA address
  const nukeAta = getAssociatedTokenAddressSync(
    nukeMint,
    rewardWalletPubkey,
    false,
    TOKEN_2022_PROGRAM_ID // NUKE is Token-2022
  );

  console.log('NUKE ATA Details:');
  console.log(`  Address: ${nukeAta.toBase58()}`);
  console.log(`  Owner:   ${rewardWalletPubkey.toBase58()}`);
  console.log(`  Mint:    ${nukeMint.toBase58()}`);
  console.log(`  Program: TOKEN_2022_PROGRAM_ID\n`);

  // Check if ATA already exists
  try {
    const account = await getAccount(connection, nukeAta, 'confirmed', TOKEN_2022_PROGRAM_ID);
    console.log('✅ NUKE ATA already exists!');
    console.log(`   Address: ${nukeAta.toBase58()}`);
    console.log(`   Balance: ${account.amount.toString()} (raw units)`);
    console.log(`   Balance: ${Number(account.amount) / 1e9} NUKE (with decimals)`);
    console.log(`   Mint: ${account.mint.toBase58()}`);
    console.log(`   Owner: ${account.owner.toBase58()}\n`);
    return;
  } catch (error) {
    // ATA doesn't exist, we need to create it
    console.log('⚠️  NUKE ATA does not exist - creating...\n');
  }

  // Load reward wallet keypair to pay for transaction
  let rewardWallet: Keypair;
  try {
    rewardWallet = loadKeypairFromEnv('REWARD_WALLET_PRIVATE_KEY_JSON');
    console.log(`Using Reward Wallet as payer: ${rewardWallet.publicKey.toBase58()}`);
  } catch (error) {
    throw new Error(
      `Cannot create NUKE ATA: Need REWARD_WALLET_PRIVATE_KEY_JSON to pay for transaction. ` +
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  // Verify reward wallet matches expected public key
  if (!rewardWallet.publicKey.equals(rewardWalletPubkey)) {
    throw new Error(
      `Reward wallet public key mismatch. ` +
      `Expected: ${rewardWalletPubkey.toBase58()}, ` +
      `Got: ${rewardWallet.publicKey.toBase58()}`
    );
  }

  // Check payer has SOL
  const payerBalance = await connection.getBalance(rewardWallet.publicKey);
  const requiredSol = 0.002; // Need at least 0.002 SOL for transaction fees
  if (payerBalance < requiredSol * 1e9) {
    throw new Error(
      `Reward wallet has insufficient SOL. ` +
      `Required: ${requiredSol} SOL, Available: ${payerBalance / 1e9} SOL. ` +
      `Please fund the reward wallet first.`
    );
  }
  console.log(`Reward wallet balance: ${payerBalance / 1e9} SOL\n`);

  // Create transaction to create NUKE ATA
  console.log('Creating transaction...');
  const transaction = new Transaction();
  transaction.add(
    createAssociatedTokenAccountInstruction(
      rewardWallet.publicKey, // payer
      nukeAta,               // ata
      rewardWalletPubkey,    // owner
      nukeMint,             // NUKE mint
      TOKEN_2022_PROGRAM_ID // Token-2022 program
    )
  );

  // Get recent blockhash
  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = rewardWallet.publicKey;

  // Sign and send transaction
  console.log('Signing and sending transaction...\n');
  transaction.sign(rewardWallet);
  
  try {
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [rewardWallet],
      { commitment: 'confirmed', maxRetries: 3 }
    );

    console.log('✅ NUKE ATA created successfully!');
    console.log(`   Transaction: https://solscan.io/tx/${signature}?cluster=${NETWORK}`);
    console.log(`   ATA Address: ${nukeAta.toBase58()}\n`);

    // Verify the account was created
    console.log('Verifying account creation...');
    const account = await getAccount(connection, nukeAta, 'confirmed', TOKEN_2022_PROGRAM_ID);
    console.log('✅ Verification successful!');
    console.log(`   Address: ${nukeAta.toBase58()}`);
    console.log(`   Balance: ${account.amount.toString()} (raw units)`);
    console.log(`   Balance: ${Number(account.amount) / 1e9} NUKE (with decimals)`);
    console.log(`   Mint: ${account.mint.toBase58()}`);
    console.log(`   Owner: ${account.owner.toBase58()}`);
    console.log(`   Program: TOKEN_2022_PROGRAM_ID\n`);

  } catch (error) {
    if (error instanceof Error && error.message.includes('already in use')) {
      console.log('✅ NUKE ATA already exists (created by another transaction)');
      // Verify it exists
      const account = await getAccount(connection, nukeAta, 'confirmed', TOKEN_2022_PROGRAM_ID);
      console.log(`   Address: ${nukeAta.toBase58()}`);
      console.log(`   Balance: ${account.amount.toString()} (raw units)`);
      console.log(`   Balance: ${Number(account.amount) / 1e9} NUKE (with decimals)`);
    } else {
      throw new Error(
        `Failed to create NUKE ATA: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

async function main() {
  try {
    await createNukeATA();
    console.log('=== Complete ===');
    console.log('NUKE ATA has been created. The reward wallet can now receive NUKE tokens.');
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

main();

