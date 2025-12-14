# CORS Fix Checklist

## ✅ Immediate Actions Required

### 1. **Restart Backend Server**
The CORS configuration was updated. **You MUST restart the backend** for changes to take effect:

```bash
cd backend
# Stop current server (Ctrl+C if running)
npm run dev
# Should see: "Server started on port 3000"
```

### 2. **Verify Backend is Running**
```bash
curl http://localhost:3000/health
# Expected: {"status":"ok"}
```

### 3. **Test CORS Headers**
```bash
curl -I http://localhost:3000/dashboard/rewards \
  -H "Origin: http://localhost:5173"
# Should see: Access-Control-Allow-Origin: *
```

### 4. **Frontend Environment**
```bash
cd frontend
# Create .env if it doesn't exist
echo "VITE_API_BASE_URL=http://localhost:3000" > .env
# Restart frontend dev server
npm run dev
```

### 5. **Clear Browser Cache**
- Press `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- Or open DevTools → Application → Clear Storage → Clear site data

## 🔍 Debugging Steps

### Check Backend Logs
Look for:
- "Server started on port 3000"
- Any error messages during startup
- CORS-related errors

### Check Browser Console
Look for:
- `[API] Backend URL configured: http://localhost:3000`
- Actual error message (not just "Object")
- Network tab shows failed requests

### Check Network Tab
1. Open DevTools → Network
2. Find failed request (red)
3. Click on it
4. Check:
   - **Status**: What HTTP status code?
   - **Response Headers**: Does it have `Access-Control-Allow-Origin`?
   - **Request Headers**: What Origin is being sent?

## 🐛 Common Issues

### Issue: "ERR_NETWORK" or "Failed to fetch"
**Cause**: Backend not running or not accessible
**Fix**: 
1. Start backend: `cd backend && npm run dev`
2. Verify: `curl http://localhost:3000/health`

### Issue: CORS error but backend is running
**Cause**: CORS middleware not applied or wrong configuration
**Fix**:
1. Check `backend/src/server.ts` has `app.use(cors({...}))`
2. Restart backend server
3. Clear browser cache

### Issue: 404 Not Found
**Cause**: Routes not registered
**Fix**: Check `backend/src/server.ts` has:
```typescript
app.use('/dashboard', dashboardRouter);
```

### Issue: 500 Internal Server Error
**Cause**: Backend code error
**Fix**: Check backend console logs for error details

## ✅ Verification

After following all steps, you should see:
1. ✅ Backend running on port 3000
2. ✅ `curl http://localhost:3000/health` returns `{"status":"ok"}`
3. ✅ Browser console shows `[API] Backend URL configured: http://localhost:3000`
4. ✅ Network tab shows successful requests (200 status)
5. ✅ No CORS errors in console

## 📝 Files Modified

- `backend/src/server.ts` - CORS configuration updated
- `frontend/src/services/api.ts` - Enhanced error logging

## 🚀 Quick Test

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Test endpoints
curl http://localhost:3000/health
curl http://localhost:3000/dashboard/rewards

# Terminal 3: Start frontend
cd frontend
npm run dev
```

Then open browser and check console - should see successful API calls!

