//utils/cacheKeys.js
const cacheKeys = {
    products: 'products',
    homeProducts: 'home:products',
    topProducts: 'top3:products',
    catalog: (category = 'all') => `catalog:${category || 'all'}`,
    catalogPattern: 'catalog:*',
    product: (id) => `product:${id}`,
    reviews: (productId) => `reviews:${productId}`,
    cart: (userId) => `cart:${userId}`
};

module.exports = { cacheKeys };