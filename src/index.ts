import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';

// ============================================================================
// HIDE & PLAY — HIGH PERFORMANCE MATCHMAKING, RELAY & WEBRTC SIGNALING SERVER
// ============================================================================

const PORT = parseInt(process.env.PORT || '8080', 10);
const MAX_PLAYERS_PER_ROOM = 6;
const MATCHMAKING_WAIT_SECONDS = 30;
const COUNTDOWN_SECONDS = 3;

interface Player {
  peerId: number;
  name: string;
  avatar: string;
  hat: string;
  dress: string;
  isHost: boolean;
  isReady: boolean;
  isMuted: boolean;
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
}

const rooms = new Map<string, Room>();
const clientToRoom = new Map<WebSocket, { roomCode: string; peerId: number }>();

// Unique 4-character room code generator (Kerala-themed prefixes)
const PREFIXES = ['KL', 'WY', 'AL', 'EK', 'TV', 'CL', 'MN', 'KT', 'PK', 'ID'];
function generateRoomCode(): string {
  let code = '';
  do {
    const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
    const num = Math.floor(1000 + Math.random() * 9000); // 4 digit number
    code = `${prefix}-${num}`;
  } while (rooms.has(code));
  return code;
}

// ----------------------------------------------------------------------------
// HTTP Server (Health Check & Room Discovery API)
// ----------------------------------------------------------------------------
const server = http.createServer((req, res) => {
  // Global CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  if (url.pathname === '/' && req.headers.accept && req.headers.accept.includes('text/html')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(getDashboardHtml());
    return;
  }

  if (url.pathname === '/health' || url.pathname === '/') {
    let totalPlayers = 0;
    for (const r of rooms.values()) {
      totalPlayers += r.players.size;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'hide-play-online-relay',
      uptime_seconds: Math.floor(process.uptime()),
      active_rooms: rooms.size,
      active_players: totalPlayers,
      timestamp: Date.now()
    }));
    return;
  }

  if (url.pathname === '/rooms') {
    const publicRooms = getPublicRoomsSummary();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ rooms: publicRooms }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

function getPublicRoomsSummary() {
  const list = [];
  for (const r of rooms.values()) {
    if (r.isPublic && r.status === 'lobby') {
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
  // Send immediate welcome ping
  safeSend(ws, { type: 'CONNECTED', version: '1.0.0', serverTime: Date.now() });

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

// ----------------------------------------------------------------------------
// Client Message Router
// ----------------------------------------------------------------------------
function handleClientMessage(ws: WebSocket, msg: any) {
  const mapping = clientToRoom.get(ws);
  const currentRoom = mapping ? rooms.get(mapping.roomCode) : undefined;
  const currentPeerId = mapping ? mapping.peerId : 0;

  switch (msg.type) {
    case 'PING':
      safeSend(ws, { type: 'PONG', time: Date.now() });
      break;

    case 'LIST_ROOMS':
      safeSend(ws, { type: 'ROOM_LIST', rooms: getPublicRoomsSummary() });
      break;

    // 1. QUICK MATCH (Random matchmaking into open public room)
    case 'QUICK_MATCH': {
      leaveCurrentRoom(ws);

      // Search for open public room with space
      let targetRoom: Room | undefined;
      for (const r of rooms.values()) {
        if (r.isPublic && r.status === 'lobby' && r.players.size < r.maxPlayers) {
          targetRoom = r;
          break;
        }
      }

      if (targetRoom) {
        // Join existing room
        joinRoomInternal(ws, targetRoom, msg.player_name || 'Player', msg.avatar, msg.hat, msg.dress);
      } else {
        // Create new public room and start 30s bot timer
        const newRoom = createRoomInternal(ws, {
          isPublic: true,
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

    // 2. CREATE ROOM (Custom room creation)
    case 'CREATE_ROOM': {
      leaveCurrentRoom(ws);
      const isPublic = msg.is_public !== false; // default true
      const newRoom = createRoomInternal(ws, {
        isPublic,
        player_name: msg.player_name || 'Host',
        avatar: msg.avatar,
        hat: msg.hat,
        dress: msg.dress,
        settings: msg.settings
      });
      break;
    }

    // 3. JOIN ROOM (By 4-letter Code)
    case 'JOIN_ROOM': {
      leaveCurrentRoom(ws);
      let code = (msg.code || '').trim().toUpperCase();
      let targetRoom = rooms.get(code);

      // Support flexible matching: e.g. "7491" matches "KL-7491", "KL7491" matches "KL-7491"
      if (!targetRoom) {
        const cleanInput = code.replace(/[^A-Z0-9]/g, '');
        for (const [rCode, r] of rooms) {
          const cleanRoomCode = rCode.replace(/[^A-Z0-9]/g, '');
          if (rCode.endsWith(`-${code}`) || cleanRoomCode === cleanInput || rCode.toLowerCase() === code.toLowerCase()) {
            targetRoom = r;
            code = rCode;
            break;
          }
        }
      }

      if (!targetRoom) {
        safeSend(ws, { type: 'ERROR', code: 'ROOM_NOT_FOUND', message: `Room ${code} was not found.` });
        return;
      }
      if (targetRoom.status !== 'lobby') {
        safeSend(ws, { type: 'ERROR', code: 'GAME_IN_PROGRESS', message: `Room ${code} is already in game.` });
        return;
      }
      if (targetRoom.players.size >= targetRoom.maxPlayers) {
        safeSend(ws, { type: 'ERROR', code: 'ROOM_FULL', message: `Room ${code} is full (max 6 players).` });
        return;
      }

      joinRoomInternal(ws, targetRoom, msg.player_name || 'Player', msg.avatar, msg.hat, msg.dress);
      break;
    }

    // 4. LEAVE ROOM
    case 'LEAVE_ROOM': {
      leaveCurrentRoom(ws);
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
// Binary High-Speed Relay
// ----------------------------------------------------------------------------
function handleBinaryRelay(ws: WebSocket, buffer: Buffer) {
  const mapping = clientToRoom.get(ws);
  if (!mapping) return;
  const room = rooms.get(mapping.roomCode);
  if (!room) return;

  // Broadcast binary packet to all other peers in room
  for (const [, p] of room.players) {
    if (p.ws !== ws && p.ws.readyState === WebSocket.OPEN) {
      try {
        p.ws.send(buffer);
      } catch (err) {
        // ignore send error on closing socket
      }
    }
  }
}

// ----------------------------------------------------------------------------
// Room Creation & Joining Logic
// ----------------------------------------------------------------------------
function createRoomInternal(
  ws: WebSocket,
  opts: {
    isPublic: boolean;
    player_name: string;
    avatar?: string;
    hat?: string;
    dress?: string;
    settings?: Partial<RoomSettings>;
  }
): Room {
  const code = generateRoomCode();
  const hostPeerId = 1;

  const defaultSettings: RoomSettings = {
    counting_time: 15,
    hunt_time: 120,
    bot_count: 0,
    selected_map: 'kerala_village',
    ...(opts.settings || {})
  };

  const hostPlayer: Player = {
    peerId: hostPeerId,
    name: opts.player_name || 'Host',
    avatar: opts.avatar || 'boy_default',
    hat: opts.hat || 'hat_none',
    dress: opts.dress || 'dress_default',
    isHost: true,
    isReady: true,
    isMuted: false,
    ws,
    joinedAt: Date.now()
  };

  const room: Room = {
    code,
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
  dress?: string
) {
  const peerId = room.nextPeerId++;
  const player: Player = {
    peerId,
    name: name || `Player_${peerId}`,
    avatar: avatar || 'boy_default',
    hat: hat || 'hat_none',
    dress: dress || 'dress_default',
    isHost: false,
    isReady: false,
    isMuted: false,
    ws,
    joinedAt: Date.now()
  };

  room.players.set(peerId, player);
  clientToRoom.set(ws, { roomCode: room.code, peerId });

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
// Matchmaking 30-Second Bot Fallback Timer
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

      // 30 Seconds Elapsed: Auto-fill remaining slots with bots!
      const missingBots = Math.max(0, room.maxPlayers - room.players.size);
      console.log(`[Matchmaking Timeout] Room ${room.code} reached 30s with ${room.players.size} players. Auto-filling ${missingBots} bots.`);

      room.status = 'countdown';
      broadcastToRoom(room, {
        type: 'MATCHMAKING_AUTO_FILL',
        bots_needed: missingBots,
        total_players: room.maxPlayers
      });

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

      broadcastToRoom(room, {
        type: 'LAUNCH_GAME'
      });
      console.log(`[Game Launched] Room ${room.code} is now in_game!`);
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
}

// ----------------------------------------------------------------------------
// Lobby State & Disconnect Handling
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
    is_muted: p.isMuted
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

function leaveCurrentRoom(ws: WebSocket) {
  const mapping = clientToRoom.get(ws);
  if (!mapping) return;

  const { roomCode, peerId } = mapping;
  clientToRoom.delete(ws);
  const room = rooms.get(roomCode);
  if (!room) return;

  const player = room.players.get(peerId);
  room.players.delete(peerId);
  console.log(`[Player Left] ${player ? player.name : `Peer ${peerId}`} left room ${roomCode}`);

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
}

function handleDisconnect(ws: WebSocket) {
  leaveCurrentRoom(ws);
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

