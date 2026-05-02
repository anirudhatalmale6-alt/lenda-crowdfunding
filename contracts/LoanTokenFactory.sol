// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title LoanTokenFactory
 * @dev Factory contract for creating LoanToken instances
 * 
 * This factory creates new LoanToken contracts for each loan,
 * enabling fractional ownership of loans.
 * 
 * FIN-05: Implements fractional token issuance on loan funding
 * FIN-06: Implements AMM-based price discovery mechanism
 */
contract LoanTokenFactory is AccessControl, ReentrancyGuard {
    // Roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PLATFORM_ROLE = keccak256("PLATFORM_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    // FIN-06: Price discovery configuration
    uint256 public constant PRICE_FEED_DECIMALS = 8;  // Oracle price decimals
    uint256 public constant MIN_PRICE = 1e8;          // Minimum price (0.00000001)
    uint256 public constant MAX_PRICE = 1e26;         // Maximum price
    uint256 public priceUpdateInterval = 1 hours;      // Price update interval
    
    // Struct for loan token info
    struct LoanTokenInfo {
        uint256 loanId;
        address tokenAddress;
        address borrower;
        uint256 loanAmount;
        uint256 totalRepayment;
        uint256 tokenSupply;
        uint256 tokenPrice;        // Current price in WAD
        uint256 lastPriceUpdate;
        uint256 interestRate;
        uint256 durationMonths;
        string riskRating;
        bool isActive;
        uint256 createdAt;
    }
    
    // FIN-06: AMM Pool state for price discovery
    struct AMMPool {
        uint256 loanId;
        uint256 tokenBalance;      // Loan token balance
        uint256 ethBalance;        // ETH/quote balance
        uint256 lastTradeTime;
        uint256 tradeVolume;      // Total volume traded
        bool isInitialized;
    }
    
    // State variables
    uint256 public tokenCounter;
    address public loanTokenImplementation;
    address public priceOracle;    // Price oracle address for external price feed
    
    // Mappings
    mapping(uint256 => address) public loanIdToToken;
    mapping(address => uint256) public tokenToLoanId;
    mapping(uint256 => LoanTokenInfo) public tokenInfos;
    mapping(uint256 => AMMPool) public ammPools;  // FIN-06: AMM pools for price discovery
    
    // Events
    event LoanTokenCreated(
        uint256 indexed loanId,
        address indexed tokenAddress,
        uint256 tokenSupply,
        uint256 tokenPrice
    );
    event TokenStatusUpdated(uint256 indexed loanId, bool isActive);
    event PriceUpdated(uint256 indexed loanId, uint256 newPrice, uint256 oldPrice);
    event AMMPoolCreated(uint256 indexed loanId, uint256 initialEth);
    event TokenTraded(uint256 indexed loanId, address trader, uint256 tokenAmount, uint256 ethAmount, bool isBuy);
    
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
        tokenCounter = 0;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(PLATFORM_ROLE, msg.sender);
    }
    
    /**
     * @dev FIN-06: Set price oracle address
     */
    function setPriceOracle(address _oracle) external onlyAdmin {
        require(_oracle != address(0), "Invalid oracle address");
        priceOracle = _oracle;
    }
    
    /**
     * @dev FIN-06: Update price based on oracle or AMM
     */
    function updateTokenPrice(uint256 _loanId) external {
        address tokenAddress = loanIdToToken[_loanId];
        require(tokenAddress != address(0), "Token not found");
        
        LoanTokenInfo memory info = tokenInfos[_loanId];
        uint256 oldPrice = info.tokenPrice;
        
        // Try oracle price first, fallback to AMM
        uint256 newPrice;
        if (priceOracle != address(0)) {
            newPrice = _getOraclePrice(_loanId);
        }
        
        // Fallback to AMM price if oracle unavailable or as adjustment
        if (newPrice == 0 || newPrice < MIN_PRICE || newPrice > MAX_PRICE) {
            newPrice = _getAMMPrice(_loanId);
        }
        
        // Use default price if both fail
        if (newPrice == 0 || newPrice < MIN_PRICE) {
            newPrice = info.tokenPrice; // Keep previous price
        }
        
        if (newPrice != oldPrice) {
            tokenInfos[_loanId].tokenPrice = newPrice;
            tokenInfos[_loanId].lastPriceUpdate = block.timestamp;
            emit PriceUpdated(_loanId, newPrice, oldPrice);
        }
    }
    
    /**
     * @dev FIN-06: Get price from oracle
     */
    function _getOraclePrice(uint256 _loanId) internal view returns (uint256) {
        if (priceOracle == address(0)) return 0;
        
        // Simplified oracle call - in production, use Chainlink or similar
        // This assumes oracle implements a getPrice(uint256 loanId) view
        (bool success, bytes memory data) = priceOracle.staticcall(
            abi.encodeWithSignature("getPrice(uint256)", _loanId)
        );
        
        if (success && data.length == 32) {
            return abi.decode(data, (uint256));
        }
        return 0;
    }
    
    /**
     * @dev FIN-06: Calculate price from AMM pool (Constant Product: x * y = k)
     */
    function _getAMMPrice(uint256 _loanId) internal view returns (uint256) {
        AMMPool storage pool = ammPools[_loanId];
        
        if (!pool.isInitialized || pool.tokenBalance == 0 || pool.ethBalance == 0) {
            return 0;
        }
        
        // Price = ethBalance / tokenBalance (in WAD)
        uint256 price = (pool.ethBalance * 1e18) / pool.tokenBalance;
        return price;
    }
    
    /**
     * @dev FIN-06: Initialize AMM pool for a loan token
     */
    function initializeAMMPool(uint256 _loanId) external payable onlyPlatform {
        require(loanIdToToken[_loanId] != address(0), "Token not found");
        require(!ammPools[_loanId].isInitialized, "Pool already initialized");
        require(msg.value > 0, "Initial ETH required");
        
        LoanTokenInfo memory info = tokenInfos[_loanId];
        
        // Mint initial tokens to pool (10% of supply)
        uint256 initialTokens = info.tokenSupply / 10;
        
        ammPools[_loanId] = AMMPool({
            loanId: _loanId,
            tokenBalance: initialTokens,
            ethBalance: msg.value,
            lastTradeTime: block.timestamp,
            tradeVolume: 0,
            isInitialized: true
        });
        
        emit AMMPoolCreated(_loanId, msg.value);
    }
    
    /**
     * @dev FIN-06: Trade tokens on AMM (buy tokens with ETH)
     */
    function buyTokens(uint256 _loanId) external payable nonReentrant {
        AMMPool storage pool = ammPools[_loanId];
        require(pool.isInitialized, "Pool not initialized");
        require(msg.value > 0, "Must send ETH");
        
        // Calculate tokens to receive using AMM formula
        uint256 tokensOut = _getAmountOut(msg.value, pool.ethBalance, pool.tokenBalance);
        
        require(tokensOut > 0, "Insufficient output");
        require(tokensOut <= pool.tokenBalance, "Insufficient liquidity");
        
        // Update pool balances
        pool.ethBalance += msg.value;
        pool.tokenBalance -= tokensOut;
        pool.lastTradeTime = block.timestamp;
        pool.tradeVolume += msg.value;
        
        // Transfer tokens to buyer
        LoanToken loanToken = LoanToken(loanIdToToken[_loanId]);
        loanToken.transfer(msg.sender, tokensOut);
        
        emit TokenTraded(_loanId, msg.sender, tokensOut, msg.value, true);
    }
    
    /**
     * @dev FIN-06: Trade tokens on AMM (sell tokens for ETH)
     */
    function sellTokens(uint256 _loanId, uint256 _tokenAmount) external nonReentrant {
        AMMPool storage pool = ammPools[_loanId];
        require(pool.isInitialized, "Pool not initialized");
        require(_tokenAmount > 0, "Invalid amount");
        
        // Calculate ETH to receive using AMM formula
        uint256 ethOut = _getAmountOut(_tokenAmount, pool.tokenBalance, pool.ethBalance);
        
        require(ethOut > 0, "Insufficient output");
        require(ethOut <= pool.ethBalance, "Insufficient liquidity");
        
        // Transfer tokens from seller first (reentrancy protection)
        LoanToken loanToken = LoanToken(loanIdToToken[_loanId]);
        require(loanToken.transferFrom(msg.sender, address(this), _tokenAmount), "Transfer failed");
        
        // Update pool balances
        pool.tokenBalance += _tokenAmount;
        pool.ethBalance -= ethOut;
        pool.lastTradeTime = block.timestamp;
        pool.tradeVolume += ethOut;
        
        // Transfer ETH to seller
        (bool success, ) = payable(msg.sender).call{value: ethOut}("");
        require(success, "Transfer failed");
        
        emit TokenTraded(_loanId, msg.sender, _tokenAmount, ethOut, false);
    }
    
    /**
     * @dev FIN-06: Calculate output amount using AMM constant product formula
     */
    function _getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) internal pure returns (uint256) {
        require(amountIn > 0 && reserveIn > 0 && reserveOut > 0, "Invalid reserves");
        
        // amountOut = (amountIn * reserveOut * 997) / (reserveIn * 1000 + amountIn * 997)
        // 0.3% fee included
        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn * 1000 + amountInWithFee;
        
        return numerator / denominator;
    }
    
    /**
     * @dev Get current token price with fallback
     */
    function getTokenPrice(uint256 _loanId) external view returns (uint256) {
        LoanTokenInfo memory info = tokenInfos[_loanId];
        
        // Try AMM price first
        uint256 ammPrice = _getAMMPrice(_loanId);
        if (ammPrice > 0) {
            return ammPrice;
        }
        
        // Fallback to stored price
        return info.tokenPrice;
    }
    
    /**
     * @dev Get AMM pool state
     */
    function getAMMPoolState(uint256 _loanId) external view returns (
        uint256 tokenBalance,
        uint256 ethBalance,
        uint256 tradeVolume,
        bool isInitialized
    ) {
        AMMPool memory pool = ammPools[_loanId];
        return (pool.tokenBalance, pool.ethBalance, pool.tradeVolume, pool.isInitialized);
    }

    /**
     * @dev Create a new loan token
     * 
     * @param _loanId The ID of the loan
     * @param _borrower The borrower's address
     * @param _loanAmount The original loan amount
     * @param _interestRate The annual interest rate (in basis points)
     * @param _durationMonths The loan duration in months
     * @param _platform The platform address
     */
    function createLoanToken(
        uint256 _loanId,
        address _borrower,
        uint256 _loanAmount,
        uint256 _interestRate,
        uint256 _durationMonths,
        address _platform
    ) external onlyPlatform nonReentrant returns (address) {
        require(loanIdToToken[_loanId] == address(0), "Token already exists");
        require(_borrower != address(0), "Invalid borrower");
        require(_loanAmount > 0, "Invalid loan amount");
        
        // Calculate total repayment with interest
        uint256 totalRepayment = _calculateTotalRepayment(
            _loanAmount,
            _interestRate,
            _durationMonths
        );
        
        // Token supply equals total repayment (1 token = $1 of repayment rights)
        uint256 tokenSupply = totalRepayment;
        
        // Token price starts at 1:1 with loan amount (face value)
        uint256 tokenPrice = (_loanAmount * 1e18) / tokenSupply;
        
        // Generate token name and symbol
        string memory tokenName = string(abi.encodePacked("LENDA Loan ", Strings.toString(_loanId)));
        string memory tokenSymbol = string(abi.encodePacked("LN", Strings.toString(_loanId)));
        
        // Deploy new LoanToken (in production, use CREATE2 for deterministic addresses)
        LoanToken newToken = new LoanToken(
            tokenName,
            tokenSymbol,
            _loanId,
            _borrower,
            totalRepayment,
            _interestRate,
            _durationMonths,
            _platform
        );
        
        address tokenAddress = address(newToken);
        
        // Update mappings
        tokenCounter++;
        loanIdToToken[_loanId] = tokenAddress;
        tokenToLoanId[tokenAddress] = _loanId;
        
        // Store token info
        tokenInfos[tokenCounter] = LoanTokenInfo({
            loanId: _loanId,
            tokenAddress: tokenAddress,
            borrower: _borrower,
            loanAmount: _loanAmount,
            totalRepayment: totalRepayment,
            tokenSupply: tokenSupply,
            tokenPrice: tokenPrice,
            interestRate: _interestRate,
            durationMonths: _durationMonths,
            riskRating: "BBB", // Default rating
            isActive: true,
            createdAt: block.timestamp
        });
        
        emit LoanTokenCreated(_loanId, tokenAddress, tokenSupply, tokenPrice);
        
        return tokenAddress;
    }

    /**
     * @dev Calculate total repayment with interest
     */
    function _calculateTotalRepayment(
        uint256 _principal,
        uint256 _annualRateBps,
        uint256 _months
    ) internal pure returns (uint256) {
        if (_annualRateBps == 0) {
            return _principal;
        }
        
        // Simple interest calculation
        // Total = Principal * (1 + rate * years)
        uint256 yearlyInterest = (_principal * _annualRateBps) / 10000;
        uint256 totalInterest = (yearlyInterest * _months) / 12;
        
        return _principal + totalInterest;
    }

    /**
     * @dev Get token address for a loan
     */
    function getTokenAddress(uint256 _loanId) external view returns (address) {
        return loanIdToToken[_loanId];
    }

    /**
     * @dev Get loan token info
     */
    function getTokenInfo(uint256 _tokenId) external view returns (LoanTokenInfo memory) {
        return tokenInfos[_tokenId];
    }

    /**
     * @dev Get loan token info by loan ID
     */
    function getTokenInfoByLoan(uint256 _loanId) external view returns (LoanTokenInfo memory) {
        address tokenAddress = loanIdToToken[_loanId];
        require(tokenAddress != address(0), "Token not found");
        
        for (uint256 i = 1; i <= tokenCounter; i++) {
            if (tokenInfos[i].tokenAddress == tokenAddress) {
                return tokenInfos[i];
            }
        }
        revert("Token info not found");
    }

    /**
     * @dev Update token status (active/inactive)
     */
    function updateTokenStatus(uint256 _loanId, bool _isActive) external onlyPlatform {
        address tokenAddress = loanIdToToken[_loanId];
        require(tokenAddress != address(0), "Token not found");
        
        for (uint256 i = 1; i <= tokenCounter; i++) {
            if (tokenInfos[i].loanId == _loanId) {
                tokenInfos[i].isActive = _isActive;
                emit TokenStatusUpdated(_loanId, _isActive);
                break;
            }
        }
    }

    /**
     * @dev Update risk rating
     */
    function updateRiskRating(uint256 _loanId, string calldata _rating) external onlyAdmin {
        for (uint256 i = 1; i <= tokenCounter; i++) {
            if (tokenInfos[i].loanId == _loanId) {
                tokenInfos[i].riskRating = _rating;
                break;
            }
        }
    }

    /**
     * @dev Get all active loan tokens
     */
    function getActiveTokens() external view returns (LoanTokenInfo[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 1; i <= tokenCounter; i++) {
            if (tokenInfos[i].isActive) {
                activeCount++;
            }
        }
        
        LoanTokenInfo[] memory activeTokens = new LoanTokenInfo[](activeCount);
        uint256 index = 0;
        for (uint256 i = 1; i <= tokenCounter; i++) {
            if (tokenInfos[i].isActive) {
                activeTokens[index] = tokenInfos[i];
                index++;
            }
        }
        
        return activeTokens;
    }

    /**
     * @dev Calculate current token price based on loan status
     */
    function calculateTokenPrice(uint256 _loanId) external view returns (uint256) {
        address tokenAddress = loanIdToToken[_loanId];
        require(tokenAddress != address(0), "Token not found");
        
        for (uint256 i = 1; i <= tokenCounter; i++) {
            if (tokenInfos[i].loanId == _loanId) {
                LoanTokenInfo memory info = tokenInfos[i];
                
                // In production, fetch actual paid repayment from LoanToken
                // Simplified: return face value
                return info.tokenPrice;
            }
        }
        return 0;
    }
}

// Simple String utility
library Strings {
    bytes16 private constant _HEX_SYMBOLS = "0123456789abcdef";

    function toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
