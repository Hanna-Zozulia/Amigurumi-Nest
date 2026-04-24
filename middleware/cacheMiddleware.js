const { getCache, setCache } = require('../utils/cache');

function cacheGet(options = {}) {
    const {
        keyBuilder,
        ttl = 60,
        contentType = 'json',
        skip
    } = options;

    return async function cacheGetMiddleware(req, res, next) {
        if (req.method !== 'GET') {
            return next();
        }

        if (typeof skip === 'function' && skip(req)) {
            return next();
        }

        const key = typeof keyBuilder === 'function'
            ? keyBuilder(req)
            : `${req.baseUrl || ''}${req.path}`;

        try {
            const cached = await getCache(key);

            if (cached !== null) {
                if (contentType === 'view') {
                    return res.send(cached);
                }

                return res.json(cached);
            }

            if (contentType === 'view') {
                const originalSend = res.send.bind(res);

                res.send = (body) => {
                    if (res.statusCode >= 200 && res.statusCode < 300 && typeof body === 'string') {
                        setCache(key, body, ttl);
                    }
                    return originalSend(body);
                };

                return next();
            }

            const originalJson = res.json.bind(res);

            res.json = (body) => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    setCache(key, body, ttl);
                }
                return originalJson(body);
            };

            return next();
        } catch (err) {
            console.error(`[CACHE:MIDDLEWARE] ${key} - ${err.message}`);
            return next();
        }
    };
}

module.exports = { cacheGet };