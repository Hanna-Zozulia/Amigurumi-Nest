const { deleteCache, clearCacheByPattern } = require('../utils/cache');
const { cacheKeys } = require('../utils/cacheKeys');

/**
 * Invalidates cache entries related to products and catalog pages.
 * If a `productId` is provided, clears product-specific caches as well.
 */
async function invalidateProductCache(productId) {
    await deleteCache(cacheKeys.products);
    await deleteCache(cacheKeys.homeProducts);
    await deleteCache(cacheKeys.topProducts);
    await clearCacheByPattern(cacheKeys.catalogPattern);

    if (productId) {
        await deleteCache(cacheKeys.product(productId));
        await deleteCache(cacheKeys.reviews(productId));
    }
}

/**
 * Invalidates cache entries for reviews of a specific product.
 */
async function invalidateReviewsCache(productId) {
    if (!productId) return;

    await deleteCache(cacheKeys.reviews(productId));
    await deleteCache(cacheKeys.product(productId));
}

/**
 * Invalidates the cache entry for a specific user's cart.
 */
async function invalidateCartCache(userId) {
    if (!userId) return;

    await deleteCache(cacheKeys.cart(userId));
}

module.exports = {
    invalidateProductCache,
    invalidateReviewsCache,
    invalidateCartCache
};
