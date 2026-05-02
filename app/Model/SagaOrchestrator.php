<?php
App::uses('AppModel', 'Model');

/**
 * SagaOrchestrator Model
 * 
 * Implements saga pattern for distributed transactions between
 * on-chain (blockchain) and off-chain (database) state.
 * 
 * Handles:
 * - Saga creation and coordination
 * - Step execution with compensation
 * - Distributed transaction state management
 * - On-chain/off-chain reconciliation
 * 
 * @property SagaStep $SagaStep
 */
class SagaOrchestrator extends AppModel {
    public $name = 'SagaOrchestrator';
    public $useTable = 'saga_orchestrations';
    
    // Saga statuses
    const STATUS_PENDING = 'pending';
    const STATUS_RUNNING = 'running';
    const STATUS_COMPLETED = 'completed';
    const STATUS_COMPENSATING = 'compensating';
    const STATUS_FAILED = 'failed';
    const STATUS_PARTIALLY_COMPLETED = 'partially_completed';
    
    // Step statuses
    const STEP_STATUS_PENDING = 'pending';
    const STEP_STATUS_RUNNING = 'running';
    const STEP_STATUS_COMPLETED = 'completed';
    const STEP_STATUS_FAILED = 'failed';
    const STEP_STATUS_COMPENSATED = 'compensated';
    const STEP_STATUS_COMPENSATION_FAILED = 'compensation_failed';
    
    /**
     * Create a new saga for a distributed transaction
     * 
     * @param string $sagaType Type of saga (e.g., 'loan_funding', 'loan_repayment')
     * @param array $metadata Additional metadata
     * @return int|false Saga ID
     */
    public function createSaga($sagaType, $metadata = array()) {
        $this->create();
        $result = $this->save(array(
            'saga_type' => $sagaType,
            'status' => self::STATUS_PENDING,
            'metadata' => json_encode($metadata),
            'started_at' => null,
            'completed_at' => null
        ));
        
        if ($result) {
            return $this->getLastInsertID();
        }
        
        return false;
    }
    
    /**
     * Execute a saga with all its steps
     * 
     * @param int $sagaId Saga ID
     * @param array $steps Array of step definitions
     * @return array Result with success status and details
     */
    public function executeSaga($sagaId, $steps) {
        $saga = $this->findById($sagaId);
        if (!$saga) {
            return array('success' => false, 'error' => 'Saga not found');
        }
        
        // Update saga status to running
        $this->id = $sagaId;
        $this->saveField('status', self::STATUS_RUNNING);
        $this->saveField('started_at', date('Y-m-d H:i:s'));
        
        $completedSteps = array();
        $failedStep = null;
        
        // Execute each step sequentially
        foreach ($steps as $index => $step) {
            $stepResult = $this->executeStep($sagaId, $index, $step);
            
            if (!$stepResult['success']) {
                $failedStep = array(
                    'index' => $index,
                    'step' => $step,
                    'error' => $stepResult['error']
                );
                break;
            }
            
            $completedSteps[] = array(
                'index' => $index,
                'step' => $step,
                'result' => $stepResult
            );
        }
        
        // Handle failure - start compensation
        if ($failedStep !== null) {
            $compensationResult = $this->compensate($sagaId, $completedSteps);
            
            $this->id = $sagaId;
            if ($compensationResult['success']) {
                $this->saveField('status', self::STATUS_COMPENSATING);
            } else {
                $this->saveField('status', self::STATUS_FAILED);
            }
            
            $this->saveField('completed_at', date('Y-m-d H:i:s'));
            $this->saveField('error_message', json_encode(array(
                'failed_step' => $failedStep,
                'compensation' => $compensationResult
            )));
            
            return array(
                'success' => false,
                'saga_id' => $sagaId,
                'failed_step' => $failedStep['index'],
                'compensation' => $compensationResult
            );
        }
        
        // All steps completed successfully
        $this->id = $sagaId;
        $this->saveField('status', self::STATUS_COMPLETED);
        $this->saveField('completed_at', date('Y-m-d H:i:s'));
        
        return array(
            'success' => true,
            'saga_id' => $sagaId,
            'completed_steps' => count($completedSteps)
        );
    }
    
    /**
     * Execute a single saga step
     * 
     * @param int $sagaId Saga ID
     * @param int $stepIndex Step index
     * @param array $step Step definition
     * @return array Result
     */
    private function executeStep($sagaId, $stepIndex, $step) {
        // Record step start
        $this->_recordStep($sagaId, $stepIndex, $step, self::STEP_STATUS_RUNNING);
        
        try {
            // Execute the step action
            $action = $step['action'];
            $params = $step['params'] ?? array();
            
            $result = call_user_func($action, $params);
            
            // Check if step succeeded
            if (isset($result['success']) && !$result['success']) {
                throw new Exception($result['error'] ?? 'Step failed');
            }
            
            // Record step completion
            $this->_recordStep($sagaId, $stepIndex, $step, self::STEP_STATUS_COMPLETED, $result);
            
            return array(
                'success' => true,
                'result' => $result
            );
            
        } catch (Exception $e) {
            // Record step failure
            $this->_recordStep($sagaId, $stepIndex, $step, self::STEP_STATUS_FAILED, null, $e->getMessage());
            
            return array(
                'success' => false,
                'error' => $e->getMessage()
            );
        }
    }
    
    /**
     * Compensate completed steps (rollback)
     * 
     * @param int $sagaId Saga ID
     * @param array $completedSteps Steps to compensate
     * @return array Compensation result
     */
    private function compensate($sagaId, $completedSteps) {
        $compensationResults = array();
        
        // Reverse order compensation
        for ($i = count($completedSteps) - 1; $i >= 0; $i--) {
            $step = $completedSteps[$i]['step'];
            
            // Skip if no compensation action
            if (!isset($step['compensation'])) {
                continue;
            }
            
            try {
                $compensation = $step['compensation'];
                $params = $step['compensation_params'] ?? array();
                
                $result = call_user_func($compensation, $params);
                
                $compensationResults[] = array(
                    'step_index' => $i,
                    'success' => true,
                    'result' => $result
                );
                
                // Update step status
                $this->_updateStepStatus($sagaId, $i, self::STEP_STATUS_COMPENSATED);
                
            } catch (Exception $e) {
                $compensationResults[] = array(
                    'step_index' => $i,
                    'success' => false,
                    'error' => $e->getMessage()
                );
                
                // Update step status
                $this->_updateStepStatus($sagaId, $i, self::STEP_STATUS_COMPENSATION_FAILED);
            }
        }
        
        $allCompensated = !in_array(false, array_column($compensationResults, 'success'));
        
        return array(
            'success' => $allCompensated,
            'results' => $compensationResults
        );
    }
    
    /**
     * Record a saga step
     */
    private function _recordStep($sagaId, $stepIndex, $step, $status, $result = null, $error = null) {
        App::uses('SagaStep', 'Model');
        $SagaStep = ClassRegistry::init('SagaStep');
        
        $SagaStep->create();
        $SagaStep->save(array(
            'saga_id' => $sagaId,
            'step_index' => $stepIndex,
            'step_name' => $step['name'] ?? 'step_' . $stepIndex,
            'step_type' => $step['type'] ?? 'database', // 'database', 'blockchain', 'api'
            'status' => $status,
            'request_data' => json_encode($step['params'] ?? array()),
            'response_data' => json_encode($result),
            'error_message' => $error,
            'started_at' => $status === self::STEP_STATUS_RUNNING ? date('Y-m-d H:i:s') : null,
            'completed_at' => in_array($status, array(self::STEP_STATUS_COMPLETED, self::STEP_STATUS_COMPENSATED)) ? date('Y-m-d H:i:s') : null
        ));
    }
    
    /**
     * Update step status
     */
    private function _updateStepStatus($sagaId, $stepIndex, $status) {
        App::uses('SagaStep', 'Model');
        $SagaStep = ClassRegistry::init('SagaStep');
        
        $step = $SagaStep->find('first', array(
            'conditions' => array(
                'SagaStep.saga_id' => $sagaId,
                'SagaStep.step_index' => $stepIndex
            )
        ));
        
        if ($step) {
            $SagaStep->id = $step['SagaStep']['id'];
            $SagaStep->saveField('status', $status);
            if (in_array($status, array(self::STEP_STATUS_COMPENSATED, self::STEP_STATUS_COMPENSATION_FAILED))) {
                $SagaStep->saveField('completed_at', date('Y-m-d H:i:s'));
            }
        }
    }
    
    /**
     * Execute a loan funding saga (on-chain + off-chain)
     * 
     * @param int $loanId Loan ID
     * @param int $lenderId Lender ID
     * @param float $amount Funding amount
     * @return array Result
     */
    public function executeLoanFundingSaga($loanId, $lenderId, $amount) {
        $metadata = array(
            'loan_id' => $loanId,
            'lender_id' => $lenderId,
            'amount' => $amount
        );
        
        $sagaId = $this->createSaga('loan_funding', $metadata);
        if (!$sagaId) {
            return array('success' => false, 'error' => 'Failed to create saga');
        }
        
        $steps = array(
            // Step 1: Validate and reserve funds (database)
            array(
                'name' => 'validate_and_reserve_funds',
                'type' => 'database',
                'action' => function($params) {
                    App::uses('WalletAccount', 'Model');
                    $WalletAccount = ClassRegistry::init('WalletAccount');
                    
                    $wallet = $WalletAccount->find('first', array(
                        'conditions' => array(
                            'WalletAccount.user_id' => $params['lender_id'],
                            'WalletAccount.type' => 'main'
                        )
                    ));
                    
                    if (!$wallet) {
                        return array('success' => false, 'error' => 'Wallet not found');
                    }
                    
                    if (floatval($wallet['WalletAccount']['balance']) < $params['amount']) {
                        return array('success' => false, 'error' => 'Insufficient balance');
                    }
                    
                    // Reserve funds
                    $WalletAccount->id = $wallet['WalletAccount']['id'];
                    $WalletAccount->saveField('balance', floatval($wallet['WalletAccount']['balance']) - $params['amount']);
                    $WalletAccount->saveField('locked_balance', floatval($wallet['WalletAccount']['locked_balance']) + $params['amount']);
                    
                    return array('success' => true, 'wallet_id' => $wallet['WalletAccount']['id']);
                },
                'params' => compact('lenderId', 'amount'),
                'compensation' => function($params) {
                    // Release reserved funds
                    App::uses('WalletAccount', 'Model');
                    $WalletAccount = ClassRegistry::init('WalletAccount');
                    
                    $wallet = $WalletAccount->findById($params['wallet_id']);
                    if ($wallet) {
                        $WalletAccount->id = $wallet['WalletAccount']['id'];
                        $WalletAccount->saveField('balance', floatval($wallet['WalletAccount']['balance']) + $params['amount']);
                        $WalletAccount->saveField('locked_balance', floatval($wallet['WalletAccount']['locked_balance']) - $params['amount']);
                    }
                    
                    return array('success' => true);
                },
                'compensation_params' => array()
            ),
            
            // Step 2: Execute blockchain transaction
            array(
                'name' => 'execute_blockchain_transaction',
                'type' => 'blockchain',
                'action' => function($params) {
                    // In production, this would call the blockchain contract
                    // For now, simulate a successful transaction
                    $txHash = '0x' . hash('sha256', uniqid('loan_funding_', true));
                    
                    return array(
                        'success' => true,
                        'tx_hash' => $txHash,
                        'block_number' => rand(1000000, 9999999)
                    );
                },
                'params' => compact('loanId', 'lenderId', 'amount')
            ),
            
            // Step 3: Record on-chain confirmation (database)
            array(
                'name' => 'record_onchain_confirmation',
                'type' => 'database',
                'action' => function($params) {
                    App::uses('LoanFunding', 'Model');
                    $LoanFunding = ClassRegistry::init('LoanFunding');
                    
                    $LoanFunding->create();
                    $result = $LoanFunding->save(array(
                        'loan_id' => $params['loanId'],
                        'lender_id' => $params['lenderId'],
                        'amount' => $params['amount'],
                        'status' => 'active',
                        'blockchain_tx_hash' => $params['txHash'] ?? null
                    ));
                    
                    if (!$result) {
                        return array('success' => false, 'error' => 'Failed to record funding');
                    }
                    
                    return array(
                        'success' => true,
                        'funding_id' => $LoanFunding->getLastInsertID()
                    );
                },
                'params' => array_merge(compact('loanId', 'lenderId', 'amount'), array('txHash' => 'simulated'))
            ),
            
            // Step 4: Finalize - release lock and complete
            array(
                'name' => 'finalize_funding',
                'type' => 'database',
                'action' => function($params) {
                    App::uses('WalletAccount', 'Model');
                    $WalletAccount = ClassRegistry::init('WalletAccount');
                    
                    // Release lock
                    $wallet = $WalletAccount->findById($params['wallet_id']);
                    if ($wallet) {
                        $WalletAccount->id = $wallet['WalletAccount']['id'];
                        $WalletAccount->saveField('locked_balance', floatval($wallet['WalletAccount']['locked_balance']) - $params['amount']);
                    }
                    
                    // Update loan funded amount
                    App::uses('LoanRequest', 'Model');
                    $LoanRequest = ClassRegistry::init('LoanRequest');
                    
                    $loan = $LoanRequest->findById($params['loanId']);
                    if ($loan) {
                        $newFunded = floatval($loan['LoanRequest']['funded_amount']) + $params['amount'];
                        $LoanRequest->id = $params['loanId'];
                        $LoanRequest->saveField('funded_amount', $newFunded);
                        
                        if ($newFunded >= floatval($loan['LoanRequest']['loan_amount'])) {
                            $LoanRequest->saveField('status', 'funded');
                            $LoanRequest->saveField('funded_at', date('Y-m-d H:i:s'));
                        }
                    }
                    
                    return array('success' => true);
                },
                'params' => array('loanId' => $loanId, 'lenderId' => $lenderId, 'amount' => $amount)
            )
        );
        
        return $this->executeSaga($sagaId, $steps);
    }
    
    /**
     * Get saga status and details
     * 
     * @param int $sagaId Saga ID
     * @return array Saga details
     */
    public function getSagaStatus($sagaId) {
        $saga = $this->findById($sagaId);
        if (!$saga) {
            return array('error' => 'Saga not found');
        }
        
        App::uses('SagaStep', 'Model');
        $SagaStep = ClassRegistry::init('SagaStep');
        
        $steps = $SagaStep->find('all', array(
            'conditions' => array('SagaStep.saga_id' => $sagaId),
            'order' => array('SagaStep.step_index' => 'ASC')
        ));
        
        return array(
            'saga_id' => $sagaId,
            'saga_type' => $saga['SagaOrchestrator']['saga_type'],
            'status' => $saga['SagaOrchestrator']['status'],
            'metadata' => json_decode($saga['SagaOrchestrator']['metadata'], true),
            'started_at' => $saga['SagaOrchestrator']['started_at'],
            'completed_at' => $saga['SagaOrchestrator']['completed_at'],
            'error_message' => $saga['SagaOrchestrator']['error_message'],
            'steps' => $steps
        );
    }
    
    /**
     * Retry a failed saga
     * 
     * @param int $sagaId Saga ID
     * @return array Result
     */
    public function retrySaga($sagaId) {
        $saga = $this->findById($sagaId);
        if (!$saga) {
            return array('success' => false, 'error' => 'Saga not found');
        }
        
        if (!in_array($saga['SagaOrchestrator']['status'], array(self::STATUS_FAILED, self::STATUS_PARTIALLY_COMPLETED))) {
            return array('success' => false, 'error' => 'Saga cannot be retried in current status');
        }
        
        // Reset saga status
        $this->id = $sagaId;
        $this->saveField('status', self::STATUS_PENDING);
        $this->saveField('error_message', null);
        
        // Reset step statuses
        App::uses('SagaStep', 'Model');
        $SagaStep = ClassRegistry::init('SagaStep');
        
        $SagaStep->updateAll(
            array('SagaStep.status' => "'" . self::STEP_STATUS_PENDING . "'"),
            array('SagaStep.saga_id' => $sagaId)
        );
        
        return array('success' => true, 'message' => 'Saga reset for retry');
    }
    
    /**
     * Get pending sagas for monitoring
     * 
     * @param int $limit Number of sagas to return
     * @return array Pending sagas
     */
    public function getPendingSagas($limit = 50) {
        return $this->find('all', array(
            'conditions' => array(
                'SagaOrchestrator.status' => array(self::STATUS_RUNNING, self::STATUS_COMPENSATING)
            ),
            'order' => array('SagaOrchestrator.started_at' => 'ASC'),
            'limit' => $limit
        ));
    }
}
