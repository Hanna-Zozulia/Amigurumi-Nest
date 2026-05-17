// tests/unit/utils/cache.test.js

jest.mock('../../../config/redis', () => ({
  getRedisClient: jest.fn()
}));

const { getRedisClient } = require('../../../config/redis');
const { getCache, setCache, deleteCache, clearCacheByPattern, cached } = require('../../../utils/cache');
const redisMock = require('../../helpers/redisMock');

describe('Cache Utils', () => {
  beforeEach(() => {
    getRedisClient.mockReturnValue(redisMock);
    redisMock.clearMock();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCache', () => {
    it('should return cached value when key exists', async () => {
      const testData = { id: 1, name: 'Test' };
      redisMock.get.mockResolvedValue(JSON.stringify(testData));

      const result = await getCache('test-key');

      expect(result).toEqual(testData);
      expect(redisMock.get).toHaveBeenCalledWith('test-key');
    });

    it('should return null when key does not exist', async () => {
      redisMock.get.mockResolvedValue(null);

      const result = await getCache('non-existent-key');

      expect(result).toBeNull();
    });

    it('should handle invalid JSON gracefully', async () => {
      redisMock.get.mockResolvedValue('invalid json{');

      const result = await getCache('invalid-json-key');

      expect(result).toBeNull();
    });

    it('should handle Redis errors gracefully', async () => {
      redisMock.get.mockRejectedValue(new Error('Redis connection error'));

      const result = await getCache('error-key');

      expect(result).toBeNull();
    });
  });

  describe('setCache', () => {
    it('should set cache value with TTL', async () => {
      const testData = { id: 1, name: 'Test' };
      redisMock.setEx.mockResolvedValue('OK');

      const result = await setCache('test-key', testData, 60);

      expect(result).toBe(true);
      expect(redisMock.setEx).toHaveBeenCalledWith('test-key', 60, JSON.stringify(testData));
    });

    it('should handle Redis errors when setting cache', async () => {
      redisMock.setEx.mockRejectedValue(new Error('Redis error'));

      const result = await setCache('error-key', {}, 60);

      expect(result).toBe(false);
    });
  });

  describe('deleteCache', () => {
    it('should delete cache key', async () => {
      redisMock.del.mockResolvedValue(1);

      const result = await deleteCache('test-key');

      expect(result).toBe(1);
      expect(redisMock.del).toHaveBeenCalledWith('test-key');
    });

    it('should return 0 when key does not exist', async () => {
      redisMock.del.mockResolvedValue(0);

      const result = await deleteCache('non-existent-key');

      expect(result).toBe(0);
    });
  });

  describe('clearCacheByPattern', () => {
    it('should clear cache keys matching pattern', async () => {
      redisMock.scan.mockResolvedValue({
        cursor: '0',
        keys: ['product:1', 'product:2', 'product:3']
      });
      redisMock.del.mockResolvedValue(3);

      const result = await clearCacheByPattern('product:*');

      expect(result).toBe(3);
      expect(redisMock.scan).toHaveBeenCalled();
      expect(redisMock.del).toHaveBeenCalled();
    });

    it('should handle empty pattern results', async () => {
      redisMock.scan.mockResolvedValue({
        cursor: '0',
        keys: []
      });

      const result = await clearCacheByPattern('nonexistent:*');

      expect(result).toBe(0);
    });
  });

  describe('cached', () => {
    it('should return cached value if available', async () => {
      const testData = { id: 1, name: 'Test' };
      redisMock.get.mockResolvedValue(JSON.stringify(testData));

      const result = await cached('test-key', 60, async () => ({ id: 2 }));

      expect(result).toEqual(testData);
    });

    it('should call loader function if cache miss', async () => {
      const testData = { id: 1, name: 'Fresh Data' };
      redisMock.get.mockResolvedValue(null);
      redisMock.setEx.mockResolvedValue('OK');
      const loaderFn = jest.fn(async () => testData);

      const result = await cached('test-key', 60, loaderFn);

      expect(result).toEqual(testData);
      expect(loaderFn).toHaveBeenCalled();
    });

    it('should cache loaded data', async () => {
      const testData = { id: 1, name: 'Fresh Data' };
      redisMock.get.mockResolvedValue(null);
      redisMock.setEx.mockResolvedValue('OK');
      const loaderFn = jest.fn(async () => testData);

      await cached('test-key', 60, loaderFn);

      expect(redisMock.setEx).toHaveBeenCalledWith('test-key', 60, JSON.stringify(testData));
    });
  });
});
