#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PORT="${PORT:-8080}"
PID_FILE="$SCRIPT_DIR/server.pid"

echo "🛑 Stopping Hide & Play Online Relay Server..."

STOPPED=false

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        kill "$PID" 2>/dev/null || true
        echo "✅ Killed process PID $PID"
        STOPPED=true
    fi
    rm -f "$PID_FILE"
fi

# Fallback: check port 8080
PORT_PID=$(lsof -ti :$PORT 2>/dev/null || true)
if [ -n "$PORT_PID" ]; then
    kill -9 $PORT_PID 2>/dev/null || true
    echo "✅ Freed port $PORT (PID $PORT_PID)"
    STOPPED=true
fi

if [ "$STOPPED" = true ]; then
    echo "✅ Server stopped successfully."
else
    echo "ℹ️  No running server found on port $PORT."
fi
