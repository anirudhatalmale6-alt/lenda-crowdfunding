<?php
/**
 * LENDA Auth Service
 * 
 * Service Layer pattern implementation for authentication logic
 * Handles login, logout, registration, password reset, social auth
 * 
 * CODE-001: Split from UsersController.php to reduce god class
 * CODE-004: Consolidates duplicate validation logic
 */

App::uses('AppService', 'Service');

class AuthService extends AppService {
    
    /**
     * Service name for logging
     */
    protected $serviceName = 'AuthService';
    
    /**
     * Model dependencies
     */
    protected $User;
    protected $UserLogin;
    protected $UserOpenid;
    protected $EmailTemplate;
    
    /**
     * Initialize service
     */
    public function initialize() {
        $this->User = ClassRegistry::init('User');
        $this->UserLogin = ClassRegistry::init('UserLogin');
        $this->UserOpenid = ClassRegistry::init('UserOpenid');
    }
    
    /**
     * Authenticate user with email/username and password
     * 
     * @param string $loginIdentifier Email or username
     * @param string $password User password
     * @return array Result with user data or errors
     */
    public function login($loginIdentifier, $password) {
        try {
            // Find user by email or username
            $user = $this->User->find('first', [
                'conditions' => [
                    'OR' => [
                        'User.email' => $loginIdentifier,
                        'User.username' => $loginIdentifier
                    ]
                ],
                'recursive' => -1
            ]);
            
            if (!$user) {
                return [
                    'success' => false,
                    'error' => 'Invalid login credentials'
                ];
            }
            
            // Verify password
            $hashedPassword = crypt($password, $user['User']['password']);
            if ($hashedPassword !== $user['User']['password']) {
                $this->logWarning("Failed login attempt for user: {$user['User']['id']}");
                return [
                    'success' => false,
                    'error' => 'Invalid login credentials'
                ];
            }
            
            // Check if user is active
            if (!$user['User']['is_active']) {
                return [
                    'success' => false,
                    'error' => 'Account is not active'
                ];
            }
            
            // Record login
            $this->recordLogin($user['User']['id']);
            
            $this->logInfo("User logged in: {$user['User']['id']}");
            
            return [
                'success' => true,
                'user' => $user
            ];
            
        } catch (Exception $e) {
            return $this->handleError($e, 'Login failed');
        }
    }
    
    /**
     * Record user login
     * 
     * @param int $userId User ID
     */
    public function recordLogin($userId) {
        $this->UserLogin->insertUserLogin($userId);
    }
    
    /**
     * Logout user
     * 
     * @param int $userId User ID
     * @return array Result
     */
    public function logout($userId) {
        try {
            $this->logInfo("User logged out: {$userId}");
            return ['success' => true];
        } catch (Exception $e) {
            return $this->handleError($e, 'Logout failed');
        }
    }
    
    /**
     * Register new user
     * 
     * @param array $data Registration data
     * @return array Result with user ID or errors
     */
    public function register($data) {
        try {
            // Validate registration data
            $validationResult = $this->validateRegistrationData($data);
            if (!$validationResult['success']) {
                return $validationResult;
            }
            
            // Check if email already exists
            if ($this->isEmailExists($data['User']['email'])) {
                return [
                    'success' => false,
                    'error' => 'Email already registered'
                ];
            }
            
            // Check if username already exists
            if ($this->isUsernameExists($data['User']['username'])) {
                return [
                    'success' => false,
                    'error' => 'Username already taken'
                ];
            }
            
            // Prepare user data
            $userData = $this->prepareRegistrationData($data);
            
            // Save user
            $this->User->create();
            if ($this->User->save($userData, false)) {
                $userId = $this->User->id;
                
                // Create user profile
                $this->createUserProfile($userId, $data);
                
                // Handle social registration
                if (!empty($data['User']['openid_url'])) {
                    $this->UserOpenid->create();
                    $this->UserOpenid->save([
                        'openid' => $data['User']['openid_url'],
                        'user_id' => $userId
                    ]);
                }
                
                $this->logInfo("New user registered: {$userId}");
                
                return [
                    'success' => true,
                    'userId' => $userId,
                    'needsEmailVerification' => Configure::read('user.is_email_verification_for_register'),
                    'needsAdminApproval' => Configure::read('user.is_admin_activate_after_register')
                ];
            }
            
            return [
                'success' => false,
                'errors' => $this->User->validationErrors
            ];
            
        } catch (Exception $e) {
            return $this->handleError($e, 'Registration failed');
        }
    }
    
    /**
     * Validate registration data
     * 
     * @param array $data Registration data
     * @return array Validation result
     */
    protected function validateRegistrationData($data) {
        $errors = [];
        
        // Required fields
        $requiredFields = ['email', 'username'];
        foreach ($requiredFields as $field) {
            if (empty($data['User'][$field])) {
                $errors[] = ucfirst($field) . ' is required';
            }
        }
        
        // Email format
        if (!empty($data['User']['email']) && !filter_var($data['User']['email'], FILTER_VALIDATE_EMAIL)) {
            $errors[] = 'Invalid email format';
        }
        
        // Username validation
        if (!empty($data['User']['username'])) {
            if (strlen($data['User']['username']) < 3) {
                $errors[] = 'Username must be at least 3 characters';
            }
            if (!preg_match('/^[a-zA-Z0-9_]+$/', $data['User']['username'])) {
                $errors[] = 'Username can only contain letters, numbers, and underscores';
            }
        }
        
        // Password validation (if provided)
        if (!empty($data['User']['passwd'])) {
            if (strlen($data['User']['passwd']) < 6) {
                $errors[] = 'Password must be at least 6 characters';
            }
        }
        
        if (!empty($errors)) {
            return ['success' => false, 'errors' => $errors];
        }
        
        return ['success' => true];
    }
    
    /**
     * Check if email exists
     * 
     * @param string $email Email address
     * @return bool
     */
    public function isEmailExists($email) {
        $count = $this->User->find('count', [
            'conditions' => ['User.email' => $email],
            'recursive' => -1
        ]);
        return $count > 0;
    }
    
    /**
     * Check if username exists
     * 
     * @param string $username Username
     * @return bool
     */
    public function isUsernameExists($username) {
        $count = $this->User->find('count', [
            'conditions' => ['User.username' => $username],
            'recursive' => -1
        ]);
        return $count > 0;
    }
    
    /**
     * Prepare registration data
     * 
     * @param array $data Raw registration data
     * @return array Prepared data
     */
    protected function prepareRegistrationData($data) {
        $userData = $data['User'];
        
        // Handle password
        if (isset($userData['passwd'])) {
            $userData['password'] = getCryptHash($userData['email'] . Configure::read('Security.salt'));
            if (!empty($userData['twitter_user_id'])) {
                $userData['password'] = getCryptHash($userData['twitter_user_id'] . Configure::read('Security.salt'));
            } else {
                $userData['password'] = getCryptHash($userData['passwd']);
            }
        }
        
        // Set defaults
        $userData['is_agree_terms_conditions'] = 1;
        $userData['ip_id'] = $this->User->toSaveIp();
        
        // Email verification
        if (!Configure::read('user.is_email_verification_for_register')) {
            $userData['is_email_confirmed'] = 1;
        }
        
        // Account activation
        if (!Configure::read('User.signup_fee')) {
            $userData['is_active'] = Configure::read('user.is_admin_activate_after_register') ? 0 : 1;
        }
        
        // Set role
        $userData['role_id'] = ConstUserTypes::User;
        
        return ['User' => $userData];
    }
    
    /**
     * Create user profile
     * 
     * @param int $userId User ID
     * @param array $data Registration data
     */
    protected function createUserProfile($userId, $data) {
        $profileData = [
            'user_id' => $userId
        ];
        
        // Handle location data
        if (!empty($data['City']['name'])) {
            App::uses('City', 'Model');
            $City = ClassRegistry::init('City');
            $profileData['city_id'] = !empty($data['City']['id']) 
                ? $data['City']['id'] 
                : $City->findOrSaveAndGetId($data['City']['name']);
        }
        
        if (!empty($data['State']['name'])) {
            App::uses('State', 'Model');
            $State = ClassRegistry::init('State');
            $profileData['state_id'] = !empty($data['State']['id']) 
                ? $data['State']['id'] 
                : $State->findOrSaveAndGetId($data['State']['name']);
        }
        
        if (!empty($data['User']['country_iso_code'])) {
            App::uses('Country', 'Model');
            $Country = ClassRegistry::init('Country');
            $countryId = $Country->findCountryIdFromIso2($data['User']['country_iso_code']);
            if ($countryId) {
                $profileData['country_id'] = $countryId;
            }
        }
        
        $this->UserProfile->create();
        $this->UserProfile->save($profileData, false);
    }
    
    /**
     * Request password reset
     * 
     * @param string $email Email address
     * @return array Result
     */
    public function requestPasswordReset($email) {
        try {
            $user = $this->User->find('first', [
                'conditions' => [
                    'User.email' => $email,
                    'User.is_active' => 1
                ],
                'recursive' => -1
            ]);
            
            if (!$user) {
                return [
                    'success' => false,
                    'error' => 'No user found with this email'
                ];
            }
            
            // Check if social login user
            if ($this->isSocialLoginUser($user['User'])) {
                return [
                    'success' => false,
                    'error' => 'This account was registered via social login'
                ];
            }
            
            // Generate reset token
            $resetToken = $this->User->getResetPasswordHash($user['User']['id']);
            
            // Update user with reset token
            $this->User->updateAll(
                [
                    'User.pwd_reset_token' => "'" . $resetToken . "'",
                    'User.pwd_reset_requested_date' => "'" . date("Y-m-d H:i:s") . "'"
                ],
                ['User.id' => $user['User']['id']]
            );
            
            // Send reset email
            $this->sendPasswordResetEmail($user['User'], $resetToken);
            
            $this->logInfo("Password reset requested for user: {$user['User']['id']}");
            
            return ['success' => true];
            
        } catch (Exception $e) {
            return $this->handleError($e, 'Password reset request failed');
        }
    }
    
    /**
     * Check if user is social login user
     * 
     * @param array $user User data
     * @return bool
     */
    protected function isSocialLoginUser($user) {
        return !empty($user['is_openid_register']) 
            || !empty($user['is_yahoo_register']) 
            || !empty($user['is_google_register'])
            || !empty($user['is_facebook_register'])
            || !empty($user['is_twitter_register']);
    }
    
    /**
     * Send password reset email
     * 
     * @param array $user User data
     * @param string $resetToken Reset token
     */
    protected function sendPasswordResetEmail($user, $resetToken) {
        App::import('Model', 'EmailTemplate');
        $this->EmailTemplate = new EmailTemplate();
        
        $emailFindReplace = [
            '##USERNAME##' => $user['username'],
            '##SITE_NAME##' => Configure::read('site.name'),
            '##SITE_URL##' => Router::url('/', true),
            '##SUPPORT_EMAIL##' => Configure::read('EmailTemplate.admin_email'),
            '##RESET_URL##' => Router::url([
                'controller' => 'users',
                'action' => 'reset',
                $user['id'],
                $resetToken
            ], true)
        ];
        
        $template = $this->EmailTemplate->selectTemplate('Forgot Password');
        $this->User->_sendEmail($template, $emailFindReplace, $user['email']);
    }
    
    /**
     * Reset password
     * 
     * @param int $userId User ID
     * @param string $token Reset token
     * @param string $newPassword New password
     * @return array Result
     */
    public function resetPassword($userId, $token, $newPassword) {
        try {
            // Validate token
            if (!$this->User->isValidResetPasswordHash($userId, $token)) {
                return [
                    'success' => false,
                    'error' => 'Invalid or expired reset token'
                ];
            }
            
            // Update password
            $hashedPassword = getCryptHash($newPassword);
            $this->User->id = $userId;
            $this->User->saveField('password', $hashedPassword);
            $this->User->saveField('pwd_reset_token', '');
            
            // Send confirmation email
            $user = $this->User->findById($userId);
            $this->sendPasswordChangedEmail($user['User']);
            
            $this->logInfo("Password reset completed for user: {$userId}");
            
            return ['success' => true];
            
        } catch (Exception $e) {
            return $this->handleError($e, 'Password reset failed');
        }
    }
    
    /**
     * Send password changed confirmation email
     * 
     * @param array $user User data
     */
    protected function sendPasswordChangedEmail($user) {
        App::import('Model', 'EmailTemplate');
        $this->EmailTemplate = new EmailTemplate();
        
        $emailFindReplace = [
            '##SUPPORT_EMAIL##' => Configure::read('EmailTemplate.admin_email'),
            '##USERNAME##' => $user['username']
        ];
        
        $template = $this->EmailTemplate->selectTemplate('Password Changed');
        $this->User->_sendEmail($template, $emailFindReplace, $user['email']);
    }
    
    /**
     * Change password
     * 
     * @param int $userId User ID
     * @param string $oldPassword Current password
     * @param string $newPassword New password
     * @return array Result
     */
    public function changePassword($userId, $oldPassword, $newPassword) {
        try {
            $user = $this->User->findById($userId, ['password'], -1);
            
            if (!$user) {
                return ['success' => false, 'error' => 'User not found'];
            }
            
            // Verify old password
            $hashedPassword = crypt($oldPassword, $user['User']['password']);
            if ($hashedPassword !== $user['User']['password']) {
                return ['success' => false, 'error' => 'Current password is incorrect'];
            }
            
            // Update password
            $this->User->id = $userId;
            $this->User->saveField('password', getCryptHash($newPassword));
            
            $this->logInfo("Password changed for user: {$userId}");
            
            return ['success' => true];
            
        } catch (Exception $e) {
            return $this->handleError($e, 'Change password failed');
        }
    }
    
    /**
     * Activate user account
     * 
     * @param int $userId User ID
     * @param string $activationHash Activation hash
     * @return array Result
     */
    public function activateAccount($userId, $activationHash) {
        try {
            $user = $this->User->find('first', [
                'conditions' => [
                    'User.id' => $userId,
                    'User.is_email_confirmed' => 0
                ],
                'recursive' => -1
            ]);
            
            if (!$user) {
                return ['success' => false, 'error' => 'Invalid activation request'];
            }
            
            // Verify hash
            if (!$this->User->isValidActivateHash($userId, $activationHash)) {
                return ['success' => false, 'error' => 'Invalid activation hash'];
            }
            
            // Activate account
            $this->User->id = $userId;
            $this->User->saveField('is_email_confirmed', 1);
            
            if (!Configure::read('user.signup_fee') && empty($user['User']['is_active'])) {
                $this->User->saveField('is_active', Configure::read('user.is_admin_activate_after_register') ? 0 : 1);
            }
            
            // Send welcome email
            if (Configure::read('user.is_welcome_mail_after_register')) {
                $this->User->_sendWelcomeMail($userId, $user['User']['email'], $user['User']['username']);
            }
            
            $this->logInfo("User account activated: {$userId}");
            
            return [
                'success' => true,
                'user' => $this->User->findById($userId)
            ];
            
        } catch (Exception $e) {
            return $this->handleError($e, 'Account activation failed');
        }
    }
    
    /**
     * Resend activation email
     * 
     * @param int $userId User ID
     * @param string $hash Current activation hash
     * @return array Result
     */
    public function resendActivationEmail($userId, $hash) {
        try {
            $user = $this->User->findById($userId, ['email', 'username'], -1);
            
            if (!$user) {
                return ['success' => false, 'error' => 'User not found'];
            }
            
            $newHash = $this->User->getResendActivateHash($userId);
            $this->User->_sendActivationMail($user['User']['email'], $userId, $newHash);
            
            $this->logInfo("Activation email resent for user: {$userId}");
            
            return ['success' => true];
            
        } catch (Exception $e) {
            return $this->handleError($e, 'Resend activation failed');
        }
    }
    
    /**
     * Handle social login/registration
     * 
     * @param array $socialProfile Social provider profile data
     * @param string $provider Provider name (facebook, twitter, google, etc.)
     * @return array Result
     */
    public function handleSocialAuth($socialProfile, $provider) {
        try {
            $providerKey = strtolower($provider);
            $providerUserIdField = $providerKey . '_user_id';
            $providerRegisterField = 'is_' . $providerKey . '_register';
            
            // Check if user already exists
            $user = $this->User->find('first', [
                'conditions' => [
                    'User.' . $providerUserIdField => $socialProfile['identifier']
                ],
                'recursive' => -1
            ]);
            
            if ($user) {
                // Existing user - log them in
                $this->recordLogin($user['User']['id']);
                return [
                    'success' => true,
                    'isNew' => false,
                    'user' => $user
                ];
            }
            
            // New social user - create account
            $userData = [
                'User' => [
                    'username' => $socialProfile['displayName'] ?: $socialProfile['email'],
                    'email' => $socialProfile['email'],
                    $providerUserIdField => $socialProfile['identifier'],
                    $providerRegisterField => 1,
                    'is_email_confirmed' => 1,
                    'is_active' => 1,
                    'role_id' => ConstUserTypes::User,
                    'password' => getCryptHash($socialProfile['identifier'] . Configure::read('Security.salt'))
                ]
            ];
            
            $this->User->create();
            if ($this->User->save($userData, false)) {
                $userId = $this->User->id;
                
                // Create profile
                $this->createUserProfile($userId, [
                    'UserProfile' => [
                        'first_name' => $socialProfile['firstName'] ?? '',
                        'last_name' => $socialProfile['lastName'] ?? ''
                    ]
                ]);
                
                $this->logInfo("Social user registered via {$provider}: {$userId}");
                
                return [
                    'success' => true,
                    'isNew' => true,
                    'userId' => $userId
                ];
            }
            
            return [
                'success' => false,
                'errors' => $this->User->validationErrors
            ];
            
        } catch (Exception $e) {
            return $this->handleError($e, 'Social authentication failed');
        }
    }
    
    /**
     * Validate user credentials
     * 
     * @param string $loginIdentifier Email or username
     * @param string $password Password
     * @return array Validation result
     */
    public function validateCredentials($loginIdentifier, $password) {
        $errors = [];
        
        if (empty($loginIdentifier)) {
            $errors[] = 'Email or username is required';
        }
        
        if (empty($password)) {
            $errors[] = 'Password is required';
        }
        
        if (!empty($errors)) {
            return ['success' => false, 'errors' => $errors];
        }
        
        return ['success' => true];
    }
}
