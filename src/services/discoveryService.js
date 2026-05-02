/**
 * LENDA AI Loan Discovery Engine Service
 * Matches investors with loan opportunities based on their preferences
 */

import { createApiClient } from '../utils/api/client';

const API_URL = '/api/discovery';

const api = createApiClient(API_URL);

// Default weight configuration
const DEFAULT_WEIGHTS = {
    interestRateWeight: 25,
    riskMatchWeight: 25,
    reputationWeight: 20,
    fundingMomentumWeight: 15,
    collateralWeight: 15,
};

const discoveryService = {
    /**
     * Get personalized loan recommendations for an investor
     * @param {Object} filters - Additional filters to apply
     */
    getRecommendedLoans: async (filters = {}) => {
        const response = await api.get('/recommended-loans', { params: filters });
        return response.data;
    },

    /**
     * Get high yield loan opportunities
     */
    getHighYieldOpportunities: async (filters = {}) => {
        const response = await api.get('/high-yield', { params: filters });
        return response.data;
    },

    /**
     * Get low risk loan opportunities
     */
    getLowRiskLoans: async (filters = {}) => {
        const response = await api.get('/low-risk', { params: filters });
        return response.data;
    },

    /**
     * Get loans that are closing soon (≥80% funded)
     */
    getClosingSoonLoans: async (filters = {}) => {
        const response = await api.get('/closing-soon', { params: filters });
        return response.data;
    },

    /**
     * Get discovery score for a specific loan
     * @param {string|number} loanId - The loan ID
     */
    getLoanDiscoveryScore: async (loanId) => {
        const response = await api.get(`/discovery-score/${loanId}`);
        return response.data;
    },

    /**
     * Save or update investor preferences
     * @param {Object} preferences - Investor preference data
     */
    savePreferences: async (preferences) => {
        const response = await api.post('/preferences', preferences);
        return response.data;
    },

    /**
     * Get investor preferences
     */
    getPreferences: async () => {
        const response = await api.get('/preferences');
        return response.data;
    },

    /**
     * Get loan demand indicator for a borrower
     * @param {string|number} loanId - The loan ID
     */
    getLoanDemandIndicator: async (loanId) => {
        const response = await api.get(`/demand-indicator/${loanId}`);
        return response.data;
    },

    /**
     * Track investor behavior for AI learning
     * @param {Object} behaviorData - Behavior event data
     */
    trackBehavior: async (behaviorData) => {
        const response = await api.post('/track-behavior', behaviorData);
        return response.data;
    },

    /**
     * Get filtered marketplace loans
     * @param {Object} filters - Filter parameters
     */
    getFilteredLoans: async (filters = {}) => {
        const response = await api.get('/filtered-loans', { params: filters });
        return response.data;
    },

    /**
     * Get all loan feed sections for dashboard
     */
    getFullFeed: async () => {
        const response = await api.get('/full-feed');
        return response.data;
    },

    /**
     * Get discovery analytics for admin
     * @param {Object} params - Time range and metrics parameters
     */
    getAnalytics: async (params = {}) => {
        const response = await api.get('/analytics', { params });
        return response.data;
    },

    /**
     * Get recommendation weights for investor
     */
    getRecommendationWeights: async () => {
        const response = await api.get('/weights');
        return response.data;
    },

    /**
     * Update recommendation weights based on behavior
     * @param {Object} weights - New weight values
     */
    updateWeights: async (weights) => {
        const response = await api.post('/weights', weights);
        return response.data;
    },
};

/**
 * Loan Discovery Score Calculator (Client-side utility)
 * Calculates discovery score based on loan and investor preference matching
 */
export const calculateDiscoveryScore = (
    loan,
    investorPreferences,
    weights = DEFAULT_WEIGHTS
) => {
    const {
        interestRateWeight,
        riskMatchWeight,
        reputationWeight,
        fundingMomentumWeight,
        collateralWeight,
    } = weights;

    // 1. Interest Rate Attractiveness Score (0-100)
    // Higher rates within investor's range = higher score
    const minRate = investorPreferences.minInterestRate || 0;
    const maxRate = investorPreferences.maxInterestRate || 30;
    const loanRate = loan.interest_rate || loan.interestRate || 0;

    let rateAttractiveness = 0;
    if (loanRate >= minRate && loanRate <= maxRate) {
        // Rate is in preferred range - calculate how attractive
        const rangeSize = maxRate - minRate || 1;
        rateAttractiveness = ((loanRate - minRate) / rangeSize) * 100;
    } else if (loanRate > maxRate) {
        // Rate above max - still good but less preferred
        rateAttractiveness = Math.max(0, 100 - ((loanRate - maxRate) * 10));
    } else {
        // Rate below min - not attractive
        rateAttractiveness = Math.max(0, 50 - ((minRate - loanRate) * 5));
    }

    // 2. Risk Match Score (0-100)
    const investorRiskTolerance = investorPreferences.riskTolerance || 'medium';
    const loanRiskScore = loan.risk_score || loan.riskScore || 50;

    // Map risk tolerance to acceptable score range
    const riskRanges = {
        low: { min: 0, max: 30 },
        medium: { min: 0, max: 50 },
        high: { min: 0, max: 70 },
        very_high: { min: 0, max: 100 },
    };

    const range = riskRanges[investorRiskTolerance] || riskRanges.medium;
    let riskMatch = 0;
    if (loanRiskScore >= range.min && loanRiskScore <= range.max) {
        riskMatch = 100 - Math.abs(loanRiskScore - (range.min + range.max) / 2);
    } else if (loanRiskScore < range.min) {
        riskMatch = Math.max(0, 50 - (range.min - loanRiskScore) * 2);
    } else {
        riskMatch = Math.max(0, 50 - (loanRiskScore - range.max) * 2);
    }

    // 3. Reputation Score (0-100)
    const borrowerReputation = loan.borrower_reputation_score || loan.borrowerReputationScore || 50;
    const reputationScore = borrowerReputation;

    // 4. Funding Momentum Score (0-100)
    // Loans with good progress (but not fully funded) get higher scores
    const fundedAmount = loan.funded_amount || loan.fundedAmount || 0;
    const loanAmount = loan.loan_amount || loan.loanAmount || 1;
    const fundingProgress = (fundedAmount / loanAmount) * 100;

    let fundingMomentum = 0;
    if (fundingProgress >= 80) {
        // Closing soon - boost score
        fundingMomentum = 100;
    } else if (fundingProgress >= 50) {
        fundingMomentum = 80;
    } else if (fundingProgress >= 25) {
        fundingMomentum = 60;
    } else if (fundingProgress > 0) {
        fundingMomentum = 40;
    } else {
        fundingMomentum = 20; // Just listed
    }

    // 5. Collateral Quality Score (0-100)
    const collateralTypes = investorPreferences.preferredCollateralTypes || [];
    const loanCollateralType = loan.collateral_type || loan.collateralType || '';
    const loanLtvRatio = loan.ltv_ratio || loan.ltvRatio || 0;

    let collateralScore = 50; // Default neutral score

    if (collateralTypes.length > 0 && loanCollateralType) {
        if (collateralTypes.includes(loanCollateralType)) {
            collateralScore = 100;
        } else {
            collateralScore = 30;
        }
    }

    // Adjust for LTV - lower LTV = better collateral
    if (loanLtvRatio <= 50) {
        collateralScore = Math.min(100, collateralScore + 20);
    } else if (loanLtvRatio <= 70) {
        collateralScore = Math.min(100, collateralScore + 10);
    } else if (loanLtvRatio > 80) {
        collateralScore = Math.max(0, collateralScore - 20);
    }

    // 6. Closing Soon Boost (if applicable)
    let closingSoonBoost = 0;
    if (fundingProgress >= 80 && fundingProgress < 100) {
        closingSoonBoost = 20; // 20 point boost for closing soon
    }

    // Calculate weighted final score
    const totalScore =
        (interestRateWeight * rateAttractiveness) +
        (riskMatchWeight * riskMatch) +
        (reputationWeight * reputationScore) +
        (fundingMomentumWeight * fundingMomentum) +
        (collateralWeight * collateralScore);

    // Normalize to 0-100 scale
    const maxPossibleScore = (
        interestRateWeight +
        riskMatchWeight +
        reputationWeight +
        fundingMomentumWeight +
        collateralWeight
    ) * 100;

    const normalizedScore = Math.min(100, (totalScore / maxPossibleScore) * 100);

    // Add closing soon boost
    const finalScore = normalizedScore + closingSoonBoost;

    return {
        discoveryScore: Math.round(finalScore * 100) / 100,
        components: {
            interestScore: Math.round(rateAttractiveness),
            riskMatchScore: Math.round(riskMatch),
            reputationScore: Math.round(reputationScore),
            fundingMomentumScore: Math.round(fundingMomentum),
            collateralScore: Math.round(collateralScore),
            closingSoonBoost,
        },
    };
};

/**
 * Calculate loan demand indicator for borrowers
 */
export const calculateLoanDemand = (loan, marketData = {}) => {
    const fundedAmount = loan.funded_amount || loan.fundedAmount || 0;
    const loanAmount = loan.loan_amount || loan.loanAmount || 1;
    const fundingProgress = (fundedAmount / loanAmount) * 100;

    const viewCount = loan.view_count || marketData.viewCount || 0;
    const investmentIntentCount = loan.investment_intent_count || marketData.investmentIntentCount || 0;
    const avgMatchScore = loan.avg_match_score || marketData.avgMatchScore || 50;

    // Calculate demand score
    let demandScore = 50; // Default medium

    // Progress factor (higher progress = higher demand if not fully funded)
    if (fundingProgress >= 80 && fundingProgress < 100) {
        demandScore += 30;
    } else if (fundingProgress >= 50) {
        demandScore += 15;
    } else if (fundingProgress > 0) {
        demandScore += 5;
    }

    // Intent factor
    if (investmentIntentCount > 10) {
        demandScore += 20;
    } else if (investmentIntentCount > 5) {
        demandScore += 10;
    } else if (investmentIntentCount > 0) {
        demandScore += 5;
    }

    // Match score factor
    if (avgMatchScore >= 70) {
        demandScore += 15;
    } else if (avgMatchScore >= 50) {
        demandScore += 5;
    } else {
        demandScore -= 10;
    }

    // Determine demand level
    let demandLevel = 'medium';
    if (demandScore >= 80) {
        demandLevel = 'very_high';
    } else if (demandScore >= 65) {
        demandLevel = 'high';
    } else if (demandScore >= 40) {
        demandLevel = 'medium';
    } else if (demandScore >= 25) {
        demandLevel = 'low';
    } else {
        demandLevel = 'very_low';
    }

    // Determine investor interest
    let investorInterest = 'Moderate';
    if (demandScore >= 75) {
        investorInterest = 'Very Strong';
    } else if (demandScore >= 60) {
        investorInterest = 'Strong';
    } else if (demandScore >= 40) {
        investorInterest = 'Moderate';
    } else if (demandScore >= 25) {
        investorInterest = 'Weak';
    } else {
        investorInterest = 'Very Weak';
    }

    // Generate suggestion
    let suggestion = 'Loan is attracting moderate interest from investors.';
    if (demandLevel === 'very_high' || demandLevel === 'high') {
        suggestion = 'Loan is likely to fund quickly. Consider sharing to attract more investors.';
    } else if (demandLevel === 'low' || demandLevel === 'very_low') {
        suggestion = 'Consider adjusting your interest rate or adding collateral to attract more investors.';
    }

    return {
        demandLevel,
        investorInterest,
        suggestion,
        demandScore: Math.min(100, Math.max(0, demandScore)),
        fundingProgress: Math.round(fundingProgress * 100) / 100,
    };
};

export default discoveryService;
