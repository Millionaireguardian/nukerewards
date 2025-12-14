#!/bin/bash
# Start both backend and frontend in development mode

echo "🚀 Starting NUKE Reward System..."
echo ""

# Check if backend is already running
if ! curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "📦 Starting backend..."
    cd backend
    npm run dev &
    BACKEND_PID=$!
    echo "Backend PID: $BACKEND_PID"
    cd ..
    sleep 3
else
    echo "✅ Backend already running on http://localhost:3000"
fi

# Check if frontend is already running
if ! curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "🎨 Starting frontend..."
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    echo "Frontend PID: $FRONTEND_PID"
    cd ..
    sleep 3
else
    echo "✅ Frontend already running on http://localhost:5173"
fi

echo ""
echo "✨ Services started!"
echo "   Backend:  http://localhost:3000"
echo "   Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for interrupt
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
