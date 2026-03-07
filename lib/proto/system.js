'use strict';

const { defineType } = require('./_schema');

/**
 * System protocol messages — ping/pong, keep-alive, RealIp.
 */

// --- Ping (C→S / S→C) - empty message ---
const PingType = defineType('Ping', []);

function encodePing() {
  const msg = PingType.create({});
  const body = PingType.encode(msg).finish();
  return { topic: 0, body }; // topic 0 for ping by convention
}

function decodePing(body) {
  return {};
}

// --- Pong (C→S / S→C) - empty message ---
const PongType = defineType('Pong', []);

function encodePong() {
  const msg = PongType.create({});
  const body = PongType.encode(msg).finish();
  return { topic: 1, body }; // topic 1 for pong by convention
}

function decodePong(body) {
  return {};
}

// --- RealIp (S→C) ---
const RealIpType = defineType('RealIp', [
  { name: 'ip', id: 1, type: 'string' },
]);

function encodeRealIp({ ip }) {
  const msg = RealIpType.create({ ip });
  const body = RealIpType.encode(msg).finish();
  return { topic: 2, body };
}

function decodeRealIp(body) {
  const msg = RealIpType.decode(Buffer.from(body));
  return RealIpType.toObject(msg, { longs: Number });
}

module.exports = {
  PingType,
  PongType,
  RealIpType,

  encodePing, decodePing,
  encodePong, decodePong,
  encodeRealIp, decodeRealIp,
};
