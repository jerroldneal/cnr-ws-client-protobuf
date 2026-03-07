'use strict';

const { defineType } = require('./_schema');
const { MessageId } = require('./enums');

/**
 * Room management protocol messages.
 */

// --- Nested types used by RoomSnapshotMsg ---
const CurrentActType = defineType('CurrentAct', [
  { name: 'seatNum', id: 1, type: 'int32' },
  { name: 'optAction', id: 2, type: 'int32' },
  { name: 'optCoin', id: 3, type: 'uint64' },
  { name: 'minBetCoin', id: 4, type: 'uint64' },
  { name: 'countdownTotal', id: 5, type: 'int32' },
  { name: 'countdownLeft', id: 6, type: 'int32' },
  { name: 'maxBetCoin', id: 7, type: 'uint64' },
  { name: 'extendTime', id: 8, type: 'int32' },
  { name: 'lastRaisePos', id: 9, type: 'int32' },
]);

const PlayerType = defineType('Player', [
  { name: 'userId', id: 1, type: 'uint32' },
  { name: 'nickName', id: 2, type: 'string' },
  { name: 'seatNum', id: 3, type: 'int32' },
  { name: 'deskCoin', id: 4, type: 'uint64' },
  { name: 'leftCoin', id: 5, type: 'uint64' },
  { name: 'state', id: 6, type: 'int32' },
  { name: 'flags', id: 7, type: 'int32' },
  { name: 'holeCards', id: 8, type: 'bytes' },
  { name: 'gender', id: 9, type: 'int32' },
  { name: 'stateTurn', id: 10, type: 'int32' },
  { name: 'showCards', id: 11, type: 'bytes' },
  { name: 'avatar', id: 12, type: 'string' },
  { name: 'avatarFrame', id: 13, type: 'string' },
  { name: 'areaCode', id: 14, type: 'string' },
]);

const VisitorType = defineType('Visitor', [
  { name: 'userId', id: 1, type: 'uint32' },
  { name: 'nickName', id: 2, type: 'string' },
]);

// --- EnterRoomReq (C→S) MessageId=50003 ---
const EnterRoomReqType = defineType('EnterRoomReq', [
  { name: 'roomId', id: 1, type: 'uint32' },
  { name: 'level', id: 2, type: 'int32' },
]);

function encodeEnterRoomReq({ roomId, level = 0 }) {
  const msg = EnterRoomReqType.create({ roomId, level });
  const body = EnterRoomReqType.encode(msg).finish();
  return { topic: MessageId.EnterRoomReq, body };
}

function decodeEnterRoomReq(body) {
  const msg = EnterRoomReqType.decode(Buffer.from(body));
  return EnterRoomReqType.toObject(msg, { longs: Number });
}

// --- EnterRoomRes (S→C) MessageId=50004 ---
const EnterRoomResType = defineType('EnterRoomRes', [
  { name: 'code', id: 1, type: 'int32' },
  { name: 'roomId', id: 2, type: 'uint32' },
  { name: 'mode', id: 3, type: 'string' },
  { name: 'sb', id: 4, type: 'uint64' },
  { name: 'bb', id: 5, type: 'uint64' },
  { name: 'ante', id: 6, type: 'uint64' },
  { name: 'flags', id: 7, type: 'int32' },
  { name: 'minTakein', id: 8, type: 'uint64' },
  { name: 'maxTakein', id: 9, type: 'uint64' },
  { name: 'mttId', id: 10, type: 'uint32' },
  { name: 'seatCount', id: 11, type: 'int32' },
]);

function encodeEnterRoomRes(fields) {
  const msg = EnterRoomResType.create(fields);
  const body = EnterRoomResType.encode(msg).finish();
  return { topic: MessageId.EnterRoomRes, body };
}

function decodeEnterRoomRes(body) {
  const msg = EnterRoomResType.decode(Buffer.from(body));
  return EnterRoomResType.toObject(msg, { longs: Number });
}

// --- RoomSnapshotReq (C→S) MessageId=50005 ---
const RoomSnapshotReqType = defineType('RoomSnapshotReq', [
  { name: 'roomId', id: 1, type: 'uint32' },
]);

function encodeRoomSnapshotReq({ roomId }) {
  const msg = RoomSnapshotReqType.create({ roomId });
  const body = RoomSnapshotReqType.encode(msg).finish();
  return { topic: MessageId.RoomSnapshotReq, body };
}

function decodeRoomSnapshotReq(body) {
  const msg = RoomSnapshotReqType.decode(Buffer.from(body));
  return RoomSnapshotReqType.toObject(msg, { longs: Number });
}

// --- RoomSnapshotMsg (S→C) MessageId=50006 ---
const RoomSnapshotMsgType = defineType('RoomSnapshotMsg', [
  { name: 'roomId', id: 1, type: 'uint32' },
  { name: 'pots', id: 2, type: 'uint64', rule: 'repeated' },
  { name: 'players', id: 3, type: 'Player', rule: 'repeated' },
  { name: 'dealerPos', id: 4, type: 'int32' },
  { name: 'straddlePos', id: 5, type: 'int32' },
  { name: 'boardCards', id: 6, type: 'bytes' },
  { name: 'holeCards', id: 7, type: 'bytes' },
  { name: 'currAct', id: 8, type: 'CurrentAct' },
  { name: 'visitors', id: 9, type: 'Visitor', rule: 'repeated' },
  { name: 'state', id: 10, type: 'int32' },
  { name: 'bbPos', id: 11, type: 'int32' },
  { name: 'sbPos', id: 12, type: 'int32' },
  { name: 'code', id: 13, type: 'int32' },
  { name: 'mttId', id: 14, type: 'uint32' },
  { name: 'startTime', id: 15, type: 'int64' },
]);

function decodeRoomSnapshotMsg(body) {
  const msg = RoomSnapshotMsgType.decode(Buffer.from(body));
  return RoomSnapshotMsgType.toObject(msg, { longs: Number, bytes: Buffer });
}

function encodeRoomSnapshotMsg(fields) {
  const msg = RoomSnapshotMsgType.create(fields);
  const body = RoomSnapshotMsgType.encode(msg).finish();
  return { topic: MessageId.RoomSnapshotMsg, body };
}

// --- RoomConfReq (C→S) MessageId=50042 ---
const RoomConfReqType = defineType('RoomConfReq', [
  { name: 'roomId', id: 1, type: 'uint32' },
]);

function encodeRoomConfReq({ roomId }) {
  const msg = RoomConfReqType.create({ roomId });
  const body = RoomConfReqType.encode(msg).finish();
  return { topic: MessageId.RoomConfReq, body };
}

function decodeRoomConfReq(body) {
  const msg = RoomConfReqType.decode(Buffer.from(body));
  return RoomConfReqType.toObject(msg, { longs: Number });
}

// --- RoomConfRes (S→C) MessageId=50043 ---
const RoomConfResType = defineType('RoomConfRes', [
  { name: 'roomId', id: 1, type: 'uint32' },
  { name: 'code', id: 2, type: 'int32' },
  { name: 'roomName', id: 3, type: 'string' },
  { name: 'playerCount', id: 4, type: 'int32' },
  { name: 'flags', id: 5, type: 'int32' },
  { name: 'roomNameI18N', id: 6, type: 'string' },
]);

function encodeRoomConfRes(fields) {
  const msg = RoomConfResType.create(fields);
  const body = RoomConfResType.encode(msg).finish();
  return { topic: MessageId.RoomConfRes, body };
}

function decodeRoomConfRes(body) {
  const msg = RoomConfResType.decode(Buffer.from(body));
  return RoomConfResType.toObject(msg, { longs: Number });
}

// --- SitDownReq (C→S) MessageId=50013 ---
const SitDownReqType = defineType('SitDownReq', [
  { name: 'roomId', id: 1, type: 'uint32' },
  { name: 'seatNum', id: 2, type: 'int32' },
  { name: 'takeInCoin', id: 3, type: 'uint64' },
  { name: 'lat', id: 4, type: 'double' },
  { name: 'lng', id: 5, type: 'double' },
  { name: 'itemId', id: 6, type: 'uint32' },
]);

function encodeSitDownReq({ roomId, seatNum, takeInCoin, lat = 0, lng = 0, itemId = 0 }) {
  const msg = SitDownReqType.create({ roomId, seatNum, takeInCoin, lat, lng, itemId });
  const body = SitDownReqType.encode(msg).finish();
  return { topic: MessageId.SitDownReq, body };
}

function decodeSitDownReq(body) {
  const msg = SitDownReqType.decode(Buffer.from(body));
  return SitDownReqType.toObject(msg, { longs: Number });
}

// --- SitDownRes (S→C) MessageId=50014 ---
const SitDownResType = defineType('SitDownRes', [
  { name: 'roomId', id: 1, type: 'uint32' },
  { name: 'seatNum', id: 2, type: 'int32' },
  { name: 'code', id: 3, type: 'int32' },
]);

function encodeSitDownRes(fields) {
  const msg = SitDownResType.create(fields);
  const body = SitDownResType.encode(msg).finish();
  return { topic: MessageId.SitDownRes, body };
}

function decodeSitDownRes(body) {
  const msg = SitDownResType.decode(Buffer.from(body));
  return SitDownResType.toObject(msg, { longs: Number });
}

// --- LeaveRoomReq (C→S) MessageId=50029 ---
const LeaveRoomReqType = defineType('LeaveRoomReq', [
  { name: 'roomId', id: 1, type: 'uint32' },
]);

function encodeLeaveRoomReq({ roomId }) {
  const msg = LeaveRoomReqType.create({ roomId });
  const body = LeaveRoomReqType.encode(msg).finish();
  return { topic: MessageId.LeaveRoomReq, body };
}

function decodeLeaveRoomReq(body) {
  const msg = LeaveRoomReqType.decode(Buffer.from(body));
  return LeaveRoomReqType.toObject(msg, { longs: Number });
}

// --- LeaveRoomRes (S→C) MessageId=50030 ---
const LeaveRoomResType = defineType('LeaveRoomRes', [
  { name: 'roomId', id: 1, type: 'uint32' },
  { name: 'code', id: 2, type: 'int32' },
]);

function encodeLeaveRoomRes(fields) {
  const msg = LeaveRoomResType.create(fields);
  const body = LeaveRoomResType.encode(msg).finish();
  return { topic: MessageId.LeaveRoomRes, body };
}

function decodeLeaveRoomRes(body) {
  const msg = LeaveRoomResType.decode(Buffer.from(body));
  return LeaveRoomResType.toObject(msg, { longs: Number });
}

module.exports = {
  // Types
  CurrentActType,
  PlayerType,
  VisitorType,
  EnterRoomReqType,
  EnterRoomResType,
  RoomSnapshotReqType,
  RoomSnapshotMsgType,
  RoomConfReqType,
  RoomConfResType,
  SitDownReqType,
  SitDownResType,
  LeaveRoomReqType,
  LeaveRoomResType,

  // Encode/Decode
  encodeEnterRoomReq,
  decodeEnterRoomReq,
  encodeEnterRoomRes,
  decodeEnterRoomRes,
  encodeRoomSnapshotReq,
  decodeRoomSnapshotReq,
  encodeRoomSnapshotMsg,
  decodeRoomSnapshotMsg,
  encodeRoomConfReq,
  decodeRoomConfReq,
  encodeRoomConfRes,
  decodeRoomConfRes,
  encodeSitDownReq,
  decodeSitDownReq,
  encodeSitDownRes,
  decodeSitDownRes,
  encodeLeaveRoomReq,
  decodeLeaveRoomReq,
  encodeLeaveRoomRes,
  decodeLeaveRoomRes,

  // Message IDs
  MSG_EnterRoomReq: MessageId.EnterRoomReq,
  MSG_EnterRoomRes: MessageId.EnterRoomRes,
  MSG_RoomSnapshotReq: MessageId.RoomSnapshotReq,
  MSG_RoomSnapshotMsg: MessageId.RoomSnapshotMsg,
  MSG_RoomConfReq: MessageId.RoomConfReq,
  MSG_RoomConfRes: MessageId.RoomConfRes,
  MSG_SitDownReq: MessageId.SitDownReq,
  MSG_SitDownRes: MessageId.SitDownRes,
  MSG_LeaveRoomReq: MessageId.LeaveRoomReq,
  MSG_LeaveRoomRes: MessageId.LeaveRoomRes,
};
