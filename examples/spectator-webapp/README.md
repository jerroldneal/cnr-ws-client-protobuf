# Spectator Webapp

A minimal Node.js server that connects to a ClubWPT Gold poker table via WebSocket, decodes all protobuf messages using the `lib/` modules, and streams live table state to a browser dashboard via Server-Sent Events (SSE).

## Architecture

```
┌──────────────────┐      protobuf/ws       ┌──────────────┐
│  ClubWPT Gold    │ ◄──────────────────────►│  server.js   │
│  Game Server     │                         │              │
└──────────────────┘                         │ ConnectionMgr│
                                             │ TableState   │
                                             │ PlayerTracker│
                                             └──────┬───────┘
                                                    │ SSE
                                             ┌──────▼───────┐
                                             │  index.html  │
                                             │  (browser)   │
                                             └──────────────┘
```

## Quick Start

```bash
# From the cnr-ws-client-protobuf root
npm install

# Run the spectator server
node examples/spectator-webapp/server.js \
  --url wss://game-server.example.com/ws \
  --userId 12345 \
  --token your-auth-token

# Open browser
# http://localhost:3900
```

### Environment Variables (alternative to CLI args)

| Variable | Description |
|----------|-------------|
| `GAME_WS_URL` | WebSocket URL of the game server |
| `GAME_USER_ID` | Your user ID |
| `GAME_TOKEN` | Authentication token |
| `PORT` | HTTP port (default: 3900) |

## What It Shows

- **Connection status** — green/yellow/red dot
- **Hand number** and current **street** (preflop, flop, turn, river)
- **Board cards** — community cards with suit colors
- **Player table** — seat, name, chip stack, current bet, hole cards (when visible), last action, dealer badge
- **Active turn** — highlighted row for the player whose turn it is
- **Pot total** and **blinds**

## How It Works

1. `server.js` creates a `ConnectionManager` from `lib/use-cases/` which handles WebSocket connection, authentication, ping/pong keep-alive, and automatic reconnection
2. Every decoded message is fed into `TableState` (aggregate state) and `PlayerTracker` (player registry)
3. On each message, the full table snapshot is broadcast to all connected browsers via SSE (`/events` endpoint)
4. `index.html` renders the snapshot with a dark-themed poker dashboard — no build step, no framework, just vanilla JS

## Modules Used

| Module | Role |
|--------|------|
| `ConnectionManager` | WebSocket lifecycle, auth, reconnect |
| `TableState` | Unified state aggregate (god view) |
| `PlayerTracker` | Player join/leave tracking |
| `lib/proto/*` | Protobuf encode/decode for all message types |
