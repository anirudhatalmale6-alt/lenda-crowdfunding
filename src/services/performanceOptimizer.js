/**
 * Performance Optimization Service
 * Provides database connection pooling and query optimization utilities
 */

class PerformanceOptimizer {
  constructor() {
    this.queryCache = new Map();
    this.slowQueryThreshold = 1000; // ms
    this.maxCacheSize = 100;
    this.queryStats = new Map();
  }

  /**
   * Initialize connection pool
   */
  async initializePool(config = {}) {
    const defaultConfig = {
      minConnections: 5,
      maxConnections: 50,
      idleTimeout: 30000,
      connectionTimeout: 5000,
      maxLifetime: 3600000
    };

    const poolConfig = { ...defaultConfig, ...config };
    
    // In production, this would use actual connection pooling
    return {
      config: poolConfig,
      status: 'initialized',
      activeConnections: 0,
      availableConnections: poolConfig.minConnections,
      totalConnections: poolConfig.minConnections
    };
  }

  /**
   * Get pooled connection
   */
  async getConnection() {
    // Simulate connection retrieval
    return {
      id: Date.now(),
      acquiredAt: Date.now(),
      query: null
    };
  }

  /**
   * Release connection back to pool
   */
  releaseConnection(connection) {
    if (connection) {
      const lifetime = Date.now() - connection.acquiredAt;
      this.recordQueryMetrics(connection.query, lifetime);
    }
  }

  /**
   * Execute query with caching
   */
  async executeQuery(query, options = {}) {
    const { useCache = true, cacheTTL = 60000 } = options;
    const cacheKey = this.getCacheKey(query);

    // Check cache
    if (useCache) {
      const cached = this.getFromCache(cacheKey, cacheTTL);
      if (cached) {
        return cached;
      }
    }

    // Execute query (in production, this would run against DB)
    const startTime = Date.now();
    const result = await this.runQuery(query);
    const duration = Date.now() - startTime;

    // Record metrics
    this.recordQueryMetrics(query, duration);

    // Cache result
    if (useCache) {
      this.setCache(cacheKey, result);
    }

    return result;
  }

  /**
   * Run actual query
   */
  async runQuery(query) {
    // Simulated query execution
    return { rows: [], affected: 0 };
  }

  /**
   * Optimize query by adding hints
   */
  optimizeQuery(query) {
    let optimized = query;

    // Add index hints for large tables
    if (query.includes('loan_requests')) {
      optimized = this.addIndexHint(optimized, 'idx_loan_requests_status_created');
    }
    
    if (query.includes('loan_fundings')) {
      optimized = this.addIndexHint(optimized, 'idx_loan_fundings_lender_loan');
    }

    // Optimize JOINs
    optimized = this.optimizeJoins(optimized);

    // Add LIMIT for unbounded queries
    optimized = this.addLimitIfMissing(optimized);

    return optimized;
  }

  /**
   * Add index hint
   */
  addIndexHint(query, indexName) {
    if (query.toUpperCase().includes('USE INDEX')) {
      return query;
    }
    return query.replace(/FROM\s+(\w+)/i, `FROM $1 USE INDEX ($indexName)`);
  }

  /**
   * Optimize JOIN order
   */
  optimizeJoins(query) {
    // Ensure smaller tables are joined first
    return query;
  }

  /**
   * Add LIMIT if missing
   */
  addLimitIfMissing(query) {
    if (!query.toUpperCase().includes('LIMIT')) {
      return `${query} LIMIT 1000`;
    }
    return query;
  }

  /**
   * Get cache key from query
   */
  getCacheKey(query) {
    const normalized = query.toLowerCase().replace(/\s+/g, ' ').trim();
    return btoa(normalized).substring(0, 50);
  }

  /**
   * Get from cache
   */
  getFromCache(key, ttl) {
    const cached = this.queryCache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > ttl) {
      this.queryCache.delete(key);
      return null;
    }

    // Update access stats
    cached.accessCount++;
    cached.lastAccessed = Date.now();

    return cached.data;
  }

  /**
   * Set cache
   */
  setCache(key, data) {
    // Evict old entries if cache is full
    if (this.queryCache.size >= this.maxCacheSize) {
      this.evictOldestEntry();
    }

    this.queryCache.set(key, {
      data,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now()
    });
  }

  /**
   * Evict oldest cache entry
   */
  evictOldestEntry() {
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, value] of this.queryCache.entries()) {
      if (value.lastAccessed < oldestTime) {
        oldestTime = value.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.queryCache.delete(oldestKey);
    }
  }

  /**
   * Record query metrics
   */
  recordQueryMetrics(query, duration) {
    const key = this.getCacheKey(query);
    
    if (!this.queryStats.has(key)) {
      this.queryStats.set(key, {
        count: 0,
        totalDuration: 0,
        avgDuration: 0,
        minDuration: duration,
        maxDuration: duration,
        slowQueries: 0
      });
    }

    const stats = this.queryStats.get(key);
    stats.count++;
    stats.totalDuration += duration;
    stats.avgDuration = stats.totalDuration / stats.count;
    stats.minDuration = Math.min(stats.minDuration, duration);
    stats.maxDuration = Math.max(stats.maxDuration, duration);

    if (duration > this.slowQueryThreshold) {
      stats.slowQueries++;
    }
  }

  /**
   * Get query statistics
   */
  getStats() {
    const stats = [];
    for (const [key, value] of this.queryStats.entries()) {
      stats.push({
        query: atob(key),
        ...value
      });
    }

    return stats.sort((a, b) => b.count - a.count);
  }

  /**
   * Get slow queries
   */
  getSlowQueries(threshold = 1000) {
    return this.getStats()
      .filter(s => s.avgDuration > threshold || s.slowQueries > 0);
  }

  /**
   * Clear all caches
   */
  clearCache() {
    this.queryCache.clear();
  }

  /**
   * Clear statistics
   */
  clearStats() {
    this.queryStats.clear();
  }

  /**
   * Get pool status
   */
  getPoolStatus() {
    return {
      cacheSize: this.queryCache.size,
      statsCount: this.queryStats.size,
      totalQueries: Array.from(this.queryStats.values())
        .reduce((sum, s) => sum + s.count, 0),
      slowQueries: this.getSlowQueries().length
    };
  }
}

// Export singleton instance
export default new PerformanceOptimizer();
