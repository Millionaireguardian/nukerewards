# Fix Swap Reserves - Use Raydium API

## Issue
The swap was failing because we couldn't fetch pool vault accounts directly. The vault accounts might be protected or use different program IDs that we can't access.

## Solution
Use the Raydium API to get pool reserves (mintAmountA and mintAmountB) instead of trying to fetch vault accounts directly. This is more reliable and doesn't require direct account access.

## Build and Push

```bash
# Build Backend
cd ~/reward-project/backend
npm run build

# Build Frontend (if needed)
cd ~/reward-project/frontend
npm run build

# Push to GitHub
cd ~/reward-project
git add .
git commit -m "Fix swap reserves fetching using Raydium API

- Use Raydium API to get pool reserves (mintAmountA/mintAmountB)
- Fallback to direct vault account fetch if API fails
- More reliable than trying to access vault accounts directly
- Properly handles NUKE/SOL pool reserve calculation"

git push origin main
```

## Progress

✅ **Harvest** - Working
✅ **Withdrawal** - Working  
✅ **Pool Validation** - Fixed (using Raydium API)
✅ **Reserves Fetching** - Fixed (using Raydium API)
⏳ **Swap Execution** - Should work now
⏳ **Distribution** - Will work once swap succeeds

