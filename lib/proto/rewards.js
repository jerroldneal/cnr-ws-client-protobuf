'use strict';

const { defineType } = require('./_schema');
const { MessageId } = require('./enums');

/**
 * Rewards and prizes protocol messages.
 */

// --- EnterRewardMsg (S→C) MessageId=60507 ---
const EnterRewardMsgType = defineType('EnterRewardMsg', [
  { name: 'mttId', id: 1, type: 'uint32' },
  { name: 'userId', id: 2, type: 'uint32' },
]);

function encodeEnterRewardMsg(fields) {
  const msg = EnterRewardMsgType.create(fields);
  const body = EnterRewardMsgType.encode(msg).finish();
  return { topic: MessageId.EnterRewardMsg, body };
}

function decodeEnterRewardMsg(body) {
  const msg = EnterRewardMsgType.decode(Buffer.from(body));
  return EnterRewardMsgType.toObject(msg, { longs: Number });
}

// --- RewardMsg (S→C) MessageId=60508 ---
const RewardMsgType = defineType('RewardMsg', [
  { name: 'mttId', id: 1, type: 'uint32' },
  { name: 'mttName', id: 2, type: 'string' },
  { name: 'userId', id: 3, type: 'uint32' },
  { name: 'rewardType', id: 4, type: 'int32' },
  { name: 'rank', id: 5, type: 'int32' },
  { name: 'reward', id: 6, type: 'uint64' },
  { name: 'leftRejoinCount', id: 7, type: 'int32' },
  { name: 'toolName', id: 8, type: 'string' },
  { name: 'toolValue', id: 9, type: 'uint64' },
]);

function encodeRewardMsg(fields) {
  const msg = RewardMsgType.create(fields);
  const body = RewardMsgType.encode(msg).finish();
  return { topic: MessageId.RewardMsg, body };
}

function decodeRewardMsg(body) {
  const msg = RewardMsgType.decode(Buffer.from(body));
  return RewardMsgType.toObject(msg, { longs: Number });
}

module.exports = {
  EnterRewardMsgType,
  RewardMsgType,

  encodeEnterRewardMsg, decodeEnterRewardMsg,
  encodeRewardMsg, decodeRewardMsg,

  MSG_EnterRewardMsg: MessageId.EnterRewardMsg,
  MSG_RewardMsg: MessageId.RewardMsg,
};
