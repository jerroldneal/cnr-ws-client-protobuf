'use strict';

const { EventEmitter } = require('events');
const { MessageId, ActionName } = require('../proto/enums');

/**
 * HandTracker — tracks complete hand lifecycle from DealerPosMsg through RoundResultMsg.
 *
 * State machine phases: IDLE → PREFLOP → FLOP → TURN → RIVER → SHOWDOWN → RESULT → IDLE
 *
 * Events:
 *   'hand-start'     — { roomId, dealerPos, sbPos, bbPos, seats, handNum }
 *   'street-change'  — { street, boardCards }
 *   'action'         — { seatNum, action, actionName, deskCoin, leftCoin }
 *   'showdown'       — { players, winners }
 *   'hand-end'       — { roomId, players, handNum }
 *   'state'          — { phase } on any phase transition
 */
class HandTracker extends EventEmitter {
  constructor() {
    super();
    this._phase = 'IDLE';
    this._handNum = 0;
    this._currentHand = null;
  }

  get phase() { return this._phase; }
  get handNum() { return this._handNum; }
  get currentHand() { return this._currentHand; }

  onMessage(msg) {
    switch (msg.topic) {
      case MessageId.DealerPosMsg:
        this._onDealerPos(msg.fields);
        break;
      case MessageId.HoleCardsMsg:
        this._onHoleCards(msg.fields);
        break;
      case MessageId.BoardCardsMsg:
        this._onBoardCards(msg.fields);
        break;
      case MessageId.PlayerActionMsg:
        this._onPlayerAction(msg.fields);
        break;
      case MessageId.NeedActionMsg:
        this._onNeedAction(msg.fields);
        break;
      case MessageId.PotsMsg:
        this._onPots(msg.fields);
        break;
      case MessageId.ShowdownMsg:
        this._onShowdown(msg.fields);
        break;
      case MessageId.RoundResultMsg:
        this._onRoundResult(msg.fields);
        break;
    }
  }

  _setPhase(phase) {
    this._phase = phase;
    this.emit('state', { phase });
  }

  _onDealerPos(fields) {
    this._handNum++;
    this._currentHand = {
      roomId: fields.roomId,
      dealerPos: fields.dealerPos,
      sbPos: fields.sbPos,
      bbPos: fields.bbPos,
      straddlePos: fields.straddlePos,
      seats: fields.seats || [],
      pot: fields.pot || 0,
      startTime: fields.startTime,
      boardCards: null,
      holeCards: null,
      actions: [],
      pots: [],
      showdown: null,
      result: null,
    };
    this._setPhase('PREFLOP');
    this.emit('hand-start', {
      roomId: fields.roomId,
      dealerPos: fields.dealerPos,
      sbPos: fields.sbPos,
      bbPos: fields.bbPos,
      seats: fields.seats,
      handNum: this._handNum,
    });
  }

  _onHoleCards(fields) {
    if (this._currentHand) {
      this._currentHand.holeCards = fields.cards;
    }
  }

  _onBoardCards(fields) {
    if (!this._currentHand) return;
    this._currentHand.boardCards = fields.cards;
    const cardCount = fields.cards ? fields.cards.length : 0;
    let street;
    if (cardCount <= 3) street = 'FLOP';
    else if (cardCount === 4) street = 'TURN';
    else street = 'RIVER';
    this._setPhase(street);
    this.emit('street-change', { street, boardCards: fields.cards });
  }

  _onPlayerAction(fields) {
    if (!this._currentHand) return;
    const entry = {
      seatNum: fields.seatNum,
      action: fields.action,
      actionName: ActionName[fields.action] || `UNKNOWN(${fields.action})`,
      deskCoin: fields.deskCoin,
      leftCoin: fields.leftCoin,
      sittingOut: fields.sittingOut,
    };
    this._currentHand.actions.push(entry);
    this.emit('action', entry);
  }

  _onNeedAction(fields) {
    if (this._currentHand) {
      this._currentHand.currentAction = fields;
    }
  }

  _onPots(fields) {
    if (this._currentHand) {
      this._currentHand.pots = fields.pots || [];
    }
  }

  _onShowdown(fields) {
    if (!this._currentHand) return;
    this._currentHand.showdown = fields;
    this._setPhase('SHOWDOWN');
    this.emit('showdown', {
      players: fields.players,
      winners: fields.winners,
    });
  }

  _onRoundResult(fields) {
    if (!this._currentHand) return;
    this._currentHand.result = fields;
    this._setPhase('RESULT');
    this.emit('hand-end', {
      roomId: fields.roomId,
      players: fields.players,
      handNum: this._handNum,
    });
    // Transition back to idle
    this._setPhase('IDLE');
  }
}

module.exports = HandTracker;
