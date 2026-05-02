<?php
App::uses('AppModel', 'Model');

/**
 * SagaStep Model
 * 
 * Tracks individual steps within a saga orchestration
 * 
 * @property SagaOrchestrator $SagaOrchestrator
 */
class SagaStep extends AppModel {
    public $name = 'SagaStep';
    public $useTable = 'saga_steps';
    
    public $belongsTo = array(
        'SagaOrchestrator' => array(
            'className' => 'SagaOrchestrator',
            'foreignKey' => 'saga_id'
        )
    );
    
    /**
     * Get steps for a saga
     * 
     * @param int $sagaId Saga ID
     * @return array Steps
     */
    public function getStepsForSaga($sagaId) {
        return $this->find('all', array(
            'conditions' => array('SagaStep.saga_id' => $sagaId),
            'order' => array('SagaStep.step_index' => 'ASC')
        ));
    }
    
    /**
     * Get failed steps for a saga
     * 
     * @param int $sagaId Saga ID
     * @return array Failed steps
     */
    public function getFailedSteps($sagaId) {
        return $this->find('all', array(
            'conditions' => array(
                'SagaStep.saga_id' => $sagaId,
                'SagaStep.status' => array('failed', 'compensation_failed')
            )
        ));
    }
}
