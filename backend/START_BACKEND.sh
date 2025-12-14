#!/bin/bash

echo "🚀 Starting Backend Server..."
echo ""

# Check if port 3000 is in use
if lsof -ti:3000 > /dev/null 2>&1; then
    echo "⚠️  Port 3000 is already in use!"
    echo "   Stopping existing process..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null
    sleep 2
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found!"
    echo "   Creating basic .env from template..."
    cat > .env << 'ENVEOF'
PORT=3000
NODE_ENV=development
ENVEOF
    echo "✅ Created .env file"
    echo "   ⚠️  You may need to add more environment variables"
fi

# Start the server
echo "📦 Starting backend server..."
npm run dev
