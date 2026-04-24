const express = require('express');
const router = express.Router();

const { requireAdmin } = require('../middleware/auth');
const { requireAuth } = require('../middleware/auth');
const { cacheGet } = require('../middleware/cacheMiddleware');
const { cacheKeys } = require('../utils/cacheKeys');

const api = require('../controllers/productApiController');
const cart = require('../controllers/cartApiController');

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

module.exports = router;