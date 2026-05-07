// controllers/productApiController.js
const { getModels } = require('../models');
const { invalidateProductCache } = require('../services/cacheService');

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
        const { name, desc, price, image, image2 } = req.body;
        const categoryId = req.body.categoryId || req.body.category;

        const imageVal = Array.isArray(image) ? image[0] : image;
        const image2Val = Array.isArray(image2) ? image2[0] : image2;

        const created = await Product.create({
            name,
            desc,
            price,
            image: imageVal,
            image2: image2Val,
            categoryId
        });
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

    const categoryId = req.body.categoryId || req.body.category;

    await product.update({
      name: req.body.name,
      categoryId,
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
