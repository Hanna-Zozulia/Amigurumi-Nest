const express = require('express');
const router = express.Router();

const { requireAdmin, requireAuth } = require('../middleware/auth');
const { cacheGet } = require('../middleware/cacheMiddleware');
const { cacheKeys } = require('../utils/cacheKeys');

const api = require('../controllers/productApiController');
const cart = require('../controllers/cartApiController');
const orderAdminController = require('../controllers/orderAdminController');

/**
 * Returns the cache key for the product list endpoint.
 */
function getProductsCacheKey() {
	return cacheKeys.products;
}

/**
 * Returns the cache key for a single product endpoint.
 */
function getProductCacheKey(req) {
	return cacheKeys.product(req.params.id);
}

/**
 * Returns the cache key for the current user's cart endpoint.
 */
function getCartCacheKey(req) {
	return cacheKeys.cart(req.session.user?.id || 'guest');
}

// ================= PRODUCTS =================
router.get('/products', cacheGet({ keyBuilder: () => cacheKeys.products, ttl: 60 }), api.list);
router.get('/products/:id', cacheGet({ keyBuilder: (req) => cacheKeys.product(req.params.id), ttl: 60 }), api.getOne);
router.post('/products', requireAdmin, api.create);
router.put('/products/:id', requireAdmin, api.update);
router.delete('/products/:id', requireAdmin, api.remove);

// ================= CART =================
router.get('/cart', requireAuth, cacheGet({ keyBuilder: (req) => cacheKeys.cart(req.session.user?.id || 'guest'), ttl: 30 }), cart.getCart);
router.post('/cart/add', requireAuth, cart.add);
router.post('/cart/remove', requireAuth, cart.removeOne);
router.post('/cart/clear', requireAuth, cart.clear);

// ================= ORDERS =================
router.get('/orders', requireAdmin, orderAdminController.listOrdersApi);
router.get('/orders/:id', requireAdmin, orderAdminController.orderDetailsApi);
router.patch('/orders/:id/status', requireAdmin, orderAdminController.updateOrderStatus);

module.exports = router;