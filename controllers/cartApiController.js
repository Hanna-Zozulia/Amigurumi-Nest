//cartApiController.js
const { getModels } = require('../models');

// GET /api/cart
async function getCart(req, res) {
    const { Cart, CartItem, Product } = getModels();

    if (!req.session.user)
        return res.status(401).json({ error: 'Not logged in' });

    const cart = await Cart.findOne({
        where: { userId: req.session.user.id },
        include: [{ model: CartItem, as: 'items', include: [Product] }]
    });

    res.json(cart || { items: [] });
}

// POST /api/cart/add
async function add(req, res) {
    const { Cart, CartItem } = getModels();

    if (!req.session.user)
        return res.status(401).json({ error: 'Not logged in' });

    const { productId } = req.body;

    let cart = await Cart.findOne({
        where: { userId: req.session.user.id }
    });

    if (!cart) {
        cart = await Cart.create({ userId: req.session.user.id });
    }

    let item = await CartItem.findOne({
        where: { cartId: cart.id, productId }
    });

    if (item) {
        item.quantity++;
        await item.save();
    } else {
        item = await CartItem.create({
            cartId: cart.id,
            productId,
            quantity: 1
        });
    }

    res.json({ success: true, item });
}

// POST /api/cart/remove
async function removeOne(req, res) {
    const { Cart, CartItem } = getModels();

    if (!req.session.user)
        return res.status(401).json({ error: 'Not logged in' });

    const { productId } = req.body;

    const cart = await Cart.findOne({
        where: { userId: req.session.user.id }
    });

    if (!cart) return res.json({});

    const item = await CartItem.findOne({
        where: { cartId: cart.id, productId }
    });

    if (!item) return res.json({});

    if (item.quantity > 1) {
        item.quantity--;
        await item.save();
    } else {
        await item.destroy();
    }

    res.json({ success: true });
}

// POST /api/cart/clear
async function clear(req, res) {
    const { Cart, CartItem } = getModels();

    if (!req.session.user)
        return res.status(401).json({ error: 'Not logged in' });

    const cart = await Cart.findOne({
        where: { userId: req.session.user.id }
    });

    if (cart) {
        await CartItem.destroy({ where: { cartId: cart.id } });
    }

    res.json({ success: true });
}

module.exports = { getCart, add, removeOne, clear };