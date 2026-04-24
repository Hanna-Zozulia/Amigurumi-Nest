// controllers/productApiController.js
const { getModels } = require('../models');
const { deleteCache, clearCacheByPattern } = require('../utils/cache');
const { cacheKeys } = require('../utils/cacheKeys');

async function invalidateProductCache(productId) {
    await deleteCache(cacheKeys.products);
    await clearCacheByPattern(cacheKeys.catalogPattern);
    await deleteCache(cacheKeys.homeProducts);
    await deleteCache(cacheKeys.topProducts);

    if (productId) {
        await deleteCache(cacheKeys.product(productId));
        await deleteCache(cacheKeys.reviews(productId));
    }
}

async function list(req, res) {
    try {
        const { Product } = getModels();
        const products = await Product.findAll({ order: [['id', 'ASC']] });
        return res.json(products);
    } catch (err) {
        console.error('productApi.list error:', err.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function getOne(req, res) {
    try {
        const { Product } = getModels();
        const item = await Product.findByPk(req.params.id);

        if (!item) return res.status(404).json({ error: 'Not found' });
        return res.json(item);
    } catch (err) {
        console.error('productApi.getOne error:', err.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function create(req, res) {
    try {
        const { Product } = getModels();
        const { name, desc, price, image, image2, category } = req.body;

        const created = await Product.create({ name, desc, price, image, image2, category });
        await invalidateProductCache(created.id);
        return res.status(201).json(created);
    } catch (err) {
        console.error('productApi.create error:', err.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function update(req, res) {
  try {
    const { Product } = getModels();
    const product = await Product.findByPk(req.params.id);

    if (!product) return res.status(404).json({ error: 'Not found' });

    const image = Array.isArray(req.body.image)
      ? req.body.image[0]
      : req.body.image;

    const image2 = Array.isArray(req.body.image2)
      ? req.body.image2[0]
      : req.body.image2;

    await product.update({
      name: req.body.name,
      category: req.body.category,
      desc: req.body.desc,
      price: req.body.price,
      image,
      image2
    });

    await invalidateProductCache(product.id);
    return res.json(product);
  } catch (err) {
    console.error('productApi.update error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function remove(req, res) {
    try {
        const { Product } = getModels();
        const item = await Product.findByPk(req.params.id);

        if (!item) return res.status(404).json({ error: 'Not found' });

        const deletedId = item.id;
        await item.destroy();
        await invalidateProductCache(deletedId);
        return res.status(204).send();
    } catch (err) {
        console.error('productApi.remove error:', err.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = { list, getOne, create, update, remove };
