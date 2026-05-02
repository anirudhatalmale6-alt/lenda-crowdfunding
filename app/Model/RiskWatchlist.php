<?php
/**
 * RiskWatchlist Model
 * 
 * Model for managing loan watchlist entries (RISK-15)
 * 
 * @package    Lenda
 * @subpackage Model
 */
App::uses('AppModel', 'Model');

class RiskWatchlist extends AppModel
{
    public $name = 'RiskWatchlist';
    public $useTable = 'risk_watchlists';
    
    public $belongsTo = array(
        'Loan' => array(
            'className' => 'Loan',
            'foreignKey' => 'loan_id'
        ),
        'User' => array(
            'className' => 'User',
            'foreignKey' => 'user_id'
        )
    );
    
    /**
     * Validation rules
     */
    public $validate = array(
        'loan_id' => array(
            'notBlank' => array(
                'rule' => 'notBlank',
                'message' => 'Loan ID is required'
            ),
            'unique' => array(
                'rule' => array('uniqueLoanStatus'),
                'message' => 'Loan already exists in watchlist with this status'
            )
        ),
        'user_id' => array(
            'notBlank' => array(
                'rule' => 'notBlank',
                'message' => 'User ID is required'
            )
        ),
        'risk_score' => array(
            'numeric' => array(
                'rule' => 'numeric',
                'message' => 'Risk score must be a number'
            ),
            'range' => array(
                'rule' => array('range', -1, 101),
                'message' => 'Risk score must be between 0 and 100'
            )
        )
    );
    
    /**
     * Check if loan is unique in watchlist for status
     */
    public function uniqueLoanStatus($check)
    {
        $loanId = $this->data['RiskWatchlist']['loan_id'];
        $status = isset($this->data['RiskWatchlist']['status']) 
            ? $this->data['RiskWatchlist']['status'] 
            : 'active';
        
        if ($status === 'active') {
            $existing = $this->find('first', array(
                'conditions' => array(
                    'RiskWatchlist.loan_id' => $loanId,
                    'RiskWatchlist.status' => 'active'
                )
            ));
            
            return empty($existing);
        }
        
        return true;
    }
    
    /**
     * Add loan to watchlist
     * 
     * @param int $loanId Loan ID
     * @param int $userId User ID
     * @param int $riskScore Risk score
     * @param string $reason Reason for watchlist
     * @return bool
     */
    public function addToWatchlist($loanId, $userId, $riskScore, $reason = '')
    {
        // Check if already on watchlist
        $existing = $this->findByLoanIdAndStatus($loanId, 'active');
        
        if ($existing) {
            // Update existing entry
            $this->id = $existing['RiskWatchlist']['id'];
            return $this->save(array(
                'risk_score' => $riskScore,
                'reason' => $reason,
                'last_updated' => date('Y-m-d H:i:s')
            ));
        }
        
        // Create new entry
        $this->create();
        return $this->save(array(
            'loan_id' => $loanId,
            'user_id' => $userId,
            'risk_score' => $riskScore,
            'status' => 'active',
            'reason' => $reason,
            'added_date' => date('Y-m-d H:i:s'),
            'auto_added' => 1
        ));
    }
    
    /**
     * Remove loan from watchlist
     * 
     * @param int $loanId Loan ID
     * @return bool
     */
    public function removeFromWatchlist($loanId)
    {
        $entry = $this->findByLoanIdAndStatus($loanId, 'active');
        
        if (!$entry) {
            return false;
        }
        
        $this->id = $entry['RiskWatchlist']['id'];
        return $this->save(array(
            'status' => 'removed',
            'removed_date' => date('Y-m-d H:i:s')
        ));
    }
    
    /**
     * Get loans on watchlist
     * 
     * @param string $status Status filter
     * @return array
     */
    public function getWatchlist($status = 'active')
    {
        return $this->find('all', array(
            'conditions' => array(
                'RiskWatchlist.status' => $status
            ),
            'contain' => array('Loan', 'User'),
            'order' => array('RiskWatchlist.risk_score ASC')
        ));
    }
    
    /**
     * Check if loan is on watchlist
     * 
     * @param int $loanId Loan ID
     * @return bool
     */
    public function isOnWatchlist($loanId)
    {
        $entry = $this->findByLoanIdAndStatus($loanId, 'active');
        return !empty($entry);
    }
    
    /**
     * Get watchlist statistics
     * 
     * @return array
     */
    public function getStatistics()
    {
        $active = $this->find('count', array(
            'conditions' => array('RiskWatchlist.status' => 'active')
        ));
        
        $autoAdded = $this->find('count', array(
            'conditions' => array(
                'RiskWatchlist.status' => 'active',
                'RiskWatchlist.auto_added' => 1
            )
        ));
        
        $highRisk = $this->find('count', array(
            'conditions' => array(
                'RiskWatchlist.status' => 'active',
                'RiskWatchlist.risk_score <' => 30
            )
        ));
        
        return array(
            'total_active' => $active,
            'auto_added' => $autoAdded,
            'high_risk' => $highRisk
        );
    }
}
