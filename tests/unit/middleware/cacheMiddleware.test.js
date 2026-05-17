// tests/unit/middleware/cacheMiddleware.test.js

jest.mock('../../../utils/cache', () => ({
  getCache: jest.fn(),
  setCache: jest.fn()
}));

const { getCache, setCache } = require('../../../utils/cache');
const { cacheGet } = require('../../../middleware/cacheMiddleware');
const { createMockRequest, createMockResponse, createMockNext } = require('../../helpers/testHelpers');

describe('Cache Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('cacheGet', () => {
    it('should skip cache for non-GET requests', async () => {
      const middleware = cacheGet({ keyBuilder: () => 'test-key' });
      const req = createMockRequest({ method: 'POST' });
      const res = createMockResponse();
      const next = jest.fn();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(getCache).not.toHaveBeenCalled();
    });

    it('should skip cache when skip function returns true', async () => {
      const middleware = cacheGet({
        keyBuilder: () => 'test-key',
        skip: (req) => req.query.nocache === 'true'
      });
      const req = createMockRequest({ method: 'GET', query: { nocache: 'true' } });
      const res = createMockResponse();
      const next = jest.fn();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(getCache).not.toHaveBeenCalled();
    });

    it('should return cached JSON data if available', async () => {
      const cachedData = { id: 1, name: 'Test' };
      getCache.mockResolvedValue(cachedData);

      const middleware = cacheGet({
        keyBuilder: () => 'test-key',
        contentType: 'json'
      });
      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();
      const next = jest.fn();

      await middleware(req, res, next);

      expect(getCache).toHaveBeenCalledWith('test-key');
      expect(res.json).toHaveBeenCalledWith(cachedData);
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next for cache miss', async () => {
      getCache.mockResolvedValue(null);
      setCache.mockResolvedValue(true);

      const middleware = cacheGet({
        keyBuilder: () => 'test-key',
        contentType: 'json',
        ttl: 60
      });
      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();
      const next = jest.fn();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should cache successful JSON responses', async () => {
      getCache.mockResolvedValue(null);
      setCache.mockResolvedValue(true);

      const middleware = cacheGet({
        keyBuilder: () => 'test-key',
        contentType: 'json',
        ttl: 60
      });
      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();
      const next = jest.fn();

      await middleware(req, res, next);

      // Simulate handler calling res.json
      const testData = { id: 1, name: 'Test' };
      res.json(testData);

      expect(setCache).toHaveBeenCalledWith('test-key', testData, 60);
    });

    it('should handle cache errors gracefully', async () => {
      getCache.mockRejectedValue(new Error('Cache error'));

      const middleware = cacheGet({ keyBuilder: () => 'test-key' });
      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();
      const next = jest.fn();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
