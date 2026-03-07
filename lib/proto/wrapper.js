'use strict';

const { defineType } = require('./_schema');
const { MessageId } = require('./enums');

/**
 * Wrapper — the framing envelope for all protocol messages.
 * Wire format: [4-byte BE length][2-byte BE MessageId][protobuf body]
 * Protobuf Wrapper: { topic:int32, body:bytes }
 */

const WrapperType = defineType('Wrapper', [
  { name: 'topic', id: 1, type: 'int32' },
  { name: 'body', id: 2, type: 'bytes' },
]);

/**
 * Encode a Wrapper envelope.
 * @param {number} topic - MessageId
 * @param {Uint8Array} body - Serialized inner message
 * @returns {Buffer} Wire-format bytes: [4-byte BE length][2-byte BE topic][body]
 */
function encodeWrapper(topic, body) {
  const totalLen = 2 + body.length;
  const buf = Buffer.alloc(4 + totalLen);
  buf.writeUInt32BE(totalLen, 0);
  buf.writeUInt16BE(topic, 4);
  Buffer.from(body).copy(buf, 6);
  return buf;
}

/**
 * Decode wire-format bytes into topic + body.
 * @param {Buffer} wire - Raw wire bytes (with or without 4-byte length prefix)
 * @returns {{ topic: number, body: Buffer }}
 */
function decodeWrapper(wire) {
  // If starts with length prefix, skip it
  let offset = 0;
  if (wire.length > 4) {
    const declaredLen = wire.readUInt32BE(0);
    if (declaredLen + 4 === wire.length) {
      offset = 4;
    }
  }
  const topic = wire.readUInt16BE(offset);
  const body = wire.slice(offset + 2);
  return { topic, body };
}

/**
 * Encode a Wrapper using protobuf format (for WebSocket frames that use protobuf Wrapper).
 * @param {number} topic
 * @param {Uint8Array} body
 * @returns {Uint8Array}
 */
function encodeWrapperProto(topic, body) {
  const msg = WrapperType.create({ topic, body });
  return WrapperType.encode(msg).finish();
}

/**
 * Decode a protobuf Wrapper message.
 * @param {Uint8Array} data
 * @returns {{ topic: number, body: Uint8Array }}
 */
function decodeWrapperProto(data) {
  const msg = WrapperType.decode(Buffer.from(data));
  return WrapperType.toObject(msg, { bytes: Buffer });
}

/**
 * Parse a stream buffer, extracting all complete wire-format messages.
 * Returns extracted messages and remaining buffer.
 * @param {Buffer} buffer - Accumulated stream data
 * @returns {{ messages: Array<{topic: number, body: Buffer}>, remaining: Buffer }}
 */
function parseStream(buffer) {
  const messages = [];
  let offset = 0;
  while (offset + 4 <= buffer.length) {
    const len = buffer.readUInt32BE(offset);
    if (offset + 4 + len > buffer.length) break; // incomplete
    const topic = buffer.readUInt16BE(offset + 4);
    const body = buffer.slice(offset + 6, offset + 4 + len);
    messages.push({ topic, body });
    offset += 4 + len;
  }
  return { messages, remaining: buffer.slice(offset) };
}

module.exports = {
  WrapperType,
  encodeWrapper,
  decodeWrapper,
  encodeWrapperProto,
  decodeWrapperProto,
  parseStream,
};
