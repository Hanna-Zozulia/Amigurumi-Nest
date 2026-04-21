const express = require('express');
const router = express.Router();

const { requireAdmin } = require('../middleware/auth');
const { requireAuth } = require('../middleware/auth');

const api = require('../controllers/productApiController');
const cart = require('../controllers/cartApiController');

// ================= PRODUCTS =================
router.get('/products', api.list);
router.get('/products/:id', api.getOne);
router.post('/products', requireAdmin, api.create);
router.put('/products/:id', requireAdmin, api.update);
router.delete('/products/:id', requireAdmin, api.remove);

// ================= CART =================
router.get('/cart', requireAuth, cart.getCart);
router.post('/cart/add', requireAuth, cart.add);
router.post('/cart/remove', requireAuth, cart.removeOne);
router.post('/cart/clear', requireAuth, cart.clear);

module.exports = router;