<?php
/**
 * FeeConfigurations Controller
 * 
 * Handles dynamic fee structure management
 * 
 * @package Lenda
 * @subpackage Controller
 */
class FeeConfigurationsController extends AppController {
    public $name = 'FeeConfigurations';
    public $components = array('Session');
    public $helpers = array('Html', 'Form', 'Time');
    
    public function beforeFilter() {
        parent::beforeFilter();
    }
    
    /**
     * Index - List all fee configurations
     */
    public function admin_index() {
        $this->pageTitle = 'Fee Configuration';
        
        $this->paginate = array(
            'order' => array('FeeConfiguration.fee_type' => 'ASC', 'FeeConfiguration.is_active' => 'DESC'),
            'limit' => 20
        );
        
        $this->set('fees', $this->paginate());
        $this->set('pageTitle', $this->pageTitle);
    }
    
    /**
     * View fee details
     */
    public function admin_view($id = null) {
        if (is_null($id)) {
            $this->Session->setFlash('Invalid request', 'default', array('class' => 'error-message'));
            $this->redirect(array('action' => 'index'));
        }
        
        $fee = $this->FeeConfiguration->findById($id);
        
        if (empty($fee)) {
            $this->Session->setFlash('Fee not found', 'default', array('class' => 'error-message'));
            $this->redirect(array('action' => 'index'));
        }
        
        $this->pageTitle = $fee['FeeConfiguration']['fee_name'];
        $this->set('fee', $fee);
        $this->set('pageTitle', $this->pageTitle);
    }
    
    /**
     * Add new fee configuration
     */
    public function admin_add() {
        if (!empty($this->request->data)) {
            $this->FeeConfiguration->create();
            $this->request->data['FeeConfiguration']['created_by'] = $this->Auth->user('id');
            $this->request->data['FeeConfiguration']['created'] = date('Y-m-d H:i:s');
            
            if ($this->FeeConfiguration->save($this->request->data)) {
                // Log the action
                $this->loadModel('AdminAuditLog');
                $this->AdminAuditLog->logAction(
                    $this->Auth->user('id'),
                    'create',
                    'FeeConfiguration',
                    $this->FeeConfiguration->id,
                    array(),
                    $this->request->data['FeeConfiguration']
                );
                
                $this->Session->setFlash('Fee configuration has been added', 'default', array('class' => 'success-message'));
                $this->redirect(array('action' => 'index'));
            } else {
                $this->Session->setFlash('Fee configuration could not be added. Please try again.', 'default', array('class' => 'error-message'));
            }
        }
        
        $this->pageTitle = 'Add Fee Configuration';
        $this->set('feeTypes', $this->FeeConfiguration->getFeeTypes());
        $this->set('pageTitle', $this->pageTitle);
    }
    
    /**
     * Edit fee configuration
     */
    public function admin_edit($id = null) {
        if (is_null($id)) {
            $this->Session->setFlash('Invalid request', 'default', array('class' => 'error-message'));
            $this->redirect(array('action' => 'index'));
        }
        
        $fee = $this->FeeConfiguration->findById($id);
        
        if (empty($fee)) {
            $this->Session->setFlash('Fee not found', 'default', array('class' => 'error-message'));
            $this->redirect(array('action' => 'index'));
        }
        
        if (!empty($this->request->data)) {
            // Store old values for audit
            $oldValues = $fee['FeeConfiguration'];
            
            $this->FeeConfiguration->id = $id;
            $this->request->data['FeeConfiguration']['modified'] = date('Y-m-d H:i:s');
            
            if ($this->FeeConfiguration->save($this->request->data)) {
                // Log the action
                $this->loadModel('AdminAuditLog');
                $this->AdminAuditLog->logAction(
                    $this->Auth->user('id'),
                    'edit',
                    'FeeConfiguration',
                    $id,
                    $oldValues,
                    $this->request->data['FeeConfiguration']
                );
                
                $this->Session->setFlash('Fee configuration has been updated', 'default', array('class' => 'success-message'));
                $this->redirect(array('action' => 'index'));
            } else {
                $this->Session->setFlash('Fee configuration could not be updated. Please try again.', 'default', array('class' => 'error-message'));
            }
        }
        
        if (empty($this->request->data)) {
            $this->request->data = $fee;
        }
        
        $this->pageTitle = 'Edit Fee Configuration';
        $this->set('feeTypes', $this->FeeConfiguration->getFeeTypes());
        $this->set('pageTitle', $this->pageTitle);
    }
    
    /**
     * Delete fee configuration
     */
    public function admin_delete($id = null) {
        if (is_null($id)) {
            $this->Session->setFlash('Invalid request', 'default', array('class' => 'error-message'));
            $this->redirect(array('action' => 'index'));
        }
        
        $fee = $this->FeeConfiguration->findById($id);
        
        if (empty($fee)) {
            $this->Session->setFlash('Fee not found', 'default', array('class' => 'error-message'));
            $this->redirect(array('action' => 'index'));
        }
        
        if ($this->FeeConfiguration->delete($id)) {
            // Log the action
            $this->loadModel('AdminAuditLog');
            $this->AdminAuditLog->logAction(
                $this->Auth->user('id'),
                'delete',
                'FeeConfiguration',
                $id,
                $fee['FeeConfiguration'],
                array()
            );
            
            $this->Session->setFlash('Fee configuration has been deleted', 'default', array('class' => 'success-message'));
        } else {
            $this->Session->setFlash('Fee configuration could not be deleted', 'default', array('class' => 'error-message'));
        }
        
        $this->redirect(array('action' => 'index'));
    }
    
    /**
     * Toggle fee active status
     */
    public function admin_toggle($id = null) {
        if (is_null($id)) {
            $this->Session->setFlash('Invalid request', 'default', array('class' => 'error-message'));
            $this->redirect(array('action' => 'index'));
        }
        
        $fee = $this->FeeConfiguration->findById($id);
        
        if (empty($fee)) {
            $this->Session->setFlash('Fee not found', 'default', array('class' => 'error-message'));
            $this->redirect(array('action' => 'index'));
        }
        
        $newStatus = $fee['FeeConfiguration']['is_active'] ? 0 : 1;
        
        $this->FeeConfiguration->id = $id;
        $this->FeeConfiguration->saveField('is_active', $newStatus);
        
        $statusText = $newStatus ? 'activated' : 'deactivated';
        $this->Session->setFlash('Fee has been ' . $statusText, 'default', array('class' => 'success-message'));
        
        $this->redirect(array('action' => 'index'));
    }
    
    /**
     * Calculate fee preview
     */
    public function admin_calculate() {
        $this->autoRender = false;
        
        if ($this->request->is('ajax')) {
            $feeType = $this->request->data['fee_type'];
            $amount = $this->request->data['amount'];
            
            $feeAmount = $this->FeeConfiguration->calculateFee($feeType, $amount);
            
            echo json_encode(array(
                'success' => true,
                'fee_amount' => $feeAmount,
                'total_amount' => $amount + $feeAmount
            ));
        }
    }
}
