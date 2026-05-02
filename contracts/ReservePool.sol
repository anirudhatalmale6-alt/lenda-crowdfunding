// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title ReservePool
 * @dev Repayment guarantee reserve pool contract
 * 
 * This contract manages the reserve pools that provide repayment
 * guarantees to lenders in case of borrower default.
 */
contract ReservePool is AccessControl, ReentrancyGuard {
    // Roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PLATFORM_ROLE = keccak256("PLATFORM_ROLE");

    // Enums
    enum PoolType { GUARANTEE, INSURANCE, LIQUIDITY, RECOVERY }
    enum ClaimStatus { PENDING, APPROVED, REJECTED, PAID }
    
    // FIN-04: Account types enum for double-entry bookkeeping
    enum AccountType { 
        RESERVE_POOL, 
        PLATFORM, 
        FEE, 
        CLAIM_PAYMENT, 
        LENDER, 
        BORROWER,
        LIQUIDITY,
        REWARD
    }

    // Structs
    struct Pool {
        uint256 id;
        string name;
        PoolType poolType;
        uint256 balance;
        uint256 lockedBalance;
        uint256 targetCoverageRatio; // In basis points (e.g., 400 = 4x)
        uint256 currentCoverageRatio;
        uint256 minCoverageRatio;
        uint256 maxCoverageRatio;
        uint256 totalClaimsPaid;
        uint256 totalReplenished;
        bool isActive;
    }

    struct Coverage {
        uint256 poolId;
        uint256 loanId;
        uint256 monthlyPayment;
        uint256 requiredCoverage;
        uint256 currentCoverage;
        uint256 coverageRatio;
        uint256 liquidationThreshold;
        bool isAtRisk;
    }

    struct Claim {
        uint256 id;
        uint256 poolId;
        uint256 loanId;
        address claimant;
        uint256 claimAmount;
        uint256 approvedAmount;
        ClaimStatus status;
        string reason;
        uint256 createdAt;
        uint256 reviewedAt;
        address reviewedBy;
    }

    // State variables
    uint256 public poolCounter;
    uint256 public claimCounter;
    
    // Mappings
    mapping(uint256 => Pool) public pools;
    mapping(uint256 => Coverage) public loanCoverages;
    mapping(uint256 => Claim) public claims;
    mapping(uint256 => uint256[]) public poolClaims;
    mapping(uint256 => address) public loanToBorrower;
    
    // Events
    event PoolCreated(uint256 indexed poolId, string name, PoolType poolType);
    event PoolDeposited(uint256 indexed poolId, uint256 amount);
    event PoolWithdrawn(uint256 indexed poolId, uint256 amount);
    event CoverageUpdated(uint256 indexed loanId, uint256 coverageRatio);
    event ClaimSubmitted(uint256 indexed claimId, uint256 loanId, uint256 amount);
    event ClaimApproved(uint256 indexed claimId, uint256 approvedAmount);
    event ClaimRejected(uint256 indexed claimId);
    event ClaimPaid(uint256 indexed claimId, uint256 amount);
    event LiquidationTriggered(uint256 indexed loanId, string reason);
    event CoverageRatioAlert(uint256 indexed poolId, uint256 currentRatio, uint256 minRatio);

    // Modifiers
    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "Not an admin");
        _;
    }

    modifier onlyPlatform() {
        require(hasRole(PLATFORM_ROLE, msg.sender), "Not platform");
        _;
    }

    constructor() {
        poolCounter = 0;
        claimCounter = 0;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(PLATFORM_ROLE, msg.sender);
        
        // Initialize default pools
        _createPool("Primary Guarantee Pool", PoolType.GUARANTEE, 400, 200, 1000);
        _createPool("Insurance Reserve", PoolType.INSURANCE, 200, 100, 500);
        _createPool("Liquidity Pool", PoolType.LIQUIDITY, 150, 100, 300);
        _createPool("Recovery Reserve", PoolType.RECOVERY, 100, 50, 200);
    }

    /**
     * @dev Create a new reserve pool
     */
    function _createPool(
        string memory _name,
        PoolType _poolType,
        uint256 _targetRatio,
        uint256 _minRatio,
        uint256 _maxRatio
    ) internal {
        poolCounter++;
        
        pools[poolCounter] = Pool({
            id: poolCounter,
            name: _name,
            poolType: _poolType,
            balance: 0,
            lockedBalance: 0,
            targetCoverageRatio: _targetRatio,
            currentCoverageRatio: 0,
            minCoverageRatio: _minRatio,
            maxCoverageRatio: _maxRatio,
            totalClaimsPaid: 0,
            totalReplenished: 0,
            isActive: true
        });
        
        emit PoolCreated(poolCounter, _name, _poolType);
    }

    /**
     * @dev Deposit to a pool
     */
    function depositToPool(uint256 _poolId) external payable onlyPlatform nonReentrant {
        require(_poolId > 0 && _poolId <= poolCounter, "Invalid pool");
        require(msg.value > 0, "Invalid amount");
        
        Pool storage pool = pools[_poolId];
        require(pool.isActive, "Pool not active");
        
        // FIN-04: Record bookkeeping entries for deposit using enum
        string memory ref = string(abi.encodePacked("deposit_", _poolId));
        recordCredit(AccountType.RESERVE_POOL, msg.value, ref);
        recordDebit(AccountType.PLATFORM, msg.value, ref);
        
        pool.balance += msg.value;
        pool.totalReplenished += msg.value;
        
        // Update coverage ratio
        _updateCoverageRatio(_poolId);
        
        emit PoolDeposited(_poolId, msg.value);
    }

    /**
     * @dev Withdraw from pool (admin only, for emergencies)
     */
    function withdrawFromPool(uint256 _poolId, uint256 _amount) 
        external 
        onlyAdmin 
        nonReentrant 
    {
        Pool storage pool = pools[_poolId];
        require(pool.isActive, "Pool not active");
        
        uint256 available = pool.balance - pool.lockedBalance;
        require(_amount <= available, "Insufficient available balance");
        
        pool.balance -= _amount;
        
        // Update coverage ratio
        _updateCoverageRatio(_poolId);
        
        payable(msg.sender).transfer(_amount);
        
        emit PoolWithdrawn(_poolId, _amount);
    }

    /**
     * @dev Set up coverage for a loan
     */
    function setupCoverage(
        uint256 _poolId,
        uint256 _loanId,
        uint256 _monthlyPayment,
        address _borrower
    ) external onlyPlatform {
        require(_poolId > 0 && _poolId <= poolCounter, "Invalid pool");
        
        loanCoverages[_loanId] = Coverage({
            poolId: _poolId,
            loanId: _loanId,
            monthlyPayment: _monthlyPayment,
            requiredCoverage: _monthlyPayment * 4, // 4x monthly payment default
            currentCoverage: 0,
            coverageRatio: 0,
            liquidationThreshold: 200, // 2x
            isAtRisk: false
        });
        
        loanToBorrower[_loanId] = _borrower;
        
        // Initial deposit from loan setup (platform contributes)
        pool.balance += _monthlyPayment * 4;
    }

    /**
     * @dev Update loan coverage
     */
    function updateCoverage(uint256 _loanId, uint256 _newCoverage) external onlyPlatform {
        require(loanCoverages[_loanId].poolId > 0, "Coverage not set");
        
        Coverage storage coverage = loanCoverages[_loanId];
        coverage.currentCoverage = _newCoverage;
        coverage.coverageRatio = (_newCoverage * 10000) / coverage.monthlyPayment;
        coverage.isAtRisk = coverage.coverageRatio < coverage.liquidationThreshold;
        
        // Check for alert
        Pool storage pool = pools[coverage.poolId];
        if (coverage.coverageRatio < pool.minCoverageRatio) {
            emit CoverageRatioAlert(coverage.poolId, coverage.coverageRatio, pool.minCoverageRatio);
        }
        
        emit CoverageUpdated(_loanId, coverage.coverageRatio);
    }

    /**
     * @dev Submit a claim
     */
    function submitClaim(
        uint256 _poolId,
        uint256 _loanId,
        uint256 _amount,
        string calldata _reason
    ) external onlyPlatform nonReentrant returns (uint256) {
        require(_poolId > 0 && _poolId <= poolCounter, "Invalid pool");
        require(loanCoverages[_loanId].poolId == _poolId, "Coverage mismatch");
        
        Pool storage pool = pools[_poolId];
        Coverage storage coverage = loanCoverages[_loanId];
        
        require(pool.isActive, "Pool not active");
        
        // Validate claim
        uint256 maxClaim = coverage.currentCoverage;
        uint256 claimAmount = _amount > maxClaim ? maxClaim : _amount;
        
        claimCounter++;
        
        claims[claimCounter] = Claim({
            id: claimCounter,
            poolId: _poolId,
            loanId: _loanId,
            claimant: msg.sender,
            claimAmount: claimAmount,
            approvedAmount: 0,
            status: ClaimStatus.PENDING,
            reason: _reason,
            createdAt: block.timestamp,
            reviewedAt: 0,
            reviewedBy: address(0)
        });
        
        poolClaims[_poolId].push(claimCounter);
        
        emit ClaimSubmitted(claimCounter, _loanId, claimAmount);
        
        return claimCounter;
    }

    /**
     * @dev Approve a claim
     */
    function approveClaim(uint256 _claimId, uint256 _approvedAmount) 
        external 
        onlyAdmin 
        nonReentrant 
    {
        Claim storage claim = claims[_claimId];
        require(claim.status == ClaimStatus.PENDING, "Invalid claim status");
        
        Pool storage pool = pools[claim.poolId];
        require(_approvedAmount <= pool.balance - pool.lockedBalance, "Insufficient pool balance");
        require(_approvedAmount <= claim.claimAmount, "Cannot approve more than claimed");
        
        claim.approvedAmount = _approvedAmount;
        claim.status = ClaimStatus.APPROVED;
        claim.reviewedAt = block.timestamp;
        claim.reviewedBy = msg.sender;
        
        // Lock funds
        pool.lockedBalance += _approvedAmount;
        
        emit ClaimApproved(_claimId, _approvedAmount);
    }

    /**
     * @dev Reject a claim
     */
    function rejectClaim(uint256 _claimId) external onlyAdmin nonReentrant {
        Claim storage claim = claims[_claimId];
        require(claim.status == ClaimStatus.PENDING, "Invalid claim status");
        
        claim.status = ClaimStatus.REJECTED;
        claim.reviewedAt = block.timestamp;
        claim.reviewedBy = msg.sender;
        
        emit ClaimRejected(_claimId);
    }

    /**
     * @dev Pay a claim
     */
    function payClaim(uint256 _claimId) external onlyAdmin nonReentrant {
        Claim storage claim = claims[_claimId];
        require(claim.status == ClaimStatus.APPROVED, "Claim not approved");
        
        Pool storage pool = pools[claim.poolId];
        
        // FIN-04: Record bookkeeping entries for claim payment using enum
        string memory ref = string(abi.encodePacked("claim_", _claimId));
        recordDebit(AccountType.CLAIM_PAYMENT, claim.approvedAmount, ref);
        recordCredit(AccountType.RESERVE_POOL, claim.approvedAmount, ref);
        
        // Transfer to claimant
        payable(claim.claimant).transfer(claim.approvedAmount);
        
        // Update pool
        pool.balance -= claim.approvedAmount;
        pool.lockedBalance -= claim.approvedAmount;
        pool.totalClaimsPaid += claim.approvedAmount;
        
        // Update coverage
        Coverage storage coverage = loanCoverages[claim.loanId];
        if (coverage.currentCoverage >= claim.approvedAmount) {
            coverage.currentCoverage -= claim.approvedAmount;
            coverage.coverageRatio = (coverage.currentCoverage * 10000) / coverage.monthlyPayment;
        }
        
        claim.status = ClaimStatus.PAID;
        
        emit ClaimPaid(_claimId, claim.approvedAmount);
    }

    /**
     * @dev Trigger liquidation check
     */
    function checkLiquidation(uint256 _loanId) external onlyPlatform returns (bool) {
        Coverage storage coverage = loanCoverages[_loanId];
        
        if (coverage.coverageRatio < coverage.liquidationThreshold) {
            emit LiquidationTriggered(_loanId, "Coverage ratio below threshold");
            return true;
        }
        
        return false;
    }

    /**
     * @dev Get pool details
     */
    function getPool(uint256 _poolId) external view returns (Pool memory) {
        return pools[_poolId];
    }

    /**
     * @dev Get coverage details
     */
    function getCoverage(uint256 _loanId) external view returns (Coverage memory) {
        return loanCoverages[_loanId];
    }

    /**
     * @dev Get claim details
     */
    function getClaim(uint256 _claimId) external view returns (Claim memory) {
        return claims[_claimId];
    }

    /**
     * @dev Get pool claims
     */
    function getPoolClaims(uint256 _poolId) external view returns (Claim[] memory) {
        uint256[] storage claimIds = poolClaims[_poolId];
        Claim[] memory result = new Claim[](claimIds.length);
        
        for (uint256 i = 0; i < claimIds.length; i++) {
            result[i] = claims[claimIds[i]];
        }
        
        return result;
    }

    /**
     * @dev Get all pools
     */
    function getAllPools() external view returns (Pool[] memory) {
        Pool[] memory result = new Pool[](poolCounter);
        
        for (uint256 i = 1; i <= poolCounter; i++) {
            result[i - 1] = pools[i];
        }
        
        return result;
    }

    /**
     * @dev Update coverage ratio for a pool
     */
    function _updateCoverageRatio(uint256 _poolId) internal {
        Pool storage pool = pools[_poolId];
        
        // Simplified: ratio = balance / (total required coverage across loans)
        // In production, calculate actual coverage across all loans
        if (pool.currentCoverageRatio == 0) {
            pool.currentCoverageRatio = pool.targetCoverageRatio;
        }
    }
    
    // ============================================
    // FIN-15: DOUBLE-ENTRY BOOKKEEPING VERIFICATION
    // ============================================
    
    // Struct for ledger entries - FIN-04: Uses enum for account types
    struct LedgerEntry {
        uint256 id;
        string transactionType; // debit/credit
        AccountType account;    // FIN-04: Using enum instead of string
        uint256 amount;
        uint256 timestamp;
        string reference;
        bool verified;
    }
    
    // Bookkeeping tracking
    uint256 public ledgerEntryCounter;
    uint256 public totalDebits;
    uint256 public totalCredits;
    mapping(uint256 => LedgerEntry) public ledgerEntries;
    
    // Mapping for account type to string for backward compatibility
    mapping(AccountType => string) public accountTypeToString;
    
    // Events for audit trail
    event LedgerEntryCreated(uint256 indexed entryId, string transactionType, AccountType account, uint256 amount);
    event BookkeepingVerified(bool isBalanced, uint256 totalDebits, uint256 totalCredits);
    event LedgerReconciliationFailed(string reason, uint256 discrepancy);
    
    /**
     * @dev Initialize account type mapping
     */
    function _initAccountTypes() internal {
        accountTypeToString[AccountType.RESERVE_POOL] = "reserve_pool";
        accountTypeToString[AccountType.PLATFORM] = "platform";
        accountTypeToString[AccountType.FEE] = "fee";
        accountTypeToString[AccountType.CLAIM_PAYMENT] = "claim_payment";
        accountTypeToString[AccountType.LENDER] = "lender";
        accountTypeToString[AccountType.BORROWER] = "borrower";
        accountTypeToString[AccountType.LIQUIDITY] = "liquidity";
        accountTypeToString[AccountType.REWARD] = "reward";
    }
    
    /**
     * @dev Record a debit entry - FIN-04: Uses enum for account type
     * @notice FIN-15: Adds debit entry to the ledger for double-entry bookkeeping
     */
    function recordDebit(AccountType _account, uint256 _amount, string memory _reference) internal returns (uint256) {
        ledgerEntryCounter++;
        
        ledgerEntries[ledgerEntryCounter] = LedgerEntry({
            id: ledgerEntryCounter,
            transactionType: "debit",
            account: _account,
            amount: _amount,
            timestamp: block.timestamp,
            reference: _reference,
            verified: false
        });
        
        totalDebits += _amount;
        
        emit LedgerEntryCreated(ledgerEntryCounter, "debit", _account, _amount);
        
        return ledgerEntryCounter;
    }
    
    /**
     * @dev Record a credit entry - FIN-04: Uses enum for account type
     * @notice FIN-15: Adds credit entry to the ledger for double-entry bookkeeping
     */
    function recordCredit(AccountType _account, uint256 _amount, string memory _reference) internal returns (uint256) {
        ledgerEntryCounter++;
        
        ledgerEntries[ledgerEntryCounter] = LedgerEntry({
            id: ledgerEntryCounter,
            transactionType: "credit",
            account: _account,
            amount: _amount,
            timestamp: block.timestamp,
            reference: _reference,
            verified: false
        });
        
        totalCredits += _amount;
        
        emit LedgerEntryCreated(ledgerEntryCounter, "credit", _account, _amount);
        
        return ledgerEntryCounter;
    }
    
    /**
     * @dev Verify double-entry bookkeeping balance
     * @notice FIN-15: Ensures total debits equal total credits
     */
    function verifyBookkeeping() external returns (bool isBalanced) {
        if (totalDebits == totalCredits) {
            emit BookkeepingVerified(true, totalDebits, totalCredits);
            return true;
        } else {
            uint256 discrepancy = totalDebits > totalCredits 
                ? totalDebits - totalCredits 
                : totalCredits - totalDebits;
            emit LedgerReconciliationFailed("Debits do not equal credits", discrepancy);
            emit BookkeepingVerified(false, totalDebits, totalCredits);
            return false;
        }
    }
    
    /**
     * @dev Get ledger entry details
     */
    function getLedgerEntry(uint256 _entryId) external view returns (LedgerEntry memory) {
        return ledgerEntries[_entryId];
    }
    
    /**
     * @dev Get bookkeeping summary
     */
    function getBookkeepingSummary() external view returns (
        uint256 entryCount,
        uint256 totalDebits_,
        uint256 totalCredits_,
        bool isBalanced
    ) {
        return (
            ledgerEntryCounter,
            totalDebits,
            totalCredits,
            totalDebits == totalCredits
        );
    }
    
    /**
     * @dev Reset ledger (admin only - for testing/reconciliation)
     */
    function resetLedger() external onlyAdmin {
        ledgerEntryCounter = 0;
        totalDebits = 0;
        totalCredits = 0;
    }
    
    // Required for receiving ETH
    receive() external payable {}
}
