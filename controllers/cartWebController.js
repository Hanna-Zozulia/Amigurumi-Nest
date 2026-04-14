//cartWebController.js
const { getModels } = require('../models');

async function show(req, res) {
    const { Cart, CartItem, Product } = getModels();

    const userId = req.session.user?.id;
    let cart = null;

    if (userId) {
        cart = await Cart.findOne({
            where: { userId },
            include: [{ model: CartItem, as: 'items', include: [Product] }]
        });
    }

    // если нет пользователя → показываем пустую корзину
    if (!cart) {
        cart = { items: [] };
    }

    
    res.render("cart", { cart });
}

async function add(req, res) {
    const { Cart, CartItem } = getModels();
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
        await CartItem.create({
            cartId: cart.id,
            productId,
            quantity: 1
        });
    }

    res.redirect("/cart");
}

async function removeOne(req, res) {
    const { Cart, CartItem } = getModels();
    const { productId } = req.body;

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

    res.redirect("/cart");
}

async function clear(req, res) {
    const { Cart, CartItem } = getModels();

    const cart = await Cart.findOne({
        where: { userId: req.session.user.id }
    });

    if (cart) {
        await CartItem.destroy({ where: { cartId: cart.id } });
    }

    res.redirect("/cart");
}

module.exports = { show, add, removeOne, clear };