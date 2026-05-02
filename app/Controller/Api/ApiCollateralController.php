<?php
App::uses("AppController", "Controller");
App::uses('ConnectionManager', 'Core');

class ApiCollateralController extends AppController {
    use ApiBaseControllerTrait;
    
    public $name = "ApiCollateral";
    public $uses = array("CollateralAsset", "LoanRequest", "User");
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
        // Allow public endpoints
        $this->Auth->allow(array('types'));
    }
    
    /**
     * Get collateral assets
     */
    public function index() {
        if (!$this->RateLimit->apply('default')) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Rate limit exceeded'), 429);
        }
        
        $userId = $this->_getCurrentUserId();
        
        $conditions = array();
        if ($userId) {
            $conditions["CollateralAsset.borrower_id"] = $userId;
        }
        
        $status = $this->request->query["status"] ?? null;
        
        // Validate status
        $allowedStatuses = array('pending', 'verified', 'rejected');
        if ($status && in_array($status, $allowedStatuses)) {
            $conditions["CollateralAsset.verification_status"] = $status;
        }
        
        $collateral = $this->CollateralAsset->find("all", array(
            "conditions" => $conditions,
            "order" => array("CollateralAsset.created_at" => "DESC")
        ));
        
        return $this->_jsonResponse(array("success" => true, "collateral" => $collateral));
    }
    
    /**
     * View single collateral
     */
    public function view() {
        $id = $this->request->params["id"] ?? null;
        
        if (!$id || !is_numeric($id)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Collateral ID required'), 400);
        }
        
        $collateral = $this->CollateralAsset->find("first", array(
            "conditions" => array("CollateralAsset.id" => $id)
        ));
        
        if (!$collateral) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Collateral not found'), 404);
        }
        
        return $this->_jsonResponse(array("success" => true, "collateral" => $collateral));
    }
    
    /**
     * Add new collateral
     */
    public function add() {
        if (!$this->RateLimit->apply('write')) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Rate limit exceeded'), 429);
        }
        
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Unauthorized'), 401);
        }
        
        $data = json_decode(file_get_contents("php://input"), true);
        
        // Validate collateral data
        if (!$this->InputValidation->validateCollateral($data)) {
            return $this->_jsonResponse(array(
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $this->InputValidation->getErrors()
            ), 400);
        }
        
        $this->CollateralAsset->create();
        $collateralData = array(
            "CollateralAsset" => array(
                "borrower_id" => $userId,
                "loan_id" => isset($data["loan_id"]) ? intval($data["loan_id"]) : null,
                "type" => $data["type"],
                "description" => htmlspecialchars($data["description"] ?? "", ENT_QUOTES, 'UTF-8'),
                "estimated_value" => floatval($data["estimated_value"]),
                "market_value" => floatval($data["market_value"] ?? 0),
                "location" => htmlspecialchars($data["location"] ?? "", ENT_QUOTES, 'UTF-8'),
                "documents" => json_encode($data["documents"] ?? array()),
                "verification_status" => "pending"
            )
        );
        
        if ($this->CollateralAsset->save($collateralData)) {
            return $this->_jsonResponse(array(
                "success" => true, 
                "message" => "Collateral added successfully",
                "collateral_id" => $this->CollateralAsset->getLastInsertID()
            ));
        }
        
        return $this->_jsonResponse(array("success" => false, "message" => "Failed to add collateral"), 500);
    }
    
    /**
     * Update collateral
     */
    public function update() {
        if (!$this->RateLimit->apply('write')) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Rate limit exceeded'), 429);
        }
        
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Unauthorized'), 401);
        }
        
        $id = $this->request->params["id"] ?? null;
        
        if (!$id || !is_numeric($id)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Invalid collateral ID'), 400);
        }
        
        $data = json_decode(file_get_contents("php://input"), true);
        
        $collateral = $this->CollateralAsset->find("first", array(
            "conditions" => array("CollateralAsset.id" => $id, "CollateralAsset.borrower_id" => $userId)
        ));
        
        if (!$collateral) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Collateral not found'), 404);
        }
        
        if ($collateral["CollateralAsset"]["verification_status"] === "verified") {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Cannot update verified collateral'), 400);
        }
        
        $this->CollateralAsset->id = $id;
        
        if (isset($data["description"])) {
            $this->CollateralAsset->saveField("description", htmlspecialchars($data["description"], ENT_QUOTES, 'UTF-8'));
        }
        if (isset($data["estimated_value"])) {
            $this->CollateralAsset->saveField("estimated_value", floatval($data["estimated_value"]));
        }
        if (isset($data["market_value"])) {
            $this->CollateralAsset->saveField("market_value", floatval($data["market_value"]));
        }
        if (isset($data["location"])) {
            $this->CollateralAsset->saveField("location", htmlspecialchars($data["location"], ENT_QUOTES, 'UTF-8'));
        }
        
        return $this->_jsonResponse(array("success" => true, "message" => "Collateral updated"));
    }
    
    /**
     * Delete collateral
     */
    public function delete() {
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Unauthorized'), 401);
        }
        
        $id = $this->request->params["id"] ?? null;
        
        if (!$id || !is_numeric($id)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Invalid collateral ID'), 400);
        }
        
        $collateral = $this->CollateralAsset->find("first", array(
            "conditions" => array("CollateralAsset.id" => $id, "CollateralAsset.borrower_id" => $userId)
        ));
        
        if (!$collateral) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Collateral not found'), 404);
        }
        
        if ($collateral["CollateralAsset"]["verification_status"] === "verified") {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Cannot delete verified collateral'), 400);
        }
        
        $this->CollateralAsset->id = $id;
        $this->CollateralAsset->delete();
        
        return $this->_jsonResponse(array("success" => true, "message" => "Collateral deleted"));
    }
    
    /**
     * Link collateral to loan
     */
    public function linkToLoan() {
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Unauthorized'), 401);
        }
        
        $id = $this->request->params["id"] ?? null;
        $data = json_decode(file_get_contents("php://input"), true);
        $loanId = $data["loan_id"] ?? null;
        
        if (!$loanId || !is_numeric($loanId)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Valid Loan ID required'), 400);
        }
        
        $collateral = $this->CollateralAsset->find("first", array(
            "conditions" => array("CollateralAsset.id" => $id, "CollateralAsset.borrower_id" => $userId)
        ));
        
        if (!$collateral) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Collateral not found'), 404);
        }
        
        $loan = $this->LoanRequest->find("first", array(
            "conditions" => array("LoanRequest.id" => $loanId, "LoanRequest.borrower_id" => $userId)
        ));
        
        if (!$loan) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Loan not found'), 404);
        }
        
        $this->CollateralAsset->id = $id;
        $this->CollateralAsset->saveField("loan_id", $loanId);
        
        return $this->_jsonResponse(array("success" => true, "message" => "Collateral linked to loan"));
    }
    
    /**
     * Calculate LTV
     */
    public function calculateLTV() {
        $id = $this->request->params["id"] ?? null;
        $loanAmount = floatval($this->request->query["loanAmount"] ?? 0);
        
        if ($id) {
            if (!is_numeric($id)) {
                return $this->_jsonResponse(array('success' => false, 'message' => 'Invalid collateral ID'), 400);
            }
            
            $collateral = $this->CollateralAsset->find("first", array(
                "conditions" => array("CollateralAsset.id" => $id)
            ));
            
            if (!$collateral) {
                return $this->_jsonResponse(array('success' => false, 'message' => 'Collateral not found'), 404);
            }
            
            $collateralValue = $collateral["CollateralAsset"]["estimated_value"];
        } else {
            $collateralValue = floatval($this->request->query["collateralValue"] ?? 0);
        }
        
        if ($collateralValue <= 0) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Invalid collateral value'), 400);
        }
        
        $ltv = ($loanAmount / $collateralValue) * 100;
        
        return $this->_jsonResponse(array(
            "success" => true, 
            "ltv" => round($ltv, 2),
            "loan_amount" => $loanAmount,
            "collateral_value" => $collateralValue,
            "max_loan_amount" => round($collateralValue * 0.8, 2)
        ));
    }
    
    /**
     * Get user's collateral
     */
    public function myCollateral() {
        if (!$this->RateLimit->apply('default')) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Rate limit exceeded'), 429);
        }
        
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Unauthorized'), 401);
        }
        
        $collateral = $this->CollateralAsset->find("all", array(
            "conditions" => array("CollateralAsset.borrower_id" => $userId),
            "order" => array("CollateralAsset.created_at" => "DESC")
        ));
        
        return $this->_jsonResponse(array("success" => true, "collateral" => $collateral));
    }
    
    /**
     * Get valuation
     */
    public function getValuation() {
        $id = $this->request->params["id"] ?? null;
        
        if (!$id || !is_numeric($id)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Valid collateral ID required'), 400);
        }
        
        $collateral = $this->CollateralAsset->find("first", array(
            "conditions" => array("CollateralAsset.id" => $id)
        ));
        
        if (!$collateral) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Collateral not found'), 404);
        }
        
        $valuation = array(
            "estimated_value" => $collateral["CollateralAsset"]["estimated_value"],
            "market_value" => $collateral["CollateralAsset"]["market_value"],
            "valuation_date" => $collateral["CollateralAsset"]["valuation_date"] ?? date("Y-m-d"),
            "appraiser" => $collateral["CollateralAsset"]["appraiser"] ?? "System Valuation"
        );
        
        return $this->_jsonResponse(array("success" => true, "valuation" => $valuation));
    }
    
    /**
     * Upload document
     */
    public function uploadDocument() {
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Unauthorized'), 401);
        }
        
        $id = $this->request->params["id"] ?? null;
        
        if (!$id || !is_numeric($id)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Invalid collateral ID'), 400);
        }
        
        $collateral = $this->CollateralAsset->find("first", array(
            "conditions" => array("CollateralAsset.id" => $id, "CollateralAsset.borrower_id" => $userId)
        ));
        
        if (!$collateral) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Collateral not found'), 404);
        }
        
        $documents = json_decode($collateral["CollateralAsset"]["documents"] ?? "[]", true);
        
        $data = json_decode(file_get_contents("php://input"), true);
        $documents[] = array(
            "name" => htmlspecialchars($data["name"] ?? "document", ENT_QUOTES, 'UTF-8'),
            "url" => htmlspecialchars($data["url"] ?? "", ENT_QUOTES, 'UTF-8'),
            "type" => htmlspecialchars($data["type"] ?? "other", ENT_QUOTES, 'UTF-8'),
            "uploaded_at" => date("Y-m-d H:i:s")
        );
        
        $this->CollateralAsset->id = $id;
        $this->CollateralAsset->saveField("documents", json_encode($documents));
        
        return $this->_jsonResponse(array("success" => true, "message" => "Document uploaded"));
    }
    
    /**
     * Get pending collateral (admin)
     */
    public function pending() {
        $userId = $this->_getCurrentUserId();
        if (!$userId || !$this->_isAdmin($userId)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Admin access required'), 403);
        }
        
        $collateral = $this->CollateralAsset->find("all", array(
            "conditions" => array("CollateralAsset.verification_status" => "pending"),
            "order" => array("CollateralAsset.created_at" => "DESC")
        ));
        
        return $this->_jsonResponse(array("success" => true, "collateral" => $collateral));
    }
    
    /**
     * Verify collateral (admin)
     */
    public function verify() {
        $userId = $this->_getCurrentUserId();
        if (!$userId || !$this->_isAdmin($userId)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Admin access required'), 403);
        }
        
        $id = $this->request->params["id"] ?? null;
        
        if (!$id || !is_numeric($id)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Valid collateral ID required'), 400);
        }
        
        $collateral = $this->CollateralAsset->find("first", array(
            "conditions" => array("CollateralAsset.id" => $id)
        ));
        
        if (!$collateral) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Collateral not found'), 404);
        }
        
        $this->CollateralAsset->id = $id;
        $this->CollateralAsset->saveField("verification_status", "verified");
        $this->CollateralAsset->saveField("verified_at", date("Y-m-d H:i:s"));
        
        return $this->_jsonResponse(array("success" => true, "message" => "Collateral verified"));
    }
    
    /**
     * Reject collateral (admin)
     */
    public function reject() {
        $userId = $this->_getCurrentUserId();
        if (!$userId || !$this->_isAdmin($userId)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Admin access required'), 403);
        }
        
        $id = $this->request->params["id"] ?? null;
        
        if (!$id || !is_numeric($id)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Valid collateral ID required'), 400);
        }
        
        $data = json_decode(file_get_contents("php://input"), true);
        
        $collateral = $this->CollateralAsset->find("first", array(
            "conditions" => array("CollateralAsset.id" => $id)
        ));
        
        if (!$collateral) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Collateral not found'), 404);
        }
        
        $this->CollateralAsset->id = $id;
        $this->CollateralAsset->saveField("verification_status", "rejected");
        $this->CollateralAsset->saveField("rejection_reason", htmlspecialchars($data["reason"] ?? "", ENT_QUOTES, 'UTF-8'));
        
        return $this->_jsonResponse(array("success" => true, "message" => "Collateral rejected"));
    }
    
    /**
     * Request valuation
     */
    public function requestValuation() {
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Unauthorized'), 401);
        }
        
        $id = $this->request->params["id"] ?? null;
        
        if (!$id || !is_numeric($id)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Valid collateral ID required'), 400);
        }
        
        $collateral = $this->CollateralAsset->find("first", array(
            "conditions" => array("CollateralAsset.id" => $id, "CollateralAsset.borrower_id" => $userId)
        ));
        
        if (!$collateral) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Collateral not found'), 404);
        }
        
        $this->CollateralAsset->id = $id;
        $this->CollateralAsset->saveField("valuation_status", "pending");
        
        return $this->_jsonResponse(array("success" => true, "message" => "Valuation requested"));
    }
    
    /**
     * Get collateral types
     */
    public function types() {
        $types = array(
            array("code" => "real_estate", "name" => "Real Estate", "category" => "property"),
            array("code" => "vehicle", "name" => "Vehicle", "category" => "asset"),
            array("code" => "equipment", "name" => "Equipment", "category" => "business"),
            array("code" => "inventory", "name" => "Inventory", "category" => "business"),
            array("code" => "receivables", "name" => "Accounts Receivable", "category" => "financial"),
            array("code" => "stocks", "name" => "Stocks/Securities", "category" => "financial"),
            array("code" => "crypto", "name" => "Cryptocurrency", "category" => "digital"),
            array("code" => "precious_metals", "name" => "Precious Metals", "category" => "asset"),
            array("code" => "other", "name" => "Other", "category" => "other")
        );
        
        return $this->_jsonResponse(array("success" => true, "types" => $types));
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
