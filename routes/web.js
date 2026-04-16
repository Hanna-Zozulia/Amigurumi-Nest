const express = require('express');
const router = express.Router();

const productController = require('../controllers/productController');
const cartController = require('../controllers/cartWebController');
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

// ===== ГЛАВНАЯ =====
router.get('/', productController.homePage);

// ===== СТАТИЧЕСКИЕ СТРАНИЦЫ =====
router.get('/info', (req, res) => res.render('info'));
router.get('/history', (req, res) => res.render('history'));

// ===== КАТАЛОГ =====
router.get('/catalog', productController.listPage);
router.get('/top3', productController.top3Page);

// ===== ОТЗЫВЫ =====
router.post('/review/add', productController.addReview);
router.get('/review/edit/:id', productController.editReviewForm);
router.post('/review/edit/:id', productController.updateReview);
router.post('/review/delete/:id', productController.deleteReview);

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
router.get('/cart', cartController.show);
router.post('/cart/add', cartController.add);
router.post('/cart/remove', cartController.removeOne);
router.post('/cart/clear', cartController.clear);

// ===== CHECKOUT =====
router.get('/checkout', requireAuth, (req, res) => {
    res.render('checkout');
});

module.exports = router;