// middleware/auth.js
// Проверка авторизации и роли пользователя

const { isApiRequest } = require('./sessionTimeout');

function handleUnauthorized(req, res) {
    if (isApiRequest(req)) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    return res.redirect('/login');
}

function handleForbidden(req, res) {
    if (isApiRequest(req)) {
        return res.status(403).json({ message: 'Access denied' });
    }

    return res.status(403).render('error', {
        message: 'Access denied'
    });
}

function requireAuth(req, res, next) {
    if (!req.session.user) {
        return handleUnauthorized(req, res);
    }
    next();
}

function requireAdmin(req, res, next) {
    if (!req.session.user) {
        return handleUnauthorized(req, res);
    }

    if (req.session.user.role !== 'admin') {
        return handleForbidden(req, res);
    }

    next();
}

module.exports = { requireAuth, requireAdmin };