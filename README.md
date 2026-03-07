# cnr-ws-client-protobuf

> **Repo**: [`jerroldneal/cnr-ws-client-protobuf`](https://github.com/jerroldneal/cnr-ws-client-protobuf) · **Submodule of**: [`chrome-native-relay`](https://github.com/jerroldneal/chrome-native-relay) at `cnr-ws-client-protobuf/`

Protobuf WebSocket tap, poker decision engine, Chrome extension popup, and React dashboard for ClubWPT Gold hold'em tables.

## Overview

This module provides the core components for intercepting, decoding, and acting on protobuf-encoded WebSocket traffic from ClubWPT Gold poker games. It is designed to be injected into the game page via the [`cnr-ws-extension`](https://github.com/jerroldneal/cnr-ws-extension) Chrome extension.

## Quick Start — Spectator Webapp

The fastest way to see the library in action. A self-contained Node.js server that connects to a game table, decodes all protobuf messages, and streams live state to a browser dashboard.

```bash
# Install dependencies
npm install

# Run the spectator server
node examples/spectator-webapp/server.js \
  --url wss://game-server.example.com/ws \
  --userId 12345 \
  --token your-auth-token

# Open http://localhost:3900
```

The dashboard shows real-time player information: names, chip stacks, bets, hole cards (when visible), board cards, pot, blinds, dealer position, and whose turn it is. See [`examples/spectator-webapp/README.md`](examples/spectator-webapp/README.md) for details.

## Structure

```
cnr-ws-client-protobuf/
├── lib/
│   ├── proto/             # Atomic protobuf encode/decode modules
│   │   ├── _schema.js     # protobufjs type registry
│   │   ├── enums.js       # All frozen enums (Action, PlayerState, MessageId, etc.)
│   │   ├── wrapper.js     # Wire framing: encode/decode/parseStream
│   │   ├── auth.js        # UserToken request/response
│   │   ├── room.js        # EnterRoom, RoomSnapshot, SitDown, LeaveRoom
│   │   ├── game-flow.js   # DealerPos, HoleCards, BoardCards, NeedAction, Action, etc.
│   │   ├── seats.js       # SeatOccupied, SeatEmpty, PlayerLeave
│   │   ├── social.js      # Emoji, Anim, Voice, Celebrity
│   │   ├── tournament.js  # MTT enter, rejoin, snapshot, notifications
│   │   ├── time-bank.js   # TimeBank, BuyTime
│   │   ├── rewards.js     # Reward, EnterReward
│   │   ├── system.js      # Ping, Pong, RealIp
│   │   └── index.js       # Re-exports + decoderRegistry
│   └── use-cases/         # High-level poker modules
│       ├── spectator.js       # Passive game observation (17 events)
│       ├── hand-tracker.js    # Hand lifecycle state machine
│       ├── player-tracker.js  # Player join/leave registry
│       ├── action-engine.js   # Decision execution with validation
│       ├── tournament-manager.js  # MTT lifecycle
│       ├── pot-calculator.js  # Pot progression tracking
│       ├── position-tracker.js    # Dealer/SB/BB positions
│       ├── hand-history.js    # Hand history recording + toText()
│       ├── connection-manager.js  # WebSocket + auth + keep-alive
│       ├── table-state.js     # God view aggregate + getSnapshot()
│       └── index.js           # Re-exports all use cases
├── examples/
│   └── spectator-webapp/  # Quick start example (see above)
├── inject/
│   ├── proto-tap.js       # WebSocket proxy + protobuf decoder (v2)
│   └── proto-bot.js       # Self-contained poker decision engine
├── bot/
│   ├── hand-evaluator.js  # 5/7-card hand evaluation, pre-flop strength, win equity
│   ├── game-state.js      # GameState class — tracks room, seats, cards, pots, phase
│   └── decision-engine.js # DecisionEngine — action selection based on equity + pot odds
├── popup/
│   ├── proto-popup.html   # Chrome extension popup UI (dark theme, 480×560)
│   └── proto-popup.js     # Popup logic — polls injected page APIs every 1s
├── dashboard/
│   └── index.html         # React 18 SPA — Feed, Table, Console, Stats tabs
└── package.json
```

## Library Usage

### Atomic Proto Modules

```js
const proto = require('./lib/proto');

// Decode any message by topic ID
const decoded = proto.decodeByTopic(topicId, bodyBuffer);
// → { topic: 301, name: 'RoomSnapshotMsg', fields: { roomId, players, ... } }

// Encode an action
const { topic, body } = proto.encodeActionReq({ action: proto.Action.RAISE, coin: 500 });

// Parse a binary stream into individual messages
const { messages, remaining } = proto.parseStream(buffer);
```

### Use-Case Modules

```js
const { ConnectionManager, TableState, PlayerTracker, Spectator } = require('./lib/use-cases');

// Connect and observe
const conn = new ConnectionManager({ url, userId, token });
const table = new TableState(userId);

conn.on('message', (msg) => table.onMessage(msg));

table.on('state-change', ({ key, value }) => {
  console.log(`${key} changed:`, value);
});

table.on('new-hand', () => {
  const snap = table.getSnapshot();
  console.log(`Hand #${snap.handNum} — ${snap.playerCount} players`);
});

conn.connect();
```

## Components

### `inject/proto-tap.js` (v2)

Injected at `document_start` in the MAIN world. Proxies the `WebSocket` constructor to intercept all outbound game connections, then decodes incoming binary frames using the page's own `protobuf.js` roots.

- **Event bus** — `window.__ProtoTap.on(topic, fn)` / `.off(topic, fn)` / `.on('*', fn)`
- **Ring buffer** — `window.__ProtoTap.lastEvents` (last 200 decoded events)
- **Socket registry** — tracks all intercepted WebSocket instances
- **Send action** — `window.__ProtoTap.sendAction(roomId, action, coin)` encodes and sends an `ActionReq` back through the game socket
- **Relay forwarding** — forwards decoded events to `ws://localhost:13030/ws` for the dashboard and server

### `inject/proto-bot.js`

Injected at `document_end` in the MAIN world. Fully self-contained IIFE — no external `require()` calls. Subscribes to `window.__ProtoTap` events, maintains game state, and produces action recommendations.

- **Inline hand evaluator** — 5/7-card evaluation, pre-flop strength tables, win equity with opponent discount
- **Inline game state** — room, phase, seats, hole cards, board cards, pots, action history
- **Decision engine** — pre-flop (raise premium / call +EV / fold weak) and post-flop (value bet / pot-odds call / fold)
- **Auto-act** — when `window.__ProtoBot.autoAct = true`, sends actions via proto-tap after a configurable delay (default 1500ms)
- **Card hook integration** — if `window.__cnr_onCard` is available, merges visual card data for higher accuracy

**Public API** — `window.__ProtoBot`:

| Property / Method | Description |
|---|---|
| `.enabled` | Toggle bot on/off (advisory mode) |
| `.autoAct` | Toggle automatic action sending |
| `.config` | `{ autoAct, decisionDelay, aggression }` |
| `.lastDecision` | Most recent action recommendation |
| `.decisionHistory` | Array of last 50 decisions |
| `.gameState` | JSON snapshot of current game state |
| `.setHeroCards(arr)` | Manually set hero cards `["As","Kh"]` |
| `.setBoardCards(arr)` | Manually set board cards |
| `.forceDecide()` | Force an immediate decision (no side effects) |
| `.stats()` | `{ version, enabled, autoAct, decisions, handsPlayed, handsWon, netProfit }` |

### `bot/` (Node.js modules)

Standalone modules for use outside the browser (testing, backtesting, server-side analysis):

- **`hand-evaluator.js`** — `evaluate5()`, `evaluate7()`, `preFlopStrength()`, `winProbability()`, `parseCard()`, `compareHands()`
- **`game-state.js`** — `GameState` class with `applyProtoEvent({ ns, topic, data })` and `toJSON()`
- **`decision-engine.js`** — `DecisionEngine({ aggression, vpip, pfr })` with `.decide(gameState, equityFn)`

### `popup/`

Chrome extension popup for quick status and control:

- Tap/Bot status badges
- Game state display (phase, hole cards, board, pot, seats)
- Bot toggle, Auto-Act toggle (with confirmation dialog)
- Decision display with equity and reasoning
- Recent events list
- Dashboard launch button → `http://localhost:13030/cnr-proto-dashboard/`

### `dashboard/`

React 18 SPA (UMD + Babel standalone, no build step). Connects to `ws://localhost:13030/ws`.

| Tab | Description |
|---|---|
| **Feed** | Filterable proto event stream with expandable JSON detail, pause/resume |
| **Table** | CSS oval felt table with 10 seat positions, board cards, pot, dealer chip, bot recommendation sidebar |
| **Console** | Decision history cards with color-coded actions |
| **Stats** | Event counts, hands played, win rate, net profit, topic frequency bar chart |

## Extension Integration

The [`cnr-ws-extension`](https://github.com/jerroldneal/cnr-ws-extension) manifest includes two content script entries for this module:

```json
{
  "matches": ["https://clubwptgold.com/*", "https://*.clubwpt.com/*"],
  "js": ["inject/cnr-proto-tap.js"],
  "run_at": "document_start",
  "world": "MAIN"
}
```

```json
{
  "matches": ["https://clubwptgold.com/*", "https://*.clubwpt.com/*"],
  "js": ["inject/cnr-proto-bot.js"],
  "run_at": "document_end",
  "world": "MAIN"
}
```

The corresponding files in the extension are `inject/cnr-proto-tap.js` and `inject/cnr-proto-bot.js` (copies of this module's inject scripts).

The popup files (`proto-popup.html`, `proto-popup.js`) are also copied into the extension root. They are listed in `web_accessible_resources` and can be opened as a dedicated popup window from the Poker tab's **Proto Bot Controls** button:

```js
chrome.windows.create({
  url: chrome.runtime.getURL('proto-popup.html'),
  type: 'popup',
  width: 500,
  height: 600
});
```

## Protobuf Namespaces

Decoded from `window.protobuf.roots['default']`:

- `holdem` — core hold'em game messages (NeedActionMsg, BoardCardsMsg, RoundResultMsg, etc.)
- `commonProto` — shared types (UserTokenReq, HeartBeatMsg)
- `mttPro` — multi-table tournament messages
- `pineapple` — pineapple variant messages

## License

ISC
