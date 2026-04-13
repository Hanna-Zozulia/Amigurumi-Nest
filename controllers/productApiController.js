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
    const { name, desc, price, pic, category } = req.body;

    const created = await Product.create({ name, desc, price, pic, category });
    res.status(201).json(created);
}

async function update(req, res) {
    const { Product } = getModels();
    const item = await Product.findByPk(req.params.id);

    if (!item) return res.status(404).json({ error: 'Not found' });

    await item.update(req.body);
    res.json(item);
}

async function remove(req, res) {
    const { Product } = getModels();
    const item = await Product.findByPk(req.params.id);

    if (!item) return res.status(404).json({ error: 'Not found' });

    await item.destroy();
    res.status(204).send();
}

module.exports = { list, getOne, create, update, remove };
