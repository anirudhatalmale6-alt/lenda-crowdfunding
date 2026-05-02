<?php
/**
 * LENDA Blockchain Synchronization Service
 * 
 * Handles synchronization between database and smart contracts
 * Implements event-driven blockchain sync for ARCH-05
 * 
 * @package Lenda
 * @subpackage Lib.Blockchain
 */

App::uses('LendaEventBus', 'Lib.Event');

/**
 * Blockchain Synchronization Service
 */
class LendaBlockchainSync {
    
    /**
     * Singleton instance
     */
    private static $_instance = null;
    
    /**
     * Web3 RPC endpoint
     */
    protected $_rpcEndpoint = null;
    
    /**
     * Contract addresses
     */
    protected $_contractAddresses = array();
    
    /**
     * Sync queue
     */
    protected $_syncQueue = array();
    
    /**
     * Confirmation required
     */
    protected $_confirmations = 12;
    
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
        $this->_rpcEndpoint = Configure::read('Blockchain.rpc_endpoint');
        $this->_contractAddresses = array(
            'LendaLoan' => Configure::read('Contracts.LendaLoan'),
            'ReservePool' => Configure::read('Contracts.ReservePool'),
            'LoanTokenFactory' => Configure::read('Contracts.LoanTokenFactory'),
            'LendaEscrow' => Configure::read('Contracts.LendaEscrow')
        );
        
        // Subscribe to events for blockchain sync
        $this->_registerEventListeners();
    }
    
    /**
     * Register event listeners for blockchain sync
     */
    protected function _registerEventListeners() {
        $bus = LendaEventBus::getInstance();
        
        // Sync loan created to blockchain
        $bus->subscribe(LendaEvent::LOAN_CREATED, array($this, 'syncLoanToBlockchain'), array(
            'priority' => 5,
            'async' => true
        ));
        
        // Sync loan funding to blockchain
        $bus->subscribe(LendaEvent::LOAN_FUNDED, array($this, 'syncFundingToBlockchain'), array(
            'priority' => 5,
            'async' => true
        ));
        
        // Sync payments to blockchain
        $bus->subscribe(LendaEvent::PAYMENT_RECEIVED, array($this, 'syncPaymentToBlockchain'), array(
            'priority' => 5,
            'async' => true
        ));
        
        // Sync collateral events
        $bus->subscribe(LendaEvent::COLLATERAL_DEPOSITED, array($this, 'syncCollateralToBlockchain'), array(
            'priority' => 5,
            'async' => true
        ));
        
        // Sync reserve fund events
        $bus->subscribe(LendaEvent::RESERVE_DEPOSITED, array($this, 'syncReserveToBlockchain'), array(
            'priority' => 5,
            'async' => true
        ));
    }
    
    /**
     * Initialize blockchain sync for a loan
     */
    public function initializeLoanSync($loanId) {
        $this->queueSync('loan_created', 'loan_requests', $loanId);
    }
    
    /**
     * Queue an entity for blockchain sync
     */
    public function queueSync($operation, $entityType, $entityId, $data = array()) {
        $syncEntry = array(
            'operation' => $operation,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'data' => $data,
            'queued_at' => time(),
            'status' => 'pending'
        );
        
        $this->_syncQueue[] = $syncEntry;
        
        // Log to database
        $this->_logSyncEntry($syncEntry);
        
        return $syncEntry;
    }
    
    /**
     * Process sync queue
     */
    public function processQueue($batchSize = 10) {
        $processed = 0;
        
        foreach ($this->_syncQueue as $key => $entry) {
            if ($processed >= $batchSize) {
                break;
            }
            
            if ($entry['status'] === 'pending') {
                try {
                    $this->_processSyncEntry($entry);
                    $this->_syncQueue[$key]['status'] = 'completed';
                    $processed++;
                } catch (Exception $e) {
                    $this->_syncQueue[$key]['status'] = 'failed';
                    $this->_syncQueue[$key]['error'] = $e->getMessage();
                }
            }
        }
        
        return $processed;
    }
    
    /**
     * Process a single sync entry
     */
    protected function _processSyncEntry($entry) {
        switch ($entry['entity_type']) {
            case 'loan_requests':
                return $this->_syncLoan($entry);
            case 'loan_fundings':
                return $this->_syncFunding($entry);
            case 'repayments':
                return $this->_syncRepayment($entry);
            case 'collateral_assets':
                return $this->_syncCollateral($entry);
            case 'reserve_funds':
                return $this->_syncReserveFund($entry);
            default:
                throw new Exception("Unknown entity type: {$entry['entity_type']}");
        }
    }
    
    /**
     * Sync loan to blockchain
     */
    protected function _syncLoan($entry) {
        $loanId = $entry['entity_id'];
        
        // Get loan data from database
        App::uses('LoanRequest', 'Model');
        $LoanRequest = ClassRegistry::init('LoanRequest');
        
        $loan = $LoanRequest->find('first', array(
            'conditions' => array('LoanRequest.id' => $loanId)
        ));
        
        if (!$loan) {
            throw new Exception("Loan not found: {$loanId}");
        }
        
        // Prepare transaction data
        $txData = array(
            'loanAmount' => $loan['LoanRequest']['loan_amount'],
            'interestRate' => $loan['LoanRequest']['interest_rate'],
            'durationMonths' => $loan['LoanRequest']['duration_months'],
            'collateralId' => $loan['LoanRequest']['collateral_id'],
            'principalSplit' => $loan['LoanRequest']['principal_split'] ?? 7000
        );
        
        // Send transaction to blockchain
        $txHash = $this->_sendTransaction('LendaLoan', 'createLoan', $txData);
        
        // Update sync status
        $this->_updateSyncStatus($entry['entity_type'], $loanId, $txHash, 'confirmed');
        
        return $txHash;
    }
    
    /**
     * Sync loan funding to blockchain
     */
    protected function _syncFunding($entry) {
        $fundingId = $entry['entity_id'];
        
        // Get funding data
        App::uses('LoanFunding', 'Model');
        $LoanFunding = ClassRegistry::init('LoanFunding');
        
        $funding = $LoanFunding->find('first', array(
            'conditions' => array('LoanFunding.id' => $fundingId)
        ));
        
        if (!$funding) {
            throw new Exception("Funding not found: {$fundingId}");
        }
        
        // Send transaction
        $txData = array(
            'loanId' => $funding['LoanFunding']['loan_id'],
            'value' => $funding['LoanFunding']['amount']
        );
        
        $txHash = $this->_sendTransaction('LendaLoan', 'fundLoan', $txData);
        
        // Update sync status
        $this->_updateSyncStatus('loan_fundings', $fundingId, $txHash, 'confirmed');
        
        return $txHash;
    }
    
    /**
     * Sync repayment to blockchain
     */
    protected function _syncRepayment($entry) {
        $repaymentId = $entry['entity_id'];
        
        App::uses('Repayment', 'Model');
        $Repayment = ClassRegistry::init('Repayment');
        
        $repayment = $Repayment->find('first', array(
            'conditions' => array('Repayment.id' => $repaymentId)
        ));
        
        $txData = array(
            'loanId' => $repayment['Repayment']['loan_id'],
            'value' => $repayment['Repayment']['amount']
        );
        
        $txHash = $this->_sendTransaction('LendaLoan', 'repayLoan', $txData);
        
        $this->_updateSyncStatus('repayments', $repaymentId, $txHash, 'confirmed');
        
        return $txHash;
    }
    
    /**
     * Sync collateral to blockchain
     */
    protected function _syncCollateral($entry) {
        $collateralId = $entry['entity_id'];
        
        App::uses('CollateralAsset', 'Model');
        $CollateralAsset = ClassRegistry::init('CollateralAsset');
        
        $collateral = $CollateralAsset->find('first', array(
            'conditions' => array('CollateralAsset.id' => $collateralId)
        ));
        
        $txData = array(
            'collateralType' => $collateral['CollateralAsset']['type'],
            'estimatedValue' => $collateral['CollateralAsset']['estimated_value'],
            'documentHash' => $collateral['CollateralAsset']['document_hash']
        );
        
        $txHash = $this->_sendTransaction('LendaLoan', 'depositCollateral', $txData);
        
        $this->_updateSyncStatus('collateral_assets', $collateralId, $txHash, 'confirmed');
        
        return $txHash;
    }
    
    /**
     * Sync reserve fund to blockchain
     */
    protected function _syncReserveFund($entry) {
        $reserveId = $entry['entity_id'];
        
        $txData = array('value' => $entry['data']['amount']);
        $txHash = $this->_sendTransaction('ReservePool', 'depositToPool', $txData);
        
        $this->_updateSyncStatus('reserve_funds', $reserveId, $txHash, 'confirmed');
        
        return $txHash;
    }
    
    /**
     * Send transaction to blockchain
     */
    protected function _sendTransaction($contract, $method, $data) {
        // Check if RPC endpoint is configured
        if (empty($this->_rpcEndpoint)) {
            // Mock transaction for development
            return '0x' . bin2hex(random_bytes(32));
        }
        
        // In production, use Web3.php or similar library
        // This is a placeholder for the actual implementation
        $txHash = '0x' . bin2hex(random_bytes(32));
        
        // Log the transaction
        $this->_logBlockchainTx($contract, $method, $data, $txHash);
        
        // Schedule confirmation check
        $this->_scheduleConfirmationCheck($txHash);
        
        return $txHash;
    }
    
    /**
     * Log blockchain transaction
     */
    protected function _logBlockchainTx($contract, $method, $data, $txHash) {
        App::uses('BlockchainSyncLog', 'Model');
        $BlockchainSyncLog = ClassRegistry::init('BlockchainSyncLog');
        
        $BlockchainSyncLog->create();
        $BlockchainSyncLog->save(array(
            'entity_type' => $contract,
            'entity_id' => 0,
            'operation' => $method,
            'tx_hash' => $txHash,
            'payload' => json_encode($data),
            'status' => 'pending',
            'created_at' => date('Y-m-d H:i:s')
        ));
    }
    
    /**
     * Update sync status in database
     */
    protected function _updateSyncStatus($entityType, $entityId, $txHash, $status) {
        // Update the main entity
        $modelName = $this->_getModelName($entityType);
        
        if ($modelName) {
            App::uses($modelName, 'Model');
            $Model = ClassRegistry::init($modelName);
            
            $Model->id = $entityId;
            $Model->saveField('blockchain_synced', true);
            $Model->saveField('blockchain_tx_hash', $txHash);
            
            if ($status === 'confirmed') {
                $Model->saveField('blockchain_confirmed_at', date('Y-m-d H:i:s'));
            }
        }
        
        // Update sync log
        App::uses('BlockchainSyncLog', 'Model');
        $BlockchainSyncLog = ClassRegistry::init('BlockchainSyncLog');
        
        $BlockchainSyncLog->updateAll(
            array(
                'status' => "'" . $status . "'",
                'confirmed_at' => $status === 'confirmed' ? "'" . date('Y-m-d H:i:s') . "'" : 'confirmed_at'
            ),
            array('tx_hash' => $txHash)
        );
    }
    
    /**
     * Get model name from entity type
     */
    protected function _getModelName($entityType) {
        $mapping = array(
            'loan_requests' => 'LoanRequest',
            'loan_fundings' => 'LoanFunding',
            'repayments' => 'Repayment',
            'collateral_assets' => 'CollateralAsset',
            'reserve_funds' => 'ReserveFund'
        );
        
        return isset($mapping[$entityType]) ? $mapping[$entityType] : null;
    }
    
    /**
     * Log sync entry to database
     */
    protected function _logSyncEntry($entry) {
        App::uses('BlockchainSyncLog', 'Model');
        $BlockchainSyncLog = ClassRegistry::init('BlockchainSyncLog');
        
        $BlockchainSyncLog->create();
        $BlockchainSyncLog->save(array(
            'entity_type' => $entry['entity_type'],
            'entity_id' => $entry['entity_id'],
            'operation' => $entry['operation'],
            'status' => 'pending',
            'created_at' => date('Y-m-d H:i:s')
        ));
    }
    
    /**
     * Schedule confirmation check
     */
    protected function _scheduleConfirmationCheck($txHash) {
        // In production, use a job queue (Beanstalkd, RabbitMQ, etc.)
        // For now, we'll use a simple approach
        App::uses('CakeResque', 'Vendor');
        
        // Example: Resque::enqueue('default', 'BlockchainConfirmJob', array($txHash));
    }
    
    /**
     * Check transaction confirmation
     */
    public function checkConfirmation($txHash) {
        // Call blockchain to check confirmation count
        // Return true if confirmed, false otherwise
        return true; // Placeholder
    }
    
    /**
     * Get sync status for an entity
     */
    public function getSyncStatus($entityType, $entityId) {
        App::uses('BlockchainSyncLog', 'Model');
        $BlockchainSyncLog = ClassRegistry::init('BlockchainSyncLog');
        
        $sync = $BlockchainSyncLog->find('first', array(
            'conditions' => array(
                'entity_type' => $entityType,
                'entity_id' => $entityId
            ),
            'order' => array('created_at' => 'DESC')
        ));
        
        return $sync ? $sync['BlockchainSyncLog'] : null;
    }
    
    /**
     * Get pending sync count
     */
    public function getPendingCount() {
        $pending = 0;
        foreach ($this->_syncQueue as $entry) {
            if ($entry['status'] === 'pending') {
                $pending++;
            }
        }
        return $pending;
    }
    
    /**
     * Event handlers for automatic sync
     */
    
    /**
     * Sync loan to blockchain
     */
    public function syncLoanToBlockchain($data) {
        $this->queueSync('create', 'loan_requests', $data['loan_id'], $data);
    }
    
    /**
     * Sync funding to blockchain
     */
    public function syncFundingToBlockchain($data) {
        $this->queueSync('fund', 'loan_fundings', $data['funding_id'], $data);
    }
    
    /**
     * Sync payment to blockchain
     */
    public function syncPaymentToBlockchain($data) {
        $this->queueSync('repay', 'repayments', $data['repayment_id'], $data);
    }
    
    /**
     * Sync collateral to blockchain
     */
    public function syncCollateralToBlockchain($data) {
        $this->queueSync('deposit', 'collateral_assets', $data['collateral_id'], $data);
    }
    
    /**
     * Sync reserve to blockchain
     */
    public function syncReserveToBlockchain($data) {
        $this->queueSync('deposit', 'reserve_funds', $data['reserve_id'], $data);
    }
}
