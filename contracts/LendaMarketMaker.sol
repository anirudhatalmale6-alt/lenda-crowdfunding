// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title LendaMarketMaker
 * @dev Enhanced Market Maker for loan tokens with DCF pricing and risk management
 * 
 * Features:
 * - Discounted Cash Flow (DCF) pricing model
 * - Risk-adjusted pricing with risk categories
 * - Dynamic bid-ask spread model
 * - Price stabilization logic
 * - Recovery token support for defaulted loans
 * - Comprehensive risk management
 */
contract LendaMarketMaker is AccessControl, ReentrancyGuard {
    // Roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant RISK_MANAGER_ROLE = keccak256("RISK_MANAGER_ROLE");

    // Risk Categories
    enum RiskCategory { AAA, AA, A, BBB, BB, B, CCC, D }
    
    // Token Status
    enum TokenStatus { ACTIVE, PAUSED, DEFAULTED, RECOVERY }

    // Structs
    struct Pool {
        uint256 id;
        string name;
        uint256 totalCapital;
        uint256 availableCapital;
        uint256 lockedCapital;
        uint256 targetTokenCount;
        uint256 baseSpreadBps;
        uint256 maxSlippageBps;
        uint256 minReserveRatio;
        bool isActive;
    }

    struct LoanTokenConfig {
        address tokenAddress;
        uint256 loanId;
        address borrower;
        RiskCategory riskCategory;
        uint256 totalRepayment;
        uint256 paidRepayment;
        uint256 remainingRepayment;
        uint256 monthlyPayment;
        uint256 remainingMonths;
        uint256 tokenSupply;
        TokenStatus status;
        uint256 fairPrice;
        uint256 lastPrice;
        uint256 priceUpdatedAt;
    }

    struct Position {
        address tokenAddress;
        uint256 tokenCount;
        uint256 avgBuyPrice;
        uint256 avgSellPrice;
        uint256 lastPrice;
        uint256 totalBought;
        uint256 totalSold;
        int256 realizedPnL;
        uint256 updatedAt;
    }

    struct Quote {
        uint256 buyPrice;
        uint256 sellPrice;
        uint256 buyQty;
        uint256 sellQty;
        uint256 spreadBps;
        uint256 fairPrice;
    }

    struct RiskLimits {
        uint256 maxExposurePerLoan;      // In basis points (500 = 5%)
        uint256 maxExposurePerBorrower;   // In basis points
        uint256 maxPositionSize;          // In wei
        uint256 minLiquidityRatio;        // In basis points
    }

    struct RecoveryToken {
        address tokenAddress;
        uint256 loanId;
        uint256 totalSupply;
        uint256 recoveryValue;
        uint256 pricePerToken;
        bool isActive;
    }

    // State variables
    uint256 public poolCounter;
    mapping(uint256 => Pool) public pools;
    mapping(address => LoanTokenConfig) public loanTokens;
    mapping(address => Position) public positions;
    mapping(address => mapping(uint256 => Quote)) public quotes;
    mapping(address => uint256) public borrowerExposure;
    mapping(address => RecoveryToken) public recoveryTokens;
    
    // Risk parameters
    RiskLimits public riskLimits;
    mapping(RiskCategory => uint256) public riskCategoryLimits;
    mapping(RiskCategory => uint256) public riskPremiums;
    
    // Price history for stabilization
    struct PricePoint {
        uint256 price;
        uint256 timestamp;
    }
    mapping(address => PricePoint[]) public priceHistory;
    uint256 public constant PRICE_HISTORY_LIMIT = 100;
    uint256 public constant STABILIZATION_THRESHOLD = 300; // 3%
    uint256 public constant MAX_PRICE_MOVE = 500; // 5%

    // Events
    event PoolCreated(uint256 indexed poolId, string name);
    event PoolFunded(uint256 indexed poolId, uint256 amount);
    event PoolWithdrawn(uint256 indexed poolId, uint256 amount);
    event LoanTokenRegistered(address indexed token, uint256 loanId, RiskCategory risk);
    event TokenStatusChanged(address indexed token, TokenStatus status);
    event PositionOpened(address indexed token, uint256 tokenCount, uint256 avgPrice);
    event PositionClosed(address indexed token, uint256 tokenCount, int256 pnl);
    event TradeExecuted(
        address indexed token,
        address indexed counterparty,
        bool isBuy,
        uint256 tokenCount,
        uint256 price,
        uint256 totalValue
    );
    event QuoteUpdated(address indexed token, uint256 buyPrice, uint256 sellPrice, uint256 fairPrice);
    event PriceStabilized(address indexed token, uint256 oldPrice, uint256 newPrice);
    event RiskAlert(address indexed token, string reason, uint256 value);
    event RecoveryTokenCreated(address indexed token, uint256 loanId, uint256 totalSupply);
    event DefaultHandled(uint256 indexed loanId, uint256 recoveryValue);

    // Modifiers
    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "Not an admin");
        _;
    }

    modifier onlyOperator() {
        require(hasRole(OPERATOR_ROLE, msg.sender) || hasRole(ADMIN_ROLE, msg.sender), "Not authorized");
        _;
    }

    modifier onlyRiskManager() {
        require(hasRole(RISK_MANAGER_ROLE, msg.sender) || hasRole(ADMIN_ROLE, msg.sender), "Not risk manager");
        _;
    }

    constructor() {
        poolCounter = 0;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
        _grantRole(RISK_MANAGER_ROLE, msg.sender);
        
        // Initialize default risk limits
        riskLimits = RiskLimits({
            maxExposurePerLoan: 500,        // 5%
            maxExposurePerBorrower: 1000,    // 10%
            maxPositionSize: 10000 ether,
            minLiquidityRatio: 1500          // 15%
        });
        
        // Initialize risk premiums (in basis points)
        riskPremiums[RiskCategory.AAA] = 200;   // 2%
        riskPremiums[RiskCategory.AA] = 400;    // 4%
        riskPremiums[RiskCategory.A] = 600;     // 6%
        riskPremiums[RiskCategory.BBB] = 800;    // 8%
        riskPremiums[RiskCategory.BB] = 1200;    // 12%
        riskPremiums[RiskCategory.B] = 1800;    // 18%
        riskPremiums[RiskCategory.CCC] = 2500;  // 25%
        riskPremiums[RiskCategory.D] = 4000;     // 40%
        
        // Initialize risk category limits
        riskCategoryLimits[RiskCategory.AAA] = 3000; // 30%
        riskCategoryLimits[RiskCategory.AA] = 2500;  // 25%
        riskCategoryLimits[RiskCategory.A] = 2000;   // 20%
        riskCategoryLimits[RiskCategory.BBB] = 1500; // 15%
        riskCategoryLimits[RiskCategory.BB] = 1000;  // 10%
        riskCategoryLimits[RiskCategory.B] = 500;     // 5%
        riskCategoryLimits[RiskCategory.CCC] = 200;   // 2%
        riskCategoryLimits[RiskCategory.D] = 0;
    }

    /**
     * @dev Create a market maker pool
     */
    function createPool(string memory _name) external onlyAdmin returns (uint256) {
        poolCounter++;
        
        pools[poolCounter] = Pool({
            id: poolCounter,
            name: _name,
            totalCapital: 0,
            availableCapital: 0,
            lockedCapital: 0,
            targetTokenCount: 0,
            baseSpreadBps: 100, // 1%
            maxSlippageBps: 200,
            minReserveRatio: 1500,
            isActive: true
        });
        
        emit PoolCreated(poolCounter, _name);
        return poolCounter;
    }

    /**
     * @dev Fund a pool with capital
     */
    function fundPool(uint256 _poolId) external payable onlyAdmin nonReentrant {
        require(_poolId > 0 && _poolId <= poolCounter, "Invalid pool");
        require(msg.value > 0, "Invalid amount");
        
        Pool storage pool = pools[_poolId];
        require(pool.isActive, "Pool not active");
        
        pool.totalCapital += msg.value;
        pool.availableCapital += msg.value;
        
        emit PoolFunded(_poolId, msg.value);
    }

    /**
     * @dev Register a loan token for market making
     */
    function registerLoanToken(
        address _tokenAddress,
        uint256 _loanId,
        address _borrower,
        RiskCategory _risk,
        uint256 _totalRepayment,
        uint256 _monthlyPayment,
        uint256 _remainingMonths,
        uint256 _tokenSupply
    ) external onlyOperator {
        require(_tokenAddress != address(0), "Invalid token");
        require(loanTokens[_tokenAddress].tokenAddress == address(0), "Already registered");
        
        loanTokens[_tokenAddress] = LoanTokenConfig({
            tokenAddress: _tokenAddress,
            loanId: _loanId,
            borrower: _borrower,
            riskCategory: _risk,
            totalRepayment: _totalRepayment,
            paidRepayment: 0,
            remainingRepayment: _totalRepayment,
            monthlyPayment: _monthlyPayment,
            remainingMonths: _remainingMonths,
            tokenSupply: _tokenSupply,
            status: TokenStatus.ACTIVE,
            fairPrice: 0,
            lastPrice: 0,
            priceUpdatedAt: block.timestamp
        });
        
        emit LoanTokenRegistered(_tokenAddress, _loanId, _risk);
    }

    /**
     * @dev Update loan token status (e.g., after default)
     */
    function updateTokenStatus(address _tokenAddress, TokenStatus _status) external onlyOperator {
        require(loanTokens[_tokenAddress].tokenAddress != address(0), "Not registered");
        loanTokens[_tokenAddress].status = _status;
        emit TokenStatusChanged(_tokenAddress, _status);
    }

    /**
     * @dev Calculate fair price using DCF model
     * 
     * Formula: PV = Sum(Payment_t / (1 + r)^t)
     * Where r = base_rate + risk_premium
     */
    function calculateFairPrice(address _tokenAddress) public view returns (uint256) {
        LoanTokenConfig storage config = loanTokens[_tokenAddress];
        require(config.tokenAddress != address(0), "Token not registered");
        
        // Base discount rate (5% + risk premium)
        uint256 baseRate = 500; // 5%
        uint256 riskPremium = riskPremiums[config.riskCategory];
        uint256 discountRate = baseRate + riskPremium;
        
        uint256 presentValue = 0;
        
        // Calculate PV of remaining payments
        for (uint256 t = 1; t <= config.remainingMonths; t++) {
            uint256 periodYears = t / 12;
            uint256 discountFactor = _pow(10000 + discountRate, periodYears);
            presentValue += (config.monthlyPayment * 10000) / discountFactor;
        }
        
        // Price per token = PV / total supply
        if (config.tokenSupply > 0) {
            return presentValue / config.tokenSupply;
        }
        return presentValue;
    }

    /**
     * @dev Calculate dynamic spread based on risk and market conditions
     */
    function calculateSpread(address _tokenAddress) public view returns (uint256) {
        LoanTokenConfig storage config = loanTokens[_tokenAddress];
        
        // Base spread from pool
        uint256 baseSpread = pools[1].baseSpreadBps;
        
        // Risk factor
        uint256 riskFactor = riskPremiums[config.riskCategory] / 2;
        
        // Volatility factor (based on recent price history)
        uint256 volatilityFactor = _calculateVolatilityFactor(_tokenAddress);
        
        // Total spread
        return baseSpread + riskFactor + volatilityFactor;
    }

    /**
     * @dev Calculate volatility factor from price history
     */
    function _calculateVolatilityFactor(address _tokenAddress) internal view returns (uint256) {
        PricePoint[] storage history = priceHistory[_tokenAddress];
        if (history.length < 2) return 0;
        
        // Simple volatility: check recent price moves
        uint256 recentPrice = history[history.length - 1].price;
        uint256 oldPrice = history[history.length - 2].price;
        
        if (oldPrice == 0) return 0;
        
        uint256 priceChange = recentPrice > oldPrice 
            ? recentPrice - oldPrice 
            : oldPrice - recentPrice;
        
        uint256 changeBps = (priceChange * 10000) / oldPrice;
        
        // Cap at 200 bps (2%)
        return changeBps > 200 ? 200 : changeBps;
    }

    /**
     * @dev Get quote for a token
     */
    function getQuote(address _tokenAddress, uint256 _tokenCount) external view returns (Quote memory) {
        LoanTokenConfig storage config = loanTokens[_tokenAddress];
        require(config.tokenAddress != address(0), "Token not registered");
        require(config.status == TokenStatus.ACTIVE, "Token not active");
        
        uint256 fairPrice = calculateFairPrice(_tokenAddress);
        uint256 spread = calculateSpread(_tokenAddress);
        
        uint256 halfSpread = spread / 2;
        uint256 buyPrice = (fairPrice * (10000 - halfSpread)) / 10000;
        uint256 sellPrice = (fairPrice * (10000 + halfSpread)) / 10000;
        
        // Calculate max quantities based on pool liquidity
        Pool storage pool = pools[1];
        uint256 maxBuy = pool.availableCapital / buyPrice;
        uint256 maxSell = positions[_tokenAddress].tokenCount;
        
        return Quote({
            buyPrice: buyPrice,
            sellPrice: sellPrice,
            buyQty: maxBuy > riskLimits.maxPositionSize ? riskLimits.maxPositionSize : maxBuy,
            sellQty: maxSell > riskLimits.maxPositionSize ? riskLimits.maxPositionSize : maxSell,
            spreadBps: spread,
            fairPrice: fairPrice
        });
    }

    /**
     * @dev Execute buy from market maker
     */
    function buy(address _tokenAddress, uint256 _tokenCount) external nonReentrant returns (uint256) {
        require(_tokenCount > 0, "Invalid amount");
        
        LoanTokenConfig storage config = loanTokens[_tokenAddress];
        require(config.tokenAddress != address(0), "Token not registered");
        require(config.status == TokenStatus.ACTIVE, "Token not active");
        
        Position storage pos = positions[_tokenAddress];
        Pool storage pool = pools[1];
        
        // Get quote
        Quote memory quote = _getQuoteInternal(_tokenAddress, _tokenCount);
        
        // Check risk limits
        _checkRiskLimits(_tokenAddress, _tokenCount, quote.buyPrice, true);
        
        uint256 totalValue = _tokenCount * quote.buyPrice;
        require(totalValue <= pool.availableCapital, "Insufficient liquidity");
        
        // Execute trade
        IERC20 token = IERC20(_tokenAddress);
        require(token.transferFrom(msg.sender, address(this), _tokenCount), "Token transfer failed");
        
        // Update position
        pos.tokenCount += _tokenCount;
        pos.totalBought += _tokenCount;
        
        if (pos.avgBuyPrice == 0) {
            pos.avgBuyPrice = quote.buyPrice;
        } else {
            pos.avgBuyPrice = (pos.avgBuyPrice * (pos.tokenCount - _tokenCount) + quote.buyPrice * _tokenCount) / pos.tokenCount;
        }
        
        pos.lastPrice = quote.buyPrice;
        pos.updatedAt = block.timestamp;
        
        // Update pool
        pool.availableCapital -= totalValue;
        pool.lockedCapital += totalValue;
        
        // Update price history
        _updatePriceHistory(_tokenAddress, quote.buyPrice);
        
        // Update loan token config
        config.lastPrice = quote.buyPrice;
        config.priceUpdatedAt = block.timestamp;
        
        emit TradeExecuted(_tokenAddress, msg.sender, true, _tokenCount, quote.buyPrice, totalValue);
        
        // Refund excess payment
        uint256 refund = msg.value - totalValue;
        if (refund > 0) {
            payable(msg.sender).transfer(refund);
        }
        
        return totalValue;
    }

    /**
     * @dev Sell to market maker
     */
    function sell(address _tokenAddress, uint256 _tokenCount) external nonReentrant returns (uint256) {
        require(_tokenCount > 0, "Invalid amount");
        
        LoanTokenConfig storage config = loanTokens[_tokenAddress];
        require(config.tokenAddress != address(0), "Token not registered");
        
        Position storage pos = positions[_tokenAddress];
        require(pos.tokenCount >= _tokenCount, "Insufficient tokens");
        
        Pool storage pool = pools[1];
        
        // Get quote
        Quote memory quote = _getQuoteInternal(_tokenAddress, _tokenCount);
        uint256 totalValue = _tokenCount * quote.sellPrice;
        
        // Execute trade
        IERC20 token = IERC20(_tokenAddress);
        require(token.transfer(msg.sender, totalValue), "Token transfer failed");
        
        // Update position
        pos.tokenCount -= _tokenCount;
        pos.totalSold += _tokenCount;
        
        int256 pnl = int256(totalValue) - int256(_tokenCount * pos.avgBuyPrice);
        pos.realizedPnL += pnl;
        
        pos.lastPrice = quote.sellPrice;
        pos.updatedAt = block.timestamp;
        
        // Update pool
        pool.availableCapital += totalValue;
        pool.lockedCapital -= totalValue;
        
        // Update price history
        _updatePriceHistory(_tokenAddress, quote.sellPrice);
        
        // Update loan token config
        config.lastPrice = quote.sellPrice;
        config.priceUpdatedAt = block.timestamp;
        
        emit TradeExecuted(_tokenAddress, msg.sender, false, _tokenCount, quote.sellPrice, totalValue);
        
        return totalValue;
    }

    /**
     * @dev Stabilize token price if it moves too much
     */
    function stabilizePrice(address _tokenAddress) external onlyOperator nonReentrant {
        LoanTokenConfig storage config = loanTokens[_tokenAddress];
        
        uint256 fairPrice = calculateFairPrice(config.lastPrice);
        if (config.lastPrice == 0) return;
        
        uint256 priceChange = config.lastPrice > fairPrice 
            ? config.lastPrice - fairPrice 
            : fairPrice - config.lastPrice;
        
        uint256 changeBps = (priceChange * 10000) / config.lastPrice;
        
        if (changeBps > STABILIZATION_THRESHOLD) {
            // Calculate stabilized price
            uint256 maxMove = (config.lastPrice * MAX_PRICE_MOVE) / 10000;
            uint256 stabilizedPrice;
            
            if (fairPrice > config.lastPrice) {
                stabilizedPrice = config.lastPrice + maxMove;
            } else {
                stabilizedPrice = config.lastPrice - maxMove;
            }
            
            config.lastPrice = stabilizedPrice;
            _updatePriceHistory(_tokenAddress, stabilizedPrice);
            
            emit PriceStabilized(_tokenAddress, config.lastPrice, stabilizedPrice);
        }
    }

    /**
     * @dev Handle loan default - create recovery tokens
     */
    function handleDefault(
        uint256 _loanId,
        address _tokenAddress,
        uint256 _collateralValue
    ) external onlyOperator nonReentrant {
        LoanTokenConfig storage config = loanTokens[_tokenAddress];
        require(config.tokenAddress != address(0), "Token not registered");
        
        // Update token status
        config.status = TokenStatus.DEFAULTED;
        emit TokenStatusChanged(_tokenAddress, TokenStatus.DEFAULTED);
        
        // Calculate recovery value (collateral value - liquidation costs)
        uint256 recoveryValue = (_collateralValue * 8000) / 10000; // 20% discount
        uint256 recoveryPerToken = recoveryValue / config.tokenSupply;
        
        // Store recovery info
        recoveryTokens[_tokenAddress] = RecoveryToken({
            tokenAddress: _tokenAddress,
            loanId: _loanId,
            totalSupply: config.tokenSupply,
            recoveryValue: recoveryValue,
            pricePerToken: recoveryPerToken,
            isActive: true
        });
        
        emit DefaultHandled(_loanId, recoveryValue);
    }

    /**
     * @dev Check risk limits before trade
     */
    function _checkRiskLimits(
        address _tokenAddress,
        uint256 _tokenCount,
        uint256 _price,
        bool _isBuy
    ) internal view {
        LoanTokenConfig storage config = loanTokens[_tokenAddress];
        Pool storage pool = pools[1];
        
        if (_isBuy) {
            uint256 positionValue = _tokenCount * _price;
            uint256 exposureBps = (positionValue * 10000) / pool.totalCapital;
            
            // Check per-loan limit
            require(exposureBps <= riskLimits.maxExposurePerLoan, "Exceeds loan exposure limit");
            
            // Check borrower limit
            uint256 borrowerTotal = borrowerExposure[config.borrower] + positionValue;
            uint256 borrowerBps = (borrowerTotal * 10000) / pool.totalCapital;
            require(borrowerBps <= riskLimits.maxExposurePerBorrower, "Exceeds borrower limit");
            
            // Check risk category limit
            uint256 categoryLimit = riskCategoryLimits[config.riskCategory];
            // Would need cumulative calculation in production
            
            // Check position size
            require(positionValue <= riskLimits.maxPositionSize, "Exceeds max position size");
        }
    }

    /**
     * @dev Update price history
     */
    function _updatePriceHistory(address _tokenAddress, uint256 _price) internal {
        PricePoint[] storage history = priceHistory[_tokenAddress];
        
        history.push(PricePoint({
            price: _price,
            timestamp: block.timestamp
        }));
        
        // Limit history size
        if (history.length > PRICE_HISTORY_LIMIT) {
            for (uint256 i = 0; i < history.length - 1; i++) {
                history[i] = history[i + 1];
            }
            history.pop();
        }
    }

    /**
     * @dev Internal quote calculation
     */
    function _getQuoteInternal(address _tokenAddress, uint256 _tokenCount) internal view returns (Quote memory) {
        LoanTokenConfig storage config = loanTokens[_tokenAddress];
        
        uint256 fairPrice = calculateFairPrice(_tokenAddress);
        uint256 spread = calculateSpread(_tokenAddress);
        
        uint256 halfSpread = spread / 2;
        uint256 buyPrice = (fairPrice * (10000 - halfSpread)) / 10000;
        uint256 sellPrice = (fairPrice * (10000 + halfSpread)) / 10000;
        
        Pool storage pool = pools[1];
        
        return Quote({
            buyPrice: buyPrice,
            sellPrice: sellPrice,
            buyQty: pool.availableCapital / buyPrice,
            sellQty: positions[_tokenAddress].tokenCount,
            spreadBps: spread,
            fairPrice: fairPrice
        });
    }

    /**
     * @dev Set risk parameters
     */
    function setRiskLimits(
        uint256 _maxPerLoan,
        uint256 _maxPerBorrower,
        uint256 _maxPosition,
        uint256 _minLiquidity
    ) external onlyRiskManager {
        riskLimits.maxExposurePerLoan = _maxPerLoan;
        riskLimits.maxExposurePerBorrower = _maxPerBorrower;
        riskLimits.maxPositionSize = _maxPosition;
        riskLimits.minLiquidityRatio = _minLiquidity;
    }

    /**
     * @dev Set pool spread parameters
     */
    function setPoolParams(uint256 _poolId, uint256 _spreadBps, uint256 _maxSlippageBps) external onlyAdmin {
        require(_poolId > 0 && _poolId <= poolCounter, "Invalid pool");
        
        Pool storage pool = pools[_poolId];
        pool.baseSpreadBps = _spreadBps;
        pool.maxSlippageBps = _maxSlippageBps;
    }

    /**
     * @dev Get position for token
     */
    function getPosition(address _tokenAddress) external view returns (Position memory) {
        return positions[_tokenAddress];
    }

    /**
     * @dev Get loan token config
     */
    function getLoanTokenConfig(address _tokenAddress) external view returns (LoanTokenConfig memory) {
        return loanTokens[_tokenAddress];
    }

    /**
     * @dev Get recovery token info
     */
    function getRecoveryToken(address _tokenAddress) external view returns (RecoveryToken memory) {
        return recoveryTokens[_tokenAddress];
    }

    /**
     * @dev Get pool details
     */
    function getPool(uint256 _poolId) external view returns (Pool memory) {
        return pools[_poolId];
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
     * @dev Utility function for power calculation
     */
    function _pow(uint256 base, uint256 exp) internal pure returns (uint256) {
        uint256 result = 10000;
        for (uint256 i = 0; i < exp; i++) {
            result = (result * base) / 10000;
        }
        return result;
    }

    // Required for receiving ETH
    receive() external payable {}
}
