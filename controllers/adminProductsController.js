const { getModels } = require('../models');

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
                createdAtFormatted: new Date(product.createdAt).toLocaleString('ru-RU', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                })
            }))
        });
    } catch (err) {
        console.error('adminProducts.listProductsAdmin error:', err.message);
        return res.status(500).send('Internal server error');
    }
}

module.exports = { listProductsAdmin };
