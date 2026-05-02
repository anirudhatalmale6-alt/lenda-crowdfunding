import { createApiClient } from '../utils/api/client';

// Create revenue-specific API client pointing to platform endpoints
const API_URL = '/api/platform';
const platformApi = createApiClient(API_URL);

// Fee configuration cache - stores fetched config from API
let feeConfigCache = {
  config: null,
  timestamp: null,
  TTL: 5 * 60 * 1000 // 5 minutes cache TTL
};

// Fee configuration constants - should match smart contract values (fallback only)
const CONTRACT_FEE_CONFIG = {
  ORIGINATION_FEE_BPS: 200,    // 2% in basis points (200 bps = 2%)
  INVESTOR_FEE_BPS: 500,       // 5% in basis points
  TRADING_FEE_BPS: 100,        // 1% in basis points
  ESCROW_FEE_BPS: 150,         // 1.5% in basis points
  LIQUIDATION_COMMISSION_BPS: 1000, // 10% in basis points
  MIN_ORIGINATION_FEE: 0,
  MAX_ORIGINATION_FEE_BPS: 1000, // Maximum 10%
  // Dynamic flag - set to true when config is loaded from API
  isDynamic: false
};

// Revenue Service - Handles all revenue-related API calls

/**
 * Get the effective fee configuration (from cache or fallback)
 * @returns {object} - Fee configuration object
 */
const getEffectiveFeeConfig = () => {
  const now = Date.now();
  
  // Check if cache is valid
  if (feeConfigCache.config && 
      feeConfigCache.timestamp && 
      (now - feeConfigCache.timestamp) < feeConfigCache.TTL) {
    return {
      ...feeConfigCache.config,
      isDynamic: true
    };
  }
  
  // Return fallback contract config
  return { ...CONTRACT_FEE_CONFIG, isDynamic: false };
};

/**
 * Update the cached fee configuration
 * @param {object} config - New fee configuration
 */
const updateFeeConfigCache = (config) => {
  feeConfigCache = {
    config,
    timestamp: Date.now(),
    TTL: 5 * 60 * 1000
  };
  
  // Update CONTRACT_FEE_CONFIG with new values
  Object.assign(CONTRACT_FEE_CONFIG, {
    ...config,
    isDynamic: true
  });
};

const revenueService = {
  // Get contract fee configuration (from cache or fallback)
  getContractFeeConfig: () => {
    return getEffectiveFeeConfig();
  },
  
  // Force refresh fee config from source
  refreshFeeConfig: async () => {
    try {
      const response = await revenueService.getFeeConfig();
      if (response && response.fee_config) {
        updateFeeConfigCache(response.fee_config);
      }
      return getEffectiveFeeConfig();
    } catch (error) {
      console.warn('Failed to refresh fee config, using cached/fallback:', error);
      return getEffectiveFeeConfig();
    }
  },
  
  /**
   * Validate origination fee against contract config
   * @param {number} feePercentage - Fee percentage to validate
   * @returns {object} - Validation result
   */
  validateOriginationFee: (feePercentage) => {
    const feeBps = feePercentage * 100; // Convert percentage to bps
    const isValid = feeBps >= CONTRACT_FEE_CONFIG.MIN_ORIGINATION_FEE && 
                    feeBps <= CONTRACT_FEE_CONFIG.MAX_ORIGINATION_FEE_BPS;
    
    return {
      isValid,
      providedBps: feeBps,
      maxAllowedBps: CONTRACT_FEE_CONFIG.MAX_ORIGINATION_FEE_BPS,
      expectedBps: CONTRACT_FEE_CONFIG.ORIGINATION_FEE_BPS,
      message: isValid 
        ? `Fee is within valid range (0-${CONTRACT_FEE_CONFIG.MAX_ORIGINATION_FEE_BPS/100}%)`
        : `Fee must be between 0% and ${CONTRACT_FEE_CONFIG.MAX_ORIGINATION_FEE_BPS/100}%`
    };
  },
  
  /**
   * Validate fee calculation matches contract
   * @param {number} loanAmount - The loan amount
   * @param {number} calculatedFee - The calculated fee
   * @returns {object} - Validation result
   */
  validateFeeCalculation: (loanAmount, calculatedFee) => {
    const expectedFee = loanAmount * (CONTRACT_FEE_CONFIG.ORIGINATION_FEE_BPS / 10000);
    const tolerance = expectedFee * 0.001; // 0.1% tolerance for rounding
    const difference = Math.abs(calculatedFee - expectedFee);
    const isValid = difference <= tolerance;
    
    return {
      isValid,
      expectedFee,
      providedFee: calculatedFee,
      difference,
      message: isValid
        ? 'Fee calculation matches contract'
        : `Fee mismatch: expected ${expectedFee.toFixed(2)}, got ${calculatedFee.toFixed(2)}`
    };
  },
  /**
   * Get fee configuration from API (with caching)
   */
  getFeeConfig: async () => {
    try {
      const response = await platformApi.get('/fee-config');
      if (response.data && response.data.fee_config) {
        updateFeeConfigCache(response.data.fee_config);
      }
      return response.data;
    } catch (error) {
      // Return cached config if API fails
      const cachedConfig = getEffectiveFeeConfig();
      return { fee_config: cachedConfig };
    }
  },

  /**
   * Update fee configuration (Admin only) - also updates cache
   */
  updateFees: async (fees) => {
    const response = await platformApi.post('/update-fees', { fees });
    // Update cache with new values after successful update
    if (response.data && response.data.fee_config) {
      updateFeeConfigCache(response.data.fee_config);
    }
    return response.data;
  },

  /**
   * Calculate fee preview
   */
  calculateFee: async (feeType, amount) => {
    const response = await platformApi.get('/calculate-fee', {
      params: { fee_type: feeType, amount }
    });
    return response.data;
  },

  /**
   * Get revenue summary
   */
  getRevenueSummary: async (params = {}) => {
    const response = await platformApi.get('/revenue-summary', { params });
    return response.data;
  },

  /**
   * Get revenue history
   */
  getRevenueHistory: async (params = {}) => {
    const response = await platformApi.get('/revenue-history', { params });
    return response.data;
  },

  /**
   * Get revenue analytics
   */
  getAnalytics: async (months = 12) => {
    const response = await platformApi.get('/analytics', {
      params: { months }
    });
    return response.data;
  },

  /**
   * Record loan origination fee
   */
  recordOriginationFee: async (data) => {
    const response = await platformApi.post('/record-origination-fee', data);
    return response.data;
  },

  /**
   * Record investor service fee
   */
  recordInvestorFee: async (data) => {
    const response = await platformApi.post('/record-investor-fee', data);
    return response.data;
  },

  /**
   * Record trading fee
   */
  recordTradingFee: async (data) => {
    const response = await platformApi.post('/record-trading-fee', data);
    return response.data;
  },

  /**
   * Record escrow fee
   */
  recordEscrowFee: async (data) => {
    const response = await platformApi.post('/record-escrow-fee', data);
    return response.data;
  },

  /**
   * Record liquidation commission
   */
  recordLiquidationFee: async (data) => {
    const response = await platformApi.post('/record-liquidation-fee', data);
    return response.data;
  },

  // ==================== Fee Calculations ====================

  /**
   * Calculate loan origination fee with contract validation
   * @param {number} loanAmount - The loan amount
   * @param {number} feePercentage - Origination fee percentage (default from config)
   * @returns {object} - Fee calculation result with validation
   */
  calculateOriginationFee: (loanAmount, feePercentage) => {
    // Use dynamic config if available, otherwise use parameter or default
    const effectiveConfig = getEffectiveFeeConfig();
    const defaultFeePercentage = effectiveConfig.ORIGINATION_FEE_BPS / 100;
    const finalFeePercentage = feePercentage !== undefined ? feePercentage : defaultFeePercentage;
    
    // Validate fee percentage against contract
    const validation = revenueService.validateOriginationFee(finalFeePercentage);
    
    const feeBps = Math.round(finalFeePercentage * 100);
    const contractFeeBps = effectiveConfig.ORIGINATION_FEE_BPS;
    
    // Use contract-configured fee if validation passes
    const validatedFeePercentage = validation.isValid ? finalFeePercentage : (contractFeeBps / 100);
    const feeAmount = loanAmount * (validatedFeePercentage / 100);
    const borrowerReceives = loanAmount - feeAmount;
    
    return {
      loanAmount,
      feePercentage: validatedFeePercentage,
      feeAmount,
      borrowerReceives,
      isValid: validation.isValid,
      isDynamic: effectiveConfig.isDynamic,
      validationMessage: validation.message
    };
  },

  /**
   * Calculate investor service fee
   * @param {number} interestEarned - Total interest earned by investor
   * @param {number} feePercentage - Service fee percentage (default from config)
   * @returns {object} - Fee calculation result
   */
  calculateInvestorFee: (interestEarned, feePercentage) => {
    const effectiveConfig = getEffectiveFeeConfig();
    const defaultFeePercentage = effectiveConfig.INVESTOR_FEE_BPS / 100;
    const finalFeePercentage = feePercentage !== undefined ? feePercentage : defaultFeePercentage;
    
    const feeAmount = interestEarned * (finalFeePercentage / 100);
    const netProfit = interestEarned - feeAmount;
    
    return {
      interestEarned,
      feePercentage: finalFeePercentage,
      feeAmount,
      netProfit,
      isDynamic: effectiveConfig.isDynamic
    };
  },

  /**
   * Calculate trading fee
   * @param {number} tradeAmount - Token trade amount
   * @param {number} feePercentage - Trading fee percentage (default from config)
   * @returns {object} - Fee calculation result
   */
  calculateTradingFee: (tradeAmount, feePercentage) => {
    const effectiveConfig = getEffectiveFeeConfig();
    const defaultFeePercentage = effectiveConfig.TRADING_FEE_BPS / 100;
    const finalFeePercentage = feePercentage !== undefined ? feePercentage : defaultFeePercentage;
    
    const feeAmount = tradeAmount * (finalFeePercentage / 100);
    const netReceived = tradeAmount - feeAmount;
    
    return {
      tradeAmount,
      feePercentage: finalFeePercentage,
      feeAmount,
      netReceived,
      isDynamic: effectiveConfig.isDynamic
    };
  },

  /**
   * Calculate escrow fee
   * @param {number} amount - Escrow transaction amount
   * @param {number} feePercentage - Escrow fee percentage (default from config)
   * @returns {object} - Fee calculation result
   */
  calculateEscrowFee: (amount, feePercentage) => {
    const effectiveConfig = getEffectiveFeeConfig();
    const defaultFeePercentage = effectiveConfig.ESCROW_FEE_BPS / 100;
    const finalFeePercentage = feePercentage !== undefined ? feePercentage : defaultFeePercentage;
    
    const feeAmount = amount * (finalFeePercentage / 100);
    const netSettlement = amount - feeAmount;
    
    return {
      amount,
      feePercentage: finalFeePercentage,
      feeAmount,
      netSettlement,
      isDynamic: effectiveConfig.isDynamic
    };
  },

  /**
   * Calculate liquidation commission
   * @param {number} salePrice - Winning bid/ sale price
   * @param {number} commissionPercentage - Commission percentage (default from config)
   * @param {number} reserveContribution - Amount to contribute to reserve pool
   * @returns {object} - Commission calculation result
   */
  calculateLiquidationCommission: (salePrice, commissionPercentage, reserveContribution = 0) => {
    const effectiveConfig = getEffectiveFeeConfig();
    const defaultCommissionPercentage = effectiveConfig.LIQUIDATION_COMMISSION_BPS / 100;
    const finalCommissionPercentage = commissionPercentage !== undefined ? commissionPercentage : defaultCommissionPercentage;
    
    const commissionAmount = salePrice * (finalCommissionPercentage / 100);
    const netAfterCommission = salePrice - commissionAmount;
    const reserveAmount = commissionAmount * (reserveContribution / 100);
    const platformNet = commissionAmount - reserveAmount;
    
    return {
      salePrice,
      commissionPercentage: finalCommissionPercentage,
      commissionAmount,
      reserveContribution,
      reserveAmount,
      netAfterCommission,
      platformNet,
      isDynamic: effectiveConfig.isDynamic
    };
  }
};

export default revenueService;
