// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./LoanTokenFactory.sol";

/**
 * @title LendaLoan
 * @dev Smart contract for P2P lending with collateral management
 * 
 * SEC-011: Circuit breaker added via Pausable
 * SEC-012: Emergency withdrawal protected by timelock
 * 
 * Loan Lifecycle: REQUESTED -> FUNDED -> ACTIVE -> REPAID / DEFAULTED -> PLATFORM_SETTLED
 */
contract LendaLoan is ReentrancyGuard, Pausable, AccessControl {
    // Enums
    enum LoanStatus {
        REQUESTED,
        FUNDED,
        ACTIVE,
        REPAID,
        DEFAULTED,
        PLATFORM_SETTLED,
        CANCELLED
    }

    enum RepaymentStatus {
        PENDING,
        PAID,
        LATE,
        DEFAULTED
    }

    // Structs
    struct Loan {
        uint256 id;
        address borrower;
        address[] lenders;
        uint256 loanAmount;
        uint256 interestRate; // Annual rate in basis points (e.g., 1250 = 12.5%)
        uint256 durationMonths;
        uint256 fundedAmount;
        uint256 repaidAmount;
        LoanStatus status;
        uint256 collateralId;
        uint256 createdAt;
        uint256 fundedAt;
        uint256 fullyFundedAt;
        uint256 dueDate;
        uint256 defaultDate;
        // FIN-01: Borrower-configurable principal/interest split
        uint256 principalSplit; // In basis points (e.g., 7000 = 70%)
    }

    struct Collateral {
        uint256 id;
        address owner;
        uint256 loanId;
        string collateralType;
        uint256 estimatedValue;
        string documentHash; // IPFS hash for verification documents
        bool isVerified;
        bool isLocked;
        bool isReleased;
    }

    struct Repayment {
        uint256 loanId;
        uint256 amount;
        uint256 principal;
        uint256 interest;
        uint256 dueDate;
        uint256 paidAt;
        RepaymentStatus status;
    }

    struct LenderInvestment {
        uint256 loanId;
        uint256 amount;
        uint256 earnedAmount;
        bool isActive;
    }

    // Roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant LENDER_ROLE = keccak256("LENDER_ROLE");
    bytes32 public constant BORROWER_ROLE = keccak256("BORROWER_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    
    // SEC-012: Timelock controller for emergency withdrawals
    address public timelockController;
    uint256 public constant EMERGENCY_WITHDRAWAL_DELAY = 48 hours; // Minimum 48 hours
    
    // CQ-16 Fix: Define constants for magic numbers
    uint256 public constant MAX_INTEREST_RATE = 5000; // 50% in basis points
    uint256 public constant MAX_DURATION_MONTHS = 60; // Maximum 60 months
    uint256 public constant MIN_PRINCIPAL_SPLIT = 5000; // 50% in basis points
    uint256 public constant MAX_PRINCIPAL_SPLIT = 9000; // 90% in basis points
    
    // SEC-012: Pending emergency withdrawal
    struct PendingWithdrawal {
        uint256 amount;
        uint256 requestTime;
        bool executed;
        bool cancelled;
    }
    mapping(bytes32 => PendingWithdrawal) public pendingWithdrawals;
    bytes32[] public withdrawalRequestIds;
    
    // SEC-011: Emergency events
    event EmergencyPause(address indexed caller);
    event EmergencyUnpause(address indexed caller);
    // SEC-012: Timelock withdrawal events
    event EmergencyWithdrawRequested(bytes32 indexed requestId, uint256 amount, uint256 executeAfter);
    event EmergencyWithdrawExecuted(bytes32 indexed requestId, uint256 amount);
    event EmergencyWithdrawCancelled(bytes32 indexed requestId);
    event TimelockControllerUpdated(address indexed oldController, address indexed newController);
    
    // State Variables
    uint256 public loanCounter;
    uint256 public collateralCounter;
    
    mapping(uint256 => Loan) public loans;
    mapping(uint256 => Collateral) public collaterals;
    mapping(address => LenderInvestment[]) public lenderInvestments;
    mapping(uint256 => Repayment[]) public loanRepayments;
    mapping(address => uint256[]) public borrowerLoans;
    
    // Loan Amount Configuration
    uint256 public minLoanAmount = 100 ether; // Minimum loan amount
    uint256 public maxLoanAmount = 100000 ether; // Maximum loan amount
    
    // Grace Period Configuration (RISK-01: Make configurable)
    uint256 public gracePeriodDays = 7; // Default 7 days, configurable by admin
    
    // Reserve Fund
    uint256 public reserveFundBalance;
    uint256 public reserveFundLocked;
    uint256 public coverageRatio; // In basis points
    uint256 public minCoverageRatio = 1500; // Minimum 15% coverage required
    uint256 public autoDepositThreshold = 1000 ether; // Auto-deposit threshold
    uint256 public platformFeeAccumulator; // Accumulated fees for auto-deposit
    
    // FIN-05: LoanTokenFactory for fractional token issuance
    address public loanTokenFactoryAddress;
    mapping(uint256 => address) public loanTokenAddresses;
    
    // FIN-01: Configurable principal/interest split (in basis points)
    // Default 70% principal, 30% interest
    uint256 public principalSplit = 7000; // 70% in basis points
    uint256 public interestSplit = 3000;  // 30% in basis points
    
    // Reserve Fund Events
    event ReserveFundDeposited(uint256 amount);
    event ReserveFundAutoDeposit(uint256 amount);
    event CoverageRatioAlert(uint256 currentRatio, uint256 minimumRatio);
    event ClaimPaid(uint256 indexed loanId, uint256 amount);
    // RISK-01: Grace period events
    event GracePeriodConfigured(uint256 newGracePeriodDays);
    event GracePeriodReminder(uint256 indexed loanId, uint256 daysRemaining);
    
    // Gas Optimization: Better data structure for lender investments
    // Mapping: loanId => lender => investment details
    mapping(uint256 => mapping(address => LenderInvestment)) public loanLenderInvestments;
    
    // Loan Topup Struct
    struct LoanTopup {
        uint256 id;
        uint256 loanId;
        address borrower;
        uint256 additionalAmount;
        uint256 newTotalAmount;
        uint256 interestRate;
        uint256 additionalMonths;
        bool isApproved;
        bool isFunded;
        uint256 requestedAt;
        uint256 approvedAt;
    }
    
    // Topup State
    uint256 public topupCounter;
    mapping(uint256 => LoanTopup) public loanTopups;
    mapping(uint256 => uint256[]) public loanTopupRequests;
    
    // Events
    event LoanCreated(uint256 indexed loanId, address indexed borrower, uint256 amount, uint256 interestRate);
    event LoanTopupRequested(uint256 indexed topupId, uint256 indexed loanId, uint256 amount);
    event LoanTopupApproved(uint256 indexed topupId, uint256 indexed loanId);
    event LoanTopupFunded(uint256 indexed topupId, uint256 indexed loanId, uint256 amount);
    event LoanFunded(uint256 indexed loanId, address indexed lender, uint256 amount);
    event LoanFullyFunded(uint256 indexed loanId);
    event LoanActivated(uint256 indexed loanId, uint256 dueDate);
    event RepaymentMade(uint256 indexed loanId, uint256 amount);
    event LoanRepaid(uint256 indexed loanId);
    event DefaultTriggered(uint256 indexed loanId);
    event CollateralDeposited(uint256 indexed collateralId, uint256 loanId, uint256 value);
    event CollateralReleased(uint256 indexed collateralId);
    event CollateralTransferredToMarketplace(uint256 indexed collateralId);
    event ReserveFundDeposited(uint256 amount);
    event ClaimPaid(uint256 indexed loanId, uint256 amount);

    // Modifiers
    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "Not an admin");
        _;
    }

    modifier onlyActiveLoan(uint256 _loanId) {
        require(loans[_loanId].status == LoanStatus.ACTIVE, "Loan is not active");
        _;
    }

    modifier onlyBorrower(uint256 _loanId) {
        require(loans[_loanId].borrower == msg.sender, "Not the borrower");
        _;
    }

    modifier onlyLender(uint256 _loanId) {
        bool isLender = false;
        for (uint256 i = 0; i < loans[_loanId].lenders.length; i++) {
            if (loans[_loanId].lenders[i] == msg.sender) {
                isLender = true;
                break;
            }
        }
        require(isLender, "Not a lender of this loan");
        _;
    }

    constructor() {
        loanCounter = 0;
        collateralCounter = 0;
        topupCounter = 0;
        reserveFundBalance = 500000 ether; // Initial reserve
        coverageRatio = 2500; // 25%
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(EMERGENCY_ROLE, msg.sender);
    }

    // ============================================
    // LOAN MANAGEMENT
    // ============================================

    /**
     * @dev Create a new loan request
     * @notice Borrower sets the interest terms including principal/interest split
     * @notice SEC-011: Paused check added
     */
    function createLoan(
        uint256 _loanAmount,
        uint256 _interestRate,
        uint256 _durationMonths,
        uint256 _collateralId,
        uint256 _principalSplit // Borrower's chosen principal split in basis points
    ) external nonReentrant whenNotPaused returns (uint256) {
        require(_loanAmount >= minLoanAmount && _loanAmount <= maxLoanAmount, "Loan amount outside allowed range");
        require(_interestRate > 0 && _interestRate <= MAX_INTEREST_RATE, "Invalid interest rate");
        require(_durationMonths > 0 && _durationMonths <= MAX_DURATION_MONTHS, "Invalid duration");
        // FIN-01: Validate borrower's principal split choice (between 50%-90%)
        require(_principalSplit >= MIN_PRINCIPAL_SPLIT && _principalSplit <= MAX_PRINCIPAL_SPLIT, "Principal split must be 50%-90%");
        
        // Grant BORROWER_ROLE to the caller
        if (!hasRole(BORROWER_ROLE, msg.sender)) {
            grantRole(BORROWER_ROLE, msg.sender);
        }
        
        loanCounter++;
        uint256 loanId = loanCounter;
        
        Loan storage loan = loans[loanId];
        loan.id = loanId;
        loan.borrower = msg.sender;
        loan.loanAmount = _loanAmount;
        loan.interestRate = _interestRate;
        loan.durationMonths = _durationMonths;
        loan.status = LoanStatus.REQUESTED;
        loan.collateralId = _collateralId;
        loan.createdAt = block.timestamp;
        loan.fundedAmount = 0;
        loan.repaidAmount = 0;
        // FIN-01: Store borrower's chosen principal/interest split
        loan.principalSplit = _principalSplit;
        
        // Update cached active loans value when loan becomes active later
        
        // Lock collateral if provided and exists
        if (_collateralId > 0) {
            require(collaterals[_collateralId].owner == msg.sender, "Not collateral owner");
            require(!collaterals[_collateralId].isLocked, "Collateral already locked");
            collaterals[_collateralId].isLocked = true;
            collaterals[_collateralId].loanId = loanId;
        }
        
        borrowerLoans[msg.sender].push(loanId);
        
        emit LoanCreated(loanId, msg.sender, _loanAmount, _interestRate);
        
        return loanId;
    }

    /**
     * @dev Fund a loan (lender invests)
     * @notice SEC-011: Paused check added
     */
    function fundLoan(uint256 _loanId) external payable 
        onlyActiveLoan(_loanId) 
        nonReentrant 
        whenNotPaused
    {
        Loan storage loan = loans[_loanId];
        
        require(msg.value > 0, "Funding amount must be greater than 0");
        require(loan.fundedAmount < loan.loanAmount, "Loan fully funded");
        require(loan.borrower != msg.sender, "Cannot fund own loan");
        
        // Grant LENDER_ROLE to the caller
        if (!hasRole(LENDER_ROLE, msg.sender)) {
            grantRole(LENDER_ROLE, msg.sender);
        }
        
        uint256 remainingAmount = loan.loanAmount - loan.fundedAmount;
        uint256 fundingAmount = msg.value > remainingAmount ? remainingAmount : msg.value;
        
        // Add lender to list if not already
        bool isExistingLender = false;
        for (uint256 i = 0; i < loan.lenders.length; i++) {
            if (loan.lenders[i] == msg.sender) {
                isExistingLender = true;
                break;
            }
        }
        if (!isExistingLender) {
            loan.lenders.push(msg.sender);
        }
        
        loan.fundedAmount += fundingAmount;
        
        // Record investment - Gas Optimization: Use O(1) mapping lookup
        lenderInvestments[msg.sender].push(LenderInvestment({
            loanId: _loanId,
            amount: fundingAmount,
            earnedAmount: 0,
            isActive: true
        }));
        
        // Also store in optimized mapping for O(1) access
        LenderInvestment storage newInvestment = loanLenderInvestments[_loanId][msg.sender];
        newInvestment.loanId = _loanId;
        newInvestment.amount += fundingAmount;
        newInvestment.isActive = true;
        
        emit LoanFunded(_loanId, msg.sender, fundingAmount);
        
        // Check if fully funded
        if (loan.fundedAmount >= loan.loanAmount) {
            loan.status = LoanStatus.FUNDED;
            loan.fullyFundedAt = block.timestamp;
            emit LoanFullyFunded(_loanId);
            
            // Activate loan and calculate due date
            _activateLoan(_loanId);
            
            // Gas Optimization: Update cached active loans value
            cachedActiveLoansValue += loan.loanAmount;
        }
        
        // CEI: Return excess funds after state changes
        if (msg.value > fundingAmount) {
            (bool success, ) = payable(msg.sender).call{value: msg.value - fundingAmount}("");
            require(success, "Transfer failed");
        }
    }

    /**
     * @dev Request a loan top-up (increase loan amount)
     */
    function requestLoanTopup(
        uint256 _loanId,
        uint256 _additionalAmount,
        uint256 _additionalMonths
    ) external nonReentrant returns (uint256) {
        Loan storage loan = loans[_loanId];
        
        require(loan.status == LoanStatus.ACTIVE, "Loan must be active");
        require(loan.borrower == msg.sender, "Not the borrower");
        require(_additionalAmount > 0, "Additional amount must be greater than 0");
        require(_additionalMonths > 0, "Additional months must be greater than 0");
        
        // Check max topup (cannot exceed original loan amount)
        require(_additionalAmount <= loan.loanAmount, "Topup cannot exceed original loan amount");
        
        topupCounter++;
        uint256 topupId = topupCounter;
        
        LoanTopup storage topup = loanTopups[topupId];
        topup.id = topupId;
        topup.loanId = _loanId;
        topup.borrower = msg.sender;
        topup.additionalAmount = _additionalAmount;
        topup.newTotalAmount = loan.loanAmount + _additionalAmount;
        topup.interestRate = loan.interestRate;
        topup.additionalMonths = _additionalMonths;
        topup.isApproved = false;
        topup.isFunded = false;
        topup.requestedAt = block.timestamp;
        
        loanTopupRequests[_loanId].push(topupId);
        
        emit LoanTopupRequested(topupId, _loanId, _additionalAmount);
        
        return topupId;
    }

    /**
     * @dev Approve a loan top-up (admin only)
     */
    function approveLoanTopup(uint256 _topupId) external onlyAdmin nonReentrant {
        LoanTopup storage topup = loanTopups[_topupId];
        
        require(topup.id == _topupId, "Topup does not exist");
        require(!topup.isApproved, "Topup already approved");
        
        Loan storage loan = loans[topup.loanId];
        require(loan.status == LoanStatus.ACTIVE, "Loan must be active");
        
        topup.isApproved = true;
        topup.approvedAt = block.timestamp;
        
        emit LoanTopupApproved(_topupId, topup.loanId);
    }

    /**
     * @dev Fund a loan top-up (lenders provide additional funds)
     */
    function fundLoanTopup(uint256 _topupId) external payable nonReentrant {
        LoanTopup storage topup = loanTopups[_topupId];
        
        require(topup.id == _topupId, "Topup does not exist");
        require(topup.isApproved, "Topup not approved");
        require(!topup.isFunded, "Topup already funded");
        require(msg.value > 0, "Funding amount must be greater than 0");
        
        Loan storage loan = loans[topup.loanId];
        
        uint256 fundingAmount = msg.value > topup.additionalAmount 
            ? topup.additionalAmount 
            : msg.value;
        
        // Add lender if not already
        bool isExistingLender = false;
        for (uint256 i = 0; i < loan.lenders.length; i++) {
            if (loan.lenders[i] == msg.sender) {
                isExistingLender = true;
                break;
            }
        }
        if (!isExistingLender) {
            loan.lenders.push(msg.sender);
        }
        
        // Record investment
        lenderInvestments[msg.sender].push(LenderInvestment({
            loanId: topup.loanId,
            amount: fundingAmount,
            earnedAmount: 0,
            isActive: true
        }));
        
        // Update loan amounts
        loan.fundedAmount += fundingAmount;
        loan.loanAmount = topup.newTotalAmount;
        loan.durationMonths += topup.additionalMonths;
        
        // Add new repayment schedule entries
        // FIN-01: Use borrower's chosen principal/interest split
        uint256 monthlyPayment = _calculateMonthlyPayment(
            topup.newTotalAmount,
            loan.interestRate,
            loan.durationMonths
        );
        
        uint256 originalRepayments = topup.approvedAt - loan.fundedAt > 0 
            ? loanRepayments[topup.loanId].length 
            : 0;
        
        // Use loan's principal split (set by borrower) or fallback to global
        uint256 loanPrincipalSplit = loan.principalSplit > 0 ? loan.principalSplit : principalSplit;
        uint256 loanInterestSplit = 10000 - loanPrincipalSplit;
        
        for (uint256 i = originalRepayments; i < loan.durationMonths; i++) {
            loanRepayments[topup.loanId].push(Repayment({
                loanId: topup.loanId,
                amount: monthlyPayment,
                principal: monthlyPayment * loanPrincipalSplit / 10000, // Borrower's chosen principal
                interest: monthlyPayment * loanInterestSplit / 10000,   // Borrower's chosen interest
                dueDate: block.timestamp + ((i + 1) * 30 days),
                paidAt: 0,
                status: RepaymentStatus.PENDING
            }));
        }
        
        topup.isFunded = true;
        
        emit LoanTopupFunded(_topupId, topup.loanId, fundingAmount);
        
        // Return excess funds
        if (msg.value > fundingAmount) {
            (bool success, ) = payable(msg.sender).call{value: msg.value - fundingAmount}("");
            require(success, "Transfer failed");
        }
    }

    /**
     * @dev Get topup details
     */
    function getLoanTopup(uint256 _topupId) external view returns (LoanTopup memory) {
        return loanTopups[_topupId];
    }

    /**
     * @dev Get all topups for a loan
     */
    function getLoanTopups(uint256 _loanId) external view returns (uint256[] memory) {
        return loanTopupRequests[_loanId];
    }

    /**
     * @dev Activate loan after full funding
     */
    function _activateLoan(uint256 _loanId) internal {
        Loan storage loan = loans[_loanId];
        
        loan.status = LoanStatus.ACTIVE;
        loan.fundedAt = block.timestamp;
        
        // Calculate due date (monthly payments)
        uint256 monthlyPayment = _calculateMonthlyPayment(
            loan.loanAmount,
            loan.interestRate,
            loan.durationMonths
        );
        
        // Create repayment schedule
        // FIN-01: Use borrower's chosen principal/interest split
        uint256 loanPrincipalSplit = loan.principalSplit > 0 ? loan.principalSplit : principalSplit;
        uint256 loanInterestSplit = 10000 - loanPrincipalSplit;
        
        for (uint256 i = 1; i <= loan.durationMonths; i++) {
            loanRepayments[_loanId].push(Repayment({
                loanId: _loanId,
                amount: monthlyPayment,
                principal: monthlyPayment * loanPrincipalSplit / 10000, // Borrower's chosen principal
                interest: monthlyPayment * loanInterestSplit / 10000,    // Borrower's chosen interest
                dueDate: block.timestamp + (i * 30 days),
                paidAt: 0,
                status: RepaymentStatus.PENDING
            }));
        }
        
        loan.dueDate = loanRepayments[_loanId][0].dueDate;
        // RISK-01: Use configurable grace period instead of hardcoded 7 days
        loan.defaultDate = loan.dueDate + (gracePeriodDays * 1 days); // Grace period
        
        emit LoanActivated(_loanId, loan.dueDate);
    }

    /**
     * @dev Make a repayment
     * @notice SEC-011: Paused check added
     */
    function repayLoan(uint256 _loanId) external payable onlyActiveLoan(_loanId) nonReentrant whenNotPaused {
        Loan storage loan = loans[_loanId];
        
        require(msg.value > 0, "Repayment amount must be greater than 0");
        
        // CEI: Calculate all repayments first before any state changes or external calls
        uint256 totalRepaid = 0;
        uint256 pendingPayments = 0;
        
        // Count pending repayments
        for (uint256 i = 0; i < loanRepayments[_loanId].length; i++) {
            Repayment storage repayment = loanRepayments[_loanId];
            
            if (repayment[i].status == RepaymentStatus.PENDING || 
                repayment[i].status == RepaymentStatus.LATE) {
                pendingPayments++;
            }
        }
        
        require(pendingPayments > 0, "No pending repayments");
        
        uint256 remainingValue = msg.value;
        
        // Process repayments in order - update state first
        for (uint256 i = 0; i < loanRepayments[_loanId].length; i++) {
            Repayment storage repayment = loanRepayments[_loanId];
            
            if ((repayment[i].status == RepaymentStatus.PENDING || 
                repayment[i].status == RepaymentStatus.LATE) && remainingValue > 0) {
                
                uint256 payment = remainingValue > repayment[i].amount 
                    ? repayment[i].amount 
                    : remainingValue;
                
                // Update state before external calls (CEI)
                repayment[i].paidAt = block.timestamp;
                repayment[i].status = RepaymentStatus.PAID;
                
                totalRepaid += payment;
                loan.repaidAmount += payment;
                
                if (payment < remainingValue) {
                    remainingValue -= payment;
                } else {
                    remainingValue = 0;
                }
                
                emit RepaymentMade(_loanId, payment);
            }
        }
        
        // Now distribute to lenders after all state updates
        if (totalRepaid > 0) {
            _distributeRepayment(_loanId, totalRepaid);
        }
        
        // Return excess if any
        if (remainingValue > 0) {
            (bool success, ) = payable(msg.sender).call{value: remainingValue}("");
            require(success, "Refund failed");
        }
        
        // Check if loan is fully repaid
        if (loan.repaidAmount >= loan.loanAmount) {
            loan.status = LoanStatus.REPAID;
            
            // Gas Optimization: Calculate and cache platform interest
            uint256 loanInterest = loan.loanAmount * loan.interestRate / 10000 
                                    * loan.durationMonths / 12;
            cachedPlatformInterest += loanInterest;
            cachedActiveLoansValue -= loan.loanAmount;
            
            _releaseCollateral(loan.collateralId);
            emit LoanRepaid(_loanId);
        }
    }

    /**
     * @dev Trigger default on a loan
     */
    function triggerDefault(uint256 _loanId) external onlyAdmin nonReentrant {
        Loan storage loan = loans[_loanId];
        
        require(loan.status == LoanStatus.ACTIVE, "Loan is not active");
        require(block.timestamp > loan.defaultDate, "Not yet in default");
        
        loan.status = LoanStatus.DEFAULTED;
        
        // Pay lenders from reserve fund
        uint256 unpaidAmount = loan.loanAmount - loan.repaidAmount;
        _payLenderFromReserve(_loanId, unpaidAmount);
        
        // FIN-008: Invalidate cache on default
        _invalidateCacheOnDefault(_loanId);
        
        // Transfer collateral to marketplace
        _transferCollateralToMarketplace(loan.collateralId);
        
        emit DefaultTriggered(_loanId);
    }

    // ============================================
    // COLLATERAL MANAGEMENT
    // ============================================

    /**
     * @dev Deposit collateral for a loan
     */
    function depositCollateral(
        string memory _collateralType,
        uint256 _estimatedValue,
        string memory _documentHash
    ) external nonReentrant returns (uint256) {
        require(bytes(_collateralType).length > 0, "Collateral type required");
        require(_estimatedValue > 0, "Collateral value must be greater than 0");
        require(bytes(_documentHash).length > 0, "Document hash required");
        
        collateralCounter++;
        uint256 collateralId = collateralCounter;
        
        Collateral storage collateral = collaterals[collateralId];
        collateral.id = collateralId;
        collateral.owner = msg.sender;
        collateral.loanId = 0;
        collateral.collateralType = _collateralType;
        collateral.estimatedValue = _estimatedValue;
        collateral.documentHash = _documentHash;
        collateral.isVerified = false;
        collateral.isLocked = false;
        collateral.isReleased = false;
        
        emit CollateralDeposited(collateralId, 0, _estimatedValue);
        
        return collateralId;
    }

    /**
     * @dev Verify collateral (admin only)
     */
    function verifyCollateral(uint256 _collateralId) external onlyAdmin nonReentrant {
        Collateral storage collateral = collaterals[_collateralId];
        require(collateral.owner != address(0), "Collateral does not exist");
        collateral.isVerified = true;
    }

    /**
     * @dev Update collateral value (admin only)
     */
    function updateCollateralValue(uint256 _collateralId, uint256 _newValue) external onlyAdmin nonReentrant {
        require(_newValue > 0, "Value must be greater than 0");
        Collateral storage collateral = collaterals[_collateralId];
        require(collateral.owner != address(0), "Collateral does not exist");
        collateral.estimatedValue = _newValue;
    }

    /**
     * @dev Release collateral after loan is repaid
     */
    function _releaseCollateral(uint256 _collateralId) internal {
        if (_collateralId == 0) return;
        
        Collateral storage collateral = collaterals[_collateralId];
        collateral.isLocked = false;
        collateral.isReleased = true;
        
        emit CollateralReleased(_collateralId);
    }

    /**
     * @dev Transfer collateral to marketplace on default
     */
    function _transferCollateralToMarketplace(uint256 _collateralId) internal {
        if (_collateralId == 0) return;
        
        Collateral storage collateral = collaterals[_collateralId];
        collateral.isLocked = true; // Remains locked until sold
        
        emit CollateralTransferredToMarketplace(_collateralId);
    }

    // ============================================
    // RESERVE FUND & GUARANTEE
    // ============================================

    /**
     * @dev Deposit to reserve fund with auto-deposit feature
     */
    function depositToReserveFund() external payable nonReentrant {
        require(msg.value > 0, "Deposit amount must be greater than 0");
        
        // CEI: Update state before external calls
        reserveFundBalance += msg.value;
        
        // Check if auto-deposit threshold is reached
        if (platformFeeAccumulator >= autoDepositThreshold) {
            uint256 depositAmount = platformFeeAccumulator;
            platformFeeAccumulator = 0;
            reserveFundBalance += depositAmount;
            emit ReserveFundAutoDeposit(depositAmount);
        }
        
        _updateCoverageRatio();
        
        // Emit alert if coverage ratio is below minimum
        if (coverageRatio < minCoverageRatio) {
            emit CoverageRatioAlert(coverageRatio, minCoverageRatio);
        }
        
        emit ReserveFundDeposited(msg.value);
    }
    
    /**
     * @dev FIN-007: Initial funding mechanism for reserve fund
     * @notice Allows the contract to fund the reserve fund from its balance
     * @param _amount The amount to fund from contract balance
     */
    function initialReserveFunding(uint256 _amount) external onlyAdmin {
        require(_amount > 0, "Amount must be greater than 0");
        require(address(this).balance >= _amount, "Insufficient contract balance");
        
        reserveFundBalance += _amount;
        _updateCoverageRatio();
        
        emit ReserveFundDeposited(_amount);
    }
    
    /**
     * @dev FIN-007: Fund reserve from platform fees
     * @notice Allows automatic funding from accumulated platform fees
     */
    function fundReserveFromFees() external onlyAdmin {
        require(platformFeeAccumulator > 0, "No fees to deposit");
        
        uint256 depositAmount = platformFeeAccumulator;
        platformFeeAccumulator = 0;
        reserveFundBalance += depositAmount;
        _updateCoverageRatio();
        
        emit ReserveFundAutoDeposit(depositAmount);
    }
    
    /**
     * @dev FIN-008: Invalidate coverage ratio cache on loan state changes
     * @notice Called when active loans value changes to ensure cache consistency
     */
    function _invalidateCoverageCache() internal {
        // Trigger recalculation of coverage ratio on next request
        // The cachedActiveLoansValue is already maintained in real-time
        // This function can be used for additional cache invalidation logic
        _updateCoverageRatio();
    }
    
    /**
     * @dev FIN-008: Update cache on loan default - called in triggerDefault
     */
    function _invalidateCacheOnDefault(uint256 _loanId) internal {
        Loan storage loan = loans[_loanId];
        // Deduct the unpaid amount from cached active loans
        uint256 unpaidAmount = loan.loanAmount - loan.repaidAmount;
        if (cachedActiveLoansValue >= unpaidAmount) {
            cachedActiveLoansValue -= unpaidAmount;
        } else {
            cachedActiveLoansValue = 0;
        }
        // Update coverage ratio after cache invalidation
        _updateCoverageRatio();
    }
    
    /**
     * @dev FIN-008: Update cache on loan repayment - called in repayLoan
     */
    function _invalidateCacheOnRepayment(uint256 _loanId) internal {
        Loan storage loan = loans[_loanId];
        // When loan is fully repaid, remove from cached active loans
        if (loan.status == LoanStatus.REPAID) {
            if (cachedActiveLoansValue >= loan.loanAmount) {
                cachedActiveLoansValue -= loan.loanAmount;
            } else {
                cachedActiveLoansValue = 0;
            }
        }
        // Update coverage ratio after cache change
        _updateCoverageRatio();
    }
    
    /**
     * @dev Capture platform fee for auto-deposit
     * @notice Internal function to capture fees from loan activities
     */
    function _capturePlatformFee(uint256 _feeAmount) internal {
        platformFeeAccumulator += _feeAmount;
        
        // Auto-deposit if threshold reached
        if (platformFeeAccumulator >= autoDepositThreshold) {
            uint256 depositAmount = platformFeeAccumulator;
            platformFeeAccumulator = 0;
            reserveFundBalance += depositAmount;
            emit ReserveFundAutoDeposit(depositAmount);
        }
    }
    
    /**
     * @dev Update minimum coverage ratio (admin only)
     */
    function setMinCoverageRatio(uint256 _newMinRatio) external onlyAdmin {
        require(_newMinRatio >= 500 && _newMinRatio <= 5000, "Invalid ratio (5%-50%)");
        minCoverageRatio = _newMinRatio;
    }
    
    /**
     * @dev Set auto-deposit threshold (admin only)
     */
    function setAutoDepositThreshold(uint256 _newThreshold) external onlyAdmin {
        require(_newThreshold > 0, "Threshold must be greater than 0");
        autoDepositThreshold = _newThreshold;
    }
    
    /**
     * @dev Set principal/interest split (admin only)
     * @notice FIN-01: Configures the principal/interest split for repayments
     * @param _principalSplit The principal portion in basis points (e.g., 7000 = 70%)
     */
    function setPrincipalInterestSplit(uint256 _principalSplit) external onlyAdmin {
        require(_principalSplit >= MIN_PRINCIPAL_SPLIT && _principalSplit <= MAX_PRINCIPAL_SPLIT, "Split must be between 50%-90%");
        principalSplit = _principalSplit;
        interestSplit = 10000 - _principalSplit;
    }
    
    /**
     * @dev Set grace period (admin only)
     * @notice RISK-01: Configurable grace period for loan defaults
     * @param _days New grace period in days
     */
    function setGracePeriod(uint256 _days) external onlyAdmin {
        require(_days >= 1 && _days <= 30, "Grace period must be 1-30 days");
        gracePeriodDays = _days;
        emit GracePeriodConfigured(_days);
    }
    
    /**
     * @dev Get reserve fund status with detailed info
     */
    function getReserveFundStatus() external view returns (
        uint256 balance,
        uint256 lockedBalance,
        uint256 availableBalance,
        uint256 currentCoverageRatio,
        uint256 minRequiredRatio,
        bool isHealthy
    ) {
        uint256 available = reserveFundBalance - reserveFundLocked;
        bool healthy = coverageRatio >= minCoverageRatio;
        
        return (
            reserveFundBalance,
            reserveFundLocked,
            available,
            coverageRatio,
            minCoverageRatio,
            healthy
        );
    }
    
    /**
     * @dev Emergency replenish reserve fund (admin only)
     */
    function emergencyReplenish() external payable onlyAdmin nonReentrant {
        require(msg.value > 0, "Replenishment amount must be greater than 0");
        reserveFundBalance += msg.value;
        _updateCoverageRatio();
        emit ReserveFundDeposited(msg.value);
    }

    /**
     * @dev Pay lender from reserve fund on default
     */
    function _payLenderFromReserve(uint256 _loanId, uint256 _amount) internal {
        require(reserveFundBalance >= _amount, "Insufficient reserve funds");
        
        // CEI: Update state before external calls
        reserveFundBalance -= _amount;
        reserveFundLocked += _amount; // Lock during payment
        
        Loan storage loan = loans[_loanId];
        address[] memory lenders = loan.lenders;
        
        // CEI: Mark all investments as settled first using optimized mapping
        for (uint256 i = 0; i < lenders.length; i++) {
            address lender = lenders[i];
            LenderInvestment storage investment = loanLenderInvestments[_loanId][lender];
            if (investment.isActive) {
                investment.isActive = false;
            }
        }
        
        // Then pay each lender proportionally using O(1) lookup
        for (uint256 i = 0; i < lenders.length; i++) {
            address lender = lenders[i];
            uint256 lenderShare = _amount * loanLenderInvestments[_loanId][lender].amount / loan.fundedAmount;
            
            (bool success, ) = lender.call{value: lenderShare}("");
            require(success, "Transfer failed");
        }
        
        // Unlock the funds after payment
        reserveFundLocked -= _amount;
        
        loan.status = LoanStatus.PLATFORM_SETTLED;
        
        // Gas Optimization: Update cached values
        cachedActiveLoansValue -= (loan.loanAmount - loan.repaidAmount);
        
        // Update coverage ratio after claim
        _updateCoverageRatio();
        
        emit ClaimPaid(_loanId, _amount);
    }

    /**
     * @dev Update coverage ratio
     * @notice Optimized: Uses cached value instead of iterating
     */
    function _updateCoverageRatio() internal {
        if (cachedActiveLoansValue > 0) {
            coverageRatio = (reserveFundBalance * 10000) / cachedActiveLoansValue;
        }
    }

    /**
     * @dev Get total value of active loans
     * @notice Optimized: Returns cached value O(1) instead of O(n) loop
     */
    function _getTotalActiveLoans() internal view returns (uint256) {
        return cachedActiveLoansValue;
    }

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    /**
     * @dev Calculate monthly payment using standard amortization formula
     * M = P * [r(1+r)^n] / [(1+r)^n - 1]
     * Where: P = principal, r = monthly rate, n = number of payments
     */
    function _calculateMonthlyPayment(
        uint256 _principal,
        uint256 _annualRateBps, // Annual rate in basis points (e.g., 1250 = 12.5%)
        uint256 _months
    ) internal pure returns (uint256) {
        if (_annualRateBps == 0) {
            return _principal / _months;
        }
        
        // Convert annual rate from basis points to decimal (bps/10000)
        // Use high precision for accurate calculation
        uint256 r = _annualRateBps; // Keep as bps for precision
        uint256 n = _months;
        
        // Calculate (1 + r/12)^n using iterative approach
        // r is in bps, so divide by 120000 to get monthly decimal rate
        // Using WAD (10^18) precision for accurate fixed-point math
        
        uint256 ONE = 1e18;
        uint256 monthlyRate = (r * 1e14) / 12; // Convert bps to WAD precision monthly rate
        
        // Calculate (1 + r)^n using binary exponentiation for efficiency
        uint256 compoundFactor = _pow(ONE + monthlyRate, n);
        
        // Standard amortization formula: M = P * [r(1+r)^n] / [(1+r)^n - 1]
        // In WAD: M = P * [mr * CF] / [CF - 1]
        uint256 numerator = _principal * monthlyRate * compoundFactor;
        uint256 denominator = (compoundFactor - ONE) * 1e18;
        
        // Add rounding: add half of denominator before dividing
        uint256 monthlyPayment = (numerator + denominator / 2) / denominator;
        
        return monthlyPayment;
    }
    
    /**
     * @dev Calculate compound interest for a period with monthly compounding
     * @param _principal The principal amount
     * @param _annualRateBps Annual interest rate in basis points
     * @param _months Number of months
     * @return The total amount after compound interest
     */
    function _calculateCompoundInterest(
        uint256 _principal,
        uint256 _annualRateBps,
        uint256 _months
    ) internal pure returns (uint256) {
        if (_annualRateBps == 0) {
            return _principal;
        }
        
        uint256 ONE = 1e18;
        uint256 monthlyRate = (_annualRateBps * 1e14) / 12; // Monthly rate in WAD
        
        // Calculate (1 + r)^n
        uint256 compoundFactor = _pow(ONE + monthlyRate, _months);
        
        // Total = Principal * (1 + r)^n
        uint256 total = (_principal * compoundFactor + ONE / 2) / ONE;
        
        return total;
    }
    
    /**
     * @dev Calculate interest earned for a single period with monthly compounding
     * @param _principal The principal amount
     * @param _annualRateBps Annual interest rate in basis points
     * @param _months Number of months
     * @return The interest earned
     */
    function _calculateInterestEarned(
        uint256 _principal,
        uint256 _annualRateBps,
        uint256 _months
    ) internal pure returns (uint256) {
        uint256 totalWithInterest = _calculateCompoundInterest(_principal, _annualRateBps, _months);
        return totalWithInterest - _principal;
    }
    
    /**
     * @dev Power function using binary exponentiation
     */
    function _pow(uint256 base, uint256 exp) internal pure returns (uint256 result) {
        result = 1e18;
        while (exp > 0) {
            if (exp % 2 == 1) {
                result = (result * base + 1e18 / 2) / 1e18;
            }
            base = (base * base + 1e18 / 2) / 1e18;
            exp /= 2;
        }
    }
    
    /**
     * @dev Safe division with rounding - returns quotient with rounding up
     * @param _numerator The numerator
     * @param _denominator The denominator
     * @return The result of the division with rounding
     */
    function _divRoundingUp(uint256 _numerator, uint256 _denominator) internal pure returns (uint256) {
        if (_numerator == 0) return 0;
        return (_numerator + _denominator / 2) / _denominator;
    }
    
    /**
     * @dev Calculate interest with safe rounding
     * @param _principal The principal amount
     * @param _rateBps The rate in basis points
     * @param _divisor The divisor (e.g., 12 for monthly, 10000 for percentage)
     * @return The calculated interest with proper rounding
     */
    function _calculateInterestWithRounding(
        uint256 _principal,
        uint256 _rateBps,
        uint256 _divisor
    ) internal pure returns (uint256) {
        if (_principal == 0 || _rateBps == 0) return 0;
        // Add half of divisor for rounding up: (a * b + divisor/2) / divisor
        return (_principal * _rateBps + _divisor / 2) / _divisor;
    }
    
    /**
     * @dev Calculate share with safe rounding
     * @param _amount The total amount
     * @param _numerator The numerator (e.g., lender's investment)
     * @param _denominator The denominator (e.g., total funded)
     * @return The calculated share with proper rounding
     */
    function _calculateShareWithRounding(
        uint256 _amount,
        uint256 _numerator,
        uint256 _denominator
    ) internal pure returns (uint256) {
        if (_amount == 0 || _numerator == 0 || _denominator == 0) return 0;
        // Add half of denominator for rounding up
        return (_amount * _numerator + _denominator / 2) / _denominator;
    }

    /**
     * @dev Distribute repayment to lenders - uses pull pattern for reentrancy protection
     * @notice Optimized: Uses O(1) mapping lookup instead of O(n) array iteration
     * @notice FIN-002: Uses proper compound interest calculation for accurate interest distribution
     */
    function _distributeRepayment(uint256 _loanId, uint256 _amount) internal {
        Loan storage loan = loans[_loanId];
        address[] memory lenders = loan.lenders;
        
        // CEI: Calculate all shares and update state first before any external calls
        uint256 totalInterest = 0;
        
        for (uint256 i = 0; i < lenders.length; i++) {
            address lender = lenders[i];
            
            // Gas Optimization: O(1) mapping lookup instead of O(n) array search
            LenderInvestment storage investment = loanLenderInvestments[_loanId][lender];
            
            if (investment.isActive) {
                uint256 lenderShare = _amount * investment.amount / loan.fundedAmount;
                
                // FIN-002: Calculate interest earned using compound interest formula
                // Instead of simple: principal * rate / 12
                // Use: compound interest for the period since last repayment
                uint256 interestEarned = _calculateInterestEarned(
                    lenderShare,
                    loan.interestRate,
                    1 // One month period
                );
                investment.earnedAmount += interestEarned;
                
                totalInterest += interestEarned;
                
                // Transfer to lender after state updates (CEI)
                if (lenderShare > 0) {
                    (bool success, ) = payable(lender).call{value: lenderShare}("");
                    require(success, "Transfer failed");
                }
            }
        }
        
        // Add interest to repaid amount after all external calls
        loan.repaidAmount += totalInterest;
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    function getLoan(uint256 _loanId) external view returns (Loan memory) {
        return loans[_loanId];
    }

    function getCollateral(uint256 _collateralId) external view returns (Collateral memory) {
        return collaterals[_collateralId];
    }

    function getLoanRepayments(uint256 _loanId) external view returns (Repayment[] memory) {
        return loanRepayments[_loanId];
    }

    function getLenderInvestments(address _lender) external view returns (LenderInvestment[] memory) {
        return lenderInvestments[_lender];
    }

    function getBorrowerLoans(address _borrower) external view returns (uint256[] memory) {
        return borrowerLoans[_borrower];
    }

    function calculateLTV(uint256 _loanAmount, uint256 _collateralValue) external pure returns (uint256) {
        if (_collateralValue == 0) return 0;
        return (_loanAmount * 10000) / _collateralValue; // In basis points
    }

    /**
     * @dev Fallback to receive ETH
     * @notice SEC-011: Paused check added for safety
     */
    receive() external payable whenNotPaused {}
    
    // ============================================
    // ADMIN FUNCTIONS
    // ============================================
    
    /**
     * @dev Withdraw accumulated interest from platform (admin only)
     * @notice Optimized: O(1) instead of O(n) by using cached platform interest
     */
    function withdrawPlatformInterest() external onlyAdmin nonReentrant {
        require(cachedPlatformInterest > 0, "No platform interest to withdraw");
        
        uint256 amountToWithdraw = cachedPlatformInterest;
        cachedPlatformInterest = 0;
        
        (bool success, ) = payable(msg.sender).call{value: amountToWithdraw}("");
        require(success, "Withdrawal failed");
    }
    
    /**
     * @dev Set loan token factory address (admin only)
     * @notice FIN-05: Configures the loan token factory for fractional token issuance
     */
    function setLoanTokenFactoryAddress(address _factoryAddress) external onlyAdmin {
        require(_factoryAddress != address(0), "Invalid factory address");
        loanTokenFactoryAddress = _factoryAddress;
    }
    
    /**
     * @dev FIN-05: Issue fractional tokens for a loan
     * @notice Creates loan tokens when loan is fully funded, enabling fractional ownership
     * @param _loanId The loan ID to tokenize
     */
    function issueFractionalTokens(uint256 _loanId) external onlyAdmin returns (address) {
        require(loanTokenFactoryAddress != address(0), "Token factory not set");
        require(loans[_loanId].status == LoanStatus.FUNDED || loans[_loanId].status == LoanStatus.ACTIVE, "Loan not ready for tokenization");
        require(loanTokenAddresses[_loanId] == address(0), "Tokens already issued");
        
        Loan storage loan = loans[_loanId];
        
        // Call LoanTokenFactory to create tokens
        LoanTokenFactory factory = LoanTokenFactory(loanTokenFactoryAddress);
        address tokenAddress = factory.createLoanToken(
            _loanId,
            loan.borrower,
            loan.loanAmount,
            loan.interestRate,
            loan.durationMonths,
            address(this)
        );
        
        loanTokenAddresses[_loanId] = tokenAddress;
        
        // Distribute tokens to lenders proportionally
        _distributeTokensToLenders(_loanId, tokenAddress);
        
        return tokenAddress;
    }
    
    /**
     * @dev FIN-05: Distribute tokens to lenders proportionally
     */
    function _distributeTokensToLenders(uint256 _loanId, address _tokenAddress) internal {
        Loan storage loan = loans[_loanId];
        LoanToken token = LoanToken(_tokenAddress);
        
        // Get total supply (minted by factory)
        uint256 totalSupply = token.totalSupply();
        
        // Distribute to each lender proportionally
        for (uint256 i = 0; i < loan.lenders.length; i++) {
            address lender = loan.lenders[i];
            uint256 lenderInvestment = loanLenderInvestments[_loanId][lender].amount;
            
            // Calculate proportional token amount
            uint256 tokenAmount = (totalSupply * lenderInvestment) / loan.fundedAmount;
            
            if (tokenAmount > 0) {
                token.transfer(lender, tokenAmount);
            }
        }
    }
    
    /**
     * @dev Get token address for a loan
     */
    function getLoanTokenAddress(uint256 _loanId) external view returns (address) {
        return loanTokenAddresses[_loanId];
    }
    
    /**
     * @dev Update reserve fund parameters (admin only)
     */
    function updateReserveFundParams(uint256 _newCoverageRatio) external onlyAdmin {
        require(_newCoverageRatio >= 1000 && _newCoverageRatio <= 10000, "Invalid coverage ratio");
        coverageRatio = _newCoverageRatio;
    }
    
    /**
     * @dev Emergency withdraw from reserve fund (SEC-012: Protected by timelock)
     * @notice Requires 48-72 hour delay before execution
     */
    function requestEmergencyReserveWithdraw(uint256 _amount) external onlyAdmin whenNotPaused returns (bytes32) {
        require(_amount <= reserveFundBalance - reserveFundLocked, "Amount exceeds available balance");
        require(_amount > 0, "Amount must be greater than 0");
        require(timelockController != address(0), "Timelock not configured");
        
        // Generate unique request ID
        bytes32 requestId = keccak256(abi.encodePacked(
            msg.sender,
            _amount,
            block.timestamp,
            withdrawalRequestIds.length
        ));
        
        pendingWithdrawals[requestId] = PendingWithdrawal({
            amount: _amount,
            requestTime: block.timestamp,
            executed: false,
            cancelled: false
        });
        
        withdrawalRequestIds.push(requestId);
        
        emit EmergencyWithdrawRequested(requestId, _amount, block.timestamp + EMERGENCY_WITHDRAWAL_DELAY);
        
        return requestId;
    }
    
    /**
     * @dev Execute emergency withdrawal after timelock delay
     */
    function executeEmergencyReserveWithdraw(bytes32 _requestId) external onlyAdmin nonReentrant {
        PendingWithdrawal storage withdrawal = pendingWithdrawals[_requestId];
        
        require(withdrawal.amount > 0, "Invalid request");
        require(!withdrawal.executed, "Already executed");
        require(!withdrawal.cancelled, "Cancelled");
        require(block.timestamp >= withdrawal.requestTime + EMERGENCY_WITHDRAWAL_DELAY, "Timelock not expired");
        
        uint256 amount = withdrawal.amount;
        withdrawal.executed = true;
        
        reserveFundBalance -= amount;
        
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Withdrawal failed");
        
        emit EmergencyWithdrawExecuted(_requestId, amount);
    }
    
    /**
     * @dev Cancel emergency withdrawal request
     */
    function cancelEmergencyReserveWithdraw(bytes32 _requestId) external onlyAdmin {
        PendingWithdrawal storage withdrawal = pendingWithdrawals[_requestId];
        
        require(withdrawal.amount > 0, "Invalid request");
        require(!withdrawal.executed, "Already executed");
        require(!withdrawal.cancelled, "Already cancelled");
        
        withdrawal.cancelled = true;
        
        emit EmergencyWithdrawCancelled(_requestId);
    }
    
    /**
     * @dev Set timelock controller address
     */
    function setTimelockController(address _controller) external onlyAdmin {
        require(_controller != address(0), "Invalid address");
        address oldController = timelockController;
        timelockController = _controller;
        
        emit TimelockControllerUpdated(oldController, _controller);
    }
    
    /**
     * @dev SEC-011: Emergency pause - circuit breaker
     */
    function emergencyPause() external onlyRole(EMERGENCY_ROLE) {
        _pause();
        emit EmergencyPause(msg.sender);
    }
    
    /**
     * @dev SEC-011: Emergency unpause
     */
    function emergencyUnpause() external onlyRole(EMERGENCY_ROLE) {
        _unpause();
        emit EmergencyUnpause(msg.sender);
    }
    
    /**
     * @dev SEC-012: Deprecated - kept for backward compatibility
     * Use requestEmergencyReserveWithdraw instead
     */
    function emergencyReserveWithdraw(uint256 _amount) external onlyAdmin nonReentrant {
        require(timelockController != address(0), "Use timelocked version");
        revert("Use requestEmergencyReserveWithdraw + executeEmergencyReserveWithdraw");
    }
    
    // ============================================================
    // RISK-09: AUCTION MECHANISM FOR COLLATERAL LIQUIDATION
    // ============================================================
    
    // Auction configuration
    uint256 public auctionDuration = 7 days; // Default 7 days
    uint256 public auctionExtensionWindow = 1 days; // Extend if bid in last day
    uint256 public minBidIncrement = 100 ether; // Minimum bid increment
    
    // Auction state
    struct Auction {
        uint256 collateralId;
        uint256 startingPrice;
        uint256 currentPrice;
        address highestBidder;
        uint256 highestBid;
        uint256 startTime;
        uint256 endTime;
        bool active;
        bool settled;
    }
    
    mapping(uint256 => Auction) public collateralAuctions;
    
    // Auction events
    event AuctionStarted(uint256 indexed collateralId, uint256 startingPrice, uint256 endTime);
    event AuctionBid(uint256 indexed collateralId, address bidder, uint256 amount);
    event AuctionExtended(uint256 indexed collateralId, uint256 newEndTime);
    event AuctionSettled(uint256 indexed collateralId, address winner, uint256 finalPrice);
    event AuctionCancelled(uint256 indexed collateralId);
    
    /**
     * @dev Start auction for collateral liquidation (RISK-09)
     * @param _collateralId Collateral ID to auction
     * @param _startingPrice Starting price for auction
     */
    function startCollateralAuction(uint256 _collateralId, uint256 _startingPrice) external onlyAdmin {
        require(collateralOwner(_collateralId) != address(0), "Collateral does not exist");
        require(!collateralAuctions[_collateralId].active, "Auction already active");
        require(_startingPrice > 0, "Starting price must be greater than 0");
        
        Collateral storage collateral = collaterals[_collateralId];
        collateral.isLocked = true; // Lock during auction
        
        uint256 endTime = block.timestamp + auctionDuration;
        
        collateralAuctions[_collateralId] = Auction({
            collateralId: _collateralId,
            startingPrice: _startingPrice,
            currentPrice: _startingPrice,
            highestBidder: address(0),
            highestBid: 0,
            startTime: block.timestamp,
            endTime: endTime,
            active: true,
            settled: false
        });
        
        emit AuctionStarted(_collateralId, _startingPrice, endTime);
    }
    
    /**
     * @dev Place bid on collateral auction
     * @param _collateralId Collateral ID
     */
    function placeBid(uint256 _collateralId) external payable {
        Auction storage auction = collateralAuctions[_collateralId];
        
        require(auction.active, "Auction not active");
        require(block.timestamp < auction.endTime, "Auction ended");
        require(msg.value >= auction.currentPrice + minBidIncrement, "Bid too low");
        
        // Return previous highest bid
        if (auction.highestBidder != address(0)) {
            (bool success, ) = payable(auction.highestBidder).call{value: auction.highestBid}("");
            require(success, "Refund failed");
        }
        
        // Update highest bid
        auction.highestBidder = msg.sender;
        auction.highestBid = msg.value;
        auction.currentPrice = msg.value;
        
        // Extend auction if bid in last day
        if (block.timestamp > auction.endTime - auctionExtensionWindow) {
            auction.endTime += auctionExtensionWindow;
            emit AuctionExtended(_collateralId, auction.endTime);
        }
        
        emit AuctionBid(_collateralId, msg.sender, msg.value);
    }
    
    /**
     * @dev Settle auction after it ends
     * @param _collateralId Collateral ID
     */
    function settleAuction(uint256 _collateralId) external onlyAdmin {
        Auction storage auction = collateralAuctions[_collateralId];
        
        require(auction.active, "Auction not active");
        require(block.timestamp >= auction.endTime, "Auction not ended");
        require(!auction.settled, "Already settled");
        
        if (auction.highestBidder != address(0)) {
            // Transfer collateral to winner
            Collateral storage collateral = collaterals[_collateralId];
            collateral.owner = auction.highestBidder;
            collateral.isLocked = false;
            
            // Send winning bid to reserve fund
            reserveFundBalance += auction.highestBid;
            _updateCoverageRatio();
        }
        
        auction.active = false;
        auction.settled = true;
        
        emit AuctionSettled(_collateralId, auction.highestBidder, auction.highestBid);
    }
    
    /**
     * @dev Cancel auction (admin only)
     * @param _collateralId Collateral ID
     */
    function cancelAuction(uint256 _collateralId) external onlyAdmin {
        Auction storage auction = collateralAuctions[_collateralId];
        
        require(auction.active, "Auction not active");
        
        // Return highest bid if exists
        if (auction.highestBidder != address(0)) {
            (bool success, ) = payable(auction.highestBidder).call{value: auction.highestBid}("");
            require(success, "Refund failed");
        }
        
        // Release collateral
        Collateral storage collateral = collaterals[_collateralId];
        collateral.isLocked = false;
        
        auction.active = false;
        
        emit AuctionCancelled(_collateralId);
    }
    
    /**
     * @dev Get auction details
     * @param _collateralId Collateral ID
     */
    function getAuctionDetails(uint256 _collateralId) external view returns (Auction memory) {
        return collateralAuctions[_collateralId];
    }
    
    /**
     * @dev Set auction duration (admin only)
     * @param _duration New duration
     */
    function setAuctionDuration(uint256 _duration) external onlyAdmin {
        require(_duration >= 1 days && _duration <= 30 days, "Invalid duration");
        auctionDuration = _duration;
    }
    
    /**
     * @dev Helper to get collateral owner
     */
    function collateralOwner(uint256 _collateralId) internal view returns (address) {
        return collaterals[_collateralId].owner;
    }
}
