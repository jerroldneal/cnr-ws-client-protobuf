'use strict';

const { EventEmitter } = require('events');
const { MessageId, ActionName, MttRoomStatusName } = require('../proto/enums');

/**
 * Spectator — passive game observation. Subscribes to all incoming messages
 * and maintains a read-only view of the table without sending any C→S messages
 * (except auth, handled by ConnectionManager).
 *
 * Events:
 *   'dealer'        — DealerPosMsg decoded
 *   'hole-cards'    — HoleCardsMsg decoded
 *   'board-cards'   — BoardCardsMsg decoded
 *   'need-action'   — NeedActionMsg decoded
 *   'player-action' — PlayerActionMsg decoded
 *   'player-state'  — PlayerStateMsg decoded
 *   'showdown'      — ShowdownMsg decoded
 *   'round-result'  — RoundResultMsg decoded
 *   'pots'          — PotsMsg decoded
 *   'snapshot'      — RoomSnapshotMsg decoded
 *   'seat-occupied' — SeatOccupiedMsg decoded
 *   'seat-empty'    — SeatEmptyMsg decoded
 *   'player-leave'  — PlayerLeaveMsg decoded
 *   'nickname-change' — PlayerNickNameChangeMsg decoded
 *   'blind-change'  — ChangeBlindMsg decoded
 *   'auto-play'     — AutoPlayMsg decoded
 *   'update'        — any state-changing event (generic)
 */
class Spectator extends EventEmitter {
  constructor() {
    super();
    this._handlers = new Map([
      [MessageId.RoomSnapshotMsg, (f) => this._onSnapshot(f)],
      [MessageId.DealerPosMsg, (f) => this._emit('dealer', f)],
      [MessageId.HoleCardsMsg, (f) => this._emit('hole-cards', f)],
      [MessageId.BoardCardsMsg, (f) => this._emit('board-cards', f)],
      [MessageId.NeedActionMsg, (f) => this._emit('need-action', f)],
      [MessageId.PlayerActionMsg, (f) => this._emit('player-action', f)],
      [MessageId.PlayerStateMsg, (f) => this._emit('player-state', f)],
      [MessageId.ShowdownMsg, (f) => this._emit('showdown', f)],
      [MessageId.RoundResultMsg, (f) => this._emit('round-result', f)],
      [MessageId.PotsMsg, (f) => this._emit('pots', f)],
      [MessageId.SeatOccupiedMsg, (f) => this._emit('seat-occupied', f)],
      [MessageId.SeatEmptyMsg, (f) => this._emit('seat-empty', f)],
      [MessageId.PlayerLeaveMsg, (f) => this._emit('player-leave', f)],
      [MessageId.PlayerNickNameChangeMsg, (f) => this._emit('nickname-change', f)],
      [MessageId.ChangeBlindMsg, (f) => this._emit('blind-change', f)],
      [MessageId.AutoPlayMsg, (f) => this._emit('auto-play', f)],
      [MessageId.HoleCardListMsg, (f) => this._emit('hole-card-list', f)],
    ]);
  }

  /**
   * Feed decoded messages from ConnectionManager.
   * @param {{ topic: number, name: string, fields: object }} msg
   */
  onMessage(msg) {
    const handler = this._handlers.get(msg.topic);
    if (handler) handler(msg.fields);
  }

  _onSnapshot(fields) {
    this.emit('snapshot', fields);
    this.emit('update', { type: 'snapshot', fields });
  }

  _emit(event, fields) {
    this.emit(event, fields);
    this.emit('update', { type: event, fields });
  }
}

module.exports = Spectator;
