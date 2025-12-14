import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  TOKEN_2022_PROGRAM_ID,
  ExtensionType,
  getMintLen,
  createInitializeMint2Instruction,
  createInitializeTransferFeeConfigInstruction,
  getTransferFeeConfig,
  unpackMint,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';

// Configuration
const DEVNET_RPC = 'https://api.devnet.solana.com';
const TOKEN_NAME = 'NUKE';
const TOKEN_SYMBOL = 'NUKE';
const TOKEN_DECIMALS = 9;
const TOKEN_SUPPLY = BigInt(1_000_000_000) * BigInt(10 ** TOKEN_DECIMALS); // 1 billion tokens
const TRANSFER_FEE_BASIS_POINTS = 500; // 5% (500 basis points)
const MAX_TRANSFER_FEE = BigInt(10_000_000_000); // 10 tokens (with 9 decimals) - reasonable cap
const TOKEN_IMAGE_URI = 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Radiation_warning_symbol.svg/1024px-Radiation_warning_symbol.svg.png';

// File paths
const ADMIN_KEYPAIR_PATH = path.join(process.cwd(), 'admin.json');
const MINT_AUTHORITY_PATH = path.join(process.cwd(), 'mint-authority.json');
const TAX_WALLET_PATH = path.join(process.cwd(), 'tax-wallet.json');

/**
 * Load keypair from JSON file
 */
function loadKeypair(filePath: string): Keypair {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Keypair file not found: ${filePath}`);
    }
    const secretKey = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return Keypair.fromSecretKey(new Uint8Array(secretKey));
  } catch (error) {
    throw new Error(`Failed to load keypair from ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Save keypair to JSON file
 */
function saveKeypair(keypair: Keypair, filePath: string): void {
  try {
    const secretKey = Array.from(keypair.secretKey);
    fs.writeFileSync(filePath, JSON.stringify(secretKey, null, 2));
    console.log(`✅ Saved keypair to: ${filePath}`);
  } catch (error) {
    throw new Error(`Failed to save keypair to ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Main function to create Token-2022 mint with transfer tax
 */
async function createTaxToken(): Promise<void> {
  try {
    console.log('\n🚀 Creating Token-2022 Mint with Transfer Tax\n');
    console.log('═'.repeat(60));
    
    // Step 1: Connect to devnet
    console.log('\n📡 Step 1: Connecting to Solana Devnet...');
    const connection = new Connection(DEVNET_RPC, 'confirmed');
    const version = await connection.getVersion();
    console.log(`✅ Connected to Devnet (Version: ${version['solana-core']})\n`);

    // Step 2: Load admin payer wallet
    console.log('💼 Step 2: Loading admin payer wallet...');
    const adminWallet = loadKeypair(ADMIN_KEYPAIR_PATH);
    const adminBalance = await connection.getBalance(adminWallet.publicKey);
    console.log(`✅ Admin Wallet: ${adminWallet.publicKey.toBase58()}`);
    console.log(`   Balance: ${adminBalance / LAMPORTS_PER_SOL} SOL`);
    
    if (adminBalance < 0.1 * LAMPORTS_PER_SOL) {
      console.warn('⚠️  Warning: Low balance. You may need to airdrop SOL for devnet.');
    }
    console.log('');

    // Step 3: Generate and save keypairs
    console.log('🔑 Step 3: Generating keypairs...');
    const mintAuthority = Keypair.generate();
    const taxDestinationWallet = Keypair.generate();
    
    saveKeypair(mintAuthority, MINT_AUTHORITY_PATH);
    saveKeypair(taxDestinationWallet, TAX_WALLET_PATH);
    console.log(`✅ Mint Authority: ${mintAuthority.publicKey.toBase58()}`);
    console.log(`✅ Tax Destination: ${taxDestinationWallet.publicKey.toBase58()}\n`);

    // Step 4: Create mint account with TransferFeeConfig extension
    console.log('🏗️  Step 4: Creating Token-2022 mint with TransferFeeConfig extension...');
    
    const mint = Keypair.generate();
    const mintLen = getMintLen([ExtensionType.TransferFeeConfig]);
    const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);
    
    console.log(`   Mint Address: ${mint.publicKey.toBase58()}`);
    console.log(`   Required Rent: ${lamports / LAMPORTS_PER_SOL} SOL`);
    console.log(`   Transfer Fee: ${TRANSFER_FEE_BASIS_POINTS / 100}%`);
    console.log(`   Max Transfer Fee: ${MAX_TRANSFER_FEE.toString()} lamports\n`);

    const transaction = new Transaction();
    
    // Create mint account
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: adminWallet.publicKey,
        newAccountPubkey: mint.publicKey,
        space: mintLen,
        lamports,
        programId: TOKEN_2022_PROGRAM_ID,
      })
    );

    // Initialize transfer fee config
    // Transfer fee config authority and withdraw authority will be the tax destination wallet
    transaction.add(
      createInitializeTransferFeeConfigInstruction(
        mint.publicKey,
        taxDestinationWallet.publicKey, // transferFeeConfigAuthority
        taxDestinationWallet.publicKey, // withdrawWithheldAuthority
        TRANSFER_FEE_BASIS_POINTS,
        MAX_TRANSFER_FEE,
        TOKEN_2022_PROGRAM_ID
      )
    );

    // Initialize mint
    transaction.add(
      createInitializeMint2Instruction(
        mint.publicKey,
        TOKEN_DECIMALS,
        mintAuthority.publicKey, // mint authority
        null, // freeze authority (null = no freeze authority)
        TOKEN_2022_PROGRAM_ID
      )
    );

    // Send and confirm transaction
    console.log('   Sending transaction...');
    const blockhash = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash.blockhash;
    transaction.feePayer = adminWallet.publicKey;
    transaction.sign(adminWallet, mint);

    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [adminWallet, mint],
      { commitment: 'confirmed' }
    );
    
    console.log(`✅ Mint created successfully!`);
    console.log(`   Transaction Signature: ${signature}\n`);

    // Step 5: Verify transfer fee configuration
    console.log('🔍 Step 5: Verifying transfer fee configuration...');
    const mintInfo = await connection.getAccountInfo(mint.publicKey);
    if (!mintInfo) {
      throw new Error('Failed to fetch mint account info');
    }
    
    const parsedMint = unpackMint(mint.publicKey, mintInfo, TOKEN_2022_PROGRAM_ID);
    const transferFeeConfig = getTransferFeeConfig(parsedMint);
    
    if (!transferFeeConfig) {
      throw new Error('Transfer fee config not found on mint');
    }
    
    console.log(`✅ Transfer fee verified!`);
    console.log(`   Fee Basis Points: ${transferFeeConfig.newerTransferFee.transferFeeBasisPoints}`);
    console.log(`   Max Fee: ${transferFeeConfig.newerTransferFee.maximumFee.toString()}`);
    console.log(`   Transfer Fee Config Authority: ${transferFeeConfig.transferFeeConfigAuthority?.toBase58() || 'None'}`);
    console.log(`   Withdraw Withheld Authority: ${transferFeeConfig.withdrawWithheldAuthority?.toBase58() || 'None'}\n`);

    // Step 6: Create ATA and mint tokens
    console.log('💰 Step 6: Creating ATA and minting tokens...');
    const associatedTokenAccount = getAssociatedTokenAddressSync(
      mint.publicKey,
      adminWallet.publicKey,
      false,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const mintTransaction = new Transaction();
    const ataInfo = await connection.getAccountInfo(associatedTokenAccount);
    
    if (!ataInfo) {
      mintTransaction.add(
        createAssociatedTokenAccountInstruction(
          adminWallet.publicKey,
          associatedTokenAccount,
          adminWallet.publicKey,
          mint.publicKey,
          TOKEN_2022_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
    }

    mintTransaction.add(
      createMintToInstruction(
        mint.publicKey,
        associatedTokenAccount,
        mintAuthority.publicKey,
        TOKEN_SUPPLY,
        [],
        TOKEN_2022_PROGRAM_ID
      )
    );

    const mintBlockhash = await connection.getLatestBlockhash('confirmed');
    mintTransaction.recentBlockhash = mintBlockhash.blockhash;
    mintTransaction.feePayer = adminWallet.publicKey;
    mintTransaction.sign(adminWallet, mintAuthority);

    const mintSignature = await sendAndConfirmTransaction(
      connection,
      mintTransaction,
      [adminWallet, mintAuthority],
      { commitment: 'confirmed' }
    );
    
    console.log(`✅ Tokens minted successfully!`);
    console.log(`   Transaction Signature: ${mintSignature}`);
    
    const balance = await connection.getTokenAccountBalance(associatedTokenAccount);
    console.log(`   Token Balance: ${balance.value.uiAmountString} ${TOKEN_SYMBOL}\n`);

    // Step 7: Note about metadata
    console.log('📝 Step 7: Metadata');
    console.log('⚠️  Note: Token metadata can be added separately using Metaplex tools.');
    console.log(`   Token Name: ${TOKEN_NAME}`);
    console.log(`   Token Symbol: ${TOKEN_SYMBOL}`);
    console.log(`   Image URI: ${TOKEN_IMAGE_URI}`);
    console.log(`   Metadata PDA: Use Metaplex CLI or SDK to add metadata to mint ${mint.publicKey.toBase58()}\n`);
    const metaSignature = 'N/A - Add metadata separately';

    // Final summary
    console.log('═'.repeat(60));
    console.log('\n🎉 Token-2022 Mint Created Successfully!\n');
    console.log('📊 Summary:');
    console.log(`   Mint Address: ${mint.publicKey.toBase58()}`);
    console.log(`   Token Name: ${TOKEN_NAME}`);
    console.log(`   Token Symbol: ${TOKEN_SYMBOL}`);
    console.log(`   Decimals: ${TOKEN_DECIMALS}`);
    console.log(`   Total Supply: ${(Number(TOKEN_SUPPLY) / 10 ** TOKEN_DECIMALS).toLocaleString()} ${TOKEN_SYMBOL}`);
    console.log(`   Transfer Tax: ${TRANSFER_FEE_BASIS_POINTS / 100}%`);
    console.log(`   Max Transfer Fee: ${MAX_TRANSFER_FEE.toString()} lamports`);
    console.log(`\n🔑 Key Addresses:`);
    console.log(`   Admin Payer: ${adminWallet.publicKey.toBase58()}`);
    console.log(`   Mint Authority: ${mintAuthority.publicKey.toBase58()}`);
    console.log(`   Tax Destination: ${taxDestinationWallet.publicKey.toBase58()}`);
    console.log(`\n💾 Keypair Files:`);
    console.log(`   Admin: ${ADMIN_KEYPAIR_PATH}`);
    console.log(`   Mint Authority: ${MINT_AUTHORITY_PATH}`);
    console.log(`   Tax Destination: ${TAX_WALLET_PATH}`);
    console.log(`\n📝 Transaction Signatures:`);
    console.log(`   Mint Creation: ${signature}`);
    console.log(`   Token Minting: ${mintSignature}`);
    console.log(`   Metadata: ${metaSignature}\n`);

  } catch (error) {
    console.error('\n❌ Error creating token:');
    if (error instanceof Error) {
      console.error(`   Message: ${error.message}`);
      if (error.stack) {
        console.error(`   Stack: ${error.stack}`);
      }
    } else {
      console.error(`   Unknown error: ${String(error)}`);
    }
    process.exit(1);
  }
}

// Run the script
createTaxToken()
  .then(() => {
    console.log('✅ Script completed successfully\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

