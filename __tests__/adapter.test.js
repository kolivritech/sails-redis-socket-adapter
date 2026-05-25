const sailsRedisAdapter = require('../index');

describe('sails-redis-socket-adapter', () => {
  test('exports a function', () => {
    expect(typeof sailsRedisAdapter).toBe('function');
  });

  test('returns a function (adapter constructor) when called with config', () => {
    const result = sailsRedisAdapter({
      host: '127.0.0.1',
      port: 6379,
    });
    expect(typeof result).toBe('function');
  });

  test('accepts string URL config', () => {
    const result = sailsRedisAdapter('redis://127.0.0.1:6379');
    expect(typeof result).toBe('function');
  });

  test('accepts pass field (Sails convention)', () => {
    const result = sailsRedisAdapter({
      host: '127.0.0.1',
      port: 6379,
      pass: 'mypassword',
    });
    expect(typeof result).toBe('function');
  });

  test('accepts password field', () => {
    const result = sailsRedisAdapter({
      host: '127.0.0.1',
      port: 6379,
      password: 'mypassword',
    });
    expect(typeof result).toBe('function');
  });

  test('handles empty/null config', () => {
    const result = sailsRedisAdapter({});
    expect(typeof result).toBe('function');
  });
});
