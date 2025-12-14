# CORS Debugging Guide

## Current Issue
Frontend is getting CORS/network errors when calling backend API endpoints.

## Steps to Debug

### 1. Verify Backend is Running
```bash
cd backend
npm run dev
# Should see: "Server started on port 3000"
```

### 2. Test Backend Endpoints Directly
```bash
# Test health endpoint
curl http://localhost:3000/health

# Test dashboard endpoints
curl http://localhost:3000/dashboard/rewards
curl http://localhost:3000/dashboard/payouts
curl http://localhost:3000/dashboard/holders
```

### 3. Test CORS Headers
```bash
# Check CORS headers
curl -I -X OPTIONS http://localhost:3000/dashboard/rewards \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: GET"

# Should see:
# Access-Control-Allow-Origin: *
# Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
```

### 4. Check Frontend Environment
```bash
cd frontend
# Verify .env file exists
cat .env
# Should contain: VITE_API_BASE_URL=http://localhost:3000
```

### 5. Check Browser Network Tab
- Open DevTools → Network tab
- Look for failed requests to `/dashboard/*`
- Check Response Headers for CORS headers
- Check if request is being blocked

## Common Issues

1. **Backend not running**: Start backend with `npm run dev`
2. **Wrong port**: Verify backend is on port 3000
3. **CORS not configured**: Check backend/src/server.ts has cors() middleware
4. **Environment variable**: Frontend needs VITE_API_BASE_URL in .env
5. **Browser cache**: Clear browser cache and hard refresh (Ctrl+Shift+R)

## Quick Fixes

### If backend is not running:
```bash
cd backend
npm run dev
```

### If CORS still fails:
1. Check backend/src/server.ts has `app.use(cors())`
2. Restart backend server
3. Clear browser cache
4. Check browser console for actual error message

### If environment variable missing:
```bash
cd frontend
echo "VITE_API_BASE_URL=http://localhost:3000" > .env
# Restart frontend dev server
```
