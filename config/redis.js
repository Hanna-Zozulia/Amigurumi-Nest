const { createClient } = require('redis');

let redisClient = null;

function getRedisConfig() {
    const host = process.env.REDIS_HOST || '127.0.0.1';
    const port = Number(process.env.REDIS_PORT || 6379);
    const password = process.env.REDIS_PASSWORD;
    const db = Number(process.env.REDIS_DB || 0);

    if (process.env.REDIS_URL) {
        return {
            url: process.env.REDIS_URL,
            socket: { reconnectStrategy: (retries) => Math.min(retries * 50, 2000) },
            database: db
        };
    }

    const options = {
        socket: {
            host,
            port,
            reconnectStrategy: (retries) => Math.min(retries * 50, 2000)
        },
        database: db
    };

    if (password) {
        options.password = password;
    }

    return options;
}

function getRedisClient() {
    if (redisClient) {
        return redisClient;
    }

    redisClient = createClient(getRedisConfig());

    redisClient.on('error', (err) => {
        console.error('Redis error:', err.message);
    });

    redisClient.on('ready', () => {
        console.log('Redis connected');
    });

    return redisClient;
}

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