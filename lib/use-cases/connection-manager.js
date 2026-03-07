'use strict';

const { EventEmitter } = require('events');
const proto = require('../proto');

/**
 * ConnectionManager — WebSocket lifecycle: connect, auth, keep-alive, reconnect.
 *
 * Events:
 *   'connected'     — WebSocket open
 *   'authenticated' — UserTokenRes received with code=0
 *   'message'       — { topic, name, fields } for every decoded message
 *   'raw'           — { topic, body } for messages without a decoder
 *   'disconnected'  — WebSocket closed
 *   'error'         — Error object
 *   'ping'          — Ping sent
 *   'pong'          — Pong received
 */
class ConnectionManager extends EventEmitter {
  constructor({ url, userId, token, hideHole = false, pingInterval = 15000, reconnect = true, maxReconnectDelay = 30000 }) {
    super();
    this._url = url;
    this._userId = userId;
    this._token = token;
    this._hideHole = hideHole;
    this._pingInterval = pingInterval;
    this._reconnect = reconnect;
    this._maxReconnectDelay = maxReconnectDelay;
    this._ws = null;
    this._pingTimer = null;
    this._reconnectDelay = 1000;
    this._closed = false;
    this._authenticated = false;
    this._streamBuf = Buffer.alloc(0);
  }

  get authenticated() { return this._authenticated; }
  get connected() { return this._ws && this._ws.readyState === 1; }

  connect() {
    this._closed = false;
    const WebSocket = require('ws');
    this._ws = new WebSocket(this._url);
    this._ws.binaryType = 'arraybuffer';

    this._ws.on('open', () => {
      this._reconnectDelay = 1000;
      this.emit('connected');
      this._sendAuth();
      this._startPing();
    });

    this._ws.on('message', (data) => {
      this._onData(Buffer.from(data));
    });

    this._ws.on('close', () => {
      this._stopPing();
      this._authenticated = false;
      this.emit('disconnected');
      if (this._reconnect && !this._closed) {
        setTimeout(() => this.connect(), this._reconnectDelay);
        this._reconnectDelay = Math.min(this._reconnectDelay * 2, this._maxReconnectDelay);
      }
    });

    this._ws.on('error', (err) => {
      this.emit('error', err);
    });
  }

  disconnect() {
    this._closed = true;
    this._stopPing();
    if (this._ws) this._ws.close();
  }

  send(topic, body) {
    if (!this.connected) return false;
    const wire = proto.encodeWrapper(topic, body);
    this._ws.send(wire);
    return true;
  }

  sendEncoded({ topic, body }) {
    return this.send(topic, body);
  }

  _sendAuth() {
    const { topic, body } = proto.encodeUserTokenReq({
      userId: this._userId,
      token: this._token,
      hideHole: this._hideHole,
    });
    this.send(topic, body);
  }

  _startPing() {
    this._stopPing();
    this._pingTimer = setInterval(() => {
      if (this.connected) {
        const { topic, body } = proto.encodePing();
        this.send(topic, body);
        this.emit('ping');
      }
    }, this._pingInterval);
  }

  _stopPing() {
    if (this._pingTimer) {
      clearInterval(this._pingTimer);
      this._pingTimer = null;
    }
  }

  _onData(chunk) {
    this._streamBuf = Buffer.concat([this._streamBuf, chunk]);
    const { messages, remaining } = proto.parseStream(this._streamBuf);
    this._streamBuf = remaining;

    for (const { topic, body } of messages) {
      // Handle auth response
      if (topic === proto.MessageId.UserTokenRes) {
        const fields = proto.decodeUserTokenRes(body);
        this._authenticated = fields.code === 0;
        this.emit('authenticated', fields);
      }

      // Decode and emit
      const decoded = proto.decodeByTopic(topic, body);
      if (decoded) {
        this.emit('message', decoded);
      } else {
        this.emit('raw', { topic, body });
      }
    }
  }
}

module.exports = ConnectionManager;
