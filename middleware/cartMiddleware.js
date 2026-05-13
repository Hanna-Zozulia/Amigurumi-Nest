// middleware/cartMiddleware.js
const { getModels } = require('../models');

// function cartMiddleware(req, res, next) {
//     if (!req.session) {
//         res.locals.cart = { items: [] };
//         return next();
//     }

//     if (req.session.__expired) {
//         res.locals.cart = { items: [] };
//         return next();
//     }

//     if (!req.session.cart || !Array.isArray(req.session.cart.items)) {
//         req.session.cart = { items: [] };
//     }

//     req.session.cart.items = req.session.cart.items || [];

//     res.locals.cart = req.session.cart;

//     next();
// }

function cartMiddleware(req, res, next) {
    const cart = req.session?.cart;

    res.locals.cart = {
        items: Array.isArray(cart?.items) ? cart.items : []
    };

    next();
}

module.exports = cartMiddleware;