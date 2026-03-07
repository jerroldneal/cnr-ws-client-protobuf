'use strict';

const { defineType } = require('./_schema');
const { MessageId } = require('./enums');

/**
 * Authentication protocol messages.
 */

// --- UserTokenReq (C→S) MessageId=50001 ---
const UserTokenReqType = defineType('UserTokenReq', [
  { name: 'userId', id: 1, type: 'uint32' },
  { name: 'token', id: 2, type: 'string' },
  { name: 'hideHole', id: 3, type: 'bool' },
]);

function encodeUserTokenReq({ userId, token, hideHole = false }) {
  const msg = UserTokenReqType.create({ userId, token, hideHole });
  const body = UserTokenReqType.encode(msg).finish();
  return { topic: MessageId.UserTokenReq, body };
}

function decodeUserTokenReq(body) {
  const msg = UserTokenReqType.decode(Buffer.from(body));
  return UserTokenReqType.toObject(msg, { longs: Number });
}

// --- UserTokenRes (S→C) MessageId=50002 ---
const UserTokenResType = defineType('UserTokenRes', [
  { name: 'code', id: 1, type: 'int32' },
]);

function encodeUserTokenRes({ code }) {
  const msg = UserTokenResType.create({ code });
  const body = UserTokenResType.encode(msg).finish();
  return { topic: MessageId.UserTokenRes, body };
}

function decodeUserTokenRes(body) {
  const msg = UserTokenResType.decode(Buffer.from(body));
  return UserTokenResType.toObject(msg, { longs: Number });
}

module.exports = {
  UserTokenReqType,
  UserTokenResType,
  encodeUserTokenReq,
  decodeUserTokenReq,
  encodeUserTokenRes,
  decodeUserTokenRes,
  MSG_UserTokenReq: MessageId.UserTokenReq,
  MSG_UserTokenRes: MessageId.UserTokenRes,
};
