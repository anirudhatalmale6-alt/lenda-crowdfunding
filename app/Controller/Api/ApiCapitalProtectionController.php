<?php
App::uses("AppController", "Controller");
App::uses('ConnectionManager', 'Core');

/**
 * LENDA Capital Protection System API Controller
 * 
 * Provides endpoints for:
 * - Reserve Status Monitoring
 * - Coverage Ratio Calculation
 * - Automatic Safety Triggers
 * - Stress Test Engine
 * - Admin Alerts
 */
class ApiCapitalProtectionController extends AppController {
    use ApiBaseControllerTrait;
    
    public $name = "ApiCapitalProtection";
    public $layout = null;
    public $autoRender = false;
    
    // System health thresholds
    const HEALTH_STRONG = 40;
    const HEALTH_HEALTHY = 25;
    const HEALTH_WARNING = 15;
    const HEALTH_CRITICAL = 10;
    
    // Safety trigger thresholds
    const TRIGGER_SLOWDOWN = 30;
    const TRIGGER_PAUSE = 20;
    const TRIGGER_EMERGENCY = 15;
    
    public function beforeFilter() {
        parent::beforeFilter();
        // Public endpoints for platform transparency
        $this->Auth->allow([
            'getReserveStatus',
            'getCoverageRatio',
            'getSystemHealth',
            'getPlatformStability'
        ]);
    }
    
    /**
     * ============================================================
     * RESERVE STATUS ENDPOINTS
     * ============================================================
     */
    
    /**
     * GET /api/capital/reserve-status
     * Get current reserve pool status
     */
    public function getReserveStatus() {
        $pools = $this->_getCapitalPools();
        
        $operational = null;
        $guarantee = null;
        $emergency = null;
        
        foreach ($pools as $pool) {
            switch ($pool['pool_type']) {
                case 'operational':
                    $operational = $pool;
                    break;
                case 'guarantee':
                    $guarantee = $pool;
                    break;
                case 'emergency':
                    $emergency = $pool;
                    break;
            }
        }
        
        $totalReserve = 
            floatval($operational['balance'] ?? 0) +
            floatval($guarantee['balance'] ?? 0) +
            floatval($emergency['balance'] ?? 0);
        
        return $this->_jsonResponse([
            'success' => true,
            'reserve_status' => [
                'operational' => [
                    'pool_type' => 'operational',
                    'name' => 'Operational Reserve',
                    'balance' => floatval($operational['balance'] ?? 0),
                    'available' => floatval($operational['available_balance'] ?? 0),
                    'locked' => floatval($operational['locked_balance'] ?? 0),
                    'minimum_required' => floatval($operational['minimum_required'] ?? 0),
                    'target' => floatval($operational['target_balance'] ?? 0),
                    'sources' => ['Transaction fees', 'Origination fees', 'Marketplace commissions']
                ],
                'guarantee' => [
                    'pool_type' => 'guarantee',
                    'name' => 'Guarantee Reserve',
                    'balance' => floatval($guarantee['balance'] ?? 0),
                    'available' => floatval($guarantee['available_balance'] ?? 0),
                    'locked' => floatval($guarantee['locked_balance'] ?? 0),
                    'minimum_required' => floatval($guarantee['minimum_required'] ?? 0),
                    'target' => floatval($guarantee['target_balance'] ?? 0),
                    'sources' => ['Loan insurance fees', 'Investor interest share', 'Collateral liquidation proceeds']
                ],
                'emergency' => [
                    'pool_type' => 'emergency',
                    'name' => 'Emergency Capital Buffer',
                    'balance' => floatval($emergency['balance'] ?? 0),
                    'available' => floatval($emergency['available_balance'] ?? 0),
                    'locked' => floatval($emergency['locked_balance'] ?? 0),
                    'minimum_required' => floatval($emergency['minimum_required'] ?? 0),
                    'target' => floatval($emergency['target_balance'] ?? 0),
                    'sources' => ['Platform profits', 'Institutional investors', 'External capital injections']
                ],
                'total' => [
                    'balance' => $totalReserve,
                    'currency' => 'USD'
                ]
            ],
            'last_updated' => date('c')
        ]);
    }
    
    /**
     * GET /api/capital/coverage-ratio
     * Get coverage ratio and loan exposure
     */
    public function getCoverageRatio() {
        $coverageData = $this->_calculateCoverageRatio();
        
        return $this->_jsonResponse([
            'success' => true,
            'coverage_ratio' => $coverageData
        ]);
    }
    
    /**
     * GET /api/capital/system-health
     * Get overall system health status
     */
    public function getSystemHealth() {
        $coverageData = $this->_calculateCoverageRatio();
        $triggers = $this->_getActiveTriggers();
        $alerts = $this->_getRecentAlerts(5);
        
        // Determine system health
        $health = 'strong';
        if ($coverageData['coverage_ratio'] < self::HEALTH_CRITICAL) {
            $health = 'critical';
        } elseif ($coverageData['coverage_ratio'] < self::HEALTH_WARNING) {
            $health = 'warning';
        } elseif ($coverageData['coverage_ratio'] < self::HEALTH_HEALTHY) {
            $health = 'healthy';
        }
        
        return $this->_jsonResponse([
            'success' => true,
            'system_health' => [
                'status' => $health,
                'coverage_ratio' => $coverageData['coverage_ratio'],
                'default_rate' => $coverageData['default_rate'],
                'collateral_coverage' => $coverageData['collateral_coverage'],
                'active_triggers' => count($triggers),
                'recent_alerts' => count($alerts),
                'last_checked' => date('c')
            ],
            'triggers' => $triggers,
            'alerts' => $alerts
        ]);
    }
    
    /**
     * GET /api/capital/platform-stability
     * Public endpoint for investor transparency
     */
    public function getPlatformStability() {
        $coverageData = $this->_calculateCoverageRatio();
        
        // Determine health status
        $health = 'Strong';
        if ($coverageData['coverage_ratio'] < self::HEALTH_CRITICAL) {
            $health = 'Critical';
        } elseif ($coverageData['coverage_ratio'] < self::HEALTH_WARNING) {
            $health = 'Warning';
        } elseif ($coverageData['coverage_ratio'] < self::HEALTH_HEALTHY) {
            $health = 'Caution';
        }
        
        return $this->_jsonResponse([
            'success' => true,
            'platform_stability' => [
                'reserve_coverage' => round($coverageData['coverage_ratio'], 1) . '%',
                'default_rate' => round($coverageData['default_rate'], 1) . '%',
                'collateral_coverage' => round($coverageData['collateral_coverage'], 1) . '%',
                'system_health' => $health,
                'guarantee_reserve' => $coverageData['guarantee_balance'],
                'outstanding_loans' => $coverageData['outstanding_guaranteed'],
                'updated_at' => date('c')
            ]
        ]);
    }
    
    /**
     * ============================================================
     * ADMIN ENDPOINTS
     * ============================================================
     */
    
    /**
     * GET /api/capital/admin/dashboard
     * Get admin capital protection dashboard
     */
    public function getAdminDashboard() {
        $userId = $this->_getCurrentUserId();
        if (!$userId || !$this->_isAdmin($userId)) {
            return $this->_jsonResponse(['success' => false, 'message' => 'Admin access required'], 403);
        }
        
        $pools = $this->_getCapitalPools();
        $coverageData = $this->_calculateCoverageRatio();
        $triggers = $this->_getActiveTriggers();
        $alerts = $this->_getRecentAlerts(10);
        
        return $this->_jsonResponse([
            'success' => true,
            'dashboard' => [
                'pools' => $pools,
                'coverage' => $coverageData,
                'triggers' => $triggers,
                'alerts' => $alerts,
                'summary' => [
                    'total_reserve' => $coverageData['total_reserve'],
                    'guarantee_coverage' => $coverageData['coverage_ratio'],
                    'default_rate' => $coverageData['default_rate'],
                    'collateral_coverage' => $coverageData['collateral_coverage'],
                    'active_loans' => $coverageData['active_loans_count'],
                    'system_health' => $coverageData['system_health']
                ]
            ]
        ]);
    }
    
    /**
     * POST /api/capital/admin/update-pool
     * Update capital pool balance
     */
    public function updatePoolBalance() {
        $userId = $this->_getCurrentUserId();
        if (!$userId || !$this->_isAdmin($userId)) {
            return $this->_jsonResponse(['success' => false, 'message' => 'Admin access required'], 403);
        }
        
        $data = json_decode(file_get_contents("php://input"), true);
        
        $poolType = $data['pool_type'] ?? null;
        $amount = floatval($data['amount'] ?? 0);
        $transactionType = $data['transaction_type'] ?? 'reserve_transfer';
        $description = $data['description'] ?? '';
        
        if (!$poolType || $amount <= 0) {
            return $this->_jsonResponse(['success' => false, 'message' => 'Valid pool type and amount required'], 400);
        }
        
        $validTypes = ['operational', 'guarantee', 'emergency'];
        if (!in_array($poolType, $validTypes)) {
            return $this->_jsonResponse(['success' => false, 'message' => 'Invalid pool type'], 400);
        }
        
        // Get database connection
        $db = ConnectionManager::getDataSource('default');
        
        // Get current pool
        $pool = $db->fetchAll("SELECT * FROM capital_pools WHERE pool_type = ?", [$poolType]);
        
        if (empty($pool)) {
            return $this->_jsonResponse(['success' => false, 'message' => 'Pool not found'], 404);
        }
        
        $currentBalance = floatval($pool[0]['capital_pools']['balance']);
        $newBalance = $currentBalance + $amount;
        
        // Update pool balance
        $db->execute("UPDATE capital_pools SET balance = ?, updated_at = NOW() WHERE pool_type = ?", 
            [$newBalance, $poolType]);
        
        // Record transaction
        $db->execute("INSERT INTO capital_pool_transactions 
            (pool_id, transaction_type, amount, balance_after, description, created_at) 
            VALUES (?, ?, ?, ?, ?, NOW())",
            [$pool[0]['capital_pools']['id'], $transactionType, $amount, $newBalance, $description]);
        
        // Recalculate triggers after update
        $this->_evaluateSafetyTriggers();
        
        return $this->_jsonResponse([
            'success' => true,
            'message' => 'Pool balance updated',
            'pool_type' => $poolType,
            'previous_balance' => $currentBalance,
            'new_balance' => $newBalance,
            'change' => $amount
        ]);
    }
    
    /**
     * POST /api/capital/admin/replenish-reserve
     * Replenish reserve from various sources
     */
    public function replenishReserve() {
        $userId = $this->_getCurrentUserId();
        if (!$userId || !$this->_isAdmin($userId)) {
            return $this->_jsonResponse(['success' => false, 'message' => 'Admin access required'], 403);
        }
        
        $data = json_decode(file_get_contents("php://input"), true);
        
        $amount = floatval($data['amount'] ?? 0);
        $source = $data['source'] ?? 'platform_profit';
        $description = $data['description'] ?? 'Reserve replenishment';
        
        if ($amount <= 0) {
            return $this->_jsonResponse(['success' => false, 'message' => 'Valid amount required'], 400);
        }
        
        $db = ConnectionManager::getDataSource('default');
        
        // Get guarantee pool
        $pool = $db->fetchAll("SELECT * FROM capital_pools WHERE pool_type = 'guarantee'");
        
        if (empty($pool)) {
            return $this->_jsonResponse(['success' => false, 'message' => 'Guarantee pool not found'], 404);
        }
        
        $currentBalance = floatval($pool[0]['capital_pools']['balance']);
        $newBalance = $currentBalance + $amount;
        
        // Update pool
        $db->execute("UPDATE capital_pools SET balance = ?, last_replenished_at = NOW(), updated_at = NOW() 
            WHERE pool_type = 'guarantee'", [$newBalance]);
        
        // Record transaction based on source
        $transactionType = in_array($source, ['platform_profit', 'institutional_injection', 'external_capital']) 
            ? $source : 'reserve_transfer';
        
        $db->execute("INSERT INTO capital_pool_transactions 
            (pool_id, transaction_type, amount, balance_after, description, created_at) 
            VALUES (?, ?, ?, ?, ?, NOW())",
            [$pool[0]['capital_pools']['id'], $transactionType, $amount, $newBalance, $description]);
        
        // Log alert
        $this->_createAlert('reserve_low', 'info', 'Reserve Replenished', 
            "Guarantee reserve replenished by $" . number_format($amount, 2));
        
        return $this->_jsonResponse([
            'success' => true,
            'message' => 'Reserve replenished successfully',
            'amount' => $amount,
            'new_balance' => $newBalance,
            'source' => $source
        ]);
    }
    
    /**
     * ============================================================
     * SAFETY TRIGGERS
     * ============================================================
     */
    
    /**
     * GET /api/capital/triggers
     * Get all safety trigger status
     */
    public function getTriggers() {
        $triggers = $this->_getActiveTriggers();
        
        return $this->_jsonResponse([
            'success' => true,
            'triggers' => $triggers
        ]);
    }
    
    /**
     * POST /api/capital/triggers/evaluate
     * Manually trigger safety evaluation
     */
    public function evaluateTriggers() {
        $userId = $this->_getCurrentUserId();
        if (!$userId || !$this->_isAdmin($userId)) {
            return $this->_jsonResponse(['success' => false, 'message' => 'Admin access required'], 403);
        }
        
        $result = $this->_evaluateSafetyTriggers();
        
        return $this->_jsonResponse([
            'success' => true,
            'message' => 'Safety triggers evaluated',
            'result' => $result
        ]);
    }
    
    /**
     * POST /api/capital/triggers/resolve/:triggerId
     * Resolve a triggered safety event
     */
    public function resolveTrigger() {
        $userId = $this->_getCurrentUserId();
        if (!$userId || !$this->_isAdmin($userId)) {
            return $this->_jsonResponse(['success' => false, 'message' => 'Admin access required'], 403);
        }
        
        $triggerId = $this->request->params["triggerId"] ?? null;
        
        if (!$triggerId || !is_numeric($triggerId)) {
            return $this->_jsonResponse(['success' => false, 'message' => 'Valid trigger ID required'], 400);
        }
        
        $db = ConnectionManager::getDataSource('default');
        
        // Update trigger
        $db->execute("UPDATE safety_triggers SET is_triggered = FALSE, triggered_at = NULL, 
            last_triggered_at = NOW(), updated_at = NOW() WHERE id = ?", [$triggerId]);
        
        // Log resolution
        $db->execute("INSERT INTO safety_trigger_log (trigger_id, action_taken, created_at) 
            VALUES (?, 'Manually resolved', NOW())", [$triggerId]);
        
        return $this->_jsonResponse([
            'success' => true,
            'message' => 'Trigger resolved',
            'trigger_id' => $triggerId
        ]);
    }
    
    /**
     * ============================================================
     * STRESS TEST ENGINE
     * ============================================================
     */
    
    /**
     * GET /api/capital/stress-tests
     * Get available stress test scenarios
     */
    public function getStressTestScenarios() {
        $db = ConnectionManager::getDataSource('default');
        
        $scenarios = $db->fetchAll("SELECT * FROM stress_test_scenarios ORDER BY is_preset DESC, default_rate ASC");
        
        $scenarioList = [];
        foreach ($scenarios as $scenario) {
            $scenarioList[] = [
                'id' => $scenario['stress_test_scenarios']['id'],
                'name' => $scenario['stress_test_scenarios']['scenario_name'],
                'description' => $scenario['stress_test_scenarios']['scenario_description'],
                'default_rate' => floatval($scenario['stress_test_scenarios']['default_rate']),
                'collateral_recovery_rate' => floatval($scenario['stress_test_scenarios']['collateral_recovery_rate']),
                'is_preset' => (bool)$scenario['stress_test_scenarios']['is_preset']
            ];
        }
        
        return $this->_jsonResponse([
            'success' => true,
            'scenarios' => $scenarioList
        ]);
    }
    
    /**
     * POST /api/capital/stress-test
     * Run a stress test simulation
     */
    public function runStressTest() {
        $userId = $this->_getCurrentUserId();
        if (!$userId || !$this->_isAdmin($userId)) {
            return $this->_jsonResponse(['success' => false, 'message' => 'Admin access required'], 403);
        }
        
        $data = json_decode(file_get_contents("php://input"), true);
        
        $scenarioId = intval($data['scenario_id'] ?? 0);
        $customDefaultRate = floatval($data['default_rate'] ?? 0);
        $customRecoveryRate = floatval($data['collateral_recovery_rate'] ?? 50);
        
        $db = ConnectionManager::getDataSource('default');
        
        // Get scenario details
        if ($scenarioId > 0) {
            $scenario = $db->fetchAll("SELECT * FROM stress_test_scenarios WHERE id = ?", [$scenarioId]);
            
            if (empty($scenario)) {
                return $this->_jsonResponse(['success' => false, 'message' => 'Scenario not found'], 404);
            }
            
            $scenarioName = $scenario[0]['stress_test_scenarios']['scenario_name'];
            $defaultRate = floatval($scenario[0]['stress_test_scenarios']['default_rate']);
            $recoveryRate = floatval($scenario[0]['stress_test_scenarios']['collateral_recovery_rate']);
        } else {
            $scenarioName = 'Custom Scenario';
            $defaultRate = $customDefaultRate;
            $recoveryRate = $customRecoveryRate;
        }
        
        // Get current data
        $coverageData = $this->_calculateCoverageRatio();
        
        // Run stress simulation
        $result = $this->_simulateStressTest(
            $defaultRate,
            $recoveryRate,
            $coverageData
        );
        
        // Save result
        $db->execute("INSERT INTO stress_test_results 
            (scenario_id, scenario_name, total_loans_affected, estimated_default_amount, 
            collateral_recovery_amount, guarantee_claim_amount, reserve_depletion, 
            reserve_after_stress, coverage_ratio_after, liquidity_impact, 
            platform_stability_score, depletion_timeline_days, recommendations, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())",
            [
                $scenarioId > 0 ? $scenarioId : null,
                $scenarioName,
                $result['total_loans_affected'],
                $result['estimated_default_amount'],
                $result['collateral_recovery'],
                $result['guarantee_claim'],
                $result['reserve_depletion'],
                $result['reserve_after'],
                $result['coverage_after'],
                $result['liquidity_impact'],
                $result['stability_score'],
                $result['depletion_days'],
                json_encode($result['recommendations'])
            ]);
        
        return $this->_jsonResponse([
            'success' => true,
            'stress_test' => [
                'scenario' => $scenarioName,
                'default_rate' => $defaultRate,
                'collateral_recovery_rate' => $recoveryRate,
                'results' => $result,
                'ran_at' => date('c')
            ]
        ]);
    }
    
    /**
     * GET /api/capital/stress-test/history
     * Get stress test history
     */
    public function getStressTestHistory() {
        $userId = $this->_getCurrentUserId();
        if (!$userId || !$this->_isAdmin($userId)) {
            return $this->_jsonResponse(['success' => false, 'message' => 'Admin access required'], 403);
        }
        
        $db = ConnectionManager::getDataSource('default');
        
        $results = $db->fetchAll("SELECT * FROM stress_test_results ORDER BY created_at DESC LIMIT 20");
        
        $history = [];
        foreach ($results as $result) {
            $history[] = [
                'id' => $result['stress_test_results']['id'],
                'scenario_name' => $result['stress_test_results']['scenario_name'],
                'default_rate' => floatval($result['stress_test_results']['default_rate']),
                'coverage_ratio_after' => floatval($result['stress_test_results']['coverage_ratio_after']),
                'reserve_depletion' => floatval($result['stress_test_results']['reserve_depletion']),
                'platform_stability_score' => floatval($result['stress_test_results']['platform_stability_score']),
                'depletion_timeline_days' => $result['stress_test_results']['depletion_timeline_days'],
                'ran_at' => $result['stress_test_results']['created_at']
            ];
        }
        
        return $this->_jsonResponse([
            'success' => true,
            'history' => $history
        ]);
    }
    
    /**
     * ============================================================
     * ALERTS SYSTEM
     * ============================================================
     */
    
    /**
     * GET /api/capital/alerts
     * Get system alerts
     */
    public function getAlerts() {
        $userId = $this->_getCurrentUserId();
        if (!$userId || !$this->_isAdmin($userId)) {
            return $this->_jsonResponse(['success' => false, 'message' => 'Admin access required'], 403);
        }
        
        $limit = intval($this->request->query["limit"] ?? 20);
        $alerts = $this->_getRecentAlerts($limit);
        
        return $this->_jsonResponse([
            'success' => true,
            'alerts' => $alerts
        ]);
    }
    
    /**
     * POST /api/capital/alerts/:alertId/resolve
     * Resolve an alert
     */
    public function resolveAlert() {
        $userId = $this->_getCurrentUserId();
        if (!$userId || !$this->_isAdmin($userId)) {
            return $this->_jsonResponse(['success' => false, 'message' => 'Admin access required'], 403);
        }
        
        $alertId = $this->request->params["alertId"] ?? null;
        
        if (!$alertId || !is_numeric($alertId)) {
            return $this->_jsonResponse(['success' => false, 'message' => 'Valid alert ID required'], 400);
        }
        
        $db = ConnectionManager::getDataSource('default');
        
        $db->execute("UPDATE system_alerts SET is_resolved = TRUE, resolved_by = ?, 
            resolved_at = NOW() WHERE id = ?", [$userId, $alertId]);
        
        return $this->_jsonResponse([
            'success' => true,
            'message' => 'Alert resolved',
            'alert_id' => $alertId
        ]);
    }
    
    /**
     * ============================================================
     * LOAN GUARANTEE MANAGEMENT
     * ============================================================
     */
    
    /**
     * POST /api/capital/guarantee/create
     * Create loan guarantee
     */
    public function createGuarantee() {
        $userId = $this->_getCurrentUserId();
        if (!$userId || !$this->_isAdmin($userId)) {
            return $this->_jsonResponse(['success' => false, 'message' => 'Admin access required'], 403);
        }
        
        $data = json_decode(file_get_contents("php://input"), true);
        
        $loanId = intval($data['loan_id'] ?? 0);
        $guaranteeAmount = floatval($data['guarantee_amount'] ?? 0);
        $guaranteeRate = floatval($data['guarantee_rate'] ?? 100);
        $coverageType = $data['coverage_type'] ?? 'full';
        
        if (!$loanId || $guaranteeAmount <= 0) {
            return $this->_jsonResponse(['success' => false, 'message' => 'Valid loan ID and amount required'], 400);
        }
        
        $db = ConnectionManager::getDataSource('default');
        
        // Check if guarantee already exists
        $existing = $db->fetchAll("SELECT id FROM loan_guarantees WHERE loan_id = ?", [$loanId]);
        
        if (!empty($existing)) {
            return $this->_jsonResponse(['success' => false, 'message' => 'Guarantee already exists for this loan'], 400);
        }
        
        // Create guarantee
        $db->execute("INSERT INTO loan_guarantees 
            (loan_id, guarantee_amount, guarantee_rate, coverage_type, status, created_at)
            VALUES (?, ?, ?, ?, 'active', NOW())",
            [$loanId, $guaranteeAmount, $guaranteeRate, $coverageType]);
        
        // Lock funds in guarantee pool
        $pool = $db->fetchAll("SELECT balance, locked_balance FROM capital_pools WHERE pool_type = 'guarantee'");
        
        if (!empty($pool)) {
            $currentBalance = floatval($pool[0]['capital_pools']['balance']);
            $currentLocked = floatval($pool[0]['capital_pools']['locked_balance']);
            
            $db->execute("UPDATE capital_pools SET locked_balance = ? WHERE pool_type = 'guarantee'",
                [$currentLocked + $guaranteeAmount]);
        }
        
        return $this->_jsonResponse([
            'success' => true,
            'message' => 'Loan guarantee created',
            'loan_id' => $loanId,
            'guarantee_amount' => $guaranteeAmount
        ]);
    }
    
    /**
     * POST /api/capital/guarantee/claim
     * File a guarantee claim
     */
    public function fileGuaranteeClaim() {
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(['success' => false, 'message' => 'Unauthorized'], 401);
        }
        
        $data = json_decode(file_get_contents("php://input"), true);
        
        $loanId = intval($data['loan_id'] ?? 0);
        $claimAmount = floatval($data['claim_amount'] ?? 0);
        $claimReason = $data['claim_reason'] ?? 'borrower_default';
        
        if (!$loanId || $claimAmount <= 0) {
            return $this->_jsonResponse(['success' => false, 'message' => 'Valid loan ID and amount required'], 400);
        }
        
        $db = ConnectionManager::getDataSource('default');
        
        // Get guarantee
        $guarantee = $db->fetchAll("SELECT * FROM loan_guarantees WHERE loan_id = ? AND status = 'active'", [$loanId]);
        
        if (empty($guarantee)) {
            return $this->_jsonResponse(['success' => false, 'message' => 'No active guarantee found'], 404);
        }
        
        $guaranteeId = $guarantee[0]['loan_guarantees']['id'];
        $maxClaim = floatval($guarantee[0]['loan_guarantees']['guarantee_amount']);
        $claimedAmount = floatval($guarantee[0]['loan_guarantees']['claimed_amount']);
        
        if ($claimedAmount + $claimAmount > $maxClaim) {
            return $this->_jsonResponse(['success' => false, 'message' => 'Claim amount exceeds guarantee limit'], 400);
        }
        
        // Create claim
        $db->execute("INSERT INTO guarantee_claims 
            (guarantee_id, loan_id, claim_amount, status, claim_reason, created_at)
            VALUES (?, ?, ?, 'pending', ?, NOW())",
            [$guaranteeId, $loanId, $claimAmount, $claimReason]);
        
        // Update guarantee
        $db->execute("UPDATE loan_guarantees SET claimed_amount = ?, claim_count = claim_count + 1 
            WHERE id = ?", [$claimedAmount + $claimAmount, $guaranteeId]);
        
        // Create alert for admin
        $this->_createAlert('default_rate_spike', 'warning', 'Guarantee Claim Filed',
            "A guarantee claim of $" . number_format($claimAmount, 2) . " has been filed for loan #$loanId");
        
        return $this->_jsonResponse([
            'success' => true,
            'message' => 'Guarantee claim submitted',
            'loan_id' => $loanId,
            'claim_amount' => $claimAmount,
            'status' => 'pending'
        ]);
    }
    
    /**
     * ============================================================
     * INTERNAL HELPER METHODS
     * ============================================================
     */
    
    /**
     * Get all capital pools
     * SEC-01 FIX: Use model layer instead of raw SQL to prevent SQL injection
     */
    private function _getCapitalPools() {
        App::uses('CapitalPool', 'Model');
        $this->CapitalPool = new CapitalPool();
        
        $pools = $this->CapitalPool->find('all', array(
            'conditions' => array('CapitalPool.is_active' => true),
            'order' => array('CapitalPool.pool_type' => 'ASC')
        ));
        
        $result = array();
        foreach ($pools as $pool) {
            $result[] = array(
                'id' => $pool['CapitalPool']['id'],
                'pool_type' => $pool['CapitalPool']['pool_type'],
                'pool_name' => $pool['CapitalPool']['pool_name'],
                'balance' => floatval($pool['CapitalPool']['balance']),
                'locked_balance' => floatval($pool['CapitalPool']['locked_balance']),
                'available_balance' => floatval($pool['CapitalPool']['balance']) - floatval($pool['CapitalPool']['locked_balance']),
                'minimum_required' => floatval($pool['CapitalPool']['minimum_required']),
                'target_balance' => floatval($pool['CapitalPool']['target_balance'])
            );
        }
        
        return $result;
    }
    
    /**
     * Calculate coverage ratio
     * SEC-01 FIX: Use model layer instead of raw SQL to prevent SQL injection
     */
    private function _calculateCoverageRatio() {
        App::uses('CapitalPool', 'Model');
        App::uses('LoanRequest', 'Model');
        App::uses('CollateralAsset', 'Model');
        App::uses('LoanGuarantee', 'Model');
        
        $this->CapitalPool = new CapitalPool();
        $this->LoanRequest = new LoanRequest();
        $this->CollateralAsset = new CollateralAsset();
        $this->LoanGuarantee = new LoanGuarantee();
        
        // Get database connection for history logging
        $db = ConnectionManager::getDataSource('default');
        
        // Get guarantee pool balance using model
        $guaranteePool = $this->CapitalPool->find('first', array(
            'conditions' => array('CapitalPool.pool_type' => 'guarantee')
        ));
        $guaranteeBalance = $guaranteePool ? floatval($guaranteePool['CapitalPool']['balance']) : 0;
        
        // Get outstanding guaranteed loans using model
        $guaranteedLoans = $this->LoanGuarantee->find('all', array(
            'fields' => array('SUM(LoanGuarantee.guarantee_amount) as total'),
            'conditions' => array(
                'LoanGuarantee.status' => 'active',
                'LoanRequest.status' => array('funded', 'active')
            ),
            'joins' => array(array(
                'table' => 'loan_requests',
                'alias' => 'LoanRequest',
                'type' => 'INNER',
                'conditions' => 'LoanGuarantee.loan_id = LoanRequest.id'
            ))
        ));
        $outstandingGuaranteed = isset($guaranteedLoans[0][0]['total']) ? floatval($guaranteedLoans[0][0]['total']) : 0;
        
        // Calculate coverage ratio
        $coverageRatio = $outstandingGuaranteed > 0 
            ? ($guaranteeBalance / $outstandingGuaranteed) * 100 
            : 100;
        
        // Get default rate using model
        $totalLoans = $this->LoanRequest->find('count', array(
            'conditions' => array('LoanRequest.status' => array('repaid', 'active', 'funded', 'defaulted'))
        ));
        $defaultedLoans = $this->LoanRequest->find('count', array(
            'conditions' => array('LoanRequest.status' => 'defaulted')
        ));
        
        $totalCount = $totalLoans ?: 1;
        $defaultRate = ($defaultedLoans / $totalCount) * 100;
        
        // Get collateral coverage using model
        $collateralValue = $this->CollateralAsset->find('first', array(
            'fields' => array('SUM(estimated_value) as total'),
            'conditions' => array('verification_status' => 'verified')
        ));
        $totalLoansValue = $this->LoanRequest->find('first', array(
            'fields' => array('SUM(loan_amount) as total'),
            'conditions' => array('status' => array('funded', 'active'))
        ));
        
        $collateralTotal = isset($collateralValue[0]['total']) ? floatval($collateralValue[0]['total']) : 0;
        $loansTotal = isset($totalLoansValue[0]['total']) ? floatval($totalLoansValue[0]['total']) : 1;
        $collateralCoverage = ($collateralTotal / $loansTotal) * 100;
        
        // Get active loans count
        $activeLoansCount = $this->LoanRequest->find('count', array(
            'conditions' => array('LoanRequest.status' => array('funded', 'active'))
        ));
        
        // Get total reserve using model
        $allPools = $this->CapitalPool->find('all', array(
            'fields' => array('SUM(balance) as total')
        ));
        $totalReserve = isset($allPools[0][0]['total']) ? floatval($allPools[0][0]['total']) : 0;
        
        // Determine system health
        $systemHealth = 'strong';
        if ($coverageRatio < self::HEALTH_CRITICAL) {
            $systemHealth = 'critical';
        } elseif ($coverageRatio < self::HEALTH_WARNING) {
            $systemHealth = 'warning';
        } elseif ($coverageRatio < self::HEALTH_HEALTHY) {
            $systemHealth = 'healthy';
        }
        
        // Save to history
        $db->execute("INSERT INTO coverage_ratio_history 
            (guarantee_pool_balance, outstanding_guaranteed_loans, coverage_ratio, 
            operational_pool_balance, emergency_pool_balance, total_reserve, 
            default_rate, collateral_coverage, system_health, calculated_at)
            SELECT 
                ?,
                ?,
                ?,
                COALESCE((SELECT balance FROM capital_pools WHERE pool_type = 'operational'), 0),
                COALESCE((SELECT balance FROM capital_pools WHERE pool_type = 'emergency'), 0),
                ?,
                ?,
                ?,
                ?,
                NOW()",
            [$guaranteeBalance, $outstandingGuaranteed, $coverageRatio, 
             $totalReserve, $defaultRate, $collateralCoverage, $systemHealth]);
        
        return array(
            'guarantee_balance' => $guaranteeBalance,
            'outstanding_guaranteed' => $outstandingGuaranteed,
            'coverage_ratio' => round($coverageRatio, 2),
            'default_rate' => round($defaultRate, 2),
            'collateral_coverage' => round($collateralCoverage, 2),
            'active_loans_count' => $activeLoansCount,
            'total_reserve' => $totalReserve,
            'system_health' => $systemHealth
        );
    }
    
    /**
     * Get active safety triggers
     */
    private function _getActiveTriggers() {
        $db = ConnectionManager::getDataSource('default');
        
        // First evaluate triggers
        $this->_evaluateSafetyTriggers();
        
        $triggers = $db->fetchAll("SELECT * FROM safety_triggers WHERE is_active = TRUE ORDER BY threshold_value ASC");
        
        $result = [];
        foreach ($triggers as $trigger) {
            $result[] = [
                'id' => $trigger['safety_triggers']['id'],
                'name' => $trigger['safety_triggers']['trigger_name'],
                'type' => $trigger['safety_triggers']['trigger_type'],
                'threshold' => floatval($trigger['safety_triggers']['threshold_value']),
                'current_value' => floatval($trigger['safety_triggers']['current_value']),
                'is_triggered' => (bool)$trigger['safety_triggers']['is_triggered'],
                'triggered_at' => $trigger['safety_triggers']['triggered_at'],
                'auto_action' => $trigger['safety_triggers']['auto_action'],
                'action_description' => $trigger['safety_triggers']['action_description']
            ];
        }
        
        return $result;
    }
    
    /**
     * Evaluate and update safety triggers
     */
    private function _evaluateSafetyTriggers() {
        $coverageData = $this->_calculateCoverageRatio();
        
        $db = ConnectionManager::getDataSource('default');
        
        // Get all active triggers
        $triggers = $db->fetchAll("SELECT * FROM safety_triggers WHERE is_active = TRUE");
        
        $results = [];
        
        foreach ($triggers as $trigger) {
            $triggerId = $trigger['safety_triggers']['id'];
            $triggerType = $trigger['safety_triggers']['trigger_type'];
            $threshold = floatval($trigger['safety_triggers']['threshold_value']);
            $currentValue = 0;
            
            // Calculate current value based on trigger type
            switch ($triggerType) {
                case 'lending_slowdown':
                case 'lending_pause':
                case 'emergency_mode':
                    $currentValue = $coverageData['coverage_ratio'];
                    break;
                case 'default_rate_spike':
                    $currentValue = $coverageData['default_rate'];
                    break;
                case 'collateral_decline':
                    $currentValue = 100 - $coverageData['collateral_coverage'];
                    break;
                case 'reserve_depletion':
                    $currentValue = ($coverageData['guarantee_balance'] / max(1, $coverageData['total_reserve'])) * 100;
                    break;
            }
            
            // Check if triggered
            $isTriggered = false;
            if (in_array($triggerType, ['lending_slowdown', 'lending_pause', 'emergency_mode', 'reserve_depletion'])) {
                $isTriggered = $currentValue < $threshold;
            } else {
                $isTriggered = $currentValue > $threshold;
            }
            
            // Update trigger
            $triggeredAt = $isTriggered ? 'NOW()' : 'NULL';
            $db->execute("UPDATE safety_triggers SET current_value = ?, is_triggered = ?, 
                triggered_at = $triggeredAt, updated_at = NOW() WHERE id = ?",
                [$currentValue, $isTriggered ? 1 : 0, $triggerId]);
            
            // Log trigger event
            if ($isTriggered && !$trigger['safety_triggers']['is_triggered']) {
                $db->execute("INSERT INTO safety_trigger_log 
                    (trigger_id, trigger_name, threshold_value, actual_value, created_at)
                    VALUES (?, ?, ?, ?, NOW())",
                    [$triggerId, $trigger['safety_triggers']['trigger_name'], $threshold, $currentValue]);
                
                // Create alert
                $this->_createAlert(
                    'trigger_activated',
                    $triggerType === 'emergency_mode' ? 'critical' : 'warning',
                    'Safety Trigger Activated: ' . $trigger['safety_triggers']['trigger_name'],
                    "Trigger {$trigger['safety_triggers']['trigger_name']} has been activated. " .
                    "Current value: $currentValue%, Threshold: $threshold%"
                );
            }
            
            $results[] = [
                'id' => $triggerId,
                'type' => $triggerType,
                'current_value' => $currentValue,
                'threshold' => $threshold,
                'is_triggered' => $isTriggered
            ];
        }
        
        return $results;
    }
    
    /**
     * Get recent alerts
     */
    private function _getRecentAlerts($limit = 10) {
        $db = ConnectionManager::getDataSource('default');
        
        $alerts = $db->fetchAll("SELECT * FROM system_alerts ORDER BY created_at DESC LIMIT ?", [$limit]);
        
        $result = [];
        foreach ($alerts as $alert) {
            $result[] = [
                'id' => $alert['system_alerts']['id'],
                'type' => $alert['system_alerts']['alert_type'],
                'severity' => $alert['system_alerts']['severity'],
                'title' => $alert['system_alerts']['title'],
                'message' => $alert['system_alerts']['message'],
                'is_resolved' => (bool)$alert['system_alerts']['is_resolved'],
                'created_at' => $alert['system_alerts']['created_at']
            ];
        }
        
        return $result;
    }
    
    /**
     * Create system alert
     */
    private function _createAlert($type, $severity, $title, $message) {
        $db = ConnectionManager::getDataSource('default');
        
        $db->execute("INSERT INTO system_alerts 
            (alert_type, severity, title, message, created_at)
            VALUES (?, ?, ?, ?, NOW())",
            [$type, $severity, $title, $message]);
        
        // Get admin users
        $admins = $db->fetchAll("SELECT id FROM users WHERE role = 'admin' AND status = 'active'");
        
        // Get alert ID
        $alertId = $db->fetchAll("SELECT LAST_INSERT_ID() as id");
        $alertId = $alertId[0][0]['id'];
        
        // Create recipients
        foreach ($admins as $admin) {
            $db->execute("INSERT INTO alert_recipients 
                (alert_id, user_id, notification_type, created_at)
                VALUES (?, ?, 'dashboard', NOW())",
                [$alertId, $admin['users']['id']]);
        }
    }
    
    /**
     * Simulate stress test
     */
    private function _simulateStressTest($defaultRate, $recoveryRate, $currentData) {
        $totalLoans = floatval($currentData['outstanding_guaranteed']);
        $guaranteeBalance = floatval($currentData['guarantee_balance']);
        $collateralTotal = floatval($currentData['collateral_coverage']) * $totalLoans / 100;
        
        // Calculate affected loans
        $loansAffected = $totalLoans * ($defaultRate / 100);
        
        // Calculate default amount
        $defaultAmount = $loansAffected;
        
        // Calculate collateral recovery
        $collateralRecovery = $collateralTotal * ($recoveryRate / 100) * ($defaultRate / 100);
        
        // Calculate guarantee claim
        $guaranteeClaim = max(0, $defaultAmount - $collateralRecovery);
        
        // Calculate reserve depletion
        $reserveDepletion = min($guaranteeClaim, $guaranteeBalance);
        $reserveAfter = max(0, $guaranteeBalance - $reserveDepletion);
        
        // Calculate new coverage ratio
        $coverageAfter = $totalLoans > 0 ? ($reserveAfter / $totalLoans) * 100 : 100;
        
        // Calculate liquidity impact
        $liquidityImpact = $guaranteeClaim;
        
        // Calculate stability score (0-100)
        $stabilityScore = 100;
        if ($coverageAfter < 40) $stabilityScore -= 30;
        if ($coverageAfter < 25) $stabilityScore -= 30;
        if ($coverageAfter < 15) $stabilityScore -= 40;
        
        // Calculate depletion timeline (days until reserve exhausted)
        $dailyClaimRate = $guaranteeClaim / 365; // Assume claims spread over a year
        $dailyIncome = 5000; // Approximate daily fee income
        $depletionDays = $dailyIncome > 0 ? intval($reserveAfter / ($dailyClaimRate - $dailyIncome)) : 365;
        if ($dailyClaimRate <= $dailyIncome) $depletionDays = 0;
        
        // Generate recommendations
        $recommendations = [];
        
        if ($coverageAfter < self::HEALTH_CRITICAL) {
            $recommendations[] = 'URGENT: Activate emergency capital buffer';
            $recommendations[] = 'Pause all new loan originations';
            $recommendations[] = 'Contact institutional investors for capital injection';
        } elseif ($coverageAfter < self::HEALTH_WARNING) {
            $recommendations[] = 'Reduce maximum loan approval amounts by 50%';
            $recommendations[] = 'Increase collateral requirements';
            $recommendations[] = 'Launch reserve replenishment campaign';
        } elseif ($coverageAfter < self::HEALTH_HEALTHY) {
            $recommendations[] = 'Monitor coverage ratio closely';
            $recommendations[] = 'Gradually increase reserve contributions';
        }
        
        if ($defaultRate > 15) {
            $recommendations[] = 'Tighten borrower eligibility criteria';
            $recommendations[] = 'Implement additional risk assessments';
        }
        
        if ($recoveryRate < 40) {
            $recommendations[] = 'Review collateral valuation methodology';
            $recommendations[] = 'Improve collateral liquidation process';
        }
        
        return [
            'total_loans_affected' => round($loansAffected, 2),
            'estimated_default_amount' => round($defaultAmount, 2),
            'collateral_recovery' => round($collateralRecovery, 2),
            'guarantee_claim' => round($guaranteeClaim, 2),
            'reserve_depletion' => round($reserveDepletion, 2),
            'reserve_after' => round($reserveAfter, 2),
            'coverage_after' => round($coverageAfter, 2),
            'liquidity_impact' => round($liquidityImpact, 2),
            'stability_score' => max(0, round($stabilityScore, 2)),
            'depletion_days' => max(0, $depletionDays),
            'recommendations' => $recommendations
        ];
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
