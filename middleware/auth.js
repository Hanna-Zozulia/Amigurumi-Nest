// middleware/auth.js
// Проверка авторизации и роли пользователя

function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
}

function requireAdmin(req, res, next) {
    if (!req.session.user) {
        return res.status(401).send('Unauthorized');
    }

    if (req.session.user.role !== 'admin') {
        return res.status(403).send('Forbidden');
    }

    next();
}

module.exports = { requireAuth, requireAdmin };