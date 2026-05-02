<?php
/**
 * LENDA Event Bus System
 * 
 * Implements event-driven architecture for loose coupling between modules
 * 
 * @package Lenda
 * @subpackage Lib.Event
 */

App::uses('CakeEventManager', 'Event');

/**
 * Event Types
 */
class LendaEvent {
    // Loan Events
    const LOAN_CREATED = 'model.loan.created';
    const LOAN_APPROVED = 'model.loan.approved';
    const LOAN_FUNDED = 'model.loan.funded';
    const LOAN_ACTIVE = 'model.loan.active';
    const LOAN_REPAID = 'model.loan.repaid';
    const LOAN_DEFAULTED = 'model.loan.defaulted';
    const LOAN_CANCELLED = 'model.loan.cancelled';
    const LOAN_TOPUP_REQUESTED = 'model.loan.topup.requested';
    const LOAN_TOPUP_APPROVED = 'model.loan.topup.approved';
    
    // Payment Events
    const PAYMENT_RECEIVED = 'model.payment.received';
    const PAYMENT_DISTRIBUTED = 'model.payment.distributed';
    const PAYMENT_FAILED = 'model.payment.failed';
    
    // Risk Events
    const RISK_SCORE_UPDATED = 'model.risk.score.updated';
    const RISK_STATUS_CHANGED = 'model.risk.status.changed';
    const DEFAULT_WORKFLOW_STARTED = 'model.risk.default.workflow.started';
    const DEFAULT_WORKFLOW_ADVANCED = 'model.risk.default.workflow.advanced';
    const LIQUIDATION_TRIGGERED = 'model.risk.liquidation.triggered';
    
    // Collateral Events
    const COLLATERAL_DEPOSITED = 'model.collateral.deposited';
    const COLLATERAL_VERIFIED = 'model.collateral.verified';
    const COLLATERAL_RELEASED = 'model.collateral.released';
    const COLLATERAL_LIQUIDATED = 'model.collateral.liquidated';
    
    // Wallet Events
    const WALLET_CREATED = 'model.wallet.created';
    const WALLET_BALANCE_CHANGED = 'model.wallet.balance.changed';
    const WALLET_DEPOSIT = 'model.wallet.deposit';
    const WALLET_WITHDRAWAL = 'model.wallet.withdrawal';
    
    // User Events
    const USER_REGISTERED = 'model.user.registered';
    const USER_KYC_APPROVED = 'model.user.kyc.approved';
    const USER_KYC_REJECTED = 'model.user.kyc.rejected';
    
    // Reserve Fund Events
    const RESERVE_DEPOSITED = 'model.reserve.deposited';
    const RESERVE_WITHDRAWN = 'model.reserve.withdrawn';
    const RESERVE_CLAIM_PAID = 'model.reserve.claim.paid';
    const RESERVE_COVERAGE_LOW = 'model.reserve.coverage.low';
    
    // Token Events
    const TOKEN_MINTED = 'model.token.minted';
    const TOKEN_TRANSFERRED = 'model.token.transferred';
    const TOKEN_BURNED = 'model.token.burned';
    
    // Escrow Events
    const ESCROW_CREATED = 'model.escrow.created';
    const ESCROW_FUNDED = 'model.escrow.funded';
    const ESCROW_RELEASED = 'model.escrow.released';
    const ESCROW_DISPUTED = 'model.escrow.disputed';
    const ESCROW_REFUNDED = 'model.escrow.refunded';
    
    // Accelerator Events
    const ACCELERATOR_TRIGGERED = 'model.accelerator.triggered';
    const ACCELERATOR_STAGE_CHANGED = 'model.accelerator.stage.changed';
    
    // Blockchain Events
    const BLOCKCHAIN_TX_PENDING = 'blockchain.tx.pending';
    const BLOCKCHAIN_TX_CONFIRMED = 'blockchain.tx.confirmed';
    const BLOCKCHAIN_TX_FAILED = 'blockchain.tx.failed';
}

/**
 * Event Bus Service
 * 
 * Central event dispatcher for the LENDA platform
 */
class LendaEventBus {
    
    /**
     * Singleton instance
     */
    private static $_instance = null;
    
    /**
     * Event listeners
     */
    protected $_listeners = array();
    
    /**
     * Event queue for async processing
     */
    protected $_queue = array();
    
    /**
     * Processed events log
     */
    protected $_eventLog = array();
    
    /**
     * Get singleton instance
     */
    public static function getInstance() {
        if (self::$_instance === null) {
            self::$_instance = new self();
        }
        return self::$_instance;
    }
    
    /**
     * Constructor
     */
    protected function __construct() {
        $this->_listeners = array();
        $this->_queue = array();
        $this->_eventLog = array();
    }
    
    /**
     * Subscribe to an event
     * 
     * @param string $event Event type
     * @param callable $callback Callback function
     * @param array $options Options (priority, async)
     */
    public function subscribe($event, $callback, $options = array()) {
        $priority = isset($options['priority']) ? $options['priority'] : 10;
        $async = isset($options['async']) ? $options['async'] : false;
        
        if (!isset($this->_listeners[$event])) {
            $this->_listeners[$event] = array();
        }
        
        $this->_listeners[$event][] = array(
            'callback' => $callback,
            'priority' => $priority,
            'async' => $async
        );
        
        // Sort by priority
        usort($this->_listeners[$event], function($a, $b) {
            return $b['priority'] - $a['priority'];
        });
    }
    
    /**
     * Unsubscribe from an event
     * 
     * @param string $event Event type
     * @param callable $callback Callback to remove
     */
    public function unsubscribe($event, $callback = null) {
        if ($callback === null) {
            unset($this->_listeners[$event]);
            return;
        }
        
        if (isset($this->_listeners[$event])) {
            foreach ($this->_listeners[$event] as $key => $listener) {
                if ($listener['callback'] === $callback) {
                    unset($this->_listeners[$event][$key]);
                }
            }
            $this->_listeners[$event] = array_values($this->_listeners[$event]);
        }
    }
    
    /**
     * Publish an event
     * 
     * @param string $event Event type
     * @param array $data Event data
     * @param array $options Options (async, transactional)
     */
    public function publish($event, $data = array(), $options = array()) {
        $async = isset($options['async']) ? $options['async'] : false;
        
        $eventData = array(
            'type' => $event,
            'data' => $data,
            'timestamp' => time(),
            'processed' => false
        );
        
        if ($async) {
            // Queue for async processing
            $this->_queue[] = $eventData;
            $this->_processQueue();
        } else {
            // Process immediately
            $this->_dispatch($eventData);
        }
        
        return $eventData;
    }
    
    /**
     * Publish event synchronously
     */
    public function publishSync($event, $data = array()) {
        return $this->publish($event, $data, array('async' => false));
    }
    
    /**
     * Publish event asynchronously
     */
    public function publishAsync($event, $data = array()) {
        return $this->publish($event, $data, array('async' => true));
    }
    
    /**
     * Dispatch event to listeners
     */
    protected function _dispatch($eventData) {
        $event = $eventData['type'];
        $data = $eventData['data'];
        
        if (!isset($this->_listeners[$event])) {
            return;
        }
        
        $results = array();
        
        foreach ($this->_listeners[$event] as $listener) {
            try {
                $result = call_user_func($listener['callback'], $data);
                $results[] = array(
                    'success' => true,
                    'result' => $result
                );
            } catch (Exception $e) {
                $results[] = array(
                    'success' => false,
                    'error' => $e->getMessage()
                );
            }
        }
        
        // Mark as processed
        $eventData['processed'] = true;
        $eventData['results'] = $results;
        
        // Log event
        $this->_logEvent($eventData);
        
        // Also dispatch to CakePHP event system for compatibility
        $this->_dispatchToCake($event, $data);
        
        return $results;
    }
    
    /**
     * Dispatch to CakePHP event manager
     */
    protected function _dispatchToCake($event, $data) {
        $cakeEvent = new CakeEvent($event, $this, $data);
        CakeEventManager::instance()->dispatch($cakeEvent);
    }
    
    /**
     * Process queued events
     */
    protected function _processQueue() {
        while (!empty($this->_queue)) {
            $event = array_shift($this->_queue);
            $this->_dispatch($event);
        }
    }
    
    /**
     * Log event for auditing
     */
    protected function _logEvent($eventData) {
        // Keep last 1000 events in memory
        if (count($this->_eventLog) > 1000) {
            array_shift($this->_eventLog);
        }
        
        $this->_eventLog[] = $eventData;
        
        // Persist to database if configured
        if (Configure::read('EventBus.persist')) {
            $this->_persistEvent($eventData);
        }
    }
    
    /**
     * Persist event to database
     */
    protected function _persistEvent($eventData) {
        App::uses('EventLog', 'Model');
        $EventLog = ClassRegistry::init('EventLog');
        
        $EventLog->create();
        $EventLog->save(array(
            'event_type' => $eventData['type'],
            'event_data' => json_encode($eventData['data']),
            'processed' => $eventData['processed'],
            'created_at' => date('Y-m-d H:i:s', $eventData['timestamp'])
        ));
    }
    
    /**
     * Get event log
     */
    public function getEventLog($eventType = null, $limit = 100) {
        if ($eventType) {
            $events = array_filter($this->_eventLog, function($e) use ($eventType) {
                return $e['type'] === $eventType;
            });
            return array_slice($events, -$limit);
        }
        
        return array_slice($this->_eventLog, -$limit);
    }
    
    /**
     * Get queue status
     */
    public function getQueueStatus() {
        return array(
            'pending' => count($this->_queue),
            'processed_today' => count($this->_eventLog)
        );
    }
    
    /**
     * Clear queue
     */
    public function clearQueue() {
        $this->_queue = array();
    }
}

/**
 * Event Subscriber Trait
 * 
 * Use this trait in models/controllers to easily subscribe to events
 */
trait EventSubscriberTrait {
    
    /**
     * Register event listeners
     */
    public function registerEvents() {
        // Override in implementing class
    }
    
    /**
     * Subscribe to an event
     */
    protected function _subscribeToEvent($event, $callback, $options = array()) {
        LendaEventBus::getInstance()->subscribe($event, array($this, $callback), $options);
    }
    
    /**
     * Publish an event
     */
    protected function _publishEvent($event, $data = array(), $options = array()) {
        return LendaEventBus::getInstance()->publish($event, $data, $options);
    }
}

/**
 * Event-Driven Loan Service
 * 
 * Example: Event-driven loan funding
 */
class EventDrivenLoanService {
    use EventSubscriberTrait;
    
    /**
     * Initialize event listeners
     */
    public function __construct() {
        $this->registerEvents();
    }
    
    /**
     * Register event listeners
     */
    public function registerEvents() {
        $bus = LendaEventBus::getInstance();
        
        // Listen for loan funding to trigger accelerator
        $bus->subscribe(LendaEvent::LOAN_FUNDED, array($this, 'onLoanFunded'), array(
            'priority' => 10,
            'async' => true
        ));
        
        // Listen for loan fully funded to activate
        $bus->subscribe(LendaEvent::LOAN_ACTIVE, array($this, 'onLoanActive'), array(
            'priority' => 10,
            'async' => false
        ));
        
        // Listen for default to trigger liquidation
        $bus->subscribe(LendaEvent::LOAN_DEFAULTED, array($this, 'onLoanDefaulted'), array(
            'priority' => 10,
            'async' => false
        ));
    }
    
    /**
     * Handle loan funded event
     */
    public function onLoanFunded($data) {
        $loanId = $data['loan_id'];
        $fundedAmount = $data['funded_amount'];
        $totalAmount = $data['loan_amount'];
        
        // Calculate funding percentage
        $percentage = ($fundedAmount / $totalAmount) * 100;
        
        // Trigger accelerator if threshold reached
        if ($percentage >= 50) {
            LendaEventBus::getInstance()->publish(LendaEvent::ACCELERATOR_TRIGGERED, array(
                'loan_id' => $loanId,
                'funding_percentage' => $percentage,
                'stage' => $percentage >= 90 ? 'almost_funded' : ($percentage >= 75 ? 'hot' : 'trending')
            ));
        }
        
        // If fully funded, activate the loan
        if ($percentage >= 100) {
            LendaEventBus::getInstance()->publish(LendaEvent::LOAN_ACTIVE, array(
                'loan_id' => $loanId,
                'activated_at' => time()
            ));
        }
    }
    
    /**
     * Handle loan activated event
     */
    public function onLoanActive($data) {
        $loanId = $data['loan_id'];
        
        // Issue fractional tokens
        LendaEventBus::getInstance()->publish(LendaEvent::TOKEN_MINTED, array(
            'loan_id' => $loanId,
            'type' => 'loan_token'
        ));
        
        // Set up risk monitoring
        LendaEventBus::getInstance()->publish(LendaEvent::RISK_SCORE_UPDATED, array(
            'loan_id' => $loanId,
            'status' => 'active'
        ));
    }
    
    /**
     * Handle loan defaulted event
     */
    public function onLoanDefaulted($data) {
        $loanId = $data['loan_id'];
        
        // Trigger collateral liquidation
        LendaEventBus::getInstance()->publish(LendaEvent::LIQUIDATION_TRIGGERED, array(
            'loan_id' => $loanId,
            'collateral_id' => $data['collateral_id']
        ));
        
        // Process reserve fund claim
        LendaEventBus::getInstance()->publish(LendaEvent::RESERVE_CLAIM_PAID, array(
            'loan_id' => $loanId,
            'amount' => $data['unpaid_amount']
        ));
    }
}

/**
 * Helper function to publish events globally
 */
function publish_event($event, $data = array(), $options = array()) {
    return LendaEventBus::getInstance()->publish($event, $data, $options);
}

/**
 * Helper function to subscribe to events globally
 */
function subscribe_event($event, $callback, $options = array()) {
    return LendaEventBus::getInstance()->subscribe($event, $callback, $options);
}
