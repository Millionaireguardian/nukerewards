#!/bin/bash

# Test script to verify API fixes
# Run this after starting both backend and frontend

echo "🧪 Testing API Endpoints..."
echo ""

BACKEND_URL="${BACKEND_URL:-http://localhost:3000}"

# Test health endpoint
echo "1. Testing /health endpoint..."
curl -s "$BACKEND_URL/health" | jq '.' 2>/dev/null || curl -s "$BACKEND_URL/health"
echo ""
echo ""

# Test dashboard/rewards
echo "2. Testing /dashboard/rewards endpoint..."
curl -s "$BACKEND_URL/dashboard/rewards" | jq '.' 2>/dev/null || curl -s "$BACKEND_URL/dashboard/rewards"
echo ""
echo ""

# Test dashboard/payouts
echo "3. Testing /dashboard/payouts endpoint..."
curl -s "$BACKEND_URL/dashboard/payouts" | jq '.' 2>/dev/null || curl -s "$BACKEND_URL/dashboard/payouts"
echo ""
echo ""

# Test dashboard/holders
echo "4. Testing /dashboard/holders endpoint..."
curl -s "$BACKEND_URL/dashboard/holders?limit=5" | jq '.' 2>/dev/null || curl -s "$BACKEND_URL/dashboard/holders?limit=5"
echo ""
echo ""

# Test CORS headers
echo "5. Testing CORS headers..."
curl -s -I -X OPTIONS "$BACKEND_URL/dashboard/rewards" -H "Origin: http://localhost:5173" | grep -i "access-control"
echo ""
echo ""

echo "✅ API tests complete!"
echo ""
echo "Next steps:"
echo "1. Start frontend: cd frontend && npm run dev"
echo "2. Open browser console and check for API calls"
echo "3. Verify no CORS errors in Network tab"

