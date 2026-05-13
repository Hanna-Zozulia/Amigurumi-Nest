const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15, // limit each IP to 15 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Слишком много попыток входа. Попробуйте позже.'
    }
});

const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 registrations per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Слишком много попыток регистрации. Попробуйте позже.'
    }
});

module.exports = {
    loginLimiter,
    registerLimiter
};
