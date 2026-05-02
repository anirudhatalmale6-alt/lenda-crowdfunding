// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title LendaEscrow
 * @dev Smart contract for secure business transactions with Pausable functionality
 */
contract LendaEscrow is ReentrancyGuard, AccessControl, Pausable {
    // Enums
    enum EscrowStatus {
        CREATED,
        FUNDED,
        SHIPPED,
        DELIVERED,
        DISPUTED,
        RELEASED,
        REFUNDED,
        CANCELLED
    }

    // Structs
    struct Transaction {
        uint256 id;
        address buyer;
        address seller;
        uint256 amount;
        uint256 shippingFee;
        uint256 platformFee;
        EscrowStatus status;
        string description;
        string trackingNumber;
        string shippingCarrier;
        uint256 createdAt;
        uint256 fundedAt;
        uint256 shippedAt;
        uint256 deliveredAt;
        uint256 releasedAt;
        string disputeReason;
        string deliveryProof;
    }

    // Roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PLATFORM_ROLE = keccak256("PLATFORM_ROLE"); // For platform operators
    
    // State Variables
    uint256 public transactionCounter;
    uint256 public platformFeePercent = 250; // 2.5%
    uint256 public maxTransactionAmount = 1000 ether; // Maximum transaction limit
    uint256 public autoReleaseTimeout = 14 days; // Auto-release timeout (default 14 days)
    
    // Gas Optimization: Track cumulative platform fees instead of iterating
    uint256 public accumulatedPlatformFees;
    
    mapping(uint256 => Transaction) public transactions;
    mapping(address => uint256[]) public buyerTransactions;
    mapping(address => uint256[]) public sellerTransactions;
    
    // Events
    event TransactionCreated(uint256 indexed id, address indexed buyer, address indexed seller, uint256 amount);
    event TransactionFunded(uint256 indexed id, uint256 amount);
    event TransactionShipped(uint256 indexed id, string trackingNumber);
    event TransactionDelivered(uint256 indexed id);
    event FundsReleased(uint256 indexed id, uint256 amount);
    event DisputeOpened(uint256 indexed id, string reason);
    event DisputeResolved(uint256 indexed id, string resolution);
    event TransactionRefunded(uint256 indexed id);
    event TransactionCancelled(uint256 indexed id);

    // Modifiers
    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "Not an admin");
        _;
    }

    modifier onlyBuyer(uint256 _transactionId) {
        require(transactions[_transactionId].buyer == msg.sender, "Not the buyer");
        _;
    }

    modifier onlySeller(uint256 _transactionId) {
        require(transactions[_transactionId].seller == msg.sender, "Not the seller");
        _;
    }

    modifier inStatus(uint256 _transactionId, EscrowStatus _status) {
        require(transactions[_transactionId].status == _status, "Invalid status");
        _;
    }

    constructor() {
        transactionCounter = 0;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(PLATFORM_ROLE, msg.sender);
    }
    
    /**
     * @dev Pause the contract (only admin)
     */
    function pause() external onlyAdmin {
        _pause();
    }
    
    /**
     * @dev Unpause the contract (only admin)
     */
    function unpause() external onlyAdmin {
        _unpause();
    }
    
    /**
     * @dev Check if contract is paused
     */
    function isPaused() external view returns (bool) {
        return paused();
    }

    // ============================================
    // TRANSACTION MANAGEMENT
    // ============================================

    /**
     * @dev Create a new escrow transaction
     */
    function createTransaction(
        address _seller,
        uint256 _amount,
        uint256 _shippingFee,
        string memory _description
    ) external nonReentrant whenNotPaused returns (uint256) {
        require(_seller != address(0), "Invalid seller address");
        require(_seller != msg.sender, "Cannot create transaction with self");
        require(_amount > 0, "Amount must be greater than 0");
        require(_amount <= maxTransactionAmount, "Amount exceeds maximum limit");
        require(bytes(_description).length > 0, "Description required");
        
        transactionCounter++;
        uint256 transactionId = transactionCounter;
        
        uint256 platformFee = (_amount * platformFeePercent) / 10000;
        
        Transaction storage transaction = transactions[transactionId];
        transaction.id = transactionId;
        transaction.buyer = msg.sender;
        transaction.seller = _seller;
        transaction.amount = _amount;
        transaction.shippingFee = _shippingFee;
        transaction.platformFee = platformFee;
        transaction.status = EscrowStatus.CREATED;
        transaction.description = _description;
        transaction.createdAt = block.timestamp;
        
        buyerTransactions[msg.sender].push(transactionId);
        sellerTransactions[_seller].push(transactionId);
        
        emit TransactionCreated(transactionId, msg.sender, _seller, _amount);
        
        return transactionId;
    }

    /**
     * @dev Fund escrow (buyer pays)
     */
    function fundTransaction(uint256 _transactionId) external payable 
        inStatus(_transactionId, EscrowStatus.CREATED) 
        nonReentrant
    {
        Transaction storage transaction = transactions[_transactionId];
        
        uint256 totalAmount = transaction.amount + transaction.shippingFee;
        require(msg.value >= totalAmount, "Insufficient payment");
        
        // CEI: Update state before external calls
        transaction.status = EscrowStatus.FUNDED;
        transaction.fundedAt = block.timestamp;
        accumulatedPlatformFees += platformFee;
        
        emit TransactionFunded(_transactionId, totalAmount);
        
        // Return excess
        if (msg.value > totalAmount) {
            (bool success, ) = payable(msg.sender).call{value: msg.value - totalAmount}("");
            require(success, "Transfer failed");
        }
    }

    /**
     * @dev Mark as shipped
     */
    function markAsShipped(
        uint256 _transactionId,
        string memory _trackingNumber,
        string memory _carrier
    ) external onlySeller(_transactionId) 
        inStatus(_transactionId, EscrowStatus.FUNDED) 
        nonReentrant
    {
        require(bytes(_trackingNumber).length > 0, "Tracking number required");
        
        Transaction storage transaction = transactions[_transactionId];
        
        transaction.status = EscrowStatus.SHIPPED;
        transaction.shippedAt = block.timestamp;
        transaction.trackingNumber = _trackingNumber;
        transaction.shippingCarrier = _carrier;
        
        emit TransactionShipped(_transactionId, _trackingNumber);
    }

    /**
     * @dev Confirm delivery
     */
    function confirmDelivery(uint256 _transactionId) external 
        onlyBuyer(_transactionId) 
        inStatus(_transactionId, EscrowStatus.SHIPPED) 
        nonReentrant
    {
        Transaction storage transaction = transactions[_transactionId];
        
        transaction.status = EscrowStatus.DELIVERED;
        transaction.deliveredAt = block.timestamp;
        transaction.deliveryProof = "Confirmed";
        
        emit TransactionDelivered(_transactionId);
    }

    /**
     * @dev Upload delivery proof (for buyer to confirm with proof)
     */
    function confirmDeliveryWithProof(uint256 _transactionId, string memory _deliveryProof) external 
        onlyBuyer(_transactionId) 
        nonReentrant
    {
        Transaction storage transaction = transactions[_transactionId];
        
        require(
            transaction.status == EscrowStatus.SHIPPED ||
            transaction.status == EscrowStatus.DELIVERED,
            "Transaction must be shipped or delivered"
        );
        require(bytes(_deliveryProof).length > 0, "Delivery proof required");
        
        transaction.status = EscrowStatus.DELIVERED;
        transaction.deliveredAt = block.timestamp;
        transaction.deliveryProof = _deliveryProof;
        
        emit TransactionDelivered(_transactionId);
    }

    /**
     * @dev Auto-release funds after timeout (called by anyone)
     * @notice Can be triggered after SHIPPED or DELIVERED status
     */
    function autoReleaseFunds(uint256 _transactionId) external nonReentrant {
        Transaction storage transaction = transactions[_transactionId];
        
        require(
            transaction.status == EscrowStatus.SHIPPED ||
            transaction.status == EscrowStatus.DELIVERED, 
            "Transaction must be shipped or delivered"
        );
        require(transaction.releasedAt == 0, "Funds already released");
        
        // Check if timeout has passed since shipping or delivery
        uint256 referenceTime = transaction.status == EscrowStatus.DELIVERED 
            ? transaction.deliveredAt 
            : transaction.shippedAt;
            
        require(
            block.timestamp >= referenceTime + autoReleaseTimeout,
            "Auto-release timeout not reached"
        );
        
        // CEI: Store state before external call
        uint256 sellerAmount = transaction.amount;
        address seller = transaction.seller;
        
        transaction.status = EscrowStatus.RELEASED;
        transaction.releasedAt = block.timestamp;
        
        // CEI: External call after state change
        (bool success, ) = payable(seller).call{value: sellerAmount}("");
        require(success, "Transfer failed");
        
        emit FundsReleased(_transactionId, sellerAmount);
    }

    /**
     * @dev Set auto-release timeout (admin only)
     */
    function setAutoReleaseTimeout(uint256 _newTimeout) external onlyAdmin {
        require(_newTimeout > 0, "Timeout must be greater than 0");
        autoReleaseTimeout = _newTimeout;
    }

    /**
     * @dev Get remaining time until auto-release for a transaction
     */
    function getAutoReleaseTimeRemaining(uint256 _transactionId) external view returns (uint256) {
        Transaction storage transaction = transactions[_transactionId];
        
        uint256 referenceTime;
        if (transaction.status == EscrowStatus.DELIVERED) {
            referenceTime = transaction.deliveredAt;
        } else if (transaction.status == EscrowStatus.SHIPPED) {
            referenceTime = transaction.shippedAt;
        } else {
            return 0; // Not eligible for auto-release
        }
        
        uint256 releaseTime = referenceTime + autoReleaseTimeout;
        
        if (block.timestamp >= releaseTime) {
            return 0;
        }
        
        return releaseTime - block.timestamp;
    }

    /**
     * @dev Release funds to seller
     */
    function releaseFunds(uint256 _transactionId) external 
        onlyBuyer(_transactionId) 
        inStatus(_transactionId, EscrowStatus.DELIVERED) 
        nonReentrant
    {
        Transaction storage transaction = transactions[_transactionId];
        
        // CEI: Store state before external call
        uint256 sellerAmount = transaction.amount;
        address seller = transaction.seller;
        
        transaction.status = EscrowStatus.RELEASED;
        transaction.releasedAt = block.timestamp;
        
        // CEI: External call after state change
        (bool success, ) = payable(seller).call{value: sellerAmount}("");
        require(success, "Transfer failed");
        
        emit FundsReleased(_transactionId, sellerAmount);
    }

    /**
     * @dev Open dispute
     */
    function openDispute(uint256 _transactionId, string memory _reason) external 
        onlyBuyer(_transactionId) 
        nonReentrant
    {
        Transaction storage transaction = transactions[_transactionId];
        
        require(
            transaction.status == EscrowStatus.SHIPPED || 
            transaction.status == EscrowStatus.DELIVERED,
            "Cannot open dispute"
        );
        require(bytes(_reason).length > 0, "Dispute reason required");
        
        transaction.status = EscrowStatus.DISPUTED;
        transaction.disputeReason = _reason;
        
        emit DisputeOpened(_transactionId, _reason);
    }

    /**
     * @dev Resolve dispute (admin only)
     */
    function resolveDispute(
        uint256 _transactionId,
        string memory _resolution,
        bool _refundBuyer
    ) external onlyAdmin nonReentrant {
        Transaction storage transaction = transactions[_transactionId];
        
        require(transaction.status == EscrowStatus.DISPUTED, "Not in dispute");
        require(bytes(_resolution).length > 0, "Resolution required");
        
        // CEI: Store values and update state before external calls
        address buyer = transaction.buyer;
        address seller = transaction.seller;
        uint256 amount = transaction.amount;
        uint256 shippingFee = transaction.shippingFee;
        uint256 platformFee = transaction.platformFee;
        
        // Update state first
        transaction.status = _refundBuyer ? EscrowStatus.REFUNDED : EscrowStatus.RELEASED;
        transaction.releasedAt = block.timestamp;
        
        // Emit events before external calls
        emit DisputeResolved(_transactionId, _resolution);
        
        if (_refundBuyer) {
            // Refund buyer (minus platform fee)
            uint256 refundAmount = amount + shippingFee - platformFee;
            (bool success, ) = payable(buyer).call{value: refundAmount}("");
            require(success, "Transfer failed");
            emit TransactionRefunded(_transactionId);
        } else {
            // Release to seller
            (bool success, ) = payable(seller).call{value: amount}("");
            require(success, "Transfer failed");
            emit FundsReleased(_transactionId, amount);
        }
    }

    /**
     * @dev Cancel transaction (before funding)
     */
    function cancelTransaction(uint256 _transactionId) external 
        onlyBuyer(_transactionId) 
        inStatus(_transactionId, EscrowStatus.CREATED) 
        nonReentrant
    {
        Transaction storage transaction = transactions[_transactionId];
        
        transaction.status = EscrowStatus.CANCELLED;
        
        emit TransactionCancelled(_transactionId);
    }

    /**
     * @dev Emergency cancel by admin (for fraudulent transactions)
     */
    function emergencyCancel(uint256 _transactionId) external onlyAdmin nonReentrant {
        Transaction storage transaction = transactions[_transactionId];
        
        require(
            transaction.status == EscrowStatus.CREATED ||
            transaction.status == EscrowStatus.FUNDED,
            "Cannot cancel in current status"
        );
        
        // CEI: Store values before external calls
        address buyer = transaction.buyer;
        uint256 refundAmount = 0;
        
        // If funded, calculate refund amount first
        if (transaction.status == EscrowStatus.FUNDED) {
            refundAmount = transaction.amount + transaction.shippingFee;
            
            // Update status before external call
            transaction.status = EscrowStatus.CANCELLED;
            
            // Then refund buyer
            (bool success, ) = payable(buyer).call{value: refundAmount}("");
            require(success, "Refund failed");
        } else {
            // Just cancel without refund
            transaction.status = EscrowStatus.CANCELLED;
        }
        
        emit TransactionCancelled(_transactionId);
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    function getTransaction(uint256 _transactionId) external view returns (Transaction memory) {
        return transactions[_transactionId];
    }

    function getBuyerTransactions(address _buyer) external view returns (uint256[] memory) {
        return buyerTransactions[_buyer];
    }

    function getSellerTransactions(address _seller) external view returns (uint256[] memory) {
        return sellerTransactions[_seller];
    }

    function getTransactionCount() external view returns (uint256) {
        return transactionCounter;
    }

    // Fallback
    receive() external payable {}
    
    // ============================================
    // ADMIN FUNCTIONS
    // ============================================
    
    /**
     * @dev Set platform fee percentage (admin only)
     */
    function setPlatformFeePercent(uint256 _newFee) external onlyAdmin {
        require(_newFee <= 1000, "Fee cannot exceed 10%"); // Max 10%
        platformFeePercent = _newFee;
    }
    
    /**
     * @dev Set maximum transaction amount (admin only)
     */
    function setMaxTransactionAmount(uint256 _newMax) external onlyAdmin {
        require(_newMax > 0, "Max amount must be greater than 0");
        maxTransactionAmount = _newMax;
    }
    
    /**
     * @dev Set auto-release timeout (admin only)
     */
    function setAutoReleaseTimeout(uint256 _newTimeout) external onlyAdmin {
        require(_newTimeout > 0, "Timeout must be greater than 0");
        autoReleaseTimeout = _newTimeout;
    }
    
    /**
     * @dev Withdraw accumulated platform fees (admin only)
     * @notice Optimized: O(1) instead of O(n) by tracking accumulated fees
     */
    function withdrawPlatformFees() external onlyAdmin nonReentrant {
        require(accumulatedPlatformFees > 0, "No fees to withdraw");
        
        uint256 amountToWithdraw = accumulatedPlatformFees;
        accumulatedPlatformFees = 0;
        
        (bool success, ) = payable(msg.sender).call{value: amountToWithdraw}("");
        require(success, "Withdrawal failed");
    }
}
