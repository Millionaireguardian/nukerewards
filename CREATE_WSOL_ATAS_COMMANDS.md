# WSOL ATA Creation Commands - Your Wallets

## Your Wallet Public Keys

From your backend logs:
- **Reward Wallet**: `6PpZCPj72mdzBfrSJCJab9y535v2greCBe6YVW7XeXpo` ✅ REQUIRED
- **Treasury Wallet**: `DwhLErVhPhzg1ep19Lracmp6iMTECh4nVBdPebsvJwjo` ⚠️ OPTIONAL (only if it performs swaps)

## WSOL Mint Address

```
So11111111111111111111111111111111111111112
```

## Prerequisites

Make sure you have:
1. **Solana CLI installed**
2. **SPL Token CLI installed**
3. **SOL in your wallet** (for transaction fees, ~0.001-0.002 SOL per ATA creation)

## Commands for Devnet

```bash
# Set to devnet
solana config set --url devnet

# 1. Create WSOL ATA for Reward Wallet (REQUIRED)
spl-token create-account So11111111111111111111111111111111111111112 --owner 6PpZCPj72mdzBfrSJCJab9y535v2greCBe6YVW7XeXpo

# 2. Create WSOL ATA for Treasury Wallet (OPTIONAL - only if it performs swaps)
spl-token create-account So11111111111111111111111111111111111111112 --owner DwhLErVhPhzg1ep19Lracmp6iMTECh4nVBdPebsvJwjo
```

## Commands for Mainnet

```bash
# Set to mainnet
solana config set --url mainnet

# 1. Create WSOL ATA for Reward Wallet (REQUIRED)
spl-token create-account So11111111111111111111111111111111111111112 --owner 6PpZCPj72mdzBfrSJCJab9y535v2greCBe6YVW7XeXpo

# 2. Create WSOL ATA for Treasury Wallet (OPTIONAL - only if it performs swaps)
spl-token create-account So11111111111111111111111111111111111111112 --owner DwhLErVhPhzg1ep19Lracmp6iMTECh4nVBdPebsvJwjo
```

## One-Line Commands (Copy & Paste)

### Devnet - Reward Wallet Only
```bash
solana config set --url devnet && spl-token create-account So11111111111111111111111111111111111111112 --owner 6PpZCPj72mdzBfrSJCJab9y535v2greCBe6YVW7XeXpo
```

### Devnet - Both Wallets
```bash
solana config set --url devnet && spl-token create-account So11111111111111111111111111111111111111112 --owner 6PpZCPj72mdzBfrSJCJab9y535v2greCBe6YVW7XeXpo && spl-token create-account So11111111111111111111111111111111111111112 --owner DwhLErVhPhzg1ep19Lracmp6iMTECh4nVBdPebsvJwjo
```

### Mainnet - Reward Wallet Only
```bash
solana config set --url mainnet && spl-token create-account So11111111111111111111111111111111111111112 --owner 6PpZCPj72mdzBfrSJCJab9y535v2greCBe6YVW7XeXpo
```

### Mainnet - Both Wallets
```bash
solana config set --url mainnet && spl-token create-account So11111111111111111111111111111111111111112 --owner 6PpZCPj72mdzBfrSJCJab9y535v2greCBe6YVW7XeXpo && spl-token create-account So11111111111111111111111111111111111111112 --owner DwhLErVhPhzg1ep19Lracmp6iMTECh4nVBdPebsvJwjo
```

## Verification Commands

After creating the ATAs, verify they exist:

```bash
# Verify Reward Wallet WSOL ATA
spl-token accounts So11111111111111111111111111111111111111112 --owner 6PpZCPj72mdzBfrSJCJab9y535v2greCBe6YVW7XeXpo

# Verify Treasury Wallet WSOL ATA
spl-token accounts So11111111111111111111111111111111111111112 --owner DwhLErVhPhzg1ep19Lracmp6iMTECh4nVBdPebsvJwjo
```

Expected output:
```
Token                                         Balance
---------------------------------------------------------------
So11111111111111111111111111111111111111112  0
```

## Important Notes

1. **Run these commands ONCE** - WSOL ATAs are permanent on-chain accounts
2. **You need SOL** in the wallet to pay for transaction fees (~0.001-0.002 SOL per ATA)
3. **If you see "Account already exists"** - that's fine! The ATA already exists
4. **Reward Wallet is REQUIRED** - it performs swaps, so it MUST have a WSOL ATA
5. **Treasury Wallet is OPTIONAL** - only create if it will also perform swaps

## After Setup

Once the WSOL ATAs are created:
- ✅ Your swap code will detect they exist
- ✅ Swaps will work correctly
- ✅ No need to create them again
- ✅ The error "Cannot read properties of undefined (reading 'filter')" will be resolved

## Troubleshooting

### Error: "Insufficient funds"
- Make sure the wallet has SOL for transaction fees
- Get devnet SOL: `solana airdrop 1 <WALLET_ADDRESS>` (devnet only)

### Error: "Account already exists"
- This is fine! The ATA already exists and you're good to go

### Error: "Owner account not found"
- Make sure you're on the correct network (devnet/mainnet)
- Verify the public key is correct

