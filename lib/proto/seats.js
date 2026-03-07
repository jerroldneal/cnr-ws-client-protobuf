'use strict';

const { defineType } = require('./_schema');
const { MessageId } = require('./enums');

/**
 * Seat management protocol messages.
 */

// --- SeatOccupiedMsg (S→C) MessageId=50032 ---
const SeatOccupiedMsgType = defineType('SeatOccupiedMsg', [
  { name: 'roomId', id: 1, type: 'uint32' },
  { name: 'userId', id: 2, type: 'uint32' },
  { name: 'nickName', id: 3, type: 'string' },
  { name: 'seatNum', id: 4, type: 'int32' },
  { name: 'coin', id: 5, type: 'uint64' },
  { name: 'gender', id: 6, type: 'int32' },
  { name: 'avatar', id: 7, type: 'string' },
  { name: 'avatarFrame', id: 8, type: 'string' },
  { name: 'areaCode', id: 9, type: 'string' },
]);

function encodeSeatOccupiedMsg(fields) {
  const msg = SeatOccupiedMsgType.create(fields);
  const body = SeatOccupiedMsgType.encode(msg).finish();
  return { topic: MessageId.SeatOccupiedMsg, body };
}

function decodeSeatOccupiedMsg(body) {
  const msg = SeatOccupiedMsgType.decode(Buffer.from(body));
  return SeatOccupiedMsgType.toObject(msg, { longs: Number });
}

// --- SeatEmptyMsg (S→C) MessageId=50034 ---
const SeatEmptyMsgType = defineType('SeatEmptyMsg', [
  { name: 'roomId', id: 1, type: 'uint32' },
  { name: 'seatNum', id: 2, type: 'int32' },
]);

function encodeSeatEmptyMsg(fields) {
  const msg = SeatEmptyMsgType.create(fields);
  const body = SeatEmptyMsgType.encode(msg).finish();
  return { topic: MessageId.SeatEmptyMsg, body };
}

function decodeSeatEmptyMsg(body) {
  const msg = SeatEmptyMsgType.decode(Buffer.from(body));
  return SeatEmptyMsgType.toObject(msg, { longs: Number });
}

// --- NeedMoreCoinMsg (S→C) MessageId=50016 ---
const NeedMoreCoinMsgType = defineType('NeedMoreCoinMsg', [
  { name: 'userId', id: 1, type: 'uint32' },
  { name: 'roomId', id: 2, type: 'uint32' },
  { name: 'moreCoin', id: 3, type: 'uint64' },
  { name: 'targetCoin', id: 4, type: 'uint64' },
]);

function encodeNeedMoreCoinMsg(fields) {
  const msg = NeedMoreCoinMsgType.create(fields);
  const body = NeedMoreCoinMsgType.encode(msg).finish();
  return { topic: MessageId.NeedMoreCoinMsg, body };
}

function decodeNeedMoreCoinMsg(body) {
  const msg = NeedMoreCoinMsgType.decode(Buffer.from(body));
  return NeedMoreCoinMsgType.toObject(msg, { longs: Number });
}

// --- PlayerLeaveMsg (S→C) MessageId=50038 ---
const PlayerLeaveMsgType = defineType('PlayerLeaveMsg', [
  { name: 'roomId', id: 1, type: 'uint32' },
  { name: 'userId', id: 2, type: 'uint32' },
]);

function encodePlayerLeaveMsg(fields) {
  const msg = PlayerLeaveMsgType.create(fields);
  const body = PlayerLeaveMsgType.encode(msg).finish();
  return { topic: MessageId.PlayerLeaveMsg, body };
}

function decodePlayerLeaveMsg(body) {
  const msg = PlayerLeaveMsgType.decode(Buffer.from(body));
  return PlayerLeaveMsgType.toObject(msg, { longs: Number });
}

// --- OtherRoomMsg (S→C) MessageId=50039 ---
const OtherRoomMsgType = defineType('OtherRoomMsg', [
  { name: 'roomId', id: 1, type: 'uint32' },
]);

function encodeOtherRoomMsg(fields) {
  const msg = OtherRoomMsgType.create(fields);
  const body = OtherRoomMsgType.encode(msg).finish();
  return { topic: MessageId.OtherRoomMsg, body };
}

function decodeOtherRoomMsg(body) {
  const msg = OtherRoomMsgType.decode(Buffer.from(body));
  return OtherRoomMsgType.toObject(msg, { longs: Number });
}

module.exports = {
  SeatOccupiedMsgType,
  SeatEmptyMsgType,
  NeedMoreCoinMsgType,
  PlayerLeaveMsgType,
  OtherRoomMsgType,

  encodeSeatOccupiedMsg,
  decodeSeatOccupiedMsg,
  encodeSeatEmptyMsg,
  decodeSeatEmptyMsg,
  encodeNeedMoreCoinMsg,
  decodeNeedMoreCoinMsg,
  encodePlayerLeaveMsg,
  decodePlayerLeaveMsg,
  encodeOtherRoomMsg,
  decodeOtherRoomMsg,

  MSG_SeatOccupiedMsg: MessageId.SeatOccupiedMsg,
  MSG_SeatEmptyMsg: MessageId.SeatEmptyMsg,
  MSG_NeedMoreCoinMsg: MessageId.NeedMoreCoinMsg,
  MSG_PlayerLeaveMsg: MessageId.PlayerLeaveMsg,
  MSG_OtherRoomMsg: MessageId.OtherRoomMsg,
};
