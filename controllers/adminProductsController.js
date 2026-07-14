const { getModels } = require('../models');
const { formatDateRu } = require('../utils/dateFormatter');
const { Op } = require('sequelize');

/**
 * Renders the admin product list with formatted creation dates.
 */
async function listProductsAdmin(req, res) {
    try {
        const { Product, Category } = getModels();

        if (!Product) {
            throw new Error('Product model is not defined');
        }

        if (!Category) {
            throw new Error('Category model is not defined');
        }

        const searchTerm = String(req.query.q || '').trim();
        const selectedCategoryId = String(req.query.categoryId || '').trim();

        const where = {};

        if (searchTerm) {
            where.name = {
                [Op.like]: `%${searchTerm}%`
            };
        }

        if (selectedCategoryId) {
            where.categoryId = selectedCategoryId;
        }

        const [categories, products] = await Promise.all([
            Category.findAll({ order: [['name', 'ASC']] }),
            Product.findAll({
                where,
                include: [{ model: Category, as: 'category' }],
                order: [['id', 'DESC']]
            })
        ]);

        return res.render('admin_products', {
            title: 'Продукты',
            currentUser: req.session.user,
            activeSection: 'products',
            categories: categories || [],
            searchTerm,
            selectedCategoryId,
            products: (products || []).map((product) => ({
                id: product.id,
                name: product.name,
                categoryName: product.category?.name || product.category || '—',
                price: Number(product.price || 0),
                image: product.image,
                isNew: Boolean(product.isNew),
                inStock: Boolean(product.inStock),
                createdAt: product.createdAt,
                createdAtFormatted: product.createdAt
                    ? formatDateRu(product.createdAt)
                    : ''
            }))
        });

    } catch (err) {
        console.error('FULL ERROR:', err);
        return res.status(500).send(err.message);
    }
}

module.exports = { listProductsAdmin };
