<?php
/**
 * CrowdFunding
 *
 * PHP version 5
 *
 * @category   PHP
 * @package    Crowdfunding
 * @subpackage Core
 * @author     Agriya <info@agriya.com>
 * @copyright  2018 Agriya Infoway Private Ltd
 * @license    http://www.agriya.com/ Agriya Infoway Licence
 * @link       http://www.agriya.com
 * 
 * SEC-003: Security enhanced version with cryptographically secure tokens
 */
class PersistentLoginComponent extends Component
{
    var $components = array(
        'Cookie'
    );
    
    // SEC-003: Token configuration
    const TOKEN_LENGTH = 32; // 256 bits
    const SERIES_LENGTH = 16; // 128 bits
    
    /**
     * SEC-003: Generate cryptographically secure token
     * Uses random_bytes() for cryptographic security
     */
    protected function _generateSecureToken($length = null) {
        $length = $length ?? self::TOKEN_LENGTH;
        return bin2hex(random_bytes($length));
    }
    
    /**
     * SEC-003: Hash token with constant-time comparison
     */
    protected function _hashToken($token) {
        return hash('sha256', $token);
    }
    
    public function _persistent_login_create_cookie($user, $pers_data = array()) 
    {
        $cookie_name = $this->_persistent_login_get_cookie_name();
        if (!empty($_COOKIE[$cookie_name])) {
            $cookie_val = $_COOKIE[$cookie_name];
        }
        App::import('Model', 'PersistentLogin');
        $this->PersistentLogin = new PersistentLogin();
        if (isset($cookie_val) && !isset($pers_data['pl_series'])) {
            list($user_id, $series, $token) = explode(':', $cookie_val);
            // SEC-003: Delete entire series on authentication (prevents token theft)
            $this->PersistentLogin->deleteAll(array(
                'PersistentLogin.user_id' => $user_id,
                'PersistentLogin.series' => $series
            ));
        }
        // SEC-003: Generate new cryptographically secure token
        $token = $this->_generateSecureToken();
        $days = Configure::read('user.remember_me_maxlife');
        $expires = (!empty($pers_data['pl_expires']) ? $pers_data['pl_expires'] : (($days > 0) ? strtotime('Now') +$days*86400 : 0));
        // SEC-003: Generate new cryptographically secure series
        $series = (!empty($pers_data['pl_series']) ? $pers_data['pl_series'] : $this->_generateSecureToken(self::SERIES_LENGTH));
        
        // SEC-003: Set secure cookie options
        $secure = Configure::read('user.remember_me_secure') === 'Yes';
        $httpOnly = true; // SEC-003: Prevent JavaScript access
        $sameSite = 'Strict'; // SEC-003: CSRF protection
        
        $this->_persistent_login_setcookie($cookie_name, $user['User']['id'] . ':' . $series . ':' . $token, $expires > 0 ? $expires : 2147483647, $secure, $httpOnly, $sameSite);
        if (!empty($_COOKIE[$cookie_name])) {
            $cookie_val = $_COOKIE[$cookie_name];
        }
        $data['PersistentLogin']['user_id'] = $user['User']['id'];
        // SEC-003: Store hashed token only, not plaintext
        $data['PersistentLogin']['series'] = $this->_hashToken($series);
        $data['PersistentLogin']['token'] = $this->_hashToken($token);
        $data['PersistentLogin']['expires'] = $expires;
        $data['PersistentLogin']['ip_id'] = $this->PersistentLogin->toSaveIp();
        $persistent_login_count = $this->PersistentLogin->find('count', array(
            'conditions' => array(
                'PersistentLogin.user_id' => $user['User']['id']
            )
        ));
        if ($persistent_login_count < Configure::read('user.remember_me_maxlogins')) {
            $this->PersistentLogin->save($data);
        }
        return $cookie_name;
    }
    public function _persistent_login_get_cookie_name() 
    {
        $cookie_name = '';
        if (empty($cookie_name)) {
            $cookie_name = Configure::read('user.remember_me_cookie_prefix') . substr(session_name() , 4);
        }
        return $cookie_name;
    }
    public function _persistent_login_setcookie($name, $value, $expire = 0, $secure = false, $httpOnly = true, $sameSite = 'Strict') 
    {
        // SEC-003: Set secure cookie with all security options
        $options = array(
            'expires' => $expire,
            'path' => '/',
            'domain' => '',
            'secure' => $secure,
            'httponly' => $httpOnly,
            'samesite' => $sameSite
        );
        
        // Use CakePHP's Cookie component for secure setting
        $this->Cookie->write($name, $value, false, $expire);
        
        // Also set raw cookie for better control
        header("Set-Cookie: $name=" . urlencode($value) 
            . "; expires=" . gmdate('D, d M Y H:i:s T', $expire) 
            . "; path=/" 
            . ($secure ? "; secure" : '') 
            . ($httpOnly ? "; HttpOnly" : '') 
            . "; SameSite=$sameSite", false);
    }
    
    /**
     * SEC-003: Deprecated - kept for backward compatibility
     * Use _generateSecureToken instead
     */
    public function get_token($data) 
    {
        // SEC-003: Generate cryptographically secure token instead of weak hash
        return $this->_generateSecureToken();
    }
    
    public function _persistent_login_check() 
    {
        App::import('Model', 'PersistentLogin');
        $this->PersistentLogin = new PersistentLogin();
        $now = strtotime('now');
        $cookie_name = $this->_persistent_login_get_cookie_name();
        $cookie_val = $_COOKIE[$cookie_name];
        if (!empty($cookie_val) && empty($_SESSION['persistent_login_check'])) {
            $_SESSION['persistent_login_check'] = true;
            list($uid, $series, $token) = explode(':', $cookie_val);
            
            // SEC-003: Find by hashed series
            $hashedSeries = $this->_hashToken($series);
            $persistentLogin = $this->PersistentLogin->find('first', array(
                'conditions' => array(
                    'PersistentLogin.user_id' => $uid,
                    'PersistentLogin.series' => $hashedSeries,
                ) ,
                'recursive' => -1
            ));
            if (empty($persistentLogin)) {
                // SEC-003: Invalid series - potential theft attempt
                $this->_logSecurityEvent('invalid_series', $uid);
                return false;
            } else if ($persistentLogin['PersistentLogin']['expires'] > 0 && $persistentLogin['PersistentLogin']['expires'] < $now) {
                // SEC-003: Expired token
                return false;
            }
            
            // SEC-003: Constant-time comparison to prevent timing attacks
            if (hash_equals($persistentLogin['PersistentLogin']['token'], $this->_hashToken($token))) {
                // SEC-003: Delete entire series on successful authentication (rotation)
                $this->PersistentLogin->deleteAll(array(
                    'PersistentLogin.user_id' => $uid,
                    'PersistentLogin.series' => $hashedSeries
                ));
                $user = $this->PersistentLogin->User->find('first', array(
                    'conditions' => array(
                        'User.id' => $uid
                    ) ,
                    'recursive' => -1
                ));
                
                // SEC-003: Log successful authentication
                $this->_logSecurityEvent('successful_authentication', $uid);
                
                return $user;
            } else {
                // SEC-003: Token mismatch - potential theft attempt
                $this->_logSecurityEvent('token_mismatch', $uid);
                // SEC-003: Invalidate entire series on token mismatch
                $this->PersistentLogin->deleteAll(array(
                    'PersistentLogin.user_id' => $uid
                ));
            }
        }
    }
    
    /**
     * SEC-003: Log security events
     */
    protected function _logSecurityEvent($event, $userId) {
        $logData = array(
            'event' => 'persistent_login_' . $event,
            'user_id' => $userId,
            'ip' => isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'unknown',
            'user_agent' => isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : 'unknown',
            'timestamp' => date('Y-m-d H:i:s')
        );
        
        CakeLog::write('security', json_encode($logData));
    }
    
    function _persistent_login_match($path) 
    {
        $secure = Configure::read('user.remember_me_secure');
        $pages = Configure::read('user.remember_me_pages');
        $pages_array = explode(',', $pages);
        $is_secure = 0;
        if ($secure == 'Only the listed pages') {
            $is_secure = 1;
        }
        if (($is_secure && in_array($path, $pages_array)) || (!$is_secure && in_array($path, $pages_array))) {
            return false;
        } else {
            return true;
        }
    }
}
?>