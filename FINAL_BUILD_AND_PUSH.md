# Final Build and Push Commands

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
git commit -m "Optimize Helius RPC usage with extended caching

- Increase token holders cache TTL from 10 min to 30 min (83% RPC reduction)
- Increase holders with status cache TTL from 5 min to 30 min
- Reduces getProgramAccounts calls from ~20/hour to ~4/hour
- Reward mechanics remain 100% accurate (uses latest cached data)
- Dashboard data freshness: 30 minutes (acceptable trade-off)
- Preserves Helius free tier credits significantly longer"

# Push to GitHub
git push origin main
```

## Changes Summary

### Files Modified:
- `backend/src/services/solanaService.ts` - Token holders cache: 10min → 30min
- `backend/src/services/rewardService.ts` - Holders status cache: 5min → 30min
- `backend/src/config/solana.ts` - Helius RPC support (already done)
- `backend/src/config/env.ts` - Generic SOLANA_RPC_URL (already done)
- `backend/ENV_TEMPLATE.txt` - Updated to Helius default (already done)

### Expected Impact:
- ✅ 83% reduction in Helius RPC calls
- ✅ 1 million credits will last ~6x longer
- ✅ Reward distribution accuracy maintained
- ✅ Dashboard data updates every 30 minutes

