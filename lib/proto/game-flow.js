'use strict';

const { defineType } = require('./_schema');
const { MessageId } = require('./enums');

/**
 * Game flow protocol messages — dealer, cards, actions, showdown, results.
 */

// --- Nested: SeatInfo (used by DealerPosMsg) ---
const SeatInfoType = defineType('SeatInfo', [
  { name: 'seatNum', id: 1, type: 'int32' },
  { name: 'deskCoin', id: 2, type: 'uint64' },
  { name: 'leftCoin', id: 3, type: 'uint64' },
]);

// --- Nested: ShowdownPlayer ---
const ShowdownPlayerType = defineType('ShowdownPlayer', [
  { name: 'seatNum', id: 1, type: 'int32' },
  { name: 'holeCards', id: 2, type: 'bytes' },
  { name: 'rank', id: 3, type: 'int32' },
  { name: 'rankCards', id: 4, type: 'bytes' },
]);

// --- Nested: ResultPlayer ---
const ResultPlayerType = defineType('ResultPlayer', [
  { name: 'seatNum', id: 1, type: 'int32' },
  { name: 'profit', id: 2, type: 'int64' },
  { name: 'leftCoins', id: 3, type: 'uint64' },
  { name: 'getPot', id: 4, type: 'uint64' },
]);

// --- DealerPosMsg (S→C) MessageId=50102 ---
const DealerPosMsgType = defineType('DealerPosMsg', [
  { name: 'roomId', id: 1, type: 'uint32' },
  { name: 'dealerPos', id: 2, type: 'int32' },
  { name: 'straddlePos', id: 3, type: 'int32' },
  { name: 'seats', id: 4, type: 'SeatInfo', rule: 'repeated' },
  { name: 'sbPos', id: 5, type: 'int32' },
  { name: 'bbPos', id: 6, type: 'int32' },
  { name: 'pot', id: 7, type: 'uint64' },
  { name: 'startTime', id: 8, type: 'int64' },
  { name: 'roomBlindIndex', id: 9, type: 'int32' },
]);

function encodeDealerPosMsg(fields) {
  const msg = DealerPosMsgType.create(fields);
  const body = DealerPosMsgType.encode(msg).finish();
  return { topic: MessageId.DealerPosMsg, body };
}

function decodeDealerPosMsg(body) {
  const msg = DealerPosMsgType.decode(Buffer.from(body));
  return DealerPosMsgType.toObject(msg, { longs: Number, bytes: Buffer });
}

// --- HoleCardsMsg (S→C) MessageId=50104 ---
const HoleCardsMsgType = defineType('HoleCardsMsg', [
  { name: 'roomId', id: 1, type: 'uint32' },
  { name: 'cards', id: 2, type: 'bytes' },
  { name: 'userId', id: 3, type: 'uint32' },
]);

function encodeHoleCardsMsg(fields) {
  const msg = HoleCardsMsgType.create(fields);
  const body = HoleCardsMsgType.encode(msg).finish();
  return { topic: MessageId.HoleCardsMsg, body };
}

function decodeHoleCardsMsg(body) {
  const msg = HoleCardsMsgType.decode(Buffer.from(body));
  return HoleCardsMsgType.toObject(msg, { longs: Number, bytes: Buffer });
}

// --- BoardCardsMsg (S→C) MessageId=50106 ---
const BoardCardsMsgType = defineType('BoardCardsMsg', [
  { name: 'roomId', id: 1, type: 'uint32' },
  { name: 'roomState', id: 2, type: 'int32' },
  { name: 'cards', id: 3, type: 'bytes' },
]);

function encodeBoardCardsMsg(fields) {
  const msg = BoardCardsMsgType.create(fields);
  const body = BoardCardsMsgType.encode(msg).finish();
  return { topic: MessageId.BoardCardsMsg, body };
}

function decodeBoardCardsMsg(body) {
  const msg = BoardCardsMsgType.decode(Buffer.from(body));
  return BoardCardsMsgType.toObject(msg, { longs: Number, bytes: Buffer });
}

// --- NeedActionMsg (S→C) MessageId=50112 ---
const NeedActionMsgType = defineType('NeedActionMsg', [
  { name: 'roomId', id: 1, type: 'uint32' },
  { name: 'optAction', id: 2, type: 'int32' },
  { name: 'optCoin', id: 3, type: 'uint64' },
  { name: 'seatNum', id: 4, type: 'int32' },
  { name: 'countDown', id: 5, type: 'int32' },
  { name: 'minBetCoin', id: 6, type: 'uint64' },
  { name: 'maxBetCoin', id: 7, type: 'uint64' },
  { name: 'lastRaisePos', id: 8, type: 'int32' },
  { name: 'deskCoin', id: 9, type: 'uint64' },
]);

function encodeNeedActionMsg(fields) {
  const msg = NeedActionMsgType.create(fields);
  const body = NeedActionMsgType.encode(msg).finish();
  return { topic: MessageId.NeedActionMsg, body };
}

function decodeNeedActionMsg(body) {
  const msg = NeedActionMsgType.decode(Buffer.from(body));
  return NeedActionMsgType.toObject(msg, { longs: Number });
}

// --- ActionReq (C→S) MessageId=50109 ---
const ActionReqType = defineType('ActionReq', [
  { name: 'roomId', id: 1, type: 'uint32' },
  { name: 'action', id: 2, type: 'int32' },
  { name: 'coin', id: 3, type: 'uint64' },
]);

function encodeActionReq({ roomId, action, coin = 0 }) {
  const msg = ActionReqType.create({ roomId, action, coin });
  const body = ActionReqType.encode(msg).finish();
  return { topic: MessageId.ActionReq, body };
}

function decodeActionReq(body) {
  const msg = ActionReqType.decode(Buffer.from(body));
  return ActionReqType.toObject(msg, { longs: Number });
}

// --- ActionRes (S→C) MessageId=50110 ---
const ActionResType = defineType('ActionRes', [
  { name: 'roomId', id: 1, type: 'uint32' },
  { name: 'code', id: 2, type: 'int32' },
]);

function encodeActionRes(fields) {
  const msg = ActionResType.create(fields);
  const body = ActionResType.encode(msg).finish();
  return { topic: MessageId.ActionRes, body };
}

function decodeActionRes(body) {
  const msg = ActionResType.decode(Buffer.from(body));
  return ActionResType.toObject(msg, { longs: Number });
}

// --- PlayerActionMsg (S→C) MessageId=50036 ---
const PlayerActionMsgType = defineType('PlayerActionMsg', [
  { name: 'roomId', id: 1, type: 'uint32' },
  { name: 'seatNum', id: 2, type: 'int32' },
  { name: 'action', id: 3, type: 'int32' },
  { name: 'deskCoin', id: 4, type: 'uint64' },
  { name: 'leftCoin', id: 5, type: 'uint64' },
  { name: 'sittingOut', id: 6, type: 'bool' },
]);

function encodePlayerActionMsg(fields) {
  const msg = PlayerActionMsgType.create(fields);
  const body = PlayerActionMsgType.encode(msg).finish();
  return { topic: MessageId.PlayerActionMsg, body };
}

function decodePlayerActionMsg(body) {
  const msg = PlayerActionMsgType.decode(Buffer.from(body));
  return PlayerActionMsgType.toObject(msg, { longs: Number });
}

// --- PlayerStateMsg (S→C) MessageId=50124 ---
const PlayerStateMsgType = defineType('PlayerStateMsg', [
  { name: 'roomId', id: 1, type: 'uint32' },
  { name: 'seatNum', id: 2, type: 'int32' },
  { name: 'state', id: 3, type: 'int32' },
]);

function encodePlayerStateMsg(fields) {
  const msg = PlayerStateMsgType.create(fields);
  const body = PlayerStateMsgType.encode(msg).finish();
  return { topic: MessageId.PlayerStateMsg, body };
}

function decodePlayerStateMsg(body) {
  const msg = PlayerStateMsgType.decode(Buffer.from(body));
  return PlayerStateMsgType.toObject(msg, { longs: Number });
}

// --- ShowdownMsg (S→C) MessageId=50114 ---
const ShowdownMsgType = defineType('ShowdownMsg', [
  { name: 'roomId', id: 1, type: 'uint32' },
  { name: 'players', id: 2, type: 'ShowdownPlayer', rule: 'repeated' },
  { name: 'winners', id: 3, type: 'int32', rule: 'repeated' },
]);

function encodeShowdownMsg(fields) {
  const msg = ShowdownMsgType.create(fields);
  const body = ShowdownMsgType.encode(msg).finish();
  return { topic: MessageId.ShowdownMsg, body };
}

function decodeShowdownMsg(body) {
  const msg = ShowdownMsgType.decode(Buffer.from(body));
  return ShowdownMsgType.toObject(msg, { longs: Number, bytes: Buffer });
}

// --- RoundResultMsg (S→C) MessageId=50116 ---
const RoundResultMsgType = defineType('RoundResultMsg', [
  { name: 'roomId', id: 1, type: 'uint32' },
  { name: 'players', id: 2, type: 'ResultPlayer', rule: 'repeated' },
]);

function encodeRoundResultMsg(fields) {
  const msg = RoundResultMsgType.create(fields);
  const body = RoundResultMsgType.encode(msg).finish();
  return { topic: MessageId.RoundResultMsg, body };
}

function decodeRoundResultMsg(body) {
  const msg = RoundResultMsgType.decode(Buffer.from(body));
  return RoundResultMsgType.toObject(msg, { longs: Number });
}

// --- PotsMsg (S→C) MessageId=50120 ---
const PotsMsgType = defineType('PotsMsg', [
  { name: 'roomId', id: 1, type: 'uint32' },
  { name: 'pots', id: 2, type: 'uint64', rule: 'repeated' },
  { name: 'lastShared', id: 3, type: 'uint64' },
]);

function encodePotsMsg(fields) {
  const msg = PotsMsgType.create(fields);
  const body = PotsMsgType.encode(msg).finish();
  return { topic: MessageId.PotsMsg, body };
}

function decodePotsMsg(body) {
  const msg = PotsMsgType.decode(Buffer.from(body));
  return PotsMsgType.toObject(msg, { longs: Number });
}

// --- HoleCardListMsg (S→C) MessageId=50037 ---
const HoleCardListMsgType = defineType('HoleCardListMsg', [
  { name: 'roomId', id: 1, type: 'uint32' },
  { name: 'cards', id: 2, type: 'bytes' },
]);

function encodeHoleCardListMsg(fields) {
  const msg = HoleCardListMsgType.create(fields);
  const body = HoleCardListMsgType.encode(msg).finish();
  return { topic: MessageId.HoleCardListMsg, body };
}

function decodeHoleCardListMsg(body) {
  const msg = HoleCardListMsgType.decode(Buffer.from(body));
  return HoleCardListMsgType.toObject(msg, { longs: Number, bytes: Buffer });
}

// --- HideHoleCardReq (C→S) MessageId=50040 ---
const HideHoleCardReqType = defineType('HideHoleCardReq', [
  { name: 'roomId', id: 1, type: 'uint32' },
  { name: 'hide', id: 2, type: 'bool' },
]);

function encodeHideHoleCardReq({ roomId, hide }) {
  const msg = HideHoleCardReqType.create({ roomId, hide });
  const body = HideHoleCardReqType.encode(msg).finish();
  return { topic: MessageId.HideHoleCardReq, body };
}

function decodeHideHoleCardReq(body) {
  const msg = HideHoleCardReqType.decode(Buffer.from(body));
  return HideHoleCardReqType.toObject(msg, { longs: Number });
}

// --- HideHoleCardRes (S→C) MessageId=50041 ---
const HideHoleCardResType = defineType('HideHoleCardRes', [
  { name: 'roomId', id: 1, type: 'uint32' },
  { name: 'code', id: 2, type: 'int32' },
]);

function encodeHideHoleCardRes(fields) {
  const msg = HideHoleCardResType.create(fields);
  const body = HideHoleCardResType.encode(msg).finish();
  return { topic: MessageId.HideHoleCardRes, body };
}

function decodeHideHoleCardRes(body) {
  const msg = HideHoleCardResType.decode(Buffer.from(body));
  return HideHoleCardResType.toObject(msg, { longs: Number });
}

// --- AutoPlayMsg (S→C) MessageId=50133 ---
const AutoPlayMsgType = defineType('AutoPlayMsg', [
  { name: 'roomId', id: 1, type: 'uint32' },
  { name: 'userId', id: 2, type: 'uint32' },
  { name: 'autoPlay', id: 3, type: 'bool' },
]);

function encodeAutoPlayMsg(fields) {
  const msg = AutoPlayMsgType.create(fields);
  const body = AutoPlayMsgType.encode(msg).finish();
  return { topic: MessageId.AutoPlayMsg, body };
}

function decodeAutoPlayMsg(body) {
  const msg = AutoPlayMsgType.decode(Buffer.from(body));
  return AutoPlayMsgType.toObject(msg, { longs: Number });
}

// --- CancelAutoPlayReq (C→S) MessageId=50134 ---
const CancelAutoPlayReqType = defineType('CancelAutoPlayReq', [
  { name: 'roomId', id: 1, type: 'uint32' },
]);

function encodeCancelAutoPlayReq({ roomId }) {
  const msg = CancelAutoPlayReqType.create({ roomId });
  const body = CancelAutoPlayReqType.encode(msg).finish();
  return { topic: MessageId.CancelAutoPlayReq, body };
}

function decodeCancelAutoPlayReq(body) {
  const msg = CancelAutoPlayReqType.decode(Buffer.from(body));
  return CancelAutoPlayReqType.toObject(msg, { longs: Number });
}

// --- CancelAutoPlayRes (S→C) MessageId=50135 ---
const CancelAutoPlayResType = defineType('CancelAutoPlayRes', [
  { name: 'roomId', id: 1, type: 'uint32' },
  { name: 'code', id: 2, type: 'int32' },
]);

function encodeCancelAutoPlayRes(fields) {
  const msg = CancelAutoPlayResType.create(fields);
  const body = CancelAutoPlayResType.encode(msg).finish();
  return { topic: MessageId.CancelAutoPlayRes, body };
}

function decodeCancelAutoPlayRes(body) {
  const msg = CancelAutoPlayResType.decode(Buffer.from(body));
  return CancelAutoPlayResType.toObject(msg, { longs: Number });
}

// --- PauseGameReq (C→S) MessageId=50125 ---
const PauseGameReqType = defineType('PauseGameReq', [
  { name: 'roomId', id: 1, type: 'uint32' },
]);

function encodePauseGameReq({ roomId }) {
  const msg = PauseGameReqType.create({ roomId });
  const body = PauseGameReqType.encode(msg).finish();
  return { topic: MessageId.PauseGameReq, body };
}

function decodePauseGameReq(body) {
  const msg = PauseGameReqType.decode(Buffer.from(body));
  return PauseGameReqType.toObject(msg, { longs: Number });
}

// --- PauseGameRes (S→C) MessageId=50126 ---
const PauseGameResType = defineType('PauseGameRes', [
  { name: 'roomId', id: 1, type: 'uint32' },
  { name: 'code', id: 2, type: 'int32' },
]);

function encodePauseGameRes(fields) {
  const msg = PauseGameResType.create(fields);
  const body = PauseGameResType.encode(msg).finish();
  return { topic: MessageId.PauseGameRes, body };
}

function decodePauseGameRes(body) {
  const msg = PauseGameResType.decode(Buffer.from(body));
  return PauseGameResType.toObject(msg, { longs: Number });
}

// --- ResumeGameReq (C→S) MessageId=50129 ---
const ResumeGameReqType = defineType('ResumeGameReq', [
  { name: 'roomId', id: 1, type: 'uint32' },
]);

function encodeResumeGameReq({ roomId }) {
  const msg = ResumeGameReqType.create({ roomId });
  const body = ResumeGameReqType.encode(msg).finish();
  return { topic: MessageId.ResumeGameReq, body };
}

function decodeResumeGameReq(body) {
  const msg = ResumeGameReqType.decode(Buffer.from(body));
  return ResumeGameReqType.toObject(msg, { longs: Number });
}

// --- ResumeGameRes (S→C) MessageId=50130 ---
const ResumeGameResType = defineType('ResumeGameRes', [
  { name: 'roomId', id: 1, type: 'uint32' },
  { name: 'code', id: 2, type: 'int32' },
]);

function encodeResumeGameRes(fields) {
  const msg = ResumeGameResType.create(fields);
  const body = ResumeGameResType.encode(msg).finish();
  return { topic: MessageId.ResumeGameRes, body };
}

function decodeResumeGameRes(body) {
  const msg = ResumeGameResType.decode(Buffer.from(body));
  return ResumeGameResType.toObject(msg, { longs: Number });
}

// --- StandbyReq (C→S) MessageId=50127 ---
const StandbyReqType = defineType('StandbyReq', [
  { name: 'roomId', id: 1, type: 'uint32' },
]);

function encodeStandbyReq({ roomId }) {
  const msg = StandbyReqType.create({ roomId });
  const body = StandbyReqType.encode(msg).finish();
  return { topic: MessageId.StandbyReq, body };
}

function decodeStandbyReq(body) {
  const msg = StandbyReqType.decode(Buffer.from(body));
  return StandbyReqType.toObject(msg, { longs: Number });
}

// --- StandbyRes (S→C) MessageId=50128 ---
const StandbyResType = defineType('StandbyRes', [
  { name: 'roomId', id: 1, type: 'uint32' },
  { name: 'code', id: 2, type: 'int32' },
]);

function encodeStandbyRes(fields) {
  const msg = StandbyResType.create(fields);
  const body = StandbyResType.encode(msg).finish();
  return { topic: MessageId.StandbyRes, body };
}

function decodeStandbyRes(body) {
  const msg = StandbyResType.decode(Buffer.from(body));
  return StandbyResType.toObject(msg, { longs: Number });
}

// --- RoomBillReq (C→S) MessageId=50131 ---
const RoomBillReqType = defineType('RoomBillReq', [
  { name: 'roomId', id: 1, type: 'uint32' },
]);

function encodeRoomBillReq({ roomId }) {
  const msg = RoomBillReqType.create({ roomId });
  const body = RoomBillReqType.encode(msg).finish();
  return { topic: MessageId.RoomBillReq, body };
}

function decodeRoomBillReq(body) {
  const msg = RoomBillReqType.decode(Buffer.from(body));
  return RoomBillReqType.toObject(msg, { longs: Number });
}

// --- Nested: RoomBill ---
const RoomBillType = defineType('RoomBill', [
  { name: 'userId', id: 1, type: 'uint32' },
  { name: 'nickname', id: 2, type: 'string' },
  { name: 'initCoin', id: 3, type: 'uint64' },
  { name: 'profit', id: 4, type: 'int64' },
]);

// --- RoomBillRes (S→C) MessageId=50132 ---
const RoomBillResType = defineType('RoomBillRes', [
  { name: 'roomId', id: 1, type: 'uint32' },
  { name: 'code', id: 2, type: 'int32' },
  { name: 'bills', id: 3, type: 'RoomBill', rule: 'repeated' },
]);

function encodeRoomBillRes(fields) {
  const msg = RoomBillResType.create(fields);
  const body = RoomBillResType.encode(msg).finish();
  return { topic: MessageId.RoomBillRes, body };
}

function decodeRoomBillRes(body) {
  const msg = RoomBillResType.decode(Buffer.from(body));
  return RoomBillResType.toObject(msg, { longs: Number });
}

// --- PlaybackReq (C→S) MessageId=50136 ---
const PlaybackReqType = defineType('PlaybackReq', [
  { name: 'roomId', id: 1, type: 'uint32' },
]);

function encodePlaybackReq({ roomId }) {
  const msg = PlaybackReqType.create({ roomId });
  const body = PlaybackReqType.encode(msg).finish();
  return { topic: MessageId.PlaybackReq, body };
}

function decodePlaybackReq(body) {
  const msg = PlaybackReqType.decode(Buffer.from(body));
  return PlaybackReqType.toObject(msg, { longs: Number });
}

// --- PlaybackRes (S→C) MessageId=50137 ---
const PlaybackResType = defineType('PlaybackRes', [
  { name: 'data', id: 1, type: 'bytes' },
]);

function encodePlaybackRes(fields) {
  const msg = PlaybackResType.create(fields);
  const body = PlaybackResType.encode(msg).finish();
  return { topic: MessageId.PlaybackRes, body };
}

function decodePlaybackRes(body) {
  const msg = PlaybackResType.decode(Buffer.from(body));
  return PlaybackResType.toObject(msg, { longs: Number, bytes: Buffer });
}

// --- ChangeBlindMsg (S→C) MessageId=50501 ---
const ChangeBlindMsgType = defineType('ChangeBlindMsg', [
  { name: 'roomId', id: 1, type: 'uint32' },
  { name: 'sb', id: 2, type: 'uint64' },
  { name: 'bb', id: 3, type: 'uint64' },
  { name: 'ante', id: 4, type: 'uint64' },
]);

function encodeChangeBlindMsg(fields) {
  const msg = ChangeBlindMsgType.create(fields);
  const body = ChangeBlindMsgType.encode(msg).finish();
  return { topic: MessageId.ChangeBlindMsg, body };
}

function decodeChangeBlindMsg(body) {
  const msg = ChangeBlindMsgType.decode(Buffer.from(body));
  return ChangeBlindMsgType.toObject(msg, { longs: Number });
}

// --- ShowCardReq (C→S) MessageId=50510 ---
const ShowCardReqType = defineType('ShowCardReq', [
  { name: 'roomId', id: 1, type: 'uint32' },
  { name: 'userId', id: 2, type: 'uint32' },
  { name: 'showCards', id: 3, type: 'bytes' },
  { name: 'show', id: 4, type: 'bool' },
]);

function encodeShowCardReq({ roomId, userId, showCards, show }) {
  const msg = ShowCardReqType.create({ roomId, userId, showCards, show });
  const body = ShowCardReqType.encode(msg).finish();
  return { topic: MessageId.ShowCardReq, body };
}

function decodeShowCardReq(body) {
  const msg = ShowCardReqType.decode(Buffer.from(body));
  return ShowCardReqType.toObject(msg, { longs: Number, bytes: Buffer });
}

// --- ShowCardRes (S→C) MessageId=50511 ---
const ShowCardResType = defineType('ShowCardRes', [
  { name: 'roomId', id: 1, type: 'uint32' },
  { name: 'code', id: 2, type: 'int32' },
]);

function encodeShowCardRes(fields) {
  const msg = ShowCardResType.create(fields);
  const body = ShowCardResType.encode(msg).finish();
  return { topic: MessageId.ShowCardRes, body };
}

function decodeShowCardRes(body) {
  const msg = ShowCardResType.decode(Buffer.from(body));
  return ShowCardResType.toObject(msg, { longs: Number });
}

module.exports = {
  // Types
  SeatInfoType,
  ShowdownPlayerType,
  ResultPlayerType,
  DealerPosMsgType,
  HoleCardsMsgType,
  BoardCardsMsgType,
  NeedActionMsgType,
  ActionReqType,
  ActionResType,
  PlayerActionMsgType,
  PlayerStateMsgType,
  ShowdownMsgType,
  RoundResultMsgType,
  PotsMsgType,
  HoleCardListMsgType,
  HideHoleCardReqType,
  HideHoleCardResType,
  AutoPlayMsgType,
  CancelAutoPlayReqType,
  CancelAutoPlayResType,
  PauseGameReqType,
  PauseGameResType,
  ResumeGameReqType,
  ResumeGameResType,
  StandbyReqType,
  StandbyResType,
  RoomBillType,
  RoomBillReqType,
  RoomBillResType,
  PlaybackReqType,
  PlaybackResType,
  ChangeBlindMsgType,
  ShowCardReqType,
  ShowCardResType,

  // Encode/Decode
  encodeDealerPosMsg, decodeDealerPosMsg,
  encodeHoleCardsMsg, decodeHoleCardsMsg,
  encodeBoardCardsMsg, decodeBoardCardsMsg,
  encodeNeedActionMsg, decodeNeedActionMsg,
  encodeActionReq, decodeActionReq,
  encodeActionRes, decodeActionRes,
  encodePlayerActionMsg, decodePlayerActionMsg,
  encodePlayerStateMsg, decodePlayerStateMsg,
  encodeShowdownMsg, decodeShowdownMsg,
  encodeRoundResultMsg, decodeRoundResultMsg,
  encodePotsMsg, decodePotsMsg,
  encodeHoleCardListMsg, decodeHoleCardListMsg,
  encodeHideHoleCardReq, decodeHideHoleCardReq,
  encodeHideHoleCardRes, decodeHideHoleCardRes,
  encodeAutoPlayMsg, decodeAutoPlayMsg,
  encodeCancelAutoPlayReq, decodeCancelAutoPlayReq,
  encodeCancelAutoPlayRes, decodeCancelAutoPlayRes,
  encodePauseGameReq, decodePauseGameReq,
  encodePauseGameRes, decodePauseGameRes,
  encodeResumeGameReq, decodeResumeGameReq,
  encodeResumeGameRes, decodeResumeGameRes,
  encodeStandbyReq, decodeStandbyReq,
  encodeStandbyRes, decodeStandbyRes,
  encodeRoomBillReq, decodeRoomBillReq,
  encodeRoomBillRes, decodeRoomBillRes,
  encodePlaybackReq, decodePlaybackReq,
  encodePlaybackRes, decodePlaybackRes,
  encodeChangeBlindMsg, decodeChangeBlindMsg,
  encodeShowCardReq, decodeShowCardReq,
  encodeShowCardRes, decodeShowCardRes,

  // Message IDs
  MSG_DealerPosMsg: MessageId.DealerPosMsg,
  MSG_HoleCardsMsg: MessageId.HoleCardsMsg,
  MSG_BoardCardsMsg: MessageId.BoardCardsMsg,
  MSG_NeedActionMsg: MessageId.NeedActionMsg,
  MSG_ActionReq: MessageId.ActionReq,
  MSG_ActionRes: MessageId.ActionRes,
  MSG_PlayerActionMsg: MessageId.PlayerActionMsg,
  MSG_PlayerStateMsg: MessageId.PlayerStateMsg,
  MSG_ShowdownMsg: MessageId.ShowdownMsg,
  MSG_RoundResultMsg: MessageId.RoundResultMsg,
  MSG_PotsMsg: MessageId.PotsMsg,
  MSG_HoleCardListMsg: MessageId.HoleCardListMsg,
  MSG_HideHoleCardReq: MessageId.HideHoleCardReq,
  MSG_HideHoleCardRes: MessageId.HideHoleCardRes,
  MSG_AutoPlayMsg: MessageId.AutoPlayMsg,
  MSG_CancelAutoPlayReq: MessageId.CancelAutoPlayReq,
  MSG_CancelAutoPlayRes: MessageId.CancelAutoPlayRes,
  MSG_PauseGameReq: MessageId.PauseGameReq,
  MSG_PauseGameRes: MessageId.PauseGameRes,
  MSG_ResumeGameReq: MessageId.ResumeGameReq,
  MSG_ResumeGameRes: MessageId.ResumeGameRes,
  MSG_StandbyReq: MessageId.StandbyReq,
  MSG_StandbyRes: MessageId.StandbyRes,
  MSG_RoomBillReq: MessageId.RoomBillReq,
  MSG_RoomBillRes: MessageId.RoomBillRes,
  MSG_PlaybackReq: MessageId.PlaybackReq,
  MSG_PlaybackRes: MessageId.PlaybackRes,
  MSG_ChangeBlindMsg: MessageId.ChangeBlindMsg,
  MSG_ShowCardReq: MessageId.ShowCardReq,
  MSG_ShowCardRes: MessageId.ShowCardRes,
};
