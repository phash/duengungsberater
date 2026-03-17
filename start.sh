#!/bin/bash
# Startet alle lokalen Dev-Services

cd "$(dirname "$0")"

# Kill existing processes
pkill -f "node auth-server" 2>/dev/null
pkill -f "node.*vite" 2>/dev/null
sleep 1

echo ""
echo "🚀 Starting Duengungsberater Dev Services"
echo "=========================================="

# Auth + REST Mock Server
node auth-server.js &
AUTH_PID=$!
echo "✅ Auth/REST Server started (PID $AUTH_PID) → http://localhost:3000"

# Vue App
npm run dev &
VITE_PID=$!
echo "✅ Vue App started (PID $VITE_PID) → http://localhost:5173"

echo ""
echo "=========================================="
echo "Stop with: Ctrl+C"
echo ""

# Wait for both
wait $AUTH_PID $VITE_PID
