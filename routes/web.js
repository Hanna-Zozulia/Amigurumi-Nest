// const express = require('express');
// const router = express.Router();

// // const { requireAuth, requireAdmin } = require('../middleware/auth');
// // const auth = require('../controllers/authController');
// // const product = require('../controllers/productController');

// //Главная страница
// router.get('/', product.listPage);

const express = require('express');
const router = express.Router();

// Главная страница
router.get('/', (req, res) => {
    // Если шаблон index.ejs есть
    res.render('index'); 
});

router.get('/info', (req, res) => {
    // info.ejs 
    res.render('info'); 
});

router.get('/history', (req, res) => {
    // history.ejs
    res.render('history'); 
});

router.get('/top3', (req, res) => {
    // top3.ejs 
    res.render('top3'); 
});

router.get('/catalog', (req, res) => {
    // catalog.ejs 
    res.render('catalog'); 
});

// GET /login — показать форму входа
router.get('/login', (req, res) => {
    res.render('login', { type: 'login' });
});

// GET /register — показать форму регистрации
router.get('/register', (req, res) => {
    res.render('login', { type: 'register' });
});

// POST /login — обработка формы входа
router.post('/login', (req, res) => {
    const { email, password } = req.body;
    // проверка пользователя
    res.send(`Вход для ${email} пока заглушка`);
});

// POST /register — обработка формы регистрации
router.post('/register', (req, res) => {
    const { name, email, password, confirm_password } = req.body;
    if (password !== confirm_password) {
        return res.render('login', { type: 'register', error: 'Passwords do not match!' });
    }
    // здесь добавь код сохранения пользователя
    res.redirect('/login');
});

router.get('/product', (req, res) => {
    // product.ejs 
    res.render('product'); 
});

module.exports = router;