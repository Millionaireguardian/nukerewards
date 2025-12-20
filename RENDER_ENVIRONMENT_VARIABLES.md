# Render Environment Variables Configuration

## Required Environment Variable for NUKE/USDC Pool

To enable the NUKE/USDC liquidity pool on your Render deployment, you need to add the following environment variable:

### Variable Details

**Key:** `RAYDIUM_POOL_ID_USDC`

**Value:** `14nA4A3DMMXrpPBhrX1sLTG4dSQKCwPHnoe3k4P1nZbx`

**Description:** Raydium devnet pool ID for the NUKE/USDC liquidity pool

### How to Add in Render

1. **Log in to Render Dashboard**
   - Go to https://dashboard.render.com
   - Sign in to your account

2. **Navigate to Your Service**
   - Click on your backend service (likely named something like `nukerewards-backend`)

3. **Go to Environment Tab**
   - In the left sidebar, click on **Environment**

4. **Add New Environment Variable**
   - Click the **+ Add Environment Variable** button
   - **Key:** Enter `RAYDIUM_POOL_ID_USDC`
   - **Value:** Enter `14nA4A3DMMXrpPBhrX1sLTG4dSQKCwPHnoe3k4P1nZbx`
   - Click **Save Changes**
   - Choose **Save, rebuild, and deploy** to apply immediately

### Existing Environment Variables

Make sure you also have these variables set:

- `RAYDIUM_POOL_ID` = `GFPwg4JVyRbsmNSvPGd8Wi3vvR3WVyChkjY56U7FKrc9` (NUKE/SOL pool)

### After Adding the Variable

Once you add `RAYDIUM_POOL_ID_USDC` and redeploy:
- The backend will fetch real liquidity data from both pools
- The frontend dashboard will display actual pool statistics
- Combined 24h volume will be calculated from both pools
- Total liquidity will sum both pools

### Verification

After deployment, you can verify the pools are being fetched by checking:
- Backend logs for "Fetched NUKE/SOL pool data" and "Fetched NUKE/USDC pool data"
- Frontend dashboard should show real liquidity values instead of placeholders

