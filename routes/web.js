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

    // Или просто текст без шаблона:
    // res.send('Главная страница');
});

module.exports = router;