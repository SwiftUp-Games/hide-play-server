#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PORT="${PORT:-8080}"
echo "🔍 Checking Hide & Play Server Status..."

STATUS_JSON=$(curl -s --max-time 2 "http://127.0.0.1:$PORT/health" || true)

if [ -n "$STATUS_JSON" ] && echo "$STATUS_JSON" | grep -q '"status":"ok"'; then
    echo "🟢 SERVER STATUS: HEALTHY & ONLINE (Port $PORT)"
    echo "   Details: $STATUS_JSON"
    echo "   Web Dashboard: http://localhost:$PORT"
    echo "   WebSocket:     ws://127.0.0.1:$PORT"
else
    echo "🔴 SERVER STATUS: OFFLINE (Port $PORT not responding)"
    echo "   Run ./start.sh to launch."
fi
