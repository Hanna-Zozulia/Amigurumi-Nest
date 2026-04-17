// middleware/cartMiddleware.js
// Добавляет корзину в EJS (res.locals)
const { getModels } = require('../models');

async function cartMiddleware(req, res, next) {
    try {
        if (!req.session.cart || !Array.isArray(req.session.cart.items)) {
            req.session.cart = { items: [] };
        }

        const userId = req.session.user?.id;

        if (!userId) {
            res.locals.cart = req.session.cart;
            return next();
        }

        const models = getModels();
        if (!models) {
            res.locals.cart = req.session.cart;
            return next();
        }

        const { Cart, CartItem } = models;
        const userCart = await Cart.findOne({
            where: { userId },
            include: [{ model: CartItem, as: 'items' }]
        });

        res.locals.cart = userCart || { items: [] };
        return next();
    } catch (err) {
        return next(err);
    }
}

module.exports = cartMiddleware;