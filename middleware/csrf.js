const crypto = require('crypto');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const TOKEN_LENGTH = 32;

function getCsrfToken(req) {
    if (!req.session.csrfToken) {
        req.session.csrfToken = crypto.randomBytes(TOKEN_LENGTH).toString('hex');
    }

    return req.session.csrfToken;
}

function csrfProtection(req, res, next) {
    const token = getCsrfToken(req);
    res.locals.csrfToken = token;

    if (SAFE_METHODS.has(req.method)) {
        return next();
    }

    const submittedToken = req.get('x-csrf-token') || req.body?._csrf;
    const submittedBuffer = Buffer.from(String(submittedToken || ''));
    const tokenBuffer = Buffer.from(token);

    if (submittedBuffer.length !== tokenBuffer.length || !crypto.timingSafeEqual(submittedBuffer, tokenBuffer)) {
        return res.status(403).send('Invalid CSRF token');
    }

    next();
}

module.exports = { csrfProtection };
