const express = require('express');
const router = express.Router();

const productController = require('../controllers/productController');
const cartController = require('../controllers/cartWebController');
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

// ===== ГЛАВНАЯ =====
router.get('/', productController.listPage);

// ===== СТАТИЧЕСКИЕ СТРАНИЦЫ =====
router.get('/info', (req, res) => res.render('info'));
router.get('/history', (req, res) => res.render('history'));
router.get('/top3', (req, res) => res.render('top3'));

// ===== КАТАЛОГ =====
router.get('/catalog', productController.listPage);

// ===== ПРОДУКТ =====
router.get('/product/:id', productController.showPage);

// ===== AUTH =====
router.get('/login', authController.getLogin);
router.post('/login', authController.postLogin);
router.post('/logout', authController.postLogout);

// Регистрация (пока просто форма)
router.get('/register', (req, res) => {
    res.render('login', { type: 'register' });
});

// ===== КОРЗИНА =====
router.get('/cart', requireAuth, cartController.show);
router.post('/cart/add', requireAuth, cartController.add);
router.post('/cart/remove', requireAuth, cartController.removeOne);
router.post('/cart/clear', requireAuth, cartController.clear);

// ===== CHECKOUT =====
router.get('/checkout', requireAuth, (req, res) => {
    res.render('checkout');
});

module.exports = router;