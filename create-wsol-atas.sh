#!/bin/bash

# Script to create WSOL ATAs for wallets that need them
# Run this ONCE per wallet before performing swaps

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== WSOL ATA Creation Script ===${NC}\n"

# Check if solana CLI is installed
if ! command -v solana &> /dev/null; then
    echo -e "${RED}Error: solana CLI not found. Install it first:${NC}"
    echo "sh -c \"\$(curl -sSfL https://release.solana.com/stable/install)\""
    exit 1
fi

# Check if spl-token CLI is installed
if ! command -v spl-token &> /dev/null; then
    echo -e "${RED}Error: spl-token CLI not found. Install it first:${NC}"
    echo "cargo install spl-token-cli"
    exit 1
fi

# Get network (devnet or mainnet)
read -p "Enter network (devnet/mainnet) [devnet]: " NETWORK
NETWORK=${NETWORK:-devnet}

if [ "$NETWORK" != "devnet" ] && [ "$NETWORK" != "mainnet" ]; then
    echo -e "${RED}Error: Network must be 'devnet' or 'mainnet'${NC}"
    exit 1
fi

# Set Solana CLI to use the correct network
solana config set --url $NETWORK

echo -e "\n${YELLOW}Network: $NETWORK${NC}"
echo -e "${YELLOW}Current wallet: $(solana address)${NC}\n"

# WSOL mint address (same for devnet and mainnet)
WSOL_MINT="So11111111111111111111111111111111111111112"

echo -e "${GREEN}=== Wallet Public Keys ===${NC}\n"
echo "You need to provide the public keys for wallets that will perform swaps."
echo "These are typically:"
echo "  1. Reward Wallet (REQUIRED - performs NUKE → SOL swaps)"
echo "  2. Treasury Wallet (OPTIONAL - only if it performs swaps)\n"

# Get Reward Wallet public key
read -p "Enter REWARD_WALLET public key (required): " REWARD_WALLET
if [ -z "$REWARD_WALLET" ]; then
    echo -e "${RED}Error: Reward wallet public key is required${NC}"
    exit 1
fi

# Get Treasury Wallet public key (optional)
read -p "Enter TREASURY_WALLET public key (optional, press Enter to skip): " TREASURY_WALLET

echo -e "\n${GREEN}=== Creating WSOL ATAs ===${NC}\n"

# Create WSOL ATA for Reward Wallet
echo -e "${YELLOW}Creating WSOL ATA for Reward Wallet: $REWARD_WALLET${NC}"
spl-token create-account $WSOL_MINT --owner $REWARD_WALLET
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Reward Wallet WSOL ATA created successfully${NC}\n"
else
    echo -e "${RED}❌ Failed to create Reward Wallet WSOL ATA${NC}"
    echo "This might mean the ATA already exists (which is fine).\n"
fi

# Create WSOL ATA for Treasury Wallet (if provided)
if [ ! -z "$TREASURY_WALLET" ]; then
    echo -e "${YELLOW}Creating WSOL ATA for Treasury Wallet: $TREASURY_WALLET${NC}"
    spl-token create-account $WSOL_MINT --owner $TREASURY_WALLET
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Treasury Wallet WSOL ATA created successfully${NC}\n"
    else
        echo -e "${RED}❌ Failed to create Treasury Wallet WSOL ATA${NC}"
        echo "This might mean the ATA already exists (which is fine).\n"
    fi
fi

echo -e "${GREEN}=== Verification ===${NC}\n"
echo "To verify WSOL ATAs were created, run:"
echo -e "${YELLOW}spl-token accounts $WSOL_MINT --owner $REWARD_WALLET${NC}"
if [ ! -z "$TREASURY_WALLET" ]; then
    echo -e "${YELLOW}spl-token accounts $WSOL_MINT --owner $TREASURY_WALLET${NC}"
fi

echo -e "\n${GREEN}=== Complete ===${NC}"
echo "WSOL ATAs have been created. Swaps should now work correctly."

