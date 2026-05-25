const { createAdapter } = require('@socket.io/redis-adapter');
const Redis = require('ioredis');

/**
 * Sails.js-compatible socket.io Redis adapter.
 *
 * Wraps @socket.io/redis-adapter v8 with ioredis so Sails's
 * `sails-hook-sockets` can load it the same way it loads
 * `@sailshq/socket.io-redis` — as a factory function that
 * receives the sockets config and returns an adapter constructor.
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
module.exports = function sailsRedisAdapter(opts) {
  if (typeof opts === 'string') {
    opts = { url: opts };
  }
  opts = opts || {};

  const redisOpts = {};
  if (opts.url) {
    redisOpts.url = opts.url;
  } else {
    redisOpts.host = opts.host || '127.0.0.1';
    redisOpts.port = parseInt(opts.port, 10) || 6379;
    if (opts.pass) redisOpts.password = opts.pass;
    if (opts.password) redisOpts.password = opts.password;
    if (opts.db != null) redisOpts.db = parseInt(opts.db, 10);
  }

  const pubClient = new Redis(redisOpts);
  const subClient = pubClient.duplicate();

  pubClient.on('error', (err) => {
    console.error('[sails-redis-socket-adapter] pub error:', err.message);
  });
  subClient.on('error', (err) => {
    console.error('[sails-redis-socket-adapter] sub error:', err.message);
  });

  return createAdapter(pubClient, subClient);
};
