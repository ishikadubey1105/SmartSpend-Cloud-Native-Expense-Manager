const NodeCache = require('node-cache');
const logger = require('../config/logger');

// Cache configuration: data expires after 5 minutes (300 seconds) by default
const cache = new NodeCache({ stdTTL: 300, checkperiod: 120 });

/**
 * Middleware to cache HTTP responses
 * Cache key is generated uniquely per User ID and Endpoint
 */
const cacheResponse = (duration = 300) => {
    return (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        const userId = req.user?._id?.toString() || 'anonymous';
        // Key includes user ID, path, and query parameters (e.g. ?month=3&year=2026)
        const key = `cache_${userId}_${req.originalUrl}`;

        const cachedContent = cache.get(key);
        if (cachedContent) {
            // Include a custom header identifying it as a cache hit
            res.setHeader('X-Cache', 'HIT');
            return res.json(cachedContent);
        }

        // Intercept res.json to cache the outgoing data
        res.setHeader('X-Cache', 'MISS');
        res.originalJson = res.json;
        res.json = (body) => {
            // Only cache successful API responses
            if (res.statusCode >= 200 && res.statusCode < 300 && body.success) {
                cache.set(key, body, duration);
            }
            res.originalJson(body);
        };

        next();
    };
};

/**
 * Utility to clear a user's cache namespace
 * Call this when a user adds/edits an expense or budget to ensure fresh analytics
 */
const clearUserCache = (userId) => {
    const keys = cache.keys();
    const userKeys = keys.filter(k => k.startsWith(`cache_${userId.toString()}_`));
    if (userKeys.length > 0) {
        cache.del(userKeys);
        logger.debug(`Cleared ${userKeys.length} cache entries for user ${userId}`);
    }
};

module.exports = { cache, cacheResponse, clearUserCache };
