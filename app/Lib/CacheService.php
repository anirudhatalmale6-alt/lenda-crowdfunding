<?php
/**
 * CacheService - Redis/Memcached Caching Layer
 * 
 * Provides a unified caching interface with support for:
 * - Redis (primary)
 * - Memcached (fallback)
 * - File cache (fallback)
 * 
 * Features:
 * - Automatic key prefixing
 * - TTL support
 * - Cache tags
 * - Distributed locking
 * - Cache warming
 */

App::uses('Cache', 'Cache');

class CacheService {
    
    /**
     * Cache configurations
     */
    const CONFIG_DEFAULT = 'default';
    const CONFIG_SHORT = 'short';      // 5 minutes
    const CONFIG_MEDIUM = 'medium';   // 30 minutes
    const CONFIG_LONG = 'long';       // 24 hours
    const CONFIG_API = 'api';         // API responses
    
    /**
     * Default TTL values in seconds
     */
    const TTL_SHORT = 300;    // 5 minutes
    const TTL_MEDIUM = 1800;   // 30 minutes
    const TTL_LONG = 86400;   // 24 hours
    const TTL_API = 300;      // 5 minutes
    
    /**
     * Key prefixes
     */
    const PREFIX_USER = 'user:';
    const PREFIX_LOAN = 'loan:';
    const PREFIX_WALLET = 'wallet:';
    const PREFIX_API = 'api:';
    const PREFIX_LOCK = 'lock:';
    
    /**
     * Get cached data
     * 
     * @param string $key Cache key
     * @param string $config Cache configuration
     * @return mixed Cached data or null
     */
    public static function get($key, $config = self::CONFIG_DEFAULT) {
        $fullKey = self::_buildKey($key);
        return Cache::read($fullKey, $config);
    }
    
    /**
     * Set cached data
     * 
     * @param string $key Cache key
     * @param mixed $value Value to cache
     * @param string $config Cache configuration
     * @param int $ttl Time to live in seconds
     * @return bool Success
     */
    public static function set($key, $value, $config = self::CONFIG_DEFAULT, $ttl = null) {
        $fullKey = self::_buildKey($key);
        
        if ($ttl === null) {
            $ttl = self::_getDefaultTTL($config);
        }
        
        return Cache::write($fullKey, $value, array(
            'config' => $config,
            'duration' => $ttl
        ));
    }
    
    /**
     * Delete cached data
     * 
     * @param string $key Cache key
     * @param string $config Cache configuration
     * @return bool Success
     */
    public static function delete($key, $config = self::CONFIG_DEFAULT) {
        $fullKey = self::_buildKey($key);
        return Cache::delete($fullKey, $config);
    }
    
    /**
     * Check if key exists in cache
     * 
     * @param string $key Cache key
     * @param string $config Cache configuration
     * @return bool
     */
    public static function exists($key, $config = self::CONFIG_DEFAULT) {
        $fullKey = self::_buildKey($key);
        return Cache::read($fullKey, $config) !== false;
    }
    
    /**
     * Increment a numeric value in cache
     * 
     * @param string $key Cache key
     * @param int $step Increment step
     * @param string $config Cache configuration
     * @return int New value or false
     */
    public static function increment($key, $step = 1, $config = self::CONFIG_DEFAULT) {
        $fullKey = self::_buildKey($key);
        
        // Try to read existing value
        $value = Cache::read($fullKey, $config);
        
        if ($value === false) {
            $value = 0;
        }
        
        $newValue = $value + $step;
        
        if (Cache::write($fullKey, $newValue, $config)) {
            return $newValue;
        }
        
        return false;
    }
    
    /**
     * Decrement a numeric value in cache
     * 
     * @param string $key Cache key
     * @param int $step Decrement step
     * @param string $config Cache configuration
     * @return int New value or false
     */
    public static function decrement($key, $step = 1, $config = self::CONFIG_DEFAULT) {
        return self::increment($key, -$step, $config);
    }
    
    /**
     * Get multiple keys at once
     * 
     * @param array $keys Array of cache keys
     * @param string $config Cache configuration
     * @return array Associative array of key => value
     */
    public static function getMulti($keys, $config = self::CONFIG_DEFAULT) {
        $result = array();
        
        foreach ($keys as $key) {
            $result[$key] = self::get($key, $config);
        }
        
        return $result;
    }
    
    /**
     * Set multiple keys at once
     * 
     * @param array $items Associative array of key => value
     * @param string $config Cache configuration
     * @param int $ttl Time to live in seconds
     * @return bool Success
     */
    public static function setMulti($items, $config = self::CONFIG_DEFAULT, $ttl = null) {
        foreach ($items as $key => $value) {
            self::set($key, $value, $config, $ttl);
        }
        
        return true;
    }
    
    /**
     * Delete multiple keys at once
     * 
     * @param array $keys Array of cache keys
     * @param string $config Cache configuration
     * @return bool Success
     */
    public static function deleteMulti($keys, $config = self::CONFIG_DEFAULT) {
        foreach ($keys as $key) {
            self::delete($key, $config);
        }
        
        return true;
    }
    
    /**
     * Clear all cache for a configuration
     * 
     * @param string $config Cache configuration
     * @return bool Success
     */
    public static function clear($config = self::CONFIG_DEFAULT) {
        return Cache::clear(false, $config);
    }
    
    /**
     * Get or set cache (callback if not cached)
     * 
     * @param string $key Cache key
     * @param callable $callback Callback to generate value if not cached
     * @param string $config Cache configuration
     * @param int $ttl Time to live in seconds
     * @return mixed Cached or generated value
     */
    public static function remember($key, $callback, $config = self::CONFIG_DEFAULT, $ttl = null) {
        $value = self::get($key, $config);
        
        if ($value !== null) {
            return $value;
        }
        
        $value = $callback();
        self::set($key, $value, $config, $ttl);
        
        return $value;
    }
    
    /**
     * Acquire a distributed lock
     * 
     * @param string $lockName Lock name
     * @param int $ttl Lock TTL in seconds
     * @param string $config Cache configuration
     * @return bool Success
     */
    public static function lock($lockName, $ttl = 30, $config = self::CONFIG_DEFAULT) {
        $lockKey = self::PREFIX_LOCK . $lockName;
        
        // Try to acquire lock
        $lockValue = uniqid('lock_', true);
        $acquired = Cache::write($lockKey, $lockValue, array(
            'config' => $config,
            'duration' => $ttl
        ));
        
        if (!$acquired) {
            return false;
        }
        
        // Verify we got the lock (handle race conditions)
        $currentValue = Cache::read($lockKey, $config);
        
        if ($currentValue == $lockValue) {
            return $lockValue;
        }
        
        return false;
    }
    
    /**
     * Release a distributed lock
     * 
     * @param string $lockName Lock name
     * @param string $lockValue Lock value from acquire
     * @param string $config Cache configuration
     * @return bool Success
     */
    public static function unlock($lockName, $lockValue, $config = self::CONFIG_DEFAULT) {
        $lockKey = self::PREFIX_LOCK . $lockName;
        
        // Only delete if we own the lock
        $currentValue = Cache::read($lockKey, $config);
        
        if ($currentValue == $lockValue) {
            return Cache::delete($lockKey, $config);
        }
        
        return false;
    }
    
    /**
     * Get user-specific cache key
     * 
     * @param int $userId User ID
     * @param string $key Cache key
     * @return string Full cache key
     */
    public static function userKey($userId, $key) {
        return self::PREFIX_USER . $userId . ':' . $key;
    }
    
    /**
     * Get loan-specific cache key
     * 
     * @param int $loanId Loan ID
     * @param string $key Cache key
     * @return string Full cache key
     */
    public static function loanKey($loanId, $key) {
        return self::PREFIX_LOAN . $loanId . ':' . $key;
    }
    
    /**
     * Get wallet-specific cache key
     * 
     * @param int $walletId Wallet ID
     * @param string $key Cache key
     * @return string Full cache key
     */
    public static function walletKey($walletId, $key) {
        return self::PREFIX_WALLET . $walletId . ':' . $key;
    }
    
    /**
     * Get API-specific cache key
     * 
     * @param string $endpoint API endpoint
     * @param array $params API parameters
     * @return string Full cache key
     */
    public static function apiKey($endpoint, $params = array()) {
        $key = self::PREFIX_API . $endpoint;
        
        if (!empty($params)) {
            ksort($params);
            $key .= ':' . md5(json_encode($params));
        }
        
        return $key;
    }
    
    /**
     * Warm up cache for common data
     * 
     * @param string $type Cache type to warm
     * @return bool Success
     */
    public static function warmup($type) {
        switch ($type) {
            case 'settings':
                return self::_warmupSettings();
            case 'rates':
                return self::_warmupRates();
            case 'stats':
                return self::_warmupStats();
            default:
                return false;
        }
    }
    
    /**
     * Build full cache key with prefix
     * 
     * @param string $key Cache key
     * @return string Full key
     */
    protected static function _buildKey($key) {
        // Add global prefix
        return 'lenda_' . $key;
    }
    
    /**
     * Get default TTL for configuration
     * 
     * @param string $config Configuration name
     * @return int TTL in seconds
     */
    protected static function _getDefaultTTL($config) {
        $ttls = array(
            self::CONFIG_DEFAULT => self::TTL_MEDIUM,
            self::CONFIG_SHORT => self::TTL_SHORT,
            self::CONFIG_MEDIUM => self::TTL_MEDIUM,
            self::CONFIG_LONG => self::TTL_LONG,
            self::CONFIG_API => self::TTL_API
        );
        
        return isset($ttls[$config]) ? $ttls[$config] : self::TTL_MEDIUM;
    }
    
    /**
     * Warm up settings cache
     */
    protected static function _warmupSettings() {
        App::uses('Setting', 'Model');
        $Setting = ClassRegistry::init('Setting');
        
        $settings = $Setting->find('all', array(
            'fields' => array('key', 'value'),
            'recursive' => -1
        ));
        
        foreach ($settings as $setting) {
            self::set(
                'setting:' . $setting['Setting']['key'],
                $setting['Setting']['value'],
                self::CONFIG_LONG
            );
        }
        
        return true;
    }
    
    /**
     * Warm up rates cache
     */
    protected static function _warmupRates() {
        App::uses('InterestRate', 'Model');
        $InterestRate = ClassRegistry::init('InterestRate');
        
        $rates = $InterestRate->find('all', array(
            'recursive' => -1
        ));
        
        self::set('rates:all', $rates, self::CONFIG_LONG);
        
        return true;
    }
    
    /**
     * Warm up stats cache
     */
    protected static function _warmupStats() {
        App::uses('LoanRequest', 'Model');
        $LoanRequest = ClassRegistry::init('LoanRequest');
        
        $stats = array(
            'total_loans' => $LoanRequest->find('count'),
            'active_loans' => $LoanRequest->find('count', array(
                'conditions' => array('status' => array('active', 'funded'))
            )),
            'total_volume' => $LoanRequest->find('count', array(
                'conditions' => array('status' => array('repaid', 'active', 'funded'))
            ))
        );
        
        self::set('stats:platform', $stats, self::CONFIG_MEDIUM);
        
        return true;
    }
}
