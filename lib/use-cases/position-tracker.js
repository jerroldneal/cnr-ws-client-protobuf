'use strict';

const { EventEmitter } = require('events');
const { MessageId } = require('../proto/enums');

/**
 * PositionTracker — tracks dealer button, SB, BB, and relative positions to hero.
 *
 * Events:
 *   'positions-updated' — { dealerPos, sbPos, bbPos, heroPosition }
 */
class PositionTracker extends EventEmitter {
  constructor() {
    super();
    this._dealerPos = -1;
    this._sbPos = -1;
    this._bbPos = -1;
    this._straddlePos = -1;
    this._heroSeat = -1;
    this._seatCount = 0;
    this._occupiedSeats = new Set();
  }

  get dealerPos() { return this._dealerPos; }
  get sbPos() { return this._sbPos; }
  get bbPos() { return this._bbPos; }
  get straddlePos() { return this._straddlePos; }
  set heroSeat(seat) { this._heroSeat = seat; }

  /**
   * Get hero's position relative to the dealer.
   * Returns: 'BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'MP', 'CO', etc.
   */
  get heroPosition() {
    if (this._heroSeat < 0) return null;
    if (this._heroSeat === this._dealerPos) return 'BTN';
    if (this._heroSeat === this._sbPos) return 'SB';
    if (this._heroSeat === this._bbPos) return 'BB';
    return this._calcPosition(this._heroSeat);
  }

  getPositionForSeat(seatNum) {
    if (seatNum === this._dealerPos) return 'BTN';
    if (seatNum === this._sbPos) return 'SB';
    if (seatNum === this._bbPos) return 'BB';
    return this._calcPosition(seatNum);
  }

  onMessage(msg) {
    switch (msg.topic) {
      case MessageId.DealerPosMsg:
        this._onDealerPos(msg.fields);
        break;
      case MessageId.RoomSnapshotMsg:
        this._onSnapshot(msg.fields);
        break;
      case MessageId.SeatOccupiedMsg:
        this._occupiedSeats.add(msg.fields.seatNum);
        break;
      case MessageId.SeatEmptyMsg:
        this._occupiedSeats.delete(msg.fields.seatNum);
        break;
    }
  }

  _onSnapshot(fields) {
    this._dealerPos = fields.dealerPos;
    this._sbPos = fields.sbPos;
    this._bbPos = fields.bbPos;
    this._straddlePos = fields.straddlePos || -1;
    this._occupiedSeats.clear();
    if (fields.players) {
      for (const p of fields.players) {
        this._occupiedSeats.add(p.seatNum);
      }
    }
  }

  _onDealerPos(fields) {
    this._dealerPos = fields.dealerPos;
    this._sbPos = fields.sbPos;
    this._bbPos = fields.bbPos;
    this._straddlePos = fields.straddlePos || -1;
    if (fields.seats) {
      this._occupiedSeats.clear();
      for (const s of fields.seats) {
        this._occupiedSeats.add(s.seatNum);
      }
    }
    this.emit('positions-updated', {
      dealerPos: this._dealerPos,
      sbPos: this._sbPos,
      bbPos: this._bbPos,
      straddlePos: this._straddlePos,
      heroPosition: this.heroPosition,
    });
  }

  _calcPosition(seatNum) {
    // Get seats in order clockwise from BB
    const occupied = [...this._occupiedSeats].sort((a, b) => a - b);
    if (occupied.length <= 3) return 'EP'; // heads-up or 3-max, no meaningful position names beyond BTN/SB/BB

    // Find index of BB and target seat in clockwise order
    const bbIdx = occupied.indexOf(this._bbPos);
    const seatIdx = occupied.indexOf(seatNum);
    if (bbIdx < 0 || seatIdx < 0) return 'UNKNOWN';

    // Distance from BB clockwise
    const count = occupied.length;
    const dist = (seatIdx - bbIdx + count) % count;

    // Position names based on table size
    const seatsAfterBB = count - 3; // exclude BTN, SB, BB
    if (dist === 0) return 'BB';
    if (dist === 1) return 'UTG';
    if (dist === 2 && seatsAfterBB > 1) return 'UTG+1';
    if (dist === seatsAfterBB && seatsAfterBB > 0) return 'CO';
    if (dist > seatsAfterBB) return 'BTN'; // shouldn't happen but safety
    return 'MP';
  }
}

module.exports = PositionTracker;
