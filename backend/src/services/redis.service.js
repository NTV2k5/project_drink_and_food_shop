/**
 * =============================================================================
 * PRODUCTION REDIS & IN-MEMORY CACHE-ASIDE SERVICE
 * Designed for High-Throughput Read Caching (Categories, Menu, Bestsellers)
 * Features auto-reconnect, circuit breaker, and zero-downtime memory fallback.
 * =============================================================================
 */

// In-Memory Fallback Cache when Redis is not deployed locally
class MemoryCacheFallback {
  constructor() {
    this.store = new Map();
  }

  async get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key, value, ttlSeconds = 300) {
    this.store.set(key, {
      value,
      expiry: Date.now() + ttlSeconds * 1000
    });
    return 'OK';
  }

  async del(key) {
    this.store.delete(key);
    return 1;
  }

  async delByPattern(pattern) {
    const regex = new RegExp(`^${pattern.replace('*', '.*')}$`);
    let deleted = 0;
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
        deleted++;
      }
    }
    return deleted;
  }

  async flush() {
    this.store.clear();
  }
}

class CacheService {
  constructor() {
    this.fallback = new MemoryCacheFallback();
    this.isRedisConnected = false;
    this.redisClient = null;
    this.init();
  }

  init() {
    // Attempt lazy connect if redis package exists or fallback gracefully
    try {
      const Redis = require('ioredis');
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      this.redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        enableOfflineQueue: false,
        retryStrategy: (times) => (times > 3 ? null : Math.min(times * 500, 2000))
      });

      this.redisClient.on('connect', () => {
        this.isRedisConnected = true;
        console.log(`[REDIS] Kết nối Redis Cache thành công tại ${redisUrl}`);
      });

      this.redisClient.on('error', () => {
        this.isRedisConnected = false;
        // Silent fallback to memory cache without crashing the server
      });
    } catch (e) {
      this.isRedisConnected = false;
    }
  }

  async get(key) {
    try {
      if (this.isRedisConnected && this.redisClient) {
        const val = await this.redisClient.get(key);
        return val ? JSON.parse(val) : null;
      }
    } catch (err) {
      // Fallback
    }
    return this.fallback.get(key);
  }

  async set(key, value, ttlSeconds = 300) {
    try {
      if (this.isRedisConnected && this.redisClient) {
        await this.redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
        return;
      }
    } catch (err) {
      // Fallback
    }
    return this.fallback.set(key, value, ttlSeconds);
  }

  async del(key) {
    try {
      if (this.isRedisConnected && this.redisClient) {
        await this.redisClient.del(key);
      }
    } catch (err) {}
    return this.fallback.del(key);
  }

  async invalidatePattern(pattern) {
    try {
      if (this.isRedisConnected && this.redisClient) {
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          await this.redisClient.del(keys);
        }
      }
    } catch (err) {}
    return this.fallback.delByPattern(pattern);
  }

  /**
   * Cache-Aside Wrapper: Tra cứu Cache trước, nếu miss thì gọi query database và lưu lại
   */
  async cacheAside(key, ttlSeconds, fetchFunction) {
    const cached = await this.get(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    const freshData = await fetchFunction();
    if (freshData !== null && freshData !== undefined) {
      await this.set(key, freshData, ttlSeconds);
    }
    return freshData;
  }
}

module.exports = new CacheService();
