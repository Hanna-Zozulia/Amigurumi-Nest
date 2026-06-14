const { getModels } = require('../models');
const { formatDateRu } = require('../utils/dateFormatter');

/**
 * Renders the admin product list with formatted creation dates.
 */
async function listProductsAdmin(req, res) {
    try {
        const { Product } = getModels();

        if (!Product) {
            throw new Error('Product model is not defined');
        }

        const products = await Product.findAll({
            order: [['id', 'DESC']]
        });

        return res.render('admin_products', {
            title: 'Продукты',
            currentUser: req.session.user,
            activeSection: 'products',
            products: (products || []).map((product) => ({
                id: product.id,
                name: product.name,
                category: product.category,
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
