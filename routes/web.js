const express = require('express');
const router = express.Router();

const productController = require('../controllers/productController');
const cartController = require('../controllers/cartWebController');
const authController = require('../controllers/authController');
const userAdminController = require('../controllers/userAdminController');
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
router.get('/admin/users', requireAdmin, userAdminController.showInactiveUsers);
router.get('/admin/users/inactive', requireAdmin, userAdminController.showInactiveUsers);
router.post('/admin/users/:id/status', requireAdmin, userAdminController.updateUserStatus);


// ===== AUTH =====
router.get('/login', authController.getLogin);
router.post('/login', authController.postLogin);
router.get('/forgot-password', authController.getForgotPassword);
router.post('/forgot-password', authController.postForgotPassword);
router.get('/reset-password/:token', authController.getResetPassword);
router.post('/reset-password/:token', authController.postResetPassword);
router.post('/logout', authController.postLogout);

// Регистрация (пока просто форма)
router.get('/register', (req, res) => {
    const showError = Boolean(req.query.error);
    res.render('login', {
        type: 'register',
        showError,
        resetSuccess: false
    });
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