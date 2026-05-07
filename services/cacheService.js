// services/cacheService.js
// Cache invalidation utilities

const { deleteCache, clearCacheByPattern } = require('../utils/cache');
const { cacheKeys } = require('../utils/cacheKeys');

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

async function invalidateReviewsCache(productId) {
    if (!productId) return;

    await deleteCache(cacheKeys.reviews(productId));
    await deleteCache(cacheKeys.product(productId));
}

async function invalidateCartCache(userId) {
    if (!userId) return;

    await deleteCache(cacheKeys.cart(userId));
}

module.exports = {
    invalidateProductCache,
    invalidateReviewsCache,
    invalidateCartCache
};
