const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

/**
 * Limits how often a user or IP can submit review actions.
 */
const reviewRateLimit = rateLimit({
    windowMs: 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    // Uses the logged-in user ID when available, otherwise falls back to IP.
    keyGenerator: (req) => {
        const userId = req.session?.user?.id;
        if (userId) {
            return `user:${userId}`;
        }

        return `ip:${ipKeyGenerator(req.ip)}`;
    },
    // Sends a rate-limit response when the review threshold is exceeded.
    handler: (req, res) => {
        res.status(429).send('Слишком много комментариев');
    }
});

module.exports = {
    reviewRateLimit
};
