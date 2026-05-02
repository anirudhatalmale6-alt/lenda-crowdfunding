<?php
/**
 * Redis Cache Component for CakePHP
 * 
 * Provides Redis caching functionality for the backend.
 * Falls back to file cache if Redis is not available.
 * 
 * Configuration (in app/Config/bootstrap.php):
 * Configure::write('Redis.host', '127.0.0.1');
 * Configure::write('Redis.port', 6379);
 * Configure::write('Redis.password', '');
 * Configure::write('Redis.database', 0);
 * Configure::write('Redis.prefix', 'lenda:');
 * Configure::write('Redis.timeout', 2.5);
 * Configure::write('Redis.cache_ttl', 300); // default TTL in seconds
 */

App::uses('Cache', 'Cache');

class RedisCache {
    
    /**
     * Redis connection instance
     */
    private static $redis = null;
    
    /**
     * Whether Redis is available
     */
    private static $isAvailable = false;
    
    /**
     * Default configuration
     */
    private static $config = array(
        'host' => '127.0.0.1',
        'port' => 6379,
        'password' => '',
        'database' => 0,
        'prefix' => 'lenda:',
        'timeout' => 2.5,
        'cache_ttl' => 300
    );
    
    /**
     * Initialize Redis connection
     */
    public static function initialize($config = array()) {
        // Merge configuration
        self::$config = array_merge(self::$config, $config);
        
        // Check if Redis extension is available
        if (!class_exists('Redis')) {
            self::$isAvailable = false;
            return false;
        }
        
        try {
            self::$redis = new Redis();
            $connected = self::$redis->connect(
                self::$config['host'],
                self::$config['port'],
                self::$config['timeout']
            );
            
            if (!$connected) {
                self::$isAvailable = false;
                return false;
            }
            
            // Authenticate if password is set
            if (!empty(self::$config['password'])) {
                if (!self::$redis->auth(self::$config['password'])) {
                    self::$isAvailable = false;
                    return false;
                }
            }
            
            // Select database
            self::$redis->select(self::$config['database']);
            
            self::$isAvailable = true;
            return true;
        } catch (Exception $e) {
            self::$isAvailable = false;
            return false;
        }
    }
    
    /**
     * Get value from cache
     * 
     * @param string $key Cache key
     * @param mixed $default Default value if not found
     * @return mixed Cached value or default
     */
    public static function get($key, $default = null) {
        if (!self::$isAvailable || !self::$redis) {
            return self::getFallback($key, $default);
        }
        
        try {
            $fullKey = self::$config['prefix'] . $key;
            $value = self::$redis->get($fullKey);
            
            if ($value === false) {
                return $default;
            }
            
            return unserialize($value);
        } catch (Exception $e) {
            return $default;
        }
    }
    
    /**
     * Set value in cache
     * 
     * @param string $key Cache key
     * @param mixed $value Value to cache
     * @param int $ttl Time to live in seconds (optional)
     * @return bool Success
     */
    public static function set($key, $value, $ttl = null) {
        if ($ttl === null) {
            $ttl = self::$config['cache_ttl'];
        }
        
        if (!self::$isAvailable || !self::$redis) {
            return self::setFallback($key, $value, $ttl);
        }
        
        try {
            $fullKey = self::$config['prefix'] . $key;
            $serialized = serialize($value);
            
            return self::$redis->setex($fullKey, $ttl, $serialized);
        } catch (Exception $e) {
            return false;
        }
    }
    
    /**
     * Delete value from cache
     * 
     * @param string $key Cache key
     * @return bool Success
     */
    public static function delete($key) {
        if (!self::$isAvailable || !self::$redis) {
            return self::deleteFallback($key);
        }
        
        try {
            $fullKey = self::$config['prefix'] . $key;
            return self::$redis->del($fullKey) > 0;
        } catch (Exception $e) {
            return false;
        }
    }
    
    /**
     * Check if key exists in cache
     * 
     * @param string $key Cache key
     * @return bool Exists
     */
    public static function has($key) {
        if (!self::$isAvailable || !self::$redis) {
            return self::hasFallback($key);
        }
        
        try {
            $fullKey = self::$config['prefix'] . $key;
            return self::$redis->exists($fullKey) > 0;
        } catch (Exception $e) {
            return false;
        }
    }
    
    /**
     * Clear all cache with optional prefix
     * 
     * @param string $prefix Optional key prefix to clear
     * @return bool Success
     */
    public static function clear($prefix = null) {
        if (!self::$isAvailable || !self::$redis) {
            return self::clearFallback($prefix);
        }
        
        try {
            if ($prefix === null) {
                return self::$redis->flushDB();
            }
            
            // Delete keys matching pattern
            $pattern = self::$config['prefix'] . $prefix . '*';
            $keys = self::$redis->keys($pattern);
            
            if (!empty($keys)) {
                self::$redis->del($keys);
            }
            
            return true;
        } catch (Exception $e) {
            return false;
        }
    }
    
    /**
     * Get multiple values at once
     * 
     * @param array $keys Array of keys
     * @return array Values
     */
    public static function getMultiple($keys) {
        $result = array();
        
        foreach ($keys as $key) {
            $result[$key] = self::get($key);
        }
        
        return $result;
    }
    
    /**
     * Set multiple values at once
     * 
     * @param array $items Key-value pairs
     * @param int $ttl Time to live
     * @return bool Success
     */
    public static function setMultiple($items, $ttl = null) {
        foreach ($items as $key => $value) {
            self::set($key, $value, $ttl);
        }
        
        return true;
    }
    
    /**
     * Increment a numeric value
     * 
     * @param string $key Cache key
     * @param int $by Amount to increment by
     * @return int New value
     */
    public static function increment($key, $by = 1) {
        if (!self::$isAvailable || !self::$redis) {
            return false;
        }
        
        try {
            $fullKey = self::$config['prefix'] . $key;
            return self::$redis->incrBy($fullKey, $by);
        } catch (Exception $e) {
            return false;
        }
    }
    
    /**
     * Decrement a numeric value
     * 
     * @param string $key Cache key
     * @param int $by Amount to decrement by
     * @return int New value
     */
    public static function decrement($key, $by = 1) {
        return self::increment($key, -$by);
    }
    
    /**
     * Get remaining TTL for a key
     * 
     * @param string $key Cache key
     * @return int TTL in seconds, or -1 if no TTL, or -2 if key doesn't exist
     */
    public static function getTTL($key) {
        if (!self::$isAvailable || !self::$redis) {
            return -2;
        }
        
        try {
            $fullKey = self::$config['prefix'] . $key;
            return self::$redis->ttl($fullKey);
        } catch (Exception $e) {
            return -2;
        }
    }
    
    /**
     * Check if Redis is available
     * 
     * @return bool Available
     */
    public static function isAvailable() {
        return self::$isAvailable;
    }
    
    /**
     * Get cache statistics
     * 
     * @return array Statistics
     */
    public static function getStats() {
        if (!self::$isAvailable || !self::$redis) {
            return array(
                'available' => false,
                'backend' => 'file'
            );
        }
        
        try {
            $info = self::$redis->info();
            return array(
                'available' => true,
                'backend' => 'redis',
                'used_memory' => $info['used_memory_human'] ?? 'unknown',
                'connected_clients' => $info['connected_clients'] ?? 0,
                'total_connections_received' => $info['total_connections_received'] ?? 0,
                'keyspace_hits' => $info['keyspace_hits'] ?? 0,
                'keyspace_misses' => $info['keyspace_misses'] ?? 0,
                'hit_rate' => self::calculateHitRate($info)
            );
        } catch (Exception $e) {
            return array(
                'available' => false,
                'error' => $e->getMessage()
            );
        }
    }
    
    /**
     * Calculate cache hit rate
     */
    private static function calculateHitRate($info) {
        $hits = $info['keyspace_hits'] ?? 0;
        $misses = $info['keyspace_misses'] ?? 0;
        $total = $hits + $misses;
        
        if ($total === 0) {
            return 0;
        }
        
        return round(($hits / $total) * 100, 2);
    }
    
    // Fallback methods using CakePHP's Cache
    
    private static function getFallback($key, $default) {
        $value = Cache::read($key, 'lenda_cache');
        return $value !== false ? $value : $default;
    }
    
    private static function setFallback($key, $value, $ttl) {
        return Cache::write($key, $value, 'lenda_cache');
    }
    
    private static function deleteFallback($key) {
        return Cache::delete($key, 'lenda_cache');
    }
    
    private static function hasFallback($key) {
        return Cache::read($key, 'lenda_cache') !== false;
    }
    
    private static function clearFallback($prefix = null) {
        if ($prefix) {
            // For prefix clearing, we need to clear the specific cache config
            return Cache::clear(false, 'lenda_cache');
        }
        return Cache::clear(false, 'lenda_cache');
    }
}

/**
 * Cache key constants
 */
class CacheKeys {
    // User data
    const USER_PROFILE = 'user:profile';
    const USER_WALLET = 'user:wallet';
    const USER_LOANS = 'user:loans';
    const USER_FUNDINGS = 'user:fundings';
    
    // Market data
    const LOAN_LISTINGS = 'market:loans';
    const LOAN_STATS = 'market:stats';
    const INTEREST_RATES = 'market:rates';
    
    // Blockchain
    const BLOCK_HEIGHT = 'blockchain:height';
    const GAS_PRICE = 'blockchain:gas';
    
    // Admin
    const ADMIN_STATS = 'admin:stats';
    const PENDING_LOANS = 'admin:pending_loans';
    const PENDING_COLLATERAL = 'admin:pending_collateral';
    
    // General
    const SETTINGS = 'system:settings';
    const TRANSLATIONS = 'i18n:translations';
}
