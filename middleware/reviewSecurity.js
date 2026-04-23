const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

const reviewRateLimit = rateLimit({
    windowMs: 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        const userId = req.session?.user?.id;
        if (userId) {
            return `user:${userId}`;
        }

        return `ip:${ipKeyGenerator(req.ip)}`;
    },
    handler: (req, res) => {
        res.status(429).send('Слишком много комментариев');
    }
});

module.exports = {
    reviewRateLimit
};
