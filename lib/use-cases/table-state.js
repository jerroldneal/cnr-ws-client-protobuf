'use strict';

const { EventEmitter } = require('events');
const { MessageId, ActionName, PlayerStateName } = require('../proto/enums');

/**
 * TableState — the "god view" aggregate of all real-time table state.
 *
 * Consumes every decoded message and maintains a single unified state object:
 *   - roomId, handNum, street, dealerSeat, blinds
 *   - players map (seat → player info)
 *   - hero hole cards
 *   - board cards
 *   - pots
 *   - current action seat + options
 *   - last action per seat
 *
 * Events:
 *   'state-change' — emitted on every meaningful update with { key, value }
 *   'new-hand'     — emitted when a new hand starts
 */
class TableState extends EventEmitter {
  constructor(heroUserId) {
    super();
    this._heroUserId = heroUserId || null;
    this._heroSeat = null;

    this._roomId = null;
    this._roomConf = null;
    this._handNum = null;
    this._dealerSeat = null;
    this._smallBlind = 0;
    this._bigBlind = 0;
    this._ante = 0;
    this._street = 'idle';
    this._board = [];
    this._pots = [];
    this._potTotal = 0;

    this._players = new Map();
    this._holeCards = new Map();
    this._currentAction = null;
    this._lastActions = new Map();

    this._showdown = [];
    this._result = [];

    this._paused = false;
    this._autoPlay = new Map();
  }

  get roomId() { return this._roomId; }
  get handNum() { return this._handNum; }
  get street() { return this._street; }
  get dealerSeat() { return this._dealerSeat; }
  get smallBlind() { return this._smallBlind; }
  get bigBlind() { return this._bigBlind; }
  get ante() { return this._ante; }
  get board() { return [...this._board]; }
  get pots() { return [...this._pots]; }
  get potTotal() { return this._potTotal; }
  get heroSeat() { return this._heroSeat; }
  get heroUserId() { return this._heroUserId; }
  get currentAction() { return this._currentAction; }
  get paused() { return this._paused; }

  getPlayer(seatNum) {
    return this._players.get(seatNum) || null;
  }

  getAllPlayers() {
    const result = {};
    for (const [seat, p] of this._players) {
      result[seat] = { ...p };
    }
    return result;
  }

  getOccupiedSeats() {
    return [...this._players.keys()].sort((a, b) => a - b);
  }

  getPlayerCount() {
    return this._players.size;
  }

  getHoleCards(seatNum) {
    return this._holeCards.get(seatNum) || null;
  }

  getHeroCards() {
    return this._heroSeat != null ? this._holeCards.get(this._heroSeat) || null : null;
  }

  getLastAction(seatNum) {
    return this._lastActions.get(seatNum) || null;
  }

  isHeroTurn() {
    return this._currentAction && this._currentAction.seatNum === this._heroSeat;
  }

  getSnapshot() {
    return {
      roomId: this._roomId,
      handNum: this._handNum,
      street: this._street,
      dealerSeat: this._dealerSeat,
      blinds: { small: this._smallBlind, big: this._bigBlind, ante: this._ante },
      board: [...this._board],
      pots: [...this._pots],
      potTotal: this._potTotal,
      heroSeat: this._heroSeat,
      playerCount: this._players.size,
      players: this.getAllPlayers(),
      holeCards: Object.fromEntries(this._holeCards),
      currentAction: this._currentAction ? { ...this._currentAction } : null,
      showdown: [...this._showdown],
      result: [...this._result],
      paused: this._paused,
    };
  }

  onMessage(msg) {
    switch (msg.topic) {
      case MessageId.RoomSnapshotMsg:
        this._onRoomSnapshot(msg.fields);
        break;
      case MessageId.RoomConfRes:
        this._onRoomConf(msg.fields);
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
      case MessageId.DealerPosMsg:
        this._onDealerPos(msg.fields);
        break;
      case MessageId.HoleCardsMsg:
        this._onHoleCards(msg.fields);
        break;
      case MessageId.BoardCardsMsg:
        this._onBoardCards(msg.fields);
        break;
      case MessageId.NeedActionMsg:
        this._onNeedAction(msg.fields);
        break;
      case MessageId.PlayerActionMsg:
        this._onPlayerAction(msg.fields);
        break;
      case MessageId.PlayerStateMsg:
        this._onPlayerState(msg.fields);
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
      case MessageId.PauseGameRes:
        this._paused = true;
        this._emit('paused', true);
        break;
      case MessageId.ResumeGameRes:
        this._paused = false;
        this._emit('paused', false);
        break;
      case MessageId.AutoPlayMsg:
        this._onAutoPlay(msg.fields);
        break;
      case MessageId.CancelAutoPlayRes:
        this._autoPlay.delete(msg.fields.seatNum);
        break;
      case MessageId.ChangeBlindMsg:
        this._onChangeBlind(msg.fields);
        break;
    }
  }

  _onRoomSnapshot(fields) {
    this._roomId = fields.roomId;
    this._handNum = fields.handNum;
    this._smallBlind = fields.smallBlind || 0;
    this._bigBlind = fields.bigBlind || 0;

    this._players.clear();
    if (fields.players) {
      for (const p of fields.players) {
        this._players.set(p.seatNum, {
          seatNum: p.seatNum,
          userId: p.userId,
          nickName: p.nickName,
          coin: p.coin,
          photo: p.photo,
          state: p.state,
          betChip: p.betChip || 0,
        });
        if (p.userId === this._heroUserId) {
          this._heroSeat = p.seatNum;
        }
      }
    }

    if (fields.currentAct) {
      this._currentAction = {
        seatNum: fields.currentAct.seatNum,
        optAction: fields.currentAct.optAction,
        minChip: fields.currentAct.minChip,
        maxChip: fields.currentAct.maxChip,
        potChip: fields.currentAct.potChip,
        leftTime: fields.currentAct.leftTime,
      };
    }

    this._emit('snapshot-loaded', this.getSnapshot());
  }

  _onRoomConf(fields) {
    this._roomConf = fields;
    this._smallBlind = fields.smallBlind || this._smallBlind;
    this._bigBlind = fields.bigBlind || this._bigBlind;
    this._ante = fields.ante || 0;
  }

  _onSeatOccupied(fields) {
    this._players.set(fields.seatNum, {
      seatNum: fields.seatNum,
      userId: fields.userId,
      nickName: fields.nickName,
      coin: fields.coin,
      photo: fields.photo,
      state: 0,
      betChip: 0,
    });
    if (fields.userId === this._heroUserId) {
      this._heroSeat = fields.seatNum;
    }
    this._emit('player-seated', { seatNum: fields.seatNum, userId: fields.userId });
  }

  _onSeatEmpty(fields) {
    const player = this._players.get(fields.seatNum);
    if (player && player.userId === this._heroUserId) {
      this._heroSeat = null;
    }
    this._players.delete(fields.seatNum);
    this._holeCards.delete(fields.seatNum);
    this._lastActions.delete(fields.seatNum);
    this._emit('player-left', { seatNum: fields.seatNum });
  }

  _onPlayerLeave(fields) {
    this._onSeatEmpty(fields);
  }

  _onDealerPos(fields) {
    this._handNum = fields.handNum;
    this._dealerSeat = fields.dealerSeat;
    this._smallBlind = fields.smallBlind || this._smallBlind;
    this._bigBlind = fields.bigBlind || this._bigBlind;
    this._ante = fields.ante || this._ante;
    this._street = 'preflop';
    this._board = [];
    this._pots = [];
    this._potTotal = 0;
    this._holeCards.clear();
    this._lastActions.clear();
    this._currentAction = null;
    this._showdown = [];
    this._result = [];

    for (const [seat, p] of this._players) {
      p.betChip = 0;
    }

    this._emit('new-hand', {
      handNum: fields.handNum,
      dealerSeat: fields.dealerSeat,
      blinds: { small: this._smallBlind, big: this._bigBlind, ante: this._ante },
    });
    this.emit('new-hand', {
      handNum: fields.handNum,
      dealerSeat: fields.dealerSeat,
    });
  }

  _onHoleCards(fields) {
    this._holeCards.set(fields.seatNum, fields.cards || []);
    this._emit('hole-cards', { seatNum: fields.seatNum, cards: fields.cards });
  }

  _onBoardCards(fields) {
    this._board = fields.cards || [];
    const count = this._board.length;
    if (count <= 3) this._street = 'flop';
    else if (count === 4) this._street = 'turn';
    else if (count >= 5) this._street = 'river';
    this._emit('board', { cards: this._board, street: this._street });
  }

  _onNeedAction(fields) {
    this._currentAction = {
      seatNum: fields.seatNum,
      optAction: fields.optAction,
      minChip: fields.minChip,
      maxChip: fields.maxChip,
      potChip: fields.potChip,
      leftTime: fields.leftTime,
      roomId: fields.roomId,
      handNum: fields.handNum,
    };
    this._emit('need-action', this._currentAction);
  }

  _onPlayerAction(fields) {
    const actionName = ActionName[fields.action] || `Unknown(${fields.action})`;
    this._lastActions.set(fields.seatNum, {
      action: fields.action,
      actionName,
      coin: fields.coin,
      ts: Date.now(),
    });

    const player = this._players.get(fields.seatNum);
    if (player && fields.coin > 0) {
      player.betChip = (player.betChip || 0) + fields.coin;
    }

    if (this._currentAction && this._currentAction.seatNum === fields.seatNum) {
      this._currentAction = null;
    }

    this._emit('player-action', { seatNum: fields.seatNum, action: fields.action, actionName, coin: fields.coin });
  }

  _onPlayerState(fields) {
    const player = this._players.get(fields.seatNum);
    if (player) {
      player.state = fields.state;
      player.coin = fields.coin;
    }
  }

  _onPots(fields) {
    this._pots = fields.pots || [];
    this._potTotal = this._pots.reduce((sum, p) => sum + (p || 0), 0);
    this._emit('pots', { pots: this._pots, total: this._potTotal });
  }

  _onShowdown(fields) {
    this._street = 'showdown';
    this._showdown = (fields.players || []).map(p => ({
      seatNum: p.seatNum,
      cards: p.cards,
      handType: p.handType,
    }));
    this._emit('showdown', { players: this._showdown });
  }

  _onRoundResult(fields) {
    this._street = 'result';
    this._result = (fields.players || []).map(p => ({
      seatNum: p.seatNum,
      win: p.win,
      coin: p.coin,
      pot: p.pot,
      handType: p.handType,
    }));

    for (const r of this._result) {
      const player = this._players.get(r.seatNum);
      if (player) {
        player.coin = r.coin;
      }
    }

    this._emit('round-result', { players: this._result });
  }

  _onAutoPlay(fields) {
    this._autoPlay.set(fields.seatNum, fields.action);
  }

  _onChangeBlind(fields) {
    this._smallBlind = fields.smallBlind || this._smallBlind;
    this._bigBlind = fields.bigBlind || this._bigBlind;
    this._emit('blind-change', { small: this._smallBlind, big: this._bigBlind });
  }

  _emit(key, value) {
    this.emit('state-change', { key, value });
  }
}

module.exports = TableState;
