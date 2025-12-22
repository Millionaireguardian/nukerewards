# WSOL ATA Setup Guide

## Overview

Wallets that perform NUKE → SOL swaps via Raydium **must have a WSOL (Wrapped SOL) Associated Token Account (ATA)** created **once** before swaps can work.

## Wallets That Need WSOL ATAs

### ✅ Required
1. **Reward Wallet** - Performs NUKE → SOL swaps during tax distribution
   - Environment variable: `REWARD_WALLET_ADDRESS` or derived from `REWARD_WALLET_PRIVATE_KEY_JSON`
   - **This wallet MUST have a WSOL ATA**

### ⚠️ Optional (Only if it performs swaps)
2. **Treasury Wallet** - Only needs WSOL ATA if it will also perform swaps
   - Environment variable: `TREASURY_WALLET_ADDRESS` (default: `DwhLErVhPhzg1ep19Lracmp6iMTECh4nVBdPebsvJwjo`)
   - **Only create WSOL ATA if treasury wallet has private key and performs swaps**

### ❌ Not Required
3. **Admin Wallet** - Does not perform swaps, no WSOL ATA needed

## How to Get Your Wallet Public Keys

### Option 1: From Environment Variables (Render/Railway)

1. Go to your backend service environment variables
2. Find `REWARD_WALLET_ADDRESS` - this is your reward wallet public key
3. Find `TREASURY_WALLET_ADDRESS` - this is your treasury wallet public key (if set)

### Option 2: From Application Logs

When your backend starts, it logs wallet public keys:

```
✅ Reward wallet validated
  publicKey: <YOUR_REWARD_WALLET_PUBLIC_KEY>

✅ Treasury wallet validated (has private key)
  publicKey: <YOUR_TREASURY_WALLET_PUBLIC_KEY>
```

### Option 3: Derive from Private Key (Local)

If you have the private key JSON locally, you can derive the public key:

```bash
# Create a temporary script
cat > get-pubkey.js << 'EOF'
const { Keypair } = require('@solana/web3.js');
const keypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(process.argv[1])));
console.log(keypair.publicKey.toBase58());
EOF

# Run with your private key JSON
node get-pubkey.js '[12,34,56,...]'  # Replace with actual JSON array
```

## Manual Commands to Create WSOL ATAs

### Prerequisites

1. **Install Solana CLI** (if not already installed):
   ```bash
   sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
   ```

2. **Install SPL Token CLI** (if not already installed):
   ```bash
   cargo install spl-token-cli
   # OR
   npm install -g @solana/spl-token
   ```

3. **Set your network**:
   ```bash
   # For devnet
   solana config set --url devnet
   
   # For mainnet
   solana config set --url mainnet
   ```

### WSOL Mint Address

WSOL mint is the same for both devnet and mainnet:
```
So11111111111111111111111111111111111111112
```

### Commands

#### For Devnet

**1. Reward Wallet (REQUIRED):**
```bash
# Replace <REWARD_WALLET_PUBLIC_KEY> with your actual reward wallet public key
spl-token create-account So11111111111111111111111111111111111111112 --owner <REWARD_WALLET_PUBLIC_KEY>
```

**2. Treasury Wallet (OPTIONAL - only if it performs swaps):**
```bash
# Replace <TREASURY_WALLET_PUBLIC_KEY> with your actual treasury wallet public key
spl-token create-account So11111111111111111111111111111111111111112 --owner <TREASURY_WALLET_PUBLIC_KEY>
```

#### For Mainnet

**1. Reward Wallet (REQUIRED):**
```bash
# Set to mainnet first
solana config set --url mainnet

# Replace <REWARD_WALLET_PUBLIC_KEY> with your actual reward wallet public key
spl-token create-account So11111111111111111111111111111111111111112 --owner <REWARD_WALLET_PUBLIC_KEY>
```

**2. Treasury Wallet (OPTIONAL - only if it performs swaps):**
```bash
# Replace <TREASURY_WALLET_PUBLIC_KEY> with your actual treasury wallet public key
spl-token create-account So11111111111111111111111111111111111111112 --owner <TREASURY_WALLET_PUBLIC_KEY>
```

### Using the Automated Script

We've created a helper script that guides you through the process:

```bash
# Make it executable
chmod +x create-wsol-atas.sh

# Run it
./create-wsol-atas.sh
```

The script will:
- Ask for your network (devnet/mainnet)
- Ask for wallet public keys
- Create WSOL ATAs automatically
- Verify the creation

## Verification

After creating WSOL ATAs, verify they exist:

```bash
# Check Reward Wallet WSOL ATA
spl-token accounts So11111111111111111111111111111111111111112 --owner <REWARD_WALLET_PUBLIC_KEY>

# Check Treasury Wallet WSOL ATA (if created)
spl-token accounts So11111111111111111111111111111111111111112 --owner <TREASURY_WALLET_PUBLIC_KEY>
```

You should see output like:
```
Token                                         Balance
---------------------------------------------------------------
So11111111111111111111111111111111111111112  0
```

## Example with Real Public Keys

Based on your environment variables documentation:

### Devnet Example

```bash
# Set to devnet
solana config set --url devnet

# Reward Wallet (from ENVIRONMENT_VARIABLES.md example)
spl-token create-account So11111111111111111111111111111111111111112 --owner 6PpZCPj72mdzBfrSJCJab9y535v2greCBe6YVW7XeXpo

# Treasury Wallet (from ENVIRONMENT_VARIABLES.md example)
spl-token create-account So11111111111111111111111111111111111111112 --owner DwhLErVhPhzg1ep19Lracmp6iMTECh4nVBdPebsvJwjo
```

**⚠️ IMPORTANT:** Replace the example public keys above with your **actual** wallet public keys from your environment variables!

## Troubleshooting

### Error: "Account already exists"
This is fine! It means the WSOL ATA already exists and you don't need to create it again.

### Error: "Insufficient funds"
You need SOL in the wallet to pay for the account creation transaction fee (~0.001-0.002 SOL).

### Error: "Owner account not found"
Make sure the public key is correct and the wallet exists on the network.

## After Setup

Once WSOL ATAs are created:
- ✅ Swaps will work correctly
- ✅ No need to create them again (they're permanent on-chain accounts)
- ✅ The swap code will detect they exist and use them automatically

## Summary

**Required Actions:**
1. Get your Reward Wallet public key from environment variables or logs
2. Run: `spl-token create-account So11111111111111111111111111111111111111112 --owner <REWARD_WALLET_PUBLIC_KEY>`
3. (Optional) If Treasury Wallet performs swaps, create its WSOL ATA too
4. Verify ATAs exist using `spl-token accounts`

**That's it!** After this one-time setup, swaps will work permanently.

