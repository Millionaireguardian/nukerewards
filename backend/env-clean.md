# Clean Environment Variables for Render

This is the cleaned version without duplicates. Use this as reference when setting up on Render.

```env
# Server Configuration
PORT=10000
NODE_ENV=production
FRONTEND_URL=https://nukerewards.imgprotocol.com

# Solana Configuration
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://devnet.helius-rpc.com/?api-key=1419cfe1-04ce-4fa4-a6d6-badda6902f4e
TOKEN_MINT=CzPWFT9ezPy53mQUj48T17Jm4ep7sPcKwjpWw9tACTyq

# Admin Wallet (required)
ADMIN_WALLET_JSON=[228,90,164,192,155,203,112,233,18,250,115,189,46,155,54,13,214,141,101,62,226,209,135,233,216,62,92,28,131,200,189,3,55,21,218,39,48,33,114,116,206,138,233,5,184,176,159,237,168,117,71,91,15,97,106,117,253,115,243,228,67,119,8,28]

# Raydium DEX Configuration
# NOTE: You had TWO different pool IDs. Choose the correct one:
RAYDIUM_POOL_ID=GFPwg4JVyRbsmNSvPGd8Wi3vvR3WVyChkjY56U7FKrc9
# Alternative: RAYDIUM_POOL_ID=41imMPd4viW9mNi5LNj9jdHSJeErJ5DV8i8dikEuELZg

# Optional CPMM Configuration (only if using CPMM pools)
RAYDIUM_CPMM_AMM_CONFIG=HTVWgp8CbUsRNmRE1p9RBYqopxe2qiyApSkiTFLrfxaW
RAYDIUM_CPMM_OBSERVATION_STATE=3LCLPHuMawqd7TC8oinEDYs6UJgKiVmobxai3fKzocoZ

# Reward Configuration
TOTAL_REWARD_POOL_SOL=1.0
MIN_HOLDING_USD=5
MIN_SOL_PAYOUT=0.0001
REWARD_VALUE_MODE=TOKEN

# Tax Distribution Wallets
REWARD_WALLET_ADDRESS=6PpZCPj72mdzBfrSJCJab9y535v2greCBe6YVW7XeXpo
REWARD_WALLET_PRIVATE_KEY_JSON=[99,116,89,4,241,26,231,133,189,138,130,166,123,119,44,117,60,144,3,24,222,254,147,8,79,111,44,30,33,190,195,225,80,34,251,176,201,157,179,160,61,79,12,64,148,146,10,235,57,22,81,121,5,197,58,105,164,24,113,239,189,86,246,180]
TREASURY_WALLET_ADDRESS=DwhLErVhPhzg1ep19Lracmp6iMTECh4nVBdPebsvJwjo
TREASURY_WALLET_PRIVATE_KEY_JSON=[96,30,74,213,190,54,215,141,177,6,161,123,181,107,48,205,168,230,166,210,151,133,45,123,114,61,189,109,202,36,239,229,192,79,53,195,50,237,50,155,83,155,166,138,20,222,236,57,79,245,87,125,230,35,133,56,53,90,22,216,111,108,104,130]

# Tax Harvest Threshold Configuration (NEW)
MIN_TAX_THRESHOLD_TOKEN=20000
MIN_TAX_THRESHOLD_USD=5

# Batch Harvest Configuration (NEW)
MAX_HARVEST_TOKEN=12000000
MAX_HARVEST_USD=2000
BATCH_COUNT=4
BATCH_DELAY_TOKEN_MODE=10000
BATCH_DELAY_USD_MODE=30000

# Minimum Payout Configuration (NEW)
MIN_PAYOUT_TOKEN=60
MIN_PAYOUT_USD=0.001
```

## Changes Made

1. ✅ Removed duplicate `RAYDIUM_POOL_ID` (kept the first one, but you should verify which one is correct)
2. ✅ Removed duplicate `FRONTEND_URL` (kept one entry)
3. ✅ Organized variables into logical groups
4. ✅ Added comments for clarity

## Important Notes

1. **RAYDIUM_POOL_ID**: You had two different values. I kept the first one (`GFPwg4JVyRbsmNSvPGd8Wi3vvR3WVyChkjY56U7FKrc9`). Please verify which pool ID is correct for your deployment.

2. **All new feature variables are present and correctly configured**:
   - Tax threshold configuration ✅
   - Batch harvest configuration ✅
   - Minimum payout configuration ✅

3. **Render Setup**: When adding these to Render's environment variables, ensure JSON arrays are on a single line (no line breaks).

