// tests/helpers/redisMock.js - мокирование Redis для тестов

let mockRedisData = {};

const redisMock = {
  get: jest.fn(async (key) => {
    return mockRedisData[key] || null;
  }),

  set: jest.fn(async (key, value) => {
    mockRedisData[key] = value;
    return 'OK';
  }),

  setEx: jest.fn(async (key, ttl, value) => {
    mockRedisData[key] = value;
    return 'OK';
  }),

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

  flushAll: jest.fn(async () => {
    mockRedisData = {};
    return 'OK';
  }),

  ping: jest.fn(async () => 'PONG'),

  clearMock: () => {
    mockRedisData = {};
    jest.clearAllMocks();
  }
};

module.exports = redisMock;
