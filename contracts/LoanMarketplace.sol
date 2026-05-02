// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title LoanMarketplace
 * @dev Secondary market for trading loan tokens
 * 
 * This contract enables investors to buy and sell loan tokens
 * on a secondary market, providing liquidity.
 */
contract LoanMarketplace is AccessControl, ReentrancyGuard {
    // Roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MARKET_MAKER_ROLE = keccak256("MARKET_MAKER_ROLE");

    // Enums
    enum OrderType { BUY, SELL }
    enum OrderStatus { ACTIVE, PARTIAL, FILLED, CANCELLED, EXPIRED }

    // Structs
    struct Order {
        uint256 id;
        address creator;
        address tokenAddress;
        OrderType orderType;
        uint256 tokenCount;
        uint256 filledCount;
        uint256 pricePerToken; // In wei
        OrderStatus status;
        uint256 expiresAt;
        uint256 createdAt;
    }

    struct Trade {
        uint256 orderId;
        address maker;
        address taker;
        address tokenAddress;
        uint256 tokenCount;
        uint256 pricePerToken;
        uint256 totalValue;
        uint256 createdAt;
    }

    // State variables
    uint256 public orderCounter;
    uint256 public tradeCounter;
    uint256 public platformFeeBps = 25; // 0.25% fee
    
    // Mappings
    mapping(uint256 => Order) public orders;
    mapping(address => uint256[]) public userOrders;
    mapping(address => uint256[]) public userTrades;
    mapping(address => uint256) public pendingWithdrawals;
    
    // Market stats
    struct MarketStats {
        uint256 totalVolume;
        uint256 tradeCount24h;
        uint256 lastPrice;
        uint256 high24h;
        uint256 low24h;
    }
    mapping(address => MarketStats) public marketStats;
    
    // Events
    event OrderCreated(
        uint256 indexed orderId,
        address indexed creator,
        address indexed tokenAddress,
        OrderType orderType,
        uint256 tokenCount,
        uint256 pricePerToken
    );
    event OrderFilled(
        uint256 indexed orderId,
        address indexed filler,
        uint256 tokenCount,
        uint256 totalValue
    );
    event OrderCancelled(uint256 indexed orderId);
    event TradeExecuted(
        uint256 indexed tradeId,
        address indexed maker,
        address indexed taker,
        address tokenAddress,
        uint256 tokenCount,
        uint256 totalValue
    );
    event FeeUpdated(uint256 newFeeBps);

    // Modifiers
    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "Not an admin");
        _;
    }

    modifier onlyValidOrder(uint256 _orderId) {
        require(orders[_orderId].creator != address(0), "Order not found");
        require(
            orders[_orderId].status == OrderStatus.ACTIVE || 
            orders[_orderId].status == OrderStatus.PARTIAL,
            "Order not active"
        );
        _;
    }

    constructor() {
        orderCounter = 0;
        tradeCounter = 0;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Create a buy or sell order
     */
    function createOrder(
        address _tokenAddress,
        OrderType _orderType,
        uint256 _tokenCount,
        uint256 _pricePerToken,
        uint256 _durationHours
    ) external nonReentrant returns (uint256) {
        require(_tokenAddress != address(0), "Invalid token address");
        require(_tokenCount > 0, "Invalid token count");
        require(_pricePerToken > 0, "Invalid price");
        
        // For sell orders, check token balance
        if (_orderType == OrderType.SELL) {
            IERC20 token = IERC20(_tokenAddress);
            require(token.balanceOf(msg.sender) >= _tokenCount, "Insufficient balance");
            require(
                token.allowance(msg.sender, address(this)) >= _tokenCount,
                "Insufficient allowance"
            );
        } else {
            // For buy orders, check ETH balance
            require(msg.value >= _tokenCount * _pricePerToken, "Insufficient ETH");
        }
        
        orderCounter++;
        uint256 orderId = orderCounter;
        
        orders[orderId] = Order({
            id: orderId,
            creator: msg.sender,
            tokenAddress: _tokenAddress,
            orderType: _orderType,
            tokenCount: _tokenCount,
            filledCount: 0,
            pricePerToken: _pricePerToken,
            status: OrderStatus.ACTIVE,
            expiresAt: block.timestamp + (_durationHours * 1 hours),
            createdAt: block.timestamp
        });
        
        userOrders[msg.sender].push(orderId);
        
        // Lock tokens for sell orders
        if (_orderType == OrderType.SELL) {
            IERC20 token = IERC20(_tokenAddress);
            token.transferFrom(msg.sender, address(this), _tokenCount);
        }
        
        emit OrderCreated(
            orderId,
            msg.sender,
            _tokenAddress,
            _orderType,
            _tokenCount,
            _pricePerToken
        );
        
        return orderId;
    }

    /**
     * @dev Fill an order (buy or sell)
     */
    function fillOrder(uint256 _orderId, uint256 _tokenCount) 
        external 
        nonReentrant 
        onlyValidOrder(_orderId) 
        returns (uint256) 
    {
        Order storage order = orders[_orderId];
        
        require(_tokenCount > 0, "Invalid amount");
        require(_tokenCount <= order.tokenCount - order.filledCount, "Exceeds available");
        require(block.timestamp <= order.expiresAt, "Order expired");
        require(order.creator != msg.sender, "Cannot fill own order");
        
        uint256 fillAmount = _tokenCount;
        uint256 totalValue = fillAmount * order.pricePerToken;
        uint256 fee = (totalValue * platformFeeBps) / 10000;
        
        IERC20 token = IERC20(order.tokenAddress);
        
        if (order.orderType == OrderType.SELL) {
            // Buyer fills sell order
            require(msg.value >= totalValue, "Insufficient payment");
            
            // Transfer tokens to buyer
            token.transfer(msg.sender, fillAmount);
            
            // Transfer ETH to seller (minus fee)
            uint256 sellerReceive = totalValue - fee;
            payable(order.creator).transfer(sellerReceive);
            
            // Track fees
            pendingWithdrawals[address(0)] += fee;
        } else {
            // Seller fills buy order
            require(token.balanceOf(msg.sender) >= fillAmount, "Insufficient tokens");
            require(
                token.allowance(msg.sender, address(this)) >= fillAmount,
                "Insufficient allowance"
            );
            
            // Transfer tokens to buyer (order creator)
            token.transferFrom(msg.sender, order.creator, fillAmount);
            
            // Refund excess ETH to filler
            uint256 refund = msg.value - totalValue;
            if (refund > 0) {
                payable(msg.sender).transfer(refund);
            }
            
            // Track ETH for seller to withdraw
            pendingWithdrawals[order.creator] += totalValue;
        }
        
        // Update order
        order.filledCount += fillAmount;
        if (order.filledCount >= order.tokenCount) {
            order.status = OrderStatus.FILLED;
        } else {
            order.status = OrderStatus.PARTIAL;
        }
        
        // Record trade
        tradeCounter++;
        uint256 tradeId = tradeCounter;
        
        // Emit trade event
        emit TradeExecuted(
            tradeId,
            order.creator,
            msg.sender,
            order.tokenAddress,
            fillAmount,
            totalValue
        );
        
        emit OrderFilled(_orderId, msg.sender, fillAmount, totalValue);
        
        // Update market stats
        _updateMarketStats(order.tokenAddress, order.pricePerToken, totalValue);
        
        return tradeId;
    }

    /**
     * @dev Cancel an order
     */
    function cancelOrder(uint256 _orderId) external nonReentrant onlyValidOrder(_orderId) {
        Order storage order = orders[_orderId];
        
        require(order.creator == msg.sender, "Not order creator");
        
        // Return locked tokens to creator
        uint256 remaining = order.tokenCount - order.filledCount;
        if (remaining > 0 && order.orderType == OrderType.SELL) {
            IERC20 token = IERC20(order.tokenAddress);
            token.transfer(order.creator, remaining);
        }
        
        order.status = OrderStatus.CANCELLED;
        
        emit OrderCancelled(_orderId);
    }

    /**
     * @dev Withdraw accumulated funds
     */
    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "No pending withdrawals");
        
        pendingWithdrawals[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
    }

    /**
     * @dev Get order book for a token
     */
    function getOrderBook(address _tokenAddress) external view returns (
        Order[] memory buyOrders,
        Order[] memory sellOrders
    ) {
        uint256 buyCount = 0;
        uint256 sellCount = 0;
        
        // Count orders
        for (uint256 i = 1; i <= orderCounter; i++) {
            if (orders[i].tokenAddress == _tokenAddress &&
                (orders[i].status == OrderStatus.ACTIVE || orders[i].status == OrderStatus.PARTIAL)) {
                if (orders[i].orderType == OrderType.BUY) {
                    buyCount++;
                } else {
                    sellCount++;
                }
            }
        }
        
        buyOrders = new Order[](buyCount);
        sellOrders = new Order[](sellCount);
        
        uint256 buyIndex = 0;
        uint256 sellIndex = 0;
        
        for (uint256 i = 1; i <= orderCounter; i++) {
            if (orders[i].tokenAddress == _tokenAddress &&
                (orders[i].status == OrderStatus.ACTIVE || orders[i].status == OrderStatus.PARTIAL)) {
                if (orders[i].orderType == OrderType.BUY) {
                    buyOrders[buyIndex++] = orders[i];
                } else {
                    sellOrders[sellIndex++] = orders[i];
                }
            }
        }
        
        // Sort orders by price
        _sortOrders(buyOrders, true);
        _sortOrders(sellOrders, false);
        
        return (buyOrders, sellOrders);
    }

    /**
     * @dev Get user's orders
     */
    function getUserOrders(address _user) external view returns (Order[] memory) {
        uint256[] storage orderIds = userOrders[_user];
        Order[] memory result = new Order[](orderIds.length);
        
        for (uint256 i = 0; i < orderIds.length; i++) {
            result[i] = orders[orderIds[i]];
        }
        
        return result;
    }

    /**
     * @dev Get market stats for a token
     */
    function getMarketStats(address _tokenAddress) external view returns (
        uint256 totalVolume,
        uint256 tradeCount,
        uint256 lastPrice,
        uint256 high24h,
        uint256 low24h
    ) {
        MarketStats memory stats = marketStats[_tokenAddress];
        return (
            stats.totalVolume,
            stats.tradeCount24h,
            stats.lastPrice,
            stats.high24h,
            stats.low24h
        );
    }

    /**
     * @dev Update platform fee
     */
    function setPlatformFee(uint256 _newFeeBps) external onlyAdmin {
        require(_newFeeBps <= 500, "Fee too high"); // Max 5%
        platformFeeBps = _newFeeBps;
        emit FeeUpdated(_newFeeBps);
    }

    /**
     * @dev Update market stats
     */
    function _updateMarketStats(
        address _tokenAddress,
        uint256 _price,
        uint256 _volume
    ) internal {
        MarketStats storage stats = marketStats[_tokenAddress];
        
        stats.totalVolume += _volume;
        stats.tradeCount24h++;
        stats.lastPrice = _price;
        
        if (stats.high24h == 0 || _price > stats.high24h) {
            stats.high24h = _price;
        }
        if (stats.low24h == 0 || _price < stats.low24h) {
            stats.low24h = _price;
        }
    }

    /**
     * @dev Sort orders by price
     */
    function _sortOrders(Order[] memory _orders, bool _ascending) internal pure {
        for (uint256 i = 0; i < _orders.length; i++) {
            for (uint256 j = i + 1; j < _orders.length; j++) {
                bool swap = _ascending 
                    ? _orders[i].pricePerToken < _orders[j].pricePerToken
                    : _orders[i].pricePerToken > _orders[j].pricePerToken;
                
                if (swap) {
                    Order memory temp = _orders[i];
                    _orders[i] = _orders[j];
                    _orders[j] = temp;
                }
            }
        }
    }

    // Required for receiving ETH
    receive() external payable {}
}
