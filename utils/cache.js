// Generic Redis-backed cache utilities with TTL support and safe JSON parsing.

const { getRedisClient } = require('../config/redis');

function logCacheError(action, key, err) {
    console.error(`[CACHE:${action}] ${key} - ${err.message}`);
}

/**
 * Safely parse JSON and return an object { ok, value }.
 */
function safeParseJSON(raw, key) {
    try {
        return { ok: true, value: JSON.parse(raw) };
    } catch (err) {
        logCacheError('PARSE', key, err);
        return { ok: false, value: null };
    }
}

/**
 * Returns a safe Redis client. If Redis is unavailable returns a fallback that
 * implements the minimal async methods used by the cache utils.
 */
function safeRedisClient() {
    try {
        const client = getRedisClient();

        if (!client) {
            return {
                get: async () => null,
                setEx: async () => {},
                del: async () => 0,
                scan: async () => ({ cursor: '0', keys: [] })
            };
        }

        return client;
    } catch (err) {
        console.error('[CACHE:REDIS_INIT]', err.message);

        return {
            get: async () => null,
            setEx: async () => {},
            del: async () => 0,
            scan: async () => ({ cursor: '0', keys: [] })
        };
    }
}

/**
 * Retrieves a cached value by key. Returns null on miss or parse error.
 */
async function getCache(key) {
    try {
        const client = safeRedisClient();
        const value = await client.get(key);

        if (process.env.NODE_ENV !== 'production') {
            if (value) {
                console.log('[CACHE HIT]', key);
            } else {
                console.log('[CACHE MISS]', key);
            }
        }

        if (value === null || value === undefined) {
            return null;
        }

        const parsed = safeParseJSON(value, key);

        if (!parsed.ok) {
            await deleteCache(key);
            return null;
        }

        return parsed.value;

    } catch (err) {
        logCacheError('GET', key, err);
        return null;
    }
}

/**
 * Stores a JSON-serializable value in the cache for `ttl` seconds.
 */
async function setCache(key, data, ttl = 60) {
    try {
        const client = safeRedisClient();

        const safeData = data === undefined ? null : data;

        await client.setEx(
            key,
            Number(ttl) || 60,
            JSON.stringify(safeData)
        );

        return true;

    } catch (err) {
        logCacheError('SET', key, err);
        return false;
    }
}

/**
 * Deletes a cache entry by key.
 */
async function deleteCache(key) {
    try {
        const client = safeRedisClient();
        return await client.del(key);
    } catch (err) {
        logCacheError('DEL', key, err);
        return 0;
    }
}

/**
 * Clears cache entries matching a Redis pattern using SCAN + DEL.
 */
async function clearCacheByPattern(pattern) {
    try {
        const client = safeRedisClient();

        let cursor = '0';
        let deleted = 0;

        do {
            const result = await client.scan(cursor, {
                MATCH: pattern,
                COUNT: 100
            });

            cursor = result.cursor || result[0] || '0';
            const keys = result.keys || result[1] || [];

            if (keys.length > 0) {
                deleted += await client.del(...keys);
            }

        } while (cursor !== '0');

        return deleted;

    } catch (err) {
        logCacheError('CLEAR_PATTERN', pattern, err);
        return 0;
    }
}

/**
 * Caching wrapper: returns cached value or calls loaderFn and caches the result.
 */
async function cached(key, ttl = 60, loaderFn) {
    try {
        const cacheValue = await getCache(key);

        if (cacheValue !== null) {
            return cacheValue;
        }

        const freshData = await loaderFn();

        if (freshData === undefined) {
            return null;
        }

        await setCache(key, freshData, ttl);

        return freshData;

    } catch (err) {
        console.error(`[CACHE:CACHED] ${key} - ${err.message}`);

        try {
            return await loaderFn();
        } catch (loaderErr) {
            console.error(`[CACHE:LOADER_FAIL] ${key} - ${loaderErr.message}`);
            return null;
        }
    }
}

module.exports = {
    getCache,
    setCache,
    deleteCache,
    clearCacheByPattern,
    cached
};