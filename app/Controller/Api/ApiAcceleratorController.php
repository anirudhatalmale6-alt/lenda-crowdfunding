<?php
App::uses("AppController", "Controller");

class ApiAcceleratorController extends AppController {
    use ApiBaseControllerTrait;
    
    public $name = "ApiAccelerator";
    public $uses = array(
        "LoanRequest", 
        "LoanFunding", 
        "User",
        "Notification",
        "AcceleratorSetting",
        "LoanFundingAccelerator",
        "AcceleratorLog",
        "BorrowerRateBoost",
        "InvestorNotification",
        "AcceleratorAnalytic",
        "MarketplaceFeaturedSlot"
    );
    public $layout = null;
    public $autoRender = false;
    
    /**
     * Components for security
     */
    public $components = array(
        'RateLimit' => array('className' => 'RateLimit'),
        'InputValidation' => array('className' => 'InputValidation')
    );
    
    public function beforeFilter() {
        parent::beforeFilter();
        // Allow public endpoints without authentication
        $this->Auth->allow(array(
            'getTrendingLoans', 
            'getClosingSoonLoans', 
            'getAcceleratorStatus',
            'getHotOpportunities',
            'getHighYieldOpportunities'
        ));
    }
    
    /**
     * GET /loans/trending - Get trending loans (50%+ funded)
     */
    public function getTrendingLoans() {
        // Apply rate limiting
        if (!$this->RateLimit->apply('default')) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Rate limit exceeded'), 429);
        }
        
        $trendingThreshold = $this->_getSetting('trending_threshold', 50);
        
        $loans = $this->LoanRequest->find("all", array(
            "conditions" => array(
                "LoanRequest.status" => array("approved", "funded"),
                "LoanRequest.funded_amount >=" => "ROUND(LoanRequest.loan_amount * {$trendingThreshold} / 100, 2)",
                "LoanRequest.funded_amount <" => "ROUND(LoanRequest.loan_amount * 75 / 100, 2)"
            ),
            "fields" => array(
                "LoanRequest.*",
                "(LoanRequest.funded_amount / LoanRequest.loan_amount * 100) as funding_percentage"
            ),
            "order" => array("LoanRequest.funded_amount" => "DESC"),
            "limit" => 20
        ));
        
        // Add accelerator info to each loan
        foreach ($loans as &$loan) {
            $accelerator = $this->LoanFundingAccelerator->find("first", array(
                "conditions" => array("LoanFundingAccelerator.loan_id" => $loan["LoanRequest"]["id"]),
                "fields" => array("is_trending", "is_featured", "visibility_boosted_at")
            ));
            $loan["accelerator"] = $accelerator ? $accelerator["LoanFundingAccelerator"] : null;
        }
        
        return $this->_jsonResponse(array(
            "success" => true, 
            "trending_loans" => $loans,
            "count" => count($loans)
        ));
    }
    
    /**
     * GET /loans/closing-soon - Get loans at 75%+ funding
     */
    public function getClosingSoonLoans() {
        // Apply rate limiting
        if (!$this->RateLimit->apply('default')) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Rate limit exceeded'), 429);
        }
        
        $notificationThreshold = $this->_getSetting('notification_threshold', 75);
        
        $loans = $this->LoanRequest->find("all", array(
            "conditions" => array(
                "LoanRequest.status" => array("approved", "funded"),
                "LoanRequest.funded_amount >=" => "ROUND(LoanRequest.loan_amount * {$notificationThreshold} / 100, 2)",
                "LoanRequest.funded_amount <" => "ROUND(LoanRequest.loan_amount * 90 / 100, 2)"
            ),
            "fields" => array(
                "LoanRequest.*",
                "(LoanRequest.funded_amount / LoanRequest.loan_amount * 100) as funding_percentage"
            ),
            "order" => array("funding_percentage" => "DESC"),
            "limit" => 20
        ));
        
        return $this->_jsonResponse(array(
            "success" => true, 
            "closing_soon_loans" => $loans,
            "count" => count($loans)
        ));
    }
    
    /**
     * GET /accelerator/status/{loan_id} - Get accelerator status for a loan
     */
    public function getAcceleratorStatus() {
        // Apply rate limiting
        if (!$this->RateLimit->apply('default')) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Rate limit exceeded'), 429);
        }
        
        $loanId = $this->request->params["loan_id"] ?? null;
        
        if (!$loanId || !is_numeric($loanId)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Valid loan ID required'), 400);
        }
        
        $loan = $this->LoanRequest->find("first", array(
            "conditions" => array("LoanRequest.id" => $loanId)
        ));
        
        if (!$loan) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Loan not found'), 404);
        }
        
        $fundingPercentage = $loan["LoanRequest"]["loan_amount"] > 0 
            ? round(($loan["LoanRequest"]["funded_amount"] / $loan["LoanRequest"]["loan_amount"]) * 100, 2)
            : 0;
        
        // Get accelerator record
        $accelerator = $this->LoanFundingAccelerator->find("first", array(
            "conditions" => array("LoanFundingAccelerator.loan_id" => $loanId)
        ));
        
        // Determine current stage
        $stage = "none";
        if ($fundingPercentage >= 90) {
            $stage = "almost_funded";
        } elseif ($fundingPercentage >= 75) {
            $stage = "hot";
        } elseif ($fundingPercentage >= 50) {
            $stage = "trending";
        }
        
        // Get recent logs
        $logs = $this->AcceleratorLog->find("all", array(
            "conditions" => array("AcceleratorLog.loan_id" => $loanId),
            "order" => array("AcceleratorLog.created_at" => "DESC"),
            "limit" => 10
        ));
        
        return $this->_jsonResponse(array(
            "success" => true,
            "loan_id" => $loanId,
            "funding_percentage" => $fundingPercentage,
            "stage" => $stage,
            "accelerator" => $accelerator ? $accelerator["LoanFundingAccelerator"] : null,
            "logs" => $logs,
            "thresholds" => array(
                "trending" => $this->_getSetting('trending_threshold', 50),
                "notification" => $this->_getSetting('notification_threshold', 75),
                "liquidity_pool" => $this->_getSetting('liquidity_pool_threshold', 90)
            )
        ));
    }
    
    /**
     * POST /loan/boost-rate - Borrower requests interest rate boost
     */
    public function boostRate() {
        // Apply rate limiting for write operations
        if (!$this->RateLimit->apply('write')) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Rate limit exceeded'), 429);
        }
        
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Unauthorized'), 401);
        }
        
        $loanId = $this->request->params["id"] ?? null;
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!$loanId || !is_numeric($loanId)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Valid loan ID required'), 400);
        }
        
        $newRate = floatval($data["interest_rate"] ?? 0);
        
        // Validate loan belongs to user
        $loan = $this->LoanRequest->find("first", array(
            "conditions" => array(
                "LoanRequest.id" => $loanId,
                "LoanRequest.borrower_id" => $userId
            )
        ));
        
        if (!$loan) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Loan not found or unauthorized'), 404);
        }
        
        if ($loan["LoanRequest"]["status"] !== "approved") {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Loan not available for rate boost'), 400);
        }
        
        $originalRate = floatval($loan["LoanRequest"]["interest_rate"]);
        
        // Validate rate increase
        $maxIncrease = floatval($this->_getSetting('max_rate_increase', 5));
        $minIncrease = floatval($this->_getSetting('min_rate_increase', 0.5));
        
        if ($newRate <= $originalRate) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'New rate must be higher than current rate'), 400);
        }
        
        $rateIncrease = $newRate - $originalRate;
        
        if ($rateIncrease > $maxIncrease) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Rate increase exceeds maximum allowed (' . $maxIncrease . '%)'), 400);
        }
        
        if ($rateIncrease < $minIncrease) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Rate increase must be at least ' . $minIncrease . '%'), 400);
        }
        
        // Check for existing pending boost
        $existingBoost = $this->BorrowerRateBoost->find("first", array(
            "conditions" => array(
                "BorrowerRateBoost.loan_id" => $loanId,
                "BorrowerRateBoost.status" => "pending"
            )
        ));
        
        if ($existingBoost) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'A rate boost request is already pending'), 400);
        }
        
        // Create rate boost request
        $this->BorrowerRateBoost->create();
        $boostData = array(
            "BorrowerRateBoost" => array(
                "loan_id" => $loanId,
                "borrower_id" => $userId,
                "original_rate" => $originalRate,
                "requested_rate" => $newRate,
                "rate_increase" => $rateIncrease,
                "status" => "approved", // Auto-approve for now
                "approved_at" => date("Y-m-d H:i:s"),
                "expires_at" => date("Y-m-d H:i:s", strtotime("+7 days"))
            )
        );
        
        if ($this->BorrowerRateBoost->save($boostData)) {
            // Update loan interest rate
            $this->LoanRequest->id = $loanId;
            $this->LoanRequest->saveField("interest_rate", $newRate);
            
            // Log the action
            $this->_logAcceleratorAction($loanId, 'rate_boost', $fundingPercentage ?? 0, "Rate increased from {$originalRate}% to {$newRate}%", 'borrower');
            
            // Recalculate accelerator
            $this->_updateAcceleratorStatus($loanId);
            
            return $this->_jsonResponse(array(
                "success" => true,
                "message" => "Interest rate boosted successfully",
                "original_rate" => $originalRate,
                "new_rate" => $newRate,
                "rate_increase" => $rateIncrease
            ));
        }
        
        return $this->_jsonResponse(array('success' => false, 'message' => 'Failed to boost rate'), 500);
    }
    
    /**
     * GET /accelerator/hot-opportunities - Get hot opportunities for investor dashboard
     */
    public function getHotOpportunities() {
        if (!$this->RateLimit->apply('default')) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Rate limit exceeded'), 429);
        }
        
        $threshold = $this->_getSetting('notification_threshold', 75);
        
        $loans = $this->LoanRequest->find("all", array(
            "conditions" => array(
                "LoanRequest.status" => "approved",
                "LoanRequest.funded_amount >=" => "ROUND(LoanRequest.loan_amount * {$threshold} / 100, 2)"
            ),
            "fields" => array(
                "LoanRequest.*",
                "(LoanRequest.funded_amount / LoanRequest.loan_amount * 100) as funding_percentage"
            ),
            "order" => array("funding_percentage" => "DESC"),
            "limit" => 10
        ));
        
        return $this->_jsonResponse(array(
            "success" => true,
            "hot_opportunities" => $loans,
            "count" => count($loans)
        ));
    }
    
    /**
     * GET /accelerator/high-yield - Get high yield opportunities
     */
    public function getHighYieldOpportunities() {
        if (!$this->RateLimit->apply('default')) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Rate limit exceeded'), 429);
        }
        
        // Get loans with highest interest rates that are still open
        $loans = $this->LoanRequest->find("all", array(
            "conditions" => array(
                "LoanRequest.status" => "approved",
                "LoanRequest.funded_amount <" => "LoanRequest.loan_amount"
            ),
            "fields" => array(
                "LoanRequest.*",
                "(LoanRequest.funded_amount / LoanRequest.loan_amount * 100) as funding_percentage"
            ),
            "order" => array("LoanRequest.interest_rate" => "DESC", "funding_percentage" => "ASC"),
            "limit" => 15
        ));
        
        return $this->_jsonResponse(array(
            "success" => true,
            "high_yield_opportunities" => $loans,
            "count" => count($loans)
        ));
    }
    
    /**
     * GET /accelerator/almost-funded - Get almost funded loans
     */
    public function getAlmostFundedLoans() {
        if (!$this->RateLimit->apply('default')) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Rate limit exceeded'), 429);
        }
        
        $threshold = $this->_getSetting('liquidity_pool_threshold', 90);
        
        $loans = $this->LoanRequest->find("all", array(
            "conditions" => array(
                "LoanRequest.status" => "approved",
                "LoanRequest.funded_amount >=" => "ROUND(LoanRequest.loan_amount * {$threshold} / 100, 2)",
                "LoanRequest.funded_amount <" => "LoanRequest.loan_amount"
            ),
            "fields" => array(
                "LoanRequest.*",
                "(LoanRequest.funded_amount / LoanRequest.loan_amount * 100) as funding_percentage",
                "(LoanRequest.loan_amount - LoanRequest.funded_amount) as remaining_amount"
            ),
            "order" => array("funding_percentage" => "DESC"),
            "limit" => 10
        ));
        
        return $this->_jsonResponse(array(
            "success" => true,
            "almost_funded_loans" => $loans,
            "count" => count($loans)
        ));
    }
    
    // ==================== ADMIN ENDPOINTS ====================
    
    /**
     * GET /accelerator/admin/settings - Get accelerator settings
     */
    public function adminGetSettings() {
        $userId = $this->_getCurrentUserId();
        if (!$userId || !$this->_isAdmin($userId)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Admin access required'), 403);
        }
        
        $settings = $this->AcceleratorSetting->find("all", array(
            "conditions" => array("AcceleratorSetting.is_active" => true)
        ));
        
        return $this->_jsonResponse(array(
            "success" => true,
            "settings" => $settings
        ));
    }
    
    /**
     * POST /accelerator/admin/settings - Update accelerator settings
     */
    public function adminUpdateSettings() {
        $userId = $this->_getCurrentUserId();
        if (!$userId || !$this->_isAdmin($userId)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Admin access required'), 403);
        }
        
        if (!$this->RateLimit->apply('write')) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Rate limit exceeded'), 429);
        }
        
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (empty($data["settings"]) || !is_array($data["settings"])) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Settings array required'), 400);
        }
        
        $updated = 0;
        foreach ($data["settings"] as $setting) {
            $key = $setting["key"] ?? null;
            $value = $setting["value"] ?? null;
            
            if ($key && $value !== null) {
                $existing = $this->AcceleratorSetting->find("first", array(
                    "conditions" => array("AcceleratorSetting.setting_key" => $key)
                ));
                
                if ($existing) {
                    $this->AcceleratorSetting->id = $existing["AcceleratorSetting"]["id"];
                    $this->AcceleratorSetting->saveField("setting_value", $value);
                    $updated++;
                }
            }
        }
        
        return $this->_jsonResponse(array(
            "success" => true,
            "message" => "Settings updated successfully",
            "updated_count" => $updated
        ));
    }
    
    /**
     * GET /accelerator/admin/analytics - Get accelerator analytics
     */
    public function adminGetAnalytics() {
        $userId = $this->_getCurrentUserId();
        if (!$userId || !$this->_isAdmin($userId)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Admin access required'), 403);
        }
        
        $months = isset($this->request->query['months']) ? intval($this->request->query['months']) : 6;
        
        // Get analytics data
        $analytics = $this->AcceleratorAnalytic->find("all", array(
            "order" => array("AcceleratorAnalytic.period_start" => "DESC"),
            "limit" => $months
        ));
        
        // Calculate summary
        $totalLoans = 0;
        $totalFullyFunded = 0;
        $avgFundingTime = 0;
        
        foreach ($analytics as $analytic) {
            $totalLoans += $analytic["AcceleratorAnalytic"]["total_loans"];
            $totalFullyFunded += $analytic["AcceleratorAnalytic"]["loans_fully_funded"];
            $avgFundingTime += floatval($analytic["AcceleratorAnalytic"]["average_funding_time_hours"]);
        }
        
        $avgFundingTime = count($analytics) > 0 ? $avgFundingTime / count($analytics) : 0;
        
        // Get live stats
        $trendingCount = $this->LoanRequest->find("count", array(
            "conditions" => array(
                "LoanRequest.status" => "approved",
                "LoanRequest.funded_amount >=" => "ROUND(LoanRequest.loan_amount * 50 / 100, 2)",
                "LoanRequest.funded_amount <" => "ROUND(LoanRequest.loan_amount * 75 / 100, 2)"
            )
        ));
        
        $hotCount = $this->LoanRequest->find("count", array(
            "conditions" => array(
                "LoanRequest.status" => "approved",
                "LoanRequest.funded_amount >=" => "ROUND(LoanRequest.loan_amount * 75 / 100, 2)",
                "LoanRequest.funded_amount <" => "ROUND(LoanRequest.loan_amount * 90 / 100, 2)"
            )
        ));
        
        $almostFundedCount = $this->LoanRequest->find("count", array(
            "conditions" => array(
                "LoanRequest.status" => "approved",
                "LoanRequest.funded_amount >=" => "ROUND(LoanRequest.loan_amount * 90 / 100, 2)",
                "LoanRequest.funded_amount <" => "LoanRequest.loan_amount"
            )
        ));
        
        return $this->_jsonResponse(array(
            "success" => true,
            "analytics" => $analytics,
            "summary" => array(
                "total_loans_processed" => $totalLoans,
                "total_fully_funded" => $totalFullyFunded,
                "average_funding_time_hours" => round($avgFundingTime, 2),
                "fully_funded_rate" => $totalLoans > 0 ? round(($totalFullyFunded / $totalLoans) * 100, 2) : 0
            ),
            "live_stats" => array(
                "trending_loans" => $trendingCount,
                "hot_opportunities" => $hotCount,
                "almost_funded" => $almostFundedCount
            )
        ));
    }
    
    /**
     * POST /accelerator/admin/trigger - Manually trigger accelerator for a loan
     */
    public function adminTriggerAccelerator() {
        $userId = $this->_getCurrentUserId();
        if (!$userId || !$this->_isAdmin($userId)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Admin access required'), 403);
        }
        
        if (!$this->RateLimit->apply('write')) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Rate limit exceeded'), 429);
        }
        
        $loanId = $this->request->params["id"] ?? null;
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!$loanId || !is_numeric($loanId)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Valid loan ID required'), 400);
        }
        
        $loan = $this->LoanRequest->find("first", array(
            "conditions" => array("LoanRequest.id" => $loanId)
        ));
        
        if (!$loan) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Loan not found'), 404);
        }
        
        $action = $data["action"] ?? "refresh";
        
        // Update accelerator status
        $result = $this->_updateAcceleratorStatus($loanId);
        
        $this->_logAcceleratorAction($loanId, $action, 0, "Manually triggered by admin", 'admin');
        
        return $this->_jsonResponse(array(
            "success" => true,
            "message" => "Accelerator triggered successfully",
            "result" => $result
        ));
    }
    
    // ==================== PRIVATE HELPER METHODS ====================
    
    /**
     * Get a setting value
     */
    private function _getSetting($key, $default = null) {
        $setting = $this->AcceleratorSetting->find("first", array(
            "conditions" => array(
                "AcceleratorSetting.setting_key" => $key,
                "AcceleratorSetting.is_active" => true
            )
        ));
        
        return $setting ? $setting["AcceleratorSetting"]["setting_value"] : $default;
    }
    
    /**
     * Update accelerator status for a loan
     */
    private function _updateAcceleratorStatus($loanId) {
        $loan = $this->LoanRequest->find("first", array(
            "conditions" => array("LoanRequest.id" => $loanId)
        ));
        
        if (!$loan) {
            return false;
        }
        
        $totalAmount = floatval($loan["LoanRequest"]["loan_amount"]);
        $fundedAmount = floatval($loan["LoanRequest"]["funded_amount"]);
        $fundingPercentage = $totalAmount > 0 ? round(($fundedAmount / $totalAmount) * 100, 2) : 0;
        
        // Get thresholds
        $trendingThreshold = floatval($this->_getSetting('trending_threshold', 50));
        $notificationThreshold = floatval($this->_getSetting('notification_threshold', 75));
        $liquidityPoolThreshold = floatval($this->_getSetting('liquidity_pool_threshold', 90));
        
        // Get or create accelerator record
        $accelerator = $this->LoanFundingAccelerator->find("first", array(
            "conditions" => array("LoanFundingAccelerator.loan_id" => $loanId)
        ));
        
        if (!$accelerator) {
            $this->LoanFundingAccelerator->create();
            $this->LoanFundingAccelerator->save(array(
                "loan_id" => $loanId,
                "total_amount" => $totalAmount,
                "funded_amount" => $fundedAmount,
                "funding_percentage" => $fundingPercentage
            ));
            $acceleratorId = $this->LoanFundingAccelerator->getLastInsertID();
        } else {
            $acceleratorId = $accelerator["LoanFundingAccelerator"]["id"];
            $this->LoanFundingAccelerator->id = $acceleratorId;
            $this->LoanFundingAccelerator->save(array(
                "funded_amount" => $fundedAmount,
                "funding_percentage" => $fundingPercentage
            ));
        }
        
        // Determine new stage
        $newStage = "none";
        $isTrending = false;
        $isFeatured = false;
        
        if ($fundingPercentage >= $liquidityPoolThreshold) {
            $newStage = "almost_funded";
        } elseif ($fundingPercentage >= $notificationThreshold) {
            $newStage = "hot";
            $isFeatured = true;
        } elseif ($fundingPercentage >= $trendingThreshold) {
            $newStage = "trending";
            $isTrending = true;
        }
        
        // Check if stage changed
        $currentStage = $accelerator["LoanFundingAccelerator"]["accelerator_stage"] ?? "none";
        
        if ($newStage !== $currentStage) {
            $this->LoanFundingAccelerator->id = $acceleratorId;
            $this->LoanFundingAccelerator->saveField("accelerator_stage", $newStage);
            
            // Log stage change
            $this->_logAcceleratorAction($loanId, $newStage, $fundingPercentage, "Stage changed from {$currentStage} to {$newStage}", 'system');
            
            // Trigger notifications for certain stages
            if ($newStage === "hot" && $this->_getSetting('auto_notifications_enabled') === "true") {
                $this->_sendInvestorNotifications($loanId);
            }
        }
        
        // Update trending/featured status
        $this->LoanFundingAccelerator->id = $acceleratorId;
        $this->LoanFundingAccelerator->save(array(
            "is_trending" => $isTrending,
            "is_featured" => $isFeatured,
            "visibility_boosted_at" => $isTrending || $isFeatured ? date("Y-m-d H:i:s") : null
        ));
        
        return true;
    }
    
    /**
     * Log accelerator action
     */
    private function _logAcceleratorAction($loanId, $stage, $percentage, $details, $triggeredBy = 'system') {
        $this->AcceleratorLog->create();
        $this->AcceleratorLog->save(array(
            "loan_id" => $loanId,
            "stage_triggered" => $stage,
            "funding_percentage" => $percentage,
            "action_taken" => $details,
            "triggered_by" => $triggeredBy
        ));
    }
    
    /**
     * Send investor notifications for hot loans
     */
    private function _sendInvestorNotifications($loanId) {
        $loan = $this->LoanRequest->find("first", array(
            "conditions" => array("LoanRequest.id" => $loanId)
        ));
        
        if (!$loan) {
            return false;
        }
        
        // Get lenders who might be interested
        $lenders = $this->User->find("all", array(
            "conditions" => array(
                "User.role" => array("lender", "both"),
                "User.status" => "active"
            ),
            "fields" => array("id", "email", "name")
        ));
        
        $notificationThreshold = floatval($this->_getSetting('notification_threshold', 75));
        $fundingPercentage = ($loan["LoanRequest"]["funded_amount"] / $loan["LoanRequest"]["loan_amount"]) * 100;
        
        $title = "🔥 Hot Investment Opportunity!";
        $message = "A loan offering " . $loan["LoanRequest"]["interest_rate"] . "% return is " . round($fundingPercentage) . "% funded and closing soon. Don't miss out!";
        
        foreach ($lenders as $lender) {
            // Create in-app notification
            $this->Notification->create();
            $this->Notification->save(array(
                "user_id" => $lender["User"]["id"],
                "type" => "loan_alert",
                "title" => $title,
                "message" => $message,
                "data" => json_encode(array("loan_id" => $loanId))
            ));
            
            // Queue email notification
            $this->InvestorNotification->create();
            $this->InvestorNotification->save(array(
                "loan_id" => $loanId,
                "user_id" => $lender["User"]["id"],
                "notification_type" => "email",
                "title" => $title,
                "message" => $message
            ));
            
            $this->InvestorNotification->create();
            $this->InvestorNotification->save(array(
                "loan_id" => $loanId,
                "user_id" => $lender["User"]["id"],
                "notification_type" => "in_app",
                "title" => $title,
                "message" => $message
            ));
        }
        
        // Mark notification as sent in accelerator
        $accelerator = $this->LoanFundingAccelerator->find("first", array(
            "conditions" => array("LoanFundingAccelerator.loan_id" => $loanId)
        ));
        
        if ($accelerator) {
            $this->LoanFundingAccelerator->id = $accelerator["LoanFundingAccelerator"]["id"];
            $this->LoanFundingAccelerator->saveField("notification_sent_at", date("Y-m-d H:i:s"));
        }
        
        return true;
    }
    
    /**
     * Get current user ID from JWT token
     * Uses the trait method from ApiBaseControllerTrait
     */
    private function _getCurrentUserId() {
        return parent::_getCurrentUserId();
    }
    
    /**
     * Check if user is admin
     * Uses the trait method from ApiBaseControllerTrait
     */
    private function _isAdmin($userId) {
        $user = $this->User->find("first", array(
            "conditions" => array("User.id" => $userId),
            "fields" => array("role"),
            "recursive" => -1
        ));
        
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
