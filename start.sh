#!/usr/bin/env bash
set -e

# Hide & Play Local Relay Server Launcher
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PORT="${PORT:-8080}"
PID_FILE="$SCRIPT_DIR/server.pid"
LOG_FILE="$SCRIPT_DIR/server.log"

echo "🌴 Hide & Play Online Relay Server"
echo "=================================================="

# Check if port is already in use
EXISTING_PID=$(lsof -ti :$PORT 2>/dev/null || true)
if [ -n "$EXISTING_PID" ]; then
    echo "⚠️  Port $PORT is already in use by PID(s): $EXISTING_PID"
    echo "   Stopping existing instance..."
    kill -9 $EXISTING_PID 2>/dev/null || true
    sleep 1
fi

# Build if dist/index.js is missing
if [ ! -f "dist/index.js" ]; then
    echo "📦 Building TypeScript server..."
    npm run build
fi

echo "🚀 Starting server in background on port $PORT..."
nohup node dist/index.js > "$LOG_FILE" 2>&1 &
SERVER_PID=$!
disown $SERVER_PID 2>/dev/null || true
echo "$SERVER_PID" > "$PID_FILE"

# Wait up to 3s for health endpoint to respond
HEALTH_OK=false
for i in {1..15}; do
    sleep 0.2
    if curl -s "http://127.0.0.1:$PORT/health" | grep -q '"status":"ok"'; then
        HEALTH_OK=true
        break
    fi
done

if [ "$HEALTH_OK" = true ]; then
    echo "✅ Server successfully started! (PID: $SERVER_PID)"
    echo "--------------------------------------------------"
    echo "🌐 Web Dashboard:  http://localhost:$PORT"
    echo "📡 WebSocket URL:  ws://127.0.0.1:$PORT"
    echo "🩺 Health Check:   http://localhost:$PORT/health"
    echo "📋 Public Rooms:   http://localhost:$PORT/rooms"
    echo "📄 Log file:       $LOG_FILE"
    echo "--------------------------------------------------"
    echo "To stop: ./stop.sh or npm run stop"
else
    echo "❌ Failed to start server. Showing logs:"
    cat "$LOG_FILE"
    exit 1
fi
