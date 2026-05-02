/**
 * GasEstimationService - Gas estimation for blockchain transactions
 * Helps users understand transaction costs before signing
 */

import { ethers } from 'ethers';

// Common gas estimates (in gas units)
export const GAS_ESTIMATES = {
    // Loan operations
    createLoan: 500000,
    fundLoan: 150000,
    repayLoan: 200000,
    requestTopup: 300000,
    fundTopup: 200000,
    
    // Collateral operations
    depositCollateral: 300000,
    verifyCollateral: 100000,
    
    // Escrow operations
    createTransaction: 300000,
    fundTransaction: 200000,
    markAsShipped: 100000,
    confirmDelivery: 100000,
    releaseFunds: 150000,
    openDispute: 150000,
    
    // Admin operations
    triggerDefault: 250000,
    resolveDispute: 200000,
    verifyCollateral: 100000,
};

// Gas price multipliers for different urgency levels
export const GAS_SPEED_MULTIPLIERS = {
    slow: 0.9,      // 10% slower, 10% cheaper
    standard: 1.0,  // Average
    fast: 1.2,      // 20% faster, 20% more expensive
    instant: 1.5,   // 50% faster, 50% more expensive
};

class GasEstimationService {
    constructor() {
        this.provider = null;
        this.defaultSpeed = 'standard';
    }

    /**
     * Initialize with a provider
     */
    async initialize(provider) {
        this.provider = provider;
        
        // Try to get current gas prices
        if (provider) {
            try {
                const feeData = await provider.getFeeData();
                this.baseGasPrice = feeData.gasPrice;
                this.maxFeePerGas = feeData.maxFeePerGas;
                this.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
            } catch (error) {
                console.warn('Could not get gas data:', error);
                // Use default values
                this.baseGasPrice = ethers.parseUnits('20', 'gwei');
            }
        }
        
        return {
            initialized: true,
            baseGasPrice: this.baseGasPrice?.toString(),
        };
    }

    /**
     * Estimate gas for a transaction
     * @param {Object} contract - Ethers contract
     * @param {string} functionName - Function name
     * @param {Array} args - Function arguments
     * @param {Object} options - Transaction options
     * @returns {Object} Gas estimation
     */
    async estimateGas(contract, functionName, args = [], options = {}) {
        if (!contract) {
            return this._getEstimateFromTable(functionName);
        }

        try {
            // Try to estimate using the contract
            const gasEstimate = await contract[functionName].estimateGas(...args, options);
            
            return {
                estimated: true,
                gasLimit: gasEstimate.toString(),
                gasLimitFormatted: gasEstimate.toNumber(),
                method: 'contract.estimateGas',
            };
        } catch (error) {
            console.warn(`Gas estimation failed for ${functionName}, using fallback:`, error);
            return this._getEstimateFromTable(functionName);
        }
    }

    /**
     * Calculate total gas cost
     * @param {number|string} gasLimit - Gas limit
     * @param {string} speed - Speed setting (slow, standard, fast, instant)
     * @returns {Object} Cost breakdown
     */
    calculateCost(gasLimit, speed = this.defaultSpeed) {
        const gasLimitBigInt = BigInt(gasLimit);
        const multiplier = GAS_SPEED_MULTIPLIERS[speed] || 1.0;
        
        // Calculate costs in different units
        const gasPrice = this.baseGasPrice || ethers.parseUnits('20', 'gwei');
        const adjustedGasPrice = (gasPrice * BigInt(Math.floor(multiplier * 1000))) / BigInt(1000);
        
        const totalCostWei = gasLimitBigInt * adjustedGasPrice;
        const totalCostETH = ethers.formatEther(totalCostWei);
        const totalCostUSD = this._estimateUSDValue(totalCostETH);

        return {
            gasLimit: gasLimit.toString(),
            gasPrice: adjustedGasPrice.toString(),
            gasPriceGwei: ethers.formatUnits(adjustedGasPrice, 'gwei'),
            totalCostWei: totalCostWei.toString(),
            totalCostETH,
            totalCostUSD,
            speed,
            multiplier,
        };
    }

    /**
     * Get full estimation with cost breakdown
     * @param {Object} contract - Ethers contract
     * @param {string} functionName - Function to estimate
     * @param {Array} args - Function arguments
     * @param {Object} options - Transaction options
     * @returns {Object} Full estimation
     */
    async getFullEstimation(contract, functionName, args = [], options = {}) {
        const estimate = await this.estimateGas(contract, functionName, args, options);
        
        // Calculate costs for different speeds
        const costs = {
            slow: this.calculateCost(estimate.gasLimit, 'slow'),
            standard: this.calculateCost(estimate.gasLimit, 'standard'),
            fast: this.calculateCost(estimate.gasLimit, 'fast'),
            instant: this.calculateCost(estimate.gasLimit, 'instant'),
        };

        return {
            ...estimate,
            costs,
            recommendedSpeed: this.defaultSpeed,
            recommendedCost: costs[this.defaultSpeed],
        };
    }

    /**
     * Format gas cost for display
     * @param {Object} cost - Cost object
     * @returns {string} Formatted string
     */
    formatCost(cost) {
        return `${cost.totalCostETH} ETH ($${cost.totalCostUSD})`;
    }

    /**
     * Get current network gas prices
     */
    async getCurrentGasPrices() {
        if (!this.provider) {
            return this._getDefaultGasPrices();
        }

        try {
            const feeData = await this.provider.getFeeData();
            
            return {
                gasPrice: feeData.gasPrice?.toString(),
                maxFeePerGas: feeData.maxFeePerGas?.toString(),
                maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString(),
                gasPriceGwei: feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, 'gwei') : '0',
            };
        } catch (error) {
            console.warn('Could not get gas prices:', error);
            return this._getDefaultGasPrices();
        }
    }

    /**
     * Set default speed
     */
    setDefaultSpeed(speed) {
        if (GAS_SPEED_MULTIPLIERS[speed]) {
            this.defaultSpeed = speed;
        }
    }

    _getEstimateFromTable(functionName) {
        const gasLimit = GAS_ESTIMATES[functionName] || 200000;
        
        return {
            estimated: false,
            gasLimit: gasLimit.toString(),
            gasLimitFormatted: gasLimit,
            method: 'fallback_table',
        };
    }

    _estimateUSDValue(ethAmount) {
        // Simple ETH/USD conversion (in production, use a price feed)
        const ETH_USD_PRICE = 3500; // Default estimate
        const ethValue = parseFloat(ethAmount);
        return (ethValue * ETH_USD_PRICE).toFixed(2);
    }

    _getDefaultGasPrices() {
        return {
            gasPrice: ethers.parseUnits('20', 'gwei').toString(),
            gasPriceGwei: '20',
            source: 'default',
        };
    }
}

// Export singleton instance
const gasEstimationService = new GasEstimationService();
export default gasEstimationService;
