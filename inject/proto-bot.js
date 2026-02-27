/**
 * proto-bot.js — Self-Contained ClubWPT Gold Poker Bot
 *
 * INJECTION: document_end (after proto-tap.js), world: MAIN
 *
 * Subscribes to window.__ProtoTap event bus, builds game state,
 * evaluates hands, and optionally sends ActionReq automatically.
 *
 * Exposes window.__ProtoBot:
 *   .enabled          {boolean}  — advisory mode (read-only if autoAct=false)
 *   .autoAct          {boolean}  — actually send actions via proto-tap (default: false)
 *   .config           {object}   — aggression, vpip, pfr, decisionDelay
 *   .lastDecision     {object}   — most recent action recommendation
 *   .gameState        {object}   — JSON snapshot of current game state
 *   .setHeroCards(arr)           — manually override hero card strings ["As","Kh"]
 *   .stats()          {object}   — engagement stats
 */
(function installCNRProtoBot() {
  'use strict';

  const VERSION = 1;
  if (window.__ProtoBot && window.__ProtoBot.version >= VERSION) return;

  // ── Inline: Card ranks / suits ────────────────────────────────────────────
  const RANKS    = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
  const SUITS    = ['s','h','d','c'];
  const RANK_IDX = Object.fromEntries(RANKS.map((r, i) => [r, i]));
  const SUIT_IDX = Object.fromEntries(SUITS.map((s, i) => [s, i]));

  function parseCard(str) {
    if (!str || str.length < 2) return null;
    const rank = str.slice(0, -1);
    const suit = str.slice(-1).toLowerCase();
    const r = RANK_IDX[rank]; const s = SUIT_IDX[suit];
    if (r === undefined || s === undefined) return null;
    return { rank: r, suit: s };
  }

  // ── Inline: 7-card Hand Evaluator ────────────────────────────────────────
  const HAND_RANK = { HIGH_CARD:0, ONE_PAIR:1, TWO_PAIR:2, THREE_OF_A_KIND:3, STRAIGHT:4, FLUSH:5, FULL_HOUSE:6, FOUR_OF_A_KIND:7, STRAIGHT_FLUSH:8 };

  function evaluate5(cards) {
    const sorted = [...cards].sort((a, b) => b.rank - a.rank);
    const ranks  = sorted.map(c => c.rank);
    const suits  = sorted.map(c => c.suit);
    const isFlush = new Set(suits).size === 1;
    let isStraight = false, straightHigh = -1;
    if (new Set(ranks).size === 5) {
      if (ranks[0] - ranks[4] === 4) { isStraight = true; straightHigh = ranks[0]; }
      if (ranks[0]===12 && ranks[1]===3 && ranks[2]===2 && ranks[3]===1 && ranks[4]===0) { isStraight=true; straightHigh=3; }
    }
    const freq = {}; for (const r of ranks) freq[r] = (freq[r]||0)+1;
    const groups = Object.entries(freq).sort((a,b)=>b[1]-a[1]||parseInt(b[0])-parseInt(a[0])).map(([r,c])=>({rank:parseInt(r),count:c}));
    if (isFlush && isStraight) return { rank: HAND_RANK.STRAIGHT_FLUSH, tiebreaker:[straightHigh], name: straightHigh===12?'Royal Flush':'Straight Flush' };
    if (groups[0].count===4) return { rank:HAND_RANK.FOUR_OF_A_KIND, tiebreaker:groups.map(g=>g.rank), name:'Four of a Kind' };
    if (groups[0].count===3 && groups[1].count===2) return { rank:HAND_RANK.FULL_HOUSE, tiebreaker:groups.map(g=>g.rank), name:'Full House' };
    if (isFlush) return { rank:HAND_RANK.FLUSH, tiebreaker:ranks, name:'Flush' };
    if (isStraight) return { rank:HAND_RANK.STRAIGHT, tiebreaker:[straightHigh], name:'Straight' };
    if (groups[0].count===3) return { rank:HAND_RANK.THREE_OF_A_KIND, tiebreaker:groups.map(g=>g.rank), name:'Three of a Kind' };
    if (groups[0].count===2 && groups[1].count===2) return { rank:HAND_RANK.TWO_PAIR, tiebreaker:groups.map(g=>g.rank), name:'Two Pair' };
    if (groups[0].count===2) return { rank:HAND_RANK.ONE_PAIR, tiebreaker:groups.map(g=>g.rank), name:'One Pair' };
    return { rank:HAND_RANK.HIGH_CARD, tiebreaker:ranks, name:'High Card' };
  }

  function cmpHands(a, b) {
    if (a.rank!==b.rank) return a.rank-b.rank;
    for (let i=0;i<Math.max(a.tiebreaker.length,b.tiebreaker.length);i++){
      const av=a.tiebreaker[i]??-1, bv=b.tiebreaker[i]??-1;
      if (av!==bv) return av-bv;
    }
    return 0;
  }

  function evaluate7(cardStrings) {
    const cards = cardStrings.map(parseCard).filter(Boolean);
    if (cards.length < 5) return null;
    let best = null;
    const n = cards.length;
    for (let a=0;a<n-4;a++) for (let b=a+1;b<n-3;b++) for (let c=b+1;c<n-2;c++) for (let d=c+1;d<n-1;d++) for (let e=d+1;e<n;e++) {
      const h = evaluate5([cards[a],cards[b],cards[c],cards[d],cards[e]]);
      if (!best||cmpHands(h,best)>0) best=h;
    }
    return best;
  }

  function preFlopStrength(hole) {
    if (!hole||hole.length<2) return 0.5;
    const [c1,c2] = hole.map(parseCard).filter(Boolean);
    if (!c1||!c2) return 0.5;
    const hi=Math.max(c1.rank,c2.rank), lo=Math.min(c1.rank,c2.rank);
    const suited=c1.suit===c2.suit, isPair=hi===lo, gap=hi-lo;
    let s;
    if (isPair) { s=hi*2; if(hi===12)s=20; else if(hi===11)s=16; else if(hi===10)s=14; else if(hi===9)s=12; s=Math.max(5,s); }
    else { s=hi*0.5+(suited?2:0)+(gap<=1?1:0)-Math.max(0,gap-3); }
    return Math.max(0.05,Math.min(0.98,s/20));
  }

  function winEq({ holeCards=[], boardCards=[], numOpponents=1 }={}) {
    if (holeCards.length<2) return 0.5;
    let eq;
    if (boardCards.length===0) { eq=preFlopStrength(holeCards); }
    else {
      const res=evaluate7([...holeCards,...boardCards]);
      const T=[0.10,0.38,0.55,0.68,0.72,0.77,0.86,0.93,0.97];
      eq=res?(T[res.rank]??0.5):0.5;
    }
    return Math.max(0.01,eq*Math.pow(0.88,Math.max(0,numOpponents-1)));
  }

  // ── Inline: Card byte decoder (best-effort) ───────────────────────────────
  // Attempts to decode raw card bytes from HoleCardsMsg / BoardCardsMsg.
  // Encoding: one byte per card, bits 6-5 = suit (0=d,1=c,2=h,3=s), bits 4-0 = rank (0=2..12=A)
  // If this doesn't match sprite frames, hero must rely on card-hook.js results.
  function tryDecodeCardBytes(bytesOrBase64) {
    const cards = [];
    try {
      let bytes;
      if (typeof bytesOrBase64 === 'string') {
        // base64 → Uint8Array
        const bin = atob(bytesOrBase64);
        bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      } else if (bytesOrBase64 instanceof Uint8Array) {
        bytes = bytesOrBase64;
      } else if (Array.isArray(bytesOrBase64)) {
        bytes = new Uint8Array(bytesOrBase64);
      } else return [];

      const SUIT_MAP = ['d','c','h','s'];
      for (const b of bytes) {
        const rank = b & 0x0F;          // low 4 bits: 0=2 .. 12=A
        const suit = (b >> 4) & 0x03;  // bits 5-4: suit
        if (rank >= 0 && rank <= 12 && suit <= 3) {
          cards.push(RANKS[rank] + SUIT_MAP[suit]);
        }
      }
    } catch (_) {}
    return cards;
  }

  // ── Inline: Game State ───────────────────────────────────────────────────
  const Phase = { IDLE:'idle', PREFLOP:'preflop', FLOP:'flop', TURN:'turn', RIVER:'river', SHOWDOWN:'showdown' };

  const state = {
    roomId: null, heroUserId: null, heroSeat: null,
    phase: Phase.IDLE, handNumber: 0,
    dealerPos: -1, sbPos: -1, bbPos: -1, bb: 0, sb: 0,
    pots: [0], currentAct: null,
    holeCardStrings: [], boardCardStrings: [],
    seats: {}, actionHistory: [],
    handsPlayed: 0, handsWon: 0, netProfit: 0,
  };

  function applyEvent(ns, topic, data) {
    if (!data) return;
    if (ns === 'holdem') applyHoldem(topic, data);
  }

  function applyHoldem(topic, d) {
    switch (topic) {

      case 'UserTokenReq':
        if (d.userId) state.heroUserId = d.userId;
        break;

      case 'EnterRoomRes':
        if (d.code === 0) { state.roomId=d.roomId||state.roomId; state.bb=d.bb||state.bb; state.sb=d.sb||state.sb; }
        break;

      case 'RoomSnapshotMsg':
        state.roomId    = d.roomId    ?? state.roomId;
        state.dealerPos = d.dealerPos ?? state.dealerPos;
        state.sbPos     = d.sbPos     ?? state.sbPos;
        state.bbPos     = d.bbPos     ?? state.bbPos;
        state.pots      = d.pots      || state.pots;
        if (Array.isArray(d.players)) {
          for (const p of d.players) {
            state.seats[p.seatNum] = { userId:p.userId, nickName:p.nickName||'', deskCoin:p.deskCoin||0, leftCoin:p.leftCoin||0, state:p.state||0, seatNum:p.seatNum };
            if (state.heroUserId && p.userId===state.heroUserId) state.heroSeat=p.seatNum;
          }
        }
        if (d.currAct) state.currentAct = d.currAct;
        if (d.boardCards) { const bc=tryDecodeCardBytes(d.boardCards); if(bc.length) state.boardCardStrings=bc; }
        break;

      case 'DealerPosMsg':
        state.dealerPos=d.dealerPos??state.dealerPos; state.sbPos=d.sbPos??state.sbPos; state.bbPos=d.bbPos??state.bbPos;
        state.phase='preflop'; state.holeCardStrings=[]; state.boardCardStrings=[]; state.currentAct=null;
        state.actionHistory=[]; state.pots=[0]; state.handNumber++;
        if (Array.isArray(d.seats)) {
          for (const s of d.seats) { if (state.seats[s.seatNum]) state.seats[s.seatNum].deskCoin=s.coin??state.seats[s.seatNum].deskCoin; }
        }
        break;

      case 'HoleCardsMsg':
        // Accept cards for hero (or first HoleCardsMsg if hero unknown)
        if (!state.heroUserId || d.userId===state.heroUserId) {
          if (!state.heroUserId && d.userId) state.heroUserId=d.userId;
          if (d.cards) {
            const decoded = tryDecodeCardBytes(d.cards);
            if (decoded.length>=2) state.holeCardStrings=decoded;
          }
        }
        break;

      case 'BoardCardsMsg':
        if (d.cards) {
          const decoded = tryDecodeCardBytes(d.cards);
          if (decoded.length) state.boardCardStrings=decoded;
        }
        if (d.roomState===2) state.phase=Phase.FLOP;
        else if (d.roomState===3) state.phase=Phase.TURN;
        else if (d.roomState===4) state.phase=Phase.RIVER;
        break;

      case 'NeedActionMsg':
        state.currentAct = { seatNum:d.seatNum, optAction:d.optAction, optCoin:d.optCoin||0, minBetCoin:d.minBetCoin||0, maxBetCoin:d.maxBetCoin||0, countDown:d.countDown||30, deskCoin:d.deskCoin||0 };
        break;

      case 'PotsMsg':
        state.pots = d.pots || state.pots;
        break;

      case 'PlayerActionMsg':
        if (state.seats[d.seatNum]) { state.seats[d.seatNum].deskCoin=d.deskCoin??state.seats[d.seatNum].deskCoin; }
        state.actionHistory.push({ ts:Date.now(), seatNum:d.seatNum, action:d.action });
        break;

      case 'SeatOccupiedMsg':
        state.seats[d.seatNum]={ userId:d.userId, nickName:d.nickName||'', deskCoin:d.coin||0, leftCoin:0, state:0, seatNum:d.seatNum };
        if (state.heroUserId && d.userId===state.heroUserId) state.heroSeat=d.seatNum;
        break;

      case 'SeatEmptyMsg': case 'PlayerLeaveMsg':
        delete state.seats[d.seatNum];
        break;

      case 'PlayerStateMsg':
        if (state.seats[d.seatNum]) state.seats[d.seatNum].state=d.state;
        break;

      case 'ShowdownMsg':
        state.phase=Phase.SHOWDOWN;
        break;

      case 'RoundResultMsg':
        state.phase=Phase.IDLE; state.currentAct=null; state.handsPlayed++;
        if (Array.isArray(d.players)) {
          const hr=d.players.find(p=>p.seatNum===state.heroSeat);
          if (hr) { state.netProfit+=(hr.profit||0); if ((hr.profit||0)>0) state.handsWon++; }
        }
        break;
    }
  }

  // ── Inline: Decision Engine ───────────────────────────────────────────────
  const Action = { NONE:0, CHECK:1, CALL:2, BET:3, FOLD:4, RAISE:5, ALL_IN:6 };
  const ActionName = ['NONE','CHECK','CALL','BET','FOLD','RAISE','ALL_IN'];

  function can(opt, act) { return (opt & (1 << act)) !== 0; }

  function decideAction() {
    const act = state.currentAct;
    if (!act || state.heroSeat===null || act.seatNum!==state.heroSeat) return null;

    const { optAction, optCoin:callAmount=0, minBetCoin=0, maxBetCoin=0, deskCoin=0 } = act;
    const free=can(optAction,Action.CHECK), canCall=can(optAction,Action.CALL);
    const canRaise=can(optAction,Action.RAISE), canFold=can(optAction,Action.FOLD);
    const hole=state.holeCardStrings, board=state.boardCardStrings;
    const pot=state.pots.reduce((s,p)=>s+(p||0),0)||1;
    const numOpp=Math.max(1,Object.keys(state.seats).length-1);
    const eq=winEq({ holeCards:hole, boardCards:board, numOpponents:numOpp });
    const potOdds=callAmount>0?callAmount/(pot+callAmount):0;

    let handName=null;
    if (hole.length>=2&&board.length>=3) {
      const res=evaluate7([...hole,...board]);
      if (res) handName=res.name;
    }

    const mk=(action,coin,reason)=>({action,coin,name:ActionName[action]||'?',reason,equity:eq,handName,ts:Date.now()});

    if (board.length===0) {
      // Pre-flop
      if (free) {
        if (eq>0.72&&canRaise) return mk(Action.RAISE, Math.min(deskCoin,Math.max(minBetCoin,pot*2.5)), `PF raise premium (${f(eq)}%)`);
        return mk(Action.CHECK,0,'Free preflop check');
      }
      if (eq>0.70&&canRaise) return mk(Action.RAISE, Math.min(deskCoin,callAmount*3), `3-bet (${f(eq)}%)`);
      if (eq>potOdds*1.2&&canCall) return mk(Action.CALL,callAmount,`PF call +EV (${f(eq)}% > ${f(potOdds)}%)`);
      if (canFold) return mk(Action.FOLD,0,`PF fold weak (${f(eq)}%)`);
    } else {
      // Post-flop
      if (eq>0.65) {
        if (free) return mk(Action.RAISE,Math.min(deskCoin,Math.max(minBetCoin,pot*0.65)),`Value bet ${handName||''} (${f(eq)}%)`);
        if (canRaise) return mk(Action.RAISE,Math.min(deskCoin,Math.max(minBetCoin,callAmount*2)),`Raise ${handName||''} (${f(eq)}%)`);
        if (canCall) return mk(Action.CALL,callAmount,`Call strong (${f(eq)}%)`);
      }
      if (eq>0.40) {
        if (free) return mk(Action.CHECK,0,`Check ${handName||'decent'} (${f(eq)}%)`);
        if (eq>potOdds*1.15&&canCall) return mk(Action.CALL,callAmount,`Pot-odds call (${f(eq)}% vs ${f(potOdds)}%)`);
        if (canFold) return mk(Action.FOLD,0,`Fold bad price (${f(eq)}% vs ${f(potOdds)}%)`);
      }
      if (free) return mk(Action.CHECK,0,`Check weak (${f(eq)}%)`);
      if (canFold) return mk(Action.FOLD,0,`Fold (${f(eq)}%)`);
    }
    if (canCall) return mk(Action.CALL,callAmount,'Forced call');
    return mk(Action.CHECK,0,'Default check');
  }

  function f(v) { return (v*100).toFixed(0); }

  // ── Bot config & state ───────────────────────────────────────────────────
  const config = {
    autoAct:       false,       // set true to actually send actions
    decisionDelay: 1500,        // ms before acting (looks more natural)
    aggression:    0.35,
  };

  let enabled      = true;
  let lastDecision = null;
  let decideTimer  = null;
  let handCount    = 0;
  let decisions    = [];

  // ── Subscribe to proto tap events ────────────────────────────────────────
  function onProtoEvent(evt) {
    if (!enabled) return;
    const { ns, topic, data } = evt;
    applyEvent(ns, topic, data);

    // NeedActionMsg on hero's seat → trigger decision
    if (topic === 'NeedActionMsg' && state.heroSeat !== null && data && data.seatNum === state.heroSeat) {
      scheduleDecision();
    }
  }

  function scheduleDecision() {
    if (decideTimer) clearTimeout(decideTimer);
    decideTimer = setTimeout(() => {
      const decision = decideAction();
      if (!decision) return;
      lastDecision = decision;
      decisions.unshift(decision);
      if (decisions.length > 50) decisions.pop();
      console.log('[ProtoBot] Decision:', decision.name, '|', decision.reason, '| equity:', f(decision.equity) + '%');

      if (config.autoAct && state.roomId && window.__ProtoTap) {
        const sent = window.__ProtoTap.sendAction(state.roomId, decision.action, decision.coin || 0);
        decision.sent = sent;
        if (sent) console.log('[ProtoBot] Action sent:', decision.name);
      }
    }, config.decisionDelay);
  }

  function waitForTap(retries = 0) {
    if (window.__ProtoTap) {
      window.__ProtoTap.on('*', onProtoEvent);
      console.log('[ProtoBot v' + VERSION + '] Subscribed to ProtoTap event bus');

      // If card-hook.js is present, also subscribe to card events for accurate card data
      if (window.__cnr_onCard) {
        window.__cnr_onCard((card, seat) => {
          // Merge card-hook card data into game state
          if (seat && seat.startsWith('pkw_seat')) {
            const seatNum = parseInt(seat.replace('pkw_seat', ''), 10);
            if (!isNaN(seatNum) && seatNum === state.heroSeat) {
              if (state.holeCardStrings.length < 2 && !state.holeCardStrings.includes(card)) {
                state.holeCardStrings.push(card);
              }
            }
          } else if (['F1','F2','F3','T','R'].includes(seat)) {
            if (!state.boardCardStrings.includes(card)) {
              state.boardCardStrings.push(card);
            }
          }
        });
      }
    } else if (retries < 60) {
      setTimeout(() => waitForTap(retries + 1), 300);
    } else {
      console.warn('[ProtoBot] ProtoTap never loaded — bot inactive');
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────
  window.__ProtoBot = {
    version: VERSION,

    get enabled()  { return enabled; },
    set enabled(v) { enabled = !!v; console.log('[ProtoBot] enabled:', enabled); },

    get autoAct()  { return config.autoAct; },
    set autoAct(v) { config.autoAct = !!v; console.log('[ProtoBot] autoAct:', config.autoAct); },

    config,

    get lastDecision() { return lastDecision; },
    get decisionHistory() { return decisions; },

    get gameState() {
      return {
        roomId:     state.roomId,
        heroSeat:   state.heroSeat,
        heroUserId: state.heroUserId,
        phase:      state.phase,
        handNumber: state.handNumber,
        holeCards:  state.holeCardStrings,
        boardCards: state.boardCardStrings,
        pots:       state.pots,
        totalPot:   state.pots.reduce((s,p)=>s+(p||0),0),
        dealerPos:  state.dealerPos,
        seats:      state.seats,
        currentAct: state.currentAct,
        isHeroTurn: !!(state.currentAct && state.currentAct.seatNum === state.heroSeat),
        heroStack:  state.heroSeat !== null ? (state.seats[state.heroSeat]?.deskCoin||0) : 0,
        stats:      { handsPlayed:state.handsPlayed, handsWon:state.handsWon, netProfit:state.netProfit },
      };
    },

    // Manually set hero card strings (e.g. from card-hook.js results)
    setHeroCards(cards) {
      state.holeCardStrings = cards;
      console.log('[ProtoBot] Hero cards set:', cards);
    },

    // Manually set board cards
    setBoardCards(cards) {
      state.boardCardStrings = cards;
    },

    // Force a decision right now (advisory, no auto-act side effect)
    forceDecide() {
      return decideAction();
    },

    stats() {
      return {
        version:     VERSION,
        enabled,
        autoAct:     config.autoAct,
        decisions:   decisions.length,
        handsPlayed: state.handsPlayed,
        handsWon:    state.handsWon,
        netProfit:   state.netProfit,
        lastDecision,
      };
    },
  };

  // ── Boot ──────────────────────────────────────────────────────────────────
  waitForTap();
  console.log('[ProtoBot v' + VERSION + '] installed — waiting for ProtoTap');
})();
