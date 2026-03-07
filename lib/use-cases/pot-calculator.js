'use strict';

const { EventEmitter } = require('events');
const { MessageId } = require('../proto/enums');

/**
 * PotCalculator — tracks pot progression through streets using PotsMsg and PlayerActionMsg.
 *
 * Events:
 *   'pot-update'   — { mainPot, sidePots, total }
 *   'street-pot'   — { street, pots } when board cards indicate new street
 */
class PotCalculator extends EventEmitter {
  constructor() {
    super();
    this._mainPot = 0;
    this._sidePots = [];
    this._total = 0;
    this._lastShared = 0;
    this._streetPots = []; // pot totals at each street transition
    this._currentStreet = 'PREFLOP';
  }

  get mainPot() { return this._mainPot; }
  get sidePots() { return [...this._sidePots]; }
  get total() { return this._total; }
  get lastShared() { return this._lastShared; }
  get streetHistory() { return [...this._streetPots]; }

  onMessage(msg) {
    switch (msg.topic) {
      case MessageId.PotsMsg:
        this._onPots(msg.fields);
        break;
      case MessageId.BoardCardsMsg:
        this._onBoardCards(msg.fields);
        break;
      case MessageId.DealerPosMsg:
        this._onDealerPos(msg.fields);
        break;
      case MessageId.RoundResultMsg:
        this._onRoundResult(msg.fields);
        break;
    }
  }

  _onPots(fields) {
    const pots = fields.pots || [];
    this._mainPot = pots[0] || 0;
    this._sidePots = pots.slice(1);
    this._total = pots.reduce((s, p) => s + p, 0);
    this._lastShared = fields.lastShared || 0;
    this.emit('pot-update', {
      mainPot: this._mainPot,
      sidePots: this._sidePots,
      total: this._total,
      lastShared: this._lastShared,
    });
  }

  _onBoardCards(fields) {
    const count = fields.cards ? fields.cards.length : 0;
    let street;
    if (count <= 3) street = 'FLOP';
    else if (count === 4) street = 'TURN';
    else street = 'RIVER';

    if (street !== this._currentStreet) {
      this._streetPots.push({
        street: this._currentStreet,
        total: this._total,
        mainPot: this._mainPot,
        sidePots: [...this._sidePots],
      });
      this._currentStreet = street;
      this.emit('street-pot', { street, pots: { mainPot: this._mainPot, sidePots: this._sidePots, total: this._total } });
    }
  }

  _onDealerPos(_fields) {
    // Reset for new hand
    this._mainPot = 0;
    this._sidePots = [];
    this._total = 0;
    this._lastShared = 0;
    this._streetPots = [];
    this._currentStreet = 'PREFLOP';
  }

  _onRoundResult(_fields) {
    // Record final pot snapshot
    this._streetPots.push({
      street: this._currentStreet,
      total: this._total,
      mainPot: this._mainPot,
      sidePots: [...this._sidePots],
    });
  }
}

module.exports = PotCalculator;
