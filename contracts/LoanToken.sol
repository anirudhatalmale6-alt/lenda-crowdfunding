// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title LoanToken
 * @dev ERC-20 token representing fractional ownership of a loan
 * 
 * Each LoanToken represents a share of the loan's repayment rights.
 * Token holders receive proportional repayments as the borrower makes payments.
 */
contract LoanToken is ERC20, ERC20Burnable, AccessControl, ReentrancyGuard {
    // Roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PLATFORM_ROLE = keccak256("PLATFORM_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    // Struct for loan info
    struct LoanInfo {
        uint256 loanId;
        address borrower;
        uint256 totalRepayment;
        uint256 paidRepayment;
        uint256 interestRate;
        uint256 durationMonths;
        uint256 startTime;
        uint256 monthlyPayment;
        bool isActive;
        bool isDefaulted;
    }

    // State variables
    uint256 public loanId;
    address public platform;
    LoanInfo public loanInfo;
    
    // FIN-05: Track actual ETH received for token minting
    uint256 public totalEthReceived;
    uint256 public ethPriceFeed; // Price of ETH in USD (for conversion)
    uint256 public tokenPrice; // Price of 1 token in wei (e.g., 0.001 ETH = 1e15 wei)
    
    // Tracking for repayment distribution
    mapping(address => uint256) public pendingDistributions;
    uint256 public totalPendingDistribution;
    
    // Events
    event TokensIssued(address indexed to, uint256 amount);
    event TokensBurned(address indexed from, uint256 amount);
    event RepaymentReceived(uint256 amount);
    event DistributionClaimed(address indexed holder, uint256 amount);
    event LoanDefaulted();
    event LoanRepaid();
    event EthReceived(address indexed from, uint256 ethAmount, uint256 tokensMinted);
    event TokenPriceUpdated(uint256 newPrice);

    // Modifiers
    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "Not an admin");
        _;
    }

    modifier onlyPlatform() {
        require(hasRole(PLATFORM_ROLE, msg.sender), "Not platform");
        _;
    }

    /**
     * @dev Constructor
     */
    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _loanId,
        address _borrower,
        uint256 _totalRepayment,
        uint256 _interestRate,
        uint256 _durationMonths,
        address _platform,
        uint256 _tokenPrice // Price of 1 token in wei
    ) ERC20(_name, _symbol) {
        require(_platform != address(0), "Invalid platform address");
        require(_tokenPrice > 0, "Token price must be greater than 0");
        
        platform = _platform;
        loanId = _loanId;
        tokenPrice = _tokenPrice; // FIN-05: Initialize token price
        
        loanInfo = LoanInfo({
            loanId: _loanId,
            borrower: _borrower,
            totalRepayment: _totalRepayment,
            paidRepayment: 0,
            interestRate: _interestRate,
            durationMonths: _durationMonths,
            startTime: block.timestamp,
            monthlyPayment: _totalRepayment / _durationMonths,
            isActive: true,
            isDefaulted: false
        });

        _grantRole(DEFAULT_ADMIN_ROLE, _platform);
        _grantRole(ADMIN_ROLE, _platform);
        _grantRole(PLATFORM_ROLE, _platform);
    }

    /**
     * @dev Mint tokens (only platform can mint)
     */
    function mint(address _to, uint256 _amount) external onlyPlatform nonReentrant returns (bool) {
        require(loanInfo.isActive, "Loan is not active");
        _mint(_to, _amount);
        emit TokensIssued(_to, _amount);
        return true;
    }
    
    /**
     * @dev FIN-05: Fund loan with ETH and receive tokens proportionally
     * @notice This function links token minting to actual ETH received
     * The amount of tokens minted is proportional to the ETH received divided by token price
     */
    function fundWithEth() external payable nonReentrant returns (uint256) {
        require(loanInfo.isActive, "Loan is not active");
        require(msg.value > 0, "Must send ETH to fund");
        require(tokenPrice > 0, "Token price not set");
        
        // Calculate tokens to mint based on actual ETH received
        uint256 tokensToMint = (msg.value * 1e18) / tokenPrice;
        require(tokensToMint > 0, "Amount too small for token conversion");
        
        // Track actual ETH received
        totalEthReceived += msg.value;
        
        // Mint tokens to sender
        _mint(msg.sender, tokensToMint);
        
        // Emit event with both ETH amount and tokens minted for verification
        emit EthReceived(msg.sender, msg.value, tokensToMint);
        emit TokensIssued(msg.sender, tokensToMint);
        
        return tokensToMint;
    }
    
    /**
     * @dev Set token price (admin only)
     * @notice FIN-05: Allows updating token price for future investments
     */
    function setTokenPrice(uint256 _newPrice) external onlyAdmin returns (bool) {
        require(_newPrice > 0, "Token price must be greater than 0");
        tokenPrice = _newPrice;
        emit TokenPriceUpdated(_newPrice);
        return true;
    }

    /**
     * @dev Burn tokens (only token holder or platform can burn)
     */
    function burn(uint256 _amount) public override onlyPlatform nonReentrant returns (bool) {
        require(balanceOf(msg.sender) >= _amount, "Insufficient balance");
        _burn(msg.sender, _amount);
        emit TokensBurned(msg.sender, _amount);
        return true;
    }

    /**
     * @dev Force burn from address (for liquidation scenarios)
     */
    function forceBurn(address _from, uint256 _amount) external onlyPlatform nonReentrant returns (bool) {
        require(balanceOf(_from) >= _amount, "Insufficient balance");
        _burn(_from, _amount);
        emit TokensBurned(_from, _amount);
        return true;
    }

    /**
     * @dev Receive repayment from borrower
     * This function is called by the platform when borrower makes a payment
     */
    function receiveRepayment() external payable onlyPlatform nonReentrant {
        require(loanInfo.isActive, "Loan is not active");
        require(msg.value > 0, "Invalid payment amount");
        
        loanInfo.paidRepayment += msg.value;
        
        // Calculate pending distribution for each token holder
        if (totalSupply() > 0) {
            uint256 perToken = msg.value * 1e18 / totalSupply();
            totalPendingDistribution += perToken * totalSupply() / 1e18;
            
            // This is a simplified distribution model
            // In production, you'd track per-holder pending amounts
        }
        
        emit RepaymentReceived(msg.value);
        
        // Check if loan is fully repaid
        if (loanInfo.paidRepayment >= loanInfo.totalRepayment) {
            loanInfo.isActive = false;
            emit LoanRepaid();
        }
    }

    /**
     * @dev Claim pending distribution
     */
    function claimDistribution() external nonReentrant returns (uint256) {
        require(balanceOf(msg.sender) > 0, "No token balance");
        
        // Simplified claim logic - in production, track per-holder pending
        uint256 claimAmount = pendingDistributions[msg.sender];
        require(claimAmount > 0, "No pending distribution");
        
        pendingDistributions[msg.sender] = 0;
        totalPendingDistribution -= claimAmount;
        
        payable(msg.sender).transfer(claimAmount);
        emit DistributionClaimed(msg.sender, claimAmount);
        
        return claimAmount;
    }

    /**
     * @dev Mark loan as defaulted
     */
    function markDefaulted() external onlyPlatform {
        require(loanInfo.isActive, "Loan already inactive");
        loanInfo.isDefaulted = true;
        loanInfo.isActive = false;
        emit LoanDefaulted();
    }

    /**
     * @dev Get loan status
     */
    function getLoanStatus() external view returns (
        bool isActive,
        bool isDefaulted,
        uint256 totalRepayment,
        uint256 paidRepayment,
        uint256 remainingRepayment,
        uint256 monthlyPayment
    ) {
        return (
            loanInfo.isActive,
            loanInfo.isDefaulted,
            loanInfo.totalRepayment,
            loanInfo.paidRepayment,
            loanInfo.totalRepayment - loanInfo.paidRepayment,
            loanInfo.monthlyPayment
        );
    }

    /**
     * @dev Calculate repayment share for token holder
     */
    function getRepaymentShare(address _holder) external view returns (uint256) {
        if (totalSupply() == 0) return 0;
        uint256 share = (balanceOf(_holder) * loanInfo.paidRepayment) / totalSupply();
        return share;
    }

    // Required for receiving ETH
    receive() external payable {}
}
