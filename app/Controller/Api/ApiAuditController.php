<?php
App::uses("AppController", "Controller");
App::uses('ConnectionManager', 'Core');

/**
 * ApiAuditController
 * 
 * Handles audit trail and double-entry bookkeeping verification
 * 
 * FIN-15: Double-entry bookkeeping verification
 * FIN-17: Audit trail for balance changes
 */
class ApiAuditController extends AppController {
    use ApiBaseControllerTrait;
    
    public $name = "ApiAudit";
    public $uses = array("AuditTransaction", "User", "AccountBalance");
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
        // Only allow admin access for audit endpoints
        $this->Auth->allow(array('health'));
    }
    
    /**
     * Health check endpoint (public)
     */
    public function health() {
        return $this->_jsonResponse(array(
            'success' => true,
            'service' => 'audit',
            'status' => 'operational',
            'version' => '1.0'
        ));
    }
    
    /**
     * ============================================================
     * TRANSACTION RECORDING (FIN-17)
     * ============================================================
     */
    
    /**
     * Record a new audit transaction
     * POST /api/audit/transactions
     */
    public function addTransaction() {
        if (!$this->_requireAdmin()) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Admin access required'), 403);
        }
        
        $data = json_decode(file_get_contents("php://input"), true);
        
        // Validate required fields
        $required = array('transactionId', 'entries', 'totalAmount');
        foreach ($required as $field) {
            if (!isset($data[$field])) {
                return $this->_jsonResponse(array('success' => false, 'message' => "Missing required field: $field"), 400);
            }
        }
        
        // Validate double-entry
        $debitTotal = 0;
        $creditTotal = 0;
        
        foreach ($data['entries'] as $entry) {
            $amount = floatval($entry['amount']);
            if ($entry['direction'] === 'DEBIT') {
                $debitTotal += $amount;
            } else {
                $creditTotal += $amount;
            }
        }
        
        // Allow small rounding difference
        if (abs($debitTotal - $creditTotal) > 0.01) {
            return $this->_jsonResponse(array(
                'success' => false, 
                'message' => 'Double-entry validation failed',
                'debit_total' => $debitTotal,
                'credit_total' => $creditTotal,
                'difference' => $debitTotal - $creditTotal
            ), 400);
        }
        
        // Store transaction
        $this->AuditTransaction->create();
        $saveData = array(
            'transaction_id' => $data['transactionId'],
            'entries_json' => json_encode($data['entries']),
            'description' => $data['description'] ?? '',
            'total_amount' => $data['totalAmount'],
            'validated' => 1,
            'created_at' => date('Y-m-d H:i:s'),
            'created_by' => $this->_getCurrentUserId()
        );
        
        $this->AuditTransaction->save($saveData);
        
        return $this->_jsonResponse(array(
            'success' => true,
            'message' => 'Transaction recorded successfully',
            'transaction_id' => $data['transactionId']
        ));
    }
    
    /**
     * Get transaction by ID
     * GET /api/audit/transactions/:id
     */
    public function viewTransaction() {
        $id = $this->request->params["id"] ?? null;
        
        if (!$id) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Transaction ID required'), 400);
        }
        
        $transaction = $this->AuditTransaction->find("first", array(
            "conditions" => array("AuditTransaction.transaction_id" => $id)
        ));
        
        if (!$transaction) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Transaction not found'), 404);
        }
        
        $transaction['AuditTransaction']['entries'] = json_decode($transaction['AuditTransaction']['entries_json'], true);
        unset($transaction['AuditTransaction']['entries_json']);
        
        return $this->_jsonResponse(array(
            'success' => true,
            'transaction' => $transaction['AuditTransaction']
        ));
    }
    
    /**
     * ============================================================
     * LEDGER RECONCILIATION (FIN-15)
     * ============================================================
     */
    
    /**
     * Get ledger reconciliation status
     * GET /api/audit/ledger-reconciliation
     */
    public function ledgerReconciliation() {
        if (!$this->_requireAdmin()) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Admin access required'), 403);
        }
        
        // Get all account balances
        $accounts = $this->AccountBalance->find('all', array(
            'order' => array('AccountBalance.account_type' => 'ASC')
        ));
        
        $accountBalances = array();
        $totalAssets = 0;
        $totalLiabilities = 0;
        $totalEquity = 0;
        
        $assetAccounts = array('LENDER_WALLET', 'BORROWER_WALLET', 'ESCROW_ACCOUNT', 'RESERVE_FUND');
        $liabilityAccounts = array('PENDING_SETTLEMENTS');
        $equityAccounts = array('PLATFORM_OPERATIONS', 'INTEREST_INCOME', 'PLATFORM_FEE_INCOME', 'BAD_DEBT_EXPENSE');
        
        foreach ($accounts as $account) {
            $type = $account['AccountBalance']['account_type'];
            $balance = floatval($account['AccountBalance']['current_balance']);
            
            $accountBalances[$type] = $balance;
            
            if (in_array($type, $assetAccounts)) {
                $totalAssets += $balance;
            } elseif (in_array($type, $liabilityAccounts)) {
                $totalLiabilities += abs($balance);
            } elseif (in_array($type, $equityAccounts)) {
                $totalEquity += $balance;
            }
        }
        
        $accountingEquation = $totalAssets == ($totalLiabilities + $totalEquity);
        
        return $this->_jsonResponse(array(
            'success' => true,
            'reconciliation' => array(
                'valid' => $accountingEquation,
                'total_assets' => $totalAssets,
                'total_liabilities' => $totalLiabilities,
                'total_equity' => $totalEquity,
                'equation' => "{$totalAssets} = {$totalLiabilities} + {$totalEquity}",
                'account_balances' => $accountBalances,
                'checked_at' => date('Y-m-d H:i:s')
            )
        ));
    }
    
    /**
     * Run full balance verification
     * POST /api/audit/verify-balances
     */
    public function verifyBalances() {
        if (!$this->_requireAdmin()) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Admin access required'), 403);
        }
        
        // Get totals from different sources
        $results = array();
        
        // 1. Sum of all ledger transactions
        $ledgerSum = $this->AuditTransaction->find('all', array(
            'fields' => array('SUM(AuditTransaction.total_amount) as total')
        ));
        $results['ledger_total'] = floatval($ledgerSum[0][0]['total'] ?? 0);
        
        // 2. Current account balances
        $balanceSum = $this->AccountBalance->find('all', array(
            'fields' => array('SUM(AccountBalance.current_balance) as total')
        ));
        $results['balance_total'] = floatval($balanceSum[0][0]['total'] ?? 0);
        
        // 3. Difference
        $results['difference'] = abs($results['ledger_total'] - $results['balance_total']);
        $results['verified'] = $results['difference'] < 0.01;
        
        return $this->_jsonResponse(array(
            'success' => true,
            'verification' => $results,
            'verified_at' => date('Y-m-d H:i:s')
        ));
    }
    
    /**
     * ============================================================
     * AUDIT TRAIL (FIN-17)
     * ============================================================
     */
    
    /**
     * Get audit trail for an address
     * GET /api/audit/trail/:address
     */
    public function getAuditTrail() {
        $address = $this->request->params["address"] ?? null;
        
        if (!$address) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Address required'), 400);
        }
        
        // Find all transactions involving this address
        $transactions = $this->AuditTransaction->find('all', array(
            'conditions' => array(
                'AuditTransaction.entries_json LIKE' => '%' . $address . '%'
            ),
            'order' => array('AuditTransaction.created_at' => 'DESC'),
            'limit' => 100
        ));
        
        $trail = array();
        foreach ($transactions as $tx) {
            $entries = json_decode($tx['AuditTransaction']['entries_json'], true);
            $relevantEntries = array_filter($entries, function($entry) use ($address) {
                return $entry['address'] === $address;
            });
            
            if (!empty($relevantEntries)) {
                $trail[] = array(
                    'transaction_id' => $tx['AuditTransaction']['transaction_id'],
                    'description' => $tx['AuditTransaction']['description'],
                    'total_amount' => $tx['AuditTransaction']['total_amount'],
                    'entries' => array_values($relevantEntries),
                    'created_at' => $tx['AuditTransaction']['created_at']
                );
            }
        }
        
        return $this->_jsonResponse(array(
            'success' => true,
            'address' => $address,
            'transaction_count' => count($trail),
            'transactions' => $trail
        ));
    }
    
    /**
     * Get pending reconciliations
     * GET /api/audit/pending-reconciliations
     */
    public function pendingReconciliations() {
        if (!$this->_requireAdmin()) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Admin access required'), 403);
        }
        
        // Find transactions that haven't been reconciled
        $pending = $this->AuditTransaction->find('all', array(
            'conditions' => array(
                'OR' => array(
                    'AuditTransaction.reconciled' => 0,
                    'AuditTransaction.reconciled' => null
                )
            ),
            'order' => array('AuditTransaction.created_at' => 'ASC'),
            'limit' => 50
        ));
        
        return $this->_jsonResponse(array(
            'success' => true,
            'reconciliations' => $pending
        ));
    }
    
    /**
     * Mark transactions as reconciled
     * POST /api/audit/reconcile
     */
    public function reconcile() {
        if (!$this->_requireAdmin()) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Admin access required'), 403);
        }
        
        $data = json_decode(file_get_contents("php://input"), true);
        $transactionIds = $data['transaction_ids'] ?? array();
        
        if (empty($transactionIds)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'No transactions specified'), 400);
        }
        
        $reconciled = 0;
        foreach ($transactionIds as $txId) {
            $transaction = $this->AuditTransaction->find("first", array(
                "conditions" => array("AuditTransaction.transaction_id" => $txId)
            ));
            
            if ($transaction) {
                $this->AuditTransaction->id = $transaction['AuditTransaction']['id'];
                $this->AuditTransaction->saveField('reconciled', 1);
                $this->AuditTransaction->saveField('reconciled_at', date('Y-m-d H:i:s'));
                $this->AuditTransaction->saveField('reconciled_by', $this->_getCurrentUserId());
                $reconciled++;
            }
        }
        
        return $this->_jsonResponse(array(
            'success' => true,
            'message' => "Reconciled {$reconciled} transactions"
        ));
    }
    
    /**
     * Generate audit report
     * POST /api/audit/report
     */
    public function generateReport() {
        if (!$this->_requireAdmin()) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Admin access required'), 403);
        }
        
        $data = json_decode(file_get_contents("php://input"), true);
        
        $startDate = isset($data['start_date']) ? $data['start_date'] : date('Y-m-01');
        $endDate = isset($data['end_date']) ? $data['end_date'] : date('Y-m-d');
        
        // Get transactions in period
        $transactions = $this->AuditTransaction->find('all', array(
            'conditions' => array(
                'AuditTransaction.created_at >=' => $startDate,
                'AuditTransaction.created_at <=' => $endDate . ' 23:59:59'
            ),
            'order' => array('AuditTransaction.created_at' => 'ASC')
        ));
        
        // Calculate totals
        $totalDebits = 0;
        $totalCredits = 0;
        $typeBreakdown = array();
        
        foreach ($transactions as $tx) {
            $entries = json_decode($tx['AuditTransaction']['entries_json'], true);
            $totalAmount = floatval($tx['AuditTransaction']['total_amount']);
            
            $totalDebits += $totalAmount;
            $totalCredits += $totalAmount;
            
            foreach ($entries as $entry) {
                $type = $entry['type'];
                if (!isset($typeBreakdown[$type])) {
                    $typeBreakdown[$type] = array('count' => 0, 'total' => 0);
                }
                $typeBreakdown[$type]['count']++;
                $typeBreakdown[$type]['total'] += floatval($entry['amount']);
            }
        }
        
        return $this->_jsonResponse(array(
            'success' => true,
            'report' => array(
                'period' => array(
                    'start' => $startDate,
                    'end' => $endDate
                ),
                'summary' => array(
                    'total_transactions' => count($transactions),
                    'total_debits' => $totalDebits,
                    'total_credits' => $totalCredits,
                    'difference' => abs($totalDebits - $totalCredits),
                    'double_entry_valid' => abs($totalDebits - $totalCredits) < 0.01
                ),
                'type_breakdown' => $typeBreakdown,
                'generated_at' => date('Y-m-d H:i:s')
            )
        ));
    }
    
    /**
     * Export audit data
     * GET /api/audit/export
     */
    public function exportAudit() {
        if (!$this->_requireAdmin()) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Admin access required'), 403);
        }
        
        $format = $this->request->query['format'] ?? 'json';
        
        $transactions = $this->AuditTransaction->find('all', array(
            'order' => array('AuditTransaction.created_at' => 'DESC'),
            'limit' => 1000
        ));
        
        if ($format === 'csv') {
            header('Content-Type: text/csv');
            header('Content-Disposition: attachment; filename="audit_export_' . date('Ymd') . '.csv"');
            
            echo "TransactionID,Description,TotalAmount,Direction,Account,EntryAmount,CreatedAt\n";
            
            foreach ($transactions as $tx) {
                $entries = json_decode($tx['AuditTransaction']['entries_json'], true);
                foreach ($entries as $entry) {
                    echo sprintf(
                        "%s,%s,%s,%s,%s,%s,%s\n",
                        $tx['AuditTransaction']['transaction_id'],
                        $tx['AuditTransaction']['description'],
                        $tx['AuditTransaction']['total_amount'],
                        $entry['direction'],
                        $entry['account'],
                        $entry['amount'],
                        $tx['AuditTransaction']['created_at']
                    );
                }
            }
            exit;
        }
        
        return $this->_jsonResponse(array(
            'success' => true,
            'count' => count($transactions),
            'transactions' => $transactions
        ));
    }
    
    /**
     * ============================================================
     * HELPER METHODS
     * ============================================================
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
    
    private function _requireAdmin() {
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return false;
        }
        
        $user = $this->User->find("first", array(
            "conditions" => array("User.id" => $userId),
            "fields" => array("role"),
            "recursive" => -1
        ));
        
        return $user && $user['User']['role'] === 'admin';
    }
    
    private function _jsonResponse($data, $code = 200) {
        http_response_code($code);
        header("Content-Type: application/json");
        header("X-Content-Type-Options: nosniff");
        echo json_encode($data);
        exit;
    }
}
