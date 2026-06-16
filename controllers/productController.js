const { getModels } = require('../models');
const fs = require('fs/promises');
const path = require('path');
const { cached } = require('../utils/cache');
const { cacheKeys } = require('../utils/cacheKeys');
const { invalidateProductCache } = require('../services/cacheService');
const { getSiteBaseUrl, getAbsoluteImageUrl } = require('../utils/htmlUtils');
const { slugify } = require('../utils/slugify');

const ALLOWED_TOGGLE_FIELDS = new Set(['isNew', 'inStock']);

function parseBooleanValue(value) {
    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'number') {
        return value !== 0;
    }

    const normalized = value === null || typeof value === 'undefined'
        ? ''
        : String(value).trim().toLowerCase();

    if (['true', '1', 'on', 'yes'].includes(normalized)) {
        return true;
    }

    if (['false', '0', 'off', 'no'].includes(normalized)) {
        return false;
    }

    return null;
}

/**
 * Renders the storefront home page with featured products and recent reviews.
 */
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

/**
 * Renders the catalog page and applies the active product filter.
 */
async function listPage(req, res) {
    try {
        const { Product, Cart, CartItem, Category } = getModels();

        const filter = req.query.filter || '';
        const categoriesList = await Category.findAll();

        let where = {};

         if (filter === 'new') {
            where.isNew = true;
        }

        if (filter === 'inStock') {
            where.inStock = true;
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
            products: products || [],
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

/**
 * Renders the top three products page.
 */
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

/**
 * Renders the admin form for creating a new product.
 */
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

/**
 * Creates a new product from the admin form submission.
 */
async function create(req, res) {
    try {
        const { Product } = getModels();
        const { name, desc, price, categoryId, isNew, inStock } = req.body;

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
            isNew: isNew === 'on',
            inStock: inStock === 'on'
        });

        await invalidateProductCache(created.id);
        return res.redirect('/admin/products');

    } catch (err) {
        console.error('productWeb.create error:', err.message);
        return res.status(500).send('Internal server error');
    }
}

/**
 * Renders the admin form for editing an existing product.
 */
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

/**
 * Updates an existing product from the admin form submission.
 */
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
            inStock: req.body.inStock === 'on',
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

/**
 * Toggles a single admin-managed boolean field on a product.
 */
async function toggleField(req, res) {
    try {
        const { Product } = getModels();
        const { field, value } = req.body || {};

        if (!ALLOWED_TOGGLE_FIELDS.has(field)) {
            return res.status(400).json({ error: 'Invalid field' });
        }

        const nextValue = parseBooleanValue(value);

        if (nextValue === null) {
            return res.status(400).json({ error: 'Invalid value' });
        }

        const product = await Product.findByPk(req.params.id);

        if (!product) {
            return res.status(404).json({ error: 'Not found' });
        }

        await product.update({
            [field]: nextValue
        });

        await invalidateProductCache(product.id);

        return res.json({
            id: product.id,
            field,
            value: nextValue
        });
    } catch (err) {
        console.error('productWeb.toggleField error:', err.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * Deletes a product, removes uploaded images, and redirects back to the list.
 */
async function remove(req, res) {
    try {
        const { Product } = getModels();
        const product = await Product.findByPk(req.params.id);

        if (!product) return res.status(404).send('Not found');

        // Delete the main product image from disk if it exists.
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

        // Delete the secondary product image from disk if it exists.
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

/**
 * Renders the product detail page with cached product and review data.
 */
async function showPage(req, res) {
    try {
        const { Product, Review, User, Category } = getModels();
        const { getReviewErrorMessage } = require('../utils/htmlUtils');
        const reviewError = String(req.query.reviewError || '');
        const rawId = String(req.params.slugAndId || req.params.id || '');
        const idMatch = rawId.match(/(\d+)$/);
        const productId = idMatch ? Number(idMatch[1]) : Number(rawId);

        if (!Number.isFinite(productId) || productId <= 0) {
            return res.status(404).render('404', { title: '404 - Страница не найдена', sessionExpired: false });
        }

        const productKey = cacheKeys.product(productId);
        const reviewsKey = cacheKeys.reviews(productId);

        const product = await cached(productKey, 10, async () => {
            return await Product.findByPk(productId, { include: [{ model: Category, as: 'category' }] });
        });

        if (!product) {
            return res.status(404).render('404', { title: '404 - Страница не найдена' });
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

        const siteBaseUrl = getSiteBaseUrl(req);
        const productPath = `/product/${slugify(product.name)}-${product.id}`;
        const canonicalUrl = siteBaseUrl ? `${siteBaseUrl}${productPath}` : productPath;
        const metaDescription = `${product.name} - ${product.category ? product.category.name : 'игрушки ручной работы'} от Amigurumi Nest. Цена ${Number(product.price).toFixed(2)} €, описание, фото и отзывы.`;

        return res.render('product', {
            title: `${product.name} | Amigurumi Nest`,
            product,
            currentUser: req.session.user || null,
            reviewErrorMessage: getReviewErrorMessage(reviewError),
            metaDescription,
            canonicalUrl,
            ogType: 'product',
            ogTitle: product.name,
            ogDescription: metaDescription,
            ogImage: getAbsoluteImageUrl(product.image, siteBaseUrl)
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
    toggleField,
    remove,
    showPage
};