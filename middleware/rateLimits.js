const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15, // limit each IP to 15 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many login attempts from this IP, please try again later.'
});

const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 registrations per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many registration attempts from this IP, please try again later.'
});

module.exports = {
    loginLimiter,
    registerLimiter
};
