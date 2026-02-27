'use strict';

/**
 * proto-popup.js — Extension popup controller for CNR Proto Bot
 *
 * Connects to cnr-ws-server relay via WebSocket and renders
 * game_status broadcasts in real time. No chrome.scripting needed.
 */

const RELAY_URL     = 'ws://localhost:13030/ws';
const DASHBOARD_URL = 'http://localhost:13030/proto-dashboard';
const RECONNECT_MS  = 3000;

// ── DOM refs ─────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const els = {
  tapStatus:      $('tap-status'),
  botStatus:      $('bot-status'),
  phaseBadge:     $('phase-badge'),
  btnDashboard:   $('btn-dashboard'),
  btnToggle:      $('btn-toggle'),
  btnAuto:        $('btn-auto'),
  gsRoom:         $('gs-room'),
  gsPhase:        $('gs-phase'),
  gsPot:          $('gs-pot'),
  gsStack:        $('gs-stack'),
  gsSeat:         $('gs-seat'),
  gsHole:         $('gs-hole'),
  gsBoard:        $('gs-board'),
  statHands:      $('stat-hands'),
  statWon:        $('stat-won'),
  statNet:        $('stat-net'),
  statDecisions:  $('stat-decisions'),
  decisionAction: $('decision-action'),
  decisionReason: $('decision-reason'),
  decisionEquity: $('decision-equity'),
  eventsList:     $('events-list'),
  footerDecoded:  $('footer-decoded'),
  footerRelay:    $('footer-relay'),
  footerTs:       $('footer-ts'),
};

// ── State ─────────────────────────────────────────────────────────────────────
let ws = null;
let msgCount = 0;
let botEnabled = false;
let autoAct = false;
let decisionCount = 0;
let lastDecisionHand = null; // prevent duplicate decisions per hand state
const recentEvents = [];
const MAX_EVENTS = 10;

// ── Iceberg Bot Strategy ──────────────────────────────────────────────────────
// Simple premium-pair push/fold strategy:
//   JJ, QQ, KK, AA → ALL-IN
//   Everything else → FOLD

const RANK_ORDER = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'T':10,'J':11,'Q':12,'K':13,'A':14 };
const UNICODE_SUIT = { '♠':'s','♥':'h','♦':'d','♣':'c' };
const PUSH_THRESHOLD = 11; // J=11, so JJ+ means both cards ≥ J and paired

function parseCardStr(str) {
  if (!str || typeof str !== 'string' || str === 'back') return null;
  const last = str.slice(-1);
  const suit = UNICODE_SUIT[last] || last.toLowerCase();
  const rank = str.slice(0, -1).toUpperCase();
  return { rank, suit, value: RANK_ORDER[rank] || 0 };
}

function extractHoleCards(player) {
  if (!player || !Array.isArray(player.cards) || player.cards.length < 2) return null;
  const cards = player.cards
    .map(c => {
      const str = typeof c === 'string' ? c : c?.card;
      if (!str || str === 'back') return null;
      const revealed = typeof c === 'object' ? c.revealed : true;
      if (!revealed) return null;
      return parseCardStr(str);
    })
    .filter(Boolean);
  if (cards.length < 2) return null;
  return cards;
}

function icebergDecision(holeCards, gs, hero) {
  if (!holeCards || holeCards.length < 2) return null;
  const [c1, c2] = holeCards;
  const isPair = c1.rank === c2.rank;
  const pairVal = isPair ? c1.value : 0;
  const handLabel = `${c1.rank}${c1.suit} ${c2.rank}${c2.suit}`;

  // Premium pairs: JJ, QQ, KK, AA → ALL-IN (unless monster in hand)
  if (isPair && pairVal >= PUSH_THRESHOLD) {
    const pairName = { 11:'Jacks', 12:'Queens', 13:'Kings', 14:'Aces' }[pairVal] || 'Premium';

    // Monster check: any active opponent with more chips → fold
    const heroStack = parseFloat(hero?.stack) || 0;
    const monster = (gs.players || []).find(p =>
      p.seat !== hero?.seat &&
      p.cards && p.cards.length > 0 &&
      p.lastAction !== 'FOLD' &&
      (parseFloat(p.stack) || 0) > heroStack
    );
    if (monster) {
      return {
        action: 'FOLD',
        reason: `${pairName} but ${monster.name} has bigger stack (${monster.stack} vs ${hero.stack}) — fold`,
        hand: handLabel,
        strength: pairVal
      };
    }

    return {
      action: 'ALL_IN',
      reason: `Pocket ${pairName} — push`,
      hand: handLabel,
      strength: pairVal
    };
  }

  // Everything else → FOLD
  let reason = 'Below JJ threshold — fold';
  if (isPair) reason = `Pocket ${c1.rank}${c1.rank} — below JJ, fold`;
  else if (c1.value >= 10 && c2.value >= 10) reason = `${c1.rank}${c2.rank} — not a pair, fold`;
  else reason = `${c1.rank}${c2.rank} — below premium, fold`;

  return { action: 'FOLD', reason, hand: handLabel, strength: pairVal };
}

function findHero(players) {
  // Hero = the player with at least one revealed card
  if (!players) return null;
  return players.find(p =>
    Array.isArray(p.cards) &&
    p.cards.length >= 2 &&
    p.cards.some(c => (typeof c === 'object' && c.revealed && c.card !== 'back'))
  ) || null;
}

// ── Button actions ────────────────────────────────────────────────────────────
els.btnDashboard.addEventListener('click', () => {
  window.open(DASHBOARD_URL, '_blank');
});

els.btnToggle.addEventListener('click', () => {
  botEnabled = !botEnabled;
  els.btnToggle.textContent = botEnabled ? 'Bot: ON' : 'Bot: OFF';
  els.btnToggle.className = botEnabled ? '' : 'off';
  els.botStatus.textContent = botEnabled ? 'Bot: ON' : 'Bot: OFF';
  els.botStatus.className = botEnabled ? 'badge badge-green' : 'badge badge-grey';
  sendCommand('bot_toggle', { enabled: botEnabled });
});

els.btnAuto.addEventListener('click', () => {
  autoAct = !autoAct;
  els.btnAuto.textContent = autoAct ? 'Auto-Act: ON' : 'Auto-Act: OFF';
  els.btnAuto.className = autoAct ? 'on' : '';
  sendCommand('auto_act_toggle', { enabled: autoAct });
});

function sendCommand(action, payload) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({
    type: 'activity',
    data: { eventType: 'bot_command', action, ...payload, timestamp: Date.now() }
  }));
}

// ── WebSocket connection to relay ─────────────────────────────────────────────
function connect() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

  els.footerRelay.textContent = 'relay: connecting…';
  ws = new WebSocket(RELAY_URL);

  ws.onopen = () => {
    els.footerRelay.textContent = 'relay: connected';
    els.tapStatus.textContent = 'Relay: OK';
    els.tapStatus.className = 'badge badge-green';

    // Register as a popup viewer
    ws.send(JSON.stringify({
      type: 'register',
      data: { role: 'proto-popup', source: 'extension' }
    }));
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      handleRelayMessage(msg);
    } catch (e) {
      console.warn('proto-popup: bad message', e);
    }
  };

  ws.onclose = () => {
    els.footerRelay.textContent = 'relay: disconnected';
    els.tapStatus.textContent = 'Relay: OFF';
    els.tapStatus.className = 'badge badge-red';
    setTimeout(connect, RECONNECT_MS);
  };

  ws.onerror = () => {
    // onclose will fire after this
  };
}

// ── Message handler ───────────────────────────────────────────────────────────
function handleRelayMessage(msg) {
  switch (msg.type) {
    case 'welcome':
    case 'registered':
      break;

    case 'game_status':
      msgCount++;
      renderGameStatus(msg.data);
      addEvent(msg.data.timestamp, 'game', msg.data.street || 'status');
      break;

    case 'card_event':
      msgCount++;
      addEvent(msg.data?.timestamp || msg.timestamp, 'card', msg.data?.eventType || 'card');
      break;

    default:
      // Other broadcast types
      if (msg.type !== 'ack' && msg.type !== 'pong') {
        addEvent(msg.timestamp, msg.type, '');
      }
      break;
  }
}

// ── Render game_status from relay ─────────────────────────────────────────────
function renderGameStatus(gs) {
  if (!gs) return;

  const phase = gs.street || 'idle';

  // Phase badge
  els.gsPhase.textContent = phase;
  els.phaseBadge.textContent = phase;
  els.phaseBadge.className = `badge badge-${phaseColor(phase)}`;

  // Pot
  els.gsPot.textContent = gs.pot || '—';

  // Active turn
  if (gs.activeTurn) {
    els.gsSeat.textContent = `#${gs.activeTurn.seat} ${gs.activeTurn.name}`;
  }

  // Dealer / positions
  if (gs.dealer) {
    els.gsRoom.textContent = `D:${gs.dealer.seat} SB:${gs.sb?.seat || '?'} BB:${gs.bb?.seat || '?'}`;
  }

  // Board cards
  const boardCards = (gs.communityCards || [])
    .map(c => c.card)
    .filter(Boolean);
  els.gsBoard.innerHTML = renderCards(boardCards);

  // Find hero (player with revealed cards)
  const hero = findHero(gs.players);
  if (hero) {
    els.gsStack.textContent = hero.stack || '—';
    const holeCards = (hero.cards || [])
      .map(c => typeof c === 'string' ? c : c?.card)
      .filter(c => c && c !== 'back');
    els.gsHole.innerHTML = renderCards(holeCards);
  } else {
    // Fallback: show active turn player info
    const activeSeat = gs.activeTurn?.seat;
    if (activeSeat && gs.players) {
      const active = gs.players.find(p => p.seat === activeSeat);
      if (active) {
        els.gsStack.textContent = active.stack || '—';
        els.gsHole.innerHTML = '<span class="empty">—</span>';
      }
    }
  }

  // Player count
  els.statHands.textContent = gs.occupiedCount || 0;

  // Count active (non-fold) players
  if (gs.players) {
    const inHand = gs.players.filter(p => p.cards && p.cards.length > 0 && p.lastAction !== 'FOLD').length;
    els.statWon.textContent = inHand;
  }

  // Decisions count
  els.statDecisions.textContent = decisionCount;

  // Footer
  els.footerDecoded.textContent = `msgs: ${msgCount}`;
  els.footerTs.textContent = gs.timestamp
    ? new Date(gs.timestamp).toTimeString().slice(0, 8)
    : '—';

  // ── Bot evaluation ────────────────────────────────────────────────────────
  if (botEnabled && hero) {
    const holeCards = extractHoleCards(hero);
    const decision = icebergDecision(holeCards, gs, hero);
    const handKey = holeCards ? `${hero.seat}-${holeCards.map(c=>c.rank+c.suit).join(',')}` : null;

    if (decision) {
      // Show decision
      els.decisionAction.textContent = `${decision.action}`;
      els.decisionAction.className = `decision-action ${decision.action}`;
      els.decisionReason.textContent = decision.reason;
      els.decisionEquity.textContent = `Hand: ${decision.hand}`;

      // If it's hero's turn and we haven't decided this hand yet
      if (hero.isActiveTurn && handKey !== lastDecisionHand) {
        lastDecisionHand = handKey;
        decisionCount++;
        els.statDecisions.textContent = decisionCount;

        // Send decision as bot_decision event
        sendCommand('bot_decision', {
          seat: hero.seat,
          action: decision.action,
          reason: decision.reason,
          hand: decision.hand,
          street: gs.street,
          pot: gs.pot,
          autoAct
        });

        addEvent(Date.now(), 'bot', `${decision.action} — ${decision.hand}`);

        // Auto-act: send click command to background.js
        if (autoAct && chrome?.runtime?.sendMessage) {
          chrome.runtime.sendMessage({
            type: 'bot_action',
            action: decision.action,
            reason: decision.reason
          }, (resp) => {
            if (resp?.success) {
              addEvent(Date.now(), 'act', `Clicked ${decision.action}`);
            } else {
              addEvent(Date.now(), 'err', resp?.error || 'click failed');
            }
          });
        }
      }
    } else {
      els.decisionAction.textContent = 'No cards visible';
      els.decisionAction.className = 'decision-action';
      els.decisionReason.textContent = 'Waiting for revealed hole cards…';
      els.decisionEquity.textContent = '';
    }

    els.botStatus.textContent = hero.isActiveTurn ? 'Hero Turn!' : 'Bot: ON';
    els.botStatus.className = hero.isActiveTurn ? 'badge badge-green' : 'badge badge-green';
  } else if (botEnabled) {
    els.botStatus.textContent = 'Bot: ON';
    els.botStatus.className = 'badge badge-green';
  } else {
    // Show last action of active-turn player when bot is off
    if (gs.activeTurn?.seat && gs.players) {
      const turnPlayer = gs.players.find(p => p.isActiveTurn);
      if (turnPlayer) {
        els.decisionAction.textContent = `${turnPlayer.name} — ${turnPlayer.lastAction || 'thinking…'}`;
        els.decisionAction.className = `decision-action ${turnPlayer.lastAction || ''}`;
        els.decisionReason.textContent = turnPlayer.bet ? `bet: ${turnPlayer.bet}` : '';
        els.decisionEquity.textContent = turnPlayer.stack ? `stack: ${turnPlayer.stack}` : '';
      }
    }
    els.botStatus.textContent = 'Watching';
    els.botStatus.className = 'badge badge-yellow';
  }

  // Reset hand tracker when phase changes to idle/new hand
  if (phase === 'idle' || phase === 'showdown') {
    lastDecisionHand = null;
  }
}

// ── Event log ─────────────────────────────────────────────────────────────────
function addEvent(ts, ns, topic) {
  recentEvents.unshift({ ts: ts || Date.now(), ns, topic });
  if (recentEvents.length > MAX_EVENTS) recentEvents.length = MAX_EVENTS;
  renderEvents();
}

function renderEvents() {
  els.eventsList.innerHTML = recentEvents.map(ev => {
    const t = new Date(ev.ts).toTimeString().slice(0, 8);
    const nsText = typeof ev.ns === 'string' ? ev.ns : String(ev.ns || '?');
    const topicText = typeof ev.topic === 'string' ? ev.topic : String(ev.topic || '?');
    return `<li>
      <span class="ev-time">${t}</span>
      <span class="ev-ns">${nsText}</span>
      <span class="ev-topic">${topicText}</span>
    </li>`;
  }).join('');
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function phaseColor(phase) {
  return { idle:'grey', preflop:'blue', flop:'green', turn:'yellow', river:'yellow', showdown:'red' }[phase] || 'grey';
}

function renderCards(cards) {
  if (!cards || cards.length === 0) return '<span class="empty">—</span>';
  return cards.map(c => {
    if (typeof c !== 'string') return '';
    const suit = c.slice(-1).toLowerCase();
    return `<span class="card ${suit}">${c}</span>`;
  }).join('');
}

// ── Start ─────────────────────────────────────────────────────────────────────
connect();
