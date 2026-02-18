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
    // Если шаблон info.ejs есть
    res.render('info'); 
});

router.get('/history', (req, res) => {
    // Если шаблон history.ejs есть
    res.render('history'); 
});

module.exports = router;