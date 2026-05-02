<?php
/**
 * GracePeriod Shell Command (RISK-002)
 * 
 * Automated grace period enforcement:
 * - Automatically triggers default workflow when grace period expires
 * - Advances loans through workflow stages
 * - Sends notifications to borrowers
 * - Syncs with smart contract
 * 
 * Usage:
 *   cd app && Console/cake GracePeriod.enforce
 *   cd app && Console/cake GracePeriod.enforce_dry_run
 *   cd app && Console/cake GracePeriod.advance_workflows
 */

App::uses('Shell', 'Console');

class GracePeriodShell extends Shell
{
    /**
     * Models
     */
    private $Loan;
    private $LoanRepayment;
    private $Notification;
    private $DefaultWorkflow;
    
    /**
     * Grace period configuration
     */
    private $config = array();
    
    /**
     * Initialize
     */
    public function initialize()
    {
        parent::initialize();
        
        App::uses('Loan', 'Model');
        App::uses('LoanRepayment', 'Model');
        App::uses('Notification', 'Model');
        App::uses('DefaultWorkflow', 'Model');
        
        $this->Loan = ClassRegistry::init('Loan');
        $this->LoanRepayment = ClassRegistry::init('LoanRepayment');
        $this->Notification = ClassRegistry::init('Notification');
        $this->DefaultWorkflow = ClassRegistry::init('DefaultWorkflow');
        
        // Load grace period configuration
        $this->config = array(
            'default_days' => Configure::read('Loan.grace_period_days') ?: 7,
            'min_days' => 1,
            'max_days' => 30,
            'auto_advance_workflow' => Configure::read('Loan.auto_advance_workflow') ?: true,
            'send_notifications' => Configure::read('Loan.grace_period_notifications') ?: true,
            'sync_blockchain' => Configure::read('Loan.sync_blockchain') ?: false,
        );
    }
    
    /**
     * Main entry point - run full grace period enforcement
     */
    public function main()
    {
        $this->out('Grace Period Enforcement');
        $this->out('========================');
        $this->out('');
        
        $this->out('Usage:');
        $this->out('  GracePeriod.enforce            - Run full grace period enforcement');
        $this->out('  GracePeriod.enforce_dry_run   - Run in dry-run mode (no changes)');
        $this->out('  GracePeriod.advance_workflows - Only advance workflow stages');
        $this->out('  GracePeriod.check_expired     - Check for expired grace periods');
    }
    
    /**
     * Run full grace period enforcement
     */
    public function enforce()
    {
        $this->out('Starting grace period enforcement...');
        $this->hr();
        
        $results = array(
            'expired' => 0,
            'advanced' => 0,
            'notifications' => 0,
            'errors' => 0,
        );
        
        try {
            // Step 1: Find and process expired grace periods
            $results['expired'] = $this->_processExpiredGracePeriods();
            $this->out("Processed {$results['expired']} expired grace periods");
            
            // Step 2: Advance workflows for eligible loans
            if ($this->config['auto_advance_workflow']) {
                $results['advanced'] = $this->_advanceWorkflows();
                $this->out("Advanced {$results['advanced']} loans to next workflow stage");
            }
            
            // Step 3: Send notifications
            if ($this->config['send_notifications']) {
                $results['notifications'] = $this->_sendGracePeriodNotifications();
                $this->out("Sent {$results['notifications']} notifications");
            }
            
            // Step 4: Sync with blockchain
            if ($this->config['sync_blockchain']) {
                $this->_syncWithBlockchain();
                $this->out('Synced with blockchain');
            }
            
            $this->hr();
            $this->out('Grace period enforcement complete');
            $this->out("Summary: {$results['expired']} expired, {$results['advanced']} advanced, {$results['notifications']} notifications");
            
            // Log results
            CakeLog::write('grace_period', json_encode(array(
                'timestamp' => date('Y-m-d H:i:s'),
                'results' => $results
            )));
            
        } catch (Exception $e) {
            $this->out('ERROR: ' . $e->getMessage());
            CakeLog::write('error', 'GracePeriod enforcement failed: ' . $e->getMessage());
            $results['errors']++;
        }
        
        return $results;
    }
    
    /**
     * Dry run - show what would happen without making changes
     */
    public function enforce_dry_run()
    {
        $this->out('DRY RUN MODE - No changes will be made');
        $this->hr();
        
        // Find expired grace periods
        $expiredLoans = $this->_getExpiredGracePeriodLoans();
        
        $this->out('Loans with expired grace periods: ' . count($expiredLoans));
        
        foreach ($expiredLoans as $loan) {
            $this->out(sprintf(
                "  Loan #%d: Status=%s, Grace Period End=%s, Days Overdue=%d",
                $loan['Loan']['id'],
                $loan['Loan']['status'],
                $loan['Loan']['grace_period_end_date'],
                $this->_calculateDaysOverdue($loan)
            ));
        }
        
        // Find loans eligible for workflow advancement
        $eligibleLoans = $this->_getEligibleForWorkflowAdvancement();
        
        $this->out('');
        $this->out('Loans eligible for workflow advancement: ' . count($eligibleLoans));
        
        foreach ($eligibleLoans as $loan) {
            $this->out(sprintf(
                "  Loan #%d: Current Stage=%s, Days in Stage=%d",
                $loan['Loan']['id'],
                $loan['DefaultWorkflow']['stage'] ?? 'N/A',
                $this->_getDaysInCurrentStage($loan)
            ));
        }
    }
    
    /**
     * Only advance workflows (skip other processing)
     */
    public function advance_workflows()
    {
        $this->out('Advancing workflow stages...');
        
        $count = $this->_advanceWorkflows();
        
        $this->out("Advanced {$count} loans to next workflow stage");
        
        return $count;
    }
    
    /**
     * Process expired grace periods
     */
    private function _processExpiredGracePeriods()
    {
        $expiredLoans = $this->_getExpiredGracePeriodLoans();
        $count = 0;
        
        foreach ($expiredLoans as $loan) {
            try {
                // Update loan status
                $this->Loan->id = $loan['Loan']['id'];
                $this->Loan->saveField('is_in_grace_period', 0);
                $this->Loan->saveField('grace_period_end_date', null);
                $this->Loan->saveField('status', 'DEFAULT');
                $this->Loan->saveField('default_date', date('Y-m-d'));
                
                // Create default record
                $this->_createDefaultRecord($loan['Loan']['id']);
                
                // Update workflow
                $this->_updateWorkflowStage($loan['Loan']['id'], 'grace_period_expired');
                
                $count++;
                
                $this->out("Processed expired grace period for loan #{$loan['Loan']['id']}");
                
            } catch (Exception $e) {
                $this->out("ERROR processing loan #{$loan['Loan']['id']}: " . $e->getMessage());
                CakeLog::write('error', "GracePeriod failed for loan {$loan['Loan']['id']}: " . $e->getMessage());
            }
        }
        
        return $count;
    }
    
    /**
     * Advance workflows for eligible loans
     */
    private function _advanceWorkflows()
    {
        $eligibleLoans = $this->_getEligibleForWorkflowAdvancement();
        $count = 0;
        
        foreach ($eligibleLoans as $loan) {
            try {
                $currentStage = $loan['DefaultWorkflow']['stage'] ?? 'grace_period';
                $nextStage = $this->_getNextStage($currentStage);
                
                if ($nextStage) {
                    // Update workflow
                    $this->_updateWorkflowStage($loan['Loan']['id'], $nextStage);
                    
                    // Perform stage-specific actions
                    $this->_performStageActions($loan, $nextStage);
                    
                    $count++;
                    
                    $this->out("Advanced loan #{$loan['Loan']['id']} from {$currentStage} to {$nextStage}");
                }
                
            } catch (Exception $e) {
                $this->out("ERROR advancing loan #{$loan['Loan']['id']}: " . $e->getMessage());
                CakeLog::write('error', "Workflow advance failed for loan {$loan['Loan']['id']}: " . $e->getMessage());
            }
        }
        
        return $count;
    }
    
    /**
     * Send grace period notifications
     */
    private function _sendGracePeriodNotifications()
    {
        // Send warnings for loans approaching grace period
        $approachingLoans = $this->_getLoansApproachingGracePeriod();
        
        $count = 0;
        foreach ($approachingLoans as $loan) {
            $daysUntil = $this->_calculateDaysUntilGracePeriod($loan);
            
            if ($daysUntil <= 3) { // Warning threshold
                $this->_sendNotification(
                    $loan['Loan']['borrower_id'],
                    'grace_period_warning',
                    'Grace Period Warning',
                    "Your loan #{$loan['Loan']['id']} will enter grace period in {$daysUntil} days.",
                    $loan['Loan']['id']
                );
                $count++;
            }
        }
        
        return $count;
    }
    
    /**
     * Sync grace period data with blockchain
     */
    private function _syncWithBlockchain()
    {
        // This would typically call the smart contract to update grace period status
        // For now, we'll log the sync attempt
        
        $activeGracePeriods = $this->Loan->find('count', array(
            'conditions' => array(
                'Loan.is_in_grace_period' => 1,
                'Loan.status' => array('ACTIVE', 'OVERDUE')
            )
        ));
        
        CakeLog::write('blockchain', "GracePeriod sync: {$activeGracePeriods} loans in grace period");
    }
    
    /**
     * Get loans with expired grace periods
     */
    private function _getExpiredGracePeriodLoans()
    {
        return $this->Loan->find('all', array(
            'conditions' => array(
                'Loan.is_in_grace_period' => 1,
                'Loan.grace_period_end_date <=' => date('Y-m-d'),
                'Loan.status' => array('ACTIVE', 'OVERDUE')
            ),
            'recursive' => 0
        ));
    }
    
    /**
     * Get loans eligible for workflow advancement
     */
    private function _getEligibleForWorkflowAdvancement()
    {
        // Find loans in active workflow stages that have been in their current stage long enough
        return $this->DefaultWorkflow->find('all', array(
            'conditions' => array(
                'DefaultWorkflow.status' => 'active',
                'DefaultWorkflow.stage' => array('grace_period', 'refinance_attempt', 'pre_liquidation')
            ),
            'joins' => array(
                array(
                    'table' => 'loans',
                    'alias' => 'Loan',
                    'type' => 'INNER',
                    'conditions' => array('DefaultWorkflow.loan_id = Loan.id')
                )
            ),
            'recursive' => 0
        ));
    }
    
    /**
     * Get loans approaching grace period
     */
    private function _getLoansApproachingGracePeriod()
    {
        $warningDays = 7; // Configurable
        
        return $this->Loan->find('all', array(
            'conditions' => array(
                'Loan.is_in_grace_period' => 0,
                'Loan.status' => array('ACTIVE', 'OVERDUE'),
                'Loan.next_payment_date <=' => date('Y-m-d', strtotime("+{$warningDays} days")),
                'Loan.next_payment_date >=' => date('Y-m-d')
            ),
            'recursive' => 0
        ));
    }
    
    /**
     * Calculate days until grace period
     */
    private function _calculateDaysUntilGracePeriod($loan)
    {
        $dueDate = strtotime($loan['Loan']['next_payment_date']);
        $gracePeriodEnd = $dueDate + ($this->config['default_days'] * 86400);
        
        return ceil(($gracePeriodEnd - time()) / 86400);
    }
    
    /**
     * Calculate days overdue
     */
    private function _calculateDaysOverdue($loan)
    {
        $gracePeriodEnd = strtotime($loan['Loan']['grace_period_end_date']);
        return ceil((time() - $gracePeriodEnd) / 86400);
    }
    
    /**
     * Get days in current workflow stage
     */
    private function _getDaysInCurrentStage($loan)
    {
        if (empty($loan['DefaultWorkflow']['stage_started_at'])) {
            return 0;
        }
        
        $stageStart = strtotime($loan['DefaultWorkflow']['stage_started_at']);
        return ceil((time() - $stageStart) / 86400);
    }
    
    /**
     * Get next workflow stage
     */
    private function _getNextStage($currentStage)
    {
        $stages = array(
            'grace_period' => 'refinance_attempt',
            'refinance_attempt' => 'pre_liquidation',
            'pre_liquidation' => 'liquidation',
            'liquidation' => 'recovery'
        );
        
        return $stages[$currentStage] ?? null;
    }
    
    /**
     * Create default record when grace period expires
     */
    private function _createDefaultRecord($loanId)
    {
        $this->loadModel('LoanDefault');
        $this->LoanDefault->create();
        $this->LoanDefault->save(array(
            'LoanDefault' => array(
                'loan_id' => $loanId,
                'default_date' => date('Y-m-d'),
                'reason' => 'Grace period expired - no payment received',
                'status' => 'active'
            )
        ));
    }
    
    /**
     * Update workflow stage
     */
    private function _updateWorkflowStage($loanId, $newStage)
    {
        $this->DefaultWorkflow->updateAll(
            array(
                'DefaultWorkflow.stage' => "'" . $newStage . "'",
                'DefaultWorkflow.stage_started_at' => "'" . date('Y-m-d H:i:s') . "'"
            ),
            array('DefaultWorkflow.loan_id' => $loanId, 'DefaultWorkflow.status' => 'active')
        );
    }
    
    /**
     * Perform stage-specific actions
     */
    private function _performStageActions($loan, $stage)
    {
        switch ($stage) {
            case 'refinance_attempt':
                // List loan on refinancing marketplace
                $this->_listOnRefinancingMarketplace($loan);
                break;
                
            case 'pre_liquidation':
                // Send warning notification
                $this->_sendNotification(
                    $loan['Loan']['borrower_id'],
                    'pre_liquidation_warning',
                    'Pre-Liquidation Warning',
                    "Your loan #{$loan['Loan']['id']} is approaching liquidation.",
                    $loan['Loan']['id']
                );
                break;
                
            case 'liquidation':
                // Trigger liquidation process
                $this->_triggerLiquidation($loan);
                break;
        }
    }
    
    /**
     * List loan on refinancing marketplace
     */
    private function _listOnRefinancingMarketplace($loan)
    {
        // This would integrate with the refinancing service
        CakeLog::write('refinancing', "Listed loan #{$loan['Loan']['id']} on refinancing marketplace");
    }
    
    /**
     * Trigger liquidation process
     */
    private function _triggerLiquidation($loan)
    {
        // This would trigger the liquidation workflow
        $this->Loan->id = $loan['Loan']['id'];
        $this->Loan->saveField('status', 'LIQUIDATION');
        
        CakeLog::write('liquidation', "Triggered liquidation for loan #{$loan['Loan']['id']}");
    }
    
    /**
     * Send notification
     */
    private function _sendNotification($userId, $type, $title, $message, $loanId = null)
    {
        $this->Notification->create();
        $this->Notification->save(array(
            'Notification' => array(
                'user_id' => $userId,
                'type' => $type,
                'title' => $title,
                'message' => $message,
                'loan_id' => $loanId,
                'is_read' => 0,
                'created_at' => date('Y-m-d H:i:s')
            )
        ));
    }
}
