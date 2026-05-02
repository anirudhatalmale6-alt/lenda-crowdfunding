<?php
/**
 * EventBus - Event-Driven Communication System
 * 
 * Implements an event bus pattern for inter-service communication
 * Supports both synchronous and asynchronous event processing
 * 
 * Features:
 * - Event subscription/publishing
 * - Async event queue processing
 * - Event logging and audit trail
 * - Dead letter queue for failed events
 * - Event batching for performance
 */

App::uses('EventQueue', 'Model');

class EventBus {
    
    /**
     * Event types
     */
    const EVENT_LOAN_CREATED = 'loan.created';
    const EVENT_LOAN_FUNDED = 'loan.funded';
    const EVENT_LOAN_REPAID = 'loan.repaid';
    const EVENT_LOAN_DEFAULTED = 'loan.defaulted';
    const EVENT_WALLET_DEPOSIT = 'wallet.deposit';
    const EVENT_WALLET_WITHDRAWAL = 'wallet.withdrawal';
    const EVENT_ESCROW_CREATED = 'escrow.created';
    const EVENT_ESCROW_RELEASED = 'escrow.released';
    const EVENT_USER_REGISTERED = 'user.registered';
    const EVENT_KYC_APPROVED = 'kyc.approved';
    const EVENT_RISK_ALERT = 'risk.alert';
    const EVENT_BLOCKCHAIN_SYNC = 'blockchain.sync';
    
    /**
     * Priority levels
     */
    const PRIORITY_HIGH = 10;
    const PRIORITY_NORMAL = 5;
    const PRIORITY_LOW = 1;
    
    /**
     * Event subscribers
     */
    protected static $_subscribers = array();
    
    /**
     * Publish an event synchronously
     * 
     * @param string $eventType Event type
     * @param array $payload Event payload
     * @param int $priority Priority level
     * @return bool Success
     */
    public static function publish($eventType, $payload, $priority = self::PRIORITY_NORMAL) {
        // Notify synchronous subscribers
        self::_notifySubscribers($eventType, $payload);
        
        // Queue for async processing
        self::_queueEvent($eventType, $payload, $priority);
        
        return true;
    }
    
    /**
     * Publish an event asynchronously (queued only)
     * 
     * @param string $eventType Event type
     * @param array $payload Event payload
     * @param int $priority Priority level
     * @param int $delay Delay in seconds before processing
     * @return bool Success
     */
    public static function publishAsync($eventType, $payload, $priority = self::PRIORITY_NORMAL, $delay = 0) {
        $scheduledAt = null;
        
        if ($delay > 0) {
            $scheduledAt = date('Y-m-d H:i:s', time() + $delay);
        }
        
        return self::_queueEvent($eventType, $payload, $priority, $scheduledAt);
    }
    
    /**
     * Subscribe to an event
     * 
     * @param string $eventType Event type (use * for wildcards)
     * @param callable $callback Callback function
     * @return void
     */
    public static function subscribe($eventType, $callback) {
        if (!isset(self::$_subscribers[$eventType])) {
            self::$_subscribers[$eventType] = array();
        }
        
        self::$_subscribers[$eventType][] = $callback;
    }
    
    /**
     * Unsubscribe from an event
     * 
     * @param string $eventType Event type
     * @param callable $callback Callback to remove
     * @return void
     */
    public static function unsubscribe($eventType, $callback) {
        if (isset(self::$_subscribers[$eventType])) {
            $index = array_search($callback, self::$_subscribers[$eventType]);
            
            if ($index !== false) {
                unset(self::$_subscribers[$eventType][$index]);
            }
        }
    }
    
    /**
     * Process pending events from queue
     * 
     * @param int $limit Maximum events to process
     * @return int Number of events processed
     */
    public static function processQueue($limit = 100) {
        App::uses('EventQueue', 'Model');
        $EventQueue = ClassRegistry::init('EventQueue');
        
        $events = $EventQueue->find('all', array(
            'conditions' => array(
                'status' => 'pending',
                'OR' => array(
                    'scheduled_at' => null,
                    'scheduled_at <=' => date('Y-m-d H:i:s')
                )
            ),
            'order' => array('priority DESC', 'created_at ASC'),
            'limit' => $limit,
            'recursive' => -1
        ));
        
        $processed = 0;
        
        foreach ($events as $event) {
            try {
                // Mark as processing
                $EventQueue->id = $event['EventQueue']['id'];
                $EventQueue->saveField('status', 'processing');
                $EventQueue->saveField('processed_at', date('Y-m-d H:i:s'));
                
                // Process the event
                $payload = json_decode($event['EventQueue']['event_payload'], true);
                self::_notifySubscribers($event['EventQueue']['event_type'], $payload);
                
                // Mark as completed
                $EventQueue->saveField('status', 'completed');
                $EventQueue->saveField('completed_at', date('Y-m-d H:i:s'));
                
                $processed++;
                
            } catch (Exception $e) {
                // Handle failure
                $retryCount = $event['EventQueue']['retry_count'] + 1;
                
                if ($retryCount >= $event['EventQueue']['max_retries']) {
                    // Move to dead letter
                    $EventQueue->saveField('status', 'failed');
                } else {
                    // Schedule for retry
                    $EventQueue->saveField('status', 'retry');
                }
                
                $EventQueue->saveField('retry_count', $retryCount);
                $EventQueue->saveField('error_message', $e->getMessage());
                
                // Log error
                CakeLog::write('error', 'EventBus processing error: ' . $e->getMessage());
            }
        }
        
        return $processed;
    }
    
    /**
     * Retry failed events
     * 
     * @param int $limit Maximum events to retry
     * @return int Number of events retried
     */
    public static function retryFailed($limit = 50) {
        App::uses('EventQueue', 'Model');
        $EventQueue = ClassRegistry::init('EventQueue');
        
        $events = $EventQueue->find('all', array(
            'conditions' => array(
                'status' => 'retry'
            ),
            'order' => array('created_at ASC'),
            'limit' => $limit,
            'recursive' => -1
        ));
        
        $retried = 0;
        
        foreach ($events as $event) {
            $EventQueue->id = $event['EventQueue']['id'];
            $EventQueue->saveField('status', 'pending');
            $retried++;
        }
        
        return $retried;
    }
    
    /**
     * Get event queue statistics
     * 
     * @return array Statistics
     */
    public static function getQueueStats() {
        App::uses('EventQueue', 'Model');
        $EventQueue = ClassRegistry::init('EventQueue');
        
        $stats = $EventQueue->find('all', array(
            'fields' => array(
                'status',
                'COUNT(*) as count'
            ),
            'group' => array('status'),
            'recursive' => -1
        ));
        
        $result = array(
            'pending' => 0,
            'processing' => 0,
            'completed' => 0,
            'failed' => 0,
            'retry' => 0
        );
        
        foreach ($stats as $stat) {
            $status = $stat['EventQueue']['status'];
            $count = $stat[0]['count'];
            
            if (isset($result[$status])) {
                $result[$status] = $count;
            }
        }
        
        return $result;
    }
    
    /**
     * Clean up old completed events
     * 
     * @param int $days Number of days to keep
     * @return int Number of deleted events
     */
    public static function cleanup($days = 30) {
        App::uses('EventQueue', 'Model');
        $EventQueue = ClassRegistry::init('EventQueue');
        
        $deleted = $EventQueue->deleteAll(array(
            'status' => 'completed',
            'completed_at <' => date('Y-m-d H:i:s', strtotime("-{$days} days"))
        ));
        
        return $deleted;
    }
    
    /**
     * Notify all matching subscribers
     * 
     * @param string $eventType Event type
     * @param array $payload Event payload
     * @return void
     */
    protected static function _notifySubscribers($eventType, $payload) {
        // Check for exact match
        if (isset(self::$_subscribers[$eventType])) {
            foreach (self::$_subscribers[$eventType] as $callback) {
                call_user_func($callback, $payload);
            }
        }
        
        // Check for wildcard matches
        if (isset(self::$_subscribers['*'])) {
            foreach (self::$_subscribers['*'] as $callback) {
                call_user_func($callback, $eventType, $payload);
            }
        }
        
        // Check for partial matches (e.g., loan.*)
        $parts = explode('.', $eventType);
        
        for ($i = 0; $i < count($parts); $i++) {
            $wildcard = implode('.', array_slice($parts, 0, $i + 1)) . '.*';
            
            if (isset(self::$_subscribers[$wildcard])) {
                foreach (self::$_subscribers[$wildcard] as $callback) {
                    call_user_func($callback, $payload);
                }
            }
        }
    }
    
    /**
     * Queue an event for async processing
     * 
     * @param string $eventType Event type
     * @param array $payload Event payload
     * @param int $priority Priority level
     * @param string $scheduledAt Scheduled time
     * @return bool Success
     */
    protected static function _queueEvent($eventType, $payload, $priority = self::PRIORITY_NORMAL, $scheduledAt = null) {
        App::uses('EventQueue', 'Model');
        $EventQueue = ClassRegistry::init('EventQueue');
        
        // Check if table exists, if not use direct query
        try {
            $EventQueue->create();
            return $EventQueue->save(array(
                'event_type' => $eventType,
                'event_payload' => json_encode($payload),
                'priority' => $priority,
                'status' => 'pending',
                'scheduled_at' => $scheduledAt,
                'max_retries' => 3
            ));
        } catch (Exception $e) {
            // Fallback: Log to file if queue table doesn't exist
            CakeLog::write('event_bus', json_encode(array(
                'type' => $eventType,
                'payload' => $payload,
                'priority' => $priority,
                'timestamp' => date('c')
            )));
            
            return false;
        }
    }
    
    /**
     * Create a new event for manual triggering
     * 
     * @param string $eventType Event type
     * @param array $payload Event payload
     * @param int $priority Priority level
     * @return mixed Event ID or false
     */
    public static function createEvent($eventType, $payload, $priority = self::PRIORITY_NORMAL) {
        return self::_queueEvent($eventType, $payload, $priority);
    }
}
