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

module.exports = router;