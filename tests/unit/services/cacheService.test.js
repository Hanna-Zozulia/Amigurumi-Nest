// tests/unit/services/cacheService.test.js

jest.mock('../../../utils/cache', () => ({
  deleteCache: jest.fn(),
  clearCacheByPattern: jest.fn()
}));

const { deleteCache, clearCacheByPattern } = require('../../../utils/cache');
const { cacheKeys } = require('../../../utils/cacheKeys');
const { invalidateProductCache, invalidateReviewsCache, invalidateCartCache } = require('../../../services/cacheService');

describe('Cache Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('invalidateProductCache', () => {
    it('should invalidate all product-related cache', async () => {
      deleteCache.mockResolvedValue(1);
      clearCacheByPattern.mockResolvedValue(5);

      await invalidateProductCache(1);

      expect(deleteCache).toHaveBeenCalledWith(cacheKeys.products);
      expect(deleteCache).toHaveBeenCalledWith(cacheKeys.homeProducts);
      expect(deleteCache).toHaveBeenCalledWith(cacheKeys.topProducts);
      expect(clearCacheByPattern).toHaveBeenCalledWith(cacheKeys.catalogPattern);
    });

    it('should invalidate specific product cache when productId provided', async () => {
      deleteCache.mockResolvedValue(1);

      await invalidateProductCache(1);

      expect(deleteCache).toHaveBeenCalledWith(cacheKeys.product(1));
      expect(deleteCache).toHaveBeenCalledWith(cacheKeys.reviews(1));
    });

    it('should not invalidate specific product cache when productId not provided', async () => {
      deleteCache.mockResolvedValue(1);

      await invalidateProductCache(null);

      expect(deleteCache).not.toHaveBeenCalledWith(cacheKeys.product(null));
    });
  });

  describe('invalidateReviewsCache', () => {
    it('should invalidate reviews and product cache', async () => {
      deleteCache.mockResolvedValue(1);

      await invalidateReviewsCache(1);

      expect(deleteCache).toHaveBeenCalledWith(cacheKeys.reviews(1));
      expect(deleteCache).toHaveBeenCalledWith(cacheKeys.product(1));
    });

    it('should do nothing when productId not provided', async () => {
      await invalidateReviewsCache(null);

      expect(deleteCache).not.toHaveBeenCalled();
    });
  });

  describe('invalidateCartCache', () => {
    it('should invalidate cart cache for user', async () => {
      deleteCache.mockResolvedValue(1);

      await invalidateCartCache(1);

      expect(deleteCache).toHaveBeenCalledWith(cacheKeys.cart(1));
    });

    it('should do nothing when userId not provided', async () => {
      await invalidateCartCache(null);

      expect(deleteCache).not.toHaveBeenCalled();
    });
  });
});
