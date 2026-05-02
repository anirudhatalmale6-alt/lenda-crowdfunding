<?php
/**
 * Blockchain Sync Controller
 * 
 * Handles blockchain event synchronization between smart contracts
 * and the database. Events are received from the event listener
 * and used to update the database state.
 * 
 * Endpoints:
 * POST /api/blockchain/sync-event - Sync a blockchain event
 * POST /api/blockchain/sync-batch - Sync multiple events
 * GET  /api/blockchain/status - Get sync status
 * GET  /api/blockchain/reconciliation - Run reconciliation
 */

App::uses("AppController", "Controller");

class ApiBlockchainController extends AppController {
    use ApiBaseControllerTrait;
    
    public $name = "ApiBlockchain";
    public $layout = null;
    public $autoRender = false;
    
    /**
     * Components
     */
    public $components = array(
        'RateLimit' => array('className' => 'RateLimit')
    );
    
    /**
     * Models used
     */
    public $uses = array(
        'LoanRequest',
        'LoanFunding',
        'Repayment',
        'CollateralAsset',
        'EscrowTransaction',
        'WalletAccount',
        'WalletTransaction',
        'SmartContract',
        'BlockchainEventLog'
    );
    
    /**
     * Allowed event types
     */
    private $allowedLoanEvents = array(
        'LoanCreated',
        'LoanFunded',
        'LoanFullyFunded',
        'LoanActivated',
        'RepaymentMade',
        'LoanRepaid',
        'DefaultTriggered',
        'CollateralDeposited',
        'CollateralReleased'
    );
    
    private $allowedEscrowEvents = array(
        'TransactionCreated',
        'TransactionFunded',
        'TransactionShipped',
        'TransactionDelivered',
        'FundsReleased',
        'DisputeOpened',
        'DisputeResolved',
        'TransactionRefunded',
        'TransactionCancelled'
    );
    
    /**
     * Before filter - require API key
     */
    public function beforeFilter() {
        parent::beforeFilter();
        
        // Require API key for blockchain sync
        $this->_requireApiKey();
    }
    
    /**
     * Sync a single blockchain event
     */
    public function syncEvent() {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!$data) {
            return $this->_errorResponse('Invalid request body', 400);
        }
        
        // Validate required fields
        $required = array('contract_type', 'event_name', 'block_number', 'transaction_hash');
        $errors = $this->_validateRequired($data, $required);
        
        if (!empty($errors)) {
            return $this->_errorResponse('Missing required fields', 400, $errors);
        }
        
        $contractType = $data['contract_type'];
        $eventName = $data['event_name'];
        $blockNumber = $data['block_number'];
        $transactionHash = $data['transaction_hash'];
        $args = $data['args'] ?? array();
        $logIndex = $data['log_index'] ?? 0;
        
        // Validate event type
        if (!in_array($eventName, $this->allowedLoanEvents) && 
            !in_array($eventName, $this->allowedEscrowEvents)) {
            return $this->_errorResponse('Unknown event type: ' . $eventName, 400);
        }
        
        // Check for duplicate event
        if ($this->_isDuplicateEvent($transactionHash, $logIndex)) {
            return $this->_successResponse(array(
                'message' => 'Duplicate event ignored',
                'event_hash' => $this->_generateEventHash($transactionHash, $logIndex)
            ), 'Event already processed');
        }
        
        // Process event based on type
        $result = $this->_processEvent($contractType, $eventName, $args);
        
        // Log the event regardless of processing result
        $this->_logBlockchainEvent($contractType, $eventName, $blockNumber, 
            $transactionHash, $logIndex, $args, $result);
        
        if ($result['success']) {
            return $this->_successResponse($result['data'], $result['message'] ?? 'Event synced');
        }
        
        return $this->_errorResponse($result['message'] ?? 'Failed to process event', 500);
    }
    
    /**
     * Sync multiple events (batch)
     */
    public function syncBatch() {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!isset($data['events']) || !is_array($data['events'])) {
            return $this->_errorResponse('Invalid request - events array required', 400);
        }
        
        $events = $data['events'];
        $results = array();
        $successCount = 0;
        $failureCount = 0;
        
        foreach ($events as $event) {
            $contractType = $event['contract_type'] ?? '';
            $eventName = $event['event_name'] ?? '';
            $blockNumber = $event['block_number'] ?? 0;
            $transactionHash = $event['transaction_hash'] ?? '';
            $logIndex = $event['log_index'] ?? 0;
            $args = $event['args'] ?? array();
            
            // Skip duplicates
            if ($this->_isDuplicateEvent($transactionHash, $logIndex)) {
                $results[] = array(
                    'tx_hash' => $transactionHash,
                    'status' => 'skipped',
                    'reason' => 'duplicate'
                );
                continue;
            }
            
            // Process event
            $result = $this->_processEvent($contractType, $eventName, $args);
            
            // Log event
            $this->_logBlockchainEvent($contractType, $eventName, $blockNumber,
                $transactionHash, $logIndex, $args, $result);
            
            if ($result['success']) {
                $successCount++;
                $results[] = array(
                    'tx_hash' => $transactionHash,
                    'status' => 'success'
                );
            } else {
                $failureCount++;
                $results[] = array(
                    'tx_hash' => $transactionHash,
                    'status' => 'failed',
                    'reason' => $result['message']
                );
            }
        }
        
        return $this->_successResponse(array(
            'processed' => count($events),
            'success' => $successCount,
            'failed' => $failureCount,
            'results' => $results
        ));
    }
    
    /**
     * Get blockchain sync status
     */
    public function status() {
        // Get last processed block for each contract type
        $loanStatus = $this->_getLastProcessedBlock('loan');
        $escrowStatus = $this->_getLastProcessedBlock('escrow');
        
        // Get event counts
        $totalEvents = $this->BlockchainEventLog->find('count');
        $todayEvents = $this->BlockchainEventLog->find('count', array(
            'conditions' => array(
                'created_at >=' => date('Y-m-d 00:00:00')
            )
        ));
        
        return $this->_successResponse(array(
            'loan' => $loanStatus,
            'escrow' => $escrowStatus,
            'total_events_processed' => $totalEvents,
            'events_today' => $todayEvents,
            'last_sync' => $this->_getLastSyncTime()
        ));
    }
    
    /**
     * Run reconciliation between blockchain and database
     */
    public function reconciliation() {
        // This would typically compare on-chain state with database
        // and flag any discrepancies
        
        $report = array(
            'loan_discrepancies' => array(),
            'escrow_discrepancies' => array(),
            'wallet_discrepancies' => array(),
            'reconciled_at' => date('Y-m-d H:i:s')
        );
        
        // Get loans that might be out of sync
        // (e.g., marked as funded but no blockchain confirmation)
        $unconfirmedFundedLoans = $this->LoanRequest->find('all', array(
            'conditions' => array(
                'LoanRequest.status' => 'funded',
                'OR' => array(
                    'LoanRequest.blockchain_tx_hash IS NULL',
                    'LoanRequest.blockchain_tx_hash' => ''
                )
            ),
            'limit' => 100
        ));
        
        $report['loan_discrepancies']['unconfirmed_funded'] = count($unconfirmedFundedLoans);
        
        // Get escrow discrepancies
        $unconfirmedEscrow = $this->EscrowTransaction->find('count', array(
            'conditions' => array(
                'EscrowTransaction.status' => 'funded',
                'OR' => array(
                    'EscrowTransaction.blockchain_tx_hash IS NULL',
                    'EscrowTransaction.blockchain_tx_hash' => ''
                )
            )
        ));
        
        $report['escrow_discrepancies']['unconfirmed_funded'] = $unconfirmedEscrow;
        
        return $this->_successResponse($report);
    }
    
    /**
     * Get contract events (for querying historical data)
     */
    public function events() {
        $contractType = $this->request->query['contract_type'] ?? null;
        $eventName = $this->request->query['event_name'] ?? null;
        $fromBlock = isset($this->request->query['from_block']) ? intval($this->request->query['from_block']) : null;
        $toBlock = isset($this->request->query['to_block']) ? intval($this->request->query['to_block']) : null;
        
        $conditions = array();
        
        if ($contractType) {
            $conditions['contract_type'] = $contractType;
        }
        
        if ($eventName) {
            $conditions['event_name'] = $eventName;
        }
        
        if ($fromBlock) {
            $conditions['block_number >='] = $fromBlock;
        }
        
        if ($toBlock) {
            $conditions['block_number <='] = $toBlock;
        }
        
        // Pagination
        $page = isset($this->request->query['page']) ? max(1, intval($this->request->query['page'])) : 1;
        $limit = isset($this->request->query['limit']) ? min(max(1, intval($this->request->query['limit'])), 100) : 20;
        
        $total = $this->BlockchainEventLog->find('count', array('conditions' => $conditions));
        
        $events = $this->BlockchainEventLog->find('all', array(
            'conditions' => $conditions,
            'order' => array('block_number' => 'DESC', 'log_index' => 'DESC'),
            'limit' => $limit,
            'offset' => ($page - 1) * $limit
        ));
        
        return $this->_paginatedResponse($events, $page, $limit, $total);
    }
    
    // Private methods
    
    /**
     * Process a blockchain event
     */
    private function _processEvent($contractType, $eventName, $args) {
        try {
            switch ($contractType) {
                case 'loan':
                    return $this->_processLoanEvent($eventName, $args);
                case 'escrow':
                    return $this->_processEscrowEvent($eventName, $args);
                default:
                    return array('success' => false, 'message' => 'Unknown contract type');
            }
        } catch (Exception $e) {
            return array('success' => false, 'message' => $e->getMessage());
        }
    }
    
    /**
     * Process loan contract events
     */
    private function _processLoanEvent($eventName, $args) {
        $loanId = $args['loanId'] ?? $args['loan_id'] ?? null;
        
        if (!$loanId) {
            return array('success' => false, 'message' => 'Missing loan ID');
        }
        
        switch ($eventName) {
            case 'LoanCreated':
                return $this->_handleLoanCreated($loanId, $args);
            case 'LoanFunded':
                return $this->_handleLoanFunded($loanId, $args);
            case 'LoanFullyFunded':
                return $this->_handleLoanFullyFunded($loanId);
            case 'LoanActivated':
                return $this->_handleLoanActivated($loanId, $args);
            case 'RepaymentMade':
                return $this->_handleRepaymentMade($loanId, $args);
            case 'LoanRepaid':
                return $this->_handleLoanRepaid($loanId);
            case 'DefaultTriggered':
                return $this->_handleDefaultTriggered($loanId);
            default:
                return array('success' => true, 'message' => 'Event acknowledged');
        }
    }
    
    /**
     * Process escrow contract events
     */
    private function _processEscrowEvent($eventName, $args) {
        $transactionId = $args['id'] ?? $args['transactionId'] ?? null;
        
        if (!$transactionId) {
            return array('success' => false, 'message' => 'Missing transaction ID');
        }
        
        switch ($eventName) {
            case 'TransactionCreated':
                return $this->_handleEscrowCreated($transactionId, $args);
            case 'TransactionFunded':
                return $this->_handleEscrowFunded($transactionId, $args);
            case 'TransactionShipped':
                return $this->_handleEscrowShipped($transactionId, $args);
            case 'TransactionDelivered':
                return $this->_handleEscrowDelivered($transactionId);
            case 'FundsReleased':
                return $this->_handleEscrowReleased($transactionId, $args);
            case 'DisputeOpened':
                return $this->_handleDisputeOpened($transactionId, $args);
            case 'DisputeResolved':
                return $this->_handleDisputeResolved($transactionId, $args);
            case 'TransactionRefunded':
                return $this->_handleEscrowRefunded($transactionId);
            default:
                return array('success' => true, 'message' => 'Event acknowledged');
        }
    }
    
    // Event handlers
    
    private function _handleLoanCreated($loanId, $args) {
        // Check if loan exists
        $loan = $this->LoanRequest->find('first', array(
            'conditions' => array('LoanRequest.id' => $loanId)
        ));
        
        if ($loan) {
            // Update with blockchain info
            $this->LoanRequest->id = $loanId;
            $this->LoanRequest->saveField('blockchain_loan_id', $args['blockchainId'] ?? $loanId);
            
            return array('success' => true, 'data' => array('loan_id' => $loanId));
        }
        
        return array('success' => false, 'message' => 'Loan not found');
    }
    
    private function _handleLoanFunded($loanId, $args) {
        // Update funding amount
        $lenderAddress = $args['lender'] ?? '';
        $amount = floatval($args['amount'] ?? 0);
        
        // Find the funding record
        $funding = $this->LoanFunding->find('first', array(
            'conditions' => array(
                'LoanFunding.loan_id' => $loanId
            )
        ));
        
        if ($funding) {
            // Update blockchain tx hash if not set
            if (empty($funding['LoanFunding']['blockchain_tx_hash'])) {
                $this->LoanFunding->id = $funding['LoanFunding']['id'];
                $this->LoanFunding->saveField('blockchain_tx_hash', $args['transactionHash'] ?? '');
            }
        }
        
        return array('success' => true, 'data' => array('loan_id' => $loanId, 'amount' => $amount));
    }
    
    private function _handleLoanFullyFunded($loanId) {
        $this->LoanRequest->id = $loanId;
        $this->LoanRequest->saveField('status', 'funded');
        $this->LoanRequest->saveField('funded_at', date('Y-m-d H:i:s'));
        
        return array('success' => true, 'data' => array('loan_id' => $loanId));
    }
    
    private function _handleLoanActivated($loanId, $args) {
        $this->LoanRequest->id = $loanId;
        $this->LoanRequest->saveField('status', 'active');
        
        return array('success' => true, 'data' => array('loan_id' => $loanId));
    }
    
    private function _handleRepaymentMade($loanId, $args) {
        $amount = floatval($args['amount'] ?? 0);
        
        // Find or create repayment record
        $repayment = $this->Repayment->find('first', array(
            'conditions' => array(
                'Repayment.loan_id' => $loanId,
                'status' => 'pending'
            )
        ));
        
        if ($repayment) {
            $this->Repayment->id = $repayment['Repayment']['id'];
            $this->Repayment->saveField('status', 'paid');
            $this->Repayment->saveField('paid_at', date('Y-m-d H:i:s'));
        }
        
        return array('success' => true, 'data' => array('loan_id' => $loanId, 'amount' => $amount));
    }
    
    private function _handleLoanRepaid($loanId) {
        $this->LoanRequest->id = $loanId;
        $this->LoanRequest->saveField('status', 'repaid');
        $this->LoanRequest->saveField('repaid_at', date('Y-m-d H:i:s'));
        
        return array('success' => true, 'data' => array('loan_id' => $loanId));
    }
    
    private function _handleDefaultTriggered($loanId) {
        $this->LoanRequest->id = $loanId;
        $this->LoanRequest->saveField('status', 'defaulted');
        $this->LoanRequest->saveField('defaulted_at', date('Y-m-d H:i:s'));
        
        return array('success' => true, 'data' => array('loan_id' => $loanId));
    }
    
    // Escrow handlers
    
    private function _handleEscrowCreated($transactionId, $args) {
        return array('success' => true, 'data' => array('escrow_id' => $transactionId));
    }
    
    private function _handleEscrowFunded($transactionId, $args) {
        $this->EscrowTransaction->id = $transactionId;
        $this->EscrowTransaction->saveField('status', 'funded');
        $this->EscrowTransaction->saveField('funded_at', date('Y-m-d H:i:s'));
        
        return array('success' => true, 'data' => array('escrow_id' => $transactionId));
    }
    
    private function _handleEscrowShipped($transactionId, $args) {
        $this->EscrowTransaction->id = $transactionId;
        $this->EscrowTransaction->saveField('status', 'shipped');
        $this->EscrowTransaction->saveField('shipped_at', date('Y-m-d H:i:s'));
        
        return array('success' => true, 'data' => array('escrow_id' => $transactionId));
    }
    
    private function _handleEscrowDelivered($transactionId) {
        return array('success' => true, 'data' => array('escrow_id' => $transactionId));
    }
    
    private function _handleEscrowReleased($transactionId, $args) {
        $this->EscrowTransaction->id = $transactionId;
        $this->EscrowTransaction->saveField('status', 'released');
        $this->EscrowTransaction->saveField('released_at', date('Y-m-d H:i:s'));
        
        return array('success' => true, 'data' => array('escrow_id' => $transactionId));
    }
    
    private function _handleDisputeOpened($transactionId, $args) {
        $this->EscrowTransaction->id = $transactionId;
        $this->EscrowTransaction->saveField('status', 'disputed');
        $this->EscrowTransaction->saveField('dispute_reason', $args['reason'] ?? '');
        
        return array('success' => true, 'data' => array('escrow_id' => $transactionId));
    }
    
    private function _handleDisputeResolved($transactionId, $args) {
        $resolution = $args['resolution'] ?? 'released';
        
        $this->EscrowTransaction->id = $transactionId;
        $this->EscrowTransaction->saveField('status', $resolution);
        $this->EscrowTransaction->saveField('dispute_resolution', $args['notes'] ?? '');
        
        return array('success' => true, 'data' => array('escrow_id' => $transactionId));
    }
    
    private function _handleEscrowRefunded($transactionId) {
        $this->EscrowTransaction->id = $transactionId;
        $this->EscrowTransaction->saveField('status', 'refunded');
        $this->EscrowTransaction->saveField('refunded_at', date('Y-m-d H:i:s'));
        
        return array('success' => true, 'data' => array('escrow_id' => $transactionId));
    }
    
    /**
     * Check for duplicate event
     */
    private function _isDuplicateEvent($txHash, $logIndex) {
        if (!isset($this->BlockchainEventLog)) {
            App::uses('BlockchainEventLog', 'Model');
            $this->BlockchainEventLog = ClassRegistry::init('BlockchainEventLog');
        }
        
        $existing = $this->BlockchainEventLog->find('first', array(
            'conditions' => array(
                'transaction_hash' => $txHash,
                'log_index' => $logIndex
            )
        ));
        
        return !empty($existing);
    }
    
    /**
     * Generate event hash for deduplication
     */
    private function _generateEventHash($txHash, $logIndex) {
        return md5($txHash . ':' . $logIndex);
    }
    
    /**
     * Log blockchain event
     */
    private function _logBlockchainEvent($contractType, $eventName, $blockNumber, 
        $txHash, $logIndex, $args, $result) {
        
        if (!isset($this->BlockchainEventLog)) {
            App::uses('BlockchainEventLog', 'Model');
            $this->BlockchainEventLog = ClassRegistry::init('BlockchainEventLog');
        }
        
        $this->BlockchainEventLog->create();
        $this->BlockchainEventLog->save(array(
            'contract_type' => $contractType,
            'event_name' => $eventName,
            'block_number' => $blockNumber,
            'transaction_hash' => $txHash,
            'log_index' => $logIndex,
            'event_data' => json_encode($args),
            'processing_result' => json_encode($result),
            'processed' => $result['success'] ? 1 : 0
        ));
    }
    
    /**
     * Get last processed block
     */
    private function _getLastProcessedBlock($contractType) {
        if (!isset($this->BlockchainEventLog)) {
            App::uses('BlockchainEventLog', 'Model');
            $this->BlockchainEventLog = ClassRegistry::init('BlockchainEventLog');
        }
        
        $lastEvent = $this->BlockchainEventLog->find('first', array(
            'conditions' => array('contract_type' => $contractType),
            'order' => array('block_number' => 'DESC')
        ));
        
        return array(
            'block' => $lastEvent ? $lastEvent['BlockchainEventLog']['block_number'] : 0,
            'event' => $lastEvent ? $lastEvent['BlockchainEventLog']['event_name'] : null,
            'timestamp' => $lastEvent ? $lastEvent['BlockchainEventLog']['created_at'] : null
        );
    }
    
    /**
     * Get last sync time
     */
    private function _getLastSyncTime() {
        if (!isset($this->BlockchainEventLog)) {
            App::uses('BlockchainEventLog', 'Model');
            $this->BlockchainEventLog = ClassRegistry::init('BlockchainEventLog');
        }
        
        $lastEvent = $this->BlockchainEventLog->find('first', array(
            'order' => array('created_at' => 'DESC')
        ));
        
        return $lastEvent ? $lastEvent['BlockchainEventLog']['created_at'] : null;
    }
    
    /**
     * Require API key
     */
    private function _requireApiKey() {
        $apiKey = $this->request->header('X-API-Key');
        $expectedKey = Configure::read('blockchain.sync_api_key');
        
        if ($expectedKey && $apiKey !== $expectedKey) {
            return $this->_errorResponse('Invalid API key', 401);
        }
    }
}
