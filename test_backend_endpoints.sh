#!/bin/bash

echo "============================================"
echo "Testing Backend Endpoints"
echo "============================================"

BACKEND_URL="http://localhost:3000"

echo ""
echo "1. Testing /health endpoint..."
curl -s "$BACKEND_URL/health" | jq . || curl -s "$BACKEND_URL/health"
echo ""

echo "2. Testing /dashboard/rewards endpoint..."
curl -s "$BACKEND_URL/dashboard/rewards" | jq . || curl -s "$BACKEND_URL/dashboard/rewards"
echo ""

echo "3. Testing /dashboard/payouts endpoint..."
curl -s "$BACKEND_URL/dashboard/payouts" | jq . || curl -s "$BACKEND_URL/dashboard/payouts"
echo ""

echo "4. Testing /dashboard/holders endpoint..."
curl -s "$BACKEND_URL/dashboard/holders" | jq . || curl -s "$BACKEND_URL/dashboard/holders"
echo ""

echo "5. Testing CORS headers..."
curl -s -H "Origin: http://localhost:5173" -I "$BACKEND_URL/dashboard/rewards" | grep -i "access-control"
echo ""

echo "============================================"
echo "Test complete!"
echo "============================================"
