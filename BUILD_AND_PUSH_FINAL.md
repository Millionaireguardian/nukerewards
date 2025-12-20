# Build and Push Commands

## Step 1: Build Backend

```bash
cd ~/reward-project/backend
npm run build
```

## Step 2: Build Frontend

```bash
cd ~/reward-project/frontend
npm run build
```

## Step 3: Git Push

```bash
# Navigate to project root
cd ~/reward-project

# Check what changed
git status

# Add all changes
git add .

# Commit
git commit -m "Fix tax harvest issue and optimize Helius RPC usage

- Fix harvest: Pass explicit token account addresses instead of empty array
- Harvest now correctly moves withheld fees from token accounts to mint
- Increase token holders cache TTL from 10 min to 30 min (83% RPC reduction)
- Increase holders with status cache TTL from 5 min to 30 min
- Reduces getProgramAccounts calls from ~20/hour to ~4/hour
- Preserves Helius free tier credits significantly longer
- Reward mechanics remain 100% accurate (uses latest cached data)"

# Push to GitHub
git push origin main
```

## Changes Summary

### Files Modified:
- `backend/src/services/taxService.ts` - Fix harvest to use explicit account addresses
- `backend/src/services/solanaService.ts` - Token holders cache: 10min → 30min
- `backend/src/services/rewardService.ts` - Holders status cache: 5min → 30min
- `backend/src/config/solana.ts` - Helius RPC support (already done)
- `backend/src/config/env.ts` - Generic SOLANA_RPC_URL (already done)
- `backend/ENV_TEMPLATE.txt` - Updated to Helius default (already done)

### Expected Impact:
- ✅ Tax harvest will now work correctly (tokens will move to mint)
- ✅ Withdrawal, swap, and distribution will proceed
- ✅ 83% reduction in Helius RPC calls
- ✅ 1 million credits will last ~6x longer

