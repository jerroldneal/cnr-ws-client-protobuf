'use strict';

const { defineType } = require('./_schema');
const { MessageId } = require('./enums');

/**
 * MTT/SNG tournament protocol messages.
 */

// --- Nested: MttPlayer ---
const MttPlayerType = defineType('MttPlayer', [
  { name: 'userId', id: 1, type: 'uint32' },
  { name: 'rank', id: 2, type: 'int32' },
  { name: 'buyTimeCount', id: 3, type: 'int32' },
  { name: 'wins', id: 4, type: 'int32' },
  { name: 'bounty', id: 5, type: 'uint64' },
  { name: 'value', id: 6, type: 'uint64' },
  { name: 'bullet', id: 7, type: 'uint32' },
  { name: 'areaCode', id: 8, type: 'string' },
  { name: 'offlineTimeBank', id: 9, type: 'int32' },
]);

// --- Nested: RankPlayer ---
const RankPlayerType = defineType('RankPlayer', [
  { name: 'userId', id: 1, type: 'uint32' },
  { name: 'nickName', id: 2, type: 'string' },
  { name: 'rank', id: 3, type: 'int32' },
  { name: 'chipCount', id: 4, type: 'uint64' },
  { name: 'avatar', id: 5, type: 'string' },
]);

// --- MttEnterGameReq (C→S) MessageId=60001 ---
const MttEnterGameReqType = defineType('MttEnterGameReq', [
  { name: 'mttId', id: 1, type: 'uint32' },
  { name: 'roomId', id: 2, type: 'uint32' },
  { name: 'userId', id: 3, type: 'uint32' },
]);

function encodeMttEnterGameReq({ mttId, roomId, userId }) {
  const msg = MttEnterGameReqType.create({ mttId, roomId, userId });
  const body = MttEnterGameReqType.encode(msg).finish();
  return { topic: MessageId.MttEnterGameReq, body };
}

function decodeMttEnterGameReq(body) {
  const msg = MttEnterGameReqType.decode(Buffer.from(body));
  return MttEnterGameReqType.toObject(msg, { longs: Number });
}

// --- MttEnterGameRes (S→C) MessageId=60002 ---
const MttEnterGameResType = defineType('MttEnterGameRes', [
  { name: 'code', id: 1, type: 'int32' },
  { name: 'mttId', id: 2, type: 'uint32' },
  { name: 'leftPrepareTime', id: 3, type: 'int32' },
]);

function encodeMttEnterGameRes(fields) {
  const msg = MttEnterGameResType.create(fields);
  const body = MttEnterGameResType.encode(msg).finish();
  return { topic: MessageId.MttEnterGameRes, body };
}

function decodeMttEnterGameRes(body) {
  const msg = MttEnterGameResType.decode(Buffer.from(body));
  return MttEnterGameResType.toObject(msg, { longs: Number });
}

// --- ReJoinReq (C→S) MessageId=60503 ---
const ReJoinReqType = defineType('ReJoinReq', [
  { name: 'mttId', id: 1, type: 'uint32' },
  { name: 'joinType', id: 2, type: 'int32' },
  { name: 'TicketId', id: 3, type: 'uint32' },
]);

function encodeReJoinReq({ mttId, joinType, TicketId = 0 }) {
  const msg = ReJoinReqType.create({ mttId, joinType, TicketId });
  const body = ReJoinReqType.encode(msg).finish();
  return { topic: MessageId.ReJoinReq, body };
}

function decodeReJoinReq(body) {
  const msg = ReJoinReqType.decode(Buffer.from(body));
  return ReJoinReqType.toObject(msg, { longs: Number });
}

// --- ReJoinRes (S→C) MessageId=60504 ---
const ReJoinResType = defineType('ReJoinRes', [
  { name: 'code', id: 1, type: 'int32' },
  { name: 'mttId', id: 2, type: 'uint32' },
  { name: 'userId', id: 3, type: 'uint32' },
  { name: 'joinType', id: 4, type: 'int32' },
  { name: 'coin', id: 5, type: 'uint64' },
]);

function encodeReJoinRes(fields) {
  const msg = ReJoinResType.create(fields);
  const body = ReJoinResType.encode(msg).finish();
  return { topic: MessageId.ReJoinRes, body };
}

function decodeReJoinRes(body) {
  const msg = ReJoinResType.decode(Buffer.from(body));
  return ReJoinResType.toObject(msg, { longs: Number });
}

// --- MttRoomSnapshotReq (C→S) MessageId=60519 ---
const MttRoomSnapshotReqType = defineType('MttRoomSnapshotReq', [
  { name: 'mttId', id: 1, type: 'uint32' },
]);

function encodeMttRoomSnapshotReq({ mttId }) {
  const msg = MttRoomSnapshotReqType.create({ mttId });
  const body = MttRoomSnapshotReqType.encode(msg).finish();
  return { topic: MessageId.MttRoomSnapshotReq, body };
}

function decodeMttRoomSnapshotReq(body) {
  const msg = MttRoomSnapshotReqType.decode(Buffer.from(body));
  return MttRoomSnapshotReqType.toObject(msg, { longs: Number });
}

// --- MttRoomSnapshotRes (S→C) MessageId=60520 ---
const MttRoomSnapshotResType = defineType('MttRoomSnapshotRes', [
  { name: 'mttId', id: 1, type: 'uint32' },
  { name: 'roomId', id: 2, type: 'uint32' },
  { name: 'RiseLeftTime', id: 3, type: 'int32' },
  { name: 'RestType', id: 4, type: 'int32' },
  { name: 'RestLeftTime', id: 5, type: 'int32' },
  { name: 'leftRejoinCount', id: 6, type: 'int32' },
  { name: 'blindIndex', id: 7, type: 'int32' },
  { name: 'mttStatus', id: 8, type: 'int32' },
  { name: 'roomStatus', id: 9, type: 'int32' },
  { name: 'players', id: 10, type: 'MttPlayer', rule: 'repeated' },
  { name: 'VoiceInFinal', id: 11, type: 'bool' },
  { name: 'betType', id: 12, type: 'int32' },
  { name: 'betAmount', id: 13, type: 'uint64' },
  { name: 'thinkTime', id: 14, type: 'int32' },
  { name: 'lastRoom', id: 15, type: 'uint32' },
  { name: 'bullet', id: 16, type: 'uint64' },
  { name: 'timeBankFlag', id: 17, type: 'bool' },
  { name: 'timeBankDuration', id: 18, type: 'int32' },
  { name: 'allowRebuy', id: 19, type: 'bool' },
  { name: 'rebuyLeftTime', id: 20, type: 'int32' },
  { name: 'allowMorebuy', id: 21, type: 'bool' },
  { name: 'moreBuyLeftTime', id: 22, type: 'int32' },
  { name: 'roomBlindIndex', id: 23, type: 'int32' },
  { name: 'GeoCheckFail', id: 24, type: 'bool' },
]);

function encodeMttRoomSnapshotRes(fields) {
  const msg = MttRoomSnapshotResType.create(fields);
  const body = MttRoomSnapshotResType.encode(msg).finish();
  return { topic: MessageId.MttRoomSnapshotRes, body };
}

function decodeMttRoomSnapshotRes(body) {
  const msg = MttRoomSnapshotResType.decode(Buffer.from(body));
  return MttRoomSnapshotResType.toObject(msg, { longs: Number });
}

// --- MttNotifyMsg (S→C) MessageId=60510 ---
const MttNotifyMsgType = defineType('MttNotifyMsg', [
  { name: 'mttId', id: 1, type: 'uint32' },
  { name: 'roomId', id: 2, type: 'uint32' },
  { name: 'tipsType', id: 3, type: 'int32' },
  { name: 'message', id: 4, type: 'string' },
  { name: 'messageI18N', id: 5, type: 'string' },
  { name: 'nextPeriodStartTime', id: 6, type: 'int64' },
  { name: 'willPlayStartTime', id: 7, type: 'int64' },
]);

function encodeMttNotifyMsg(fields) {
  const msg = MttNotifyMsgType.create(fields);
  const body = MttNotifyMsgType.encode(msg).finish();
  return { topic: MessageId.MttNotifyMsg, body };
}

function decodeMttNotifyMsg(body) {
  const msg = MttNotifyMsgType.decode(Buffer.from(body));
  return MttNotifyMsgType.toObject(msg, { longs: Number });
}

// --- RiseBlindNotifyMsg (S→C) MessageId=60509 ---
const RiseBlindNotifyMsgType = defineType('RiseBlindNotifyMsg', [
  { name: 'mttId', id: 1, type: 'uint32' },
  { name: 'roomId', id: 2, type: 'uint32' },
  { name: 'riseIndex', id: 3, type: 'int32' },
  { name: 'riseLeftTime', id: 4, type: 'int32' },
]);

function encodeRiseBlindNotifyMsg(fields) {
  const msg = RiseBlindNotifyMsgType.create(fields);
  const body = RiseBlindNotifyMsgType.encode(msg).finish();
  return { topic: MessageId.RiseBlindNotifyMsg, body };
}

function decodeRiseBlindNotifyMsg(body) {
  const msg = RiseBlindNotifyMsgType.decode(Buffer.from(body));
  return RiseBlindNotifyMsgType.toObject(msg, { longs: Number });
}

// --- MttUserRankMsg (S→C) MessageId=60530 ---
const MttUserRankMsgType = defineType('MttUserRankMsg', [
  { name: 'mttId', id: 1, type: 'uint32' },
  { name: 'userId', id: 2, type: 'uint32' },
  { name: 'rank', id: 3, type: 'int32' },
  { name: 'wins', id: 4, type: 'int32' },
  { name: 'bounty', id: 5, type: 'uint64' },
  { name: 'value', id: 6, type: 'uint64' },
  { name: 'PlayerCount', id: 7, type: 'int32' },
]);

function encodeMttUserRankMsg(fields) {
  const msg = MttUserRankMsgType.create(fields);
  const body = MttUserRankMsgType.encode(msg).finish();
  return { topic: MessageId.MttUserRankMsg, body };
}

function decodeMttUserRankMsg(body) {
  const msg = MttUserRankMsgType.decode(Buffer.from(body));
  return MttUserRankMsgType.toObject(msg, { longs: Number });
}

// --- MttUserOutMsg (S→C) MessageId=60531 ---
const MttUserOutMsgType = defineType('MttUserOutMsg', [
  { name: 'mttId', id: 1, type: 'uint32' },
  { name: 'roomId', id: 2, type: 'uint32' },
  { name: 'userId', id: 3, type: 'uint32' },
]);

function encodeMttUserOutMsg(fields) {
  const msg = MttUserOutMsgType.create(fields);
  const body = MttUserOutMsgType.encode(msg).finish();
  return { topic: MessageId.MttUserOutMsg, body };
}

function decodeMttUserOutMsg(body) {
  const msg = MttUserOutMsgType.decode(Buffer.from(body));
  return MttUserOutMsgType.toObject(msg, { longs: Number });
}

// --- MttRoomChangeMsg (S→C) MessageId=60533 ---
const MttRoomChangeMsgType = defineType('MttRoomChangeMsg', [
  { name: 'mttId', id: 1, type: 'uint32' },
  { name: 'roomId', id: 2, type: 'uint32' },
]);

function encodeMttRoomChangeMsg(fields) {
  const msg = MttRoomChangeMsgType.create(fields);
  const body = MttRoomChangeMsgType.encode(msg).finish();
  return { topic: MessageId.MttRoomChangeMsg, body };
}

function decodeMttRoomChangeMsg(body) {
  const msg = MttRoomChangeMsgType.decode(Buffer.from(body));
  return MttRoomChangeMsgType.toObject(msg, { longs: Number });
}

// --- MttStateNotifyMsg (S→C) MessageId=60542 ---
const MttStateNotifyMsgType = defineType('MttStateNotifyMsg', [
  { name: 'mttId', id: 1, type: 'uint32' },
  { name: 'status', id: 2, type: 'int32' },
]);

function encodeMttStateNotifyMsg(fields) {
  const msg = MttStateNotifyMsgType.create(fields);
  const body = MttStateNotifyMsgType.encode(msg).finish();
  return { topic: MessageId.MttStateNotifyMsg, body };
}

function decodeMttStateNotifyMsg(body) {
  const msg = MttStateNotifyMsgType.decode(Buffer.from(body));
  return MttStateNotifyMsgType.toObject(msg, { longs: Number });
}

// --- MttLastRoomNotifyMsg (S→C) MessageId=60543 ---
const MttLastRoomNotifyMsgType = defineType('MttLastRoomNotifyMsg', [
  { name: 'mttId', id: 1, type: 'uint32' },
  { name: 'roomId', id: 2, type: 'uint32' },
]);

function encodeMttLastRoomNotifyMsg(fields) {
  const msg = MttLastRoomNotifyMsgType.create(fields);
  const body = MttLastRoomNotifyMsgType.encode(msg).finish();
  return { topic: MessageId.MttLastRoomNotifyMsg, body };
}

function decodeMttLastRoomNotifyMsg(body) {
  const msg = MttLastRoomNotifyMsgType.decode(Buffer.from(body));
  return MttLastRoomNotifyMsgType.toObject(msg, { longs: Number });
}

// --- MttRebuyMsg (S→C) MessageId=60564 ---
const MttRebuyMsgType = defineType('MttRebuyMsg', [
  { name: 'mttId', id: 1, type: 'uint32' },
  { name: 'roomId', id: 2, type: 'uint32' },
  { name: 'allow', id: 3, type: 'bool' },
  { name: 'leftTime', id: 4, type: 'int32' },
]);

function encodeMttRebuyMsg(fields) {
  const msg = MttRebuyMsgType.create(fields);
  const body = MttRebuyMsgType.encode(msg).finish();
  return { topic: MessageId.MttRebuyMsg, body };
}

function decodeMttRebuyMsg(body) {
  const msg = MttRebuyMsgType.decode(Buffer.from(body));
  return MttRebuyMsgType.toObject(msg, { longs: Number });
}

// --- MttMorebuyMsg (S→C) MessageId=60565 ---
const MttMorebuyMsgType = defineType('MttMorebuyMsg', [
  { name: 'mttId', id: 1, type: 'uint32' },
  { name: 'roomId', id: 2, type: 'uint32' },
  { name: 'allow', id: 3, type: 'bool' },
  { name: 'leftTime', id: 4, type: 'int32' },
]);

function encodeMttMorebuyMsg(fields) {
  const msg = MttMorebuyMsgType.create(fields);
  const body = MttMorebuyMsgType.encode(msg).finish();
  return { topic: MessageId.MttMorebuyMsg, body };
}

function decodeMttMorebuyMsg(body) {
  const msg = MttMorebuyMsgType.decode(Buffer.from(body));
  return MttMorebuyMsgType.toObject(msg, { longs: Number });
}

// --- MttCancelBuyReq (C→S) MessageId=60566 ---
const MttCancelBuyReqType = defineType('MttCancelBuyReq', [
  { name: 'typeId', id: 1, type: 'int32' },
  { name: 'mttId', id: 2, type: 'uint32' },
]);

function encodeMttCancelBuyReq({ typeId, mttId }) {
  const msg = MttCancelBuyReqType.create({ typeId, mttId });
  const body = MttCancelBuyReqType.encode(msg).finish();
  return { topic: MessageId.MttCancelBuyReq, body };
}

function decodeMttCancelBuyReq(body) {
  const msg = MttCancelBuyReqType.decode(Buffer.from(body));
  return MttCancelBuyReqType.toObject(msg, { longs: Number });
}

// --- MttCancelBuyRes (S→C) MessageId=60567 ---
const MttCancelBuyResType = defineType('MttCancelBuyRes', [
  { name: 'code', id: 1, type: 'int32' },
  { name: 'mttId', id: 2, type: 'uint32' },
]);

function encodeMttCancelBuyRes(fields) {
  const msg = MttCancelBuyResType.create(fields);
  const body = MttCancelBuyResType.encode(msg).finish();
  return { topic: MessageId.MttCancelBuyRes, body };
}

function decodeMttCancelBuyRes(body) {
  const msg = MttCancelBuyResType.decode(Buffer.from(body));
  return MttCancelBuyResType.toObject(msg, { longs: Number });
}

// --- MttRoomRankNotifyMsg (S→C) MessageId=60516 ---
const MttRoomRankNotifyMsgType = defineType('MttRoomRankNotifyMsg', [
  { name: 'mttId', id: 1, type: 'uint32' },
  { name: 'mttName', id: 2, type: 'string' },
  { name: 'GameDuration', id: 3, type: 'int32' },
  { name: 'BlindLevel', id: 4, type: 'int32' },
  { name: 'PrizePool', id: 5, type: 'uint64' },
  { name: 'PrizeSize', id: 6, type: 'int32' },
  { name: 'allPlayerCount', id: 7, type: 'int32' },
  { name: 'curPlayer', id: 8, type: 'int32' },
  { name: 'players', id: 9, type: 'RankPlayer', rule: 'repeated' },
]);

function encodeMttRoomRankNotifyMsg(fields) {
  const msg = MttRoomRankNotifyMsgType.create(fields);
  const body = MttRoomRankNotifyMsgType.encode(msg).finish();
  return { topic: MessageId.MttRoomRankNotifyMsg, body };
}

function decodeMttRoomRankNotifyMsg(body) {
  const msg = MttRoomRankNotifyMsgType.decode(Buffer.from(body));
  return MttRoomRankNotifyMsgType.toObject(msg, { longs: Number });
}

// --- MttRoomEndNotifyMsg (S→C) MessageId=60528 ---
const MttRoomEndNotifyMsgType = defineType('MttRoomEndNotifyMsg', [
  { name: 'mttId', id: 1, type: 'uint32' },
  { name: 'roomId', id: 2, type: 'uint32' },
]);

function encodeMttRoomEndNotifyMsg(fields) {
  const msg = MttRoomEndNotifyMsgType.create(fields);
  const body = MttRoomEndNotifyMsgType.encode(msg).finish();
  return { topic: MessageId.MttRoomEndNotifyMsg, body };
}

function decodeMttRoomEndNotifyMsg(body) {
  const msg = MttRoomEndNotifyMsgType.decode(Buffer.from(body));
  return MttRoomEndNotifyMsgType.toObject(msg, { longs: Number });
}

// --- MttStopReJoinNotifyMsg (S→C) MessageId=60529 ---
const MttStopReJoinNotifyMsgType = defineType('MttStopReJoinNotifyMsg', [
  { name: 'mttId', id: 1, type: 'uint32' },
]);

function encodeMttStopReJoinNotifyMsg(fields) {
  const msg = MttStopReJoinNotifyMsgType.create(fields);
  const body = MttStopReJoinNotifyMsgType.encode(msg).finish();
  return { topic: MessageId.MttStopReJoinNotifyMsg, body };
}

function decodeMttStopReJoinNotifyMsg(body) {
  const msg = MttStopReJoinNotifyMsgType.decode(Buffer.from(body));
  return MttStopReJoinNotifyMsgType.toObject(msg, { longs: Number });
}

// --- MttRoomStatusChangeMsg (S→C) MessageId=60572 ---
const MttRoomStatusChangeMsgType = defineType('MttRoomStatusChangeMsg', [
  { name: 'mttId', id: 1, type: 'uint32' },
  { name: 'roomId', id: 2, type: 'uint32' },
  { name: 'status', id: 3, type: 'int32' },
]);

function encodeMttRoomStatusChangeMsg(fields) {
  const msg = MttRoomStatusChangeMsgType.create(fields);
  const body = MttRoomStatusChangeMsgType.encode(msg).finish();
  return { topic: MessageId.MttRoomStatusChangeMsg, body };
}

function decodeMttRoomStatusChangeMsg(body) {
  const msg = MttRoomStatusChangeMsgType.decode(Buffer.from(body));
  return MttRoomStatusChangeMsgType.toObject(msg, { longs: Number });
}

// --- MttGeoCheckMsg (S→C) MessageId=60574 ---
const MttGeoCheckMsgType = defineType('MttGeoCheckMsg', [
  { name: 'mttId', id: 1, type: 'uint32' },
  { name: 'roomId', id: 2, type: 'uint32' },
]);

function encodeMttGeoCheckMsg(fields) {
  const msg = MttGeoCheckMsgType.create(fields);
  const body = MttGeoCheckMsgType.encode(msg).finish();
  return { topic: MessageId.MttGeoCheckMsg, body };
}

function decodeMttGeoCheckMsg(body) {
  const msg = MttGeoCheckMsgType.decode(Buffer.from(body));
  return MttGeoCheckMsgType.toObject(msg, { longs: Number });
}

// --- MttRestTimeNotifyMsg (S→C) MessageId=60518 ---
const MttRestTimeNotifyMsgType = defineType('MttRestTimeNotifyMsg', [
  { name: 'mttId', id: 1, type: 'uint32' },
  { name: 'restLeftTime', id: 2, type: 'int32' },
]);

function encodeMttRestTimeNotifyMsg(fields) {
  const msg = MttRestTimeNotifyMsgType.create(fields);
  const body = MttRestTimeNotifyMsgType.encode(msg).finish();
  return { topic: MessageId.MttRestTimeNotifyMsg, body };
}

function decodeMttRestTimeNotifyMsg(body) {
  const msg = MttRestTimeNotifyMsgType.decode(Buffer.from(body));
  return MttRestTimeNotifyMsgType.toObject(msg, { longs: Number });
}

// --- MttRealTimeRecordReq (C→S) MessageId=60521 ---
const MttRealTimeRecordReqType = defineType('MttRealTimeRecordReq', [
  { name: 'mttId', id: 1, type: 'uint32' },
]);

function encodeMttRealTimeRecordReq({ mttId }) {
  const msg = MttRealTimeRecordReqType.create({ mttId });
  const body = MttRealTimeRecordReqType.encode(msg).finish();
  return { topic: MessageId.MttRealTimeRecordReq, body };
}

function decodeMttRealTimeRecordReq(body) {
  const msg = MttRealTimeRecordReqType.decode(Buffer.from(body));
  return MttRealTimeRecordReqType.toObject(msg, { longs: Number });
}

// --- MttRealTimeRecordRes (S→C) MessageId=60522 ---
const MttRealTimeRecordResType = defineType('MttRealTimeRecordRes', [
  { name: 'mttId', id: 1, type: 'uint32' },
  { name: 'data', id: 2, type: 'bytes' },
]);

function encodeMttRealTimeRecordRes(fields) {
  const msg = MttRealTimeRecordResType.create(fields);
  const body = MttRealTimeRecordResType.encode(msg).finish();
  return { topic: MessageId.MttRealTimeRecordRes, body };
}

function decodeMttRealTimeRecordRes(body) {
  const msg = MttRealTimeRecordResType.decode(Buffer.from(body));
  return MttRealTimeRecordResType.toObject(msg, { longs: Number, bytes: Buffer });
}

// --- SngRoomSnapShotMsg (S→C) MessageId=60514 ---
const SngRoomSnapShotMsgType = defineType('SngRoomSnapShotMsg', [
  { name: 'mttId', id: 1, type: 'uint32' },
  { name: 'roomId', id: 2, type: 'uint32' },
]);

function encodeSngRoomSnapShotMsg(fields) {
  const msg = SngRoomSnapShotMsgType.create(fields);
  const body = SngRoomSnapShotMsgType.encode(msg).finish();
  return { topic: MessageId.SngRoomSnapShotMsg, body };
}

function decodeSngRoomSnapShotMsg(body) {
  const msg = SngRoomSnapShotMsgType.decode(Buffer.from(body));
  return SngRoomSnapShotMsgType.toObject(msg, { longs: Number });
}

module.exports = {
  // Types
  MttPlayerType,
  RankPlayerType,
  MttEnterGameReqType,
  MttEnterGameResType,
  ReJoinReqType,
  ReJoinResType,
  MttRoomSnapshotReqType,
  MttRoomSnapshotResType,
  MttNotifyMsgType,
  RiseBlindNotifyMsgType,
  MttUserRankMsgType,
  MttUserOutMsgType,
  MttRoomChangeMsgType,
  MttStateNotifyMsgType,
  MttLastRoomNotifyMsgType,
  MttRebuyMsgType,
  MttMorebuyMsgType,
  MttCancelBuyReqType,
  MttCancelBuyResType,
  MttRoomRankNotifyMsgType,
  MttRoomEndNotifyMsgType,
  MttStopReJoinNotifyMsgType,
  MttRoomStatusChangeMsgType,
  MttGeoCheckMsgType,
  MttRestTimeNotifyMsgType,
  MttRealTimeRecordReqType,
  MttRealTimeRecordResType,
  SngRoomSnapShotMsgType,

  // Encode/Decode
  encodeMttEnterGameReq, decodeMttEnterGameReq,
  encodeMttEnterGameRes, decodeMttEnterGameRes,
  encodeReJoinReq, decodeReJoinReq,
  encodeReJoinRes, decodeReJoinRes,
  encodeMttRoomSnapshotReq, decodeMttRoomSnapshotReq,
  encodeMttRoomSnapshotRes, decodeMttRoomSnapshotRes,
  encodeMttNotifyMsg, decodeMttNotifyMsg,
  encodeRiseBlindNotifyMsg, decodeRiseBlindNotifyMsg,
  encodeMttUserRankMsg, decodeMttUserRankMsg,
  encodeMttUserOutMsg, decodeMttUserOutMsg,
  encodeMttRoomChangeMsg, decodeMttRoomChangeMsg,
  encodeMttStateNotifyMsg, decodeMttStateNotifyMsg,
  encodeMttLastRoomNotifyMsg, decodeMttLastRoomNotifyMsg,
  encodeMttRebuyMsg, decodeMttRebuyMsg,
  encodeMttMorebuyMsg, decodeMttMorebuyMsg,
  encodeMttCancelBuyReq, decodeMttCancelBuyReq,
  encodeMttCancelBuyRes, decodeMttCancelBuyRes,
  encodeMttRoomRankNotifyMsg, decodeMttRoomRankNotifyMsg,
  encodeMttRoomEndNotifyMsg, decodeMttRoomEndNotifyMsg,
  encodeMttStopReJoinNotifyMsg, decodeMttStopReJoinNotifyMsg,
  encodeMttRoomStatusChangeMsg, decodeMttRoomStatusChangeMsg,
  encodeMttGeoCheckMsg, decodeMttGeoCheckMsg,
  encodeMttRestTimeNotifyMsg, decodeMttRestTimeNotifyMsg,
  encodeMttRealTimeRecordReq, decodeMttRealTimeRecordReq,
  encodeMttRealTimeRecordRes, decodeMttRealTimeRecordRes,
  encodeSngRoomSnapShotMsg, decodeSngRoomSnapShotMsg,

  // Message IDs
  MSG_MttEnterGameReq: MessageId.MttEnterGameReq,
  MSG_MttEnterGameRes: MessageId.MttEnterGameRes,
  MSG_ReJoinReq: MessageId.ReJoinReq,
  MSG_ReJoinRes: MessageId.ReJoinRes,
  MSG_MttRoomSnapshotReq: MessageId.MttRoomSnapshotReq,
  MSG_MttRoomSnapshotRes: MessageId.MttRoomSnapshotRes,
  MSG_MttNotifyMsg: MessageId.MttNotifyMsg,
  MSG_RiseBlindNotifyMsg: MessageId.RiseBlindNotifyMsg,
  MSG_MttUserRankMsg: MessageId.MttUserRankMsg,
  MSG_MttUserOutMsg: MessageId.MttUserOutMsg,
  MSG_MttRoomChangeMsg: MessageId.MttRoomChangeMsg,
  MSG_MttStateNotifyMsg: MessageId.MttStateNotifyMsg,
  MSG_MttLastRoomNotifyMsg: MessageId.MttLastRoomNotifyMsg,
  MSG_MttRebuyMsg: MessageId.MttRebuyMsg,
  MSG_MttMorebuyMsg: MessageId.MttMorebuyMsg,
  MSG_MttCancelBuyReq: MessageId.MttCancelBuyReq,
  MSG_MttCancelBuyRes: MessageId.MttCancelBuyRes,
  MSG_MttRoomRankNotifyMsg: MessageId.MttRoomRankNotifyMsg,
  MSG_MttRoomEndNotifyMsg: MessageId.MttRoomEndNotifyMsg,
  MSG_MttStopReJoinNotifyMsg: MessageId.MttStopReJoinNotifyMsg,
  MSG_MttRoomStatusChangeMsg: MessageId.MttRoomStatusChangeMsg,
  MSG_MttGeoCheckMsg: MessageId.MttGeoCheckMsg,
  MSG_MttRestTimeNotifyMsg: MessageId.MttRestTimeNotifyMsg,
  MSG_MttRealTimeRecordReq: MessageId.MttRealTimeRecordReq,
  MSG_MttRealTimeRecordRes: MessageId.MttRealTimeRecordRes,
  MSG_SngRoomSnapShotMsg: MessageId.SngRoomSnapShotMsg,
};
