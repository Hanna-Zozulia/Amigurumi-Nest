const { getModels } = require('../models');

/**
 * Exposes the current cart to views with a safe default shape.
 */
function cartMiddleware(req, res, next) {
    const cart = req.session?.cart;

    res.locals.cart = {
        items: Array.isArray(cart?.items) ? cart.items : []
    };

    next();
}

module.exports = cartMiddleware;