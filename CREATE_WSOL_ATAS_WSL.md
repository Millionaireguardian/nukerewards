# Create WSOL ATAs on WSL - Node.js Method

Since you're on WSL and don't have Solana CLI installed, we'll use a Node.js script instead.

## Method 1: Use the Node.js Script (Recommended)

I've created a TypeScript script that uses your existing project setup.

### Step 1: Navigate to backend directory

```bash
cd ~/reward-project/backend
```

### Step 2: Run the script

```bash
# From backend directory
npx tsx create-wsol-atas.ts
```

The script will:
- ✅ Load your wallet from environment variables
- ✅ Check if WSOL ATAs already exist
- ✅ Create them if missing
- ✅ Verify they were created successfully

### What the script does:

1. **Reward Wallet** (`6PpZCPj72mdzBfrSJCJab9y535v2greCBe6YVW7XeXpo`)
   - Creates WSOL ATA if it doesn't exist
   - Uses Reward Wallet as payer (needs SOL for fees)

2. **Treasury Wallet** (`DwhLErVhPhzg1ep19Lracmp6iMTECh4nVBdPebsvJwjo`)
   - Currently commented out (uncomment if needed)
   - Only create if treasury wallet performs swaps

## Method 2: Install Solana CLI on WSL (Alternative)

If you prefer using CLI commands:

### Install Solana CLI

```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Add to PATH (add to ~/.bashrc for persistence)
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Reload shell or run:
source ~/.bashrc

# Verify installation
solana --version
```

### Install SPL Token CLI

```bash
# Option 1: Using Cargo (if Rust is installed)
cargo install spl-token-cli

# Option 2: Using npm
npm install -g @solana/spl-token
```

### Then use the CLI commands

```bash
# Set network
solana config set --url devnet  # or mainnet

# Create WSOL ATAs
spl-token create-account So11111111111111111111111111111111111111112 --owner 6PpZCPj72mdzBfrSJCJab9y535v2greCBe6YVW7XeXpo
spl-token create-account So11111111111111111111111111111111111111112 --owner DwhLErVhPhzg1ep19Lracmp6iMTECh4nVBdPebsvJwjo
```

## Method 3: Quick Node.js One-Liner

If you want to create it manually with a quick script:

```bash
cd ~/reward-project/backend
npx tsx -e "
import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction, NATIVE_MINT, TOKEN_PROGRAM_ID, getAccount } from '@solana/spl-token';
import { loadKeypairFromEnv } from './src/utils/loadKeypairFromEnv';
import { connection } from './src/config/solana';

const rewardWallet = loadKeypairFromEnv('REWARD_WALLET_PRIVATE_KEY_JSON');
const rewardPubkey = new PublicKey('6PpZCPj72mdzBfrSJCJab9y535v2greCBe6YVW7XeXpo');
const wsolAta = getAssociatedTokenAddressSync(NATIVE_MINT, rewardPubkey, false, TOKEN_PROGRAM_ID);

try {
  await getAccount(connection, wsolAta, 'confirmed', TOKEN_PROGRAM_ID);
  console.log('WSOL ATA already exists');
} catch {
  const tx = new Transaction();
  tx.add(createAssociatedTokenAccountInstruction(rewardWallet.publicKey, wsolAta, rewardPubkey, NATIVE_MINT, TOKEN_PROGRAM_ID));
  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  tx.feePayer = rewardWallet.publicKey;
  tx.sign(rewardWallet);
  const sig = await sendAndConfirmTransaction(connection, tx, [rewardWallet]);
  console.log('WSOL ATA created:', sig);
}
"
```

## Prerequisites

Before running any method:

1. **Make sure your `.env` file has `REWARD_WALLET_PRIVATE_KEY_JSON`** set
2. **Make sure Reward Wallet has SOL** for transaction fees (~0.002 SOL)
3. **Make sure you're on the correct network** (devnet/mainnet) in your config

## Verification

After creating, verify the ATAs exist:

```bash
# Using the script
npx tsx create-wsol-atas.ts  # It will verify at the end

# Or manually check in your code
# The swap service will log if WSOL ATA exists when it runs
```

## Troubleshooting

### Error: "Cannot find module"
- Make sure you're in the project root
- Run `npm install` in the backend directory if needed

### Error: "Insufficient funds"
- Fund your Reward Wallet with SOL
- Devnet: Use a faucet or `solana airdrop 1 <WALLET_ADDRESS>`
- Mainnet: Send SOL to the wallet

### Error: "Account already exists"
- This is fine! The ATA already exists and you're good to go

## Recommended Approach

**Use Method 1 (Node.js script)** - it's the easiest and uses your existing project setup.

Just run:
```bash
cd ~/reward-project
npx tsx create-wsol-atas.ts
```

That's it! 🎉

