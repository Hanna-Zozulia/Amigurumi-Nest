const { getModels } = require('../models');
const { formatDateRu } = require('../utils/dateFormatter');

async function listProductsAdmin(req, res) {
    try {
        const { Product } = getModels();

        const products = await Product.findAll({
            order: [['id', 'DESC']]
        });

        return res.render('admin_products', {
            title: 'Продукты',
            currentUser: req.session.user,
            activeSection: 'products',
            products: products.map((product) => ({
                id: product.id,
                name: product.name,
                category: product.category,
                price: Number(product.price || 0),
                image: product.image,
                createdAt: product.createdAt,
                createdAtFormatted: formatDateRu(product.createdAt)
            }))
        });
    } catch (err) {
        console.error('adminProducts.listProductsAdmin error:', err.message);
        return res.status(500).send('Internal server error');
    }
}

module.exports = { listProductsAdmin };
