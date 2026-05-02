<?php
App::uses("AppController", "Controller");
App::uses('ConnectionManager', 'Core');

class ApiEscrowController extends AppController {
    use ApiBaseControllerTrait;
    
    public $name = "ApiEscrow";
    public $uses = array("EscrowTransaction", "User", "LoanRequest");
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
        // Allow some public endpoints
        $this->Auth->allow(array('shippingCarriers', 'statistics', 'disputes'));
    }
    
    /**
     * Get escrow transactions
     */
    public function index() {
        if (!$this->RateLimit->apply('default')) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Rate limit exceeded'), 429);
        }
        
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Unauthorized'), 401);
        }
        
        // Pagination parameters
        $page = isset($this->request->query['page']) ? max(1, intval($this->request->query['page'])) : 1;
        $limit = isset($this->request->query['limit']) ? min(max(1, intval($this->request->query['limit'])), 100) : 20;
        $offset = ($page - 1) * $limit;
        
        // Get total count
        $total = $this->EscrowTransaction->find('count', array(
            'conditions' => array(
                'OR' => array(
                    'EscrowTransaction.buyer_id' => $userId,
                    'EscrowTransaction.seller_id' => $userId
                )
            )
        ));
        
        $transactions = $this->EscrowTransaction->find('all', array(
            'conditions' => array(
                'OR' => array(
                    'EscrowTransaction.buyer_id' => $userId,
                    'EscrowTransaction.seller_id' => $userId
                )
            ),
            'order' => array('EscrowTransaction.created_at' => 'DESC'),
            'limit' => $limit,
            'offset' => $offset
        ));
        
        return $this->_paginatedResponse($transactions, $page, $limit, $total);
    }
    
    public function myTransactions() {
        return $this->index();
    }
    
    /**
     * View single transaction
     */
    public function view() {
        $id = $this->request->params["id"] ?? null;
        
        if (!$id || !is_numeric($id)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Transaction ID required'), 400);
        }
        
        $transaction = $this->EscrowTransaction->find("first", array(
            "conditions" => array("EscrowTransaction.id" => $id)
        ));
        
        if (!$transaction) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Transaction not found'), 404);
        }
        
        return $this->_jsonResponse(array("success" => true, "transaction" => $transaction));
    }
    
    /**
     * Fund escrow transaction
     */
    public function fund() {
        if (!$this->RateLimit->apply('write')) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Rate limit exceeded'), 429);
        }
        
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Unauthorized'), 401);
        }
        
        $id = $this->request->params["id"] ?? null;
        $data = json_decode(file_get_contents("php://input"), true);
        
        $amount = floatval($data["amount"] ?? 0);
        
        if (!$id || !is_numeric($id) || $amount <= 0) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Invalid data'), 400);
        }
        
        $transaction = $this->EscrowTransaction->find("first", array(
            "conditions" => array("EscrowTransaction.id" => $id)
        ));
        
        if (!$transaction) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Transaction not found'), 404);
        }
        
        if ($transaction["EscrowTransaction"]["status"] !== "pending") {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Transaction already funded'), 400);
        }
        
        $this->EscrowTransaction->id = $id;
        $this->EscrowTransaction->saveField("amount", $amount);
        $this->EscrowTransaction->saveField("status", "funded");
        $this->EscrowTransaction->saveField("funded_at", date("Y-m-d H:i:s"));
        
        return $this->_jsonResponse(array("success" => true, "message" => "Transaction funded"));
    }
    
    /**
     * Mark as shipped
     */
    public function ship() {
        if (!$this->RateLimit->apply('write')) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Rate limit exceeded'), 429);
        }
        
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Unauthorized'), 401);
        }
        
        $id = $this->request->params["id"] ?? null;
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!$id || !is_numeric($id)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Invalid transaction ID'), 400);
        }
        
        $transaction = $this->EscrowTransaction->find("first", array(
            "conditions" => array("EscrowTransaction.id" => $id, "EscrowTransaction.seller_id" => $userId)
        ));
        
        if (!$transaction) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Transaction not found'), 404);
        }
        
        if ($transaction["EscrowTransaction"]["status"] !== "funded") {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Cannot ship - transaction not funded'), 400);
        }
        
        $this->EscrowTransaction->id = $id;
        $this->EscrowTransaction->saveField("status", "shipped");
        $this->EscrowTransaction->saveField("shipped_at", date("Y-m-d H:i:s"));
        $this->EscrowTransaction->saveField("tracking_number", htmlspecialchars($data["tracking_number"] ?? "", ENT_QUOTES, 'UTF-8'));
        $this->EscrowTransaction->saveField("shipping_carrier", htmlspecialchars($data["carrier"] ?? "", ENT_QUOTES, 'UTF-8'));
        
        return $this->_jsonResponse(array("success" => true, "message" => "Item shipped"));
    }
    
    /**
     * Confirm delivery (EF-03: Added image upload support)
     */
    public function confirm() {
        if (!$this->RateLimit->apply('write')) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Rate limit exceeded'), 429);
        }
        
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Unauthorized'), 401);
        }
        
        $id = $this->request->params["id"] ?? null;
        
        if (!$id || !is_numeric($id)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Invalid transaction ID'), 400);
        }
        
        $transaction = $this->EscrowTransaction->find("first", array(
            "conditions" => array("EscrowTransaction.id" => $id, "EscrowTransaction.buyer_id" => $userId)
        ));
        
        if (!$transaction) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Transaction not found'), 404);
        }
        
        if ($transaction["EscrowTransaction"]["status"] !== "shipped") {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Cannot confirm - item not shipped'), 400);
        }
        
        // Handle image upload for delivery confirmation
        $deliveryImageUrl = null;
        if (isset($_FILES['delivery_image']) && $_FILES['delivery_image']['error'] === UPLOAD_ERR_OK) {
            $uploadDir = WWW_ROOT . 'uploads' . DS . 'delivery' . DS;
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }
            
            $fileInfo = pathinfo($_FILES['delivery_image']['name']);
            $extension = strtolower($fileInfo['extension']);
            $allowedExtensions = array('jpg', 'jpeg', 'png', 'gif', 'webp');
            
            if (!in_array($extension, $allowedExtensions)) {
                return $this->_jsonResponse(array('success' => false, 'message' => 'Invalid image format. Allowed: JPG, PNG, GIF, WebP'), 400);
            }
            
            // Validate file size (max 5MB)
            if ($_FILES['delivery_image']['size'] > 5 * 1024 * 1024) {
                return $this->_jsonResponse(array('success' => false, 'message' => 'Image too large. Maximum size is 5MB'), 400);
            }
            
            $newFileName = 'delivery_' . $id . '_' . time() . '.' . $extension;
            $targetPath = $uploadDir . $newFileName;
            
            if (move_uploaded_file($_FILES['delivery_image']['tmp_name'], $targetPath)) {
                $deliveryImageUrl = '/uploads/delivery/' . $newFileName;
            } else {
                return $this->_jsonResponse(array('success' => false, 'message' => 'Failed to upload image'), 500);
            }
        }
        
        $this->EscrowTransaction->id = $id;
        $this->EscrowTransaction->saveField("status", "confirmed");
        $this->EscrowTransaction->saveField("confirmed_at", date("Y-m-d H:i:s"));
        
        if ($deliveryImageUrl) {
            $this->EscrowTransaction->saveField("delivery_image", $deliveryImageUrl);
        }
        
        return $this->_jsonResponse(array(
            "success" => true, 
            "message" => "Transaction confirmed",
            "deliveryImage" => $deliveryImageUrl
        ));
    }
    
    /**
     * Release funds to seller
     * INT-01 FIX: Added database transaction wrapper for ACID compliance
     */
    public function release() {
        if (!$this->RateLimit->apply('write')) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Rate limit exceeded'), 429);
        }
        
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Unauthorized'), 401);
        }
        
        $id = $this->request->params["id"] ?? null;
        
        if (!$id || !is_numeric($id)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Invalid transaction ID'), 400);
        }
        
        $transaction = $this->EscrowTransaction->find("first", array(
            "conditions" => array("EscrowTransaction.id" => $id)
        ));
        
        if (!$transaction) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Transaction not found'), 404);
        }
        
        if ($transaction["EscrowTransaction"]["buyer_id"] != $userId) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Unauthorized'), 401);
        }
        
        if ($transaction["EscrowTransaction"]["status"] !== "shipped" && $transaction["EscrowTransaction"]["status"] !== "confirmed") {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Cannot release - transaction not ready'), 400);
        }
        
        // INT-01 FIX: Wrap in database transaction for ACID compliance
        $db = ConnectionManager::getDataSource('default');
        $releaseSuccess = false;
        
        try {
            $db->begin();
            
            // Get current transaction state with lock
            $lockedTransaction = $this->EscrowTransaction->find("first", array(
                "conditions" => array("EscrowTransaction.id" => $id),
                "for update" => true
            ));
            
            // Verify status hasn't changed
            if ($lockedTransaction["EscrowTransaction"]["status"] !== "shipped" && 
                $lockedTransaction["EscrowTransaction"]["status"] !== "confirmed") {
                throw new Exception('Transaction status changed during processing');
            }
            
            // Calculate platform fee
            $amount = floatval($lockedTransaction["EscrowTransaction"]["amount"]);
            $feePercent = Configure::read('Escrow.platform_fee_percent') ?: 250;
            $platformFee = round($amount * $feePercent / 10000, 2);
            $sellerAmount = $amount - $platformFee;
            
            // Update escrow transaction status
            $this->EscrowTransaction->id = $id;
            $this->EscrowTransaction->saveField("status", "released");
            $this->EscrowTransaction->saveField("released_at", date("Y-m-d H:i:s"));
            $this->EscrowTransaction->saveField("platform_fee", $platformFee);
            $this->EscrowTransaction->saveField("seller_amount", $sellerAmount);
            
            // Log the fund movement for audit trail
            App::uses('CakeLog', 'Log');
            $logEntry = array(
                'timestamp' => date('Y-m-d H:i:s'),
                'escrow_id' => $id,
                'action' => 'funds_release',
                'amount' => $amount,
                'platform_fee' => $platformFee,
                'seller_amount' => $sellerAmount,
                'buyer_id' => $userId,
                'seller_id' => $lockedTransaction["EscrowTransaction"]["seller_id"]
            );
            CakeLog::write('escrow_releases', json_encode($logEntry));
            
            $db->commit();
            $releaseSuccess = true;
            
            return $this->_jsonResponse(array(
                "success" => true, 
                "message" => "Funds released to seller",
                "amount" => $amount,
                "platform_fee" => $platformFee,
                "seller_receives" => $sellerAmount
            ));
            
        } catch (Exception $e) {
            $db->rollback();
            
            return $this->_jsonResponse(array(
                "success" => false, 
                "message" => "Failed to release funds: " . $e->getMessage()
            ), 500);
        }
    }
    
    /**
     * File dispute
     */
    public function dispute() {
        if (!$this->RateLimit->apply('write')) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Rate limit exceeded'), 429);
        }
        
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Unauthorized'), 401);
        }
        
        $id = $this->request->params["id"] ?? null;
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!$id || !is_numeric($id)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Invalid transaction ID'), 400);
        }
        
        $transaction = $this->EscrowTransaction->find("first", array(
            "conditions" => array("EscrowTransaction.id" => $id)
        ));
        
        if (!$transaction) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Transaction not found'), 404);
        }
        
        $this->EscrowTransaction->id = $id;
        $this->EscrowTransaction->saveField("status", "disputed");
        $this->EscrowTransaction->saveField("disputed_at", date("Y-m-d H:i:s"));
        $this->EscrowTransaction->saveField("dispute_reason", htmlspecialchars($data["reason"] ?? "", ENT_QUOTES, 'UTF-8'));
        $this->EscrowTransaction->saveField("dispute_filed_by", $userId);
        
        return $this->_jsonResponse(array("success" => true, "message" => "Dispute filed"));
    }
    
    /**
     * Resolve dispute (admin only)
     */
    public function resolve() {
        $userId = $this->_getCurrentUserId();
        if (!$userId || !$this->_isAdmin($userId)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Admin access required'), 403);
        }
        
        $id = $this->request->params["id"] ?? null;
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!$id || !is_numeric($id)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Invalid transaction ID'), 400);
        }
        
        $transaction = $this->EscrowTransaction->find("first", array(
            "conditions" => array("EscrowTransaction.id" => $id)
        ));
        
        if (!$transaction) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Transaction not found'), 404);
        }
        
        $resolution = $data["resolution"] ?? "released";
        
        // Validate resolution
        $allowedResolutions = array('released', 'refunded', 'cancelled');
        if (!in_array($resolution, $allowedResolutions)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Invalid resolution'), 400);
        }
        
        $this->EscrowTransaction->id = $id;
        $this->EscrowTransaction->saveField("status", $resolution);
        $this->EscrowTransaction->saveField("resolved_at", date("Y-m-d H:i:s"));
        $this->EscrowTransaction->saveField("dispute_resolution", htmlspecialchars($data["notes"] ?? "", ENT_QUOTES, 'UTF-8'));
        
        return $this->_jsonResponse(array("success" => true, "message" => "Dispute resolved"));
    }
    
    /**
     * Get statistics
     */
    public function statistics() {
        $totalTransactions = $this->EscrowTransaction->find("count");
        $activeTransactions = $this->EscrowTransaction->find("count", array(
            "conditions" => array("EscrowTransaction.status" => array("funded", "shipped", "confirmed"))
        ));
        $disputedTransactions = $this->EscrowTransaction->find("count", array(
            "conditions" => array("EscrowTransaction.status" => "disputed")
        ));
        
        return $this->_jsonResponse(array("success" => true, "statistics" => array(
            "total_transactions" => $totalTransactions,
            "active_transactions" => $activeTransactions,
            "disputed_transactions" => $disputedTransactions
        )));
    }
    
    /**
     * Get shipping carriers
     */
    public function shippingCarriers() {
        $carriers = array(
            array("code" => "dhl", "name" => "DHL Express"),
            array("code" => "fedex", "name" => "FedEx"),
            array("code" => "ups", "name" => "UPS"),
            array("code" => "usps", "name" => "USPS"),
            array("code" => "royal-mail", "name" => "Royal Mail"),
            array("code" => "nigeriapost", "name" => "Nigeria Post"),
            array("code" => "d-art", "name" => "D-ART Logistics"),
            array("code" => "other", "name" => "Other")
        );
        
        return $this->_jsonResponse(array("success" => true, "carriers" => $carriers));
    }
    
    /**
     * Get all disputes
     */
    public function disputes() {
        // Pagination parameters
        $page = isset($this->request->query['page']) ? max(1, intval($this->request->query['page'])) : 1;
        $limit = isset($this->request->query['limit']) ? min(max(1, intval($this->request->query['limit'])), 100) : 20;
        $offset = ($page - 1) * $limit;
        
        // Get total count
        $total = $this->EscrowTransaction->find('count', array(
            'conditions' => array('EscrowTransaction.status' => 'disputed')
        ));
        
        $disputes = $this->EscrowTransaction->find('all', array(
            'conditions' => array('EscrowTransaction.status' => 'disputed'),
            'order' => array('EscrowTransaction.disputed_at' => 'DESC'),
            'limit' => $limit,
            'offset' => $offset
        ));
        
        return $this->_paginatedResponse($disputes, $page, $limit, $total);
    }
    
    /**
     * Auto-release funds after timeout (EF-05)
     * This method should be called by a cron job
     */
    public function autoRelease() {
        // This endpoint should be protected and only accessible by system/cron
        $apiKey = $this->request->query['api_key'] ?? '';
        $systemApiKey = Configure::read('Escrow.auto_release_key');
        
        if ($systemApiKey && $apiKey !== $systemApiKey) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Invalid API key'), 403);
        }
        
        // Default timeout is 14 days after shipping
        $timeoutDays = 14;
        $customTimeout = Configure::read('Escrow.auto_release_days');
        if ($customTimeout) {
            $timeoutDays = intval($customTimeout);
        }
        
        $timeoutDate = date('Y-m-d H:i:s', strtotime("-{$timeoutDays} days"));
        
        // Find shipped transactions that have exceeded the timeout
        $overdueTransactions = $this->EscrowTransaction->find('all', array(
            'conditions' => array(
                'EscrowTransaction.status' => 'shipped',
                'EscrowTransaction.shipped_at <=' => $timeoutDate
            )
        ));
        
        $released = 0;
        $errors = array();
        
        foreach ($overdueTransactions as $transaction) {
            try {
                $this->EscrowTransaction->id = $transaction['EscrowTransaction']['id'];
                $this->EscrowTransaction->saveField('status', 'released');
                $this->EscrowTransaction->saveField('released_at', date('Y-m-d H:i:s'));
                $this->EscrowTransaction->saveField('auto_released', true);
                $this->EscrowTransaction->saveField('auto_release_reason', 'Timeout - no confirmation within ' . $timeoutDays . ' days');
                
                $released++;
            } catch (Exception $e) {
                $errors[] = array(
                    'id' => $transaction['EscrowTransaction']['id'],
                    'error' => $e->getMessage()
                );
            }
        }
        
        return $this->_jsonResponse(array(
            'success' => true,
            'message' => "Auto-release completed",
            'processed' => $released,
            'total_overdue' => count($overdueTransactions),
            'errors' => $errors
        ));
    }
    
    /**
     * Get auto-release status/configuration
     */
    public function autoReleaseConfig() {
        $timeoutDays = Configure::read('Escrow.auto_release_days') ?: 14;
        $enabled = Configure::read('Escrow.auto_release_enabled') ?: true;
        
        return $this->_jsonResponse(array(
            'success' => true,
            'config' => array(
                'enabled' => $enabled,
                'timeout_days' => $timeoutDays,
                'description' => "Funds are automatically released to seller after {$timeoutDays} days from shipping if buyer doesn't confirm or dispute"
            )
        ));
    }
    
    /**
     * ============================================================
     * PLATFORM FEE CONFIGURATION (FIN-12)
     * ============================================================
     *
     * Fee Formula:
     * platformFee = transactionAmount * platformFeePercent / 10000
     *
     * Example: For a $1000 transaction with 2.5% fee:
     * platformFee = 1000 * 250 / 10000 = $25
     *
     * The platform fee is deducted from the transaction amount before
     * releasing funds to the seller. This is stored in basis points
     * (250 bps = 2.5%) for precision.
     *
     * Maximum configurable fee: 10% (1000 bps)
     */

    /**
     * Get current platform fee configuration
     * @description Returns the current platform fee percentage
     */
    public function platformFee() {
        $feePercent = Configure::read('Escrow.platform_fee_percent') ?: 250; // Default 2.5%
        $maxFee = Configure::read('Escrow.max_platform_fee') ?: 1000; // Default 10%
        
        return $this->_jsonResponse(array(
            'success' => true,
            'platform_fee' => array(
                'percent' => $feePercent / 100, // Convert bps to percentage
                'basis_points' => $feePercent,
                'max_allowed' => $maxFee / 100,
                'description' => 'Platform fee is deducted from each escrow transaction',
                'formula' => 'platformFee = amount * basisPoints / 10000'
            )
        ));
    }
    
    /**
     * Update platform fee configuration (admin only)
     * @description Allows admin to configure the platform fee percentage
     * @param {float} fee_percent - New fee percentage (e.g., 2.5 for 2.5%)
     * @param {int} basis_points - Alternative: fee in basis points (e.g., 250 for 2.5%)
     */
    public function updatePlatformFee() {
        $userId = $this->_getCurrentUserId();
        if (!$userId || !$this->_isAdmin($userId)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Admin access required'), 403);
        }
        
        $data = json_decode(file_get_contents("php://input"), true);
        
        $newFeeBps = null;
        
        // Support both percentage and basis points input
        if (isset($data['fee_percent'])) {
            $feePercent = floatval($data['fee_percent']);
            if ($feePercent < 0 || $feePercent > 10) {
                return $this->_jsonResponse(array('success' => false, 'message' => 'Fee must be between 0% and 10%'), 400);
            }
            $newFeeBps = intval($feePercent * 100); // Convert to basis points
        } elseif (isset($data['basis_points'])) {
            $newFeeBps = intval($data['basis_points']);
            if ($newFeeBps < 0 || $newFeeBps > 1000) {
                return $this->_jsonResponse(array('success' => false, 'message' => 'Fee must be between 0 and 1000 basis points (0-10%)'), 400);
            }
        }
        
        if ($newFeeBps === null) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Either fee_percent or basis_points is required'), 400);
        }
        
        // Store in configuration
        Configure::write('Escrow.platform_fee_percent', $newFeeBps);
        
        // Log the change for audit trail
        $this->_logFeeChange($userId, $newFeeBps);
        
        return $this->_jsonResponse(array(
            'success' => true, 
            'message' => 'Platform fee updated successfully',
            'new_fee' => array(
                'percent' => $newFeeBps / 100,
                'basis_points' => $newFeeBps
            )
        ));
    }
    
    /**
     * Log platform fee changes for audit trail (FIN-17)
     */
    private function _logFeeChange($adminUserId, $newFeeBps) {
        App::uses('CakeLog', 'Log');
        
        $logEntry = array(
            'timestamp' => date('Y-m-d H:i:s'),
            'admin_user_id' => $adminUserId,
            'action' => 'platform_fee_update',
            'new_fee_bps' => $newFeeBps,
            'new_fee_percent' => $newFeeBps / 100
        );
        
        CakeLog::write('escrow_fee_changes', json_encode($logEntry));
    }
    
    /**
     * Get platform fee history (for audit)
     */
    public function platformFeeHistory() {
        $userId = $this->_getCurrentUserId();
        if (!$userId || !$this->_isAdmin($userId)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Admin access required'), 403);
        }
        
        // Read from log file
        $logFile = LOGS . 'escrow_fee_changes.log';
        $history = array();
        
        if (file_exists($logFile)) {
            $lines = file($logFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            $history = array_slice($lines, -50); // Last 50 entries
        }
        
        return $this->_jsonResponse(array(
            'success' => true,
            'history' => array_map(function($line) {
                return json_decode($line, true);
            }, $history)
        ));
    }
    
    /**
     * Calculate fee for a given amount (public endpoint)
     * @description Returns the platform fee for a transaction amount
     * @param {float} amount - Transaction amount
     */
    public function calculateFee() {
        $amount = isset($this->request->query['amount']) ? floatval($this->request->query['amount']) : 0;
        
        if ($amount <= 0) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Valid amount required'), 400);
        }
        
        $feePercent = Configure::read('Escrow.platform_fee_percent') ?: 250; // Default 2.5%
        $feeAmount = $amount * $feePercent / 10000;
        
        return $this->_jsonResponse(array(
            'success' => true,
            'calculation' => array(
                'amount' => $amount,
                'fee_percent' => $feePercent / 100,
                'fee_amount' => round($feeAmount, 2),
                'seller_receives' => round($amount - $feeAmount, 2),
                'formula' => 'fee = amount * basisPoints / 10000'
            )
        ));
    }
    
    /**
     * Update auto-release configuration (admin)
     */
    public function updateAutoReleaseConfig() {
        $userId = $this->_getCurrentUserId();
        if (!$userId || !$this->_isAdmin($userId)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Admin access required'), 403);
        }
        
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (isset($data['timeout_days'])) {
            $timeoutDays = intval($data['timeout_days']);
            if ($timeoutDays < 1 || $timeoutDays > 60) {
                return $this->_jsonResponse(array('success' => false, 'message' => 'Timeout must be between 1 and 60 days'), 400);
            }
            Configure::write('Escrow.auto_release_days', $timeoutDays);
        }
        
        if (isset($data['enabled'])) {
            Configure::write('Escrow.auto_release_enabled', (bool)$data['enabled']);
        }
        
        return $this->_jsonResponse(array('success' => true, 'message' => 'Configuration updated'));
    }
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
        header("X-Frame-Options: " . "DENY");
        header("X-XSS-Protection: 1; mode=block");
        echo json_encode($data);
        exit;
    }
}
