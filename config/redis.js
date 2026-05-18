const { createClient } = require('redis');

let redisClient = null;

/**
 * Builds the Redis client configuration from environment variables.
 * Supports both direct host/port settings and a full Redis URL.
 */
function getRedisConfig() {
    const host = process.env.REDIS_HOST || '127.0.0.1';
    const port = Number(process.env.REDIS_PORT || 6379);
    const password = process.env.REDIS_PASSWORD;
    const db = Number(process.env.REDIS_DB || 0);

    if (process.env.REDIS_URL) {
        return {
            url: process.env.REDIS_URL,
            // Retry connections with a capped exponential-style delay.
            socket: { reconnectStrategy: (retries) => Math.min(retries * 50, 2000) },
            database: db
        };
    }

    const options = {
        socket: {
            host,
            port,
            // Retry connections with a capped exponential-style delay.
            reconnectStrategy: (retries) => Math.min(retries * 50, 2000)
        },
        database: db
    };

    if (password) {
        options.password = password;
    }

    return options;
}

/**
 * Returns a singleton Redis client instance for the application.
 */
function getRedisClient() {
    if (redisClient) {
        return redisClient;
    }

    redisClient = createClient(getRedisConfig());

    // Log Redis connection errors without crashing the process.
    redisClient.on('error', (err) => {
        console.error('Redis error:', err.message);
    });

    // Confirm when the Redis connection is ready for use.
    redisClient.on('ready', () => {
        console.log('Redis connected');
    });

    return redisClient;
}

/**
 * Connects the Redis client if needed and returns the active instance.
 */
async function initRedis() {
    const client = getRedisClient();

    if (!client.isOpen) {
        try {
            await client.connect();
        } catch (err) {
            console.error('Redis connection failed:', err.message);
        }
    }

    return client;
}

module.exports = {
    getRedisClient,
    initRedis
};