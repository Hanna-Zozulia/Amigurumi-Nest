// //utils/cache.js
// const { getRedisClient } = require('../config/redis');

// function logCacheError(action, key, err) {
//     console.error(`[CACHE:${action}] ${key} - ${err.message}`);
// }

// function safeParseJSON(raw, key) {
//     try {
//         return { ok: true, value: JSON.parse(raw) };
//     } catch (err) {
//         logCacheError('PARSE', key, err);
//         return { ok: false, value: null };
//     }
// }

// async function getCache(key) {
//     try {
//         const client = getRedisClient();
//         const value = await client.get(key);
//         if (value === null) {
//             console.log(`CACHE MISS: ${key}`);
//             return null;
//         }

//         const parsed = safeParseJSON(value, key);
//         if (!parsed.ok) {
//             await deleteCache(key);
//             console.log(`CACHE MISS: ${key}`);
//             return null;
//         }

//         console.log(`CACHE HIT: ${key}`);
//         return parsed.value;
//     } catch (err) {
//         logCacheError('GET', key, err);
//         return null;
//     }
// }

// async function setCache(key, data, ttl = 60) {
//     try {
//         const client = getRedisClient();
//         await client.setEx(key, Number(ttl) || 60, JSON.stringify(data));
//         return true;
//     } catch (err) {
//         logCacheError('SET', key, err);
//         return false;
//     }
// }

// async function deleteCache(key) {
//     try {
//         const client = getRedisClient();
//         return await client.del(key);
//     } catch (err) {
//         logCacheError('DEL', key, err);
//         return 0;
//     }
// }

// async function clearCacheByPattern(pattern) {
//     try {
//         const client = getRedisClient();

//         let cursor = '0';
//         let deleted = 0;

//         do {
//             const result = await client.scan(cursor, {
//                 MATCH: pattern,
//                 COUNT: 100
//             });

//             cursor = result.cursor;
//             const keys = result.keys || [];

//             if (keys.length > 0) {
//                 deleted += await client.del(...keys);
//             }
//         } while (cursor !== '0');

//         return deleted;
//     } catch (err) {
//         logCacheError('CLEAR_PATTERN', pattern, err);
//         return 0;
//     }
// }

// async function cached(key, ttl = 60, loaderFn) {
//     const cacheValue = await getCache(key);
//     if (cacheValue !== null) {
//         return cacheValue;
//     }

//     const freshData = await loaderFn();
//     await setCache(key, freshData, ttl);
//     return freshData;
// }

// module.exports = {
//     getCache,
//     setCache,
//     deleteCache,
//     clearCacheByPattern,
//     cached
// };

const { getRedisClient } = require('../config/redis');

function logCacheError(action, key, err) {
    console.error(`[CACHE:${action}] ${key} - ${err.message}`);
}

/**
 * Безопасный JSON parse
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
 * Безопасный Redis клиент (для тестов и fallback)
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
 * GET CACHE
 */
async function getCache(key) {
    try {
        const client = safeRedisClient();
        const value = await client.get(key);

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
 * SET CACHE
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
 * DELETE CACHE
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
 * CLEAR BY PATTERN
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
 * CACHE WRAPPER
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

        // fallback — никогда не ломаем request
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