<?php
/**
 * RefinancingRequest Model
 * 
 * Model for managing refinancing requests (RISK-05, RISK-06)
 * 
 * @package    Lenda
 * @subpackage Model
 */
App::uses('AppModel', 'Model');

class RefinancingRequest extends AppModel
{
    public $name = 'RefinancingRequest';
    public $useTable = 'refinancing_requests';
    
    public $belongsTo = array(
        'Loan' => array(
            'className' => 'Loan',
            'foreignKey' => 'loan_id'
        ),
        'User' => array(
            'className' => 'User',
            'foreignKey' => 'user_id'
        ),
        'Approver' => array(
            'className' => 'User',
            'foreignKey' => 'approved_by',
            'fields' => array('id', 'username', 'email')
        )
    );
    
    /**
     * Status constants
     */
    const STATUS_PENDING = 'pending';
    const STATUS_APPROVED = 'approved';
    const STATUS_REJECTED = 'rejected';
    const STATUS_FUNDED = 'funded';
    const STATUS_CANCELLED = 'cancelled';
    
    /**
     * Validation rules
     */
    public $validate = array(
        'loan_id' => array(
            'notBlank' => array(
                'rule' => 'notBlank',
                'message' => 'Loan ID is required'
            )
        ),
        'user_id' => array(
            'notBlank' => array(
                'rule' => 'notBlank',
                'message' => 'User ID is required'
            )
        ),
        'new_interest_rate' => array(
            'numeric' => array(
                'rule' => 'numeric',
                'message' => 'Interest rate must be a number'
            ),
            'range' => array(
                'rule' => array('range', 0, 51),
                'message' => 'Interest rate must be between 0 and 50'
            )
        ),
        'new_duration_months' => array(
            'numeric' => array(
                'rule' => 'numeric',
                'message' => 'Duration must be a number'
            ),
            'range' => array(
                'rule' => array('range', 0, 121),
                'message' => 'Duration must be between 1 and 120 months'
            )
        )
    );
    
    /**
     * Create refinancing request
     * 
     * @param array $data Request data
     * @return bool
     */
    public function createRequest($data)
    {
        // Get original loan terms
        $loan = ClassRegistry::init('Loan')->findById($data['loan_id']);
        
        if (!$loan) {
            return false;
        }
        
        $this->create();
        $saveData = array(
            'loan_id' => $data['loan_id'],
            'user_id' => $data['user_id'],
            'original_interest_rate' => $loan['Loan']['interest_rate'],
            'original_duration_months' => $loan['Loan']['duration_months'],
            'new_interest_rate' => $data['new_interest_rate'],
            'new_duration_months' => $data['new_duration_months'],
            'status' => self::STATUS_PENDING,
            'requested_date' => date('Y-m-d H:i:s')
        );
        
        if (isset($data['risk_assessment'])) {
            $saveData['risk_assessment'] = json_encode($data['risk_assessment']);
        }
        
        return $this->save($saveData);
    }
    
    /**
     * Approve refinancing request
     * 
     * @param int $requestId Request ID
     * @param int $approvedBy Approver user ID
     * @return bool
     */
    public function approveRequest($requestId, $approvedBy)
    {
        $this->id = $requestId;
        
        return $this->save(array(
            'status' => self::STATUS_APPROVED,
            'approved_by' => $approvedBy,
            'reviewed_date' => date('Y-m-d H:i:s')
        ));
    }
    
    /**
     * Reject refinancing request
     * 
     * @param int $requestId Request ID
     * @param int $rejectedBy Rejecter user ID
     * @param string $reason Rejection reason
     * @return bool
     */
    public function rejectRequest($requestId, $rejectedBy, $reason = '')
    {
        $this->id = $requestId;
        
        return $this->save(array(
            'status' => self::STATUS_REJECTED,
            'approved_by' => $rejectedBy,
            'rejection_reason' => $reason,
            'reviewed_date' => date('Y-m-d H:i:s')
        ));
    }
    
    /**
     * Get pending requests
     * 
     * @return array
     */
    public function getPendingRequests()
    {
        return $this->find('all', array(
            'conditions' => array(
                'RefinancingRequest.status' => self::STATUS_PENDING
            ),
            'contain' => array('Loan', 'User'),
            'order' => array('RefinancingRequest.requested_date ASC')
        ));
    }
    
    /**
     * Get requests by status
     * 
     * @param string $status Status
     * @return array
     */
    public function getByStatus($status)
    {
        return $this->find('all', array(
            'conditions' => array(
                'RefinancingRequest.status' => $status
            ),
            'contain' => array('Loan', 'User'),
            'order' => array('RefinancingRequest.requested_date DESC')
        ));
    }
    
    /**
     * Get user's refinancing requests
     * 
     * @param int $userId User ID
     * @return array
     */
    public function getUserRequests($userId)
    {
        return $this->find('all', array(
            'conditions' => array(
                'RefinancingRequest.user_id' => $userId
            ),
            'contain' => array('Loan'),
            'order' => array('RefinancingRequest.requested_date DESC')
        ));
    }
    
    /**
     * Check if loan has active refinancing request
     * 
     * @param int $loanId Loan ID
     * @return bool
     */
    public function hasActiveRequest($loanId)
    {
        $request = $this->find('first', array(
            'conditions' => array(
                'RefinancingRequest.loan_id' => $loanId,
                'RefinancingRequest.status' => array(
                    self::STATUS_PENDING,
                    self::STATUS_APPROVED
                )
            )
        ));
        
        return !empty($request);
    }
}
