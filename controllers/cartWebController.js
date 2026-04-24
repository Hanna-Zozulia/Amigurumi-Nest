//cartWebController.js
const { getModels } = require('../models');
const { deleteCache } = require('../utils/cache');
const { cacheKeys } = require('../utils/cacheKeys');

async function invalidateCartCache(userId) {
    if (!userId) return;
    await deleteCache(cacheKeys.cart(userId));
}

async function loadSessionCart(sessionCart, Product) {
    const items = Array.isArray(sessionCart?.items) ? sessionCart.items : [];

    if (items.length === 0) {
        return { items: [] };
    }

    const productIds = [...new Set(items.map((item) => item.productId))];
    const products = await Product.findAll({ where: { id: productIds } });
    const productMap = new Map(products.map((product) => [String(product.id), product]));

    return {
        items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            Product: productMap.get(String(item.productId)) || null
        }))
    };
}

async function getCartForRequest(req) {
    const { Cart, CartItem, Product } = getModels();
    const userId = req.session.user?.id;

    if (userId) {
        const cart = await Cart.findOne({
            where: { userId },
            include: [{ model: CartItem, as: 'items', include: [Product] }]
        });

        return cart || { items: [] };
    }

    return loadSessionCart(req.session.cart, Product);
}

async function show(req, res) {
    const cart = await getCartForRequest(req);

    res.render('cart', { cart });
}

async function add(req, res) {
    const { Cart, CartItem } = getModels();
    const { productId } = req.body;

    if (req.session.user) {
        let cart = await Cart.findOne({ where: { userId: req.session.user.id } });

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
            await CartItem.create({
                cartId: cart.id,
                productId,
                quantity: 1
            });
        }

        await invalidateCartCache(req.session.user.id);
    } else {
        const items = Array.isArray(req.session.cart?.items) ? req.session.cart.items : [];
        const existingItem = items.find((item) => String(item.productId) === String(productId));

        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            items.push({ productId, quantity: 1 });
        }

        req.session.cart = { items };
    }

    res.redirect("/cart");
}

async function removeOne(req, res) {
    const { Cart, CartItem } = getModels();
    const { productId } = req.body;

    if (req.session.user) {
        const cart = await Cart.findOne({
            where: { userId: req.session.user.id }
        });

        if (!cart) return res.redirect('/cart');

        const item = await CartItem.findOne({
            where: { cartId: cart.id, productId }
        });

        if (!item) return res.redirect('/cart');

        if (item.quantity > 1) {
            item.quantity--;
            await item.save();
        } else {
            await item.destroy();
        }

        await invalidateCartCache(req.session.user.id);
    } else {
        const items = Array.isArray(req.session.cart?.items) ? req.session.cart.items : [];
        const item = items.find((entry) => String(entry.productId) === String(productId));

        if (!item) return res.redirect('/cart');

        if (item.quantity > 1) {
            item.quantity -= 1;
        } else {
            req.session.cart.items = items.filter((entry) => String(entry.productId) !== String(productId));
        }

        req.session.cart = { items: req.session.cart.items };
    }

    res.redirect("/cart");
}

async function clear(req, res) {
    const { Cart, CartItem } = getModels();

    if (req.session.user) {
        const cart = await Cart.findOne({
            where: { userId: req.session.user.id }
        });

        if (cart) {
            await CartItem.destroy({ where: { cartId: cart.id } });
        }

        await invalidateCartCache(req.session.user.id);
    } else {
        req.session.cart = { items: [] };
    }

    res.redirect("/cart");
}

module.exports = { show, add, removeOne, clear };