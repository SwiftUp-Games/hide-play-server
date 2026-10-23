import { WebSocket } from 'ws';
import http from 'http';

const SERVER_URL = 'ws://localhost:8080';
const HTTP_URL = 'http://localhost:8080';

async function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testHealth() {
  return new Promise((resolve, reject) => {
    http.get(`${HTTP_URL}/health`, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('✅ Health check response:', JSON.parse(data));
        resolve(true);
      });
    }).on('error', reject);
  });
}

async function runTests() {
  console.log('Testing server functionality...');
  await testHealth();

  // Test 1: Host creates custom room
  console.log('\n--- Test 1: Host creates custom room ---');
  const ws1 = new WebSocket(SERVER_URL);
  let roomCode = '';

  await new Promise<void>((resolve) => {
    ws1.on('open', () => {
      ws1.send(JSON.stringify({
        type: 'CREATE_ROOM',
        player_name: 'Appu_Host',
        avatar: 'boy_default',
        is_public: true,
        settings: { selected_map: 'school_campus', counting_time: 20 }
      }));
    });

    ws1.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'ROOM_CREATED') {
        roomCode = msg.code;
        console.log(`✅ Room Created with code: ${roomCode}, peerId: ${msg.peer_id}`);
        resolve();
      }
    });
  });

  // Test 2: Client joins room
  console.log('\n--- Test 2: Client joins room by code ---');
  const ws2 = new WebSocket(SERVER_URL);
  await new Promise<void>((resolve) => {
    ws2.on('open', () => {
      ws2.send(JSON.stringify({
        type: 'JOIN_ROOM',
        code: roomCode,
        player_name: 'Ammu_Client',
        avatar: 'girl_default'
      }));
    });

    ws2.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'ROOM_JOINED') {
        console.log(`✅ Client joined room ${msg.code}, peerId: ${msg.peer_id}`);
        resolve();
      }
    });
  });

  // Test 3: Gameplay message relay between ws1 and ws2
  console.log('\n--- Test 3: Game Relay ---');
  await new Promise<void>((resolve) => {
    ws2.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'GAME_RELAY' && msg.action === 'PING_POSITION') {
        console.log('✅ Client received position relay from Host:', msg);
        resolve();
      }
    });

    ws1.send(JSON.stringify({
      type: 'GAME_RELAY',
      action: 'PING_POSITION',
      pos: { x: 120, y: 340 }
    }));
  });

  ws1.close();
  ws2.close();
  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
