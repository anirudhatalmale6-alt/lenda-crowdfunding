<?php
App::uses("AppController", "Controller");
App::uses('ConnectionManager', 'Core');

class ApiWalletController extends AppController {
    use ApiBaseControllerTrait;
    
    public $name = "ApiWallet";
    public $uses = array("WalletAccount", "WalletTransaction", "User");
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
        // Only allow public endpoints without auth
        $this->Auth->allow(array('currencies', 'getDepositAddress'));
    }
    
    /**
     * Get wallet balance and info
     */
    public function index() {
        // Apply rate limiting
        if (!$this->RateLimit->apply('default')) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Rate limit exceeded'), 429);
        }
        
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Unauthorized'), 401);
        }
        
        $wallet = $this->WalletAccount->find("first", array(
            "conditions" => array("WalletAccount.user_id" => $userId)
        ));
        
        if (!$wallet) {
            $this->WalletAccount->create();
            $this->WalletAccount->save(array(
                "WalletAccount" => array(
                    "user_id" => $userId,
                    "balance" => 0,
                    "frozen_balance" => 0,
                    "currency" => "NGN"
                )
            ));
            $wallet = $this->WalletAccount->find("first", array(
                "conditions" => array("WalletAccount.user_id" => $userId)
            ));
        }
        
        return $this->_jsonResponse(array("success" => true, "wallet" => $wallet));
    }
    
    /**
     * Get wallet transactions
     */
    public function transactions() {
        if (!$this->RateLimit->apply('default')) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Rate limit exceeded'), 429);
        }
        
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Unauthorized'), 401);
        }
        
        $transactions = $this->WalletTransaction->find("all", array(
            "conditions" => array(
                "OR" => array(
                    "WalletTransaction.user_id" => $userId,
                    "WalletTransaction.recipient_id" => $userId
                )
            ),
            "order" => array("WalletTransaction.created_at" => "DESC"),
            "limit" => 50
        ));
        
        return $this->_jsonResponse(array("success" => true, "transactions" => $transactions));
    }
    
    /**
     * Deposit funds
     */
    public function deposit() {
        if (!$this->RateLimit->apply('write')) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Rate limit exceeded'), 429);
        }
        
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Unauthorized'), 401);
        }
        
        $data = json_decode(file_get_contents("php://input"), true);
        
        // Validate transaction
        if (!$this->InputValidation->validateTransaction($data)) {
            return $this->_jsonResponse(array(
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $this->InputValidation->getErrors()
            ), 400);
        }
        
        $amount = floatval($data["amount"] ?? 0);
        
        if ($amount <= 0) {
            return $this->_errorResponse('Invalid amount', 400);
        }
        
        // Maximum deposit limit
        if ($amount > 10000000) {
            return $this->_errorResponse('Amount exceeds maximum limit', 400);
        }
        
        // Use transaction for deposit
        return $this->_withTransaction(function() use ($userId, $amount, $data) {
            $wallet = $this->WalletAccount->find("first", array(
                "conditions" => array("WalletAccount.user_id" => $userId)
            ));
            
            if (!$wallet) {
                $this->WalletAccount->create();
                if (!$this->WalletAccount->save(array(
                    "WalletAccount" => array(
                        "user_id" => $userId,
                        "balance" => $amount,
                        "currency" => "NGN"
                    )
                ))) {
                    throw new Exception('Failed to create wallet');
                }
            } else {
                $newBalance = $wallet["WalletAccount"]["balance"] + $amount;
                $this->WalletAccount->id = $wallet["WalletAccount"]["id"];
                if (!$this->WalletAccount->saveField("balance", $newBalance)) {
                    throw new Exception('Failed to update wallet balance');
                }
            }
            
            $this->WalletTransaction->create();
            if (!$this->WalletTransaction->save(array(
                "WalletTransaction" => array(
                    "user_id" => $userId,
                    "type" => "deposit",
                    "amount" => $amount,
                    "status" => "completed",
                    "reference" => "DEP" . time() . bin2hex(random_bytes(4)),
                    "description" => htmlspecialchars($data["description"] ?? "Deposit", ENT_QUOTES, 'UTF-8')
                )
            ))) {
                throw new Exception('Failed to create transaction record');
            }
            
            return $this->_successResponse(array("amount" => $amount), "Deposit successful");
        }, array('success' => false, 'message' => 'Deposit failed'), 500);
    }
    
    /**
     * Withdraw funds
     */
    public function withdraw() {
        if (!$this->RateLimit->apply('write')) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Rate limit exceeded'), 429);
        }
        
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Unauthorized'), 401);
        }
        
        $data = json_decode(file_get_contents("php://input"), true);
        
        $amount = floatval($data["amount"] ?? 0);
        
        if ($amount <= 0) {
            return $this->_errorResponse('Invalid amount', 400);
        }
        
        // Maximum withdrawal limit
        if ($amount > 1000000) {
            return $this->_errorResponse('Amount exceeds maximum limit', 400);
        }
        
        // Use transaction for withdrawal
        return $this->_withTransaction(function() use ($userId, $amount, $data) {
            $wallet = $this->WalletAccount->find("first", array(
                "conditions" => array("WalletAccount.user_id" => $userId)
            ));
            
            if (!$wallet || $wallet["WalletAccount"]["balance"] < $amount) {
                throw new Exception('Insufficient balance');
            }
            
            $newBalance = $wallet["WalletAccount"]["balance"] - $amount;
            $this->WalletAccount->id = $wallet["WalletAccount"]["id"];
            if (!$this->WalletAccount->saveField("balance", $newBalance)) {
                throw new Exception('Failed to update wallet balance');
            }
            
            $this->WalletTransaction->create();
            if (!$this->WalletTransaction->save(array(
                "WalletTransaction" => array(
                    "user_id" => $userId,
                    "type" => "withdrawal",
                    "amount" => -$amount,
                    "status" => "pending",
                    "reference" => "WTH" . time() . bin2hex(random_bytes(4)),
                    "description" => htmlspecialchars($data["description"] ?? "Withdrawal request", ENT_QUOTES, 'UTF-8')
                )
            ))) {
                throw new Exception('Failed to create transaction record');
            }
            
            return $this->_successResponse(array("amount" => $amount), "Withdrawal request submitted");
        }, array('success' => false, 'message' => 'Withdrawal failed'), 500);
    }
    
    /**
     * Transfer funds to another user
     */
    public function transfer() {
        if (!$this->RateLimit->apply('write')) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Rate limit exceeded'), 429);
        }
        
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Unauthorized'), 401);
        }
        
        $data = json_decode(file_get_contents("php://input"), true);
        
        $amount = floatval($data["amount"] ?? 0);
        $recipientId = intval($data["recipient_id"] ?? 0);
        
        // Validate required fields
        $errors = $this->_validateRequired($data, array('amount', 'recipient_id'));
        if (!empty($errors)) {
            return $this->_errorResponse('Validation failed', 400, $errors);
        }
        
        if ($amount <= 0 || $recipientId <= 0) {
            return $this->_errorResponse('Invalid data', 400);
        }
        
        // Maximum transfer limit
        if ($amount > 1000000) {
            return $this->_errorResponse('Amount exceeds maximum limit', 400);
        }
        
        if ($recipientId === $userId) {
            return $this->_errorResponse('Cannot transfer to yourself', 400);
        }
        
        $senderWallet = $this->WalletAccount->find("first", array(
            "conditions" => array("WalletAccount.user_id" => $userId)
        ));
        
        if (!$senderWallet || $senderWallet["WalletAccount"]["balance"] < $amount) {
            return $this->_errorResponse('Insufficient balance', 400);
        }
        
        $recipientWallet = $this->WalletAccount->find("first", array(
            "conditions" => array("WalletAccount.user_id" => $recipientId)
        ));
        
        if (!$recipientWallet) {
            $this->WalletAccount->create();
            $this->WalletAccount->save(array(
                "WalletAccount" => array(
                    "user_id" => $recipientId,
                    "balance" => 0,
                    "currency" => "NGN"
                )
            ));
            $recipientWallet = $this->WalletAccount->find("first", array(
                "conditions" => array("WalletAccount.user_id" => $recipientId)
            ));
        }
        
        // Use database transaction for atomic transfer
        return $this->_withTransaction(function() use ($senderWallet, $recipientWallet, $userId, $recipientId, $amount, $data) {
            // Debit sender
            $this->WalletAccount->id = $senderWallet["WalletAccount"]["id"];
            if (!$this->WalletAccount->saveField("balance", $senderWallet["WalletAccount"]["balance"] - $amount)) {
                throw new Exception('Failed to debit sender account');
            }
            
            // Credit recipient
            $this->WalletAccount->id = $recipientWallet["WalletAccount"]["id"];
            if (!$this->WalletAccount->saveField("balance", $recipientWallet["WalletAccount"]["balance"] + $amount)) {
                throw new Exception('Failed to credit recipient account');
            }
            
            $reference = "TRF" . time() . bin2hex(random_bytes(4));
            
            // Create sender transaction record
            $this->WalletTransaction->create();
            if (!$this->WalletTransaction->save(array(
                "WalletTransaction" => array(
                    "user_id" => $userId,
                    "recipient_id" => $recipientId,
                    "type" => "transfer",
                    "amount" => -$amount,
                    "status" => "completed",
                    "reference" => $reference,
                    "description" => htmlspecialchars($data["description"] ?? "Transfer", ENT_QUOTES, 'UTF-8')
                )
            ))) {
                throw new Exception('Failed to create sender transaction');
            }
            
            // Create recipient transaction record
            $this->WalletTransaction->create();
            if (!$this->WalletTransaction->save(array(
                "WalletTransaction" => array(
                    "user_id" => $recipientId,
                    "recipient_id" => $userId,
                    "type" => "transfer",
                    "amount" => $amount,
                    "status" => "completed",
                    "reference" => $reference,
                    "description" => htmlspecialchars($data["description"] ?? "Transfer received", ENT_QUOTES, 'UTF-8')
                )
            ))) {
                throw new Exception('Failed to create recipient transaction');
            }
            
            return $this->_successResponse(array(
                "amount" => $amount,
                "reference" => $reference
            ), "Transfer successful");
        }, array('success' => false, 'message' => 'Transfer failed'), 500);
    }
    
    /**
     * Get crypto deposit address (public endpoint for demo)
     */
    public function getDepositAddress() {
        $currency = $this->request->params["currency"] ?? "NGN";
        
        // Validate currency
        $allowedCurrencies = array('NGN', 'USD', 'BTC', 'ETH');
        if (!in_array(strtoupper($currency), $allowedCurrencies)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Invalid currency'), 400);
        }
        
        // In production, this should generate real addresses via blockchain API
        $address = array(
            "currency" => strtoupper($currency),
            "address" => "0x" . substr(hash('sha256', time() . random_bytes(16)), 0, 40),
            "network" => strtolower($currency) === "btc" ? "bitcoin" : (strtolower($currency) === "eth" ? "ethereum" : "native")
        );
        
        return $this->_jsonResponse(array("success" => true, "deposit_address" => $address));
    }
    
    /**
     * Get specific balance type
     */
    public function getBalance() {
        if (!$this->RateLimit->apply('default')) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Rate limit exceeded'), 429);
        }
        
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Unauthorized'), 401);
        }
        
        $type = $this->request->params["type"] ?? "available";
        
        // Validate type
        $allowedTypes = array('available', 'frozen');
        if (!in_array($type, $allowedTypes)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Invalid balance type'), 400);
        }
        
        $wallet = $this->WalletAccount->find("first", array(
            "conditions" => array("WalletAccount.user_id" => $userId)
        ));
        
        if (!$wallet) {
            return $this->_jsonResponse(array("success" => true, "balance" => 0, "type" => $type));
        }
        
        $balance = $type === "available" ? $wallet["WalletAccount"]["balance"] : $wallet["WalletAccount"]["frozen_balance"];
        
        return $this->_jsonResponse(array("success" => true, "balance" => $balance, "type" => $type));
    }
    
    /**
     * Get transaction history with filters
     */
    public function history() {
        if (!$this->RateLimit->apply('default')) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Rate limit exceeded'), 429);
        }
        
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Unauthorized'), 401);
        }
        
        $type = $this->request->query["type"] ?? null;
        $status = $this->request->query["status"] ?? null;
        
        $conditions = array(
            "OR" => array(
                "WalletTransaction.user_id" => $userId,
                "WalletTransaction.recipient_id" => $userId
            )
        );
        
        // Validate and filter
        $allowedTypes = array('deposit', 'withdrawal', 'transfer', 'loan_funding', 'repayment');
        if ($type && in_array($type, $allowedTypes)) {
            $conditions["WalletTransaction.type"] = $type;
        }
        
        $allowedStatuses = array('pending', 'completed', 'failed', 'cancelled');
        if ($status && in_array($status, $allowedStatuses)) {
            $conditions["WalletTransaction.status"] = $status;
        }
        
        $transactions = $this->WalletTransaction->find("all", array(
            "conditions" => $conditions,
            "order" => array("WalletTransaction.created_at" => "DESC"),
            "limit" => 100
        ));
        
        return $this->_jsonResponse(array("success" => true, "transactions" => $transactions));
    }
    
    /**
     * Request withdrawal
     */
    public function requestWithdrawal() {
        if (!$this->RateLimit->apply('write')) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Rate limit exceeded'), 429);
        }
        
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Unauthorized'), 401);
        }
        
        $data = json_decode(file_get_contents("php://input"), true);
        
        $amount = floatval($data["amount"] ?? 0);
        
        if ($amount <= 0) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Invalid amount'), 400);
        }
        
        if ($amount > 1000000) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Amount exceeds maximum limit'), 400);
        }
        
        $wallet = $this->WalletAccount->find("first", array(
            "conditions" => array("WalletAccount.user_id" => $userId)
        ));
        
        if (!$wallet || $wallet["WalletAccount"]["balance"] < $amount) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Insufficient balance'), 400);
        }
        
        $newBalance = $wallet["WalletAccount"]["balance"] - $amount;
        $newFrozen = $wallet["WalletAccount"]["frozen_balance"] + $amount;
        
        $this->WalletAccount->id = $wallet["WalletAccount"]["id"];
        $this->WalletAccount->saveField("balance", $newBalance);
        $this->WalletAccount->saveField("frozen_balance", $newFrozen);
        
        $this->WalletTransaction->create();
        $this->WalletTransaction->save(array(
            "WalletTransaction" => array(
                "user_id" => $userId,
                "type" => "withdrawal",
                "amount" => -$amount,
                "status" => "pending",
                "reference" => "WTH" . time() . bin2hex(random_bytes(4)),
                "description" => "Withdrawal request"
            )
        ));
        
        return $this->_jsonResponse(array("success" => true, "message" => "Withdrawal request submitted"));
    }
    
    /**
     * Get supported currencies
     */
    public function currencies() {
        $currencies = array(
            array("code" => "NGN", "name" => "Nigerian Naira", "symbol" => "₦", "type" => "fiat"),
            array("code" => "USD", "name" => "US Dollar", "symbol" => "$", "type" => "fiat"),
            array("code" => "BTC", "name" => "Bitcoin", "symbol" => "₿", "type" => "crypto"),
            array("code" => "ETH", "name" => "Ethereum", "symbol" => "Ξ", "type" => "crypto")
        );
        
        return $this->_jsonResponse(array("success" => true, "currencies" => $currencies));
    }
    
    /**
     * Get current user ID from JWT token
     * Uses the trait method from ApiBaseControllerTrait
     */
    private function _getCurrentUserId() {
        return parent::_getCurrentUserId();
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
