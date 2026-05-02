<?php
App::uses("AppController", "Controller");
App::uses('ConnectionManager', 'Core');

class ApiRevenueController extends AppController {
    use ApiBaseControllerTrait;
    
    public $name = "ApiRevenue";
    public $layout = null;
    public $autoRender = false;
    
    /**
     * Components for security
     */
    public $components = array(
        'RateLimit' => array('className' => 'RateLimit')
    );
    
    public function beforeFilter() {
        parent::beforeFilter();
        // Allow public endpoints without authentication for fee config
        $this->Auth->allow(array('feeConfig', 'calculateFee'));
    }
    
    /**
     * GET /platform/fee-config - Get all fee configurations
     */
    public function feeConfig() {
        $db = $this->_getDb();
        
        $query = "SELECT * FROM platform_fee_config WHERE is_active = 1";
        $results = $db->query($query);
        
        $fees = array();
        foreach ($results as $row) {
            $feeType = $row['platform_fee_config']['fee_type'];
            $fees[$feeType] = array(
                'percentage' => floatval($row['platform_fee_config']['percentage']),
                'fixed_amount' => floatval($row['platform_fee_config']['fixed_amount']),
                'min_amount' => floatval($row['platform_fee_config']['min_amount']),
                'max_amount' => floatval($row['platform_fee_config']['max_amount']),
                'description' => $row['platform_fee_config']['description']
            );
        }
        
        return $this->_jsonResponse(array(
            'success' => true,
            'fee_config' => $fees
        ));
    }
    
    /**
     * POST /platform/update-fees - Update fee configurations (Admin only)
     */
    public function updateFees() {
        $userId = $this->_requireAdmin();
        if (!$userId) {
            return $this->_errorResponse('Admin access required', 403);
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($data['fees']) || !is_array($data['fees'])) {
            return $this->_errorResponse('Fees array is required', 400);
        }
        
        $db = $this->_getDb();
        $this->_beginTransaction();
        
        try {
            foreach ($data['fees'] as $feeType => $feeData) {
                $percentage = floatval($feeData['percentage'] ?? 0);
                $fixedAmount = floatval($feeData['fixed_amount'] ?? 0);
                
                // Validate fee type
                $allowedTypes = array('origination_fee', 'investor_service_fee', 'trading_fee', 'escrow_fee', 'liquidation_commission');
                if (!in_array($feeType, $allowedTypes)) {
                    throw new Exception("Invalid fee type: " . $feeType);
                }
                
                // Validate percentage range
                if ($percentage < 0 || $percentage > 100) {
                    throw new Exception("Percentage must be between 0 and 100 for " . $feeType);
                }
                
                $query = "UPDATE platform_fee_config 
                          SET percentage = " . $db->escape($percentage) . ", 
                              fixed_amount = " . $db->escape($fixedAmount) . ",
                              updated_by = " . $db->escape($userId) . ",
                              updated_at = NOW() 
                          WHERE fee_type = " . $db->escape($feeType);
                
                $db->query($query);
            }
            
            $this->_commit();
            
            // Log the action
            $this->_logFeeChange($userId, $data['fees']);
            
            return $this->_successResponse(null, 'Fee configuration updated successfully');
            
        } catch (Exception $e) {
            $this->_rollback();
            return $this->_errorResponse($e->getMessage(), 400);
        }
    }
    
    /**
     * GET /platform/revenue-summary - Get revenue summary
     */
    public function revenueSummary() {
        // Allow both authenticated users and admins
        $userId = $this->_getCurrentUserId();
        
        $period = $this->request->query['period'] ?? 'all';
        $startDate = $this->request->query['start_date'] ?? null;
        $endDate = $this->request->query['end_date'] ?? null;
        
        $db = $this->_getDb();
        
        // Build date condition
        $dateCondition = "";
        if ($period !== 'all') {
            switch ($period) {
                case 'today':
                    $dateCondition = " AND DATE(collected_at) = CURDATE()";
                    break;
                case 'week':
                    $dateCondition = " AND collected_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
                    break;
                case 'month':
                    $dateCondition = " AND collected_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
                    break;
                case 'year':
                    $dateCondition = " AND collected_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)";
                    break;
            }
        } elseif ($startDate && $endDate) {
            $dateCondition = " AND DATE(collected_at) BETWEEN " . $db->escape($startDate) . " AND " . $db->escape($endDate);
        }
        
        // Get summary by revenue type
        $query = "SELECT 
                    revenue_type, 
                    SUM(amount) as total_amount, 
                    COUNT(*) as transaction_count 
                  FROM platform_revenue 
                  WHERE status = 'collected'" . $dateCondition . "
                  GROUP BY revenue_type";
        
        $results = $db->query($query);
        
        $summary = array(
            'loan_origination' => array('amount' => 0, 'count' => 0),
            'investor_service' => array('amount' => 0, 'count' => 0),
            'secondary_market_trading' => array('amount' => 0, 'count' => 0),
            'escrow_service' => array('amount' => 0, 'count' => 0),
            'liquidation_commission' => array('amount' => 0, 'count' => 0)
        );
        
        foreach ($results as $row) {
            $type = $row['platform_revenue']['revenue_type'];
            $summary[$type] = array(
                'amount' => floatval($row['platform_revenue']['total_amount']),
                'count' => intval($row['platform_revenue']['transaction_count'])
            );
        }
        
        // Calculate total
        $totalRevenue = 0;
        $totalTransactions = 0;
        foreach ($summary as $type => $data) {
            $totalRevenue += $data['amount'];
            $totalTransactions += $data['count'];
        }
        
        return $this->_jsonResponse(array(
            'success' => true,
            'summary' => array(
                'by_type' => $summary,
                'total_revenue' => $totalRevenue,
                'total_transactions' => $totalTransactions,
                'period' => $period,
                'start_date' => $startDate,
                'end_date' => $endDate
            )
        ));
    }
    
    /**
     * GET /platform/revenue-history - Get revenue history with pagination
     */
    public function revenueHistory() {
        $page = isset($this->request->query['page']) ? intval($this->request->query['page']) : 1;
        $limit = isset($this->request->query['limit']) ? intval($this->request->query['limit']) : 20;
        $type = $this->request->query['type'] ?? null;
        
        // Validate pagination
        $page = max(1, $page);
        $limit = min(max(1, $limit), 100);
        $offset = ($page - 1) * $limit;
        
        $db = $this->_getDb();
        
        // Build WHERE clause
        $where = "WHERE status = 'collected'";
        if ($type) {
            $where .= " AND revenue_type = " . $db->escape($type);
        }
        
        // Get total count
        $countQuery = "SELECT COUNT(*) as total FROM platform_revenue " . $where;
        $countResult = $db->query($countQuery);
        $total = intval($countResult[0][0]['total']);
        
        // Get paginated results
        $query = "SELECT 
                    id, revenue_type, amount, currency,
                    related_transaction_type, related_transaction_id,
                    loan_id, borrower_id, lender_id,
                    fee_percentage, gross_amount,
                    description, collected_at
                  FROM platform_revenue 
                  " . $where . "
                  ORDER BY collected_at DESC
                  LIMIT " . $db->escape($limit) . " OFFSET " . $db->escape($offset);
        
        $results = $db->query($query);
        
        $transactions = array();
        foreach ($results as $row) {
            $r = $row['platform_revenue'];
            $transactions[] = array(
                'id' => intval($r['id']),
                'type' => $r['revenue_type'],
                'amount' => floatval($r['amount']),
                'currency' => $r['currency'],
                'related_transaction' => array(
                    'type' => $r['related_transaction_type'],
                    'id' => intval($r['related_transaction_id'])
                ),
                'loan_id' => intval($r['loan_id']),
                'borrower_id' => intval($r['borrower_id']),
                'lender_id' => intval($r['lender_id']),
                'fee_percentage' => floatval($r['fee_percentage']),
                'gross_amount' => floatval($r['gross_amount']),
                'description' => $r['description'],
                'collected_at' => $r['collected_at']
            );
        }
        
        return $this->_paginatedResponse($transactions, $page, $limit, $total);
    }
    
    /**
     * POST /platform/record-origination-fee - Record loan origination fee
     */
    public function recordOriginationFee() {
        $userId = $this->_requireAuth();
        if (!$userId) {
            return $this->_errorResponse('Unauthorized', 401);
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Validate required fields
        $errors = $this->_validateRequired($data, array('loan_id', 'gross_amount'));
        if (!empty($errors)) {
            return $this->_errorResponse('Validation failed', 400, $errors);
        }
        
        $loanId = intval($data['loan_id']);
        $grossAmount = floatval($data['gross_amount']);
        
        // Get origination fee percentage
        $feePercentage = $this->_getFeePercentage('origination_fee');
        $feeAmount = $grossAmount * ($feePercentage / 100);
        
        return $this->_recordRevenue(array(
            'revenue_type' => 'loan_origination',
            'amount' => $feeAmount,
            'gross_amount' => $grossAmount,
            'fee_percentage' => $feePercentage,
            'loan_id' => $loanId,
            'related_transaction_type' => 'loan_funding',
            'related_transaction_id' => $loanId,
            'description' => 'Loan origination fee for loan #' . $loanId
        ));
    }
    
    /**
     * POST /platform/record-investor-fee - Record investor service fee
     */
    public function recordInvestorFee() {
        $userId = $this->_requireAuth();
        if (!$userId) {
            return $this->_errorResponse('Unauthorized', 401);
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Validate required fields
        $errors = $this->_validateRequired($data, array('lender_id', 'loan_id', 'interest_earned'));
        if (!empty($errors)) {
            return $this->_errorResponse('Validation failed', 400, $errors);
        }
        
        $lenderId = intval($data['lender_id']);
        $loanId = intval($data['loan_id']);
        $interestEarned = floatval($data['interest_earned']);
        
        // Get investor service fee percentage
        $feePercentage = $this->_getFeePercentage('investor_service_fee');
        $feeAmount = $interestEarned * ($feePercentage / 100);
        
        return $this->_recordRevenue(array(
            'revenue_type' => 'investor_service',
            'amount' => $feeAmount,
            'gross_amount' => $interestEarned,
            'fee_percentage' => $feePercentage,
            'loan_id' => $loanId,
            'lender_id' => $lenderId,
            'related_transaction_type' => 'repayment',
            'related_transaction_id' => $loanId,
            'description' => 'Investor service fee for loan #' . $loanId
        ));
    }
    
    /**
     * POST /platform/record-trading-fee - Record secondary market trading fee
     */
    public function recordTradingFee() {
        $userId = $this->_requireAuth();
        if (!$userId) {
            return $this->_errorResponse('Unauthorized', 401);
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Validate required fields
        $errors = $this->_validateRequired($data, array('trade_amount', 'seller_id'));
        if (!empty($errors)) {
            return $this->_errorResponse('Validation failed', 400, $errors);
        }
        
        $tradeAmount = floatval($data['trade_amount']);
        $sellerId = intval($data['seller_id']);
        $buyerId = intval($data['buyer_id'] ?? 0);
        $loanId = intval($data['loan_id'] ?? 0);
        
        // Get trading fee percentage
        $feePercentage = $this->_getFeePercentage('trading_fee');
        $feeAmount = $tradeAmount * ($feePercentage / 100);
        
        return $this->_recordRevenue(array(
            'revenue_type' => 'secondary_market_trading',
            'amount' => $feeAmount,
            'gross_amount' => $tradeAmount,
            'fee_percentage' => $feePercentage,
            'loan_id' => $loanId,
            'seller_id' => $sellerId,
            'buyer_id' => $buyerId,
            'related_transaction_type' => 'token_trade',
            'description' => 'Trading fee for token sale'
        ));
    }
    
    /**
     * POST /platform/record-escrow-fee - Record escrow service fee
     */
    public function recordEscrowFee() {
        $userId = $this->_requireAuth();
        if (!$userId) {
            return $this->_errorResponse('Unauthorized', 401);
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Validate required fields
        $errors = $this->_validateRequired($data, array('escrow_transaction_id', 'amount'));
        if (!empty($errors)) {
            return $this->_errorResponse('Validation failed', 400, $errors);
        }
        
        $escrowId = intval($data['escrow_transaction_id']);
        $amount = floatval($data['amount']);
        
        // Get escrow fee percentage
        $feePercentage = $this->_getFeePercentage('escrow_fee');
        $feeAmount = $amount * ($feePercentage / 100);
        
        return $this->_recordRevenue(array(
            'revenue_type' => 'escrow_service',
            'amount' => $feeAmount,
            'gross_amount' => $amount,
            'fee_percentage' => $feePercentage,
            'related_transaction_type' => 'escrow',
            'related_transaction_id' => $escrowId,
            'description' => 'Escrow service fee for transaction #' . $escrowId
        ));
    }
    
    /**
     * POST /platform/record-liquidation-fee - Record liquidation commission
     */
    public function recordLiquidationFee() {
        $userId = $this->_requireAdmin();
        if (!$userId) {
            return $this->_errorResponse('Admin access required', 403);
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Validate required fields
        $errors = $this->_validateRequired($data, array('recovery_item_id', 'sale_amount', 'loan_id'));
        if (!empty($errors)) {
            return $this->_errorResponse('Validation failed', 400, $errors);
        }
        
        $itemId = intval($data['recovery_item_id']);
        $saleAmount = floatval($data['sale_amount']);
        $loanId = intval($data['loan_id']);
        
        // Get liquidation commission percentage
        $feePercentage = $this->_getFeePercentage('liquidation_commission');
        $feeAmount = $saleAmount * ($feePercentage / 100);
        
        return $this->_recordRevenue(array(
            'revenue_type' => 'liquidation_commission',
            'amount' => $feeAmount,
            'gross_amount' => $saleAmount,
            'fee_percentage' => $feePercentage,
            'loan_id' => $loanId,
            'related_transaction_type' => 'liquidation_sale',
            'related_transaction_id' => $itemId,
            'description' => 'Liquidation commission for item #' . $itemId
        ));
    }
    
    /**
     * GET /platform/calculate-fee - Calculate fee preview
     */
    public function calculateFee() {
        $feeType = $this->request->query['fee_type'] ?? null;
        $amount = floatval($this->request->query['amount'] ?? 0);
        
        if (!$feeType || $amount <= 0) {
            return $this->_errorResponse('fee_type and amount are required', 400);
        }
        
        // Validate fee type
        $allowedTypes = array('origination_fee', 'investor_service_fee', 'trading_fee', 'escrow_fee', 'liquidation_commission');
        if (!in_array($feeType, $allowedTypes)) {
            return $this->_errorResponse('Invalid fee type', 400);
        }
        
        // Get fee percentage
        $feePercentage = $this->_getFeePercentage($feeType);
        $feeAmount = $amount * ($feePercentage / 100);
        
        return $this->_jsonResponse(array(
            'success' => true,
            'calculation' => array(
                'fee_type' => $feeType,
                'gross_amount' => $amount,
                'fee_percentage' => $feePercentage,
                'fee_amount' => $feeAmount,
                'net_amount' => $amount - $feeAmount
            )
        ));
    }
    
    /**
     * GET /platform/analytics - Get revenue analytics for dashboard
     */
    public function analytics() {
        $userId = $this->_getCurrentUserId();
        
        $months = isset($this->request->query['months']) ? intval($this->request->query['months']) : 12;
        $months = min(max(1, $months), 24);
        
        $db = $this->_getDb();
        
        // Get monthly revenue data
        $monthlyData = array();
        for ($i = $months - 1; $i >= 0; $i--) {
            $monthStart = date('Y-m-01', strtotime("-" . $i . " months"));
            $monthEnd = date('Y-m-t', strtotime("-" . $i . " months"));
            
            $query = "SELECT 
                        revenue_type, 
                        SUM(amount) as total 
                      FROM platform_revenue 
                      WHERE status = 'collected' 
                        AND DATE(collected_at) BETWEEN " . $db->escape($monthStart) . " AND " . $db->escape($monthEnd) . "
                      GROUP BY revenue_type";
            
            $results = $db->query($query);
            
            $monthRevenue = array(
                'loan_origination' => 0,
                'investor_service' => 0,
                'secondary_market_trading' => 0,
                'escrow_service' => 0,
                'liquidation_commission' => 0
            );
            
            foreach ($results as $row) {
                $type = $row['platform_revenue']['revenue_type'];
                $monthRevenue[$type] = floatval($row['platform_revenue']['total']);
            }
            
            $monthTotal = array_sum($monthRevenue);
            
            $monthlyData[] = array(
                'month' => date('M Y', strtotime("-" . $i . " months")),
                'revenue' => $monthRevenue,
                'total' => $monthTotal
            );
        }
        
        // Get total loans funded in period
        $loansQuery = "SELECT COUNT(*) as count, SUM(loan_amount) as total 
                       FROM loan_requests 
                       WHERE status IN ('funded', 'active', 'repaid')
                         AND funded_at IS NOT NULL
                         AND funded_at >= DATE_SUB(NOW(), INTERVAL " . $months . " MONTH)";
        $loansResult = $db->query($loansQuery);
        $totalLoansFunded = intval($loansResult[0][0]['count']);
        $totalLoanVolume = floatval($loansResult[0][0]['total']);
        
        // Get marketplace transaction volume
        $tradingQuery = "SELECT SUM(gross_amount) as total 
                         FROM platform_revenue 
                         WHERE revenue_type = 'secondary_market_trading' 
                           AND status = 'collected'
                           AND collected_at >= DATE_SUB(NOW(), INTERVAL " . $months . " MONTH)";
        $tradingResult = $db->query($tradingQuery);
        $marketplaceVolume = floatval($tradingResult[0][0]['total']);
        
        // Calculate totals
        $totalRevenue = 0;
        $byCategory = array();
        foreach ($monthlyData as $month) {
            $totalRevenue += $month['total'];
            foreach ($month['revenue'] as $type => $amount) {
                if (!isset($byCategory[$type])) {
                    $byCategory[$type] = 0;
                }
                $byCategory[$type] += $amount;
            }
        }
        
        return $this->_jsonResponse(array(
            'success' => true,
            'analytics' => array(
                'monthly_data' => $monthlyData,
                'total_revenue' => $totalRevenue,
                'revenue_by_category' => $byCategory,
                'total_loans_funded' => $totalLoansFunded,
                'total_loan_volume' => $totalLoanVolume,
                'marketplace_volume' => $marketplaceVolume,
                'period_months' => $months
            )
        ));
    }
    
    // ==================== Private Helper Methods ====================
    
    /**
     * Get fee percentage for a specific fee type
     */
    private function _getFeePercentage($feeType) {
        $db = $this->_getDb();
        $query = "SELECT percentage FROM platform_fee_config WHERE fee_type = " . $db->escape($feeType) . " AND is_active = 1";
        $result = $db->query($query);
        
        if (empty($result)) {
            return 0;
        }
        
        return floatval($result[0]['platform_fee_config']['percentage']);
    }
    
    /**
     * Record revenue transaction
     */
    private function _recordRevenue($data) {
        $db = $this->_getDb();
        $this->_beginTransaction();
        
        try {
            $query = "INSERT INTO platform_revenue (
                        revenue_type, amount, currency, gross_amount, fee_percentage,
                        loan_id, borrower_id, lender_id,
                        related_transaction_type, related_transaction_id,
                        description, status, collected_at
                      ) VALUES (
                        " . $db->escape($data['revenue_type']) . ",
                        " . $db->escape($data['amount']) . ",
                        'USD',
                        " . $db->escape($data['gross_amount']) . ",
                        " . $db->escape($data['fee_percentage']) . ",
                        " . $db->escape($data['loan_id'] ?? 0) . ",
                        " . $db->escape($data['borrower_id'] ?? 0) . ",
                        " . $db->escape($data['lender_id'] ?? 0) . ",
                        " . $db->escape($data['related_transaction_type']) . ",
                        " . $db->escape($data['related_transaction_id'] ?? 0) . ",
                        " . $db->escape($data['description']) . ",
                        'collected',
                        NOW()
                      )";
            
            $db->query($query);
            $revenueId = $db->lastInsertId();
            
            // Update daily and monthly summaries
            $this->_updateSummaries($data['revenue_type'], $data['amount']);
            
            $this->_commit();
            
            return $this->_jsonResponse(array(
                'success' => true,
                'revenue_id' => $revenueId,
                'amount' => $data['amount'],
                'fee_percentage' => $data['fee_percentage']
            ));
            
        } catch (Exception $e) {
            $this->_rollback();
            return $this->_errorResponse('Failed to record revenue: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Update daily and monthly summaries
     */
    private function _updateSummaries($revenueType, $amount) {
        $db = $this->_getDb();
        $today = date('Y-m-d');
        $year = date('Y');
        $month = date('n');
        
        // Update daily summary
        $dailyQuery = "INSERT INTO daily_revenue_summary (revenue_date, revenue_type, total_amount, transaction_count)
                       VALUES (" . $db->escape($today) . ", " . $db->escape($revenueType) . ", " . $db->escape($amount) . ", 1)
                       ON DUPLICATE KEY UPDATE 
                         total_amount = total_amount + " . $db->escape($amount) . ",
                         transaction_count = transaction_count + 1";
        $db->query($dailyQuery);
        
        // Update monthly summary
        $monthlyQuery = "INSERT INTO monthly_revenue_summary (revenue_year, revenue_month, revenue_type, total_amount, transaction_count)
                         VALUES (" . $db->escape($year) . ", " . $db->escape($month) . ", " . $db->escape($revenueType) . ", " . $db->escape($amount) . ", 1)
                         ON DUPLICATE KEY UPDATE 
                           total_amount = total_amount + " . $db->escape($amount) . ",
                           transaction_count = transaction_count + 1";
        $db->query($monthlyQuery);
    }
    
    /**
     * Log fee changes for audit
     */
    private function _logFeeChange($userId, $fees) {
        App::uses('AuditLog', 'Model');
        $AuditLog = ClassRegistry::init('AuditLog');
        
        $AuditLog->create();
        $AuditLog->save(array(
            'user_id' => $userId,
            'action' => 'fee_update',
            'entity_type' => 'platform_fee_config',
            'new_value' => json_encode($fees),
            'description' => 'Platform fee configuration updated'
        ));
    }
}
