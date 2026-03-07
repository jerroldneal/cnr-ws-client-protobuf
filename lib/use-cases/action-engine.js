'use strict';

const { EventEmitter } = require('events');
const { MessageId, Action, Code } = require('../proto/enums');
const { encodeActionReq } = require('../proto/game-flow');

/**
 * ActionEngine — decision execution. Given NeedActionMsg, validates and sends ActionReq.
 *
 * Events:
 *   'action-required'  — { seatNum, options, countdown }
 *   'action-sent'      — { action, coin }
 *   'action-accepted'  — { roomId }
 *   'action-rejected'  — { roomId, code }
 *   'action-expired'   — NeedActionMsg timed out without response
 */
class ActionEngine extends EventEmitter {
  constructor(sendFn) {
    super();
    this._send = sendFn; // (topic, body) => void
    this._pending = null;
    this._heroSeat = null;
  }

  get pending() { return this._pending; }
  set heroSeat(seat) { this._heroSeat = seat; }

  onMessage(msg) {
    switch (msg.topic) {
      case MessageId.NeedActionMsg:
        this._onNeedAction(msg.fields);
        break;
      case MessageId.ActionRes:
        this._onActionRes(msg.fields);
        break;
      case MessageId.PlayerActionMsg:
        // If our action was broadcast, clear pending
        if (this._pending && msg.fields.seatNum === this._heroSeat) {
          this._pending = null;
        }
        break;
    }
  }

  _onNeedAction(fields) {
    // Only care if it's hero's turn
    if (this._heroSeat != null && fields.seatNum !== this._heroSeat) return;

    const options = this._parseOptions(fields);
    this._pending = {
      roomId: fields.roomId,
      seatNum: fields.seatNum,
      options,
      optCoin: fields.optCoin,
      minBetCoin: fields.minBetCoin,
      maxBetCoin: fields.maxBetCoin,
      deskCoin: fields.deskCoin,
      countDown: fields.countDown,
    };
    this.emit('action-required', {
      seatNum: fields.seatNum,
      options,
      countdown: fields.countDown,
      minBet: fields.minBetCoin,
      maxBet: fields.maxBetCoin,
      callAmount: fields.optCoin,
    });
  }

  _parseOptions(fields) {
    const opts = [];
    const act = fields.optAction;
    // Bit flags: CHECK=1, CALL=2, BET=3, FOLD=4, RAISE=5, ALL_IN=6
    if (act & (1 << Action.CHECK)) opts.push(Action.CHECK);
    if (act & (1 << Action.CALL)) opts.push(Action.CALL);
    if (act & (1 << Action.BET)) opts.push(Action.BET);
    if (act & (1 << Action.FOLD)) opts.push(Action.FOLD);
    if (act & (1 << Action.RAISE)) opts.push(Action.RAISE);
    if (act & (1 << Action.ALL_IN)) opts.push(Action.ALL_IN);
    // Fallback: if no bits parsed, include FOLD and the raw optAction
    if (opts.length === 0) {
      opts.push(Action.FOLD);
      if (act > 0 && act <= 6) opts.push(act);
    }
    return opts;
  }

  /**
   * Send an action.
   * @param {number} action - Action enum value
   * @param {number} [coin=0] - Bet/raise amount
   * @returns {boolean} true if sent
   */
  act(action, coin = 0) {
    if (!this._pending) return false;

    // Validate action
    const { roomId, minBetCoin, maxBetCoin } = this._pending;

    // Validate bet sizing for BET/RAISE
    if (action === Action.BET || action === Action.RAISE) {
      if (coin < minBetCoin && coin > 0) coin = minBetCoin;
      if (coin > maxBetCoin && maxBetCoin > 0) coin = maxBetCoin;
    }

    const { topic, body } = encodeActionReq({ roomId, action, coin });
    this._send(topic, body);
    this.emit('action-sent', { action, coin });
    return true;
  }

  fold() { return this.act(Action.FOLD); }
  check() { return this.act(Action.CHECK); }
  call() { return this.act(Action.CALL, this._pending?.optCoin || 0); }
  bet(amount) { return this.act(Action.BET, amount); }
  raise(amount) { return this.act(Action.RAISE, amount); }
  allIn() { return this.act(Action.ALL_IN, this._pending?.maxBetCoin || 0); }

  _onActionRes(fields) {
    if (fields.code === Code.OK) {
      this._pending = null;
      this.emit('action-accepted', { roomId: fields.roomId });
    } else {
      this.emit('action-rejected', { roomId: fields.roomId, code: fields.code });
    }
  }
}

module.exports = ActionEngine;
