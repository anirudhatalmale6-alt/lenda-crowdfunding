/**
 * Cache Service - Redis-compatible caching layer for the frontend
 * 
 * This provides a caching abstraction that can use:
 * - LocalStorage (default for browser)
 * - SessionStorage
 * - Memory cache (fastest)
 * 
 * In production, this could be replaced with actual Redis
 * via a backend proxy or WebSocket connection.
 */

// Cache configuration
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
const MAX_MEMORY_ITEMS = 100;

class CacheService {
    constructor() {
        this.memoryCache = new Map();
        this.storageType = 'localStorage';
        this.listeners = new Map();
        
        // Initialize storage
        this._initStorage();
    }
    
    /**
     * Initialize storage mechanism
     */
    _initStorage() {
        try {
            const testKey = '__cache_test__';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            this.storage = localStorage;
            this.storageAvailable = true;
        } catch (e) {
            console.warn('LocalStorage not available, using memory cache only');
            this.storage = null;
            this.storageAvailable = false;
        }
    }
    
    /**
     * Set the storage type
     * @param {string} type - 'localStorage', 'sessionStorage', or 'memory'
     */
    setStorageType(type) {
        this.storageType = type;
        
        if (type === 'memory') {
            this.storage = null;
            this.storageAvailable = false;
        } else {
            try {
                this.storage = window[type];
                this.storageAvailable = true;
            } catch (e) {
                console.warn(`${type} not available, using memory cache`);
                this.storage = null;
                this.storageAvailable = false;
            }
        }
    }
    
    /**
     * Generate cache key with prefix
     * @param {string} key - The cache key
     * @param {string} prefix - Optional prefix
     * @returns {string} Full cache key
     */
    _getCacheKey(key, prefix = 'lenda') {
        return `${prefix}:${key}`;
    }
    
    /**
     * Get item from cache
     * @param {string} key - Cache key
     * @param {object} options - Options { prefix, useMemory }
     * @returns {*} Cached value or null if expired/not found
     */
    get(key, options = {}) {
        const { prefix = 'lenda', useMemory = true } = options;
        const fullKey = this._getCacheKey(key, prefix);
        
        // Try memory cache first (fastest)
        if (useMemory && this.memoryCache.has(fullKey)) {
            const memItem = this.memoryCache.get(fullKey);
            if (!this._isExpired(memItem)) {
                return memItem.value;
            }
            this.memoryCache.delete(fullKey);
        }
        
        // Try persistent storage
        if (this.storageAvailable && this.storage) {
            try {
                const stored = this.storage.getItem(fullKey);
                if (stored) {
                    const item = JSON.parse(stored);
                    if (!this._isExpired(item)) {
                        // Update memory cache
                        if (useMemory) {
                            this._setMemoryCache(fullKey, item.value, item.expiresAt);
                        }
                        return item.value;
                    }
                    // Remove expired
                    this.storage.removeItem(fullKey);
                }
            } catch (e) {
                console.error('Cache get error:', e);
            }
        }
        
        return null;
    }
    
    /**
     * Set item in cache
     * @param {string} key - Cache key
     * @param {*} value - Value to cache
     * @param {number} ttl - Time to live in milliseconds
     * @param {object} options - Options { prefix }
     */
    set(key, value, ttl = DEFAULT_TTL, options = {}) {
        const { prefix = 'lenda' } = options;
        const fullKey = this._getCacheKey(key, prefix);
        const expiresAt = Date.now() + ttl;
        
        // Store in memory cache
        this._setMemoryCache(fullKey, value, expiresAt);
        
        // Store in persistent storage
        if (this.storageAvailable && this.storage) {
            try {
                const item = JSON.stringify({ value, expiresAt });
                this.storage.setItem(fullKey, item);
            } catch (e) {
                console.error('Cache set error:', e);
            }
        }
        
        // Notify listeners
        this._notifyListeners(fullKey, value);
        
        return true;
    }
    
    /**
     * Set item in memory cache only
     */
    _setMemoryCache(key, value, expiresAt) {
        // Manage memory cache size
        if (this.memoryCache.size >= MAX_MEMORY_ITEMS) {
            // Remove oldest expired or random item
            const firstKey = this.memoryCache.keys().next().value;
            this.memoryCache.delete(firstKey);
        }
        
        this.memoryCache.set(key, { value, expiresAt });
    }
    
    /**
     * Check if item is expired
     */
    _isExpired(item) {
        return item.expiresAt && Date.now() > item.expiresAt;
    }
    
    /**
     * Delete item from cache
     * @param {string} key - Cache key
     * @param {object} options - Options { prefix }
     */
    delete(key, options = {}) {
        const { prefix = 'lenda' } = options;
        const fullKey = this._getCacheKey(key, prefix);
        
        // Remove from memory
        this.memoryCache.delete(fullKey);
        
        // Remove from storage
        if (this.storageAvailable && this.storage) {
            try {
                this.storage.removeItem(fullKey);
            } catch (e) {
                console.error('Cache delete error:', e);
            }
        }
        
        return true;
    }
    
    /**
     * Clear all cache
     * @param {string} prefix - Optional prefix to clear only specific keys
     */
    clear(prefix = null) {
        // Clear memory
        if (prefix) {
            const prefixKey = `${prefix}:`;
            for (const key of this.memoryCache.keys()) {
                if (key.startsWith(prefixKey)) {
                    this.memoryCache.delete(key);
                }
            }
        } else {
            this.memoryCache.clear();
        }
        
        // Clear storage
        if (this.storageAvailable && this.storage) {
            try {
                if (prefix) {
                    const prefixKey = `${prefix}:`;
                    const keysToRemove = [];
                    for (let i = 0; i < this.storage.length; i++) {
                        const key = this.storage.key(i);
                        if (key && key.startsWith(prefixKey)) {
                            keysToRemove.push(key);
                        }
                    }
                    keysToRemove.forEach(key => this.storage.removeItem(key));
                } else {
                    this.storage.clear();
                }
            } catch (e) {
                console.error('Cache clear error:', e);
            }
        }
        
        return true;
    }
    
    /**
     * Check if key exists in cache
     */
    has(key, options = {}) {
        const value = this.get(key, { ...options, useMemory: true });
        return value !== null;
    }
    
    /**
     * Get cache statistics
     */
    getStats() {
        let storageCount = 0;
        if (this.storageAvailable && this.storage) {
            try {
                storageCount = this.storage.length;
            } catch (e) {}
        }
        
        return {
            memoryItems: this.memoryCache.size,
            storageItems: storageCount,
            storageType: this.storageType,
            storageAvailable: this.storageAvailable
        };
    }
    
    /**
     * Subscribe to cache changes
     */
    subscribe(key, callback) {
        const fullKey = key instanceof Function ? '*' : key;
        
        if (!this.listeners.has(fullKey)) {
            this.listeners.set(fullKey, new Set());
        }
        
        this.listeners.get(fullKey).add(callback);
        
        // Return unsubscribe function
        return () => {
            const listeners = this.listeners.get(fullKey);
            if (listeners) {
                listeners.delete(callback);
            }
        };
    }
    
    /**
     * Notify listeners of cache changes
     */
    _notifyListeners(key, value) {
        // Notify specific key listeners
        const specificListeners = this.listeners.get(key);
        if (specificListeners) {
            specificListeners.forEach(callback => callback(value));
        }
        
        // Notify wildcard listeners
        const wildcardListeners = this.listeners.get('*');
        if (wildcardListeners) {
            wildcardListeners.forEach(callback => callback(key, value));
        }
    }
    
    /**
     * Get or set pattern - get from cache or fetch and store
     */
    async fetch(key, fetchFn, ttl = DEFAULT_TTL, options = {}) {
        const cached = this.get(key, options);
        
        if (cached !== null) {
            return cached;
        }
        
        // Fetch fresh data
        const value = await fetchFn();
        
        // Store in cache
        this.set(key, value, ttl, options);
        
        return value;
    }
    
    /**
     * Invalidate cache pattern - delete keys matching a pattern
     */
    invalidatePattern(pattern, prefix = 'lenda') {
        const prefixKey = `${prefix}:${pattern}`.replace('*', '');
        
        // Clear memory matching keys
        const memoryKeysToDelete = [];
        for (const key of this.memoryCache.keys()) {
            if (key.includes(prefixKey) || pattern === '*') {
                memoryKeysToDelete.push(key);
            }
        }
        memoryKeysToDelete.forEach(key => this.memoryCache.delete(key));
        
        // Clear storage matching keys
        if (this.storageAvailable && this.storage) {
            try {
                const keysToRemove = [];
                for (let i = 0; i < this.storage.length; i++) {
                    const key = this.storage.key(i);
                    if (key && (key.includes(prefixKey) || pattern === '*')) {
                        keysToRemove.push(key);
                    }
                }
                keysToRemove.forEach(key => this.storage.removeItem(key));
            } catch (e) {}
        }
        
        return true;
    }
}

// Export singleton instance
const cacheService = new CacheService();

export default cacheService;

// Cache keys for common data
export const CacheKeys = {
    // User data
    USER_PROFILE: 'user:profile',
    USER_WALLET: 'user:wallet',
    USER_LOANS: 'user:loans',
    USER_FUNDINGS: 'user:fundings',
    
    // Market data
    LOAN_LISTINGS: 'market:loans',
    LOAN_STATS: 'market:stats',
    INTEREST_RATES: 'market:rates',
    
    // Blockchain
    BLOCK_HEIGHT: 'blockchain:height',
    GAS_PRICE: 'blockchain:gas',
    
    // Admin
    ADMIN_STATS: 'admin:stats',
    PENDING_LOANS: 'admin:pending_loans',
    PENDING_COLLATERAL: 'admin:pending_collateral',
};

// Helper functions
export const getCachedUser = (userId) => cacheService.get(`${CacheKeys.USER_PROFILE}:${userId}`);
export const setCachedUser = (userId, data, ttl = DEFAULT_TTL) => 
    cacheService.set(`${CacheKeys.USER_PROFILE}:${userId}`, data, ttl);

export const getCachedLoans = (filters = {}) => {
    const key = `${CacheKeys.USER_LOANS}:${JSON.stringify(filters)}`;
    return cacheService.get(key);
};
export const setCachedLoans = (filters, data, ttl = DEFAULT_TTL) => {
    const key = `${CacheKeys.USER_LOANS}:${JSON.stringify(filters)}`;
    cacheService.set(key, data, ttl);
};

export const invalidateUserCache = (userId) => {
    cacheService.invalidatePattern(`${CacheKeys.USER_PROFILE}:${userId}*`);
    cacheService.invalidatePattern(`${CacheKeys.USER_WALLET}:${userId}*`);
};
