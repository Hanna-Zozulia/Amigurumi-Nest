// controllers/productController.js (refactored)

const { getModels } = require('../models');
const fs = require('fs/promises');
const path = require('path');
const { cached } = require('../utils/cache');
const { cacheKeys } = require('../utils/cacheKeys');
const { invalidateProductCache } = require('../services/cacheService');

async function homePage(req, res) {
    try {
        const { Product, Review, User } = getModels();

        const products = await cached(cacheKeys.homeProducts, 60, async () => {
            return await Product.findAll({
                order: [['views', 'DESC']],
                limit: 6
            });
        });

        const reviews = await Review.findAll({
            where: { status: 'approved' },
            include: [User],
            order: [['createdAt', 'DESC']],
            limit: 5
        });

        return res.render('index', {
            title: 'Home',
            products,
            reviews,
            currentUser: req.session.user || null
        });
    } catch (err) {
        console.error('productWeb.homePage error:', err.message);
        return res.status(500).send('Internal server error');
    }
}

async function listPage(req, res) {
    try {
        const { Product, Cart, CartItem, Category } = getModels();

        const filter = req.query.filter || '';
        const categoriesList = await Category.findAll();

        let where = {};

         if (filter === 'new') {
            where.isNew = true;
        }

        if (filter.startsWith('cat-')) {
            where.categoryId = filter.replace('cat-', '');
        }

        const listKey = cacheKeys.catalog(filter || 'all');

        const products = await cached(listKey, 60, async () => {
            return await Product.findAll({ where, include: [{ model: Category, as: 'category' }] });
        });

        return res.render('catalog', {
            title: 'Catalog',
            products,
            categories: categoriesList,
            selectedCategory: filter.startsWith('cat-') ? filter.replace('cat-', '') : '',
            selectedFilter: filter,
            currentUser: req.session.user || null
        });
    } catch (err) {
        console.error('productWeb.listPage error:', err.message);
        return res.status(500).send('Internal server error');
    }
}

async function top3Page(req, res) {
    try {
        const { Product } = getModels();

        const products = await cached(cacheKeys.topProducts, 60, async () => {
            return await Product.findAll({
                order: [['views', 'DESC']],
                limit: 3
            });
        });

        return res.render('top3', {
            title: 'Top 3',
            products,
            currentUser: req.session.user || null
        });
    } catch (err) {
        console.error('productWeb.top3Page error:', err.message);
        return res.status(500).send('Internal server error');
    }
}

async function newForm(req, res) {
    const { Category } = getModels();
    const categories = await Category.findAll();

    res.render('product_form', {
        title: 'New Product',
        product: null,
        categories,
        activeSection: 'products'
    });
}

async function create(req, res) {
    try {
        const { Product } = getModels();
        const { name, desc, price, categoryId, isNew } = req.body;

        const mainImageFile = req.files && req.files.image && req.files.image[0];
        if (!mainImageFile) {
            return res.status(400).send('Основное изображение обязательно');
        }

        const imageVal = '/img/uploads/' + mainImageFile.filename;
        const image2File = req.files && req.files.image2 && req.files.image2[0];
        const image2Val = image2File ? '/img/uploads/' + image2File.filename : '';

        const created = await Product.create({
            name,
            desc,
            price,
            image: imageVal,
            image2: image2Val,
            categoryId,
            isNew: isNew === 'on'
        });

        await invalidateProductCache(created.id);
        return res.redirect('/admin/products');

    } catch (err) {
        console.error('productWeb.create error:', err.message);
        return res.status(500).send('Internal server error');
    }
}

async function editForm(req, res) {
    const { Product, Category } = getModels();
    const product = await Product.findByPk(req.params.id);
    const categories = await Category.findAll();

    if (!product) return res.status(404).send('Not found');

    res.render('product_form', {
        title: 'Edit Product',
        product,
        categories,
        activeSection: 'products'
    });
}

async function update(req, res) {
    try {
        const { Product } = getModels();
        const product = await Product.findByPk(req.params.id);

        if (!product) return res.status(404).send('Not found');

        const imageFile = req.files && req.files.image && req.files.image[0];
        const image2File = req.files && req.files.image2 && req.files.image2[0];

        const imageVal = imageFile ? '/img/uploads/' + imageFile.filename : product.image;
        const image2Val = image2File ? '/img/uploads/' + image2File.filename : product.image2;

        await product.update({
            name: req.body.name,
            categoryId: req.body.categoryId,
            isNew: req.body.isNew === 'on',
            desc: req.body.desc,
            price: req.body.price,
            image: imageVal,
            image2: image2Val
        });

        await invalidateProductCache(product.id);
        return res.redirect('/admin/products');
    } catch (err) {
        console.error('productWeb.update error:', err.message);
        return res.status(500).send('Internal server error');
    }
}

async function remove(req, res) {
    try {
        const { Product } = getModels();
        const product = await Product.findByPk(req.params.id);

        if (!product) return res.status(404).send('Not found');

        // УДАЛЕНИЕ ФАЙЛА КАРТИНКИ
        if (product.image) {
            const imagePath = path.join(
                process.cwd(),
                'public',
                product.image
            );

            try {
                await fs.unlink(imagePath);
            } catch (err) {
                console.log('Image delete error:', err.message);
            }
        }

        if (product.image2) {
            const image2Path = path.join(
                process.cwd(),
                'public',
                product.image2
            );

            try {
                await fs.unlink(image2Path);
            } catch (err) {
                console.log('Image2 delete error:', err.message);
            }
        }

        await product.destroy();

        await invalidateProductCache(product.id);

        const redirectTo = req.body.redirectTo || '/admin/products';
        return res.redirect(redirectTo);

    } catch (err) {
        console.error('productWeb.remove error:', err.message);
        return res.status(500).send('Internal server error');
    }
}

async function showPage(req, res) {
    try {
        const { Product, Review, User, Category } = getModels();
        const { getReviewErrorMessage } = require('../utils/htmlUtils');
        const reviewError = String(req.query.reviewError || '');
        const productId = req.params.id;
        const productKey = cacheKeys.product(productId);
        const reviewsKey = cacheKeys.reviews(productId);

        const product = await cached(productKey, 10, async () => {
            return await Product.findByPk(productId, { include: [{ model: Category, as: 'category' }] });
        });

        if (!product) {
            return res.status(404).render('404');
        }

        const reviews = await cached(reviewsKey, 10, async () => {
            return await Review.findAll({
                where: { status: 'approved', productId },
                include: [User],
                order: [['createdAt', 'DESC']]
            });
        });

        product.Reviews = Array.isArray(reviews)
            ? reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            : [];

        await Product.increment('views', { where: { id: productId } });

        return res.render('product', {
            title: product.name,
            product,
            currentUser: req.session.user || null,
            reviewErrorMessage: getReviewErrorMessage(reviewError)
        });
    } catch (err) {
        console.error('productWeb.showPage error:', err.message);
        return res.status(500).send('Internal server error');
    }
}

module.exports = {
    homePage,
    listPage,
    top3Page,
    newForm,
    create,
    editForm,
    update,
    remove,
    showPage
};