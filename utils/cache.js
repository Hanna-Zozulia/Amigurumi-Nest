//utils/cache.js
const { getRedisClient } = require('../config/redis');

function logCacheError(action, key, err) {
    console.error(`[CACHE:${action}] ${key} - ${err.message}`);
}

function safeParseJSON(raw, key) {
    try {
        return { ok: true, value: JSON.parse(raw) };
    } catch (err) {
        logCacheError('PARSE', key, err);
        return { ok: false, value: null };
    }
}

async function getCache(key) {
    try {
        const client = getRedisClient();
        const value = await client.get(key);
        if (value === null) {
            console.log(`CACHE MISS: ${key}`);
            return null;
        }

        const parsed = safeParseJSON(value, key);
        if (!parsed.ok) {
            await deleteCache(key);
            console.log(`CACHE MISS: ${key}`);
            return null;
        }

        console.log(`CACHE HIT: ${key}`);
        return parsed.value;
    } catch (err) {
        logCacheError('GET', key, err);
        return null;
    }
}

async function setCache(key, data, ttl = 60) {
    try {
        const client = getRedisClient();
        await client.setEx(key, Number(ttl) || 60, JSON.stringify(data));
        return true;
    } catch (err) {
        logCacheError('SET', key, err);
        return false;
    }
}

async function deleteCache(key) {
    try {
        const client = getRedisClient();
        return await client.del(key);
    } catch (err) {
        logCacheError('DEL', key, err);
        return 0;
    }
}

async function clearCacheByPattern(pattern) {
    try {
        const client = getRedisClient();

        let cursor = '0';
        let deleted = 0;

        do {
            const result = await client.scan(cursor, {
                MATCH: pattern,
                COUNT: 100
            });

            cursor = result.cursor;
            const keys = result.keys || [];

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

async function cached(key, ttl = 60, loaderFn) {
    const cacheValue = await getCache(key);
    if (cacheValue !== null) {
        return cacheValue;
    }

    const freshData = await loaderFn();
    await setCache(key, freshData, ttl);
    return freshData;
}

module.exports = {
    getCache,
    setCache,
    deleteCache,
    clearCacheByPattern,
    cached
};