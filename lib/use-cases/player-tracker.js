'use strict';

const { EventEmitter } = require('events');
const { MessageId } = require('../proto/enums');

/**
 * PlayerTracker — tracks all players across joins/leaves/seat changes.
 * Maintains a registry keyed by seatNum with player info.
 *
 * Events:
 *   'player-seated'    — { seatNum, userId, nickName, coin, ... }
 *   'player-left'      — { seatNum, userId }
 *   'seat-emptied'     — { seatNum }
 *   'player-updated'   — { seatNum, field, oldValue, newValue }
 *   'snapshot-loaded'  — { playerCount }
 */
class PlayerTracker extends EventEmitter {
  constructor() {
    super();
    // Map<seatNum, PlayerInfo>
    this._seats = new Map();
    // Map<userId, seatNum>
    this._userToSeat = new Map();
  }

  get seats() { return new Map(this._seats); }
  get playerCount() { return this._seats.size; }

  getPlayerBySeat(seatNum) {
    return this._seats.get(seatNum) || null;
  }

  getPlayerByUserId(userId) {
    const seat = this._userToSeat.get(userId);
    return seat != null ? this._seats.get(seat) : null;
  }

  getSeatByUserId(userId) {
    return this._userToSeat.get(userId) ?? null;
  }

  getAllPlayers() {
    return [...this._seats.values()];
  }

  onMessage(msg) {
    switch (msg.topic) {
      case MessageId.RoomSnapshotMsg:
        this._onSnapshot(msg.fields);
        break;
      case MessageId.SeatOccupiedMsg:
        this._onSeatOccupied(msg.fields);
        break;
      case MessageId.SeatEmptyMsg:
        this._onSeatEmpty(msg.fields);
        break;
      case MessageId.PlayerLeaveMsg:
        this._onPlayerLeave(msg.fields);
        break;
      case MessageId.PlayerActionMsg:
        this._onPlayerAction(msg.fields);
        break;
      case MessageId.PlayerStateMsg:
        this._onPlayerState(msg.fields);
        break;
      case MessageId.PlayerNickNameChangeMsg:
        this._onNickNameChange(msg.fields);
        break;
      case MessageId.DealerPosMsg:
        this._onDealerPos(msg.fields);
        break;
      case MessageId.RoundResultMsg:
        this._onRoundResult(msg.fields);
        break;
    }
  }

  _onSnapshot(fields) {
    this._seats.clear();
    this._userToSeat.clear();
    if (fields.players) {
      for (const p of fields.players) {
        const info = {
          userId: p.userId,
          nickName: p.nickName,
          seatNum: p.seatNum,
          deskCoin: p.deskCoin,
          leftCoin: p.leftCoin,
          state: p.state,
          flags: p.flags,
          gender: p.gender,
          avatar: p.avatar,
          avatarFrame: p.avatarFrame,
          areaCode: p.areaCode,
        };
        this._seats.set(p.seatNum, info);
        this._userToSeat.set(p.userId, p.seatNum);
      }
    }
    this.emit('snapshot-loaded', { playerCount: this._seats.size });
  }

  _onSeatOccupied(fields) {
    const info = {
      userId: fields.userId,
      nickName: fields.nickName,
      seatNum: fields.seatNum,
      deskCoin: fields.coin,
      leftCoin: 0,
      state: 0,
      flags: 0,
      gender: fields.gender,
      avatar: fields.avatar,
      avatarFrame: fields.avatarFrame,
      areaCode: fields.areaCode,
    };
    this._seats.set(fields.seatNum, info);
    this._userToSeat.set(fields.userId, fields.seatNum);
    this.emit('player-seated', info);
  }

  _onSeatEmpty(fields) {
    const existing = this._seats.get(fields.seatNum);
    if (existing) {
      this._userToSeat.delete(existing.userId);
    }
    this._seats.delete(fields.seatNum);
    this.emit('seat-emptied', { seatNum: fields.seatNum });
  }

  _onPlayerLeave(fields) {
    const seat = this._userToSeat.get(fields.userId);
    if (seat != null) {
      this._seats.delete(seat);
      this._userToSeat.delete(fields.userId);
      this.emit('player-left', { seatNum: seat, userId: fields.userId });
    }
  }

  _onPlayerAction(fields) {
    const player = this._seats.get(fields.seatNum);
    if (!player) return;
    player.deskCoin = fields.deskCoin;
    player.leftCoin = fields.leftCoin;
  }

  _onPlayerState(fields) {
    const player = this._seats.get(fields.seatNum);
    if (!player) return;
    const old = player.state;
    player.state = fields.state;
    this.emit('player-updated', { seatNum: fields.seatNum, field: 'state', oldValue: old, newValue: fields.state });
  }

  _onNickNameChange(fields) {
    const seat = this._userToSeat.get(fields.userId);
    if (seat == null) return;
    const player = this._seats.get(seat);
    if (!player) return;
    const old = player.nickName;
    player.nickName = fields.nickName;
    player.avatar = fields.avatar;
    this.emit('player-updated', { seatNum: seat, field: 'nickName', oldValue: old, newValue: fields.nickName });
  }

  _onDealerPos(fields) {
    if (fields.seats) {
      for (const s of fields.seats) {
        const player = this._seats.get(s.seatNum);
        if (player) {
          player.deskCoin = s.deskCoin;
          player.leftCoin = s.leftCoin;
        }
      }
    }
  }

  _onRoundResult(fields) {
    if (fields.players) {
      for (const p of fields.players) {
        const player = this._seats.get(p.seatNum);
        if (player) {
          player.leftCoin = p.leftCoins;
        }
      }
    }
  }
}

module.exports = PlayerTracker;
