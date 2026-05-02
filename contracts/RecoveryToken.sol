// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title RecoveryToken
 * @dev ERC-20 token representing claim on collateral recovery proceeds
 * 
 * When a loan defaults, loan tokens are converted to recovery tokens
 * that represent proportional ownership of recovered collateral value.
 */
contract RecoveryToken is ERC20, ERC20Burnable, AccessControl, ReentrancyGuard {
    // Roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PLATFORM_ROLE = keccak256("PLATFORM_ROLE");
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");

    // Recovery Info
    uint256 public loanId;
    address public originalTokenAddress;
    uint256 public collateralValue;
    uint256 public recoveryValue;
    uint256 public liquidationDiscount; // Discount from market value
    bool public isDistributed;
    bool public isFinalized;
    
    // FIN-11: Reserve fund replenishment
    address public reserveFundAddress;
    uint256 public reserveFundReplenishPercent = 500; // 5% of liquidation proceeds to reserve
    
    // Distribution tracking
    mapping(address => uint256) public claimedAmount;
    uint256 public totalClaimed;

    // Events
    event RecoveryTokenCreated(uint256 indexed loanId, uint256 totalSupply);
    event RecoveryValueUpdated(uint256 newValue);
    event DistributionClaimed(address indexed holder, uint256 amount);
    event DistributionFinalized(uint256 totalDistributed);
    event RecoveryCompleted(uint256 loanId, uint256 totalRecovered);
    // FIN-11: Reserve fund replenishment events
    event ReserveFundReplenished(uint256 amount);
    event ReserveFundAddressSet(address indexed address_);
    event ReplenishPercentUpdated(uint256 newPercent);

    // Modifiers
    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "Not an admin");
        _;
    }

    modifier onlyPlatform() {
        require(hasRole(PLATFORM_ROLE, msg.sender), "Not platform");
        _;
    }

    modifier onlyDistributor() {
        require(hasRole(DISTRIBUTOR_ROLE, msg.sender), "Not distributor");
        _;
    }

    modifier whenNotDistributed() {
        require(!isDistributed, "Already distributed");
        _;
    }

    modifier whenNotFinalized() {
        require(!isFinalized, "Already finalized");
        _;
    }

    /**
     * @dev Constructor
     */
    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _loanId,
        address _originalToken,
        uint256 _totalSupply,
        uint256 _collateralValue,
        uint256 _discountBps,
        address _platform
    ) ERC20(_name, _symbol) {
        require(_platform != address(0), "Invalid platform");
        
        loanId = _loanId;
        originalTokenAddress = _originalToken;
        collateralValue = _collateralValue;
        liquidationDiscount = _discountBps;
        
        // Recovery value = collateral - liquidation costs
        recoveryValue = (_collateralValue * (10000 - _discountBps)) / 10000;
        
        _grantRole(DEFAULT_ADMIN_ROLE, _platform);
        _grantRole(ADMIN_ROLE, _platform);
        _grantRole(PLATFORM_ROLE, _platform);
        _grantRole(DISTRIBUTOR_ROLE, _platform);
        
        // Mint tokens to represent recovery claims
        // Each token represents proportional claim on recovery value
        _mint(_platform, _totalSupply);
        
        emit RecoveryTokenCreated(_loanId, _totalSupply);
    }

    /**
     * @dev Update recovery value (before finalization)
     */
    function updateRecoveryValue(uint256 _newValue) external onlyAdmin whenNotFinalized {
        require(_newValue <= collateralValue, "Cannot exceed collateral");
        recoveryValue = _newValue;
        emit RecoveryValueUpdated(_newValue);
    }

    /**
     * @dev Claim distribution for token holder
     */
    function claimDistribution() external nonReentrant whenNotDistributed returns (uint256) {
        require(balanceOf(msg.sender) > 0, "No balance");
        
        // Calculate claim: (balance / totalSupply) * recoveryValue
        uint256 claimAmount = (balanceOf(msg.sender) * recoveryValue) / totalSupply();
        
        // Subtract already claimed
        uint256 pendingClaim = claimAmount - claimedAmount[msg.sender];
        require(pendingClaim > 0, "Nothing to claim");
        
        // Update tracking
        claimedAmount[msg.sender] = claimAmount;
        totalClaimed += pendingClaim;
        
        // Transfer ETH
        payable(msg.sender).transfer(pendingClaim);
        
        emit DistributionClaimed(msg.sender, pendingClaim);
        
        return pendingClaim;
    }

    /**
     * @dev Batch claim for multiple holders (admin function)
     */
    function batchClaim(address[] calldata _holders) external onlyDistributor whenNotDistributed nonReentrant {
        require(_holders.length > 0, "Empty array");
        
        for (uint256 i = 0; i < _holders.length; i++) {
            address holder = _holders[i];
            
            if (balanceOf(holder) > 0) {
                uint256 claimAmount = (balanceOf(holder) * recoveryValue) / totalSupply();
                uint256 pendingClaim = claimAmount - claimedAmount[holder];
                
                if (pendingClaim > 0) {
                    claimedAmount[holder] = claimAmount;
                    totalClaimed += pendingClaim;
                    payable(holder).transfer(pendingClaim);
                    
                    emit DistributionClaimed(holder, pendingClaim);
                }
            }
        }
    }

    /**
     * @dev Finalize distribution after claiming period
     */
    function finalizeDistribution() external onlyAdmin whenNotFinalized {
        require(totalClaimed > 0 || totalSupply() == 0, "Not ready");
        
        isFinalized = true;
        
        uint256 remaining = address(this).balance;
        
        // FIN-11: Send portion to reserve fund for replenishment
        if (remaining > 0 && reserveFundAddress != address(0) && reserveFundReplenishPercent > 0) {
            uint256 replenishAmount = (remaining * reserveFundReplenishPercent) / 10000;
            if (replenishAmount > 0) {
                payable(reserveFundAddress).transfer(replenishAmount);
                emit ReserveFundReplenished(replenishAmount);
                remaining -= replenishAmount;
            }
        }
        
        // Send remaining funds to platform/treasury
        if (remaining > 0) {
            payable(msg.sender).transfer(remaining);
        }
        
        emit DistributionFinalized(totalClaimed);
    }
    
    /**
     * @dev Set reserve fund address (admin only)
     * @notice FIN-11: Configures where liquidation proceeds are sent
     */
    function setReserveFundAddress(address _address_) external onlyAdmin returns (bool) {
        require(_address_ != address(0), "Invalid address");
        reserveFundAddress = _address_;
        emit ReserveFundAddressSet(_address_);
        return true;
    }
    
    /**
     * @dev Set reserve fund replenishment percentage (admin only)
     * @notice FIN-11: Configures what percentage of liquidation goes to reserve
     * @param _percent The percentage in basis points (e.g., 500 = 5%)
     */
    function setReserveFundReplenishPercent(uint256 _percent) external onlyAdmin returns (bool) {
        require(_percent <= 2000, "Cannot exceed 20%"); // Max 20%
        reserveFundReplenishPercent = _percent;
        emit ReplenishPercentUpdated(_percent);
        return true;
    }

    /**
     * @dev Complete recovery process
     */
    function completeRecovery() external onlyAdmin returns (uint256) {
        require(isFinalized, "Not finalized");
        
        uint256 recovered = address(this).balance;
        
        emit RecoveryCompleted(loanId, recovered);
        
        return recovered;
    }

    /**
     * @dev Get claimable amount for an address
     */
    function getClaimableAmount(address _holder) external view returns (uint256) {
        if (totalSupply() == 0 || isDistributed) return 0;
        
        uint256 totalClaim = (balanceOf(_holder) * recoveryValue) / totalSupply();
        return totalClaim - claimedAmount[_holder];
    }

    /**
     * @dev Get recovery price per token
     */
    function getRecoveryPrice() external view returns (uint256) {
        if (totalSupply() == 0) return 0;
        return recoveryValue / totalSupply();
    }

    /**
     * @dev Override to prevent transfers during distribution
     */
    function transfer(address _to, uint256 _amount) public override whenNotDistributed returns (bool) {
        return super.transfer(_to, _amount);
    }

    /**
     * @dev Override to prevent transfers during distribution
     */
    function transferFrom(address _from, address _to, uint256 _amount) public override whenNotDistributed returns (bool) {
        return super.transferFrom(_from, _to, _amount);
    }

    // Required for receiving ETH
    receive() external payable {}
}
