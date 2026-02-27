/**
 * game-state.js — ClubWPT Gold Game State Tracker
 *
 * Accumulates decoded protobuf events into a coherent game model.
 * Handles all holdem and commonProto message types.
 *
 * Usage:
 *   const GameState = require('./game-state');
 *   const gs = new GameState();
 *   gs.applyProtoEvent({ ns: 'holdem', topic: 'DealerPosMsg', data: {...} });
 */
'use strict';

// PlayerState enum (from holdem namespace)
const PlayerState = { NONE: 0, WAITING: 20, FORCE_BLIND: 21, PAUSE: 22, FORCE_ANTE: 23, PREPARE: 100, ZOMBIE: 101 };

// Game phases
const Phase = { IDLE: 'idle', PREFLOP: 'preflop', FLOP: 'flop', TURN: 'turn', RIVER: 'river', SHOWDOWN: 'showdown' };

class GameState {
  constructor() {
    this.reset();
  }

  reset() {
    // Room info
    this.roomId     = null;
    this.bb         = 0;
    this.sb         = 0;

    // Hero identity (detected from UserTokenReq / SitDownRes)
    this.heroUserId = null;
    this.heroSeat   = null;

    // Hand state
    this.phase        = Phase.IDLE;
    this.handNumber   = 0;
    this.dealerPos    = -1;
    this.sbPos        = -1;
    this.bbPos        = -1;
    this.pots         = [0];
    this.currentAct   = null;   // NeedActionMsg data

    // Cards (strings decoded by card-hook or proto decode)
    this.holeCardStrings   = [];  // hero's private cards
    this.boardCardStrings  = [];  // community cards

    // Raw bytes (direct from proto, before decode)
    this.holeCardBytes  = null;
    this.boardCardBytes = null;

    // Seat roster: seatNum → { userId, nickName, deskCoin, leftCoin, state, seatNum }
    this.seats = {};

    // Action history for current hand
    this.actionHistory = [];

    // Session stats
    this.handsPlayed  = 0;
    this.handsWon     = 0;
    this.netProfit    = 0;
  }

  /**
   * Apply a decoded proto event to update game state.
   * @param {{ ns: string, topic: string, data: object }} evt
   */
  applyProtoEvent(evt) {
    if (!evt || !evt.topic) return;
    try {
      if (evt.ns === 'holdem')       this._holdem(evt.topic, evt.data || {});
      if (evt.ns === 'commonProto')  this._common(evt.topic, evt.data || {});
    } catch (e) {
      // Never throw from applyProtoEvent
    }
  }

  // ── holdem handlers ──────────────────────────────────────────────────────

  _holdem(topic, d) {
    switch (topic) {

      case 'UserTokenReq':
        // Capture hero userId from auth request (sent before entering game)
        if (d.userId) this.heroUserId = d.userId;
        break;

      case 'SitDownRes':
        // code=0 means sit-down succeeded; hero seat comes from RoomSnapshotMsg
        break;

      case 'EnterRoomRes':
        if (d.code === 0) {
          this.roomId = d.roomId || this.roomId;
          this.bb     = d.bb    || this.bb;
          this.sb     = d.sb    || this.sb;
        }
        break;

      case 'RoomSnapshotMsg':
        this.roomId    = d.roomId    ?? this.roomId;
        this.dealerPos = d.dealerPos ?? this.dealerPos;
        this.sbPos     = d.sbPos     ?? this.sbPos;
        this.bbPos     = d.bbPos     ?? this.bbPos;
        this.pots      = d.pots      || this.pots;
        if (d.state !== undefined) {
          this.phase = this._stateToPhase(d.state);
        }
        if (Array.isArray(d.players)) {
          for (const p of d.players) {
            this.seats[p.seatNum] = {
              userId:   p.userId,
              nickName: p.nickName || '',
              deskCoin: p.deskCoin || 0,
              leftCoin: p.leftCoin || 0,
              state:    p.state    || 0,
              seatNum:  p.seatNum,
            };
            if (this.heroUserId && p.userId === this.heroUserId) {
              this.heroSeat = p.seatNum;
            }
          }
        }
        if (d.currAct) this.currentAct = this._normalizeAct(d.currAct);
        if (d.boardCards) this.boardCardBytes = d.boardCards;
        if (d.holeCards)  this.holeCardBytes  = d.holeCards;
        break;

      case 'DealerPosMsg':
        this.dealerPos = d.dealerPos ?? this.dealerPos;
        this.sbPos     = d.sbPos     ?? this.sbPos;
        this.bbPos     = d.bbPos     ?? this.bbPos;
        // New hand starts
        this.phase           = Phase.PREFLOP;
        this.holeCardStrings  = [];
        this.boardCardStrings = [];
        this.holeCardBytes    = null;
        this.boardCardBytes   = null;
        this.currentAct       = null;
        this.actionHistory    = [];
        this.pots             = [0];
        this.handNumber++;
        if (Array.isArray(d.seats)) {
          for (const s of d.seats) {
            if (this.seats[s.seatNum]) this.seats[s.seatNum].deskCoin = s.coin ?? this.seats[s.seatNum].deskCoin;
          }
        }
        break;

      case 'HoleCardsMsg':
        this.holeCardBytes = d.cards;
        // Identify hero by userId if we know it
        if (this.heroUserId && d.userId && d.userId !== this.heroUserId) break;
        if (!this.heroUserId && d.userId) {
          // Assume first HoleCardsMsg with cards is ours (server only sends us our own by default)
          this.heroUserId = d.userId;
        }
        break;

      case 'BoardCardsMsg':
        this.boardCardBytes = d.cards;
        if      (d.roomState === 2) { this.phase = Phase.FLOP; }
        else if (d.roomState === 3) { this.phase = Phase.TURN; }
        else if (d.roomState === 4) { this.phase = Phase.RIVER; }
        break;

      case 'NeedActionMsg':
        this.currentAct = {
          seatNum:     d.seatNum,
          optAction:   d.optAction,
          optCoin:     d.optCoin     || 0,
          minBetCoin:  d.minBetCoin  || 0,
          maxBetCoin:  d.maxBetCoin  || 0,
          countDown:   d.countDown   || 30,
          deskCoin:    d.deskCoin    || 0,
        };
        break;

      case 'PotsMsg':
        this.pots = d.pots || this.pots;
        break;

      case 'PlayerActionMsg':
        if (d.seatNum !== undefined && this.seats[d.seatNum]) {
          this.seats[d.seatNum].deskCoin = d.deskCoin ?? this.seats[d.seatNum].deskCoin;
          this.seats[d.seatNum].leftCoin = d.leftCoin ?? this.seats[d.seatNum].leftCoin;
        }
        this.actionHistory.push({
          ts:      Date.now(),
          seatNum: d.seatNum,
          action:  d.action,
          coin:    d.deskCoin,
        });
        break;

      case 'SeatOccupiedMsg':
        this.seats[d.seatNum] = {
          userId:   d.userId,
          nickName: d.nickName || '',
          deskCoin: d.coin     || 0,
          leftCoin: 0,
          state:    0,
          seatNum:  d.seatNum,
        };
        if (this.heroUserId && d.userId === this.heroUserId) {
          this.heroSeat = d.seatNum;
        }
        break;

      case 'SeatEmptyMsg':
      case 'PlayerLeaveMsg':
        delete this.seats[d.seatNum];
        break;

      case 'PlayerStateMsg':
        if (this.seats[d.seatNum]) this.seats[d.seatNum].state = d.state;
        break;

      case 'ShowdownMsg':
        this.phase = Phase.SHOWDOWN;
        break;

      case 'RoundResultMsg':
        this.phase      = Phase.IDLE;
        this.currentAct = null;
        this.handsPlayed++;
        if (Array.isArray(d.players)) {
          const heroResult = d.players.find(p => p.seatNum === this.heroSeat);
          if (heroResult) {
            const profit = heroResult.profit || 0;
            this.netProfit += profit;
            if (profit > 0) this.handsWon++;
          }
        }
        break;
    }
  }

  _common(topic, d) {
    // commonProto topics that affect game state
    switch (topic) {
      case 'User_Login_Response':
        // Token contains userId in some implementations
        break;
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  _stateToPhase(state) {
    // RoomState enum: 1=waiting, 2=flop, 3=turn, 4=river, 5=showdown
    const map = { 1: Phase.PREFLOP, 2: Phase.FLOP, 3: Phase.TURN, 4: Phase.RIVER, 5: Phase.SHOWDOWN };
    return map[state] || Phase.IDLE;
  }

  _normalizeAct(a) {
    return {
      seatNum:    a.seatNum,
      optAction:  a.optAction || 0,
      optCoin:    a.optCoin   || 0,
      minBetCoin: a.minBetCoin     || 0,
      maxBetCoin: a.maxBetCoin     || 0,
      countDown:  a.countdownLeft  || a.countdownTotal || 30,
      deskCoin:   0,
    };
  }

  // ── Computed properties ───────────────────────────────────────────────────

  get isHeroTurn() {
    return !!(this.currentAct && this.heroSeat !== null && this.currentAct.seatNum === this.heroSeat);
  }

  get totalPot() {
    return this.pots.reduce((s, p) => s + (p || 0), 0);
  }

  get heroStack() {
    if (this.heroSeat === null || !this.seats[this.heroSeat]) return 0;
    return this.seats[this.heroSeat].deskCoin || 0;
  }

  get activeSeatCount() {
    return Object.values(this.seats).filter(s => s.state !== 4).length;
  }

  /**
   * Return a JSON-serialisable snapshot.
   */
  toJSON() {
    return {
      roomId:        this.roomId,
      heroSeat:      this.heroSeat,
      heroUserId:    this.heroUserId,
      phase:         this.phase,
      handNumber:    this.handNumber,
      holeCards:     this.holeCardStrings,
      boardCards:    this.boardCardStrings,
      pots:          this.pots,
      totalPot:      this.totalPot,
      dealerPos:     this.dealerPos,
      sbPos:         this.sbPos,
      bbPos:         this.bbPos,
      bb:            this.bb,
      sb:            this.sb,
      seats:         this.seats,
      currentAct:    this.currentAct,
      isHeroTurn:    this.isHeroTurn,
      heroStack:     this.heroStack,
      activePlayers: this.activeSeatCount,
      actionHistory: this.actionHistory,
      stats:         { handsPlayed: this.handsPlayed, handsWon: this.handsWon, netProfit: this.netProfit },
    };
  }
}

module.exports = GameState;
