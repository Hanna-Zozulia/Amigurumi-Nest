// controllers/productApiController.js
const { getModels } = require('../models');

async function list(req, res) {
    const { Product } = getModels();
    const products = await Product.findAll({ order: [['id', 'ASC']] });
    res.json(products);
}

async function getOne(req, res) {
    const { Product } = getModels();
    const item = await Product.findByPk(req.params.id);

    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
}

async function create(req, res) {
    const { Product } = getModels();
    const { name, desc, price, image, image2, category } = req.body;

    const created = await Product.create({ name, desc, price, image, image2, category });
    res.status(201).json(created);
}

async function update(req, res) {
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

  res.json(product);
}

async function remove(req, res) {
    const { Product } = getModels();
    const item = await Product.findByPk(req.params.id);

    if (!item) return res.status(404).json({ error: 'Not found' });

    await item.destroy();
    res.status(204).send();
}

module.exports = { list, getOne, create, update, remove };
