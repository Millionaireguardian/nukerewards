import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  TOKEN_2022_PROGRAM_ID,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import * as fs from 'fs';
import { CONFIG } from './config.js';

// Get connection
const connection = new Connection(
  CONFIG.network[CONFIG.network.current],
  'confirmed'
);

// Load wallet
let adminWallet;
try {
  const keypairPath = CONFIG.wallet.keypairPath;
  if (!fs.existsSync(keypairPath)) {
    throw new Error(`Keypair file not found at: ${keypairPath}`);
  }
  const secretKey = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
  adminWallet = Keypair.fromSecretKey(new Uint8Array(secretKey));
  console.log('✅ Admin Wallet Address:', adminWallet.publicKey.toBase58());
} catch (error) {
  console.error('❌ Error loading wallet:', error.message);
  process.exit(1);
}

async function mintTokens() {
  try {
    // Load token info
    if (!fs.existsSync('token-info.json')) {
      throw new Error('token-info.json not found. Please create a token first.');
    }

    const tokenInfo = JSON.parse(fs.readFileSync('token-info.json', 'utf-8'));
    console.log('\n🚀 Minting Additional Tokens...\n');
    console.log('📋 Token Information:');
    console.log(`   Mint: ${tokenInfo.mint}`);
    console.log(`   Symbol: ${tokenInfo.symbol || 'N/A'}`);
    console.log(`   Network: ${tokenInfo.network}\n`);

    // Reconstruct mint authority from saved secret key
    const mintAuthority = Keypair.fromSecretKey(
      new Uint8Array(tokenInfo.mintAuthoritySecretKey)
    );
    const mint = new PublicKey(tokenInfo.mint);
    const recipient = adminWallet.publicKey;

    // Get amount to mint (can be customized)
    const amountToMint = process.argv[2] 
      ? BigInt(process.argv[2]) 
      : BigInt(100_000_000_000); // Default: 100,000 tokens (with 6 decimals)

    console.log(`📝 Minting ${amountToMint.toString()} raw units...`);
    console.log(`   (${Number(amountToMint) / Math.pow(10, tokenInfo.decimals)} tokens)\n`);

    // Get or create ATA
    const associatedTokenAccount = getAssociatedTokenAddressSync(
      mint,
      recipient,
      false,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const transaction = new Transaction();
    
    // Check if ATA exists
    const ataInfo = await connection.getAccountInfo(associatedTokenAccount);
    if (!ataInfo) {
      console.log('📝 Creating Associated Token Account...');
      transaction.add(
        createAssociatedTokenAccountInstruction(
          recipient,
          associatedTokenAccount,
          recipient,
          mint,
          TOKEN_2022_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
    }

    // Add mint instruction
    transaction.add(
      createMintToInstruction(
        mint,
        associatedTokenAccount,
        mintAuthority.publicKey,
        amountToMint,
        [],
        TOKEN_2022_PROGRAM_ID
      )
    );

    // Send transaction
    const blockhash = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash.blockhash;
    transaction.feePayer = recipient;
    transaction.sign(adminWallet, mintAuthority);

    console.log('📤 Sending transaction...');
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [adminWallet, mintAuthority],
      { commitment: 'confirmed' }
    );

    console.log('✅ Tokens minted successfully!');
    console.log(`   Signature: ${signature}`);
    console.log(`   Solscan: https://solscan.io/tx/${signature}?cluster=${tokenInfo.network}\n`);

    // Verify balance
    const balance = await connection.getTokenAccountBalance(associatedTokenAccount);
    console.log(`✅ New Balance: ${balance.value.uiAmount} tokens\n`);

    return { signature, balance: balance.value.uiAmount };
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    throw error;
  }
}

// Usage: node mint-tokens.js [amount_in_raw_units]
// Example: node mint-tokens.js 100000000000 (mints 100,000 tokens with 6 decimals)
mintTokens()
  .then(() => {
    console.log('✅ Process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Process failed:', error.message);
    process.exit(1);
  });

