// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title LendaTimelockController
 * @dev Timelock controller for secure admin actions with delay
 * 
 * This contract implements a timelock mechanism that requires
 * a delay between when an admin action is queued and when it can be executed.
 * This protects against unauthorized admin actions and front-running.
 */
contract LendaTimelockController is AccessControl {
    
    // Roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PROPOSER_ROLE = keccak256("PROPOSER_ROLE");
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
    bytes32 public constant CANCELLER_ROLE = keccak256("CANCELLER_ROLE");
    
    // Timelock settings
    uint256 public minDelay; // Minimum delay in seconds
    uint256 public maxDelay; // Maximum delay in seconds
    
    // Mapping of queued transactions
    struct TimelockTransaction {
        address target;
        uint256 value;
        bytes data;
        bytes32 predecessor;
        uint256 salt;
        uint256 executeAfter;
        bool cancelled;
        bool executed;
    }
    
    mapping(bytes32 => TimelockTransaction) public queuedTransactions;
    mapping(address => bool) public isExecutor;
    
    // Events
    event CallScheduled(
        bytes32 indexed txHash,
        address indexed target,
        uint256 value,
        bytes data,
        bytes32 predecessor,
        uint256 salt,
        uint256 delay
    );
    event CallExecuted(bytes32 indexed txHash);
    event CallCancelled(bytes32 indexed txHash);
    event MinDelayUpdated(uint256 oldDelay, uint256 newDelay);
    
    // Modifiers
    modifier onlyProposer() {
        require(hasRole(PROPOSER_ROLE, msg.sender), "Not proposer");
        _;
    }
    
    modifier onlyExecutor() {
        require(hasRole(EXECUTOR_ROLE, msg.sender) || hasRole(ADMIN_ROLE, msg.sender), "Not executor");
        _;
    }
    
    /**
     * @dev Constructor
     * @param _minDelay Minimum delay in seconds (e.g., 1 hour = 3600)
     * @param _maxDelay Maximum delay in seconds (e.g., 7 days = 604800)
     */
    constructor(uint256 _minDelay, uint256 _maxDelay) {
        require(_minDelay > 0, "Min delay must be > 0");
        require(_maxDelay >= _minDelay, "Max delay must be >= min");
        
        minDelay = _minDelay;
        maxDelay = _maxDelay;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(PROPOSER_ROLE, msg.sender);
        _grantRole(EXECUTOR_ROLE, msg.sender);
        _grantRole(CANCELLER_ROLE, msg.sender);
    }
    
    /**
     * @dev Schedule a transaction for execution after delay
     * @param target Target contract address
     * @param value ETH value to send
     * @param data Call data
     * @param predecessor Predecessor transaction hash (0 if no dependency)
     * @param salt Random salt for unique identification
     * @param delay Delay in seconds (must be between minDelay and maxDelay)
     */
    function schedule(
        address target,
        uint256 value,
        bytes calldata data,
        bytes32 predecessor,
        uint256 salt,
        uint256 delay
    ) external onlyProposer returns (bytes32) {
        require(delay >= minDelay, "Delay too short");
        require(delay <= maxDelay, "Delay too long");
        
        bytes32 txHash = _getTxHash(target, value, data, predecessor, salt);
        
        require(queuedTransactions[txHash].executeAfter == 0, "Already queued");
        
        queuedTransactions[txHash] = TimelockTransaction({
            target: target,
            value: value,
            data: data,
            predecessor: predecessor,
            salt: salt,
            executeAfter: block.timestamp + delay,
            cancelled: false,
            executed: false
        });
        
        emit CallScheduled(txHash, target, value, data, predecessor, salt, delay);
        
        return txHash;
    }
    
    /**
     * @dev Execute a queued transaction
     * @param target Target contract address
     * @param value ETH value to send
     * @param data Call data
     * @param predecessor Predecessor transaction hash
     * @param salt Random salt
     */
    function execute(
        address target,
        uint256 value,
        bytes calldata data,
        bytes32 predecessor,
        uint256 salt
    ) external payable onlyExecutor returns (bytes32) {
        bytes32 txHash = _getTxHash(target, value, data, predecessor, salt);
        TimelockTransaction storage txn = queuedTransactions[txHash];
        
        require(txn.executeAfter > 0, "Not queued");
        require(!txn.cancelled, "Cancelled");
        require(!txn.executed, "Already executed");
        require(block.timestamp >= txn.executeAfter, "Too early");
        
        // Check predecessor if provided
        if (txn.predecessor != bytes32(0)) {
            bytes32 predecessorHash = _getTxHash(
                queuedTransactions[txn.predecessor].target,
                queuedTransactions[txn.predecessor].value,
                queuedTransactions[txn.predecessor].data,
                queuedTransactions[txn.predecessor].predecessor,
                queuedTransactions[txn.predecessor].salt
            );
            require(queuedTransactions[predecessorHash].executed, "Predecessor not executed");
        }
        
        txn.executed = true;
        
        // Execute the call
        (bool success, ) = target.call{value: value}(data);
        require(success, "Execution failed");
        
        emit CallExecuted(txHash);
        
        return txHash;
    }
    
    /**
     * @dev Cancel a queued transaction
     * @param target Target contract address
     * @param value ETH value
     * @param data Call data
     * @param predecessor Predecessor hash
     * @param salt Salt
     */
    function cancel(
        address target,
        uint256 value,
        bytes calldata data,
        bytes32 predecessor,
        uint256 salt
    ) external onlyRole(CANCELLER_ROLE) returns (bytes32) {
        bytes32 txHash = _getTxHash(target, value, data, predecessor, salt);
        
        require(queuedTransactions[txHash].executeAfter > 0, "Not queued");
        require(!queuedTransactions[txHash].cancelled, "Already cancelled");
        require(!queuedTransactions[txHash].executed, "Already executed");
        
        queuedTransactions[txHash].cancelled = true;
        
        emit CallCancelled(txHash);
        
        return txHash;
    }
    
    /**
     * @dev Update minimum delay
     * @param newDelay New minimum delay
     */
    function updateMinDelay(uint256 newDelay) external onlyRole(ADMIN_ROLE) {
        require(newDelay > 0 && newDelay <= maxDelay, "Invalid delay");
        
        uint256 oldDelay = minDelay;
        minDelay = newDelay;
        
        emit MinDelayUpdated(oldDelay, newDelay);
    }
    
    /**
     * @dev Get transaction hash
     */
    function _getTxHash(
        address target,
        uint256 value,
        bytes calldata data,
        bytes32 predecessor,
        uint256 salt
    ) internal pure returns (bytes32) {
        return keccak256(abi.encode(target, value, data, predecessor, salt));
    }
    
    /**
     * @dev Get queued transaction details
     */
    function getQueuedTransaction(bytes32 txHash) external view returns (
        address target,
        uint256 value,
        bytes memory data,
        uint256 executeAfter,
        bool cancelled,
        bool executed
    ) {
        TimelockTransaction storage txn = queuedTransactions[txHash];
        return (
            txn.target,
            txn.value,
            txn.data,
            txn.executeAfter,
            txn.cancelled,
            txn.executed
        );
    }
    
    /**
     * @dev Check if transaction is queued
     */
    function isQueued(bytes32 txHash) external view returns (bool) {
        return queuedTransactions[txHash].executeAfter > 0 && 
               !queuedTransactions[txHash].cancelled && 
               !queuedTransactions[txHash].executed;
    }
}
