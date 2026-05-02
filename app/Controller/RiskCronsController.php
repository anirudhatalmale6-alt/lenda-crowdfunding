<?php
/**
 * Risk Cron Controller
 * 
 * Handles all cron-based risk management tasks:
 * - RISK-02: Grace period notifications
 * - RISK-07: Price oracle for liquidation valuation
 * - RISK-14: Real-time default probability webhook triggers
 * - RISK-15: Automatic watchlist updates
 * 
 * @package    Lenda
 * @subpackage Controller
 */
App::uses('AppController', 'Controller');

class RiskCronsController extends AppController
{
    public $name = 'RiskCrons';
    public $uses = array('Loan', 'User', 'Notification', 'Collateral', 'RiskWatchlist', 'LoanRisk');
    public $components = array('Email', 'Queue'); // Queue component for async processing
    
    /**
     * Grace Period Notifications Cron Job (RISK-02)
     * Runs daily to check and notify users of approaching grace periods
     * 
     * @url /api/cron/grace-period-notifications
     * @method POST
     */
    public function gracePeriodNotifications()
    {
        $this->autoRender = false;
        
        // Get grace period configuration (default 7 days, configurable 1-30)
        $gracePeriodDays = Configure::read('Loan.grace_period_days');
        if (!$gracePeriodDays) {
            $gracePeriodDays = 7;
        }
        
        // Warning days configuration
        $warningDays = array(3, 5, 7);
        
        // Find loans approaching grace period
        $approachingLoans = $this->_getLoansApproachingGracePeriod($gracePeriodDays);
        
        $notificationsSent = 0;
        
        foreach ($approachingLoans as $loan) {
            $daysUntilGracePeriod = $this->_calculateDaysUntilGracePeriod($loan);
            
            // Send notification if on warning day
            if (in_array($daysUntilGracePeriod, $warningDays)) {
                $this->_sendGracePeriodNotification($loan, $daysUntilGracePeriod);
                $notificationsSent++;
            }
            
            // Check if grace period expired today
            if ($daysUntilGracePeriod <= 0) {
                $this->_sendGracePeriodExpiredNotification($loan);
                $notificationsSent++;
            }
        }
        
        // Also check for loans that just entered grace period
        $enteredGracePeriod = $this->_getLoansEnteredGracePeriod($gracePeriodDays);
        foreach ($enteredGracePeriod as $loan) {
            $this->_sendGracePeriodEnteredNotification($loan);
            $notificationsSent++;
        }
        
        $this->response->body(json_encode(array(
            'success' => true,
            'notifications_sent' => $notificationsSent,
            'loans_checked' => count($approachingLoans),
            'executed_at' => date('Y-m-d H:i:s')
        )));
    }
    
    /**
     * Get loans approaching grace period (RISK-02)
     */
    private function _getLoansApproachingGracePeriod($daysAhead = 7)
    {
        // Find loans that are overdue and approaching grace period
        $conditions = array(
            'Loan.status' => array('ACTIVE', 'OVERDUE'),
            'Loan.is_in_grace_period' => 0,
            'Loan.next_payment_date <=' => date('Y-m-d', strtotime("+{$daysAhead} days")),
            'Loan.next_payment_date >=' => date('Y-m-d', strtotime('-1 day'))
        );
        
        return $this->Loan->find('all', array(
            'conditions' => $conditions,
            'contain' => array('User', 'Collateral'),
            'limit' => 1000
        ));
    }
    
    /**
     * Get loans that just entered grace period (RISK-02)
     */
    private function _getLoansEnteredGracePeriod($gracePeriodDays)
    {
        $gracePeriodStart = date('Y-m-d', strtotime("-{$gracePeriodDays} days"));
        
        $conditions = array(
            'Loan.status' => 'ACTIVE',
            'Loan.is_in_grace_period' => 1,
            'Loan.grace_period_start_date >=' => $gracePeriodStart,
            'Loan.grace_period_start_date <=' => date('Y-m-d')
        );
        
        return $this->Loan->find('all', array(
            'conditions' => $conditions,
            'contain' => array('User'),
            'limit' => 1000
        ));
    }
    
    /**
     * Calculate days until grace period (RISK-02)
     */
    private function _calculateDaysUntilGracePeriod($loan)
    {
        if (empty($loan['Loan']['next_payment_date'])) {
            return 0;
        }
        
        $paymentDate = new DateTime($loan['Loan']['next_payment_date']);
        $today = new DateTime();
        $days = $today->diff($paymentDate)->invert * -1;
        
        return $days;
    }
    
    /**
     * Send grace period warning notification (RISK-02)
     */
    private function _sendGracePeriodNotification($loan, $daysRemaining)
    {
        $userId = $loan['Loan']['user_id'];
        $loanId = $loan['Loan']['id'];
        
        // Create in-app notification
        $notificationData = array(
            'user_id' => $userId,
            'type' => 'grace_period_warning',
            'title' => 'Grace Period Warning',
            'message' => sprintf(
                'Your loan #%d payment is due in %d days. Please make payment to avoid default.',
                $loanId,
                $daysRemaining
            ),
            'reference_type' => 'loan',
            'reference_id' => $loanId,
            'priority' => $daysRemaining <= 3 ? 'high' : 'medium',
            'metadata' => json_encode(array(
                'loan_id' => $loanId,
                'days_remaining' => $daysRemaining,
                'payment_due_date' => $loan['Loan']['next_payment_date']
            ))
        );
        
        $this->Notification->create();
        $this->Notification->save($notificationData);
        
        // Send email notification
        $this->_sendGracePeriodEmail($loan, $daysRemaining);
    }
    
    /**
     * Send grace period expired notification (RISK-02)
     */
    private function _sendGracePeriodExpiredNotification($loan)
    {
        $userId = $loan['Loan']['user_id'];
        $loanId = $loan['Loan']['id'];
        
        $notificationData = array(
            'user_id' => $userId,
            'type' => 'grace_period_expired',
            'title' => 'Grace Period Expired',
            'message' => sprintf(
                'The grace period for loan #%d has expired. Default proceedings have been initiated.',
                $loanId
            ),
            'reference_type' => 'loan',
            'reference_id' => $loanId,
            'priority' => 'critical',
            'metadata' => json_encode(array(
                'loan_id' => $loanId,
                'expired_at' => date('Y-m-d H:i:s')
            ))
        );
        
        $this->Notification->create();
        $this->Notification->save($notificationData);
        
        // Trigger default workflow
        $this->_triggerDefaultWorkflow($loanId);
    }
    
    /**
     * Send grace period entered notification (RISK-02)
     */
    private function _sendGracePeriodEnteredNotification($loan)
    {
        $userId = $loan['Loan']['user_id'];
        $loanId = $loan['Loan']['id'];
        $gracePeriodDays = Configure::read('Loan.grace_period_days') ?: 7;
        
        $notificationData = array(
            'user_id' => $userId,
            'type' => 'grace_period_entered',
            'title' => 'Entered Grace Period',
            'message' => sprintf(
                'Your loan #%d has entered a %d-day grace period. Please contact us to arrange payment.',
                $loanId,
                $gracePeriodDays
            ),
            'reference_type' => 'loan',
            'reference_id' => $loanId,
            'priority' => 'high',
            'metadata' => json_encode(array(
                'loan_id' => $loanId,
                'grace_period_days' => $gracePeriodDays,
                'entered_at' => date('Y-m-d H:i:s')
            ))
        );
        
        $this->Notification->create();
        $this->Notification->save($notificationData);
        
        // Send email
        $this->_sendGracePeriodEmail($loan, $gracePeriodDays);
    }
    
    /**
     * Send grace period email notification (RISK-02)
     */
    private function _sendGracePeriodEmail($loan, $daysRemaining)
    {
        $user = $loan['User'];
        
        $email = new CakeEmail('default');
        $email->to($user['email']);
        $email->subject('Action Required: Loan Payment Due in ' . $daysRemaining . ' Days');
        $email->template('grace_period_warning');
        $email->viewVars(array(
            'user' => $user,
            'loan' => $loan['Loan'],
            'daysRemaining' => $daysRemaining
        ));
        
        try {
            $email->send();
        } catch (Exception $e) {
            // Log but don't fail
            CakeLog::write('error', 'Grace period email failed: ' . $e->getMessage());
        }
    }
    
    /**
     * Trigger default workflow when grace period expires (RISK-02)
     */
    private function _triggerDefaultWorkflow($loanId)
    {
        // Update loan status
        $this->Loan->id = $loanId;
        $this->Loan->saveField('status', 'DEFAULTED');
        
        // Create risk record
        $riskData = array(
            'loan_id' => $loanId,
            'risk_status' => 'defaulted',
            'default_date' => date('Y-m-d'),
            'workflow_stage' => 'grace_period_expired'
        );
        
        $this->LoanRisk->create();
        $this->LoanRisk->save($riskData);
        
        // Trigger webhook for external systems
        $this->_triggerDefaultWebhook($loanId);
    }
    
    /**
     * Automatic Watchlist Updates Cron Job (RISK-15)
     * Runs daily to automatically add high-risk loans to watchlist
     * 
     * @url /api/cron/watchlist-updates
     * @method POST
     */
    public function watchlistUpdates()
    {
        $this->autoRender = false;
        
        // Get loans at risk
        $loansAtRisk = $this->_getLoansAtRisk();
        
        $addedToWatchlist = 0;
        $removedFromWatchlist = 0;
        
        foreach ($loansAtRisk as $loan) {
            $riskScore = $this->_calculateRiskScore($loan);
            
            // Determine if loan should be on watchlist
            $shouldBeOnWatchlist = $this->_shouldBeOnWatchlist($loan, $riskScore);
            $isOnWatchlist = $this->_isOnWatchlist($loan['Loan']['id']);
            
            if ($shouldBeOnWatchlist && !$isOnWatchlist) {
                // Add to watchlist
                $this->_addToWatchlist($loan, $riskScore);
                $addedToWatchlist++;
            } elseif (!$shouldBeOnWatchlist && $isOnWatchlist) {
                // Remove from watchlist
                $this->_removeFromWatchlist($loan['Loan']['id']);
                $removedFromWatchlist++;
            } elseif ($shouldBeOnWatchlist && $isOnWatchlist) {
                // Update risk score
                $this->_updateWatchlistRiskScore($loan['Loan']['id'], $riskScore);
            }
        }
        
        $this->response->body(json_encode(array(
            'success' => true,
            'added_to_watchlist' => $addedToWatchlist,
            'removed_from_watchlist' => $removedFromWatchlist,
            'loans_checked' => count($loansAtRisk),
            'executed_at' => date('Y-m-d H:i:s')
        )));
    }
    
    /**
     * Get loans at risk (RISK-15)
     */
    private function _getLoansAtRisk()
    {
        $conditions = array(
            'Loan.status' => array('ACTIVE', 'OVERDUE', 'IN_GRACE_PERIOD')
        );
        
        return $this->Loan->find('all', array(
            'conditions' => $conditions,
            'contain' => array('User', 'Collateral', 'Repayments'),
            'limit' => 5000
        ));
    }
    
    /**
     * Calculate risk score for a loan (RISK-15)
     */
    private function _calculateRiskScore($loan)
    {
        $score = 0;
        
        // Payment history factor (0-30 points)
        $paymentHistory = $this->_getPaymentHistoryScore($loan);
        $score += $paymentHistory;
        
        // LTV factor (0-30 points)
        $ltvScore = $this->_getLTVScore($loan);
        $score += $ltvScore;
        
        // Credit score factor (0-20 points)
        $creditScore = $this->_getCreditScore($loan);
        $score += $creditScore;
        
        // Payment ratio factor (0-20 points)
        $paymentRatio = $this->_getPaymentRatioScore($loan);
        $score += $paymentRatio;
        
        return min(100, $score);
    }
    
    /**
     * Get payment history score (RISK-15)
     */
    private function _getPaymentHistoryScore($loan)
    {
        $repayments = $loan['Repayments'];
        $totalPayments = count($repayments);
        
        if ($totalPayments == 0) {
            return 15; // Neutral
        }
        
        $latePayments = 0;
        $onTimePayments = 0;
        
        foreach ($repayments as $repayment) {
            if ($repayment['status'] === 'PAID') {
                if (strtotime($repayment['paid_date']) > strtotime($repayment['due_date'])) {
                    $latePayments++;
                } else {
                    $onTimePayments++;
                }
            }
        }
        
        $onTimeRatio = $onTimePayments / $totalPayments;
        
        if ($onTimeRatio >= 0.9) return 30;
        if ($onTimeRatio >= 0.7) return 20;
        if ($onTimeRatio >= 0.5) return 10;
        return 0;
    }
    
    /**
     * Get LTV score (RISK-15)
     */
    private function _getLTVScore($loan)
    {
        $ltv = 0;
        
        if (!empty($loan['Collateral'])) {
            $collateralValue = 0;
            $loanAmount = $loan['Loan']['loan_amount'];
            
            foreach ($loan['Collateral'] as $collateral) {
                $collateralValue += $collateral['estimated_value'];
            }
            
            if ($collateralValue > 0) {
                $ltv = ($loanAmount / $collateralValue) * 100;
            }
        }
        
        if ($ltv <= 50) return 30;
        if ($ltv <= 65) return 20;
        if ($ltv <= 80) return 10;
        return 0;
    }
    
    /**
     * Get credit score factor (RISK-15)
     */
    private function _getCreditScore($loan)
    {
        $user = $loan['User'];
        
        // Use existing credit score if available
        if (!empty($user['credit_score'])) {
            $creditScore = $user['credit_score'];
            
            if ($creditScore >= 750) return 20;
            if ($creditScore >= 700) return 15;
            if ($creditScore >= 650) return 10;
            if ($creditScore >= 600) return 5;
            return 0;
        }
        
        return 10; // Neutral if no score
    }
    
    /**
     * Get payment ratio score (RISK-15)
     */
    private function _getPaymentRatioScore($loan)
    {
        // Simplified - would need income data
        return 10;
    }
    
    /**
     * Check if loan should be on watchlist (RISK-15)
     */
    private function _shouldBeOnWatchlist($loan, $riskScore)
    {
        // Add to watchlist if risk score is below 40
        return $riskScore < 40;
    }
    
    /**
     * Check if loan is already on watchlist (RISK-15)
     */
    private function _isOnWatchlist($loanId)
    {
        $watchlist = $this->RiskWatchlist->findByLoanId($loanId);
        return !empty($watchlist);
    }
    
    /**
     * Add loan to watchlist (RISK-15)
     */
    private function _addToWatchlist($loan, $riskScore)
    {
        $watchlistData = array(
            'loan_id' => $loan['Loan']['id'],
            'user_id' => $loan['Loan']['user_id'],
            'risk_score' => $riskScore,
            'status' => 'active',
            'reason' => $this->_getWatchlistReason($loan, $riskScore),
            'added_date' => date('Y-m-d H:i:s'),
            'auto_added' => 1
        );
        
        $this->RiskWatchlist->create();
        $this->RiskWatchlist->save($watchlistData);
        
        // Send notification to user
        $this->_sendWatchlistNotification($loan, $riskScore);
    }
    
    /**
     * Remove loan from watchlist (RISK-15)
     */
    private function _removeFromWatchlist($loanId)
    {
        $this->RiskWatchlist->deleteAll(array(
            'RiskWatchlist.loan_id' => $loanId
        ));
    }
    
    /**
     * Update watchlist risk score (RISK-15)
     */
    private function _updateWatchlistRiskScore($loanId, $riskScore)
    {
        $watchlist = $this->RiskWatchlist->findByLoanId($loanId);
        
        if ($watchlist) {
            $this->RiskWatchlist->id = $watchlist['RiskWatchlist']['id'];
            $this->RiskWatchlist->saveField('risk_score', $riskScore);
            $this->RiskWatchlist->saveField('last_updated', date('Y-m-d H:i:s'));
        }
    }
    
    /**
     * Get watchlist reason (RISK-15)
     */
    private function _getWatchlistReason($loan, $riskScore)
    {
        $reasons = array();
        
        if (!empty($loan['Loan']['is_overdue'])) {
            $reasons[] = 'Loan is overdue';
        }
        
        $ltv = $this->_getCurrentLTV($loan);
        if ($ltv > 80) {
            $reasons[] = 'LTV exceeds 80%';
        }
        
        $paymentHistory = $this->_getPaymentHistoryScore($loan);
        if ($paymentHistory < 20) {
            $reasons[] = 'Poor payment history';
        }
        
        return implode('; ', $reasons) ?: 'Automatic high-risk flag';
    }
    
    /**
     * Get current LTV (RISK-15)
     */
    private function _getCurrentLTV($loan)
    {
        if (empty($loan['Collateral'])) {
            return 100;
        }
        
        $collateralValue = 0;
        $loanAmount = $loan['Loan']['loan_amount'];
        
        foreach ($loan['Collateral'] as $collateral) {
            $collateralValue += $collateral['estimated_value'];
        }
        
        if ($collateralValue == 0) {
            return 100;
        }
        
        return ($loanAmount / $collateralValue) * 100;
    }
    
    /**
     * Send watchlist notification (RISK-15)
     */
    private function _sendWatchlistNotification($loan, $riskScore)
    {
        $notificationData = array(
            'user_id' => $loan['Loan']['user_id'],
            'type' => 'risk_watchlist',
            'title' => 'Loan Added to Watchlist',
            'message' => sprintf(
                'Your loan #%d has been added to the risk watchlist due to elevated risk factors. Please contact support.',
                $loan['Loan']['id']
            ),
            'reference_type' => 'loan',
            'reference_id' => $loan['Loan']['id'],
            'priority' => 'high',
            'metadata' => json_encode(array(
                'loan_id' => $loan['Loan']['id'],
                'risk_score' => $riskScore
            ))
        );
        
        $this->Notification->create();
        $this->Notification->save($notificationData);
    }
    
    /**
     * Default Probability Webhook Trigger (RISK-14)
     * Runs hourly to check and trigger webhooks for significant probability changes
     * 
     * @url /api/cron/default-probability-webhooks
     * @method POST
     */
    public function defaultProbabilityWebhooks()
    {
        $this->autoRender = false;
        
        // Get loans with updated risk scores
        $loansWithRiskUpdate = $this->_getLoansWithRiskUpdate();
        
        $webhooksTriggered = 0;
        
        foreach ($loansWithRiskUpdate as $loan) {
            $probability = $this->_calculateDefaultProbability($loan);
            $previousProbability = !empty($loan['LoanRisk']['default_probability']) 
                ? $loan['LoanRisk']['default_probability'] 
                : 0;
            
            // Check if probability changed significantly or crossed threshold
            $probabilityChange = abs($probability - $previousProbability);
            $crossedThreshold = ($previousProbability < 40 && $probability >= 40) 
                || ($previousProbability >= 40 && $probability < 40);
            
            if ($probabilityChange >= 10 || $crossedThreshold) {
                // Trigger webhook
                $this->_triggerProbabilityWebhook($loan, $probability, $previousProbability);
                $webhooksTriggered++;
                
                // Update stored probability
                $this->_updateDefaultProbability($loan['Loan']['id'], $probability);
                
                // Send notification for high probability
                if ($probability >= 50) {
                    $this->_sendDefaultProbabilityNotification($loan, $probability);
                }
            }
        }
        
        $this->response->body(json_encode(array(
            'success' => true,
            'webhooks_triggered' => $webhooksTriggered,
            'loans_checked' => count($loansWithRiskUpdate),
            'executed_at' => date('Y-m-d H:i:s')
        )));
    }
    
    /**
     * Get loans with recent risk updates (RISK-14)
     */
    private function _getLoansWithRiskUpdate()
    {
        // Get loans with risk scores updated in last hour
        $oneHourAgo = date('Y-m-d H:i:s', strtotime('-1 hour'));
        
        $conditions = array(
            'Loan.status' => array('ACTIVE', 'OVERDUE', 'IN_GRACE_PERIOD'),
            'OR' => array(
                'LoanRisk.last_calculated >=' => $oneHourAgo,
                'LoanRisk.last_calculated' => null
            )
        );
        
        return $this->Loan->find('all', array(
            'conditions' => $conditions,
            'contain' => array('LoanRisk', 'User', 'Collateral', 'Repayments'),
            'limit' => 1000
        ));
    }
    
    /**
     * Calculate default probability (RISK-14)
     */
    private function _calculateDefaultProbability($loan)
    {
        $probability = 0;
        
        // Payment history impact (0-30%)
        $paymentHistory = $this->_getPaymentHistoryScore($loan);
        $probability += (30 - $paymentHistory) * 0.3;
        
        // LTV impact (0-25%)
        $ltvScore = $this->_getLTVScore($loan);
        $probability += (30 - $ltvScore) * 0.25;
        
        // Credit score impact (0-20%)
        $creditScore = $this->_getCreditScore($loan);
        $probability += (20 - $creditScore) * 0.2;
        
        // Overdue status impact (0-25%)
        if (!empty($loan['Loan']['is_overdue'])) {
            $daysOverdue = !empty($loan['Loan']['days_overdue']) ? $loan['Loan']['days_overdue'] : 1;
            $probability += min(25, $daysOverdue * 5);
        }
        
        return min(100, round($probability));
    }
    
    /**
     * Trigger probability webhook (RISK-14)
     */
    private function _triggerProbabilityWebhook($loan, $probability, $previousProbability)
    {
        // Get configured webhooks
        $webhooks = Configure::read('Risk.webhooks');
        
        if (empty($webhooks)) {
            return;
        }
        
        $payload = array(
            'event' => 'loan.default_probability_update',
            'timestamp' => date('Y-m-d H:i:s'),
            'data' => array(
                'loan_id' => $loan['Loan']['id'],
                'user_id' => $loan['Loan']['user_id'],
                'probability' => $probability,
                'previous_probability' => $previousProbability,
                'probability_change' => $probability - $previousProbability,
                'loan_status' => $loan['Loan']['status'],
                'ltv' => $this->_getCurrentLTV($loan)
            )
        );
        
        // Queue webhook requests
        foreach ($webhooks as $webhookUrl) {
            $this->Queue->enqueue('webhooks', array(
                'url' => $webhookUrl,
                'method' => 'POST',
                'payload' => $payload,
                'retry_count' => 0
            ));
        }
    }
    
    /**
     * Update stored default probability (RISK-14)
     */
    private function _updateDefaultProbability($loanId, $probability)
    {
        $existingRisk = $this->LoanRisk->findByLoanId($loanId);
        
        if ($existingRisk) {
            $this->LoanRisk->id = $existingRisk['LoanRisk']['id'];
            $this->LoanRisk->save(array(
                'default_probability' => $probability,
                'last_calculated' => date('Y-m-d H:i:s')
            ));
        } else {
            $this->LoanRisk->create();
            $this->LoanRisk->save(array(
                'loan_id' => $loanId,
                'default_probability' => $probability,
                'last_calculated' => date('Y-m-d H:i:s'),
                'risk_status' => 'active'
            ));
        }
    }
    
    /**
     * Send default probability notification (RISK-14)
     */
    private function _sendDefaultProbabilityNotification($loan, $probability)
    {
        $notificationData = array(
            'user_id' => $loan['Loan']['user_id'],
            'type' => 'default_imminent',
            'title' => 'High Default Risk Detected',
            'message' => sprintf(
                'Your loan #%d has a %.1f%% probability of default. Please contact us immediately.',
                $loan['Loan']['id'],
                $probability
            ),
            'reference_type' => 'loan',
            'reference_id' => $loan['Loan']['id'],
            'priority' => 'critical',
            'metadata' => json_encode(array(
                'loan_id' => $loan['Loan']['id'],
                'default_probability' => $probability
            ))
        );
        
        $this->Notification->create();
        $this->Notification->save($notificationData);
    }
    
    /**
     * Trigger default webhook (called when loan defaults)
     */
    private function _triggerDefaultWebhook($loanId)
    {
        $webhooks = Configure::read('Risk.default_webhooks');
        
        if (empty($webhooks)) {
            return;
        }
        
        $payload = array(
            'event' => 'loan.defaulted',
            'timestamp' => date('Y-m-d H:i:s'),
            'data' => array(
                'loan_id' => $loanId,
                'default_date' => date('Y-m-d')
            )
        );
        
        foreach ($webhooks as $webhookUrl) {
            $this->Queue->enqueue('webhooks', array(
                'url' => $webhookUrl,
                'method' => 'POST',
                'payload' => $payload,
                'retry_count' => 0
            ));
        }
    }
    
    /**
     * Collateral Price Oracle Integration (RISK-07)
     * Runs hourly to update collateral valuations for liquidation calculations
     * 
     * @url /api/cron/collateral-valuation
     * @method POST
     */
    public function collateralValuation()
    {
        $this->autoRender = false;
        
        // Get active collateral
        $collateralList = $this->Collateral->find('all', array(
            'conditions' => array(
                'Collateral.status' => 'verified'
            ),
            'contain' => array('Loan'),
            'limit' => 5000
        ));
        
        $valuationsUpdated = 0;
        
        foreach ($collateralList as $collateral) {
            $valuation = $this->_getCollateralValuation($collateral);
            
            if ($valuation !== false) {
                $this->Collateral->id = $collateral['Collateral']['id'];
                $this->Collateral->saveField('current_value', $valuation);
                $this->Collateral->saveField('last_valued', date('Y-m-d H:i:s'));
                $valuationsUpdated++;
                
                // Check liquidation threshold
                $this->_checkLiquidationThreshold($collateral, $valuation);
            }
        }
        
        $this->response->body(json_encode(array(
            'success' => true,
            'valuations_updated' => $valuationsUpdated,
            'collateral_checked' => count($collateralList),
            'executed_at' => date('Y-m-d H:i:s')
        )));
    }
    
    /**
     * Get collateral valuation using price oracle (RISK-07)
     */
    private function _getCollateralValuation($collateral)
    {
        $collateralType = $collateral['Collateral']['collateral_type'];
        $amount = $collateral['Collateral']['amount'];
        
        // Get price from oracle service
        $priceData = $this->_getOraclePrice($collateralType);
        
        if ($priceData === false) {
            // Use manual valuation if oracle unavailable
            return !empty($collateral['Collateral']['estimated_value']) 
                ? $collateral['Collateral']['estimated_value'] 
                : false;
        }
        
        return $amount * $priceData['price'];
    }
    
    /**
     * Get price from oracle (RISK-07)
     * In production, this would call Chainlink or other price oracle
     */
    private function _getOraclePrice($collateralType)
    {
        // This would integrate with price oracle service
        // For now, return simulated prices
        $prices = array(
            'CRYPTO_ETH' => 3500,
            'CRYPTO_BTC' => 65000,
            'REAL_ESTATE' => 0, // Requires manual
            'VEHICLE' => 0, // Requires manual
            'EQUIPMENT' => 0, // Requires manual
            'INVOICE' => 0 // Requires manual
        );
        
        if (isset($prices[$collateralType]) && $prices[$collateralType] > 0) {
            return array(
                'price' => $prices[$collateralType],
                'source' => 'oracle',
                'updated_at' => date('Y-m-d H:i:s')
            );
        }
        
        return false;
    }
    
    /**
     * Check liquidation threshold (RISK-07)
     */
    private function _checkLiquidationThreshold($collateral, $currentValue)
    {
        $loan = $collateral['Loan'];
        
        if (empty($loan)) {
            return;
        }
        
        $loanAmount = $loan['loan_amount'];
        $ltv = ($loanAmount / $currentValue) * 100;
        
        // Dynamic liquidation threshold (RISK-08)
        // For LTV > 80%, trigger pre-liquidation warning
        // For LTV > 90%, trigger liquidation
        if ($ltv > 80) {
            $notificationData = array(
                'user_id' => $loan['user_id'],
                'type' => 'liquidation_warning',
                'title' => 'Liquidation Warning',
                'message' => sprintf(
                    'The collateral for your loan #%d has dropped in value. Current LTV is %.1f%%.',
                    $loan['id'],
                    $ltv
                ),
                'reference_type' => 'loan',
                'reference_id' => $loan['id'],
                'priority' => 'critical',
                'metadata' => json_encode(array(
                    'loan_id' => $loan['id'],
                    'collateral_id' => $collateral['Collateral']['id'],
                    'current_ltv' => $ltv,
                    'collateral_value' => $currentValue
                ))
            );
            
            $this->Notification->create();
            $this->Notification->save($notificationData);
            
            // Trigger liquidation if LTV > 90%
            if ($ltv > 90) {
                $this->_triggerLiquidationProcess($loan['id'], $ltv);
            }
        }
    }
    
    /**
     * Trigger liquidation process (RISK-07)
     */
    private function _triggerLiquidationProcess($loanId, $ltv)
    {
        // Update loan status
        $this->Loan->id = $loanId;
        $this->Loan->saveField('status', 'LIQUIDATION_PENDING');
        
        // Create liquidation record
        $liquidationData = array(
            'loan_id' => $loanId,
            'initiated_date' => date('Y-m-d'),
            'current_ltv' => $ltv,
            'status' => 'pending_auction'
        );
        
        // This would save to a Liquidations table
        
        // Trigger liquidation webhook
        $webhooks = Configure::read('Risk.liquidation_webhooks');
        
        if (!empty($webhooks)) {
            $payload = array(
                'event' => 'loan.liquidation_initiated',
                'timestamp' => date('Y-m-d H:i:s'),
                'data' => array(
                    'loan_id' => $loanId,
                    'ltv' => $ltv
                )
            );
            
            foreach ($webhooks as $webhookUrl) {
                $this->Queue->enqueue('webhooks', array(
                    'url' => $webhookUrl,
                    'method' => 'POST',
                    'payload' => $payload,
                    'retry_count' => 0
                ));
            }
        }
    }
    
    /**
     * Combined risk management cron (runs all risk checks)
     * 
     * @url /api/cron/risk-management
     * @method POST
     */
    public function runAllRiskChecks()
    {
        $this->autoRender = false;
        
        $results = array(
            'grace_period_notifications' => false,
            'watchlist_updates' => false,
            'default_probability_webhooks' => false,
            'collateral_valuation' => false,
            'executed_at' => date('Y-m-d H:i:s')
        );
        
        try {
            // Run grace period notifications
            $this->gracePeriodNotifications();
            $results['grace_period_notifications'] = true;
        } catch (Exception $e) {
            $results['grace_period_error'] = $e->getMessage();
        }
        
        try {
            // Run watchlist updates
            $this->watchlistUpdates();
            $results['watchlist_updates'] = true;
        } catch (Exception $e) {
            $results['watchlist_error'] = $e->getMessage();
        }
        
        try {
            // Run default probability webhooks
            $this->defaultProbabilityWebhooks();
            $results['default_probability_webhooks'] = true;
        } catch (Exception $e) {
            $results['probability_webhooks_error'] = $e->getMessage();
        }
        
        try {
            // Run collateral valuation
            $this->collateralValuation();
            $results['collateral_valuation'] = true;
        } catch (Exception $e) {
            $results['collateral_valuation_error'] = $e->getMessage();
        }
        
        $this->response->body(json_encode(array(
            'success' => true,
            'results' => $results
        )));
    }
    
    /**
     * RISK-001: Automatic Default Detection Cron
     * Runs daily to check for loans that should be marked as defaulted
     * This endpoint is called by the frontend defaultDetectionService
     * 
     * @url /api/risk/cron/check-defaults
     * @method POST
     */
    public function checkDefaults()
    {
        $this->autoRender = false;
        
        // Verify cron secret for security
        $cronSecret = $this->request->header('X-Cron-Secret');
        $expectedSecret = Configure::read('Security.cronSecret') ?: getenv('LENDA_CRON_SECRET');
        
        if ($expectedSecret && $cronSecret !== $expectedSecret) {
            $this->response->statusCode(401);
            $this->response->body(json_encode(array(
                'success' => false,
                'error' => 'Unauthorized'
            )));
            return;
        }
        
        $defaultsTriggered = 0;
        $loansChecked = 0;
        
        try {
            // Get grace period configuration
            $gracePeriodDays = Configure::read('Loan.grace_period_days') ?: 7;
            
            // Find loans that have exceeded grace period
            $gracePeriodExpiredDate = date('Y-m-d', strtotime("-{$gracePeriodDays} days"));
            
            $overdueLoans = $this->Loan->find('all', array(
                'conditions' => array(
                    'Loan.status' => array('ACTIVE', 'OVERDUE', 'IN_GRACE_PERIOD'),
                    'Loan.is_in_grace_period' => 1,
                    'Loan.grace_period_start_date <=' => $gracePeriodExpiredDate
                ),
                'contain' => array('User'),
                'limit' => 1000
            ));
            
            $loansChecked = count($overdueLoans);
            
            foreach ($overdueLoans as $loan) {
                // Check if loan should be defaulted
                $shouldDefault = $this->_shouldDefaultLoan($loan);
                
                if ($shouldDefault) {
                    $this->_defaultLoan($loan['Loan']['id']);
                    $defaultsTriggered++;
                }
            }
            
            // Also check loans that are overdue without grace period
            $directlyOverdueLoans = $this->Loan->find('all', array(
                'conditions' => array(
                    'Loan.status' => 'ACTIVE',
                    'Loan.is_in_grace_period' => 0,
                    'Loan.next_payment_date <' => date('Y-m-d', strtotime('-30 days'))
                ),
                'limit' => 500
            ));
            
            $loansChecked += count($directlyOverdueLoans);
            
            foreach ($directlyOverdueLoans as $loan) {
                // Enter grace period first
                $this->Loan->id = $loan['Loan']['id'];
                $this->Loan->save(array(
                    'is_in_grace_period' => 1,
                    'grace_period_start_date' => date('Y-m-d'),
                    'status' => 'IN_GRACE_PERIOD'
                ));
            }
            
            $this->response->body(json_encode(array(
                'success' => true,
                'defaults_triggered' => $defaultsTriggered,
                'loans_checked' => $loansChecked,
                'executed_at' => date('Y-m-d H:i:s')
            )));
            
        } catch (Exception $e) {
            $this->response->statusCode(500);
            $this->response->body(json_encode(array(
                'success' => false,
                'error' => $e->getMessage(),
                'loans_checked' => $loansChecked
            )));
        }
    }
    
    /**
     * Check if a loan should be defaulted (RISK-001)
     */
    private function _shouldDefaultLoan($loan)
    {
        // Check days in grace period
        if (empty($loan['Loan']['grace_period_start_date'])) {
            return true; // Should have grace period start date
        }
        
        $gracePeriodDays = Configure::read('Loan.grace_period_days') ?: 7;
        $gracePeriodStart = new DateTime($loan['Loan']['grace_period_start_date']);
        $today = new DateTime();
        $daysInGrace = $today->diff($gracePeriodStart)->days;
        
        // Default if exceeded grace period
        if ($daysInGrace >= $gracePeriodDays) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Mark a loan as defaulted (RISK-001)
     */
    private function _defaultLoan($loanId)
    {
        // Update loan status
        $this->Loan->id = $loanId;
        $this->Loan->save(array(
            'status' => 'DEFAULTED',
            'default_date' => date('Y-m-d'),
            'is_in_grace_period' => 0
        ));
        
        // Create default risk record
        $this->LoanRisk->create();
        $this->LoanRisk->save(array(
            'loan_id' => $loanId,
            'risk_status' => 'defaulted',
            'default_date' => date('Y-m-d'),
            'workflow_stage' => 'liquidation',
            'default_probability' => 100
        ));
        
        // Trigger notifications
        $loan = $this->Loan->findById($loanId);
        if (!empty($loan['User']['id'])) {
            $this->Notification->create();
            $this->Notification->save(array(
                'user_id' => $loan['User']['id'],
                'type' => 'loan_defaulted',
                'title' => 'Loan Defaulted',
                'message' => sprintf('Your loan #%d has been marked as defaulted.', $loanId),
                'reference_type' => 'loan',
                'reference_id' => $loanId,
                'priority' => 'critical'
            ));
        }
        
        // Trigger webhook if configured
        $this->_triggerDefaultWebhook($loanId);
    }
}
