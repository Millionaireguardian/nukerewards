# 🚨 URGENT: Start Backend Server

## The Problem
Your frontend is getting **Network Error** because **the backend server is NOT running**.

## ✅ Solution: Start Backend (Choose One Method)

### Method 1: Quick Start Script
```bash
cd backend
chmod +x START_BACKEND.sh
./START_BACKEND.sh
```

### Method 2: Manual Start
```bash
cd backend
npm run dev
```

**Expected Output:**
```
Server started on port 3000
```

### Method 3: Check and Start
```bash
cd backend

# Check if already running
curl http://localhost:3000/health

# If not responding, start it:
npm run dev
```

## ✅ Verify Backend is Running

**In a NEW terminal window:**
```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{"status":"ok"}
```

## ✅ After Backend Starts

1. **Refresh your browser** (Ctrl+Shift+R or Cmd+Shift+R)
2. **Check browser console** - should see successful API calls
3. **Network tab** - requests should show 200 status

## 🔍 Troubleshooting

### If `npm run dev` fails:

**Error: "Cannot find module"**
```bash
cd backend
npm install
npm run dev
```

**Error: "Port 3000 already in use"**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
# Then start again
npm run dev
```

**Error: TypeScript compilation errors**
```bash
cd backend
npm run build
# Check for errors, fix them, then:
npm run dev
```

## 📋 Quick Checklist

- [ ] Backend server is running (`npm run dev` in backend folder)
- [ ] Backend responds to `curl http://localhost:3000/health`
- [ ] Frontend has `.env` file with `VITE_API_BASE_URL=http://localhost:3000`
- [ ] Browser cache cleared (Ctrl+Shift+R)
- [ ] Check browser console for actual error details

## 🎯 Expected Result

Once backend is running:
- ✅ No more "Network Error" messages
- ✅ API calls succeed (200 status)
- ✅ Dashboard loads data
- ✅ Console shows: `[API] Backend URL configured: http://localhost:3000`

