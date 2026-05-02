// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title MarketMaker
 * @dev Automated Market Maker for loan tokens
 * 
 * This contract provides liquidity to the secondary market
 * by continuously quoting buy and sell prices.
 */
contract MarketMaker is AccessControl, ReentrancyGuard {
    // Roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // Structs
    struct Pool {
        uint256 id;
        string name;
        uint256 totalCapital;
        uint256 availableCapital;
        uint256 lockedCapital;
        uint256 targetTokenCount;
        uint256 spreadBps; // Bid-ask spread in basis points
        uint256 maxSlippageBps;
        bool isActive;
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
    }

    struct Quote {
        uint256 buyPrice;
        uint256 sellPrice;
        uint256 buyQty;
        uint256 sellQty;
        uint256 slippage;
    }

    // State variables
    uint256 public poolCounter;
    mapping(uint256 => Pool) public pools;
    mapping(address => Position) public positions;
    mapping(address => mapping(uint256 => Quote)) public quotes;
    
    // Risk parameters
    uint256 public maxPositionSize = 10000 ether;
    uint256 public minLiquidity = 1000 ether;
    
    // Events
    event PoolCreated(uint256 indexed poolId, string name);
    event PoolFunded(uint256 indexed poolId, uint256 amount);
    event PoolWithdrawn(uint256 indexed poolId, uint256 amount);
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
    event QuoteUpdated(address indexed token, uint256 buyPrice, uint256 sellPrice);

    // Modifiers
    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "Not an admin");
        _;
    }

    modifier onlyOperator() {
        require(
            hasRole(OPERATOR_ROLE, msg.sender) || hasRole(ADMIN_ROLE, msg.sender),
            "Not authorized"
        );
        _;
    }

    constructor() {
        poolCounter = 0;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
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
            spreadBps: 50, // 0.5% spread
            maxSlippageBps: 200, // 2% max slippage
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
     * @dev Withdraw from pool
     */
    function withdrawFromPool(uint256 _poolId, uint256 _amount) 
        external 
        onlyAdmin 
        nonReentrant 
    {
        require(_poolId > 0 && _poolId <= poolCounter, "Invalid pool");
        
        Pool storage pool = pools[_poolId];
        require(_amount <= pool.availableCapital, "Insufficient available capital");
        
        pool.totalCapital -= _amount;
        pool.availableCapital -= _amount;
        
        payable(msg.sender).transfer(_amount);
        
        emit PoolWithdrawn(_poolId, _amount);
    }

    /**
     * @dev Get quote for a token
     */
    function getQuote(address _tokenAddress, uint256 _tokenCount) 
        external 
        view 
        returns (Quote memory) 
    {
        Position storage pos = positions[_tokenAddress];
        
        // Base price from last trade or default
        uint256 basePrice = pos.lastPrice > 0 ? pos.lastPrice : 1e18;
        
        // Calculate spread
        uint256 spread = (basePrice * pools[1].spreadBps) / 10000;
        
        // Calculate prices
        uint256 buyPrice = basePrice - (spread / 2);
        uint256 sellPrice = basePrice + (spread / 2);
        
        // Adjust for slippage based on size
        uint256 slippage = _calculateSlippage(_tokenCount, basePrice);
        
        // Check available liquidity
        uint256 maxBuy = pool.availableCapital / buyPrice;
        uint256 maxSell = pos.tokenCount;
        
        return Quote({
            buyPrice: buyPrice,
            sellPrice: sellPrice,
            buyQty: maxBuy > maxPositionSize ? maxPositionSize : maxBuy,
            sellQty: maxSell > maxPositionSize ? maxPositionSize : maxSell,
            slippage: slippage
        });
    }

    /**
     * @dev Execute buy from market maker
     */
    function buy(address _tokenAddress, uint256 _tokenCount) 
        external 
        nonReentrant 
        returns (uint256) 
    {
        require(_tokenCount > 0, "Invalid amount");
        
        Position storage pos = positions[_tokenAddress];
        Pool storage pool = pools[1];
        
        // Get quote
        Quote memory quote = _getQuoteInternal(_tokenAddress, _tokenCount);
        
        uint256 totalValue = _tokenCount * quote.buyPrice;
        require(totalValue <= pool.availableCapital, "Insufficient liquidity");
        require(totalValue <= msg.value, "Insufficient payment");
        
        // Execute trade
        IERC20 token = IERC20(_tokenAddress);
        require(
            token.transferFrom(msg.sender, address(this), _tokenCount),
            "Token transfer failed"
        );
        
        // Update position
        pos.tokenCount += _tokenCount;
        pos.totalBought += _tokenCount;
        
        // Update average price
        if (pos.avgBuyPrice == 0) {
            pos.avgBuyPrice = quote.buyPrice;
        } else {
            pos.avgBuyPrice = (pos.avgBuyPrice * (pos.tokenCount - _tokenCount) + quote.buyPrice * _tokenCount) / pos.tokenCount;
        }
        
        pos.lastPrice = quote.buyPrice;
        
        // Update pool
        pool.availableCapital -= totalValue;
        pool.lockedCapital += totalValue;
        
        // Refund excess
        uint256 refund = msg.value - totalValue;
        if (refund > 0) {
            payable(msg.sender).transfer(refund);
        }
        
        emit TradeExecuted(_tokenAddress, msg.sender, true, _tokenCount, quote.buyPrice, totalValue);
        
        return totalValue;
    }

    /**
     * @dev Sell to market maker
     */
    function sell(address _tokenAddress, uint256 _tokenCount) 
        external 
        nonReentrant 
        returns (uint256) 
    {
        require(_tokenCount > 0, "Invalid amount");
        
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
        
        // Calculate PnL
        int256 pnl = int256(totalValue) - int256(_tokenCount * pos.avgBuyPrice);
        pos.realizedPnL += pnl;
        
        pos.lastPrice = quote.sellPrice;
        
        // Update pool
        pool.availableCapital += totalValue;
        pool.lockedCapital -= totalValue;
        
        emit TradeExecuted(_tokenAddress, msg.sender, false, _tokenCount, quote.sellPrice, totalValue);
        
        return totalValue;
    }

    /**
     * @dev Set pool parameters
     */
    function setPoolParams(
        uint256 _poolId,
        uint256 _spreadBps,
        uint256 _maxSlippageBps
    ) external onlyAdmin {
        require(_poolId > 0 && _poolId <= poolCounter, "Invalid pool");
        
        Pool storage pool = pools[_poolId];
        pool.spreadBps = _spreadBps;
        pool.maxSlippageBps = _maxSlippageBps;
    }

    /**
     * @dev Set risk parameters
     */
    function setRiskParams(uint256 _maxPosition, uint256 _minLiquidity) external onlyAdmin {
        maxPositionSize = _maxPosition;
        minLiquidity = _minLiquidity;
    }

    /**
     * @dev Get position for token
     */
    function getPosition(address _tokenAddress) external view returns (Position memory) {
        return positions[_tokenAddress];
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
     * @dev Calculate slippage based on trade size
     */
    function _calculateSlippage(uint256 _tokenCount, uint256 _basePrice) 
        internal 
        view 
        returns (uint256) 
    {
        uint256 sizeRatio = (_tokenCount * 10000) / maxPositionSize;
        uint256 slippage = (sizeRatio * pools[1].maxSlippageBps) / 10000;
        return slippage;
    }

    /**
     * @dev Internal quote calculation
     */
    function _getQuoteInternal(address _tokenAddress, uint256 _tokenCount) 
        internal 
        view 
        returns (Quote memory) 
    {
        Position storage pos = positions[_tokenAddress];
        
        uint256 basePrice = pos.lastPrice > 0 ? pos.lastPrice : 1e18;
        uint256 spread = (basePrice * pools[1].spreadBps) / 10000;
        
        uint256 buyPrice = basePrice - (spread / 2);
        uint256 sellPrice = basePrice + (spread / 2);
        
        uint256 slippage = _calculateSlippage(_tokenCount, basePrice);
        
        return Quote({
            buyPrice: buyPrice,
            sellPrice: sellPrice,
            buyQty: pools[1].availableCapital / buyPrice,
            sellQty: pos.tokenCount,
            slippage: slippage
        });
    }

    // Required for receiving ETH
    receive() external payable {}
}
