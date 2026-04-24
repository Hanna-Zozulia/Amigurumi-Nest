//cartApiController.js
const { getModels } = require('../models');
const { deleteCache } = require('../utils/cache');
const { cacheKeys } = require('../utils/cacheKeys');

async function invalidateCartCache(userId) {
    if (!userId) return;
    await deleteCache(cacheKeys.cart(userId));
}

// GET /api/cart
async function getCart(req, res) {
    try {
        const { Cart, CartItem, Product } = getModels();

        const userId = req.session.user?.id;

        if (!userId)
            return res.status(401).json({ error: 'Not logged in' });

        const cart = await Cart.findOne({
            where: { userId },
            include: [
                {
                    model: CartItem,
                    as: 'items',
                    include: [Product]
                }
            ]
        });

        return res.json(cart || { items: [] });
    } catch (err) {
        console.error('cartApi.getCart error:', err.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// POST /api/cart/add
async function add(req, res) {
    try {
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

        await invalidateCartCache(req.session.user.id);
        return res.json({ success: true, item });
    } catch (err) {
        console.error('cartApi.add error:', err.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// POST /api/cart/remove
async function removeOne(req, res) {
    try {
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

        await invalidateCartCache(req.session.user.id);
        return res.json({ success: true });
    } catch (err) {
        console.error('cartApi.removeOne error:', err.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// POST /api/cart/clear
async function clear(req, res) {
    try {
        const { Cart, CartItem } = getModels();

        if (!req.session.user)
            return res.status(401).json({ error: 'Not logged in' });

        const cart = await Cart.findOne({
            where: { userId: req.session.user.id }
        });

        if (cart) {
            await CartItem.destroy({ where: { cartId: cart.id } });
        }

        await invalidateCartCache(req.session.user.id);
        return res.json({ success: true });
    } catch (err) {
        console.error('cartApi.clear error:', err.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = { getCart, add, removeOne, clear };