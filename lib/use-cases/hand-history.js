'use strict';

const { EventEmitter } = require('events');
const { MessageId, ActionName } = require('../proto/enums');

/**
 * HandHistory — records complete hand histories from protocol messages.
 *
 * Each completed hand produces a structured record with:
 *   - handNum, roomId, blinds, dealerSeat
 *   - players (snapshot at start)
 *   - holeCards (per seat)
 *   - streets: { preflop, flop, turn, river } — each with actions[] and board[]
 *   - showdown players
 *   - result per seat (win/loss, pot, handType)
 *   - timestamps
 *
 * Events:
 *   'hand-complete' — { record } — full hand history record
 */
class HandHistory extends EventEmitter {
  constructor() {
    super();
    this._history = [];
    this._maxHistory = 200;
    this._current = null;
    this._players = new Map();
  }

  get history() { return this._history; }
  get currentHand() { return this._current; }

  getHand(index) {
    return this._history[index] || null;
  }

  getLast(n = 1) {
    return this._history.slice(-n);
  }

  clear() {
    this._history = [];
    this._current = null;
  }

  onMessage(msg) {
    switch (msg.topic) {
      case MessageId.RoomSnapshotMsg:
        this._loadPlayers(msg.fields);
        break;
      case MessageId.SeatOccupiedMsg:
        this._seatOccupied(msg.fields);
        break;
      case MessageId.SeatEmptyMsg:
        this._seatEmpty(msg.fields);
        break;
      case MessageId.DealerPosMsg:
        this._startNewHand(msg.fields);
        break;
      case MessageId.HoleCardsMsg:
        this._recordHoleCards(msg.fields);
        break;
      case MessageId.BoardCardsMsg:
        this._recordBoard(msg.fields);
        break;
      case MessageId.NeedActionMsg:
        this._recordNeedAction(msg.fields);
        break;
      case MessageId.PlayerActionMsg:
        this._recordAction(msg.fields);
        break;
      case MessageId.PotsMsg:
        this._recordPots(msg.fields);
        break;
      case MessageId.ShowdownMsg:
        this._recordShowdown(msg.fields);
        break;
      case MessageId.RoundResultMsg:
        this._recordResult(msg.fields);
        break;
    }
  }

  _loadPlayers(fields) {
    this._players.clear();
    if (fields.players) {
      for (const p of fields.players) {
        this._players.set(p.seatNum, {
          seatNum: p.seatNum,
          userId: p.userId,
          nickName: p.nickName,
          coin: p.coin,
        });
      }
    }
  }

  _seatOccupied(fields) {
    this._players.set(fields.seatNum, {
      seatNum: fields.seatNum,
      userId: fields.userId,
      nickName: fields.nickName,
      coin: fields.coin,
    });
  }

  _seatEmpty(fields) {
    this._players.delete(fields.seatNum);
  }

  _startNewHand(fields) {
    if (this._current && this._current.result) {
      this._finalize();
    }

    const playersSnapshot = {};
    for (const [seat, p] of this._players) {
      playersSnapshot[seat] = { ...p };
    }

    this._current = {
      handNum: fields.handNum,
      roomId: fields.roomId || null,
      dealerSeat: fields.dealerSeat,
      smallBlind: fields.smallBlind,
      bigBlind: fields.bigBlind,
      ante: fields.ante || 0,
      players: playersSnapshot,
      holeCards: {},
      streets: {
        preflop: { actions: [], board: [] },
        flop: { actions: [], board: [] },
        turn: { actions: [], board: [] },
        river: { actions: [], board: [] },
      },
      pots: [],
      showdown: [],
      result: null,
      startedAt: Date.now(),
      completedAt: null,
      _street: 'preflop',
    };
  }

  _recordHoleCards(fields) {
    if (!this._current) return;
    this._current.holeCards[fields.seatNum] = {
      cards: fields.cards || [],
      seatNum: fields.seatNum,
    };
  }

  _recordBoard(fields) {
    if (!this._current) return;
    const cards = fields.cards || [];
    const count = cards.length;

    if (count <= 3) {
      this._current._street = 'flop';
      this._current.streets.flop.board = cards;
    } else if (count === 4) {
      this._current._street = 'turn';
      this._current.streets.turn.board = cards;
    } else if (count >= 5) {
      this._current._street = 'river';
      this._current.streets.river.board = cards;
    }
  }

  _recordNeedAction(fields) {
    if (!this._current) return;
    const street = this._current._street;
    this._current.streets[street].actions.push({
      type: 'need-action',
      seatNum: fields.seatNum,
      optAction: fields.optAction,
      minChip: fields.minChip,
      maxChip: fields.maxChip,
      potChip: fields.potChip,
      leftTime: fields.leftTime,
      ts: Date.now(),
    });
  }

  _recordAction(fields) {
    if (!this._current) return;
    const street = this._current._street;
    this._current.streets[street].actions.push({
      type: 'action',
      seatNum: fields.seatNum,
      action: fields.action,
      actionName: ActionName[fields.action] || `Unknown(${fields.action})`,
      coin: fields.coin,
      ts: Date.now(),
    });
  }

  _recordPots(fields) {
    if (!this._current) return;
    this._current.pots = fields.pots || [];
  }

  _recordShowdown(fields) {
    if (!this._current) return;
    this._current.showdown = (fields.players || []).map(p => ({
      seatNum: p.seatNum,
      cards: p.cards,
      handType: p.handType,
    }));
  }

  _recordResult(fields) {
    if (!this._current) return;
    this._current.result = (fields.players || []).map(p => ({
      seatNum: p.seatNum,
      win: p.win,
      coin: p.coin,
      pot: p.pot,
      handType: p.handType,
    }));
    this._current.completedAt = Date.now();
    this._finalize();
  }

  _finalize() {
    if (!this._current) return;
    const record = { ...this._current };
    delete record._street;

    this._history.push(record);
    if (this._history.length > this._maxHistory) {
      this._history.shift();
    }

    this.emit('hand-complete', { record });
    this._current = null;
  }

  toText(record) {
    if (!record) return '';
    const lines = [];
    lines.push(`=== Hand #${record.handNum} ===`);
    lines.push(`Dealer: Seat ${record.dealerSeat}  Blinds: ${record.smallBlind}/${record.bigBlind}${record.ante ? ` Ante ${record.ante}` : ''}`);
    lines.push(`Players:`);
    for (const [seat, p] of Object.entries(record.players)) {
      const cards = record.holeCards[seat]
        ? ` [${(record.holeCards[seat].cards || []).join(' ')}]`
        : '';
      lines.push(`  Seat ${seat}: ${p.nickName} (${p.coin})${cards}`);
    }

    for (const streetName of ['preflop', 'flop', 'turn', 'river']) {
      const street = record.streets[streetName];
      if (!street || street.actions.length === 0) continue;
      lines.push(`--- ${streetName.toUpperCase()} ---`);
      if (street.board.length > 0) {
        lines.push(`  Board: [${street.board.join(' ')}]`);
      }
      for (const a of street.actions) {
        if (a.type === 'action') {
          lines.push(`  Seat ${a.seatNum}: ${a.actionName}${a.coin ? ` ${a.coin}` : ''}`);
        }
      }
    }

    if (record.showdown.length > 0) {
      lines.push(`--- SHOWDOWN ---`);
      for (const s of record.showdown) {
        lines.push(`  Seat ${s.seatNum}: [${(s.cards || []).join(' ')}] ${s.handType || ''}`);
      }
    }

    if (record.result) {
      lines.push(`--- RESULT ---`);
      for (const r of record.result) {
        if (r.win > 0) {
          lines.push(`  Seat ${r.seatNum}: wins ${r.win} from pot ${r.pot || ''}`);
        }
      }
    }

    return lines.join('\n');
  }
}

module.exports = HandHistory;
