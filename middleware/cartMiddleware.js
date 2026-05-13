// middleware/cartMiddleware.js
const { getModels } = require('../models');

function cartMiddleware(req, res, next) {
    if (!req.session) {
        res.locals.cart = { items: [] };
        return next();
    }

    if (req.session.__expired) {
        res.locals.cart = { items: [] };
        return next();
    }

    if (!req.session.cart || !Array.isArray(req.session.cart.items)) {
        req.session.cart = { items: [] };
    }

    req.session.cart.items = req.session.cart.items || [];

    res.locals.cart = req.session.cart;

    next();
}

module.exports = cartMiddleware;