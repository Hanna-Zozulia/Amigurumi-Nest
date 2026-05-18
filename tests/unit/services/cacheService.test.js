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

  /**
   * invalidateProductCache: should clear global product lists and, when a
   * productId is provided, clear per-product and reviews cache keys.
   */
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

  /**
   * invalidateReviewsCache: clears product and reviews specific cache when
   * productId is provided; otherwise does nothing.
   */
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

  /**
   * invalidateCartCache: clears the cart cache for a user when userId is
   * provided; otherwise is a no-op.
   */
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
