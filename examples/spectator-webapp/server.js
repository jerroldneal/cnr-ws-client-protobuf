'use strict';

/**
 * Spectator Webapp — simple Express server that connects to a ClubWPT Gold
 * poker table via WebSocket, decodes protobuf messages using the lib,
 * and pushes live player/table state to a browser dashboard via SSE.
 *
 * Usage:
 *   node server.js --url wss://game.example.com/ws --userId 12345 --token abc123
 *
 * Then open http://localhost:3900 in a browser.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { ConnectionManager, TableState, PlayerTracker } = require('../../lib/use-cases');

// --- CLI args ---
const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}

const WS_URL   = getArg('url')    || process.env.GAME_WS_URL    || '';
const USER_ID  = getArg('userId') || process.env.GAME_USER_ID   || '0';
const TOKEN    = getArg('token')  || process.env.GAME_TOKEN      || '';
const PORT     = parseInt(getArg('port') || process.env.PORT || '3900', 10);

if (!WS_URL) {
  console.error('Usage: node server.js --url <ws-url> --userId <id> --token <token> [--port 3900]');
  process.exit(1);
}

// --- State layer ---
const tableState   = new TableState(parseInt(USER_ID, 10));
const playerTracker = new PlayerTracker();

// --- Connection ---
const conn = new ConnectionManager({
  url: WS_URL,
  userId: parseInt(USER_ID, 10),
  token: TOKEN,
  reconnect: true,
});

conn.on('connected',     () => broadcast({ event: 'status', data: 'connected' }));
conn.on('authenticated', () => broadcast({ event: 'status', data: 'authenticated' }));
conn.on('disconnected',  () => broadcast({ event: 'status', data: 'disconnected' }));
conn.on('error',         (e) => console.error('[conn] error:', e.message));

conn.on('message', (msg) => {
  tableState.onMessage(msg);
  playerTracker.onMessage(msg);
  broadcast({ event: 'state', data: tableState.getSnapshot() });
});

// --- SSE clients ---
const sseClients = new Set();

function broadcast(payload) {
  const data = JSON.stringify(payload);
  for (const res of sseClients) {
    res.write(`data: ${data}\n\n`);
  }
}

// --- HTTP server ---
const server = http.createServer((req, res) => {
  if (req.url === '/events') {
    // SSE endpoint
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    res.write('\n');
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));

    // Send current snapshot immediately
    const snap = tableState.getSnapshot();
    res.write(`data: ${JSON.stringify({ event: 'state', data: snap })}\n\n`);
    return;
  }

  if (req.url === '/' || req.url === '/index.html') {
    const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`[spectator] Dashboard at http://localhost:${PORT}`);
  console.log(`[spectator] Connecting to ${WS_URL} ...`);
  conn.connect();
});
