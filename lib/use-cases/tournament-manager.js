'use strict';

const { EventEmitter } = require('events');
const { MessageId, ActionName, MttStatus, MttStatusName, JoinType } = require('../proto/enums');

/**
 * TournamentManager — tournament lifecycle tracking.
 *
 * Events:
 *   'entered'          — Successfully entered tournament
 *   'blind-change'     — { riseIndex, riseLeftTime }
 *   'rank-update'      — { rank, playerCount, wins, bounty }
 *   'room-change'      — { mttId, newRoomId }
 *   'player-eliminated' — { userId }
 *   'status-change'    — { mttId, status, statusName }
 *   'rebuy-available'  — { allow, leftTime }
 *   'morebuy-available' — { allow, leftTime }
 *   'reward'           — { rank, reward, rewardType }
 *   'tournament-end'   — { mttId }
 *   'notification'     — { message }
 *   'rest-time'        — { restLeftTime }
 */
class TournamentManager extends EventEmitter {
  constructor(sendFn) {
    super();
    this._send = sendFn;
    this._mttId = null;
    this._roomId = null;
    this._status = null;
    this._rank = null;
    this._playerCount = 0;
    this._blindIndex = 0;
    this._snapshot = null;
    this._rewards = [];
  }

  get mttId() { return this._mttId; }
  get roomId() { return this._roomId; }
  get status() { return this._status; }
  get rank() { return this._rank; }
  get playerCount() { return this._playerCount; }
  get blindIndex() { return this._blindIndex; }
  get snapshot() { return this._snapshot; }
  get rewards() { return [...this._rewards]; }

  onMessage(msg) {
    switch (msg.topic) {
      case MessageId.MttEnterGameRes:
        this._onEnterGameRes(msg.fields);
        break;
      case MessageId.MttRoomSnapshotRes:
        this._onMttSnapshot(msg.fields);
        break;
      case MessageId.RiseBlindNotifyMsg:
        this._onBlindChange(msg.fields);
        break;
      case MessageId.MttUserRankMsg:
        this._onUserRank(msg.fields);
        break;
      case MessageId.MttUserOutMsg:
        this._onUserOut(msg.fields);
        break;
      case MessageId.MttRoomChangeMsg:
        this._onRoomChange(msg.fields);
        break;
      case MessageId.MttStateNotifyMsg:
        this._onStateNotify(msg.fields);
        break;
      case MessageId.MttRebuyMsg:
        this._onRebuy(msg.fields);
        break;
      case MessageId.MttMorebuyMsg:
        this._onMorebuy(msg.fields);
        break;
      case MessageId.RewardMsg:
        this._onReward(msg.fields);
        break;
      case MessageId.MttNotifyMsg:
        this._onNotify(msg.fields);
        break;
      case MessageId.MttRoomEndNotifyMsg:
        this._onRoomEnd(msg.fields);
        break;
      case MessageId.MttRestTimeNotifyMsg:
        this._onRestTime(msg.fields);
        break;
      case MessageId.MttRoomRankNotifyMsg:
        this._onRoomRank(msg.fields);
        break;
      case MessageId.MttRoomStatusChangeMsg:
        this._onRoomStatusChange(msg.fields);
        break;
    }
  }

  enterTournament(mttId, roomId, userId) {
    this._mttId = mttId;
    const { encodeWrapper } = require('../proto/wrapper');
    const { encodeMttEnterGameReq } = require('../proto/tournament');
    const { topic, body } = encodeMttEnterGameReq({ mttId, roomId, userId });
    this._send(topic, body);
  }

  rejoin(mttId, joinType = JoinType.ReJoin, ticketId = 0) {
    const { encodeReJoinReq } = require('../proto/tournament');
    const { topic, body } = encodeReJoinReq({ mttId, joinType, TicketId: ticketId });
    this._send(topic, body);
  }

  requestSnapshot(mttId) {
    const { encodeMttRoomSnapshotReq } = require('../proto/tournament');
    const { topic, body } = encodeMttRoomSnapshotReq({ mttId: mttId || this._mttId });
    this._send(topic, body);
  }

  cancelBuy(typeId, mttId) {
    const { encodeMttCancelBuyReq } = require('../proto/tournament');
    const { topic, body } = encodeMttCancelBuyReq({ typeId, mttId: mttId || this._mttId });
    this._send(topic, body);
  }

  _onEnterGameRes(fields) {
    this._mttId = fields.mttId;
    if (fields.code === 0) {
      this.emit('entered', { mttId: fields.mttId, leftPrepareTime: fields.leftPrepareTime });
    } else {
      this.emit('error', { type: 'enter-failed', code: fields.code, mttId: fields.mttId });
    }
  }

  _onMttSnapshot(fields) {
    this._snapshot = fields;
    this._mttId = fields.mttId;
    this._roomId = fields.roomId;
    this._status = fields.mttStatus;
    this._blindIndex = fields.blindIndex;
  }

  _onBlindChange(fields) {
    this._blindIndex = fields.riseIndex;
    this.emit('blind-change', { riseIndex: fields.riseIndex, riseLeftTime: fields.riseLeftTime });
  }

  _onUserRank(fields) {
    this._rank = fields.rank;
    this._playerCount = fields.PlayerCount;
    this.emit('rank-update', {
      rank: fields.rank,
      playerCount: fields.PlayerCount,
      wins: fields.wins,
      bounty: fields.bounty,
      value: fields.value,
    });
  }

  _onUserOut(fields) {
    this.emit('player-eliminated', { userId: fields.userId, roomId: fields.roomId });
  }

  _onRoomChange(fields) {
    this._roomId = fields.roomId;
    this.emit('room-change', { mttId: fields.mttId, newRoomId: fields.roomId });
  }

  _onStateNotify(fields) {
    this._status = fields.status;
    const name = MttStatusName[fields.status] || `Unknown(${fields.status})`;
    this.emit('status-change', { mttId: fields.mttId, status: fields.status, statusName: name });
    if (fields.status === MttStatus.end) {
      this.emit('tournament-end', { mttId: fields.mttId });
    }
  }

  _onRebuy(fields) {
    this.emit('rebuy-available', { allow: fields.allow, leftTime: fields.leftTime });
  }

  _onMorebuy(fields) {
    this.emit('morebuy-available', { allow: fields.allow, leftTime: fields.leftTime });
  }

  _onReward(fields) {
    this._rewards.push(fields);
    this.emit('reward', { rank: fields.rank, reward: fields.reward, rewardType: fields.rewardType, mttName: fields.mttName });
  }

  _onNotify(fields) {
    this.emit('notification', { message: fields.message, messageI18N: fields.messageI18N, tipsType: fields.tipsType });
  }

  _onRoomEnd(fields) {
    this.emit('room-end', { mttId: fields.mttId, roomId: fields.roomId });
  }

  _onRestTime(fields) {
    this.emit('rest-time', { restLeftTime: fields.restLeftTime });
  }

  _onRoomRank(fields) {
    this._playerCount = fields.curPlayer;
    this.emit('room-rank', {
      mttName: fields.mttName,
      allPlayerCount: fields.allPlayerCount,
      curPlayer: fields.curPlayer,
      prizePool: fields.PrizePool,
      blindLevel: fields.BlindLevel,
      players: fields.players,
    });
  }

  _onRoomStatusChange(fields) {
    this.emit('room-status-change', { mttId: fields.mttId, roomId: fields.roomId, status: fields.status });
  }
}

module.exports = TournamentManager;
