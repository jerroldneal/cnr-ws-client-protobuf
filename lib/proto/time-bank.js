'use strict';

const { defineType } = require('./_schema');
const { MessageId } = require('./enums');

/**
 * Time bank protocol messages.
 */

// --- TimeBankMsg (S→C) MessageId=60502 ---
const TimeBankMsgType = defineType('TimeBankMsg', [
  { name: 'roomId', id: 1, type: 'uint32' },
  { name: 'seatNum', id: 2, type: 'int32' },
  { name: 'timeBank', id: 3, type: 'int32' },
]);

function encodeTimeBankMsg(fields) {
  const msg = TimeBankMsgType.create(fields);
  const body = TimeBankMsgType.encode(msg).finish();
  return { topic: MessageId.TimeBankMsg, body };
}

function decodeTimeBankMsg(body) {
  const msg = TimeBankMsgType.decode(Buffer.from(body));
  return TimeBankMsgType.toObject(msg, { longs: Number });
}

// --- TimeBankDurationMsg (S→C) MessageId=60557 ---
const TimeBankDurationMsgType = defineType('TimeBankDurationMsg', [
  { name: 'roomId', id: 1, type: 'uint32' },
  { name: 'seatNum', id: 2, type: 'int32' },
  { name: 'timeBankDuration', id: 3, type: 'int32' },
  { name: 'offlineTimeBank', id: 4, type: 'int32' },
]);

function encodeTimeBankDurationMsg(fields) {
  const msg = TimeBankDurationMsgType.create(fields);
  const body = TimeBankDurationMsgType.encode(msg).finish();
  return { topic: MessageId.TimeBankDurationMsg, body };
}

function decodeTimeBankDurationMsg(body) {
  const msg = TimeBankDurationMsgType.decode(Buffer.from(body));
  return TimeBankDurationMsgType.toObject(msg, { longs: Number });
}

// --- BuyTimeReq (C→S) MessageId=60512 ---
const BuyTimeReqType = defineType('BuyTimeReq', [
  { name: 'roomId', id: 1, type: 'uint32' },
]);

function encodeBuyTimeReq({ roomId }) {
  const msg = BuyTimeReqType.create({ roomId });
  const body = BuyTimeReqType.encode(msg).finish();
  return { topic: MessageId.BuyTimeReq, body };
}

function decodeBuyTimeReq(body) {
  const msg = BuyTimeReqType.decode(Buffer.from(body));
  return BuyTimeReqType.toObject(msg, { longs: Number });
}

// --- BuyTimeRes (S→C) MessageId=60513 ---
const BuyTimeResType = defineType('BuyTimeRes', [
  { name: 'code', id: 1, type: 'int32' },
  { name: 'roomId', id: 2, type: 'uint32' },
  { name: 'userId', id: 3, type: 'uint32' },
  { name: 'duration', id: 4, type: 'int32' },
  { name: 'offlineTimeBank', id: 5, type: 'int32' },
]);

function encodeBuyTimeRes(fields) {
  const msg = BuyTimeResType.create(fields);
  const body = BuyTimeResType.encode(msg).finish();
  return { topic: MessageId.BuyTimeRes, body };
}

function decodeBuyTimeRes(body) {
  const msg = BuyTimeResType.decode(Buffer.from(body));
  return BuyTimeResType.toObject(msg, { longs: Number });
}

// --- TimeBankFlagSetReq (C→S) MessageId=60555 ---
const TimeBankFlagSetReqType = defineType('TimeBankFlagSetReq', [
  { name: 'roomId', id: 1, type: 'uint32' },
]);

function encodeTimeBankFlagSetReq({ roomId }) {
  const msg = TimeBankFlagSetReqType.create({ roomId });
  const body = TimeBankFlagSetReqType.encode(msg).finish();
  return { topic: MessageId.TimeBankFlagSetReq, body };
}

function decodeTimeBankFlagSetReq(body) {
  const msg = TimeBankFlagSetReqType.decode(Buffer.from(body));
  return TimeBankFlagSetReqType.toObject(msg, { longs: Number });
}

// --- TimeBankFlagSetRes (S→C) MessageId=60556 ---
const TimeBankFlagSetResType = defineType('TimeBankFlagSetRes', [
  { name: 'roomId', id: 1, type: 'uint32' },
  { name: 'code', id: 2, type: 'int32' },
]);

function encodeTimeBankFlagSetRes(fields) {
  const msg = TimeBankFlagSetResType.create(fields);
  const body = TimeBankFlagSetResType.encode(msg).finish();
  return { topic: MessageId.TimeBankFlagSetRes, body };
}

function decodeTimeBankFlagSetRes(body) {
  const msg = TimeBankFlagSetResType.decode(Buffer.from(body));
  return TimeBankFlagSetResType.toObject(msg, { longs: Number });
}

module.exports = {
  TimeBankMsgType,
  TimeBankDurationMsgType,
  BuyTimeReqType,
  BuyTimeResType,
  TimeBankFlagSetReqType,
  TimeBankFlagSetResType,

  encodeTimeBankMsg, decodeTimeBankMsg,
  encodeTimeBankDurationMsg, decodeTimeBankDurationMsg,
  encodeBuyTimeReq, decodeBuyTimeReq,
  encodeBuyTimeRes, decodeBuyTimeRes,
  encodeTimeBankFlagSetReq, decodeTimeBankFlagSetReq,
  encodeTimeBankFlagSetRes, decodeTimeBankFlagSetRes,

  MSG_TimeBankMsg: MessageId.TimeBankMsg,
  MSG_TimeBankDurationMsg: MessageId.TimeBankDurationMsg,
  MSG_BuyTimeReq: MessageId.BuyTimeReq,
  MSG_BuyTimeRes: MessageId.BuyTimeRes,
  MSG_TimeBankFlagSetReq: MessageId.TimeBankFlagSetReq,
  MSG_TimeBankFlagSetRes: MessageId.TimeBankFlagSetRes,
};
