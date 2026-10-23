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

If you prefer manual configuration:
1. In Render Dashboard, click **New +** ➔ **Web Service**.
2. Connect `SwiftUp-Games/hide-play-server`.
3. Configure the following fields:
   - **Name**: `hide-play-server`
   - **Region**: Singapore
   - **Branch**: `main`
   - **Root Directory**: *(Leave blank)*
   - **Runtime**: `Node`
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
4. Expand **Advanced**:
   - **Health Check Path**: `/health`
   - **Auto-Deploy**: `Yes`
5. Click **Create Web Service**.

---

## 🔄 CI/CD & Deploy Hook Setup

Two GitHub Actions workflows are included in `.github/workflows/`:
1. **`ci.yml`**: Automatically builds and typechecks the server on Node 20 & 22 on all PRs and pushes to `main`.
2. **`deploy.yml`**: Triggers a deployment on Render on merge to `main`.

### Optional: Enabling Deploy Hook via GitHub Secrets
If you want GitHub Actions to explicitly trigger Render re-deployments:
1. In Render Dashboard, go to your service ➔ **Settings** ➔ scroll to **Deploy Hook**.
2. Copy the Deploy Hook URL (`https://api.render.com/deploy/srv-xxxx?key=yyyy`).
3. In your GitHub repository:
   - Go to **Settings** ➔ **Secrets and variables** ➔ **Actions**.
   - Click **New repository secret**.
   - Name: `RENDER_DEPLOY_HOOK_URL`
   - Value: *(Paste your Render Deploy Hook URL)*
4. Every push to `main` will now trigger deployment through GitHub Actions!

---

## 🎮 Connecting Godot Client to Render

Once deployed, Render gives you a secure URL:
- HTTPS: `https://hide-play-server.onrender.com`
- WSS (WebSocket): `wss://hide-play-server.onrender.com`

Update your Godot client (`NetworkManager.gd`):
```gdscript
const DEFAULT_ONLINE_SERVER_URL: String = "wss://hide-play-server.onrender.com"
```
*(Render provides automated SSL certificates, so secure WebSocket `wss://` works out of the box with zero setup).*

---

## Alternative: Docker & Fly.io Deployment

A production-optimized multi-stage `Dockerfile` (~60MB footprint) is also provided.

### Deploy on Fly.io
```bash
fly launch
fly deploy
```
