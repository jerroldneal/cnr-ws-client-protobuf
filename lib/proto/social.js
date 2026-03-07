'use strict';

const { defineType } = require('./_schema');
const { MessageId } = require('./enums');

/**
 * Social protocol messages — emoji, animations, voice, celebrity.
 */

// --- Emoji (C→S) MessageId=50063 ---
const EmojiType = defineType('Emoji', [
  { name: 'userId', id: 1, type: 'uint32' },
  { name: 'roomId', id: 2, type: 'uint32' },
  { name: 'body', id: 3, type: 'bytes' },
]);

function encodeEmoji({ userId, roomId, body }) {
  const msg = EmojiType.create({ userId, roomId, body });
  const encoded = EmojiType.encode(msg).finish();
  return { topic: MessageId.Emoji, body: encoded };
}

function decodeEmoji(body) {
  const msg = EmojiType.decode(Buffer.from(body));
  return EmojiType.toObject(msg, { longs: Number, bytes: Buffer });
}

// --- EmojiRes (S→C) MessageId=50067 ---
const EmojiResType = defineType('EmojiRes', [
  { name: 'roomId', id: 1, type: 'uint32' },
  { name: 'code', id: 2, type: 'int32' },
]);

function encodeEmojiRes(fields) {
  const msg = EmojiResType.create(fields);
  const encoded = EmojiResType.encode(msg).finish();
  return { topic: MessageId.EmojiRes, body: encoded };
}

function decodeEmojiRes(body) {
  const msg = EmojiResType.decode(Buffer.from(body));
  return EmojiResType.toObject(msg, { longs: Number });
}

// --- AnimReq (C→S) MessageId=50064 ---
const AnimReqType = defineType('AnimReq', [
  { name: 'roomId', id: 1, type: 'uint32' },
  { name: 'targetUser', id: 2, type: 'uint32' },
  { name: 'anim', id: 3, type: 'string' },
]);

function encodeAnimReq({ roomId, targetUser, anim }) {
  const msg = AnimReqType.create({ roomId, targetUser, anim });
  const body = AnimReqType.encode(msg).finish();
  return { topic: MessageId.AnimReq, body };
}

function decodeAnimReq(body) {
  const msg = AnimReqType.decode(Buffer.from(body));
  return AnimReqType.toObject(msg, { longs: Number });
}

// --- AnimRes (S→C) MessageId=50065 ---
const AnimResType = defineType('AnimRes', [
  { name: 'roomId', id: 1, type: 'uint32' },
  { name: 'code', id: 2, type: 'int32' },
]);

function encodeAnimRes(fields) {
  const msg = AnimResType.create(fields);
  const body = AnimResType.encode(msg).finish();
  return { topic: MessageId.AnimRes, body };
}

function decodeAnimRes(body) {
  const msg = AnimResType.decode(Buffer.from(body));
  return AnimResType.toObject(msg, { longs: Number });
}

// --- AnimMsg (S→C) MessageId=50066 ---
const AnimMsgType = defineType('AnimMsg', [
  { name: 'roomId', id: 1, type: 'uint32' },
  { name: 'sender', id: 2, type: 'uint32' },
  { name: 'targetUser', id: 3, type: 'uint32' },
  { name: 'anim', id: 4, type: 'string' },
]);

function encodeAnimMsg(fields) {
  const msg = AnimMsgType.create(fields);
  const body = AnimMsgType.encode(msg).finish();
  return { topic: MessageId.AnimMsg, body };
}

function decodeAnimMsg(body) {
  const msg = AnimMsgType.decode(Buffer.from(body));
  return AnimMsgType.toObject(msg, { longs: Number });
}

// --- VoiceReq (C→S) MessageId=50069 ---
const VoiceReqType = defineType('VoiceReq', [
  { name: 'roomId', id: 1, type: 'uint32' },
  { name: 'voiceUrl', id: 2, type: 'string' },
]);

function encodeVoiceReq({ roomId, voiceUrl }) {
  const msg = VoiceReqType.create({ roomId, voiceUrl });
  const body = VoiceReqType.encode(msg).finish();
  return { topic: MessageId.VoiceReq, body };
}

function decodeVoiceReq(body) {
  const msg = VoiceReqType.decode(Buffer.from(body));
  return VoiceReqType.toObject(msg, { longs: Number });
}

// --- VoiceRes (S→C) MessageId=50070 ---
const VoiceResType = defineType('VoiceRes', [
  { name: 'roomId', id: 1, type: 'uint32' },
  { name: 'code', id: 2, type: 'int32' },
]);

function encodeVoiceRes(fields) {
  const msg = VoiceResType.create(fields);
  const body = VoiceResType.encode(msg).finish();
  return { topic: MessageId.VoiceRes, body };
}

function decodeVoiceRes(body) {
  const msg = VoiceResType.decode(Buffer.from(body));
  return VoiceResType.toObject(msg, { longs: Number });
}

// --- VoiceMsg (S→C) MessageId=50071 ---
const VoiceMsgType = defineType('VoiceMsg', [
  { name: 'roomId', id: 1, type: 'uint32' },
  { name: 'userId', id: 2, type: 'uint32' },
  { name: 'voiceUrl', id: 3, type: 'string' },
]);

function encodeVoiceMsg(fields) {
  const msg = VoiceMsgType.create(fields);
  const body = VoiceMsgType.encode(msg).finish();
  return { topic: MessageId.VoiceMsg, body };
}

function decodeVoiceMsg(body) {
  const msg = VoiceMsgType.decode(Buffer.from(body));
  return VoiceMsgType.toObject(msg, { longs: Number });
}

// --- PlayerNickNameChangeMsg (S→C) MessageId=50122 ---
const PlayerNickNameChangeMsgType = defineType('PlayerNickNameChangeMsg', [
  { name: 'roomId', id: 1, type: 'uint32' },
  { name: 'userId', id: 2, type: 'uint32' },
  { name: 'nickName', id: 3, type: 'string' },
  { name: 'avatar', id: 4, type: 'string' },
]);

function encodePlayerNickNameChangeMsg(fields) {
  const msg = PlayerNickNameChangeMsgType.create(fields);
  const body = PlayerNickNameChangeMsgType.encode(msg).finish();
  return { topic: MessageId.PlayerNickNameChangeMsg, body };
}

function decodePlayerNickNameChangeMsg(body) {
  const msg = PlayerNickNameChangeMsgType.decode(Buffer.from(body));
  return PlayerNickNameChangeMsgType.toObject(msg, { longs: Number });
}

// --- ShowCardReq is in game-flow.js ---

// --- CelebrityBroadcastReq (C→S) MessageId=50513 ---
const CelebrityBroadcastReqType = defineType('CelebrityBroadcastReq', [
  { name: 'roomId', id: 1, type: 'uint32' },
  { name: 'isOnlive', id: 2, type: 'bool' },
  { name: 'isAudioOnlive', id: 3, type: 'bool' },
]);

function encodeCelebrityBroadcastReq({ roomId, isOnlive, isAudioOnlive }) {
  const msg = CelebrityBroadcastReqType.create({ roomId, isOnlive, isAudioOnlive });
  const body = CelebrityBroadcastReqType.encode(msg).finish();
  return { topic: MessageId.CelebrityBroadcastReq, body };
}

function decodeCelebrityBroadcastReq(body) {
  const msg = CelebrityBroadcastReqType.decode(Buffer.from(body));
  return CelebrityBroadcastReqType.toObject(msg, { longs: Number });
}

// --- CelebrityBroadcastRes (S→C) MessageId=50514 ---
const CelebrityBroadcastResType = defineType('CelebrityBroadcastRes', [
  { name: 'errorCode', id: 1, type: 'int32' },
  { name: 'success', id: 2, type: 'bool' },
  { name: 'mttId', id: 3, type: 'uint32' },
  { name: 'roomId', id: 4, type: 'uint32' },
  { name: 'audioSuccess', id: 5, type: 'bool' },
]);

function encodeCelebrityBroadcastRes(fields) {
  const msg = CelebrityBroadcastResType.create(fields);
  const body = CelebrityBroadcastResType.encode(msg).finish();
  return { topic: MessageId.CelebrityBroadcastRes, body };
}

function decodeCelebrityBroadcastRes(body) {
  const msg = CelebrityBroadcastResType.decode(Buffer.from(body));
  return CelebrityBroadcastResType.toObject(msg, { longs: Number });
}

// --- CelebrityBroadcastNotifyFullMsg (S→C) MessageId=50515 ---
const CelebrityBroadcastNotifyFullMsgType = defineType('CelebrityBroadcastNotifyFullMsg', [
  { name: 'roomId', id: 1, type: 'uint32' },
  { name: 'mttId', id: 2, type: 'uint32' },
]);

function encodeCelebrityBroadcastNotifyFullMsg(fields) {
  const msg = CelebrityBroadcastNotifyFullMsgType.create(fields);
  const body = CelebrityBroadcastNotifyFullMsgType.encode(msg).finish();
  return { topic: MessageId.CelebrityBroadcastNotifyFullMsg, body };
}

function decodeCelebrityBroadcastNotifyFullMsg(body) {
  const msg = CelebrityBroadcastNotifyFullMsgType.decode(Buffer.from(body));
  return CelebrityBroadcastNotifyFullMsgType.toObject(msg, { longs: Number });
}

// --- CelebrityBroadcastListMsg (S→C) MessageId=50516 ---
const CelebrityBroadcastListMsgType = defineType('CelebrityBroadcastListMsg', [
  { name: 'roomId', id: 1, type: 'uint32' },
  { name: 'mttId', id: 2, type: 'uint32' },
]);

function encodeCelebrityBroadcastListMsg(fields) {
  const msg = CelebrityBroadcastListMsgType.create(fields);
  const body = CelebrityBroadcastListMsgType.encode(msg).finish();
  return { topic: MessageId.CelebrityBroadcastListMsg, body };
}

function decodeCelebrityBroadcastListMsg(body) {
  const msg = CelebrityBroadcastListMsgType.decode(Buffer.from(body));
  return CelebrityBroadcastListMsgType.toObject(msg, { longs: Number });
}

module.exports = {
  // Types
  EmojiType,
  EmojiResType,
  AnimReqType,
  AnimResType,
  AnimMsgType,
  VoiceReqType,
  VoiceResType,
  VoiceMsgType,
  PlayerNickNameChangeMsgType,
  CelebrityBroadcastReqType,
  CelebrityBroadcastResType,
  CelebrityBroadcastNotifyFullMsgType,
  CelebrityBroadcastListMsgType,

  // Encode/Decode
  encodeEmoji, decodeEmoji,
  encodeEmojiRes, decodeEmojiRes,
  encodeAnimReq, decodeAnimReq,
  encodeAnimRes, decodeAnimRes,
  encodeAnimMsg, decodeAnimMsg,
  encodeVoiceReq, decodeVoiceReq,
  encodeVoiceRes, decodeVoiceRes,
  encodeVoiceMsg, decodeVoiceMsg,
  encodePlayerNickNameChangeMsg, decodePlayerNickNameChangeMsg,
  encodeCelebrityBroadcastReq, decodeCelebrityBroadcastReq,
  encodeCelebrityBroadcastRes, decodeCelebrityBroadcastRes,
  encodeCelebrityBroadcastNotifyFullMsg, decodeCelebrityBroadcastNotifyFullMsg,
  encodeCelebrityBroadcastListMsg, decodeCelebrityBroadcastListMsg,

  // Message IDs
  MSG_Emoji: MessageId.Emoji,
  MSG_EmojiRes: MessageId.EmojiRes,
  MSG_AnimReq: MessageId.AnimReq,
  MSG_AnimRes: MessageId.AnimRes,
  MSG_AnimMsg: MessageId.AnimMsg,
  MSG_VoiceReq: MessageId.VoiceReq,
  MSG_VoiceRes: MessageId.VoiceRes,
  MSG_VoiceMsg: MessageId.VoiceMsg,
  MSG_PlayerNickNameChangeMsg: MessageId.PlayerNickNameChangeMsg,
  MSG_CelebrityBroadcastReq: MessageId.CelebrityBroadcastReq,
  MSG_CelebrityBroadcastRes: MessageId.CelebrityBroadcastRes,
  MSG_CelebrityBroadcastNotifyFullMsg: MessageId.CelebrityBroadcastNotifyFullMsg,
  MSG_CelebrityBroadcastListMsg: MessageId.CelebrityBroadcastListMsg,
};
