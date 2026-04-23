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
        return res.redirect('/login');
    }

    if (req.session.user.role !== 'admin') {
        return res.status(403).render('error', {
            message: 'Access denied'
        });
    }

    next();
}

module.exports = { requireAuth, requireAdmin };