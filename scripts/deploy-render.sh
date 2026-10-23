#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "🎮 Deploying Hide & Play Server to Render via Render CLI"
echo "=========================================================="

# Check if Render CLI is installed
if ! command -v render &> /dev/null; then
    echo "❌ Render CLI is not installed. Installing via Homebrew..."
    brew install render
fi

# Ensure workspace is set
ACTIVE_WS=$(render workspace current --output json 2>/dev/null || true)
if [ -z "$ACTIVE_WS" ]; then
    echo "ℹ️ Setting active workspace..."
    WS_ID=$(render workspaces --output json | grep -o '"id": "[^"]*"' | head -n 1 | cut -d'"' -f4)
    if [ -n "$WS_ID" ]; then
        render workspace set "$WS_ID"
    else
        echo "❌ Please log in first: render login"
        exit 1
    fi
fi

echo "🚀 Creating/deploying web service 'hide-play-server' on Render..."
render services create \
  --name hide-play-server \
  --type web_service \
  --repo https://github.com/SwiftUp-Games/hide-play-server \
  --branch main \
  --runtime node \
  --region singapore \
  --plan free \
  --build-command "npm ci && npm run build" \
  --start-command "npm start" \
  --health-check-path "/health" \
  --auto-deploy \
  --env-var NODE_ENV=production \
  --env-var PORT=10000 \
  --confirm

echo "=========================================================="
echo "✅ Render service creation initiated!"
echo "Run 'render services' to view live service status and URL."
echo "=========================================================="
