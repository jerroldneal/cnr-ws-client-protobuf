/**
 * proto-tap.js — Enhanced Protocol Buffer WebSocket Tap v2
 *
 * INJECTION: document_start, world: MAIN
 *
 * Enhancements over v1:
 *  - In-page event bus:  window.__ProtoTap.on(topic, fn) / .off(topic, fn)
 *  - Socket registry:    window.__ProtoTap.sockets (Map url→WebSocket)
 *  - Action sender:      window.__ProtoTap.sendAction(roomId, action, coin)
 *  - Ring buffer:        window.__ProtoTap.lastEvents (last 200 decoded events)
 *  - Stats:              window.__ProtoTap.stats()
 *  - Relay broadcast:    emits all decoded events to ws://localhost:13030/ws
 *
 * Architecture ref: cnr-ws-client-cocos2d/docs/CLUBWPTGOLD_PROTOBUF_ARCHITECTURE.md
 */
(function installCNRProtoTapV2() {
  'use strict';

  const VERSION = 2;
  const BUILD_HASH = '__PROTO_TAP_BUILD_HASH__'; // replaced at PIA build time
  if (window.__ProtoTap && window.__ProtoTap.version >= VERSION) {
    console.warn('[ProtoTap v2] Already installed (v' + window.__ProtoTap.version + ', build ' + (window.__ProtoTap.buildHash || 'unknown') + '). To force re-inject: delete window.__ProtoTap');
    return;
  }

  // ── Config ──────────────────────────────────────────────────────────────
  const RELAY_URL      = 'ws://localhost:13030/ws';
  const MAX_RETRIES    = 8;
  const RING_SIZE      = 200;   // last N events kept in memory
  const SKIP_TOPICS    = new Set(['Ping', 'Pong', 'RealIp', 'AnimMsg', 'VoiceMsg']);
  const GAME_NAMESPACES = ['holdem', 'commonProto', 'mttPro', 'pineapple'];

  // ── Relay ────────────────────────────────────────────────────────────────
  const _OrigWS = window.WebSocket;
  let relay   = null;
  let relayOk = false;
  let retries = 0;
  const queue = [];

  function openRelay() {
    if (relay && relay.readyState <= _OrigWS.OPEN) return;
    try {
      relay = new _OrigWS(RELAY_URL);
      relay.onopen = () => {
        relayOk = true; retries = 0;
        if (queue.length) {
          console.log('[ProtoTap v2] Relay up, flushing', queue.length, 'events');
          while (queue.length) { try { relay.send(queue.shift()); } catch (_) { break; } }
        }
      };
      relay.onclose = () => {
        relayOk = false;
        if (++retries <= MAX_RETRIES) setTimeout(openRelay, Math.min(30000, 1000 * retries * retries));
      };
      relay.onerror = () => {};
    } catch (_) {}
  }

  function relayEmit(json) {
    if (relayOk) { try { relay.send(json); return; } catch (_) {} }
    if (queue.length < 500) queue.push(json);
  }

  // ── Protobuf ─────────────────────────────────────────────────────────────
  let pb = null;
  const msgIdMaps = {};  // ns → { id → typeName }

  function resolvePb() {
    if (pb) return true;
    if (window.protobuf && window.protobuf.roots && window.protobuf.roots['default']) {
      pb = window.protobuf.roots['default'];
      return true;
    }
    return false;
  }

  function buildIdMap(ns) {
    if (msgIdMaps[ns] || !pb || !pb[ns] || !pb[ns].MessageId) return;
    const m = {};
    for (const [name, id] of Object.entries(pb[ns].MessageId)) m[id] = name;
    msgIdMaps[ns] = m;
  }

  function lookupMsgId(ns, typeName) {
    const m = msgIdMaps[ns];
    if (!m) return null;
    for (const [id, name] of Object.entries(m)) {
      if (name === typeName) return parseInt(id, 10);
    }
    return null;
  }

  // ── Ring buffers ──────────────────────────────────────────────────────────
  const lastEvents = [];
  const unknownFrames = [];    // unknown-msgId frames for offline analysis
  const UNKNOWN_RING  = 500;  // keep more — these are rare & small

  function pushRing(evt) {
    lastEvents.push(evt);
    if (lastEvents.length > RING_SIZE) lastEvents.shift();
  }

  function pushUnknown(entry) {
    unknownFrames.push(entry);
    if (unknownFrames.length > UNKNOWN_RING) unknownFrames.shift();
  }

  // ── In-page event bus ────────────────────────────────────────────────────
  const _handlers = {};   // topic → Set<fn>

  function busOn(topic, fn) {
    if (!_handlers[topic]) _handlers[topic] = new Set();
    _handlers[topic].add(fn);
  }

  function busOff(topic, fn) {
    _handlers[topic] && _handlers[topic].delete(fn);
  }

  function busEmit(topic, data) {
    const handlers = _handlers[topic];
    if (handlers) handlers.forEach(fn => { try { fn(data); } catch (_) {} });
    const wildcard = _handlers['*'];
    if (wildcard) wildcard.forEach(fn => { try { fn({ topic, ...data }); } catch (_) {} });
  }

  // ── Decode ────────────────────────────────────────────────────────────────

  // Reverse lookup: msgId → { ns, typeName }
  const _idToType = {};
  function buildReverseIdMap() {
    // Build in reverse priority order so higher-priority namespaces win on collision
    const priorityOrder = ['pineapple', 'commonProto', 'mttPro', 'holdem'];
    for (const ns of priorityOrder) {
      if (!pb[ns] || !pb[ns].MessageId) continue;
      for (const [name, id] of Object.entries(pb[ns].MessageId)) {
        if (id === 0) continue; // skip Null
        _idToType[id] = { ns, typeName: name };
      }
    }
  }

  /**
   * Decode a binary WebSocket frame.
   * Supports two framing formats:
   *   1. Length-prefixed: [4-byte BE uint32 length] [2-byte BE uint16 msgId] [protobuf body]
   *   2. Wrapper-based:  protobuf Wrapper { topic: string, body: bytes }
   */
  function decodeFrame(buffer, wsUrl) {
    if (!resolvePb()) return null;

    const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
    if (bytes.length < 6) return null;

    // ── Try length-prefixed format first ──
    const frameLen = (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];
    if (frameLen === bytes.length && frameLen >= 6) {
      const msgId = (bytes[4] << 8) | bytes[5];
      const lookup = _idToType[msgId];
      if (lookup) {
        const { ns, typeName } = lookup;
        if (SKIP_TOPICS.has(typeName)) return null;

        const decoder = pb[ns] && pb[ns][typeName];
        let decoded = null;
        if (decoder && bytes.length > 6) {
          const body = bytes.slice(6);
          try {
            decoded = JSON.parse(JSON.stringify(decoder.decode(body)));
          } catch (_) {
            decoded = { _raw: Array.from(body).slice(0, 32) };
          }
        }

        const evt = {
          type:  'proto_event',
          ns,
          topic: typeName,
          msgId,
          ts:    Date.now(),
          wsUrl: wsUrl.replace(/[?#].*$/, '').substring(0, 80),
          data:  decoded,
        };

        relayEmit(JSON.stringify(evt));
        pushRing(evt);
        busEmit(typeName, evt);
        return evt;
      }
      // Length-prefixed format matched (frameLen === bytes.length) but msgId unknown.
      // Capture full payload for offline analysis — may contain undiscovered message types.
      const trimmedUrl = wsUrl.replace(/[?#].*$/, '').substring(0, 80);
      const bodyBytes = bytes.length > 6 ? bytes.slice(6) : new Uint8Array(0);
      const entry = {
        type:   'unknown_frame',
        msgId,
        len:    frameLen,
        ts:     Date.now(),
        wsUrl:  trimmedUrl,
        hex:    Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' '),
        bodyHex: Array.from(bodyBytes).map(b => b.toString(16).padStart(2, '0')).join(' '),
        bodyLen: bodyBytes.length,
      };
      pushUnknown(entry);
      relayEmit(JSON.stringify(entry));
      console.debug('[ProtoTap v2] Unknown msgId %d (len=%d, body=%d) from %s', msgId, frameLen, bodyBytes.length, trimmedUrl);
      return null;
    }

    // ── Fallback: Wrapper-based format ──
    for (const ns of GAME_NAMESPACES) {
      const nsObj = pb[ns];
      if (!nsObj || !nsObj.Wrapper) continue;
      let w;
      try { w = nsObj.Wrapper.decode(bytes); } catch (_) { continue; }
      if (!w || !w.topic) continue;

      const topicStr = w.topic;
      const typeName = topicStr.includes('.') ? topicStr.split('.').pop() : topicStr;
      if (SKIP_TOPICS.has(typeName)) return null;

      let decoder = nsObj[typeName];
      let decoderNs = ns;
      if (!decoder) {
        for (const tryNs of GAME_NAMESPACES) {
          if (pb[tryNs] && pb[tryNs][typeName]) {
            decoder = pb[tryNs][typeName]; decoderNs = tryNs; break;
          }
        }
      }

      let decoded = null;
      if (decoder && w.body && w.body.length > 0) {
        try {
          decoded = JSON.parse(JSON.stringify(decoder.decode(w.body)));
        } catch (_) {
          decoded = { _raw: Array.from(w.body).slice(0, 32) };
        }
      }

      const evt = {
        type:  'proto_event',
        ns:    decoderNs,
        topic: typeName,
        msgId: lookupMsgId(decoderNs, typeName),
        ts:    Date.now(),
        wsUrl: wsUrl.replace(/[?#].*$/, '').substring(0, 80),
        data:  decoded,
      };

      relayEmit(JSON.stringify(evt));
      pushRing(evt);
      busEmit(typeName, evt);
      if (decoderNs !== ns) busEmit(`${decoderNs}.${typeName}`, evt);

      return evt;
    }
    return null;
  }

  // ── Socket registry ───────────────────────────────────────────────────────
  const sockets = new Map();          // url → last WebSocket with that url
  const _patchedSockets = new WeakSet();

  function patchSocket(ws, url) {
    if (_patchedSockets.has(ws)) return;
    _patchedSockets.add(ws);
    sockets.set(url, ws);

    ws.addEventListener('message', (evt) => {
      if (evt.data instanceof ArrayBuffer) {
        try { decodeFrame(evt.data, url); } catch (_) {}
      } else if (typeof Blob !== 'undefined' && evt.data instanceof Blob) {
        evt.data.arrayBuffer().then(buf => { try { decodeFrame(buf, url); } catch (_) {} });
      }
    });

    // Track close: remove from registry
    ws.addEventListener('close', () => {
      if (sockets.get(url) === ws) sockets.delete(url);
    });
  }

  // ── WebSocket proxy ───────────────────────────────────────────────────────
  function ProxiedWebSocket(url, protocols) {
    const ws = arguments.length >= 2
      ? new _OrigWS(url, protocols)
      : new _OrigWS(url);

    const urlStr = typeof url === 'string' ? url : (url && url.toString ? url.toString() : '');
    const isLocal = urlStr.includes('localhost') || urlStr.includes('127.0.0.1');

    if (!isLocal) patchSocket(ws, urlStr);
    return ws;
  }
  ProxiedWebSocket.prototype  = _OrigWS.prototype;
  ProxiedWebSocket.CONNECTING = _OrigWS.CONNECTING;
  ProxiedWebSocket.OPEN       = _OrigWS.OPEN;
  ProxiedWebSocket.CLOSING    = _OrigWS.CLOSING;
  ProxiedWebSocket.CLOSED     = _OrigWS.CLOSED;

  try { window.WebSocket = ProxiedWebSocket; }
  catch (e) { console.warn('[ProtoTap v2] Could not replace WebSocket:', e); }

  // ── Action sender ─────────────────────────────────────────────────────────
  /**
   * Send a holdem ActionReq directly to the game server.
   * @param {number} roomId
   * @param {number} action  (holdem.Action enum: 1=CHECK, 2=CALL, 3=BET, 4=FOLD, 5=RAISE, 6=ALL_IN)
   * @param {number} [coin=0]
   * @returns {boolean} true if sent
   */
  function sendAction(roomId, action, coin = 0) {
    if (!pb || !pb.holdem) { console.warn('[ProtoTap v2] protobuf not ready'); return false; }

    // Find the game socket (non-localhost WS that has been patched)
    let gameWs = null;
    for (const [url, ws] of sockets) {
      if (!url.includes('localhost') && !url.includes('127.0.0.1') && ws.readyState === _OrigWS.OPEN) {
        gameWs = ws; break;
      }
    }
    if (!gameWs) { console.warn('[ProtoTap v2] No open game socket'); return false; }

    try {
      const { ActionReq, Wrapper } = pb.holdem;
      const body    = ActionReq.encode({ roomId, action, coin }).finish();
      const wrapper = Wrapper.encode({ topic: 'holdem.ActionReq', body }).finish();
      const buf = wrapper.buffer.slice(wrapper.byteOffset, wrapper.byteOffset + wrapper.byteLength);
      gameWs.send(buf);
      console.log('[ProtoTap v2] Sent ActionReq:', { roomId, action, coin });
      return true;
    } catch (e) {
      console.error('[ProtoTap v2] sendAction failed:', e);
      return false;
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────
  window.__ProtoTap = {
    version: VERSION,
    buildHash: BUILD_HASH,
    installedAt: new Date().toISOString(),

    // In-page event bus
    on:  busOn,
    off: busOff,

    // Last N decoded events (ring buffer)
    lastEvents,

    // Unknown/unmapped frames (ring buffer) — for protocol analysis
    unknownFrames,

    // Active game WebSocket registry
    sockets,

    // Send a game action via the proxied socket
    sendAction,

    // Attach to an already-created socket (late inject fallback)
    attachToSocket(ws) {
      if (!ws || typeof ws.addEventListener !== 'function') return false;
      const url = ws.url || '';
      patchSocket(ws, url);
      console.log('[ProtoTap v2] Attached to existing socket:', url);
      return true;
    },

    // Runtime diagnostics
    stats() {
      return {
        version:        VERSION,
        buildHash:      BUILD_HASH,
        relayConnected: relayOk,
        relayRetries:   retries,
        queuedEvents:   queue.length,
        protobufReady:  !!pb,
        trackedSockets: sockets.size,
        ringBufferSize: lastEvents.length,
        unknownFrameCount: unknownFrames.length,
        namespaces:     pb ? Object.keys(pb).filter(k => !k.startsWith('_') && typeof pb[k] === 'object') : [],
      };
    },

    // Topic filter
    skipTopics: SKIP_TOPICS,
  };

  // ── Startup ───────────────────────────────────────────────────────────────
  openRelay();

  const pbPoll = setInterval(() => {
    if (!resolvePb()) return;
    clearInterval(pbPoll);
    GAME_NAMESPACES.forEach(buildIdMap);
    buildReverseIdMap();
    const ns = Object.keys(pb).filter(k => !k.startsWith('_') && typeof pb[k] === 'object');
    console.log('[ProtoTap v2] Protobuf ready. Namespaces:', ns.join(', '));
    busEmit('__proto_ready', { namespaces: ns });
  }, 100);

  console.log('[ProtoTap v2] installed — WebSocket proxy active');
})();
