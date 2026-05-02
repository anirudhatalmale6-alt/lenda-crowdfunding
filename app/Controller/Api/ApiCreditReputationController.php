<?php
App::uses("AppController", "Controller");

/**
 * LENDA Credit Reputation API Controller
 * 
 * Provides endpoints for:
 * - Borrower Credit Score (300-900 scale)
 * - Credit Score Categories
 * - Repayment History
 * - Reputation Badges
 * - Investor Signals
 * - Admin Credit Monitoring
 */
class ApiCreditReputationController extends AppController {
    use ApiBaseControllerTrait;
    
    public $name = "ApiCreditReputation";
    public $layout = null;
    public $autoRender = false;
    
    // Credit Score Categories
    const CATEGORY_ELITE = 'elite';
    const CATEGORY_EXCELLENT = 'excellent';
    const CATEGORY_GOOD = 'good';
    const CATEGORY_FAIR = 'fair';
    const CATEGORY_WEAK = 'weak';
    const CATEGORY_HIGH_RISK = 'high_risk';
    
    // Score Ranges
    const SCORE_MIN = 300;
    const SCORE_MAX = 900;
    
    // Scoring Weights (percentages)
    const WEIGHT_REPAYMENT_HISTORY = 40;
    const WEIGHT_LOAN_COMPLETION = 25;
    const WEIGHT_COLLATERAL_QUALITY = 15;
    const WEIGHT_ACCOUNT_LONGEVITY = 10;
    const WEIGHT_MARKETPLACE_REPUTATION = 10;
    
    // Badge Types
    const BADGE_RELIABLE_BORROWER = 'reliable_borrower';
    const BADGE_HIGH_REPAYMENT_STREAK = 'high_repayment_streak';
    const BADGE_COLLATERAL_VERIFIED = 'collateral_verified';
    const BADGE_VETERAN_BORROWER = 'veteran_borrower';
    const BADGE_ON_TIME_KING = 'on_time_king';
    const BADGE_FIRST_LOAN_COMPLETED = 'first_loan_completed';
    const BADGE_CONSISTENT_BORROWER = 'consistent_borrower';
    const BADGE_TRUSTED_BORROWER = 'trusted_borrower';
    const BADGE_LOW_RATIO_BORROWER = 'low_ratio_borrower';
    const BADGE_FAST_PAYER = 'fast_payer';
    
    public function beforeFilter() {
        parent::beforeFilter();
        // Public endpoints - credit reputation is transparent
        $this->Auth->allow([
            'getBorrowerCreditScore',
            'getBorrowerProfile',
            'getBorrowerRepaymentHistory',
            'getBorrowerBadges',
            'getReputationSignals',
            'getCreditMonitoringDashboard'
        ]);
    }
    
    /**
     * ============================================================
     * CREDIT SCORE CALCULATION ENGINE
     * ============================================================
     */
    
    /**
     * Calculate credit score based on LENDA model
     * Score range: 300-900
     * 
     * @param int $borrowerId
     * @return array
     */
    private function _calculateCreditScore($borrowerId) {
        App::uses('User', 'Model');
        App::uses('BorrowerProfile', 'Model');
        App::uses('LoanRequest', 'Model');
        App::uses('CollateralAsset', 'Model');
        App::uses('BorrowerCredit', 'Model');
        App::uses('Repayment', 'Model');
        
        $this->User = new User();
        $this->BorrowerProfile = new BorrowerProfile();
        $this->LoanRequest = new LoanRequest();
        $this->CollateralAsset = new CollateralAsset();
        $this->BorrowerCredit = new BorrowerCredit();
        $this->Repayment = new Repayment();
        
        // Get user
        $user = $this->User->find('first', [
            'conditions' => ['User.id' => $borrowerId],
            'recursive' => -1
        ]);
        
        if (!$user) {
            return ['success' => false, 'message' => 'User not found'];
        }
        
        // Get borrower profile
        $borrowerProfile = $this->BorrowerProfile->find('first', [
            'conditions' => ['BorrowerProfile.user_id' => $borrowerId]
        ]);
        
        // Get all loans
        $loans = $this->LoanRequest->find('all', [
            'conditions' => ['LoanRequest.borrower_id' => $borrowerId]
        ]);
        
        // Calculate factors
        $repaymentHistoryScore = $this->_calculateRepaymentHistoryScore($borrowerId, $loans);
        $loanCompletionScore = $this->_calculateLoanCompletionScore($loans);
        $collateralQualityScore = $this->_calculateCollateralQualityScore($borrowerId);
        $accountLongevityScore = $this->_calculateAccountLongevityScore($user);
        $marketplaceReputationScore = $this->_calculateMarketplaceReputationScore($loans);
        
        // Calculate weighted score
        $weightedScore = round(
            ($repaymentHistoryScore * (self::WEIGHT_REPAYMENT_HISTORY / 100)) +
            ($loanCompletionScore * (self::WEIGHT_LOAN_COMPLETION / 100)) +
            ($collateralQualityScore * (self::WEIGHT_COLLATERAL_QUALITY / 100)) +
            ($accountLongevityScore * (self::WEIGHT_ACCOUNT_LONGEVITY / 100)) +
            ($marketplaceReputationScore * (self::WEIGHT_MARKETPLACE_REPUTATION / 100))
        );
        
        // Scale to 300-900 range
        $finalScore = $this->_scaleScore($weightedScore);
        
        // Determine category
        $category = $this->_getCategoryFromScore($finalScore);
        
        // Get loan statistics
        $totalLoans = count($loans);
        $successfulLoans = 0;
        $defaultedLoans = 0;
        $activeLoans = 0;
        $totalBorrowed = 0;
        $totalRepaid = 0;
        
        foreach ($loans as $loan) {
            $totalBorrowed += floatval($loan['LoanRequest']['loan_amount']);
            if ($loan['LoanRequest']['status'] === 'repaid') {
                $successfulLoans++;
                $totalRepaid += floatval($loan['LoanRequest']['loan_amount']);
            } elseif ($loan['LoanRequest']['status'] === 'defaulted') {
                $defaultedLoans++;
            } elseif (in_array($loan['LoanRequest']['status'], ['funded', 'active'])) {
                $activeLoans++;
            }
        }
        
        // Calculate repayment rate
        $repaymentRate = $totalLoans > 0 ? ($successfulLoans / $totalLoans) * 100 : 0;
        
        // Get collateral info
        $collateral = $this->CollateralAsset->find('all', [
            'conditions' => ['CollateralAsset.borrower_id' => $borrowerId]
        ]);
        
        $collateralCount = count($collateral);
        $verifiedCollateralCount = 0;
        foreach ($collateral as $c) {
            if ($c['CollateralAsset']['verification_status'] === 'verified') {
                $verifiedCollateralCount++;
            }
        }
        
        // Get account age
        $accountAgeMonths = 0;
        if (!empty($user['User']['created_at'])) {
            $created = new DateTime($user['User']['created_at']);
            $now = new DateTime();
            $accountAgeMonths = $created->diff($now)->m + ($created->diff($now)->y * 12);
        }
        
        // Get last loan and payment dates
        $lastLoanDate = null;
        $lastPaymentDate = null;
        
        if (!empty($loans)) {
            $lastLoan = end($loans);
            $lastLoanDate = $lastLoan['LoanRequest']['created_at'];
        }
        
        $lastRepayment = $this->Repayment->find('first', [
            'conditions' => [
                'Repayment.borrower_id' => $borrowerId,
                'Repayment.status' => 'paid'
            ],
            'order' => ['Repayment.paid_at' => 'DESC']
        ]);
        
        if ($lastRepayment) {
            $lastPaymentDate = $lastRepayment['Repayment']['paid_at'];
        }
        
        // Save/update credit record
        $existingCredit = $this->BorrowerCredit->find('first', [
            'conditions' => ['BorrowerCredit.borrower_id' => $borrowerId]
        ]);
        
        if ($existingCredit) {
            $this->BorrowerCredit->id = $existingCredit['BorrowerCredit']['id'];
        } else {
            $this->BorrowerCredit->create();
        }
        
        $this->BorrowerCredit->save([
            'borrower_id' => $borrowerId,
            'credit_score' => $finalScore,
            'credit_category' => $category,
            'total_loans' => $totalLoans,
            'successful_loans' => $successfulLoans,
            'defaulted_loans' => $defaultedLoans,
            'active_loans' => $activeLoans,
            'total_borrowed' => $totalBorrowed,
            'total_repaid' => $totalRepaid,
            'total_defaulted' => $totalBorrowed - $totalRepaid,
            'repayment_rate' => $repaymentRate,
            'collateral_count' => $collateralCount,
            'verified_collateral_count' => $verifiedCollateralCount,
            'account_age_months' => $accountAgeMonths,
            'last_loan_date' => $lastLoanDate,
            'last_payment_date' => $lastPaymentDate,
            'repayment_history_score' => $repaymentHistoryScore,
            'loan_completion_score' => $loanCompletionScore,
            'collateral_quality_score' => $collateralQualityScore,
            'account_longevity_score' => $accountLongevityScore,
            'marketplace_reputation_score' => $marketplaceReputationScore,
            'score_calculated_at' => date('Y-m-d H:i:s')
        ]);
        
        // Save score history
        $this->_saveScoreHistory($borrowerId, $finalScore, $category, [
            'repayment_history' => $repaymentHistoryScore,
            'loan_completion' => $loanCompletionScore,
            'collateral_quality' => $collateralQualityScore,
            'account_longevity' => $accountLongevityScore,
            'marketplace_reputation' => $marketplaceReputationScore
        ]);
        
        // Award badges
        $this->_awardBadges($borrowerId, [
            'total_loans' => $totalLoans,
            'successful_loans' => $successfulLoans,
            'defaulted_loans' => $defaultedLoans,
            'repayment_rate' => $repaymentRate,
            'collateral_count' => $collateralCount,
            'verified_collateral_count' => $verifiedCollateralCount,
            'account_age_months' => $accountAgeMonths,
            'credit_score' => $finalScore
        ]);
        
        return [
            'success' => true,
            'credit_score' => $finalScore,
            'credit_category' => $category,
            'factors' => [
                'repayment_history' => round($repaymentHistoryScore, 2),
                'loan_completion' => round($loanCompletionScore, 2),
                'collateral_quality' => round($collateralQualityScore, 2),
                'account_longevity' => round($accountLongevityScore, 2),
                'marketplace_reputation' => round($marketplaceReputationScore, 2)
            ],
            'statistics' => [
                'total_loans' => $totalLoans,
                'successful_loans' => $successfulLoans,
                'defaulted_loans' => $defaultedLoans,
                'active_loans' => $activeLoans,
                'total_borrowed' => $totalBorrowed,
                'total_repaid' => $totalRepaid,
                'repayment_rate' => round($repaymentRate, 2)
            ]
        ];
    }
    
    /**
     * Calculate repayment history score (0-100)
     */
    private function _calculateRepaymentHistoryScore($borrowerId, $loans) {
        App::uses('Repayment', 'Model');
        $this->Repayment = new Repayment();
        
        $repayments = $this->Repayment->find('all', [
            'conditions' => ['Repayment.borrower_id' => $borrowerId],
            'order' => ['Repayment.due_date' => 'ASC']
        ]);
        
        if (empty($repayments)) {
            return 50; // Neutral for new borrowers
        }
        
        $totalPayments = count($repayments);
        $onTimePayments = 0;
        $latePayments = 0;
        $defaultedPayments = 0;
        $totalDaysLate = 0;
        
        foreach ($repayments as $payment) {
            $status = $payment['Repayment']['status'];
            $daysLate = intval($payment['Repayment']['days_late'] ?? 0);
            
            if ($status === 'paid') {
                if ($daysLate <= 0) {
                    $onTimePayments++;
                } else {
                    $latePayments++;
                    $totalDaysLate += $daysLate;
                }
            } elseif ($status === 'defaulted') {
                $defaultedPayments++;
            }
        }
        
        // Calculate on-time payment rate
        $completedPayments = $onTimePayments + $latePayments + $defaultedPayments;
        if ($completedPayments === 0) {
            return 50;
        }
        
        $onTimeRate = ($onTimePayments / $completedPayments) * 100;
        
        // Factor in late payments (penalize but don't destroy score)
        $latePenalty = min(20, ($latePayments / $completedPayments) * 30);
        
        // Factor in defaults (significant penalty)
        $defaultPenalty = min(30, ($defaultedPayments / $completedPayments) * 40);
        
        // Calculate score
        $score = $onTimeRate - $latePenalty - $defaultPenalty;
        
        return max(0, min(100, $score));
    }
    
    /**
     * Calculate loan completion score (0-100)
     */
    private function _calculateLoanCompletionScore($loans) {
        if (empty($loans)) {
            return 50; // Neutral for new borrowers
        }
        
        $totalLoans = count($loans);
        $completedLoans = 0;
        $activeLoans = 0;
        
        foreach ($loans as $loan) {
            $status = $loan['LoanRequest']['status'];
            if ($status === 'repaid') {
                $completedLoans++;
            } elseif (in_array($status, ['funded', 'active'])) {
                $activeLoans++;
            }
        }
        
        // Higher weight for completed loans
        $completionRate = ($completedLoans / $totalLoans) * 100;
        
        // Bonus for having active loans (showing current engagement)
        $activeBonus = min(15, ($activeLoans / $totalLoans) * 25);
        
        return min(100, $completionRate + $activeBonus);
    }
    
    /**
     * Calculate collateral quality score (0-100)
     */
    private function _calculateCollateralQualityScore($borrowerId) {
        App::uses('CollateralAsset', 'Model');
        $this->CollateralAsset = new CollateralAsset();
        
        $collateral = $this->CollateralAsset->find('all', [
            'conditions' => ['CollateralAsset.borrower_id' => $borrowerId]
        ]);
        
        if (empty($collateral)) {
            return 20; // Low score for no collateral
        }
        
        $totalCollateral = count($collateral);
        $verifiedCollateral = 0;
        
        foreach ($collateral as $c) {
            if ($c['CollateralAsset']['verification_status'] === 'verified') {
                $verifiedCollateral++;
            }
        }
        
        // Base score for having collateral
        $baseScore = 30;
        
        // Verification bonus
        $verificationRatio = $verifiedCollateral / $totalCollateral;
        $verificationBonus = $verificationRatio * 50;
        
        // Quantity bonus (up to 20)
        $quantityBonus = min(20, $totalCollateral * 5);
        
        return min(100, $baseScore + $verificationBonus + $quantityBonus);
    }
    
    /**
     * Calculate account longevity score (0-100)
     */
    private function _calculateAccountLongevityScore($user) {
        if (empty($user['User']['created_at'])) {
            return 20;
        }
        
        $created = new DateTime($user['User']['created_at']);
        $now = new DateTime();
        $months = $created->diff($now)->m + ($created->diff($now)->y * 12);
        
        // Scale: 0 months = 20, 12 months = 60, 24+ months = 100
        if ($months >= 24) {
            return 100;
        } elseif ($months >= 12) {
            return 60 + (($months - 12) * 4);
        } else {
            return 20 + ($months * 3.33);
        }
    }
    
    /**
     * Calculate marketplace reputation score (0-100)
     */
    private function _calculateMarketplaceReputationScore($loans) {
        if (empty($loans)) {
            return 50; // Neutral for new borrowers
        }
        
        $totalLoans = count($loans);
        
        // More loans = more reputation (up to a point)
        if ($totalLoans >= 10) {
            $volumeScore = 100;
        } elseif ($totalLoans >= 5) {
            $volumeScore = 70 + ($totalLoans - 5) * 6;
        } else {
            $volumeScore = 30 + ($totalLoans * 8);
        }
        
        return min(100, $volumeScore);
    }
    
    /**
     * Scale score from 0-100 to 300-900
     */
    private function _scaleScore($rawScore) {
        // Linear scaling: 0 -> 300, 100 -> 900
        return intval(300 + ($rawScore * 6));
    }
    
    /**
     * Get category from score
     */
    private function _getCategoryFromScore($score) {
        if ($score >= 800) return self::CATEGORY_ELITE;
        if ($score >= 720) return self::CATEGORY_EXCELLENT;
        if ($score >= 650) return self::CATEGORY_GOOD;
        if ($score >= 580) return self::CATEGORY_FAIR;
        if ($score >= 500) return self::CATEGORY_WEAK;
        return self::CATEGORY_HIGH_RISK;
    }
    
    /**
     * Save score history
     */
    private function _saveScoreHistory($borrowerId, $score, $category, $factors) {
        App::uses('CreditScoreHistory', 'Model');
        $this->CreditScoreHistory = new CreditScoreHistory();
        
        // Get previous score
        $previousRecord = $this->CreditScoreHistory->find('first', [
            'conditions' => ['CreditScoreHistory.borrower_id' => $borrowerId],
            'order' => ['CreditScoreHistory.calculated_at' => 'DESC']
        ]);
        
        $previousScore = $previousRecord ? $previousRecord['CreditScoreHistory']['credit_score'] : null;
        $scoreChange = $previousScore ? $score - $previousScore : 0;
        
        $this->CreditScoreHistory->create();
        $this->CreditScoreHistory->save([
            'borrower_id' => $borrowerId,
            'credit_score' => $score,
            'credit_category' => $category,
            'score_change' => $scoreChange,
            'previous_score' => $previousScore,
            'factors' => json_encode($factors),
            'change_reason' => $this->_getScoreChangeReason($scoreChange),
            'calculated_at' => date('Y-m-d H:i:s')
        ]);
    }
    
    /**
     * Get score change reason
     */
    private function _getScoreChangeReason($change) {
        if ($change > 20) return 'Significant improvement';
        if ($change > 0) return 'Gradual improvement';
        if ($change < -20) return 'Significant decline';
        if ($change < 0) return 'Decline';
        return 'No change';
    }
    
    /**
     * Award badges based on performance
     */
    private function _awardBadges($borrowerId, $data) {
        App::uses('BorrowerBadge', 'Model');
        $this->BorrowerBadge = new BorrowerBadge();
        
        $badges = [];
        
        // Reliable Borrower: repayment rate > 90%
        if ($data['repayment_rate'] >= 90 && $data['total_loans'] >= 3) {
            $badges[] = [
                'badge_type' => self::BADGE_RELIABLE_BORROWER,
                'badge_name' => 'Reliable Borrower',
                'badge_description' => 'Maintained 90%+ repayment rate on 3+ loans',
                'badge_icon' => 'shield-check',
                'metric_value' => $data['repayment_rate'],
                'threshold_value' => 90
            ];
        }
        
        // High Repayment Streak: 5+ consecutive on-time payments
        if ($data['successful_loans'] >= 5) {
            $badges[] = [
                'badge_type' => self::BADGE_HIGH_REPAYMENT_STREAK,
                'badge_name' => 'High Repayment Streak',
                'badge_description' => 'Successfully completed 5+ loans',
                'badge_icon' => 'fire',
                'metric_value' => $data['successful_loans'],
                'threshold_value' => 5
            ];
        }
        
        // Collateral Verified: 2+ verified collateral
        if ($data['verified_collateral_count'] >= 2) {
            $badges[] = [
                'badge_type' => self::BADGE_COLLATERAL_VERIFIED,
                'badge_name' => 'Collateral Verified',
                'badge_description' => 'Has 2+ verified collateral assets',
                'badge_icon' => 'lock',
                'metric_value' => $data['verified_collateral_count'],
                'threshold_value' => 2
            ];
        }
        
        // Veteran Borrower: 12+ months, 5+ loans
        if ($data['account_age_months'] >= 12 && $data['total_loans'] >= 5) {
            $badges[] = [
                'badge_type' => self::BADGE_VETERAN_BORROWER,
                'badge_name' => 'Veteran Borrower',
                'badge_description' => 'Active for 12+ months with 5+ loans',
                'badge_icon' => 'star',
                'metric_value' => $data['total_loans'],
                'threshold_value' => 5
            ];
        }
        
        // First Loan Completed
        if ($data['successful_loans'] >= 1 && $data['total_loans'] == 1) {
            $badges[] = [
                'badge_type' => self::BADGE_FIRST_LOAN_COMPLETED,
                'badge_name' => 'First Loan Completed',
                'badge_description' => 'Successfully completed first loan',
                'badge_icon' => 'flag',
                'metric_value' => 1,
                'threshold_value' => 1
            ];
        }
        
        // Credit Score Badges
        if ($data['credit_score'] >= 800) {
            $badges[] = [
                'badge_type' => self::BADGE_TRUSTED_BORROWER,
                'badge_name' => 'Trusted Borrower',
                'badge_description' => 'Achieved Elite credit score (800+)',
                'badge_icon' => 'award',
                'metric_value' => $data['credit_score'],
                'threshold_value' => 800
            ];
        }
        
        // Deactivate existing badges not in new list
        $existingBadges = $this->BorrowerBadge->find('all', [
            'conditions' => [
                'BorrowerBadge.borrower_id' => $borrowerId,
                'BorrowerBadge.is_active' => true
            ]
        ]);
        
        $existingTypes = array_column(array_map(function($b) {
            return $b['BorrowerBadge']['badge_type'];
        }, $existingBadges), 'badge_type');
        
        $newTypes = array_column($badges, 'badge_type');
        
        foreach ($existingBadges as $existing) {
            if (!in_array($existing['BorrowerBadge']['badge_type'], $newTypes)) {
                $this->BorrowerBadge->id = $existing['BorrowerBadge']['id'];
                $this->BorrowerBadge->saveField('is_active', false);
            }
        }
        
        // Award new badges
        foreach ($badges as $badge) {
            // Check if already exists and is active
            $exists = $this->BorrowerBadge->find('first', [
                'conditions' => [
                    'BorrowerBadge.borrower_id' => $borrowerId,
                    'BorrowerBadge.badge_type' => $badge['badge_type'],
                    'BorrowerBadge.is_active' => true
                ]
            ]);
            
            if (!$exists) {
                $this->BorrowerBadge->create();
                $this->BorrowerBadge->save(array_merge($badge, [
                    'borrower_id' => $borrowerId,
                    'awarded_at' => date('Y-m-d H:i:s')
                ]));
            }
        }
    }
    
    /**
     * ============================================================
     * API ENDPOINTS
     * ============================================================
     */
    
    /**
     * GET /api/credit/borrower/score/:borrowerId
     * Get borrower credit score
     */
    public function getBorrowerCreditScore() {
        $borrowerId = $this->request->params["borrowerId"] ?? null;
        
        if (!$borrowerId || !is_numeric($borrowerId)) {
            return $this->_jsonResponse(['success' => false, 'message' => 'Valid borrower ID required'], 400);
        }
        
        // Try to get existing credit record
        App::uses('BorrowerCredit', 'Model');
        $this->BorrowerCredit = new BorrowerCredit();
        
        $credit = $this->BorrowerCredit->find('first', [
            'conditions' => ['BorrowerCredit.borrower_id' => $borrowerId]
        ]);
        
        // If no record or stale (>24 hours), recalculate
        if (!$credit || $this->_isStale($credit['BorrowerCredit']['score_calculated_at'], 24)) {
            return $this->_jsonResponse($this->_calculateCreditScore($borrowerId));
        }
        
        return $this->_jsonResponse([
            'success' => true,
            'credit_score' => intval($credit['BorrowerCredit']['credit_score']),
            'credit_category' => $credit['BorrowerCredit']['credit_category'],
            'factors' => [
                'repayment_history' => floatval($credit['BorrowerCredit']['repayment_history_score']),
                'loan_completion' => floatval($credit['BorrowerCredit']['loan_completion_score']),
                'collateral_quality' => floatval($credit['BorrowerCredit']['collateral_quality_score']),
                'account_longevity' => floatval($credit['BorrowerCredit']['account_longevity_score']),
                'marketplace_reputation' => floatval($credit['BorrowerCredit']['marketplace_reputation_score'])
            ],
            'statistics' => [
                'total_loans' => intval($credit['BorrowerCredit']['total_loans']),
                'successful_loans' => intval($credit['BorrowerCredit']['successful_loans']),
                'defaulted_loans' => intval($credit['BorrowerCredit']['defaulted_loans']),
                'active_loans' => intval($credit['BorrowerCredit']['active_loans']),
                'total_borrowed' => floatval($credit['BorrowerCredit']['total_borrowed']),
                'total_repaid' => floatval($credit['BorrowerCredit']['total_repaid']),
                'repayment_rate' => floatval($credit['BorrowerCredit']['repayment_rate'])
            ],
            'last_calculated' => $credit['BorrowerCredit']['score_calculated_at']
        ]);
    }
    
    /**
     * GET /api/credit/borrower/profile/:borrowerId
     * Get borrower profile with reputation data
     */
    public function getBorrowerProfile() {
        $borrowerId = $this->request->params["borrowerId"] ?? null;
        
        if (!$borrowerId || !is_numeric($borrowerId)) {
            return $this->_jsonResponse(['success' => false, 'message' => 'Valid borrower ID required'], 400);
        }
        
        App::uses('User', 'Model');
        App::uses('BorrowerCredit', 'Model');
        App::uses('BorrowerProfile', 'Model');
        App::uses('BorrowerBadge', 'Model');
        
        $this->User = new User();
        $this->BorrowerCredit = new BorrowerCredit();
        $this->BorrowerProfile = new BorrowerProfile();
        $this->BorrowerBadge = new BorrowerBadge();
        
        // Get user
        $user = $this->User->find('first', [
            'conditions' => ['User.id' => $borrowerId],
            'fields' => ['id', 'name', 'email', 'created_at'],
            'recursive' => -1
        ]);
        
        if (!$user) {
            return $this->_jsonResponse(['success' => false, 'message' => 'User not found'], 404);
        }
        
        // Get credit data
        $credit = $this->BorrowerCredit->find('first', [
            'conditions' => ['BorrowerCredit.borrower_id' => $borrowerId]
        ]);
        
        // Get borrower profile
        $borrowerProfile = $this->BorrowerProfile->find('first', [
            'conditions' => ['BorrowerProfile.user_id' => $borrowerId]
        ]);
        
        // Get active badges
        $badges = $this->BorrowerBadge->find('all', [
            'conditions' => [
                'BorrowerBadge.borrower_id' => $borrowerId,
                'BorrowerBadge.is_active' => true
            ]
        ]);
        
        return $this->_jsonResponse([
            'success' => true,
            'borrower' => [
                'id' => $user['User']['id'],
                'name' => $user['User']['name'],
                'member_since' => $user['User']['created_at']
            ],
            'credit_score' => $credit ? intval($credit['BorrowerCredit']['credit_score']) : null,
            'credit_category' => $credit ? $credit['BorrowerCredit']['credit_category'] : null,
            'statistics' => $credit ? [
                'total_loans' => intval($credit['BorrowerCredit']['total_loans']),
                'successful_loans' => intval($credit['BorrowerCredit']['successful_loans']),
                'defaulted_loans' => intval($credit['BorrowerCredit']['defaulted_loans']),
                'active_loans' => intval($credit['BorrowerCredit']['active_loans']),
                'repayment_rate' => floatval($credit['BorrowerCredit']['repayment_rate']),
                'collateral_count' => intval($credit['BorrowerCredit']['collateral_count']),
                'verified_collateral_count' => intval($credit['BorrowerCredit']['verified_collateral_count']),
                'account_age_months' => intval($credit['BorrowerCredit']['account_age_months'])
            ] : null,
            'badges' => array_map(function($b) {
                return [
                    'type' => $b['BorrowerBadge']['badge_type'],
                    'name' => $b['BorrowerBadge']['badge_name'],
                    'description' => $b['BorrowerBadge']['badge_description'],
                    'icon' => $b['BorrowerBadge']['badge_icon'],
                    'awarded_at' => $b['BorrowerBadge']['awarded_at']
                ];
            }, $badges),
            'business_info' => $borrowerProfile ? [
                'business_name' => $borrowerProfile['BorrowerProfile']['business_name'],
                'business_type' => $borrowerProfile['BorrowerProfile']['business_type'],
                'annual_revenue' => floatval($borrowerProfile['BorrowerProfile']['annual_revenue'] ?? 0),
                'income_verified' => $borrowerProfile['BorrowerProfile']['income_verified']
            ] : null
        ]);
    }
    
    /**
     * GET /api/credit/borrower/repayment-history/:borrowerId
     * Get borrower repayment history
     */
    public function getBorrowerRepaymentHistory() {
        $borrowerId = $this->request->params["borrowerId"] ?? null;
        
        if (!$borrowerId || !is_numeric($borrowerId)) {
            return $this->_jsonResponse(['success' => false, 'message' => 'Valid borrower ID required'], 400);
        }
        
        $page = intval($this->request->query["page"] ?? 1);
        $limit = intval($this->request->query["limit"] ?? 20);
        
        App::uses('BorrowerRepaymentHistory', 'Model');
        App::uses('LoanRequest', 'Model');
        
        $this->BorrowerRepaymentHistory = new BorrowerRepaymentHistory();
        $this->LoanRequest = new LoanRequest();
        
        $history = $this->BorrowerRepaymentHistory->find('all', [
            'conditions' => ['BorrowerRepaymentHistory.borrower_id' => $borrowerId],
            'order' => ['BorrowerRepaymentHistory.due_date' => 'DESC'],
            'limit' => $limit,
            'page' => $page
        ]);
        
        $total = $this->BorrowerRepaymentHistory->find('count', [
            'conditions' => ['BorrowerRepaymentHistory.borrower_id' => $borrowerId]
        ]);
        
        // Get loan info for each payment
        $result = [];
        foreach ($history as $h) {
            $loan = $this->LoanRequest->find('first', [
                'conditions' => ['LoanRequest.id' => $h['BorrowerRepaymentHistory']['loan_id']],
                'fields' => ['id', 'title', 'loan_amount', 'duration_months'],
                'recursive' => -1
            ]);
            
            $result[] = [
                'loan_id' => $h['BorrowerRepaymentHistory']['loan_id'],
                'loan_title' => $loan ? $loan['LoanRequest']['title'] : 'Unknown',
                'loan_amount' => $loan ? floatval($loan['LoanRequest']['loan_amount']) : 0,
                'payment_number' => $h['BorrowerRepaymentHistory']['payment_number'],
                'amount_due' => floatval($h['BorrowerRepaymentHistory']['amount_due']),
                'amount_paid' => floatval($h['BorrowerRepaymentHistory']['amount_paid']),
                'status' => $h['BorrowerRepaymentHistory']['status'],
                'due_date' => $h['BorrowerRepaymentHistory']['due_date'],
                'paid_at' => $h['BorrowerRepaymentHistory']['paid_at'],
                'days_late' => intval($h['BorrowerRepaymentHistory']['days_late'])
            ];
        }
        
        return $this->_jsonResponse([
            'success' => true,
            'history' => $result,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'pages' => ceil($total / $limit)
            ]
        ]);
    }
    
    /**
     * GET /api/credit/borrower/badges/:borrowerId
     * Get borrower reputation badges
     */
    public function getBorrowerBadges() {
        $borrowerId = $this->request->params["borrowerId"] ?? null;
        
        if (!$borrowerId || !is_numeric($borrowerId)) {
            return $this->_jsonResponse(['success' => false, 'message' => 'Valid borrower ID required'], 400);
        }
        
        App::uses('BorrowerBadge', 'Model');
        $this->BorrowerBadge = new BorrowerBadge();
        
        $badges = $this->BorrowerBadge->find('all', [
            'conditions' => [
                'BorrowerBadge.borrower_id' => $borrowerId,
                'BorrowerBadge.is_active' => true
            ],
            'order' => ['BorrowerBadge.awarded_at' => 'DESC']
        ]);
        
        return $this->_jsonResponse([
            'success' => true,
            'badges' => array_map(function($b) {
                return [
                    'type' => $b['BorrowerBadge']['badge_type'],
                    'name' => $b['BorrowerBadge']['badge_name'],
                    'description' => $b['BorrowerBadge']['badge_description'],
                    'icon' => $b['BorrowerBadge']['badge_icon'],
                    'metric_value' => floatval($b['BorrowerBadge']['metric_value']),
                    'awarded_at' => $b['BorrowerBadge']['awarded_at']
                ];
            }, $badges),
            'count' => count($badges)
        ]);
    }
    
    /**
     * POST /api/credit/borrower/calculate
     * Calculate/Recalculate credit score
     */
    public function calculateCreditScore() {
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(['success' => false, 'message' => 'Unauthorized'], 401);
        }
        
        return $this->_jsonResponse($this->_calculateCreditScore($userId));
    }
    
    /**
     * GET /api/credit/signals/:borrowerId/:loanId
     * Get reputation signals for a loan
     */
    public function getReputationSignals() {
        $borrowerId = $this->request->params["borrowerId"] ?? null;
        $loanId = $this->request->params["loanId"] ?? null;
        
        if (!$borrowerId || !is_numeric($borrowerId)) {
            return $this->_jsonResponse(['success' => false, 'message' => 'Valid borrower ID required'], 400);
        }
        
        App::uses('BorrowerCredit', 'Model');
        App::uses('LoanRequest', 'Model');
        
        $this->BorrowerCredit = new BorrowerCredit();
        $this->LoanRequest = new LoanRequest();
        
        // Get credit score
        $credit = $this->BorrowerCredit->find('first', [
            'conditions' => ['BorrowerCredit.borrower_id' => $borrowerId]
        ]);
        
        if (!$credit) {
            return $this->_jsonResponse(['success' => false, 'message' => 'No credit data found'], 404);
        }
        
        $creditScore = intval($credit['BorrowerCredit']['credit_score']);
        $repaymentRate = floatval($credit['BorrowerCredit']['repayment_rate']);
        
        // Get loan info if provided
        $offeredRate = null;
        $marketAverageRate = 12.0; // Default market average
        
        if ($loanId) {
            $loan = $this->LoanRequest->find('first', [
                'conditions' => ['LoanRequest.id' => $loanId]
            ]);
            
            if ($loan) {
                $offeredRate = floatval($loan['LoanRequest']['interest_rate']);
            }
        }
        
        // Generate signals
        $signals = [];
        
        if ($creditScore >= 720 && $offeredRate && $offeredRate > $marketAverageRate) {
            $signals[] = [
                'type' => 'high_reputation_high_rate',
                'strength' => 'strong',
                'message' => 'Strong opportunity: High credit score borrower offering above-market rate',
                'recommendation' => 'This borrower\'s excellent credit history may justify the higher rate'
            ];
        } elseif ($creditScore >= 720 && $offeredRate && $offeredRate <= $marketAverageRate) {
            $signals[] = [
                'type' => 'high_reputation_low_rate',
                'strength' => 'moderate',
                'message' => 'Conservative borrower: High credit score with competitive rate',
                'recommendation' => 'Lower risk but potentially lower returns'
            ];
        } elseif ($creditScore < 580 && $offeredRate && $offeredRate > $marketAverageRate) {
            $signals[] = [
                'type' => 'low_reputation_high_rate',
                'strength' => 'weak',
                'message' => 'High risk: Lower credit score with high interest rate',
                'recommendation' => 'The offered rate may not adequately compensate for the risk'
            ];
        } elseif ($creditScore < 580 && $offeredRate && $offeredRate <= $marketAverageRate) {
            $signals[] = [
                'type' => 'low_reputation_low_rate',
                'strength' => 'moderate',
                'message' => 'Conservative pricing: Lower credit score with competitive rate',
                'recommendation' => 'Borrower may be building credit - verify collateral'
            ];
        }
        
        // Add performance signal
        if ($repaymentRate >= 95) {
            $signals[] = [
                'type' => 'consistent_performance',
                'strength' => 'strong',
                'message' => 'Excellent repayment track record',
                'recommendation' => '95%+ repayment rate indicates reliability'
            ];
        }
        
        // New borrower signal
        if (intval($credit['BorrowerCredit']['total_loans']) < 3) {
            $signals[] = [
                'type' => 'new_borrower',
                'strength' => 'moderate',
                'message' => 'New to LENDA platform',
                'recommendation' => 'Limited history - consider starting with smaller investments'
            ];
        }
        
        return $this->_jsonResponse([
            'success' => true,
            'borrower_id' => $borrowerId,
            'loan_id' => $loanId,
            'credit_score' => $creditScore,
            'credit_category' => $credit['BorrowerCredit']['credit_category'],
            'repayment_rate' => $repaymentRate,
            'offered_rate' => $offeredRate,
            'signals' => $signals
        ]);
    }
    
    /**
     * GET /api/credit/admin/monitoring
     * Admin credit monitoring dashboard
     */
    public function getCreditMonitoringDashboard() {
        $userId = $this->_getCurrentUserId();
        if (!$userId || !$this->_isAdmin($userId)) {
            return $this->_jsonResponse(['success' => false, 'message' => 'Admin access required'], 403);
        }
        
        App::uses('BorrowerCredit', 'Model');
        App::uses('LoanRequest', 'Model');
        
        $this->BorrowerCredit = new BorrowerCredit();
        $this->LoanRequest = new LoanRequest();
        
        // Get all credit records
        $allCredit = $this->BorrowerCredit->find('all');
        
        if (empty($allCredit)) {
            return $this->_jsonResponse([
                'success' => true,
                'summary' => [
                    'total_borrowers' => 0,
                    'average_credit_score' => 0,
                    'average_repayment_rate' => 0,
                    'category_breakdown' => [],
                    'default_rate' => 0,
                    'tier_performance' => []
                ]
            ]);
        }
        
        // Calculate averages
        $totalBorrowers = count($allCredit);
        $totalScore = 0;
        $totalRepaymentRate = 0;
        $categoryCounts = [
            'elite' => 0,
            'excellent' => 0,
            'good' => 0,
            'fair' => 0,
            'weak' => 0,
            'high_risk' => 0
        ];
        $categoryDefaults = [
            'elite' => 0,
            'excellent' => 0,
            'good' => 0,
            'fair' => 0,
            'weak' => 0,
            'high_risk' => 0
        ];
        $categoryTotals = [
            'elite' => 0,
            'excellent' => 0,
            'good' => 0,
            'fair' => 0,
            'weak' => 0,
            'high_risk' => 0
        ];
        
        foreach ($allCredit as $credit) {
            $totalScore += intval($credit['BorrowerCredit']['credit_score']);
            $totalRepaymentRate += floatval($credit['BorrowerCredit']['repayment_rate']);
            
            $category = $credit['BorrowerCredit']['credit_category'];
            $categoryCounts[$category]++;
            $categoryTotals[$category]++;
            
            if (intval($credit['BorrowerCredit']['defaulted_loans']) > 0) {
                $categoryDefaults[$category]++;
            }
        }
        
        // Calculate category default rates
        $categoryDefaultRates = [];
        foreach ($categoryDefaults as $cat => $defaults) {
            $total = $categoryTotals[$cat];
            $categoryDefaultRates[$cat] = $total > 0 ? ($defaults / $total) * 100 : 0;
        }
        
        // Get loan stats
        $totalLoans = $this->LoanRequest->find('count');
        
        $totalDefaults = $this->LoanRequest->find('count', [
            'conditions' => ['LoanRequest.status' => 'defaulted']
        ]);
        
        $defaultRate = $totalLoans > 0 ? ($totalDefaults / $totalLoans) * 100 : 0;
        
        return $this->_jsonResponse([
            'success' => true,
            'summary' => [
                'total_borrowers' => $totalBorrowers,
                'average_credit_score' => round($totalScore / $totalBorrowers, 2),
                'average_repayment_rate' => round($totalRepaymentRate / $totalBorrowers, 2),
                'category_breakdown' => $categoryCounts,
                'default_rate' => round($defaultRate, 2),
                'tier_performance' => [
                    'elite' => ['count' => $categoryCounts['elite'], 'default_rate' => round($categoryDefaultRates['elite'], 2)],
                    'excellent' => ['count' => $categoryCounts['excellent'], 'default_rate' => round($categoryDefaultRates['excellent'], 2)],
                    'good' => ['count' => $categoryCounts['good'], 'default_rate' => round($categoryDefaultRates['good'], 2)],
                    'fair' => ['count' => $categoryCounts['fair'], 'default_rate' => round($categoryDefaultRates['fair'], 2)],
                    'weak' => ['count' => $categoryCounts['weak'], 'default_rate' => round($categoryDefaultRates['weak'], 2)],
                    'high_risk' => ['count' => $categoryCounts['high_risk'], 'default_rate' => round($categoryDefaultRates['high_risk'], 2)]
                ]
            ],
            'generated_at' => date('Y-m-d H:i:s')
        ]);
    }
    
    /**
     * ============================================================
     * UTILITY METHODS
     * ============================================================
     */
    
    /**
     * Check if record is stale
     */
    private function _isStale($timestamp, $hours) {
        if (!$timestamp) return true;
        
        $recordTime = strtotime($timestamp);
        $now = time();
        
        return ($now - $recordTime) > ($hours * 3600);
    }
    
    /**
     * Get current user ID from JWT token
     */
    private function _getCurrentUserId() {
        App::uses('LendaJwt', 'Lib');
        
        $headers = getallheaders();
        $auth = isset($headers['Authorization']) ? $headers['Authorization'] : '';
        
        if (empty($auth) || strpos($auth, 'Bearer ') !== 0) {
            return null;
        }
        
        $token = substr($auth, 7);
        $payload = LendaJwt::verify($token);
        
        if (!$payload) {
            return null;
        }
        
        return $payload['sub'] ?? null;
    }
    
    /**
     * Check if user is admin
     */
    private function _isAdmin($userId) {
        App::uses('User', 'Model');
        $this->User = new User();
        
        $user = $this->User->find('first', [
            'conditions' => ['User.id' => $userId],
            'fields' => ['role'],
            'recursive' => -1
        ]);
        
        return $user && $user['User']['role'] === 'admin';
    }
    
    /**
     * JSON response helper
     */
    private function _jsonResponse($data, $code = 200) {
        http_response_code($code);
        header("Content-Type: application/json");
        header("X-Content-Type-Options: nosniff");
        header("X-Frame-Options: DENY");
        header("X-XSS-Protection: 1; mode=block");
        echo json_encode($data);
        exit;
    }
}
