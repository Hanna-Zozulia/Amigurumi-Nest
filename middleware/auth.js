const isApiRequest = require('../utils/isApiRequest');

/**
 * Returns the correct unauthorized response for API and web requests.
 */
function handleUnauthorized(req, res) {
    if (isApiRequest(req)) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    return res.redirect('/login');
}

/**
 * Returns the correct forbidden response for API and web requests.
 */
function handleForbidden(req, res) {
    if (isApiRequest(req)) {
        return res.status(403).json({ message: 'Access denied' });
    }

    return res.redirect('/login');
}

/**
 * Requires a logged-in user and redirects unauthenticated requests to login.
 */
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

/**
 * Ensures the current user is authenticated and has admin privileges.
 */
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