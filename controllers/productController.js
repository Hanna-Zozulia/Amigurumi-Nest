//productController.js
// Контроллер для веб-части работы с товарами (страницы)
const { getModels } = require('../models');

const categories = ['', 'Свечи для массажа', 'Ароматические', 'Декоративные', 'Подарочные наборы'];

async function listPage(req, res) {
    const { Product, Cart, CartItem } = getModels();

    const categoryFilter = req.query.category || '';
    const where = categoryFilter ? { category: categoryFilter } : {};

    const products = await Product.findAll({ where });

    const cart = await Cart.findOne({
        where: { userId: req.session.user?.id },
        include: [{ model: CartItem, as: 'items', include: [Product] }]
    });

    res.render('index', {
        title: 'Soft Light Studio',
        products,
        categories,
        selectedCategory: categoryFilter,
        cart,
        currentUser: req.session.user
    });
}

async function newForm(req, res) {
    res.render('product_form', { title: 'New Product', product: null, categories });
}

async function create(req, res) {
    const { Product } = getModels();
    await Product.create(req.body);
    res.redirect('/');
}

async function editForm(req, res) {
    const { Product } = getModels();
    const product = await Product.findByPk(req.params.id);

    if (!product) return res.status(404).send('Not found');

    res.render('product_form', { title: 'Edit Product', product, categories });
}

async function update(req, res) {
    const { Product } = getModels();
    const product = await Product.findByPk(req.params.id);

    if (!product) return res.status(404).send('Not found');

    await product.update(req.body);
    res.redirect('/');
}

async function remove(req, res) {
    const { Product } = getModels();
    const product = await Product.findByPk(req.params.id);

    if (!product) return res.status(404).send('Not found');

    await product.destroy();
    res.redirect('/');
}

async function showPage(req, res) {
    const { Product } = getModels();
    const product = await Product.findByPk(req.params.id);

    if (!product) return res.status(404).render('404');

    res.render('show', {
        title: product.name,
        product,
        currentUser: req.session.user
    });
}

module.exports = { listPage, newForm, create, editForm, update, remove, showPage };