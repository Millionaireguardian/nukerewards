# Deployment Commands for WSL

## Quick Build & Deploy Commands

### 1. Navigate to Project Root
```bash
cd /home/van/reward-project
```

### 2. Build Backend (Local Test)
```bash
cd backend
npm install
npm run build
```

### 3. Test Build Locally (Optional)
```bash
npm start
# Press Ctrl+C to stop
```

### 4. Git Commands (Commit & Push)

```bash
# Navigate back to project root
cd /home/van/reward-project

# Check status
git status

# Add all changes
git add .

# Commit changes
git commit -m "feat: Add comprehensive logging, reward accumulation, and minimum payout features

- Added detailed logging for mode status, tax thresholds, batch harvest
- Implemented reward accumulation with persistent storage
- Added minimum payout logic with threshold-based accumulation
- Optimized eligible wallets tracking
- Added comprehensive epoch summary reports
- Created end-to-end test suite
- Fixed environment variable configuration"

# Push to GitHub
git push origin main
```

### 5. Verify Build on Render

After pushing, Render will automatically:
1. Detect the push to `main` branch
2. Run: `npm install && npm run build`
3. Start: `npm start`
4. Deploy to: `https://nukerewards-backend.onrender.com`

Check deployment status at: https://dashboard.render.com

## One-Liner Commands

### Full Build & Test
```bash
cd /home/van/reward-project/backend && npm install && npm run build && echo "✅ Build successful!"
```

### Quick Git Push
```bash
cd /home/van/reward-project && git add . && git commit -m "feat: Add comprehensive logging and reward features" && git push origin main
```

## Verification Steps

After deployment, verify:

1. **Check Render Logs**
   - Look for: `📊 Application Configuration`
   - Look for: `Mode is TOKEN`
   - Look for: `Reward scheduler started`

2. **Test Health Endpoint**
   ```bash
   curl https://nukerewards-backend.onrender.com/health
   ```

3. **Check Configuration Log**
   ```bash
   # In Render logs, should see:
   # 📊 Application Configuration
   #   mode: TOKEN
   #   minPayoutConfig: { token: 60, usd: 0.001 }
   #   taxThresholdConfig: { token: 20000, usd: 5 }
   #   batchHarvestConfig: { ... }
   ```

## Current Configuration (TOKEN Mode)

✅ **REWARD_VALUE_MODE=TOKEN** (confirmed)
- Uses raw NUKE token amounts
- MIN_PAYOUT_TOKEN=60 (minimum 60 NUKE tokens before payout)
- MIN_TAX_THRESHOLD_TOKEN=20000 (minimum 20,000 NUKE tokens before harvest)
- MAX_HARVEST_TOKEN=12000000 (batch threshold: 12M NUKE tokens)

## Troubleshooting

If build fails:
```bash
# Check for TypeScript errors
cd backend
npm run build 2>&1 | grep -i error

# Check for missing dependencies
npm install

# Verify Node version
node --version  # Should be 20.6.0
```

