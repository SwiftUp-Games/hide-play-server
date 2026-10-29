# Hide & Play — Online Matchmaking, Relay & Voice Signaling Server

Ultra-lightweight, high-performance Node.js/TypeScript backend for *Hide & Play* online multiplayer.

## Features
- **⚡ 1-Tap Quick Matchmaking**: Pools online players into arenas (up to 6 players).
- **🤖 30-Second Bot Auto-Fill**: If 30 seconds elapse without 6 human players, auto-fills remaining slots with bots (Appu, Ammu, Unni, etc.) and triggers game launch.
- **🏡 Custom Self-Made Rooms**: Create private or public rooms with 4-letter Kerala codes (`KL-8421`).
- **🌐 Public Room Discovery**: Live HTTP (`GET /rooms`) and WebSocket (`LIST_ROOMS`) feed of active public games with player counts, map names, and host details.
- **🎙️ 100% Free WebRTC Voice Chat Signaling**: Audio passes peer-to-peer device-to-device ($0 server cost). Server only relays SDP/ICE tokens.
- **🚀 Ultra-Low Memory**: ~35 MB RAM footprint per instance.

---

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Build TypeScript
npm run build

# 3. Start Server (Default Port: 8080)
npm start

# Or run in development mode with hot-reloading
npm run dev

# Or run integration tests
npx tsc && node dist/test_client.js
```

### Endpoints
- **WebSocket (Game & Signaling)**: `ws://localhost:8080`
- **Health check**: `http://localhost:8080/health`
- **Public Rooms Directory**: `http://localhost:8080/rooms`

---

## 🚀 Deployment Guide (Render.com — 100% Free)

This repository includes a `render.yaml` blueprint and GitHub Actions CI/CD workflows for automated deployments.

### Method 1: Instant Blueprint Deployment (Fastest)

1. Go to your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** ➔ **Blueprint**.
3. Connect the repository `SwiftUp-Games/hide-play-server`.
4. Render will automatically detect `render.yaml` and configure:
   - **Environment**: Node.js
   - **Region**: Singapore (`singapore` - optimal for India/Asia low latency)
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/health`
   - **Plan**: Free
5. Click **Apply**. Render will build and deploy your server automatically!

### Method 2: Manual Web Service Setup

## 🚀 AWS EC2 Production Deployment

The production server is deployed on **AWS EC2** with Nginx and Let's Encrypt SSL.

- **Production HTTPS**: `https://hideplay.swiftup.in`
- **Production WSS (WebSocket)**: `wss://hideplay.swiftup.in`
- **Admin Studio**: `https://hideplay.swiftup.in/admin`
- **Health Check**: `https://hideplay.swiftup.in/health`

### Automated Deployment to AWS
1. SSH into the server or run locally:
   ```bash
   ./scripts/deploy-aws.sh
   ```
2. Automated CD workflow is located in `.github/workflows/deploy.yml` which auto-deploys on push to `main` via SSH.

---

## 🎮 Connecting Godot Client to Server

Update your Godot client (`NetworkManager.gd`):
```gdscript
const DEFAULT_ONLINE_SERVER_URL: String = "wss://hideplay.swiftup.in"
```

---

## Alternative: Docker & Fly.io Deployment

A production-optimized multi-stage `Dockerfile` (~60MB footprint) is also provided.

### Deploy on Fly.io
```bash
fly launch
fly deploy
```
