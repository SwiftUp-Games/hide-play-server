import http from 'http';
import fs from 'fs';
import path from 'path';
import express, { Request, Response, NextFunction } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { gameStore } from './store';

// ============================================================================
// HIDE & PLAY — HIGH PERFORMANCE MATCHMAKING, RELAY & WEBRTC SIGNALING SERVER
// ============================================================================

const PORT = parseInt(process.env.PORT || '8080', 10);
const MAX_PLAYERS_PER_ROOM = 20;
const MAX_BOTS = 4;
const MATCHMAKING_WAIT_SECONDS = 20;
const COUNTDOWN_SECONDS = 3;

interface Player {
  peerId: number;
  sessionToken?: string;
  name: string;
  avatar: string;
  hat: string;
  dress: string;
  isHost: boolean;
  isReady: boolean;
  isMuted: boolean;
  isAway?: boolean;
  disconnectedAt?: number;
  ws: WebSocket;
  joinedAt: number;
}

interface RoomSettings {
  counting_time: number;
  hunt_time: number;
  bot_count: number;
  selected_map: string;
}

interface Room {
  code: string;
  mode: 'quick_match' | 'custom';
  hostPeerId: number;
  isPublic: boolean;
  players: Map<number, Player>;
  maxPlayers: number;
  status: 'lobby' | 'countdown' | 'in_game';
  settings: RoomSettings;
  createdAt: number;
  nextPeerId: number;
  matchmakingTimer?: NodeJS.Timeout;
  matchmakingSecondsLeft: number;
  countdownTimer?: NodeJS.Timeout;
  disconnectGraceTimer?: NodeJS.Timeout;
}

const rooms = new Map<string, Room>();
const clientToRoom = new Map<WebSocket, { roomCode: string; peerId: number }>();

// Strictly 4-digit room code generator (OTP format: 1000 - 9999) with collision guard
function generateRoomCode(): string {
  let code = '';
  let attempts = 0;
  do {
    code = Math.floor(1000 + Math.random() * 9000).toString();
    attempts++;
    if (attempts > 5000) {
      code = Math.floor(10000 + Math.random() * 90000).toString();
      break;
    }
  } while (rooms.has(code));
  return code;
}

function getOnlineStats() {
  let realPlayers = 0;
  for (const r of rooms.values()) {
    realPlayers += r.players.size;
  }
  const connectedSockets = wss ? wss.clients.size : realPlayers;
  return {
    online_players: Math.max(connectedSockets, realPlayers),
    active_rooms: rooms.size,
    real_players: realPlayers,
    region: 'Asia-South (Mumbai)'
  };
}

// ----------------------------------------------------------------------------
// HTTP Server (Health Check & Room Discovery API)
// ----------------------------------------------------------------------------
const app = express();
app.use(express.json());

// Global CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Admin Auth Middleware
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : (req.query.token as string);
  if (!gameStore.validateSession(token)) {
    return res.status(401).json({ success: false, message: 'Unauthorized. Please login with 10-digit mobile code.' });
  }
  next();
}

// ----------------------------------------------------------------------------
// Admin Auth Routes
// ----------------------------------------------------------------------------
app.post('/api/admin/login', (req, res) => {
  const code = req.body.code || req.body.otp || req.body.mobile;
  if (!code || !gameStore.verifyCode(code)) {
    return res.status(401).json({ success: false, message: 'Invalid 10-digit authentication code.' });
  }
  const token = gameStore.createSession();
  return res.json({ success: true, token, message: 'Authentication successful.' });
});

app.get('/api/admin/me', requireAdmin, (_req, res) => {
  return res.json({ valid: true });
});

app.post('/api/admin/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : (req.query.token as string);
  if (token) gameStore.invalidateSession(token);
  return res.json({ success: true });
});

app.post(['/api/admin/change-code', '/api/admin/change-mobile'], requireAdmin, (req, res) => {
  const code = req.body.code || req.body.new_code || req.body.mobile;
  const result = gameStore.updateAdminCode(code);
  if (!result.success) return res.status(400).json(result);
  return res.json(result);
});

// ----------------------------------------------------------------------------
// Admin Dashboard & Live Stats Routes
// ----------------------------------------------------------------------------
app.get('/api/admin/stats', requireAdmin, (_req, res) => {
  const stats = getOnlineStats();
  const roomsList = Array.from(rooms.values()).map(r => ({
    code: r.code,
    mode: r.mode,
    host_name: r.players.get(r.hostPeerId)?.name || 'Host',
    host_avatar: r.players.get(r.hostPeerId)?.avatar || 'boy_default',
    map: r.settings.selected_map,
    players_count: r.players.size,
    max_players: r.maxPlayers,
    status: r.status,
    players: Array.from(r.players.values()).map(p => ({ id: p.peerId, name: p.name, avatar: p.avatar }))
  }));

  const data = gameStore.getDashboardOverview(stats.active_rooms, stats.online_players, roomsList);
  return res.json(data);
});

// ----------------------------------------------------------------------------
// Admin Player Management Routes
// ----------------------------------------------------------------------------
app.get('/api/admin/players', requireAdmin, (_req, res) => {
  const players = gameStore.getAllPlayers();
  return res.json({ players });
});

app.post('/api/admin/players/:id/coins', requireAdmin, (req, res) => {
  const id = String(req.params.id);
  const { amount, mode } = req.body;
  const result = gameStore.adjustCoins(id, Number(amount) || 0, mode === 'set' ? 'set' : 'add');
  if (!result.success) return res.status(404).json(result);
  return res.json(result);
});

app.post('/api/admin/players/:id/unlock', requireAdmin, (req, res) => {
  const id = String(req.params.id);
  const { item_type, item_id } = req.body;
  const result = gameStore.unlockItem(id, item_type, item_id);
  if (!result.success) return res.status(404).json(result);
  return res.json(result);
});

app.delete('/api/admin/players/:id', requireAdmin, (req, res) => {
  const id = String(req.params.id);
  const success = gameStore.deletePlayer(id);
  return res.json({ success });
});

// ----------------------------------------------------------------------------
// Admin Pricing Management Routes
// ----------------------------------------------------------------------------
app.get('/api/admin/pricing', requireAdmin, (_req, res) => {
  return res.json(gameStore.getPricing());
});

app.post('/api/admin/pricing', requireAdmin, (req, res) => {
  const updated = gameStore.updatePricing(req.body);
  return res.json({ success: true, pricing: updated });
});

// ----------------------------------------------------------------------------
// Admin Monetization & Ads Routes
// ----------------------------------------------------------------------------
app.get('/api/admin/monetization', requireAdmin, (_req, res) => {
  return res.json(gameStore.getMonetization());
});

app.post('/api/admin/monetization', requireAdmin, (req, res) => {
  const updated = gameStore.updateMonetization(req.body);
  return res.json({ success: true, monetization: updated });
});

app.get('/api/admin/monetization/metrics', requireAdmin, (_req, res) => {
  return res.json(gameStore.getMonetizationMetrics());
});

app.post('/api/admin/monetization/reset-metrics', requireAdmin, (_req, res) => {
  const result = gameStore.resetMonetizationMetrics();
  return res.json(result);
});

app.get('/api/admin/analytics', requireAdmin, (req, res) => {
  const limit = parseInt(req.query.limit as string || '50', 10);
  return res.json({
    events: gameStore.getRecentAnalyticsEvents(limit)
  });
});

// ----------------------------------------------------------------------------
// Admin Room Control Routes
// ----------------------------------------------------------------------------
app.post('/api/admin/rooms/:code/close', requireAdmin, (req, res) => {
  const code = String(req.params.code);
  const room = rooms.get(code);
  if (room) {
    stopRoomTimers(room);
    broadcastToRoom(room, { type: 'ERROR', code: 'ROOM_CLOSED', message: 'Room closed by Game Admin.' });
    for (const [_, p] of room.players) {
      clientToRoom.delete(p.ws);
    }
    rooms.delete(code);
    return res.json({ success: true, message: `Room ${code} closed.` });
  }
  return res.status(404).json({ success: false, message: 'Room not found.' });
});

// ----------------------------------------------------------------------------
// Public Game Client Endpoints (Used by Mobile Game Godot Client)
// ----------------------------------------------------------------------------
app.get('/api/game/config', (_req, res) => {
  return res.json(gameStore.getPublicClientConfig());
});

app.get('/api/game/monetization/config', (_req, res) => {
  const pub = gameStore.getPublicClientConfig();
  return res.json({
    success: true,
    monetization: pub.monetization
  });
});

app.post('/api/game/monetization/ad-event', (req, res) => {
  const { type, player_id, player_name, diamonds_awarded, ad_unit_id } = req.body;
  if (!type) {
    return res.status(400).json({ success: false, message: 'Missing ad event type (banner_impression, rewarded_completion, ad_click).' });
  }
  const result = gameStore.trackAdEvent({
    type,
    player_id,
    player_name,
    diamonds_awarded: diamonds_awarded ? Number(diamonds_awarded) : undefined,
    ad_unit_id
  });
  return res.json(result);
});

app.post('/api/game/player-sync', (req, res) => {
  const player = gameStore.registerOrSyncPlayer(req.body);
  return res.json({
    success: true,
    player,
    config: gameStore.getPublicClientConfig()
  });
});

app.post('/api/game/analytics', (req, res) => {
  const { player_id, player_name, event_name, metadata, timestamp } = req.body;
  if (!event_name) {
    return res.status(400).json({ success: false, message: 'Missing event_name parameter.' });
  }

  // If player starts game or session, count towards game opens
  if (event_name === 'GAME_START' || event_name === 'PLAYER_JOIN' || event_name === 'SESSION_START') {
    gameStore.trackGameOpen(player_id);
  }

  const event = gameStore.recordAnalyticsEvent({
    player_id,
    player_name,
    event_name,
    metadata,
    timestamp: timestamp ? Number(timestamp) : Date.now()
  });
  return res.json({ success: true, event });
});

// ----------------------------------------------------------------------------
// Static Assets & Download Landing Page
// ----------------------------------------------------------------------------
const publicPath = path.resolve(__dirname, '../public');
if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
}

const publicAssetsPath = path.resolve(__dirname, '../public/assets');
if (fs.existsSync(publicAssetsPath)) {
  app.use('/assets', express.static(publicAssetsPath));
}

const downloadHtmlPath = path.resolve(__dirname, '../public/download.html');
app.get(['/download', '/download/'], (_req, res) => {
  if (fs.existsSync(downloadHtmlPath)) {
    return res.sendFile(downloadHtmlPath);
  }
  return res.redirect('/download/apk');
});

// ----------------------------------------------------------------------------
// Tester & Download Program Endpoints
// ----------------------------------------------------------------------------
// 1. Get Public Download Config
app.get('/api/download/config', (_req, res) => {
  return res.json({
    success: true,
    config: gameStore.getDownloadConfig(),
    stats: {
      online_players: getOnlineStats().online_players
    }
  });
});

// 2. Track Page Visit (Tester Link Clicked)
app.post('/api/download/track-visit', (req, res) => {
  const ip = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || '';
  const referrer = req.body?.referrer || req.headers.referer || '';
  gameStore.trackPageVisit(ip, userAgent, referrer);
  return res.json({ success: true });
});

// 3. Track Download Click
app.post('/api/download/track-click', (req, res) => {
  const ip = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || '';
  gameStore.trackDownloadClick(ip, userAgent);
  return res.json({ success: true });
});

// 4. Download APK direct route (redirects to R2 or streams local apk)
app.get('/download/apk', (req, res) => {
  const ip = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || '';
  gameStore.trackDownloadClick(ip, userAgent);

  const config = gameStore.getDownloadConfig();
  if (config.r2_download_url && config.r2_download_url.trim().length > 0) {
    return res.redirect(302, config.r2_download_url.trim());
  }

  // Fallback to local built apk if present
  const localApkPath = path.resolve(__dirname, '../../hide-play/build/android/HideAndPlay.apk');
  if (fs.existsSync(localApkPath)) {
    return res.download(localApkPath, 'HideAndPlay.apk');
  }

  return res.status(404).send('APK download link is being updated. Please check back shortly!');
});

// 5. Submit In-Game & Tester Feedback
app.post(['/api/game/feedback', '/api/download/feedback'], (req, res) => {
  const { name, rating, category, device_model, comments, feedback, source, platform, app_version } = req.body;
  const feedbackText = (comments || feedback || '').trim();
  if (!feedbackText || feedbackText.length === 0) {
    return res.status(400).json({ success: false, message: 'Please provide your valuable feedback comments.' });
  }

  const isGame = source === 'game' || req.path.includes('/game/');
  const clientName = (name || (isGame ? 'Player' : 'Anonymous Tester')).trim();
  const clientDevice = device_model || req.headers['user-agent']?.substring(0, 60) || (isGame ? 'In-Game Client' : 'Web Browser');

  const entry = gameStore.submitTesterFeedback({
    name: clientName,
    rating: Number(rating) || 5,
    category: category || (isGame ? 'gameplay' : 'general'),
    device_model: clientDevice,
    comments: feedbackText,
    source: isGame ? 'game' : 'web',
    platform: platform || (isGame ? 'In-Game App' : 'Web Download Page'),
    app_version: app_version || '1.0.0'
  });

  return res.json({ 
    success: true, 
    message: 'Thank you for your valuable feedback! We appreciate your support.', 
    feedback: entry 
  });
});

// 6. Admin Tester Analytics & Config endpoints
app.get('/api/admin/testers', requireAdmin, (_req, res) => {
  return res.json({
    success: true,
    analytics: gameStore.getTesterAnalytics(),
    feedbacks: gameStore.getTesterFeedbacks(100),
    config: gameStore.getDownloadConfig()
  });
});

app.post('/api/admin/download/config', requireAdmin, (req, res) => {
  const updated = gameStore.updateDownloadConfig(req.body);
  return res.json({ success: true, config: updated, message: 'Download configuration updated successfully!' });
});

app.post('/api/admin/testers/feedback/status', requireAdmin, (req, res) => {
  const { id, status } = req.body;
  if (!id || !status) {
    return res.status(400).json({ success: false, message: 'Missing id or status.' });
  }
  const ok = gameStore.updateTesterFeedbackStatus(id, status);
  return res.json({ success: ok });
});

app.delete('/api/admin/testers/feedback/:id', requireAdmin, (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const ok = gameStore.deleteTesterFeedback(id);
  return res.json({ success: ok });
});

app.get('/health', (_req, res) => {
  const stats = getOnlineStats();
  return res.json({
    status: 'ok',
    service: 'hide-play-online-relay',
    uptime_seconds: Math.floor(process.uptime()),
    active_rooms: stats.active_rooms,
    active_players: stats.real_players,
    online_players: stats.online_players,
    region: stats.region,
    timestamp: Date.now()
  });
});

app.get('/rooms', (_req, res) => {
  return res.json({ rooms: getPublicRoomsSummary() });
});

// ----------------------------------------------------------------------------
// Serve Built React Admin App
// ----------------------------------------------------------------------------
const adminDistPath = path.resolve(__dirname, '../admin/dist');
if (fs.existsSync(adminDistPath)) {
  app.use('/admin', express.static(adminDistPath));
  app.use(express.static(adminDistPath));
  app.get(/^\/admin(?:\/.*)?$/, (_req, res) => {
    res.sendFile(path.join(adminDistPath, 'index.html'));
  });
  app.get('/', (req, res, next) => {
    if (req.headers.accept && req.headers.accept.includes('text/html')) {
      return res.sendFile(path.join(adminDistPath, 'index.html'));
    }
    next();
  });
} else {
  app.get(/^\/admin(?:\/.*)?$/, (_req, res) => {
    res.send(getDashboardHtml());
  });
  app.get('/', (req, res) => {
    if (req.headers.accept && req.headers.accept.includes('text/html')) {
      return res.send(getDashboardHtml());
    }
    res.json(getOnlineStats());
  });
}

const server = http.createServer(app);

function getPublicRoomsSummary() {
  const list = [];
  for (const r of rooms.values()) {
    if (r.mode === 'custom' && r.isPublic && r.status === 'lobby') {
      const host = r.players.get(r.hostPeerId);
      list.push({
        code: r.code,
        host_name: host ? host.name : 'Host',
        host_avatar: host ? host.avatar : 'boy_default',
        map: r.settings.selected_map,
        players_count: r.players.size,
        max_players: r.maxPlayers,
        counting_time: r.settings.counting_time,
        hunt_time: r.settings.hunt_time,
        created_at: r.createdAt
      });
    }
  }
  return list;
}

// ----------------------------------------------------------------------------
// WebSocket Server (Matchmaking, Signaling & Fast Relay)
// ----------------------------------------------------------------------------
const wss = new WebSocketServer({ server });

wss.on('connection', (ws: WebSocket) => {
  // Track mobile client opening and connecting to game
  gameStore.trackGameOpen();

  // Send immediate welcome ping with online stats
  const stats = getOnlineStats();
  safeSend(ws, { 
    type: 'CONNECTED', 
    version: '1.0.0', 
    serverTime: Date.now(),
    online_players: stats.online_players,
    active_rooms: stats.active_rooms,
    region: stats.region
  });

  ws.on('message', (raw: Buffer | string) => {
    // Check if raw binary or text JSON
    if (Buffer.isBuffer(raw) && raw.length > 0 && raw[0] !== 0x7B) {
      // Binary game packet relay: forward to room peers
      handleBinaryRelay(ws, raw);
      return;
    }

    try {
      const msgStr = typeof raw === 'string' ? raw : raw.toString('utf8');
      const msg = JSON.parse(msgStr);
      handleClientMessage(ws, msg);
    } catch (err) {
      console.warn('Failed to parse message:', err);
    }
  });

  ws.on('close', () => {
    handleDisconnect(ws);
  });

  ws.on('error', (err) => {
    console.warn('Client socket error:', err.message);
  });
});

// Periodic heartbeat to prevent idle timeouts across Render/Cloudflare proxies
setInterval(() => {
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.ping();
      } catch (e) {
        // ignore
      }
    }
  }
}, 25000);

// ----------------------------------------------------------------------------
// Client Message Router
// ----------------------------------------------------------------------------
function handleClientMessage(ws: WebSocket, msg: any) {
  const mapping = clientToRoom.get(ws);
  const currentRoom = mapping ? rooms.get(mapping.roomCode) : undefined;
  const currentPeerId = mapping ? mapping.peerId : 0;

  switch (msg.type) {
    case 'PING':
    case 'GET_STATS': {
      const stats = getOnlineStats();
      safeSend(ws, { 
        type: 'PONG', 
        time: Date.now(),
        client_time: msg.client_time,
        online_players: stats.online_players,
        active_rooms: stats.active_rooms,
        region: stats.region
      });
      break;
    }

    case 'LIST_ROOMS':
      safeSend(ws, { type: 'ROOM_LIST', rooms: getPublicRoomsSummary() });
      break;

    // 1. QUICK MATCH (Random matchmaking into open quick_match room)
    case 'QUICK_MATCH': {
      leaveCurrentRoom(ws);

      // Search ONLY for open quick_match rooms with space (never custom rooms)
      let targetRoom: Room | undefined;
      for (const r of rooms.values()) {
        if (r.mode === 'quick_match' && r.status === 'lobby' && r.players.size < r.maxPlayers) {
          targetRoom = r;
          break;
        }
      }

      if (targetRoom) {
        // Join existing matchmaking room
        joinRoomInternal(ws, targetRoom, msg.player_name || 'Player', msg.avatar, msg.hat, msg.dress);
        if (!targetRoom.matchmakingTimer) {
          startMatchmakingTimer(targetRoom);
        } else {
          safeSend(ws, {
            type: 'MATCHMAKING_TICK',
            seconds_left: targetRoom.matchmakingSecondsLeft,
            players_count: targetRoom.players.size,
            max_players: targetRoom.maxPlayers
          });
        }
      } else {
        // Create new quick_match room and start 20s matchmaking timer
        const newRoom = createRoomInternal(ws, {
          mode: 'quick_match',
          isPublic: false,
          player_name: msg.player_name || 'Player',
          avatar: msg.avatar,
          hat: msg.hat,
          dress: msg.dress,
          settings: msg.settings
        });
        startMatchmakingTimer(newRoom);
      }
      break;
    }

    // 2. CREATE ROOM (Custom room creation by code)
    case 'CREATE_ROOM': {
      leaveCurrentRoom(ws);
      const isPublic = msg.is_public === true;
      const newRoom = createRoomInternal(ws, {
        mode: 'custom',
        isPublic,
        player_name: msg.player_name || 'Host',
        avatar: msg.avatar,
        hat: msg.hat,
        dress: msg.dress,
        settings: msg.settings
      });
      // Custom rooms stay in lobby waiting for friends with NO auto-fill timer
      break;
    }

    // 3. JOIN ROOM (By Strictly 4-digit OTP Code)
    case 'JOIN_ROOM': {
      leaveCurrentRoom(ws, false);
      const rawCode = (msg.code || '').toString().trim();
      let code = rawCode.replace(/[^0-9]/g, '').slice(0, 4);
      let targetRoom = rooms.get(code);

      // Fallback matching if legacy room code format existed
      if (!targetRoom && code.length === 4) {
        for (const [rCode, r] of rooms) {
          if (rCode === code || rCode.replace(/[^0-9]/g, '') === code) {
            targetRoom = r;
            code = rCode;
            break;
          }
        }
      }

      if (!targetRoom || code.length !== 4) {
        safeSend(ws, { type: 'ERROR', code: 'ROOM_NOT_FOUND', message: `Room ${code || rawCode} was not found.` });
        return;
      }

      // If room had a disconnect grace timer active, cancel it immediately since a new live player joined!
      if (targetRoom.disconnectGraceTimer) {
        clearTimeout(targetRoom.disconnectGraceTimer);
        targetRoom.disconnectGraceTimer = undefined;
        console.log(`[Room Grace Cancelled] Player joining room ${code}.`);
      }

      if (targetRoom.status !== 'lobby') {
        safeSend(ws, { type: 'ERROR', code: 'GAME_IN_PROGRESS', message: `Room ${code} is already in game.` });
        return;
      }
      if (targetRoom.players.size >= targetRoom.maxPlayers) {
        safeSend(ws, { type: 'ERROR', code: 'ROOM_FULL', message: `Room ${code} is full (max 20 players).` });
        return;
      }

      joinRoomInternal(ws, targetRoom, msg.player_name || 'Player', msg.avatar, msg.hat, msg.dress, msg.session_token);
      break;
    }

    // 3b. RECONNECT ROOM (Seamless resumption after app was backgrounded / swiped up)
    case 'RECONNECT_ROOM': {
      leaveCurrentRoom(ws, false);
      const rawCode = (msg.code || '').toString().trim();
      let code = rawCode.replace(/[^0-9]/g, '').slice(0, 4);
      let targetRoom = rooms.get(code);

      if (!targetRoom && code.length === 4) {
        for (const [rCode, r] of rooms) {
          if (rCode === code || rCode.replace(/[^0-9]/g, '') === code) {
            targetRoom = r;
            code = rCode;
            break;
          }
        }
      }

      if (!targetRoom) {
        safeSend(ws, { type: 'ERROR', code: 'ROOM_NOT_FOUND', message: `Room ${code || rawCode} was not found.` });
        return;
      }

      if (targetRoom.disconnectGraceTimer) {
        clearTimeout(targetRoom.disconnectGraceTimer);
        targetRoom.disconnectGraceTimer = undefined;
        console.log(`[Room Grace Cancelled] Player reconnected to room ${code}.`);
      }

      const reqPeerId = Number(msg.peer_id || msg.peerId || 0);
      const sessionToken = msg.session_token || msg.sessionToken;
      let matchedPlayer: Player | undefined;

      for (const p of targetRoom.players.values()) {
        if (sessionToken && p.sessionToken && p.sessionToken === sessionToken) {
          matchedPlayer = p;
          break;
        }
      }
      if (!matchedPlayer && reqPeerId > 0 && targetRoom.players.has(reqPeerId)) {
        matchedPlayer = targetRoom.players.get(reqPeerId);
      }
      if (!matchedPlayer && (msg.is_host === true || targetRoom.players.size === 1)) {
        matchedPlayer = targetRoom.players.get(targetRoom.hostPeerId);
      }

      if (matchedPlayer) {
        matchedPlayer.ws = ws;
        matchedPlayer.isAway = false;
        matchedPlayer.disconnectedAt = undefined;
        if (msg.player_name) matchedPlayer.name = msg.player_name;
        if (msg.avatar) matchedPlayer.avatar = msg.avatar;
        if (msg.hat) matchedPlayer.hat = msg.hat;
        if (msg.dress) matchedPlayer.dress = msg.dress;

        clientToRoom.set(ws, { roomCode: targetRoom.code, peerId: matchedPlayer.peerId });

        safeSend(ws, {
          type: 'ROOM_RECONNECTED',
          code: targetRoom.code,
          peer_id: matchedPlayer.peerId,
          peerId: matchedPlayer.peerId,
          is_host: matchedPlayer.isHost,
          settings: targetRoom.settings
        });

        broadcastLobbyState(targetRoom);
        console.log(`[Player Reconnected] ${matchedPlayer.name} (Peer ${matchedPlayer.peerId}) rejoined room ${targetRoom.code}`);
      } else {
        joinRoomInternal(ws, targetRoom, msg.player_name || 'Player', msg.avatar, msg.hat, msg.dress, sessionToken);
      }
      break;
    }

    // 4. LEAVE ROOM (Explicit user action)
    case 'LEAVE_ROOM': {
      leaveCurrentRoom(ws, true);
      safeSend(ws, { type: 'LEFT_ROOM' });
      break;
    }

    // 5. UPDATE ROOM SETTINGS (Host only)
    case 'UPDATE_SETTINGS': {
      if (currentRoom && currentPeerId === currentRoom.hostPeerId) {
        if (msg.settings) {
          currentRoom.settings = { ...currentRoom.settings, ...msg.settings };
          broadcastToRoom(currentRoom, {
            type: 'SETTINGS_UPDATED',
            settings: currentRoom.settings
          });
          broadcastLobbyState(currentRoom);
          console.log(`[Settings Updated] Room ${currentRoom.code} settings:`, currentRoom.settings);
        }
      }
      break;
    }

    // 6. READY TOGGLE
    case 'SET_READY': {
      if (currentRoom) {
        const player = currentRoom.players.get(currentPeerId);
        if (player) {
          player.isReady = !!msg.is_ready;
          broadcastLobbyState(currentRoom);
        }
      }
      break;
    }

    // 7. START GAME (Host manually starts)
    case 'START_GAME': {
      if (currentRoom && currentPeerId === currentRoom.hostPeerId && currentRoom.status === 'lobby') {
        stopRoomTimers(currentRoom);
        currentRoom.status = 'countdown';

        // Custom room bot check: only add bots if host explicitly configured them in settings (capped at MAX_BOTS)
        const customBots = Math.min(MAX_BOTS, Math.max(0, currentRoom.settings.bot_count || 0));
        if (customBots > 0) {
          console.log(`[Custom Room] Room ${currentRoom.code} host configured ${customBots} bots.`);
          broadcastToRoom(currentRoom, {
            type: 'MATCHMAKING_AUTO_FILL',
            bots_needed: customBots,
            total_players: currentRoom.players.size + customBots
          });
        }

        triggerAutoStartCountdown(currentRoom);
      }
      break;
    }

    // 8. GAMEPLAY RELAY (Positions, Roulette, Spotting, SAT calls)
    case 'GAME_RELAY': {
      if (currentRoom) {
        const targetPeerId = msg.target_peer_id; // 0 or undefined for broadcast
        msg.from_peer_id = currentPeerId;
        if (targetPeerId && targetPeerId > 0) {
          const dest = currentRoom.players.get(targetPeerId);
          if (dest && dest.ws.readyState === WebSocket.OPEN) {
            safeSend(dest.ws, msg);
          }
        } else {
          // Broadcast to other peers in room
          for (const [id, p] of currentRoom.players) {
            if (id !== currentPeerId && p.ws.readyState === WebSocket.OPEN) {
              safeSend(p.ws, msg);
            }
          }
        }
      }
      break;
    }

    // 9. WEBRTC VOICE SIGNALING (Free P2P Mesh Handshake)
    case 'VOICE_SIGNAL': {
      if (currentRoom) {
        const targetPeerId = msg.target_peer_id !== undefined ? msg.target_peer_id : msg.targetPeerId;
        if (targetPeerId) {
          const dest = currentRoom.players.get(targetPeerId);
          if (dest && dest.ws.readyState === WebSocket.OPEN) {
            msg.from_peer_id = currentPeerId;
            msg.fromPeerId = currentPeerId;
            safeSend(dest.ws, msg);
          }
        }
      }
      break;
    }

    // 10. VOICE MUTE TOGGLE (Nametag indicator badge)
    case 'VOICE_MUTE_TOGGLE': {
      if (currentRoom) {
        const player = currentRoom.players.get(currentPeerId);
        if (player) {
          player.isMuted = msg.is_muted !== undefined ? !!msg.is_muted : !!msg.isMuted;
          broadcastToRoom(currentRoom, {
            type: 'PEER_MUTE_STATUS',
            peer_id: currentPeerId,
            peerId: currentPeerId,
            is_muted: player.isMuted,
            isMuted: player.isMuted
          });
        }
      }
      break;
    }

    default:
      console.warn('Unknown message type:', msg.type);
  }
}

// ----------------------------------------------------------------------------
// Binary High-Speed Relay (Game & Real-Time Voice Audio)
// ----------------------------------------------------------------------------
function handleBinaryRelay(ws: WebSocket, buffer: Buffer) {
  try {
    const mapping = clientToRoom.get(ws);
    if (!mapping) return;
    const room = rooms.get(mapping.roomCode);
    if (!room) return;

    // 0x56 = 'V' for VOICE_AUDIO packet
    if (buffer.length >= 5 && buffer[0] === 0x56) {
      // Stamp authoritative sender peerId in bytes 1-2 (Little-Endian matching GDScript decode_u16)
      buffer.writeUInt16LE(mapping.peerId, 1);
      const targetPeerId = buffer.readUInt16LE(3);

      // If a specific target peer is requested (> 0), deliver unicast
      if (targetPeerId > 0) {
        const dest = room.players.get(targetPeerId);
        if (dest && dest.ws !== ws && dest.ws.readyState === WebSocket.OPEN) {
          try {
            dest.ws.send(buffer, { binary: true });
          } catch (err) {
            // ignore send error on closing socket
          }
        }
        return;
      }
    }

    // Broadcast binary packet strictly to all other peers in the same room
    for (const [, p] of room.players) {
      if (p.ws !== ws && p.ws && p.ws.readyState === WebSocket.OPEN) {
        try {
          p.ws.send(buffer, { binary: true });
        } catch (err) {
          // ignore send error on closing socket
        }
      }
    }
  } catch (err) {
    console.warn('[handleBinaryRelay] Error handling packet:', err);
  }
}

// ----------------------------------------------------------------------------
// Room Creation & Joining Logic
// ----------------------------------------------------------------------------
function createRoomInternal(
  ws: WebSocket,
  opts: {
    mode?: 'quick_match' | 'custom';
    isPublic: boolean;
    player_name: string;
    avatar?: string;
    hat?: string;
    dress?: string;
    settings?: Partial<RoomSettings>;
    session_token?: string;
  }
): Room {
  const code = generateRoomCode();
  const hostPeerId = 1;
  const mode = opts.mode || 'custom';

  const defaultSettings: RoomSettings = {
    counting_time: 15,
    hunt_time: 120,
    bot_count: 0,
    selected_map: 'kerala_village',
    ...(opts.settings || {})
  };

  const hostPlayer: Player = {
    peerId: hostPeerId,
    sessionToken: opts.session_token,
    name: opts.player_name || 'Host',
    avatar: opts.avatar || 'boy_default',
    hat: opts.hat || 'hat_none',
    dress: opts.dress || 'dress_default',
    isHost: true,
    isReady: true,
    isMuted: false,
    isAway: false,
    ws,
    joinedAt: Date.now()
  };

  const room: Room = {
    code,
    mode,
    hostPeerId,
    isPublic: opts.isPublic,
    players: new Map([[hostPeerId, hostPlayer]]),
    maxPlayers: MAX_PLAYERS_PER_ROOM,
    status: 'lobby',
    settings: defaultSettings,
    createdAt: Date.now(),
    nextPeerId: 2,
    matchmakingSecondsLeft: MATCHMAKING_WAIT_SECONDS
  };

  rooms.set(code, room);
  clientToRoom.set(ws, { roomCode: code, peerId: hostPeerId });

  safeSend(ws, {
    type: 'ROOM_CREATED',
    code: room.code,
    peer_id: hostPeerId,
    peerId: hostPeerId,
    is_host: true,
    settings: room.settings
  });

  gameStore.recordAnalyticsEvent({
    player_id: String(hostPeerId),
    player_name: hostPlayer.name,
    event_name: 'PLAYER_JOIN',
    metadata: { room_code: code, action: 'room_created', mode: room.mode }
  });

  broadcastLobbyState(room);
  console.log(`[Room Created] ${code} by ${hostPlayer.name} (Public: ${room.isPublic})`);
  return room;
}

function joinRoomInternal(
  ws: WebSocket,
  room: Room,
  name: string,
  avatar?: string,
  hat?: string,
  dress?: string,
  sessionToken?: string
) {
  const peerId = room.nextPeerId++;
  const player: Player = {
    peerId,
    sessionToken,
    name: name || `Player_${peerId}`,
    avatar: avatar || 'boy_default',
    hat: hat || 'hat_none',
    dress: dress || 'dress_default',
    isHost: false,
    isReady: false,
    isMuted: false,
    isAway: false,
    ws,
    joinedAt: Date.now()
  };

  room.players.set(peerId, player);
  clientToRoom.set(ws, { roomCode: room.code, peerId });

  gameStore.recordAnalyticsEvent({
    player_id: String(peerId),
    player_name: player.name,
    event_name: 'PLAYER_JOIN',
    metadata: { room_code: room.code, action: 'room_joined', mode: room.mode }
  });

  safeSend(ws, {
    type: 'ROOM_JOINED',
    code: room.code,
    peer_id: peerId,
    peerId: peerId,
    is_host: false,
    settings: room.settings
  });

  broadcastLobbyState(room);
  console.log(`[Player Joined] ${player.name} (Peer ${peerId}) entered room ${room.code} (${room.players.size}/${room.maxPlayers})`);

  // Auto-start condition: 6 players reached!
  if (room.players.size >= room.maxPlayers) {
    stopRoomTimers(room);
    room.status = 'countdown';
    triggerAutoStartCountdown(room);
  }
}

// ----------------------------------------------------------------------------
// Matchmaking 20-Second Bot Fallback Timer
// ----------------------------------------------------------------------------
function startMatchmakingTimer(room: Room) {
  stopRoomTimers(room);
  room.matchmakingSecondsLeft = MATCHMAKING_WAIT_SECONDS;

  room.matchmakingTimer = setInterval(() => {
    room.matchmakingSecondsLeft--;

    broadcastToRoom(room, {
      type: 'MATCHMAKING_TICK',
      seconds_left: room.matchmakingSecondsLeft,
      players_count: room.players.size,
      max_players: room.maxPlayers
    });

    if (room.matchmakingSecondsLeft <= 0) {
      clearInterval(room.matchmakingTimer!);
      room.matchmakingTimer = undefined;

      // 20 Seconds Elapsed in Quick Match:
      // Even with 2 players, launch the game! Strictly limit bots to MAX_BOTS (4)
      const humanCount = room.players.size;
      const missingBots = Math.min(MAX_BOTS, Math.max(0, 5 - humanCount));
      const totalParticipants = humanCount + missingBots;
      console.log(`[Matchmaking 20s Elapsed] Room ${room.code} starting with ${humanCount} human players. Auto-filling ${missingBots} bots (Total: ${totalParticipants}).`);

      room.status = 'countdown';
      if (missingBots > 0) {
        broadcastToRoom(room, {
          type: 'MATCHMAKING_AUTO_FILL',
          bots_needed: missingBots,
          total_players: totalParticipants
        });
      }

      triggerAutoStartCountdown(room);
    }
  }, 1000);
}

function triggerAutoStartCountdown(room: Room) {
  let seconds = COUNTDOWN_SECONDS;
  broadcastToRoom(room, {
    type: 'COUNTDOWN_START',
    countdown: seconds
  });

  room.countdownTimer = setInterval(() => {
    seconds--;
    if (seconds > 0) {
      broadcastToRoom(room, {
        type: 'COUNTDOWN_TICK',
        countdown: seconds
      });
    } else {
      clearInterval(room.countdownTimer!);
      room.countdownTimer = undefined;
      room.status = 'in_game';

      // Pick authoritative Finder uniformly from all players and configured bots (capped at MAX_BOTS = 4)
      const pids = Array.from(room.players.keys());
      let botsCount = 0;
      if (room.mode === 'quick_match') {
        botsCount = Math.min(MAX_BOTS, Math.max(0, 5 - room.players.size));
      } else {
        botsCount = Math.min(MAX_BOTS, Math.max(0, room.settings.bot_count || 0));
      }
      for (let b = 0; b < botsCount; b++) {
        pids.push(101 + b);
      }
      const chosenFinderId = pids[Math.floor(Math.random() * pids.length)];

      broadcastToRoom(room, {
        type: 'LAUNCH_GAME',
        finder_id: chosenFinderId,
        candidates: pids,
        map: room.settings.selected_map
      });
      console.log(`[Game Launched] Room ${room.code} is now in_game! Finder: Peer ${chosenFinderId}`);

      gameStore.recordAnalyticsEvent({
        event_name: 'GAME_START',
        metadata: {
          room_code: room.code,
          mode: room.mode,
          map: room.settings.selected_map,
          players_count: room.players.size,
          finder_id: chosenFinderId
        }
      });
    }
  }, 1000);
}

function stopRoomTimers(room: Room) {
  if (room.matchmakingTimer) {
    clearInterval(room.matchmakingTimer);
    room.matchmakingTimer = undefined;
  }
  if (room.countdownTimer) {
    clearInterval(room.countdownTimer);
    room.countdownTimer = undefined;
  }
  if (room.disconnectGraceTimer) {
    clearTimeout(room.disconnectGraceTimer);
    room.disconnectGraceTimer = undefined;
  }
}

// ----------------------------------------------------------------------------
// Lobby State & Disconnect Handling (With Background Resilience Grace Period)
// ----------------------------------------------------------------------------
function broadcastLobbyState(room: Room) {
  const pList = Array.from(room.players.values()).map(p => ({
    id: p.peerId,
    name: p.name,
    avatar: p.avatar,
    hat: p.hat,
    dress: p.dress,
    is_host: p.isHost,
    is_ready: p.isReady,
    is_muted: p.isMuted,
    is_away: !!p.isAway
  }));

  broadcastToRoom(room, {
    type: 'LOBBY_STATE',
    code: room.code,
    host_id: room.hostPeerId,
    players: pList,
    count: room.players.size,
    max_players: room.maxPlayers,
    status: room.status,
    settings: room.settings
  });
}

function leaveCurrentRoom(ws: WebSocket, isExplicitLeave: boolean = false) {
  const mapping = clientToRoom.get(ws);
  if (!mapping) return;

  const { roomCode, peerId } = mapping;
  clientToRoom.delete(ws);
  const room = rooms.get(roomCode);
  if (!room) return;

  const player = room.players.get(peerId);
  if (!player) return;

  if (isExplicitLeave) {
    // Explicit player departure: remove from room roster
    room.players.delete(peerId);
    console.log(`[Player Left Explicitly] ${player.name} (Peer ${peerId}) left room ${roomCode}`);

    if (room.players.size === 0) {
      stopRoomTimers(room);
      rooms.delete(roomCode);
      console.log(`[Room Destroyed] Room ${roomCode} is now empty.`);
    } else {
      // If the host left, migrate host authority to the oldest remaining player
      if (peerId === room.hostPeerId) {
        const nextHost = room.players.values().next().value;
        if (nextHost) {
          nextHost.isHost = true;
          nextHost.isReady = true;
          room.hostPeerId = nextHost.peerId;
          console.log(`[Host Migrated] Peer ${nextHost.peerId} (${nextHost.name}) is now host of ${roomCode}`);
        }
      }
      broadcastLobbyState(room);
    }
  } else {
    // Unexpected socket disconnection (e.g. user swiped up to WhatsApp, locked phone, network blip)
    player.isAway = true;
    player.disconnectedAt = Date.now();
    player.ws = null as any;
    console.log(`[Player Background/Offline] ${player.name} (Peer ${peerId}) disconnected from room ${roomCode}. Preserving room.`);

    // Check if any players in the room still have an open WebSocket
    let activeSockets = 0;
    for (const p of room.players.values()) {
      if (p.ws && p.ws.readyState === WebSocket.OPEN && !p.isAway) {
        activeSockets++;
      }
    }

    if (activeSockets > 0) {
      broadcastLobbyState(room);
    } else {
      // All players in room are temporarily away: start a 5-minute (300s) grace timer!
      if (!room.disconnectGraceTimer) {
        console.log(`[Room Grace Period Started] Room ${roomCode} waiting 5 minutes for players to return before closing.`);
        room.disconnectGraceTimer = setTimeout(() => {
          const r = rooms.get(roomCode);
          if (r && r === room) {
            let hasLive = false;
            for (const p of r.players.values()) {
              if (p.ws && p.ws.readyState === WebSocket.OPEN && !p.isAway) {
                hasLive = true;
                break;
              }
            }
            if (!hasLive) {
              console.log(`[Room Grace Expired] Destroying abandoned room ${roomCode}.`);
              stopRoomTimers(r);
              rooms.delete(roomCode);
            }
          }
        }, 5 * 60 * 1000);
      }
    }
  }
}

function handleDisconnect(ws: WebSocket) {
  leaveCurrentRoom(ws, false);
}

function broadcastToRoom(room: Room, data: any) {
  const msg = typeof data === 'string' ? data : JSON.stringify(data);
  for (const [, p] of room.players) {
    if (p.ws.readyState === WebSocket.OPEN) {
      try {
        p.ws.send(msg);
      } catch (err) {
        // ignore send error
      }
    }
  }
}

function safeSend(ws: WebSocket, data: any) {
  if (ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(typeof data === 'string' ? data : JSON.stringify(data));
    } catch (err) {
      // ignore send error
    }
  }
}

function getDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hide & Play — Online Relay Server</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌴</text></svg>">
  <style>
    :root {
      --bg: #07120a;
      --card-bg: rgba(14, 30, 20, 0.85);
      --card-border: rgba(45, 90, 55, 0.4);
      --primary: #ffd752;
      --accent: #2ecc71;
      --danger: #e74c3c;
      --text: #eef7f0;
      --text-dim: #8fae98;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: radial-gradient(circle at 50% 10%, #102d1b 0%, var(--bg) 100%);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      padding: 30px 20px;
    }
    .container { max-width: 960px; margin: 0 auto; }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 28px;
      flex-wrap: wrap;
      gap: 16px;
    }
    .brand { display: flex; align-items: center; gap: 14px; }
    .brand-icon { font-size: 38px; }
    .brand-title { font-size: 26px; font-weight: 800; color: var(--primary); letter-spacing: 0.5px; }
    .brand-subtitle { font-size: 13px; color: var(--text-dim); }
    .badge-live {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(46, 204, 113, 0.15);
      border: 1px solid rgba(46, 204, 113, 0.4);
      color: var(--accent);
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
    }
    .pulse-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--accent);
      box-shadow: 0 0 10px var(--accent);
      animation: pulse 1.8s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 28px;
    }
    .metric-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 20px;
      backdrop-filter: blur(8px);
    }
    .metric-label { font-size: 12px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
    .metric-val { font-size: 30px; font-weight: 800; color: #fff; }
    .metric-sub { font-size: 12px; color: var(--accent); margin-top: 4px; }
    .section-title { font-size: 18px; font-weight: 700; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between; }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 22px;
      margin-bottom: 26px;
      backdrop-filter: blur(8px);
    }
    .rooms-table { width: 100%; border-collapse: collapse; text-align: left; }
    .rooms-table th { padding: 10px 14px; color: var(--text-dim); font-size: 12px; border-bottom: 1px solid var(--card-border); text-transform: uppercase; }
    .rooms-table td { padding: 14px; border-bottom: 1px solid rgba(255, 255, 255, 0.05); font-size: 14px; }
    .code-pill {
      display: inline-block;
      padding: 4px 10px;
      background: rgba(255, 215, 82, 0.15);
      border: 1px solid rgba(255, 215, 82, 0.4);
      color: var(--primary);
      border-radius: 6px;
      font-weight: 700;
      font-family: monospace;
      font-size: 14px;
    }
    .empty-state { text-align: center; padding: 32px 10px; color: var(--text-dim); font-size: 14px; }
    .playground-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    @media (max-width: 768px) { .playground-grid { grid-template-columns: 1fr; } }
    .btn {
      background: linear-gradient(135deg, #ffd752 0%, #f39c12 100%);
      color: #07120a;
      border: none;
      border-radius: 8px;
      padding: 10px 18px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      transition: transform 0.1s, opacity 0.2s;
    }
    .btn:hover { opacity: 0.95; }
    .btn:active { transform: scale(0.98); }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.18);
      color: var(--text);
    }
    .input-field {
      width: 100%;
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 10px 14px;
      color: #fff;
      font-size: 14px;
      margin-bottom: 12px;
      outline: none;
    }
    .input-field:focus { border-color: var(--primary); }
    .console-log {
      background: #040905;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 14px;
      height: 220px;
      overflow-y: auto;
      font-family: monospace;
      font-size: 12px;
      color: #a4d2b1;
      line-height: 1.5;
    }
    .log-line { margin-bottom: 4px; word-break: break-all; }
    .log-time { color: var(--text-dim); }
    .meter-bar {
      height: 10px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 5px;
      overflow: hidden;
      margin-top: 10px;
    }
    .meter-fill {
      width: 0%;
      height: 100%;
      background: linear-gradient(90deg, #2ecc71, #ffd752);
      transition: width 0.05s linear;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="brand">
        <div class="brand-icon">🌴</div>
        <div>
          <div class="brand-title">HIDE & PLAY</div>
          <div class="brand-subtitle">Kerala Village Olichukali Online Relay Server</div>
        </div>
      </div>
      <div class="badge-live">
        <span class="pulse-dot"></span>
        <span>RELAY ACTIVE &bull; PORT ${PORT}</span>
      </div>
    </header>

    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-label">Server Status</div>
        <div class="metric-val" style="color: var(--accent);">HEALTHY</div>
        <div class="metric-sub">ws://0.0.0.0:${PORT}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Active Rooms</div>
        <div class="metric-val" id="metric-rooms">0</div>
        <div class="metric-sub">Max 6 Players / Room</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Connected Players</div>
        <div class="metric-val" id="metric-players">0</div>
        <div class="metric-sub">Auto 30s Bot Fill</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Voice Signaling</div>
        <div class="metric-val" style="color: var(--primary);">P2P MESH</div>
        <div class="metric-sub">100% Free Google STUN</div>
      </div>
    </div>

    <div class="section-title">
      <span>🏡 Active Public Rooms</span>
      <button class="btn btn-secondary" style="padding: 6px 12px;" onclick="fetchRooms()">🔄 Refresh</button>
    </div>
    <div class="card">
      <table class="rooms-table">
        <thead>
          <tr>
            <th>Room Code</th>
            <th>Host</th>
            <th>Map</th>
            <th>Players</th>
            <th>Timer</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody id="rooms-tbody">
          <tr><td colspan="6" class="empty-state">No public rooms active right now. Launch Godot to create one!</td></tr>
        </tbody>
      </table>
    </div>

    <div class="section-title">
      <span>🧪 In-Browser Socket & Voice Playground</span>
    </div>
    <div class="card">
      <div class="playground-grid">
        <div>
          <label style="font-size: 12px; color: var(--text-dim); display: block; margin-bottom: 6px;">Simulated Player Name</label>
          <input type="text" id="player-name" class="input-field" value="WebTester" />
          
          <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px;">
            <button class="btn" onclick="testQuickMatch()">⚡ Quick Match</button>
            <button class="btn btn-secondary" onclick="testCreateRoom()">🏡 Create Room</button>
            <button class="btn btn-secondary" onclick="disconnectSocket()">❌ Leave</button>
          </div>

          <div style="margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--card-border);">
            <label style="font-size: 12px; color: var(--text-dim); display: block; margin-bottom: 6px;">🎙️ Microphone & WebRTC Echo Test</label>
            <button class="btn btn-secondary" id="mic-test-btn" onclick="toggleMicTest()">🎤 Start Mic Test</button>
            <div class="meter-bar"><div class="meter-fill" id="mic-fill"></div></div>
          </div>
        </div>
        <div>
          <label style="font-size: 12px; color: var(--text-dim); display: block; margin-bottom: 6px;">Live WebSocket Event Log</label>
          <div class="console-log" id="console-log">
            <div class="log-line"><span class="log-time">[System]</span> Ready. Click Quick Match or Create Room to test.</div>
          </div>
        </div>
      </div>
    </div>

    <div style="text-align: center; color: var(--text-dim); font-size: 13px; margin-top: 20px;">
      Hide & Play Relay Server &bull; <a href="/health" style="color: var(--primary);">/health</a> &bull; <a href="/rooms" style="color: var(--primary);">/rooms</a>
    </div>
  </div>

  <script>
    let ws = null;
    let micStream = null;
    let audioCtx = null;
    let analyser = null;
    let micAnimId = null;

    function log(text) {
      const el = document.getElementById('console-log');
      const time = new Date().toLocaleTimeString();
      const line = document.createElement('div');
      line.className = 'log-line';
      line.innerHTML = '<span class="log-time">[' + time + ']</span> ' + text;
      el.appendChild(line);
      el.scrollTop = el.scrollHeight;
    }

    async function fetchStats() {
      try {
        const res = await fetch('/health');
        const data = await res.json();
        document.getElementById('metric-rooms').innerText = data.active_rooms || 0;
        document.getElementById('metric-players').innerText = data.active_players || 0;
      } catch (e) {}
    }

    async function fetchRooms() {
      try {
        const res = await fetch('/rooms');
        const data = await res.json();
        const tbody = document.getElementById('rooms-tbody');
        if (!data.rooms || data.rooms.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No public rooms active right now. Launch Godot to create one!</td></tr>';
          return;
        }
        tbody.innerHTML = data.rooms.map(r => \`
          <tr>
            <td><span class="code-pill">\${r.code}</span></td>
            <td><strong>\${r.host_name}</strong></td>
            <td>\${r.map === 'school_campus' ? '🏫 School' : '🌴 Village'}</td>
            <td><strong>\${r.players_count} / \${r.max_players}</strong></td>
            <td>\${r.counting_time}s / \${r.hunt_time}s</td>
            <td><button class="btn btn-secondary" style="padding: 4px 10px; font-size: 12px;" onclick="joinRoom('\${r.code}')">Join</button></td>
          </tr>
        \`).join('');
      } catch (e) {}
    }

    function connectWs(onOpen) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        onOpen();
        return;
      }
      const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = proto + '//' + location.host;
      log('Connecting to ' + wsUrl + '...');
      ws = new WebSocket(wsUrl);
      ws.onopen = () => {
        log('🟢 WebSocket Connected!');
        onOpen();
      };
      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          log('📥 Received: ' + msg.type + ' ' + JSON.stringify(msg));
          fetchStats();
          fetchRooms();
        } catch (e) {
          log('📥 Binary packet received (' + evt.data.size + ' bytes)');
        }
      };
      ws.onclose = () => {
        log('🔴 WebSocket Disconnected.');
        fetchStats();
        fetchRooms();
      };
    }

    function testQuickMatch() {
      const name = document.getElementById('player-name').value || 'WebTester';
      connectWs(() => {
        log('⚡ Sending QUICK_MATCH action...');
        ws.send(JSON.stringify({
          type: 'QUICK_MATCH',
          player_name: name,
          avatar: 'boy_default'
        }));
      });
    }

    function testCreateRoom() {
      const name = document.getElementById('player-name').value || 'WebTester';
      connectWs(() => {
        log('🏡 Sending CREATE_ROOM action...');
        ws.send(JSON.stringify({
          type: 'CREATE_ROOM',
          player_name: name,
          avatar: 'boy_default',
          is_public: true
        }));
      });
    }

    function joinRoom(code) {
      const name = document.getElementById('player-name').value || 'WebTester';
      connectWs(() => {
        log('🔑 Joining room ' + code + '...');
        ws.send(JSON.stringify({
          type: 'JOIN_ROOM',
          code: code,
          player_name: name
        }));
      });
    }

    function disconnectSocket() {
      if (ws) {
        ws.close();
        ws = null;
      }
    }

    async function toggleMicTest() {
      const btn = document.getElementById('mic-test-btn');
      const fill = document.getElementById('mic-fill');
      if (micStream) {
        micStream.getTracks().forEach(t => t.stop());
        micStream = null;
        if (micAnimId) cancelAnimationFrame(micAnimId);
        fill.style.width = '0%';
        btn.innerText = '🎤 Start Mic Test';
        btn.className = 'btn btn-secondary';
        log('Microphone stopped.');
        return;
      }

      try {
        micStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        });
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const src = audioCtx.createMediaStreamSource(micStream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        src.connect(analyser);

        btn.innerText = '🛑 Stop Mic Test';
        btn.className = 'btn';
        log('🎙️ Mic active! Hardware Echo Cancellation (AEC) engaged.');

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        function checkAudio() {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
          const avg = sum / dataArray.length;
          const pct = Math.min(100, Math.round((avg / 128) * 100));
          fill.style.width = pct + '%';
          micAnimId = requestAnimationFrame(checkAudio);
        }
        checkAudio();
      } catch (err) {
        log('⚠️ Mic access error: ' + err.message);
      }
    }

    setInterval(() => {
      fetchStats();
      fetchRooms();
    }, 2500);
    fetchStats();
    fetchRooms();
  </script>
</body>
</html>`;
}

// ----------------------------------------------------------------------------
// Start Server
// ----------------------------------------------------------------------------
server.listen(PORT, '0.0.0.0', () => {
  console.log('================================================================');
  console.log(`🚀 Hide & Play Online Relay Server running on port ${PORT}`);
  console.log(`📡 WebSocket: ws://0.0.0.0:${PORT}`);
  console.log(`🩺 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`🌐 Public rooms: http://0.0.0.0:${PORT}/rooms`);
  console.log('================================================================');
});

