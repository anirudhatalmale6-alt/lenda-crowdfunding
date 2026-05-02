/**
 * LENDA Market Maker Engine Service
 * 
 * Provides automated market making for tokenized loans with:
 * - Discounted Cash Flow (DCF) pricing model
 * - Risk-adjusted pricing with risk categories
 * - Dynamic bid-ask spread model
 * - Price stabilization logic
 * - Risk management and exposure limits
 */

import apiClient from '../utils/api/client';

const API_URL = '/api/market-maker';

// ============================================
// RISK CATEGORIES AND PREMIUMS
// ============================================

export const RISK_CATEGORIES = {
    AAA: { premium: 0.02, color: 'bg-green-100 text-green-800', label: 'AAA - Excellent' },
    AA: { premium: 0.04, color: 'bg-green-50 text-green-700', label: 'AA - Very Good' },
    A: { premium: 0.06, color: 'bg-blue-100 text-blue-800', label: 'A - Good' },
    BBB: { premium: 0.08, color: 'bg-blue-50 text-blue-700', label: 'BBB - Fair' },
    BB: { premium: 0.12, color: 'bg-yellow-100 text-yellow-800', label: 'BB - Speculative' },
    B: { premium: 0.18, color: 'bg-orange-100 text-orange-800', label: 'B - High Yield' },
    CCC: { premium: 0.25, color: 'bg-red-100 text-red-800', label: 'CCC - Very High Yield' },
    D: { premium: 0.40, color: 'bg-red-200 text-red-900', label: 'D - Defaulted' }
};

// Base discount rate for DCF calculations
const BASE_DISCOUNT_RATE = 0.05; // 5% risk-free rate

// ============================================
// PRICING ENGINE - DCF MODEL
// ============================================

/**
 * Calculate present value of remaining loan repayments using DCF
 * 
 * Token Price = PV of Remaining Repayments
 * PV = Sum(Repayment_t / (1 + risk_rate)^t)
 */
export const calculateDCFPrice = (loan, riskRating = 'BBB') => {
    if (!loan || !loan.remainingPayments || loan.remainingPayments.length === 0) {
        return 0;
    }

    const riskPremium = RISK_CATEGORIES[riskRating]?.premium || RISK_CATEGORIES.BBB.premium;
    const discountRate = BASE_DISCOUNT_RATE + riskPremium;

    let presentValue = 0;
    let monthsElapsed = loan.monthsElapsed || 0;

    loan.remainingPayments.forEach((payment, index) => {
        const timePeriod = (index + 1 + monthsElapsed) / 12; // Convert to years
        const discountFactor = Math.pow(1 + discountRate, timePeriod);
        presentValue += payment.amount / discountFactor;
    });

    // Divide by total tokens outstanding to get price per token
    const tokensOutstanding = loan.tokensOutstanding || 1;
    return presentValue / tokensOutstanding;
};

/**
 * Calculate the intrinsic value of a loan token based on cash flows
 */
export const calculateIntrinsicValue = (loan, riskRating = 'BBB') => {
    if (!loan) return 0;

    const totalRemaining = loan.remainingRepayment || 0;
    const tokensOutstanding = loan.tokensOutstanding || 1;
    const riskPremium = RISK_CATEGORIES[riskRating]?.premium || RISK_CATEGORIES.BBB.premium;

    // Apply risk discount
    const discountedValue = totalRemaining * (1 - riskPremium);
    return discountedValue / tokensOutstanding;
};

/**
 * Get fair price for a loan token
 */
export const getFairPrice = (loan, riskRating = 'BBB') => {
    const dcfPrice = calculateDCFPrice(loan, riskRating);
    const intrinsicValue = calculateIntrinsicValue(loan, riskRating);

    // Weighted average: 70% DCF, 30% intrinsic
    return (dcfPrice * 0.7) + (intrinsicValue * 0.3);
};

// ============================================
// BID-ASK SPREAD MODEL
// ============================================

/**
 * Calculate dynamic bid-ask spread
 * 
 * spread = base_spread + volatility_factor + risk_factor
 */
export const calculateSpread = (params) => {
    const {
        baseSpread = 0.01,       // 1% base spread
        volatilityFactor = 0,     // Market volatility adjustment
        riskFactor = 0,           // Loan risk adjustment
        liquidityFactor = 0,      // Liquidity depth adjustment
        demandImbalance = 0      // Buy/sell pressure imbalance
    } = params;

    // Volatility factor: higher volatility = wider spreads
    const volatilityAdjustment = volatilityFactor * 0.5;

    // Risk factor: higher risk = wider spreads
    const riskAdjustment = riskFactor * 1.5;

    // Liquidity factor: lower liquidity = wider spreads
    const liquidityAdjustment = liquidityFactor * 0.3;

    // Demand imbalance: excess demand = tighter buy spread, tighter sell spread
    const imbalanceAdjustment = demandImbalance * 0.2;

    let totalSpread = baseSpread + volatilityAdjustment + riskAdjustment + liquidityAdjustment;
    
    // Cap spread at 20% (extreme conditions)
    totalSpread = Math.min(totalSpread, 0.20);
    
    // Floor spread at 0.1%
    totalSpread = Math.max(totalSpread, 0.001);

    return totalSpread;
};

/**
 * Calculate buy and sell prices from fair price
 */
export const calculatePrices = (fairPrice, spread) => {
    const halfSpread = spread / 2;
    return {
        buyPrice: fairPrice * (1 - halfSpread),  // Market maker buys at bid
        sellPrice: fairPrice * (1 + halfSpread),  // Market maker sells at ask
        spread: spread,
        spreadAbsolute: fairPrice * spread
    };
};

// ============================================
// PRICE STABILIZATION
// ============================================

/**
 * Price stabilization parameters
 */
const STABILIZATION = {
    maxPriceMove: 0.05,        // Max 5% price move per update
    stabilizationThreshold: 0.03, // Trigger at 3% move
    buyPressureMultiplier: 1.2, // Increase buy orders by 20%
    sellPressureMultiplier: 1.2, // Increase sell orders by 20%
    coolingPeriod: 300          // 5 minutes between interventions
};

/**
 * Calculate price stabilization adjustment
 */
export const calculateStabilization = (currentPrice, targetPrice, recentPriceHistory) => {
    const priceChange = (currentPrice - targetPrice) / targetPrice;
    
    // Check if price moved beyond threshold
    if (Math.abs(priceChange) < STABILIZATION.stabilizationThreshold) {
        return { adjustment: 0, action: 'none' };
    }

    // Price dropped significantly - increase buy orders
    if (priceChange < -STABILIZATION.stabilizationThreshold) {
        const adjustmentMagnitude = Math.min(
            Math.abs(priceChange),
            STABILIZATION.maxPriceMove
        );
        return {
            adjustment: adjustmentMagnitude,
            action: 'increase_buy',
            multiplier: STABILIZATION.buyPressureMultiplier
        };
    }

    // Price spiked significantly - increase sell orders
    if (priceChange > STABILIZATION.stabilizationThreshold) {
        const adjustmentMagnitude = Math.min(
            Math.abs(priceChange),
            STABILIZATION.maxPriceMove
        );
        return {
            adjustment: adjustmentMagnitude,
            action: 'increase_sell',
            multiplier: STABILIZATION.sellPressureMultiplier
        };
    }

    return { adjustment: 0, action: 'none' };
};

// ============================================
// RISK MANAGEMENT
// ============================================

/**
 * Risk management parameters
 */
export const RISK_LIMITS = {
    maxExposurePerLoan: 0.05,      // Max 5% of pool per loan
    maxExposurePerBorrower: 0.10,  // Max 10% of pool per borrower
    maxExposurePerRiskCategory: {
        AAA: 0.30,
        AA: 0.25,
        A: 0.20,
        BBB: 0.15,
        BB: 0.10,
        B: 0.05,
        CCC: 0.02,
        D: 0
    },
    minReserveRatio: 0.20,          // Min 20% reserve maintained
    maxPositionSize: 100000,        // Max $100k position per token
    minLiquidityRatio: 0.15         // Min 15% of pool in liquid form
};

/**
 * Check if exposure is within limits
 */
export const checkExposureLimits = (exposure, poolCapital, loanRisk, borrowerExposure) => {
    const warnings = [];
    const violations = [];

    // Check per-loan exposure
    const loanExposureRatio = exposure / poolCapital;
    if (loanExposureRatio > RISK_LIMITS.maxExposurePerLoan) {
        violations.push(`Loan exposure ${(loanExposureRatio * 100).toFixed(1)}% exceeds max ${(RISK_LIMITS.maxExposurePerLoan * 100)}%`);
    }

    // Check per-borrower exposure
    const borrowerExposureRatio = borrowerExposure / poolCapital;
    if (borrowerExposureRatio > RISK_LIMITS.maxExposurePerBorrower) {
        violations.push(`Borrower exposure ${(borrowerExposureRatio * 100).toFixed(1)}% exceeds max ${(RISK_LIMITS.maxExposurePerBorrower * 100)}%`);
    }

    // Check risk category exposure
    const riskCategoryLimit = RISK_LIMITS.maxExposurePerRiskCategory[loanRisk] || 0;
    // This would need cumulative risk exposure calculation

    return {
        isValid: violations.length === 0,
        violations,
        warnings,
        loanExposureRatio,
        borrowerExposureRatio
    };
};

/**
 * Calculate risk-adjusted position size
 */
export const calculatePositionSize = (poolCapital, fairPrice, riskRating, currentInventory) => {
    const maxPositionValue = poolCapital * RISK_LIMITS.maxExposurePerLoan;
    const riskLimit = poolCapital * (RISK_LIMITS.maxExposurePerRiskCategory[riskRating] || 0);
    
    // Take the smaller of the two limits
    const positionLimit = Math.min(maxPositionValue, riskLimit);
    
    // Check current inventory
    const inventoryValue = currentInventory * fairPrice;
    const availablePosition = Math.max(0, positionLimit - inventoryValue);
    
    // Convert to token count
    const tokenCount = Math.floor(availablePosition / fairPrice);
    
    return {
        maxTokenCount: tokenCount,
        maxPositionValue: positionLimit,
        availableValue: availablePosition
    };
};

// ============================================
// LIQUIDITY POOL MANAGEMENT
// ============================================

/**
 * Rebalance liquidity pool
 */
export const rebalancePool = (pool, positions, targetAllocation) => {
    const totalValue = pool.availableCapital + positions.reduce((sum, p) => sum + (p.value || 0), 0);
    const targetPerPosition = totalValue * targetAllocation;
    
    const rebalancingActions = positions.map(position => {
        const currentValue = position.value || 0;
        const diff = targetPerPosition - currentValue;
        
        return {
            token: position.token,
            action: diff > 0 ? 'buy' : 'sell',
            amount: Math.abs(diff),
            reason: Math.abs(diff) / totalValue > 0.01 ? 'rebalance' : 'hold'
        };
    });
    
    return rebalancingActions;
};

/**
 * Calculate optimal pool allocation
 */
export const calculateOptimalAllocation = (loans, poolCapital) => {
    // Sort by risk-adjusted returns
    const scoredLoans = loans.map(loan => ({
        ...loan,
        score: calculateInvestmentScore(loan)
    })).sort((a, b) => b.score - a.score);
    
    let allocated = 0;
    const allocations = [];
    
    scoredLoans.forEach(loan => {
        const maxAllocation = poolCapital * RISK_LIMITS.maxExposurePerLoan;
        const allocation = Math.min(maxAllocation, poolCapital * 0.02); // Min 2% per loan
        
        if (allocated + allocation <= poolCapital * 0.8) {
            allocations.push({
                loanId: loan.id,
                amount: allocation,
                percentage: allocation / poolCapital
            });
            allocated += allocation;
        }
    });
    
    return allocations;
};

/**
 * Calculate investment score for loan
 */
const calculateInvestmentScore = (loan) => {
    const riskPremium = RISK_CATEGORIES[loan.riskRating]?.premium || 0.1;
    const yieldScore = loan.apy || 0;
    const liquidityScore = (loan.tradingVolume || 0) / 10000;
    const stabilityScore = loan.defaultProbability ? (1 - loan.defaultProbability) * 100 : 50;
    
    return (yieldScore * 2) + (liquidityScore * 1.5) + (stabilityScore * 1) - (riskPremium * 100);
};

// ============================================
// DEFAULT EVENT HANDLING
// ============================================

/**
 * Handle default event
 */
export const handleDefaultEvent = (loan, pool, positions) => {
    // Pause trading
    const tradingPaused = true;
    
    // Calculate recovery value
    const recoveryValue = calculateRecoveryValue(loan);
    
    // Calculate recovery token value
    const recoveryTokenPrice = recoveryValue / (loan.tokensOutstanding || 1);
    
    // Determine if reserve should be activated
    const reserveNeeded = calculateReserveRequirement(loan, recoveryValue);
    
    return {
        tradingPaused,
        loanId: loan.id,
        recoveryValue,
        recoveryTokenPrice,
        reserveRequired: reserveNeeded,
        action: reserveNeeded > 0 ? 'activate_reserve' : 'liquidate_collateral'
    };
};

/**
 * Calculate recovery value from collateral
 */
const calculateRecoveryValue = (loan) => {
    const collateralValue = loan.collateralValue || 0;
    const liquidationDiscount = 0.20; // 20% discount for quick liquidation
    const estimatedRecovery = collateralValue * (1 - liquidationDiscount);
    
    // Cap at outstanding loan balance
    return Math.min(estimatedRecovery, loan.remainingRepayment || 0);
};

/**
 * Calculate reserve requirement
 */
const calculateReserveRequirement = (loan, recoveryValue) => {
    const shortfall = (loan.remainingRepayment || 0) - recoveryValue;
    return Math.max(0, shortfall);
};

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Get market maker pools
 */
export const getMarketMakerPools = async () => {
    const response = await apiClient.get(`${API_URL}/pools`);
    return response.data;
};

/**
 * Create market maker pool
 */
export const createMarketMakerPool = async (poolData) => {
    const response = await apiClient.post(`${API_URL}/pools`, poolData);
    return response.data;
};

/**
 * Fund market maker pool
 */
export const fundPool = async (poolId, amount) => {
    const response = await apiClient.post(`${API_URL}/pools/${poolId}/fund`, { amount });
    return response.data;
};

/**
 * Get quote for token
 */
export const getQuote = async (loanId, tokenCount = 1) => {
    const response = await apiClient.get(`${API_URL}/quote`, {
        params: { loanId, tokenCount }
    });
    return response.data;
};

/**
 * Execute trade with market maker
 */
export const executeTrade = async (loanId, tokenCount, isBuy) => {
    const response = await apiClient.post(`${API_URL}/trade`, {
        loanId,
        tokenCount,
        isBuy
    });
    return response.data;
};

/**
 * Get market maker positions
 */
export const getPositions = async () => {
    const response = await apiClient.get(`${API_URL}/positions`);
    return response.data;
};

/**
 * Get market maker analytics
 */
export const getAnalytics = async (params = {}) => {
    const response = await apiClient.get(`${API_URL}/analytics`, { params });
    return response.data;
};

/**
 * Get price history for a loan token
 */
export const getPriceHistory = async (loanId, timeframe = '24h') => {
    const response = await apiClient.get(`${API_URL}/prices/${loanId}/history`, {
        params: { timeframe }
    });
    return response.data;
};

/**
 * Update market maker parameters
 */
export const updateParameters = async (params) => {
    const response = await apiClient.put(`${API_URL}/parameters`, params);
    return response.data;
};

/**
 * Get risk assessment for loan
 */
export const getRiskAssessment = async (loanId) => {
    const response = await apiClient.get(`${API_URL}/risk/${loanId}`);
    return response.data;
};

/**
 * Trigger price stabilization
 */
export const triggerStabilization = async (loanId) => {
    const response = await apiClient.post(`${API_URL}/stabilize`, { loanId });
    return response.data;
};

/**
 * Get recovery token info
 */
export const getRecoveryToken = async (loanId) => {
    const response = await apiClient.get(`${API_URL}/recovery/${loanId}`);
    return response.data;
};

/**
 * Trade recovery tokens
 */
export const tradeRecoveryToken = async (loanId, tokenCount, isBuy) => {
    const response = await apiClient.post(`${API_URL}/recovery/${loanId}/trade`, {
        tokenCount,
        isBuy
    });
    return response.data;
};

export default {
    // Constants
    RISK_CATEGORIES,
    RISK_LIMITS,
    
    // Pricing
    calculateDCFPrice,
    calculateIntrinsicValue,
    getFairPrice,
    calculateSpread,
    calculatePrices,
    
    // Stabilization
    calculateStabilization,
    
    // Risk Management
    checkExposureLimits,
    calculatePositionSize,
    
    // Liquidity Pool
    rebalancePool,
    calculateOptimalAllocation,
    
    // Default Handling
    handleDefaultEvent,
    
    // API
    getMarketMakerPools,
    createMarketMakerPool,
    fundPool,
    getQuote,
    executeTrade,
    getPositions,
    getAnalytics,
    getPriceHistory,
    updateParameters,
    getRiskAssessment,
    triggerStabilization,
    getRecoveryToken,
    tradeRecoveryToken
};
