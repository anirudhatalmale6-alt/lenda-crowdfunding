<?php
/**
 * CrowdFunding
 *
 * PHP version 5
 *
 * @category   PHP
 * @package    Crowdfunding
 * @subpackage Core
 * @author     Agriya <info@agriya.com>
 * @copyright  2018 Agriya Infoway Private Ltd
 * @license    http://www.agriya.com/ Agriya Infoway Licence
 * @link       http://www.agriya.com
 */
class EventQueue extends AppModel
{
    public $name = 'EventQueue';
    public $useTable = 'event_queues';
    
    /**
     * Status constants
     */
    const STATUS_PENDING = 'pending';
    const STATUS_PROCESSING = 'processing';
    const STATUS_COMPLETED = 'completed';
    const STATUS_FAILED = 'failed';
    const STATUS_RETRY = 'retry';
    
    /**
     * Default values
     */
    public $defaults = array(
        'status' => 'pending',
        'priority' => 5,
        'max_retries' => 3,
        'retry_count' => 0
    );
    
    /**
     * Validation rules
     */
    public $validate = array(
        'event_type' => array(
            'notempty' => array(
                'rule' => 'notempty',
                'message' => 'Event type is required'
            )
        ),
        'event_payload' => array(
            'notempty' => array(
                'rule' => 'notempty',
                'message' => 'Event payload is required'
            )
        ),
        'status' => array(
            'inlist' => array(
                'rule' => array('inList', array('pending', 'processing', 'completed', 'failed', 'retry')),
                'message' => 'Invalid status'
            )
        )
    );
    
    public function __construct($id = false, $table = null, $ds = null) 
    {
        parent::__construct($id, $table, $ds);
    }
    
    /**
     * Create a new event queue entry
     *
     * @param string $eventType Event type
     * @param array $payload Event payload
     * @param int $priority Priority level
     * @param string $scheduledAt Scheduled time
     * @param int $maxRetries Maximum retry attempts
     * @return mixed Event ID or false
     */
    public function createEvent($eventType, $payload, $priority = 5, $scheduledAt = null, $maxRetries = 3) {
        $this->create();
        return $this->save(array(
            'event_type' => $eventType,
            'event_payload' => json_encode($payload),
            'priority' => $priority,
            'status' => self::STATUS_PENDING,
            'scheduled_at' => $scheduledAt,
            'max_retries' => $maxRetries,
            'retry_count' => 0
        ));
    }
    
    /**
     * Get pending events for processing
     *
     * @param int $limit Maximum events to fetch
     * @return array Pending events
     */
    public function getPendingEvents($limit = 100) {
        return $this->find('all', array(
            'conditions' => array(
                'status' => self::STATUS_PENDING,
                'OR' => array(
                    'scheduled_at' => null,
                    'scheduled_at <=' => date('Y-m-d H:i:s')
                )
            ),
            'order' => array('priority DESC', 'created_at ASC'),
            'limit' => $limit,
            'recursive' => -1
        ));
    }
    
    /**
     * Get events for retry
     *
     * @param int $limit Maximum events to fetch
     * @return array Events to retry
     */
    public function getRetryEvents($limit = 50) {
        return $this->find('all', array(
            'conditions' => array(
                'status' => self::STATUS_RETRY
            ),
            'order' => array('created_at ASC'),
            'limit' => $limit,
            'recursive' => -1
        ));
    }
    
    /**
     * Get queue statistics
     *
     * @return array Statistics by status
     */
    public function getQueueStats() {
        return $this->find('all', array(
            'fields' => array(
                'status',
                'COUNT(*) as count'
            ),
            'group' => array('status'),
            'recursive' => -1
        ));
    }
}
