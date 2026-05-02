<?php
/**
 * LENDA User Service
 * 
 * Service Layer pattern implementation for user business logic
 * Handles user CRUD operations, profile management, and user data
 * 
 * CODE-001: Split from UsersController.php to reduce god class
 */

App::uses('AppService', 'Service');

class UserService extends AppService {
    
    /**
     * Service name for logging
     */
    protected $serviceName = 'UserService';
    
    /**
     * Model dependencies
     */
    protected $User;
    protected $UserProfile;
    protected $UserAvatar;
    protected $UserView;
    protected $Role;
    
    /**
     * Initialize service
     */
    public function initialize() {
        $this->User = ClassRegistry::init('User');
        $this->UserProfile = ClassRegistry::init('UserProfile');
        $this->UserAvatar = ClassRegistry::init('UserAvatar');
        $this->UserView = ClassRegistry::init('UserView');
        $this->Role = ClassRegistry::init('Role');
    }
    
    /**
     * Get user by ID
     * 
     * @param int $userId User ID
     * @param array $contain Related models to fetch
     * @return array|null User data
     */
    public function getUserById($userId, $contain = ['UserProfile', 'UserAvatar']) {
        return $this->User->find('first', [
            'conditions' => ['User.id' => $userId],
            'contain' => $contain,
            'recursive' => 2
        ]);
    }
    
    /**
     * Get user by username
     * 
     * @param string $username Username
     * @param array $contain Related models
     * @return array|null User data
     */
    public function getUserByUsername($username, $contain = ['UserProfile', 'UserAvatar']) {
        return $this->User->find('first', [
            'conditions' => ['User.username' => $username],
            'contain' => $contain,
            'recursive' => 2
        ]);
    }
    
    /**
     * Get user by email
     * 
     * @param string $email Email address
     * @return array|null User data
     */
    public function getUserByEmail($email) {
        return $this->User->find('first', [
            'conditions' => ['User.email' => $email],
            'recursive' => -1
        ]);
    }
    
    /**
     * Create a new user
     * 
     * @param array $data User data
     * @return array Result with user ID or errors
     */
    public function createUser($data) {
        try {
            $this->User->create();
            
            if ($this->User->save($data)) {
                $userId = $this->User->id;
                
                // Create user profile if needed
                if (!empty($data['UserProfile'])) {
                    $this->UserProfile->create();
                    $data['UserProfile']['user_id'] = $userId;
                    $this->UserProfile->save($data['UserProfile']);
                }
                
                $this->logInfo("User created: {$userId}");
                
                return [
                    'success' => true,
                    'userId' => $userId
                ];
            }
            
            return [
                'success' => false,
                'errors' => $this->User->validationErrors
            ];
            
        } catch (Exception $e) {
            return $this->handleError($e, 'Create user failed');
        }
    }
    
    /**
     * Update user
     * 
     * @param int $userId User ID
     * @param array $data User data to update
     * @return array Result
     */
    public function updateUser($userId, $data) {
        try {
            $user = $this->User->findById($userId);
            if (!$user) {
                return ['success' => false, 'errors' => ['User not found']];
            }
            
            $this->User->id = $userId;
            if ($this->User->save($data)) {
                $this->logInfo("User updated: {$userId}");
                return ['success' => true];
            }
            
            return [
                'success' => false,
                'errors' => $this->User->validationErrors
            ];
            
        } catch (Exception $e) {
            return $this->handleError($e, 'Update user failed');
        }
    }
    
    /**
     * Delete user (soft delete or deactivate)
     * 
     * @param int $userId User ID
     * @param bool $hardDelete Whether to permanently delete
     * @return array Result
     */
    public function deleteUser($userId, $hardDelete = false) {
        try {
            if ($hardDelete) {
                if ($this->User->delete($userId)) {
                    $this->logInfo("User permanently deleted: {$userId}");
                    return ['success' => true];
                }
            } else {
                // Soft delete - deactivate user
                $this->User->id = $userId;
                if ($this->User->saveField('is_active', 0)) {
                    $this->logInfo("User deactivated: {$userId}");
                    return ['success' => true];
                }
            }
            
            return ['success' => false, 'errors' => ['Failed to delete user']];
            
        } catch (Exception $e) {
            return $this->handleError($e, 'Delete user failed');
        }
    }
    
    /**
     * Activate user
     * 
     * @param int $userId User ID
     * @return array Result
     */
    public function activateUser($userId) {
        try {
            $this->User->id = $userId;
            if ($this->User->saveField('is_active', 1)) {
                $this->logInfo("User activated: {$userId}");
                return ['success' => true];
            }
            return ['success' => false, 'errors' => ['Failed to activate user']];
            
        } catch (Exception $e) {
            return $this->handleError($e, 'Activate user failed');
        }
    }
    
    /**
     * Deactivate user
     * 
     * @param int $userId User ID
     * @return array Result
     */
    public function deactivateUser($userId) {
        try {
            $this->User->id = $userId;
            if ($this->User->saveField('is_active', 0)) {
                $this->logInfo("User deactivated: {$userId}");
                return ['success' => true];
            }
            return ['success' => false, 'errors' => ['Failed to deactivate user']];
            
        } catch (Exception $e) {
            return $this->handleError($e, 'Deactivate user failed');
        }
    }
    
    /**
     * Get user profile with full details
     * 
     * @param int $userId User ID
     * @return array|null User profile data
     */
    public function getUserProfile($userId) {
        return $this->User->find('first', [
            'conditions' => ['User.id' => $userId],
            'contain' => [
                'UserProfile' => [
                    'City',
                    'State',
                    'Country'
                ],
                'UserAvatar'
            ],
            'recursive' => 2
        ]);
    }
    
    /**
     * Update user profile
     * 
     * @param int $userId User ID
     * @param array $profileData Profile data
     * @return array Result
     */
    public function updateUserProfile($userId, $profileData) {
        try {
            $profile = $this->UserProfile->find('first', [
                'conditions' => ['user_id' => $userId]
            ]);
            
            if ($profile) {
                $this->UserProfile->id = $profile['UserProfile']['id'];
            } else {
                $this->UserProfile->create();
                $profileData['user_id'] = $userId;
            }
            
            if ($this->UserProfile->save($profileData)) {
                $this->logInfo("User profile updated: {$userId}");
                return ['success' => true];
            }
            
            return [
                'success' => false,
                'errors' => $this->UserProfile->validationErrors
            ];
            
        } catch (Exception $e) {
            return $this->handleError($e, 'Update profile failed');
        }
    }
    
    /**
     * Record user view
     * 
     * @param int $userId User being viewed
     * @param int $viewingUserId User viewing
     * @param int $ipId IP address ID
     */
    public function recordUserView($userId, $viewingUserId, $ipId) {
        $this->UserView->create();
        $this->UserView->save([
            'user_id' => $userId,
            'viewing_user_id' => $viewingUserId,
            'ip_id' => $ipId
        ]);
    }
    
    /**
     * Get user statistics for admin
     * 
     * @return array Statistics
     */
    public function getUserStatistics() {
        return [
            'total_users' => $this->User->find('count', ['recursive' => -1]),
            'active_users' => $this->User->find('count', [
                'conditions' => ['User.is_active' => 1],
                'recursive' => -1
            ]),
            'inactive_users' => $this->User->find('count', [
                'conditions' => ['User.is_active' => 0],
                'recursive' => -1
            ]),
            'admin_users' => $this->User->find('count', [
                'conditions' => ['User.role_id' => ConstUserTypes::Admin],
                'recursive' => -1
            ])
        ];
    }
    
    /**
     * Get all users with pagination
     * 
     * @param array $conditions Search conditions
     * @param int $limit Results per page
     * @param int $page Current page
     * @return array Users list
     */
    public function getUsers($conditions = [], $limit = 15, $page = 1) {
        return $this->User->find('all', [
            'conditions' => $conditions,
            'contain' => ['Role', 'UserProfile' => ['Country'], 'UserAvatar'],
            'limit' => $limit,
            'page' => $page,
            'order' => ['User.id' => 'desc'],
            'recursive' => 1
        ]);
    }
    
    /**
     * Get user list for admin
     * 
     * @param array $conditions Filter conditions
     * @return array Users
     */
    public function getAdminUserList($conditions = []) {
        return $this->User->find('all', [
            'conditions' => $conditions,
            'contain' => [
                'Role',
                'UserProfile' => [
                    'Country' => [
                        'fields' => ['Country.name', 'Country.iso_alpha2']
                    ]
                ],
                'UserAvatar',
                'LastLoginIp' => [
                    'City', 'State', 'Country'
                ]
            ],
            'limit' => 15,
            'order' => ['User.id' => 'desc'],
            'recursive' => 1
        ]);
    }
    
    /**
     * Get user counts by registration type
     * 
     * @return array Counts
     */
    public function getUserCountsByType() {
        return [
            'openid' => $this->User->find('count', [
                'conditions' => [
                    'User.is_openid_register' => 1,
                    'User.role_id' => ConstUserTypes::User
                ],
                'recursive' => -1
            ]),
            'facebook' => $this->User->find('count', [
                'conditions' => [
                    'User.is_facebook_register' => 1,
                    'User.role_id' => ConstUserTypes::User
                ],
                'recursive' => -1
            ]),
            'twitter' => $this->User->find('count', [
                'conditions' => [
                    'User.is_twitter_register' => 1,
                    'User.role_id' => ConstUserTypes::User
                ],
                'recursive' => -1
            ]),
            'linkedin' => $this->User->find('count', [
                'conditions' => [
                    'User.is_linkedin_register' => 1,
                    'User.role_id' => ConstUserTypes::User
                ],
                'recursive' => -1
            ]),
            'google' => $this->User->find('count', [
                'conditions' => [
                    'User.is_google_register' => 1,
                    'User.role_id' => ConstUserTypes::User
                ],
                'recursive' => -1
            ]),
            'site_users' => $this->User->find('count', [
                'conditions' => [
                    'User.is_facebook_register' => 0,
                    'User.is_twitter_register' => 0,
                    'User.is_openid_register' => 0,
                    'User.is_linkedin_register' => 0,
                    'User.is_google_register' => 0,
                    'User.role_id !=' => ConstUserTypes::Admin
                ],
                'recursive' => -1
            ])
        ];
    }
    
    /**
     * Bulk update users
     * 
     * @param array $userIds User IDs to update
     * @param array $data Data to update
     * @return array Result
     */
    public function bulkUpdateUsers($userIds, $data) {
        try {
            if ($this->User->updateAll($data, ['User.id' => $userIds])) {
                $this->logInfo("Bulk updated " . count($userIds) . " users");
                return ['success' => true, 'count' => count($userIds)];
            }
            return ['success' => false, 'errors' => ['Bulk update failed']];
            
        } catch (Exception $e) {
            return $this->handleError($e, 'Bulk update failed');
        }
    }
    
    /**
     * Get user engagement metrics
     * 
     * @return array Metrics
     */
    public function getEngagementMetrics() {
        return [
            'total_users' => $this->User->find('count', ['recursive' => -1]),
            'idle_users' => $this->User->find('count', [
                'conditions' => ['User.is_idle' => 1],
                'recursive' => -1
            ]),
            'funded_users' => $this->User->find('count', [
                'conditions' => ['User.is_funded' => 1],
                'recursive' => -1
            ]),
            'posted_users' => $this->User->find('count', [
                'conditions' => ['User.is_project_posted' => 1],
                'recursive' => -1
            ]),
            'engaged_users' => $this->User->find('count', [
                'conditions' => ['User.is_engaged' => 1],
                'recursive' => -1
            ])
        ];
    }
}
