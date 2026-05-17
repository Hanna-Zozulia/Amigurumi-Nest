// middleware/auth.js
// Проверка авторизации и роли пользователя

const isApiRequest = require('../utils/isApiRequest');

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

    return res.redirect('/login');
}

// function requireAuth(req, res, next) {
//     if (!req.session.user) {
//         return handleUnauthorized(req, res);
//     }
//     next();
// }

// function requireAdmin(req, res, next) {
//     if (!req.session.user) {
//         return handleUnauthorized(req, res);
//     }

//     if (req.session.user.role !== 'admin') {
//         return handleForbidden(req, res);
//     }

//     next();
// }

function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    if (req.session.__expired) {
        req.session.destroy(() => {
            res.clearCookie('connect.sid');
            return res.redirect('/login?expired=true');
        });
        return;
    }

    next();
}

function requireAdmin(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    if (req.session.__expired) {
        req.session.destroy(() => {
            res.clearCookie('connect.sid');
            return res.redirect('/login?expired=true');
        });
        return;
    }

    if (req.session.user.role !== 'admin') {
        return res.status(403).render('404', { message: 'Access denied' });
    }

    next();
}

module.exports = { requireAuth, requireAdmin, handleUnauthorized, handleForbidden };