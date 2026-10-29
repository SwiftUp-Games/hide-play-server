#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "🎮 Deploying / Reloading Hide & Play Server on AWS (PM2)"
echo "=========================================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$SERVER_DIR"

# 1. Pull latest code if in git repository
if [ -d .git ]; then
    echo "📥 Pulling latest git updates..."
    git pull origin main || echo "⚠️ Git pull skipped or not on branch."
fi

# 2. Check for .env file
if [ ! -f .env ]; then
    echo "⚠️ .env file not found! Copying from .env.example..."
    cp .env.example .env
    echo "❗ Please edit .env with your production credentials: nano .env"
fi

# 3. Install dependencies and build
echo "📦 Installing server & admin dependencies..."
npm install --include=dev
echo "🔨 Building admin SPA and compiling TypeScript..."
npm run build

# 4. Start or reload with zero-downtime using PM2
echo "🚀 Starting / reloading with PM2..."
if pm2 describe hide-play-server > /dev/null 2>&1; then
    pm2 reload ecosystem.config.cjs --update-env
else
    pm2 start ecosystem.config.cjs
fi

pm2 save
echo "=========================================================="
echo "✅ Server successfully running on AWS!"
echo "Check logs: pm2 logs hide-play-server"
echo "Check status: pm2 status"
echo "=========================================================="

