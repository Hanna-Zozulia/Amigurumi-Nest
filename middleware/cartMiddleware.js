// middleware/cartMiddleware.js
// Добавляет корзину в EJS (res.locals)

function cartMiddleware(req, res, next) {
    if (!req.session.cart) {
        req.session.cart = { items: [] };
    }

    res.locals.cart = req.session.cart;

    next();
}

module.exports = cartMiddleware;