let mockRedisData = {};

/**
 * In-memory Redis mock for tests. Implements a subset of Redis commands used
 * by the application (`get`, `set`, `setEx`, `del`, `scan`, `flushAll`, `ping`).
 * Each method is a `jest.fn` so tests can assert calls and control behavior.
 */
const redisMock = {
  /**
   * Async mock: return stored value by key or null when missing.
   */
  get: jest.fn(async (key) => {
    return mockRedisData[key] || null;
  }),

  /**
   * Async mock: store a key/value pair and return 'OK'.
   */
  set: jest.fn(async (key, value) => {
    mockRedisData[key] = value;
    return 'OK';
  }),

  /**
   * Async mock: set a key with TTL (TTL ignored in this in-memory mock).
   */
  setEx: jest.fn(async (key, ttl, value) => {
    mockRedisData[key] = value;
    return 'OK';
  }),

  /**
   * Async mock: delete provided keys and return the number of deleted keys.
   */
  del: jest.fn(async (...keys) => {
    let deleted = 0;
    keys.forEach(key => {
      if (mockRedisData[key]) {
        delete mockRedisData[key];
        deleted++;
      }
    });
    return deleted;
  }),

  /**
   * Async mock: simulate Redis SCAN with optional MATCH pattern and COUNT.
   */
  scan: jest.fn(async (cursor, options) => {
    const pattern = options?.MATCH;
    const keys = Object.keys(mockRedisData);
    let matchedKeys = keys;

    if (pattern) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      matchedKeys = keys.filter(k => regex.test(k));
    }

    return {
      cursor: '0',
      keys: matchedKeys.slice(0, options?.COUNT || 10)
    };
  }),

  /**
   * Async mock: clear all stored keys.
   */
  flushAll: jest.fn(async () => {
    mockRedisData = {};
    return 'OK';
  }),

  /**
   * Async mock: respond to ping with 'PONG'.
   */
  ping: jest.fn(async () => 'PONG'),

  /**
   * Synchronous helper to clear the in-memory store and reset jest mocks.
   */
  clearMock: () => {
    mockRedisData = {};
    jest.clearAllMocks();
  }
};

module.exports = redisMock;
