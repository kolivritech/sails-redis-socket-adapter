const Redis = require('ioredis');
const crypto = require('crypto');
const { Adapter } = require('socket.io-adapter');

const PREFIX = '[sails-redis-socket-adapter]';
const CHANNEL = 'socket.io#';

/**
 * Sails.js-compatible socket.io Redis adapter.
 *
 * Extends socket.io's OWN Adapter class (from the host app's socket.io-adapter)
 * and adds Redis pub/sub for cross-replica delivery. This avoids the version
 * mismatch that breaks @sailshq/socket.io-redis and @socket.io/redis-adapter
 * (both ship their own socket.io-adapter which conflicts with socket.io's bundled copy).
 *
 * Usage in config/env/production.js:
 *
 *   sockets: {
 *     adapter: '@kolivri/sails-redis-socket-adapter',
 *     host: process.env.REDIS_HOST || '127.0.0.1',
 *     port: 6379,
 *     pass: process.env.REDIS_PASSWORD || undefined,
 *     db: 0,
 *   }
 */

class RedisAdapter extends Adapter {
  constructor(nsp, pubClient, subClient, uid) {
    super(nsp);
    this.uid = uid;
    this.pubClient = pubClient;
    this.subClient = subClient;
    this.channel = CHANNEL + nsp.name + '#';

    this.subClient.subscribe(this.channel, (err) => {
      if (err) console.error(`${PREFIX} subscribe error:`, err.message);
    });

    this.subClient.on('messageBuffer', (channel, msg) => {
      this._onMessage(channel, msg);
    });
  }

  _onMessage(channel, msg) {
    let parsed;
    try {
      parsed = JSON.parse(msg.toString());
    } catch {
      return;
    }

    const [uid, packet, opts] = parsed;
    if (uid === this.uid) return;

    if (packet && packet.nsp === undefined) {
      packet.nsp = '/';
    }
    if (!packet || packet.nsp !== this.nsp.name) return;

    opts.rooms = new Set(opts.rooms || []);
    opts.except = new Set(opts.except || []);
    super.broadcast(packet, opts);
  }

  broadcast(packet, opts) {
    packet.nsp = this.nsp.name;
    const onlyLocal = opts && opts.flags && opts.flags.local;

    if (!onlyLocal) {
      const rawOpts = {
        rooms: [...(opts.rooms || [])],
        except: [...new Set(opts.except || [])],
        flags: opts.flags,
      };
      const msg = JSON.stringify([this.uid, packet, rawOpts]);
      let channel = this.channel;
      if (opts.rooms && opts.rooms.size === 1) {
        channel += opts.rooms.keys().next().value + '#';
      }
      this.pubClient.publish(channel, msg);
    }
    super.broadcast(packet, opts);
  }

  close() {
    this.subClient.unsubscribe(this.channel).catch(() => {});
    if (super.close) super.close();
  }
}

module.exports = function sailsRedisAdapter(opts) {
  if (typeof opts === 'string') {
    opts = { url: opts };
  }
  opts = opts || {};

  const redisOpts = {};
  if (opts.url) {
    Object.assign(redisOpts, { host: undefined, port: undefined });
    redisOpts.url = opts.url;
  } else {
    redisOpts.host = opts.host || '127.0.0.1';
    redisOpts.port = parseInt(opts.port, 10) || 6379;
    if (opts.pass) redisOpts.password = opts.pass;
    if (opts.password) redisOpts.password = opts.password;
    if (opts.db != null) redisOpts.db = parseInt(opts.db, 10);
  }

  console.log(`${PREFIX} Creating Redis clients (${redisOpts.host || redisOpts.url}:${redisOpts.port || ''})`);

  const pubClient = new Redis(redisOpts);
  const subClient = pubClient.duplicate();
  const uid = crypto.randomBytes(6).toString('hex');

  pubClient.on('connect', () => console.log(`${PREFIX} pub connected`));
  subClient.on('connect', () => console.log(`${PREFIX} sub connected`));
  pubClient.on('error', (err) => console.error(`${PREFIX} pub error:`, err.message));
  subClient.on('error', (err) => console.error(`${PREFIX} sub error:`, err.message));

  return function (nsp) {
    return new RedisAdapter(nsp, pubClient, subClient, uid);
  };
};
