<?php
/**
 * Database Connection Pool Component (FIN-08)
 * 
 * Implements database connection pooling for improved performance
 * and reduced connection overhead under high load.
 * 
 * @package     Controller
 * @subpackage  Component
 * @author      Lenda Development Team
 */
App::uses('Component', 'Controller');

class DatabasePoolComponent extends Component
{
    /**
     * Connection pool storage
     */
    private static $pool = array();
    
    /**
     * Pool configuration
     */
    private $config = array(
        'enabled' => true,
        'min_connections' => 5,
        'max_connections' => 50,
        'idle_timeout' => 300,
        'connection_timeout' => 10,
        'max_lifetime' => 3600,
    );
    
    /**
     * Active connection count
     */
    private static $activeConnections = 0;
    
    /**
     * Lock for thread-safe operations
     */
    private static $lock = false;
    
    /**
     * Initialize component
     */
    public function initialize(Controller $controller)
    {
        $this->config = array_merge($this->config, Configure::read('Database.pool') ?: array());
        
        // Initialize pool on startup if enabled
        if ($this->config['enabled']) {
            $this->initializePool();
        }
    }
    
    /**
     * Initialize the connection pool
     */
    private function initializePool()
    {
        // Pre-establish minimum connections
        $dbConfig = Configure::read('Database.default');
        
        for ($i = 0; $i < $this->config['min_connections']; $i++) {
            $this->createConnection($dbConfig);
        }
    }
    
    /**
     * Create a new database connection
     */
    private function createConnection($config)
    {
        if (self::$activeConnections >= $this->config['max_connections']) {
            // Wait for available connection or timeout
            $startTime = microtime(true);
            while (self::$activeConnections >= $this->config['max_connections']) {
                if ((microtime(true) - $startTime) > $this->config['connection_timeout']) {
                    throw new Exception('Database connection pool exhausted');
                }
                usleep(10000); // Wait 10ms
            }
        }
        
        try {
            $dsn = sprintf(
                'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
                $config['host'],
                $config['port'] ?: 3306,
                $config['database']
            );
            
            $options = array(
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => 'SET SESSION wait_timeout = 600',
            );
            
            $connection = new PDO($dsn, $config['login'], $config['password'], $options);
            $connection->createdAt = time();
            
            self::$pool[spl_object_id($connection)] = $connection;
            self::$activeConnections++;
            
            return $connection;
        } catch (PDOException $e) {
            CakeLog::write('error', 'DatabasePool: Failed to create connection - ' . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Get a connection from the pool
     */
    public static function getConnection($config = null)
    {
        if (!$config) {
            $config = Configure::read('Database.default');
        }
        
        // Find an available idle connection
        $now = time();
        foreach (self::$pool as $id => $conn) {
            if (isset($conn->inUse) && !$conn->inUse) {
                // Check if connection is still alive
                $maxLifetime = Configure::read('Database.pool.max_lifetime') ?: 3600;
                if (($now - $conn->createdAt) > $maxLifetime) {
                    // Connection expired, remove it
                    unset(self::$pool[$id]);
                    self::$activeConnections--;
                    continue;
                }
                
                // Test connection
                try {
                    $conn->query('SELECT 1');
                    $conn->inUse = true;
                    return $conn;
                } catch (PDOException $e) {
                    // Connection dead, remove it
                    unset(self::$pool[$id]);
                    self::$activeConnections--;
                }
            }
        }
        
        // No available connection, create new one
        $instance = new self(new ComponentCollection());
        return $instance->createConnection($config);
    }
    
    /**
     * Release connection back to pool
     */
    public static function releaseConnection($connection)
    {
        if ($connection instanceof PDO) {
            $connection->inUse = false;
        }
    }
    
    /**
     * Close a specific connection
     */
    public static function closeConnection($connection)
    {
        if ($connection instanceof PDO) {
            $id = spl_object_id($connection);
            if (isset(self::$pool[$id])) {
                unset(self::$pool[$id]);
                self::$activeConnections--;
            }
            $connection = null;
        }
    }
    
    /**
     * Get pool statistics
     */
    public static function getStats()
    {
        return array(
            'active_connections' => self::$activeConnections,
            'pool_size' => count(self::$pool),
            'in_use' => array_reduce(self::$pool, function($count, $conn) {
                return $count + (isset($conn->inUse) && $conn->inUse ? 1 : 0);
            }, 0),
            'available' => array_reduce(self::$pool, function($count, $conn) {
                return $count + (isset($conn->inUse) && !$conn->inUse ? 1 : 0);
            }, 0),
        );
    }
    
    /**
     * Clean up expired connections
     */
    public static function cleanup()
    {
        $now = time();
        $maxLifetime = Configure::read('Database.pool.max_lifetime') ?: 3600;
        
        foreach (self::$pool as $id => $conn) {
            if (($now - $conn->createdAt) > $maxLifetime && !isset($conn->inUse)) {
                unset(self::$pool[$id]);
                self::$activeConnections--;
            }
        }
    }
    
    /**
     * Shutdown - close all connections
     */
    public function shutdown(Controller $controller)
    {
        foreach (self::$pool as $connection) {
            $connection = null;
        }
        self::$pool = array();
        self::$activeConnections = 0;
    }
}
