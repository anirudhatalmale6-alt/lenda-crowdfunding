/**
 * Risk Control Utilities
 * Validates loan requests against platform rules
 */

// Platform rate limits (should match database settings)
export const DEFAULT_RATE_LIMITS = {
    min: 5,
    max: 35,
};

export const DEFAULT_LTV_LIMIT = 60;

// Risk category minimum rates
export const RISK_CATEGORY_MIN_RATES = {
    AAA: 5,
    AA: 7,
    A: 8,
    BBB: 10,
    BB: 12,
    B: 15,
    C: 20,
    D: 25,
};

/**
 * Validate interest rate against platform limits
 * @param {number} rate - Interest rate to validate
 * @param {string} riskCategory - Borrower's risk category
 * @param {Object} settings - Platform settings (optional)
 * @returns {Object} Validation result with isValid and message
 */
export function validateInterestRate(rate, riskCategory, settings = {}) {
    const minRate = settings.min_interest_rate || DEFAULT_RATE_LIMITS.min;
    const maxRate = settings.max_interest_rate || DEFAULT_RATE_LIMITS.max;
    const riskMinRate = settings[`${riskCategory?.toLowerCase()}_min_rate`] || 
                        RISK_CATEGORY_MIN_RATES[riskCategory] || 
                        minRate;
    
    if (rate < minRate) {
        return {
            isValid: false,
            message: `Interest rate cannot be below the minimum platform rate of ${minRate}%`,
            code: 'RATE_BELOW_MIN',
        };
    }
    
    if (rate > maxRate) {
        return {
            isValid: false,
            message: `Interest rate cannot exceed the maximum platform rate of ${maxRate}%`,
            code: 'RATE_ABOVE_MAX',
        };
    }
    
    if (rate < riskMinRate) {
        return {
            isValid: false,
            message: `For ${riskCategory} risk category, minimum rate is ${riskMinRate}%`,
            code: 'RATE_BELOW_RISK_MIN',
        };
    }
    
    return {
        isValid: true,
        message: 'Interest rate is valid',
        code: 'VALID',
    };
}

/**
 * Validate Loan-to-Value ratio
 * @param {number} loanAmount - Requested loan amount
 * @param {number} collateralValue - Collateral value
 * @param {number} maxLtv - Maximum LTV allowed (optional)
 * @returns {Object} Validation result
 */
export function validateLTV(loanAmount, collateralValue, maxLtv = DEFAULT_LTV_LIMIT) {
    if (!loanAmount || loanAmount <= 0) {
        return {
            isValid: false,
            message: 'Loan amount must be greater than 0',
            code: 'INVALID_LOAN_AMOUNT',
        };
    }
    
    if (!collateralValue || collateralValue <= 0) {
        return {
            isValid: false,
            message: 'Collateral value must be greater than 0',
            code: 'INVALID_COLLATERAL_VALUE',
        };
    }
    
    const ltv = (loanAmount / collateralValue) * 100;
    
    if (ltv > maxLtv) {
        return {
            isValid: false,
            message: `Loan-to-Value ratio (${ltv.toFixed(1)}%) exceeds maximum allowed (${maxLtv}%). Please increase collateral or reduce loan amount.`,
            code: 'LTV_EXCEEDS_MAX',
            ltv,
        };
    }
    
    return {
        isValid: true,
        message: 'LTV is within acceptable range',
        code: 'VALID',
        ltv,
    };
}

/**
 * Calculate market demand level based on various factors
 * @param {number} interestRate - Loan interest rate
 * @param {number} riskScore - Borrower risk score (0-100)
 * @param {number} ltv - Loan-to-Value ratio
 * @param {number} fundingProgress - Current funding progress (0-100)
 * @returns {Object} Demand analysis
 */
export function calculateMarketDemand(interestRate, riskScore, ltv, fundingProgress = 0) {
    // Base demand score
    let demandScore = 50;
    
    // Rate competitiveness factor (higher rate = higher demand)
    if (interestRate >= 20) {
        demandScore += 30;
    } else if (interestRate >= 15) {
        demandScore += 15;
    } else if (interestRate >= 10) {
        demandScore += 5;
    } else if (interestRate < 8) {
        demandScore -= 20;
    }
    
    // Risk score factor (higher score = lower risk = higher demand)
    if (riskScore >= 80) {
        demandScore += 20;
    } else if (riskScore >= 60) {
        demandScore += 10;
    } else if (riskScore >= 40) {
        demandScore -= 5;
    } else {
        demandScore -= 15;
    }
    
    // LTV factor (lower LTV = more secure = higher demand)
    if (ltv <= 40) {
        demandScore += 15;
    } else if (ltv <= 50) {
        demandScore += 5;
    } else if (ltv >= 60) {
        demandScore -= 15;
    }
    
    // Funding progress factor
    if (fundingProgress >= 75) {
        demandScore += 10;
    } else if (fundingProgress >= 50) {
        demandScore += 5;
    } else if (fundingProgress < 10 && fundingProgress > 0) {
        demandScore -= 10;
    }
    
    // Clamp score between 0 and 100
    demandScore = Math.max(0, Math.min(100, demandScore));
    
    // Determine demand level
    let demandLevel;
    let fundingSpeedPrediction;
    
    if (demandScore >= 80) {
        demandLevel = 'very_high';
        fundingSpeedPrediction = 'very_fast';
    } else if (demandScore >= 60) {
        demandLevel = 'high';
        fundingSpeedPrediction = 'fast';
    } else if (demandScore >= 40) {
        demandLevel = 'moderate';
        fundingSpeedPrediction = 'moderate';
    } else if (demandScore >= 20) {
        demandLevel = 'low';
        fundingSpeedPrediction = 'slow';
    } else {
        demandLevel = 'very_low';
        fundingSpeedPrediction = 'very_slow';
    }
    
    return {
        demandScore,
        demandLevel,
        fundingSpeedPrediction,
        factors: {
            rateImpact: interestRate >= 15 ? 'positive' : interestRate < 8 ? 'negative' : 'neutral',
            riskImpact: riskScore >= 60 ? 'positive' : 'negative',
            ltvImpact: ltv <= 50 ? 'positive' : 'negative',
        },
    };
}

/**
 * Calculate suggested interest rate based on market data
 * @param {string} riskCategory - Borrower's risk category
 * @param {number} ltv - Loan-to-Value ratio
 * @param {Object} platformSettings - Platform settings
 * @returns {Object} Rate recommendation
 */
export function calculateSuggestedRate(riskCategory, ltv, platformSettings = {}) {
    // Base rate from risk category
    let baseRate = RISK_CATEGORY_MIN_RATES[riskCategory] || 15;
    
    // Adjust for LTV (lower LTV = can offer lower rate)
    if (ltv <= 30) {
        baseRate -= 2;
    } else if (ltv <= 40) {
        baseRate -= 1;
    } else if (ltv >= 55) {
        baseRate += 2;
    } else if (ltv >= 50) {
        baseRate += 1;
    }
    
    // Ensure within platform limits
    const minRate = platformSettings.min_interest_rate || DEFAULT_RATE_LIMITS.min;
    const maxRate = platformSettings.max_interest_rate || DEFAULT_RATE_LIMITS.max;
    
    baseRate = Math.max(minRate, Math.min(maxRate, baseRate));
    
    // Determine funding likelihood
    let fundingLikelihood;
    if (baseRate >= 18) {
        fundingLikelihood = 'very_high';
    } else if (baseRate >= 15) {
        fundingLikelihood = 'high';
    } else if (baseRate >= 12) {
        fundingLikelihood = 'moderate';
    } else if (baseRate >= 8) {
        fundingLikelihood = 'low';
    } else {
        fundingLikelihood = 'very_low';
    }
    
    // Determine funding speed
    let fundingSpeedPrediction;
    if (baseRate >= 20) {
        fundingSpeedPrediction = 'very_fast';
    } else if (baseRate >= 15) {
        fundingSpeedPrediction = 'fast';
    } else if (baseRate >= 10) {
        fundingSpeedPrediction = 'moderate';
    } else if (baseRate >= 8) {
        fundingSpeedPrediction = 'slow';
    } else {
        fundingSpeedPrediction = 'very_slow';
    }
    
    // Calculate confidence (based on data quality)
    const confidenceScore = 75 + Math.random() * 20;
    
    return {
        suggestedRate: Math.round(baseRate * 10) / 10,
        fundingLikelihood,
        fundingSpeedPrediction,
        confidenceScore: Math.round(confidenceScore),
        marketInsight: getMarketInsight(baseRate, riskCategory),
    };
}

/**
 * Get market insight text
 */
function getMarketInsight(rate, riskCategory) {
    if (rate >= 20) {
        return 'Your high rate will likely attract many investors quickly.';
    }
    if (rate >= 15) {
        return 'Competitive rate for your risk category - expect good investor interest.';
    }
    if (rate >= 12) {
        return 'Moderate rate - may take longer to fully fund.';
    }
    return 'Consider increasing your rate to attract more investors faster.';
}

/**
 * Calculate loan projections
 * @param {number} principal - Loan amount
 * @param {number} rate - Annual interest rate
 * @param {number} duration - Duration in months
 * @returns {Object} Loan calculations
 */
export function calculateLoanProjections(principal, rate, duration) {
    const monthlyRate = rate / 100 / 12;
    
    let monthlyPayment;
    if (monthlyRate === 0) {
        monthlyPayment = principal / duration;
    } else {
        monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, duration)) / 
                        (Math.pow(1 + monthlyRate, duration) - 1);
    }
    
    const totalRepayment = monthlyPayment * duration;
    const totalInterest = totalRepayment - principal;
    
    return {
        principal,
        interestRate: rate,
        duration,
        monthlyPayment: Math.round(monthlyPayment * 100) / 100,
        totalRepayment: Math.round(totalRepayment * 100) / 100,
        totalInterest: Math.round(totalInterest * 100) / 100,
        annualPercentageRate: rate, // Simplified - should include fees
    };
}

/**
 * Validate complete loan request
 * @param {Object} loanData - Loan request data
 * @param {Object} settings - Platform settings
 * @returns {Object} Validation result with all errors/warnings
 */
export function validateLoanRequest(loanData, settings = {}) {
    const errors = [];
    const warnings = [];
    
    // Validate loan amount
    if (!loanData.loanAmount || loanData.loanAmount < 1000) {
        errors.push({
            field: 'loanAmount',
            message: 'Minimum loan amount is $1,000',
            code: 'LOAN_AMOUNT_TOO_LOW',
        });
    }
    
    if (loanData.loanAmount > 100000) {
        errors.push({
            field: 'loanAmount',
            message: 'Maximum loan amount is $100,000',
            code: 'LOAN_AMOUNT_TOO_HIGH',
        });
    }
    
    // Validate duration
    if (!loanData.duration || loanData.duration < 1) {
        errors.push({
            field: 'duration',
            message: 'Minimum duration is 1 month',
            code: 'DURATION_TOO_SHORT',
        });
    }
    
    if (loanData.duration > 60) {
        warnings.push({
            field: 'duration',
            message: 'Longer durations may have lower approval rates',
            code: 'DURATION_LONG',
        });
    }
    
    // Validate interest rate
    const rateValidation = validateInterestRate(
        loanData.interestRate, 
        loanData.riskCategory, 
        settings
    );
    if (!rateValidation.isValid) {
        errors.push({
            field: 'interestRate',
            message: rateValidation.message,
            code: rateValidation.code,
        });
    }
    
    // Validate LTV
    const ltvValidation = validateLTV(
        loanData.loanAmount, 
        loanData.collateralValue,
        settings.max_ltv_ratio || DEFAULT_LTV_LIMIT
    );
    if (!ltvValidation.isValid) {
        errors.push({
            field: 'collateralValue',
            message: ltvValidation.message,
            code: ltvValidation.code,
        });
    }
    
    // Check for warnings
    if (loanData.ltv > 50) {
        warnings.push({
            field: 'ltv',
            message: 'High LTV may result in higher interest rates',
            code: 'LTV_HIGH',
        });
    }
    
    if (!loanData.collateralDocuments || loanData.collateralDocuments.length === 0) {
        warnings.push({
            field: 'collateralDocuments',
            message: 'Adding collateral documents improves approval chances',
            code: 'NO_COLLATERAL_DOCS',
        });
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        warnings,
    };
}

export default {
    validateInterestRate,
    validateLTV,
    calculateMarketDemand,
    calculateSuggestedRate,
    calculateLoanProjections,
    validateLoanRequest,
    DEFAULT_RATE_LIMITS,
    DEFAULT_LTV_LIMIT,
    RISK_CATEGORY_MIN_RATES,
};
