# Complete Usage Guide

## ⚠️ Important: Node.js Version

The frontend requires **Node.js 18+**. If you see errors about Vite, ensure you're using Node.js 18 or higher.

## Step-by-Step Setup

### Step 1: Start Backend

Open Terminal 1:

```bash
cd /home/van/reward-project/backend
npm run dev
```

Wait for output:
```
Server started on port 3000
```

Verify backend is running:
```bash
curl http://localhost:3000/health
```
Should return: `{"status":"ok"}`

### Step 2: Start Frontend

Open Terminal 2 (new terminal):

```bash
cd /home/van/reward-project/frontend
npm run dev
```

Wait for output:
```
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:5173/
```

**Note:** If you see "This site can't be reached", make sure:
1. The frontend dev server is actually running (check terminal output)
2. The URL shown in terminal matches what you're accessing
3. No firewall is blocking the port

### Step 3: Open Dashboard

Open your browser and navigate to:
**http://localhost:5173**

You should see the NUKE Token Reward Dashboard with:
- Reward Summary section
- Holders Table
- Payouts Table

## Quick Verification

### Check Backend
```bash
curl http://localhost:3000/health
# Expected: {"status":"ok"}

curl http://localhost:3000/dashboard/rewards
# Expected: JSON with reward statistics
```

### Check Frontend
1. Open browser to http://localhost:5173
2. Open browser DevTools (F12)
3. Check Console tab for errors
4. Check Network tab for API calls

## Troubleshooting

### "This site can't be reached" (localhost:5173)

**Solution:**
1. **Check if frontend is running:**
   ```bash
   cd /home/van/reward-project/frontend
   npm run dev
   ```
   Look for output like:
   ```
   VITE v5.x.x  ready in xxx ms
   ➜  Local:   http://localhost:5173/
   ```

2. **Check if port 5173 is in use:**
   ```bash
   lsof -ti:5173
   ```
   If a process is found, kill it:
   ```bash
   lsof -ti:5173 | xargs kill -9
   ```

3. **Check Node.js version:**
   ```bash
   node --version
   ```
   Should be 18.x or higher

4. **Reinstall dependencies:**
   ```bash
   cd /home/van/reward-project/frontend
   rm -rf node_modules package-lock.json
   npm install
   ```

### Frontend loads but shows errors

**Check:**
1. Backend is running on port 3000:
   ```bash
   curl http://localhost:3000/health
   ```
2. Browser console (F12) for API errors
3. Network tab in browser DevTools shows failed requests

### Backend not starting

**Check:**
1. Port 3000 is not in use:
   ```bash
   lsof -ti:3000
   ```
2. `.env` file exists in `backend/` directory
3. All dependencies installed:
   ```bash
   cd backend
   npm install
   ```

## Ports

- **Backend:** 3000 (configurable via `PORT` in `.env`)
- **Frontend:** 5173 (Vite default, auto-selects if busy)

## Stopping Services

### Manual Stop

Press `Ctrl+C` in each terminal running the services.

### Kill by Port

```bash
# Kill backend
lsof -ti:3000 | xargs kill -9

# Kill frontend
lsof -ti:5173 | xargs kill -9
```

## Complete Startup Sequence

**Terminal 1 - Backend:**
```bash
cd /home/van/reward-project/backend
npm run dev
# Wait for "Server started on port 3000"
```

**Terminal 2 - Frontend:**
```bash
cd /home/van/reward-project/frontend
npm run dev
# Wait for "Local: http://localhost:5173/"
```

**Browser:**
- Open http://localhost:5173
- Dashboard should load automatically

## Next Steps

Once both services are running:

1. ✅ Dashboard will auto-refresh every 60 seconds
2. ✅ Monitor reward distribution in real-time
3. ✅ View token holders and their eligibility
4. ✅ Track pending SOL payouts

Enjoy your reward dashboard! 🚀
