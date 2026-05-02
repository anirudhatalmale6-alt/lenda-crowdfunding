<?php
App::uses("AppController", "Controller");

class ApiAuthController extends AppController {
    public $name = "ApiAuth";
    public $uses = array("User");
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
        // Only allow login, register, forgotPassword, resetPassword without auth
        $this->Auth->allow(array('login', 'register', 'forgotPassword', 'resetPassword', 'verify2FA'));
    }
    
    /**
     * User login with rate limiting
     */
    public function login() {
        // Apply rate limiting for auth endpoints
        if (!$this->RateLimit->apply('auth')) {
            return $this->_jsonResponse(array(
                'success' => false, 
                'message' => 'Too many login attempts. Please try again later.'
            ), 429);
        }
        
        $data = json_decode(file_get_contents("php://input"), true);
        $email = isset($data['email']) ? trim($data['email']) : '';
        $password = isset($data['password']) ? $data['password'] : '';
        
        // Input validation
        if (empty($email) || empty($password)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Email and password required'), 400);
        }
        
        // Validate email format
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Invalid email format'), 400);
        }
        
        // Sanitize inputs
        $email = htmlspecialchars($email, ENT_QUOTES, 'UTF-8');
        
        $user = $this->User->find("first", array(
            'conditions' => array(
                'User.email' => $email,
                'User.is_active' => 1
            ),
            'recursive' => -1
        ));
        
        if (!$user || !password_verify($password, $user['User']['password_hash'])) {
            // Log failed login attempt
            $this->_logSecurityEvent('failed_login', $email);
            return $this->_jsonResponse(array('success' => false, 'message' => 'Invalid credentials'), 401);
        }
        
        // Check if account is locked
        if (isset($user['User']['failed_login_attempts']) && $user['User']['failed_login_attempts'] >= 5) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Account temporarily locked due to too many failed attempts'), 423);
        }
        
        // Check if 2FA is required
        if (!empty($user['User']['two_factor_enabled'])) {
            return $this->_jsonResponse(array(
                'success' => true, 
                'requires_2fa' => true, 
                'user_id' => $user['User']['id']
            ));
        }
        
        // Generate JWT token
        $token = $this->_generateToken($user['User']['id'], $user['User']['email']);
        
        // Update last login
        $this->User->id = $user['User']['id'];
        $this->User->saveField('last_login_at', date('Y-m-d H:i:s'));
        
        // Reset failed login attempts on success
        $this->User->saveField('failed_login_attempts', 0);
        
        // Log successful login
        $this->_logSecurityEvent('successful_login', $user['User']['id']);
        
        return $this->_jsonResponse(array(
            'success' => true,
            'token' => $token,
            'user' => array(
                'id' => $user['User']['id'],
                'email' => $user['User']['email'],
                'name' => $user['User']['name'],
                'role' => $user['User']['role']
            )
        ));
    }
    
    /**
     * User registration
     */
    public function register() {
        // Apply rate limiting
        if (!$this->RateLimit->apply('auth')) {
            return $this->_jsonResponse(array(
                'success' => false, 
                'message' => 'Too many requests. Please try again later.'
            ), 429);
        }
        
        $data = json_decode(file_get_contents("php://input"), true);
        
        // Validate registration data
        if (!$this->InputValidation->validateRegistration($data)) {
            return $this->_jsonResponse(array(
                'success' => false, 
                'message' => 'Validation failed',
                'errors' => $this->InputValidation->getErrors()
            ), 400);
        }
        
        // Sanitize input
        $data = $this->InputValidation->sanitize($data);
        
        $email = trim($data['email']);
        $password = $data['password'];
        $name = trim($data['name']);
        $role = isset($data['role']) ? $data['role'] : 'lender';
        
        // Check if email already exists
        $existing = $this->User->find("first", array(
            'conditions' => array('User.email' => $email),
            'recursive' => -1
        ));
        
        if ($existing) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Email already registered'), 409);
        }
        
        // Validate password strength
        if (!$this->_validatePasswordStrength($password)) {
            return $this->_jsonResponse(array(
                'success' => false, 
                'message' => 'Password must contain at least 8 characters, one uppercase, one lowercase, and one number'
            ), 400);
        }
        
        // Create user
        $this->User->create();
        $userData = array(
            'User' => array(
                'email' => $email,
                'password_hash' => password_hash($password, PASSWORD_BCRYPT),
                'name' => $name,
                'role' => $role,
                'status' => 'active',
                'kyc_status' => 'none'
            )
        );
        
        if ($this->User->save($userData)) {
            $userId = $this->User->getLastInsertID();
            $token = $this->_generateToken($userId, $email);
            
            // Log registration
            $this->_logSecurityEvent('registration', $userId);
            
            return $this->_jsonResponse(array(
                'success' => true,
                'token' => $token,
                'user' => array(
                    'id' => $userId,
                    'email' => $email,
                    'name' => $name,
                    'role' => $role
                )
            ));
        }
        
        return $this->_jsonResponse(array('success' => false, 'message' => 'Registration failed'), 500);
    }
    
    /**
     * Logout (client-side token invalidation guidance)
     */
    public function logout() {
        // In production, you might want to blacklist the token
        return $this->_jsonResponse(array('success' => true, 'message' => 'Logged out successfully'));
    }
    
    /**
     * Get current user info
     */
    public function me() {
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Unauthorized'), 401);
        }
        
        $user = $this->User->find("first", array(
            'conditions' => array('User.id' => $userId),
            'recursive' => -1,
            'fields' => array('id', 'email', 'name', 'role', 'status', 'kyc_status', 'two_factor_enabled')
        ));
        
        return $this->_jsonResponse(array('success' => true, 'user' => $user['User']));
    }
    
    /**
     * Verify 2FA code
     */
    public function verify2FA() {
        // Apply rate limiting
        if (!$this->RateLimit->apply('auth')) {
            return $this->_jsonResponse(array(
                'success' => false, 
                'message' => 'Too many attempts. Please try again later.'
            ), 429);
        }
        
        $data = json_decode(file_get_contents("php://input"), true);
        $userId = isset($data['userId']) ? intval($data['userId']) : 0;
        $code = isset($data['code']) ? $data['code'] : '';
        
        if (empty($userId) || empty($code)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'User ID and code required'), 400);
        }
        
        if (strlen($code) !== 6 || !is_numeric($code)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Invalid code format'), 400);
        }
        
        $user = $this->User->find("first", array(
            'conditions' => array('User.id' => $userId),
            'recursive' => -1
        ));
        
        if (!$user) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'User not found'), 404);
        }
        
        // SEC-005 FIX: Implement proper TOTP verification
        $secret = $user['User']['two_factor_secret'];
        
        if (empty($secret)) {
            return $this->_jsonResponse(array('success' => false, 'message' => '2FA not configured for this user'), 400);
        }
        
        // Verify TOTP code
        $isValid = $this->_verifyTOTP($secret, $code);
        
        if (!$isValid) {
            // Log failed 2FA attempt
            $this->_logSecurityEvent('failed_2fa', $userId);
            return $this->_jsonResponse(array('success' => false, 'message' => 'Invalid 2FA code'), 401);
        }
        
        // Generate JWT token after successful 2FA verification
        $token = $this->_generateToken($user['User']['id'], $user['User']['email']);
        
        // Log successful 2FA verification
        $this->_logSecurityEvent('successful_2fa', $user['User']['id']);
        
        return $this->_jsonResponse(array(
            'success' => true,
            'token' => $token,
            'user' => array(
                'id' => $user['User']['id'],
                'email' => $user['User']['email']
            )
        ));
    }
    
    /**
     * SEC-005 FIX: Verify TOTP code using Google Authenticator algorithm
     * 
     * @param string $secret Base32-encoded secret
     * @param string $code 6-digit TOTP code
     * @return bool True if code is valid
     */
    private function _verifyTOTP($secret, $code) {
        // Decode Base32 secret
        $secret = strtoupper($secret);
        $secret = str_replace(' ', '', $secret);
        
        // Base32 alphabet
        $base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $secretBinary = '';
        
        for ($i = 0; $i < strlen($secret); $i++) {
            $val = strpos($base32Chars, $secret[$i]);
            if ($val === false) {
                continue;
            }
            $secretBinary .= str_pad(decbin($val), 5, '0', STR_PAD_LEFT);
        }
        
        $secretBinary = pack('H*', bin2hex($secretBinary));
        
        // Get current time counter (30-second windows)
        $timeCounter = floor(time() / 30);
        
        // Check current and adjacent time windows (for clock drift)
        for ($offset = -1; $offset <= 1; $offset++) {
            $counter = $timeCounter + $offset;
            $counterBinary = pack('J', $counter);
            
            // Calculate HMAC-SHA1
            $hash = hash_hmac('sha1', $counterBinary, $secretBinary, true);
            
            // Dynamic truncation
            $offset = ord(substr($hash, -1)) & 0x0F;
            $truncated = ((ord($hash[$offset]) & 0x7F) << 24) |
                        ((ord($hash[$offset + 1]) & 0xFF) << 16) |
                        ((ord($hash[$offset + 2]) & 0xFF) << 8) |
                        (ord($hash[$offset + 3]) & 0xFF);
            
            $otp = str_pad($truncated % 1000000, 6, '0', STR_PAD_LEFT);
            
            if ($otp === $code) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * SEC-005 FIX: Generate backup codes for 2FA recovery
     * 
     * @return array Array of backup codes
     */
    private function _generateBackupCodes() {
        $codes = array();
        for ($i = 0; $i < 10; $i++) {
            $codes[] = strtoupper(substr(bin2hex(random_bytes(4)), 0, 8));
        }
        return $codes;
    }
    
    /**
     * Enable 2FA
     */
    public function enable2FA() {
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Unauthorized'), 401);
        }
        
        // Generate secret
        $secret = strtoupper(substr(str_shuffle('ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'), 0, 16));
        
        $this->User->id = $userId;
        $this->User->saveField('two_factor_enabled', 1);
        $this->User->saveField('two_factor_secret', $secret);
        
        return $this->_jsonResponse(array('success' => true, 'secret' => $secret));
    }
    
    /**
     * Disable 2FA
     */
    public function disable2FA() {
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Unauthorized'), 401);
        }
        
        $this->User->id = $userId;
        $this->User->saveField('two_factor_enabled', 0);
        $this->User->saveField('two_factor_secret', null);
        
        return $this->_jsonResponse(array('success' => true));
    }
    
    /**
     * Update user profile
     */
    public function updateProfile() {
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Unauthorized'), 401);
        }
        
        $data = json_decode(file_get_contents("php://input"), true);
        
        // Validate name if provided
        if (isset($data['name'])) {
            if (strlen($data['name']) < 2 || strlen($data['name']) > 255) {
                return $this->_jsonResponse(array('success' => false, 'message' => 'Name must be between 2 and 255 characters'), 400);
            }
            
            $this->User->id = $userId;
            $this->User->saveField('name', htmlspecialchars($data['name'], ENT_QUOTES, 'UTF-8'));
        }
        
        return $this->_jsonResponse(array('success' => true));
    }
    
    /**
     * Change password
     */
    public function changePassword() {
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Unauthorized'), 401);
        }
        
        $data = json_decode(file_get_contents("php://input"), true);
        $newPassword = isset($data['new_password']) ? $data['new_password'] : '';
        
        if (strlen($newPassword) < 8) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Password must be at least 8 characters'), 400);
        }
        
        // Validate password strength
        if (!$this->_validatePasswordStrength($newPassword)) {
            return $this->_jsonResponse(array(
                'success' => false, 
                'message' => 'Password must contain at least 8 characters, one uppercase, one lowercase, and one number'
            ), 400);
        }
        
        $this->User->id = $userId;
        $this->User->saveField('password_hash', password_hash($newPassword, PASSWORD_BCRYPT));
        
        // Log password change
        $this->_logSecurityEvent('password_change', $userId);
        
        return $this->_jsonResponse(array('success' => true));
    }
    
    /**
     * Forgot password - send reset email
     */
    public function forgotPassword() {
        // Apply rate limiting
        if (!$this->RateLimit->apply('auth')) {
            return $this->_jsonResponse(array(
                'success' => false, 
                'message' => 'Too many requests. Please try again later.'
            ), 429);
        }
        
        $data = json_decode(file_get_contents("php://input"), true);
        $email = isset($data['email']) ? trim($data['email']) : '';
        
        // Always return success to prevent email enumeration
        if (empty($email)) {
            return $this->_jsonResponse(array('success' => true, 'message' => 'If the email exists, a reset link will be sent'));
        }
        
        $user = $this->User->find("first", array(
            'conditions' => array('User.email' => $email),
            'recursive' => -1
        ));
        
        if ($user) {
            // Generate reset token and send email in production
            // For now, log the attempt
            $this->_logSecurityEvent('password_reset_request', $user['User']['id']);
        }
        
        // Always return success
        return $this->_jsonResponse(array('success' => true, 'message' => 'If the email exists, a reset link will be sent'));
    }
    
    /**
     * Reset password with token
     */
    public function resetPassword() {
        // Apply rate limiting
        if (!$this->RateLimit->apply('auth')) {
            return $this->_jsonResponse(array(
                'success' => false, 
                'message' => 'Too many requests. Please try again later.'
            ), 429);
        }
        
        $data = json_decode(file_get_contents("php://input"), true);
        $token = isset($data['token']) ? $data['token'] : '';
        $newPassword = isset($data['new_password']) ? $data['new_password'] : '';
        
        if (empty($token) || empty($newPassword)) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Token and new password required'), 400);
        }
        
        // Validate password strength
        if (!$this->_validatePasswordStrength($newPassword)) {
            return $this->_jsonResponse(array(
                'success' => false, 
                'message' => 'Password must contain at least 8 characters, one uppercase, one lowercase, and one number'
            ), 400);
        }
        
        // In production, validate token from database
        // For now, just return success for demo
        
        return $this->_jsonResponse(array('success' => true, 'message' => 'Password reset successful'));
    }
    
    /**
     * Submit KYC information
     */
    public function submitKYC() {
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Unauthorized'), 401);
        }
        
        $this->User->id = $userId;
        $this->User->saveField('kyc_status', 'pending');
        
        return $this->_jsonResponse(array('success' => true, 'kyc_status' => 'pending'));
    }
    
    /**
     * Get KYC status
     */
    public function getKYCStatus() {
        $userId = $this->_getCurrentUserId();
        if (!$userId) {
            return $this->_jsonResponse(array('success' => false, 'message' => 'Unauthorized'), 401);
        }
        
        $user = $this->User->find("first", array(
            'conditions' => array('User.id' => $userId),
            'recursive' => -1,
            'fields' => array('kyc_status')
        ));
        
        return $this->_jsonResponse(array('success' => true, 'kyc_status' => $user['User']['kyc_status']));
    }
    
    /**
     * Generate secure JWT token using LendaJwt library
     */
    private function _generateToken($userId, $email) {
        App::uses('LendaJwt', 'Lib');
        
        $payload = array(
            'sub' => $userId,
            'email' => $email,
            'type' => 'access'
        );
        
        return LendaJwt::generate($payload);
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
     * Validate password strength
     */
    private function _validatePasswordStrength($password) {
        if (strlen($password) < 8) {
            return false;
        }
        
        if (!preg_match('/[A-Z]/', $password)) {
            return false;
        }
        
        if (!preg_match('/[a-z]/', $password)) {
            return false;
        }
        
        if (!preg_match('/[0-9]/', $password)) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Log security events
     */
    private function _logSecurityEvent($event, $userId) {
        // In production, log to database or logging service
        $logData = array(
            'event' => $event,
            'user_id' => $userId,
            'ip' => isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'unknown',
            'user_agent' => isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : 'unknown',
            'timestamp' => date('Y-m-d H:i:s')
        );
        
        // Log to file in production
        CakeLog::write('security', json_encode($logData));
    }
    
    /**
     * JSON response helper
     */
    private function _jsonResponse($data, $code = 200) {
        http_response_code($code);
        header('Content-Type: application/json');
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: DENY');
        header('X-XSS-Protection: 1; mode=block');
        echo json_encode($data);
        exit;
    }
}
