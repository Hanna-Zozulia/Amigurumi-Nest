const express = require('express');
const router = express.Router();

const productController = require('../controllers/productController');
const reviewController = require('../controllers/reviewController');
const adminCommentsController = require('../controllers/adminCommentsController');
const orderController = require('../controllers/orderController');
const cartController = require('../controllers/cartWebController');
const authController = require('../controllers/authController');
const userAdminController = require('../controllers/userAdminController');
const orderAdminController = require('../controllers/orderAdminController');
const adminDashboardController = require('../controllers/adminDashboardController');
const adminProductsController = require('../controllers/adminProductsController');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { reviewRateLimit } = require('../middleware/reviewSecurity');
const { loginLimiter, registerLimiter } = require('../middleware/rateLimits');
const { uploadImageAndImage2, handleUploadError } = require('../middleware/uploadMiddleware');

// ===== ГЛАВНАЯ =====
router.get('/', productController.homePage);

// ===== СТАТИЧЕСКИЕ СТРАНИЦЫ =====
router.get('/info', (req, res) => res.render('info'));
router.get('/history', (req, res) => res.render('history'));

// ===== КАТАЛОГ =====
router.get('/catalog', productController.listPage);
router.get('/top3', productController.top3Page);

// ===== ОТЗЫВЫ =====
router.post('/review/add', reviewRateLimit, reviewController.addReview);
router.get('/review/edit/:id', requireAuth, reviewController.editReviewForm);
router.post('/review/edit/:id', requireAuth, reviewController.updateReview);
router.post('/review/delete/:id', requireAuth, reviewController.deleteReview);
router.post('/review/reply/:id', requireAdmin, reviewController.replyReview);
router.post('/review/reply/delete/:id', requireAdmin, reviewController.deleteReply);

// ===== КОММЕНТАРИИ В АДМИН-ПАНЕЛИ =====
router.get('/admin/comments', requireAdmin, adminCommentsController.listCommentsPage);
router.post('/admin/comments/:id/approve', requireAdmin, adminCommentsController.approveComment);
router.post('/admin/comments/:id/reply', requireAdmin, adminCommentsController.replyComment);
router.post('/admin/comments/:id/hide', requireAdmin, adminCommentsController.hideComment);
router.post('/admin/comments/:id/delete', requireAdmin, adminCommentsController.deleteComment);
router.post('/admin/comments/:id/restore', requireAdmin, adminCommentsController.restoreComment);

// ===== ПРОДУКТ =====
router.get('/product/:id', productController.showPage);
router.get('/products/new', requireAdmin, productController.newForm);
router.post('/products', requireAdmin, uploadImageAndImage2, handleUploadError, productController.create);
router.get('/products/:id/edit', requireAdmin, productController.editForm);
router.post('/products/:id', requireAdmin, uploadImageAndImage2, handleUploadError, productController.update);
router.post('/products/:id/delete', requireAdmin, productController.remove);
router.get('/admin/users', requireAdmin, userAdminController.showInactiveUsers);
router.get('/admin/users/inactive', requireAdmin, userAdminController.showInactiveUsers);
router.post('/admin/users/:id/status', requireAdmin, userAdminController.updateUserStatus);
router.get('/admin/orders', requireAdmin, orderAdminController.listOrdersPage);
router.get('/admin/orders/:id', requireAdmin, orderAdminController.orderDetailsPage);
router.post('/admin/orders/:id/status', requireAdmin, orderAdminController.updateOrderStatusPage);
router.get('/admin/products', requireAdmin, adminProductsController.listProductsAdmin);
router.get('/admin', requireAdmin, adminDashboardController.adminDashboard);

// ===== ORDERS API (для админа) =====
router.get('/orders', requireAdmin, orderAdminController.listOrdersApi);
router.get('/orders/:id', requireAdmin, orderAdminController.orderDetailsApi);
router.patch('/orders/:id/status', requireAdmin, orderAdminController.updateOrderStatus);


// ===== AUTH =====
router.get('/login', authController.getLogin);
router.post('/login', loginLimiter, authController.postLogin);
router.get('/forgot-password', authController.getForgotPassword);
router.post('/forgot-password', authController.postForgotPassword);
router.get('/reset-password/:token', authController.getResetPassword);
router.post('/reset-password/:token', authController.postResetPassword);
router.post('/logout', authController.postLogout);

// Регистрация (пока просто форма)
router.get('/register', (req, res) => {
    const errorCode = String(req.query.error || '');
    res.render('login', {
        type: 'register',
        showError: Boolean(errorCode),
        errorCode,
        resetSuccess: false
    });
});
router.post('/register', registerLimiter, authController.postRegister);

// ===== КОРЗИНА =====
router.get('/cart', cartController.show);
router.post('/cart/add', cartController.add);
router.post('/cart/remove', cartController.removeOne);
router.post('/cart/clear', cartController.clear);

// ===== CHECKOUT =====
router.get('/checkout', orderController.checkoutPage);
router.post('/order', orderController.createOrder);

module.exports = router;