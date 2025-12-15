# 🚀 Services Status

## ✅ Both Services Running!

### Backend
- **URL:** http://localhost:3000
- **Status:** ✅ Running
- **Health Check:** http://localhost:3000/health
- **Dashboard API:** http://localhost:3000/dashboard/*

### Frontend
- **URL:** http://localhost:5173
- **Status:** ✅ Running
- **Dashboard:** http://localhost:5173

## 🎯 Next Steps

1. **Open Dashboard:**
   - Open your browser to: **http://localhost:5173**
   - You should see the NUKE Token Reward Dashboard

2. **Verify Backend API:**
   ```bash
   curl http://localhost:3000/health
   curl http://localhost:3000/dashboard/rewards
   ```

3. **Monitor Services:**
   - Backend logs: Check terminal running `npm run dev` in `backend/`
   - Frontend logs: Check terminal running `npm run dev` in `frontend/`
   - Browser console: Press F12 to see frontend logs

## 📊 Dashboard Features

Once you open http://localhost:5173, you'll see:

1. **Reward Summary**
   - Scheduler status
   - Last/next run times
   - Token price (NUKE)
   - Statistics (holders, eligible, payouts, SOL distributed)

2. **Holders Table**
   - All token holders
   - Eligibility status
   - USD values
   - Last reward timestamps
   - Search and filter capabilities

3. **Payouts Table**
   - Pending SOL payouts
   - Retry counts
   - Status (pending/failed)
   - Summary statistics

## 🔄 Auto-Refresh

The dashboard automatically refreshes data every 60 seconds.

## 🛑 Stopping Services

To stop the services, press `Ctrl+C` in each terminal, or:

```bash
# Kill backend
lsof -ti:3000 | xargs kill -9

# Kill frontend
lsof -ti:5173 | xargs kill -9
```

## 📝 Notes

- Backend scheduler runs every 60 seconds, checking for rewards every 5+ minutes
- Frontend auto-refreshes every 60 seconds
- All API calls are logged to browser console (F12)
- Backend logs show scheduler activity and API requests

Enjoy your reward dashboard! 🎉


