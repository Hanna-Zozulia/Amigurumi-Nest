const express = require('express');
const router = express.Router();

const productController = require('../controllers/productController');
const cartController = require('../controllers/cartWebController');
const authController = require('../controllers/authController');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { reviewRateLimit } = require('../middleware/reviewSecurity');

// ===== ГЛАВНАЯ =====
router.get('/', productController.homePage);

// ===== СТАТИЧЕСКИЕ СТРАНИЦЫ =====
router.get('/info', (req, res) => res.render('info'));
router.get('/history', (req, res) => res.render('history'));

// ===== КАТАЛОГ =====
router.get('/catalog', productController.listPage);
router.get('/top3', productController.top3Page);

// ===== ОТЗЫВЫ =====
router.post('/review/add', reviewRateLimit, productController.addReview);
router.get('/review/edit/:id', requireAuth, productController.editReviewForm);
router.post('/review/edit/:id', requireAuth, productController.updateReview);
router.post('/review/delete/:id', requireAuth, productController.deleteReview);
router.post('/review/reply/:id', requireAuth, productController.replyReview);
router.post('/review/reply/delete/:id', requireAuth, productController.deleteReply);

// ===== ПРОДУКТ =====
router.get('/product/:id', productController.showPage);
router.get('/products/new', requireAdmin, productController.newForm);
router.post('/products', requireAdmin, productController.create);
router.get('/products/:id/edit', requireAdmin, productController.editForm);
router.post('/products/:id', requireAdmin, productController.update);
router.post('/products/:id/delete', requireAdmin, productController.remove);


// ===== AUTH =====
router.get('/login', authController.getLogin);
router.post('/login', authController.postLogin);
router.post('/logout', authController.postLogout);

// Регистрация (пока просто форма)
router.get('/register', (req, res) => {
    const showError = Boolean(req.query.error);
    res.render('login', { type: 'register', showError });
});
router.post('/register', authController.postRegister);

// ===== КОРЗИНА =====
router.get('/cart', cartController.show);
router.post('/cart/add', cartController.add);
router.post('/cart/remove', cartController.removeOne);
router.post('/cart/clear', cartController.clear);

// ===== CHECKOUT =====
router.get('/checkout', productController.checkoutPage);
router.post('/order', productController.createOrder);

module.exports = router;