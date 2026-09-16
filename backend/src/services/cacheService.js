const cache = new Map();

const DEFAULT_TTL = 10 * 60 * 1000; // 10 minutes

// Only return fresh cache
const getCache = (key) => {
    const item = cache.get(key);

    if (!item) {
        return null;
    }

    if (Date.now() > item.expiresAt) {
        return null;
    }

    return item.data;
};

// Return expired cache also
const getStaleCache = (key) => {
    const item = cache.get(key);

    if (!item) {
        return null;
    }

    const ageMinutes = Math.floor(
        (Date.now() - item.createdAt) / (1000 * 60)
    );

    return {
        data: item.data,
        ageMinutes
    };
};

const setCache = (
    key,
    data,
    ttl = DEFAULT_TTL
) => {
    const validTTL =
        Number.isFinite(ttl) && ttl > 0
            ? ttl
            : DEFAULT_TTL;

    const now = Date.now();

    cache.set(key, {
        data,
        createdAt: now,
        expiresAt: now + validTTL
    });
};

const deleteCache = (key) => {
    cache.delete(key);
};

const clearCache = () => {
    cache.clear();
};

module.exports = {
    getCache,
    getStaleCache,
    setCache,
    deleteCache,
    clearCache
};