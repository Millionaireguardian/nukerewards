#!/bin/bash
echo "🔍 Finding all running bot processes..."
ps aux | grep -E "ts-node-dev.*bot|node.*bot" | grep -v grep | awk '{print $2}' | while read pid; do
  echo "  Killing process $pid"
  kill -9 $pid 2>/dev/null
done
echo "✅ All bot processes killed!"
echo ""
echo "⚠️  IMPORTANT: Only start ONE bot instance to prevent duplicate notifications!"
echo "   Use: cd telegram-bot && npm run dev"
