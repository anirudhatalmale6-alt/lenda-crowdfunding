/**
 * Refinancing Match Engine Service (RISK-004)
 * Matching algorithm for investor-refinancing opportunities
 */

import apiClient from '../utils/api/client';

/**
 * Get matched refinancing opportunities for an investor
 * @param {Object} investorProfile - Investor profile criteria
 * @returns {Promise}
 */
export const getMatchedOpportunities = async (investorProfile) => {
  try {
    const response = await apiClient.post('/api/refinancing/match', investorProfile);
    return response.data;
  } catch (error) {
    console.error('Error fetching matched opportunities:', error);
    throw error;
  }
};

/**
 * Get refinancing match score for a specific opportunity
 * @param {number} opportunityId - Refinancing opportunity ID
 * @returns {Promise}
 */
export const getMatchScore = async (opportunityId) => {
  try {
    const response = await apiClient.get(`/api/refinancing/${opportunityId}/match-score`);
    return response.data;
  } catch (error) {
    console.error('Error fetching match score:', error);
    throw error;
  }
};

/**
 * Get investor recommendations
 * @param {number} minScore - Minimum match score (0-100)
 * @returns {Promise}
 */
export const getRecommendations = async (minScore = 50) => {
  try {
    const response = await apiClient.get('/api/refinancing/recommendations', {
      params: { minScore }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    throw error;
  }
};

/**
 * Get market analytics for refinancing
 * @returns {Promise}
 */
export const getRefinancingMarketAnalytics = async () => {
  try {
    const response = await apiClient.get('/api/refinancing/market-analytics');
    return response.data;
  } catch (error) {
    console.error('Error fetching market analytics:', error);
    throw error;
  }
};

/**
 * Get borrower refinancing eligibility
 * @param {number} borrowerId - Borrower ID
 * @returns {Promise}
 */
export const getBorrowerEligibility = async (borrowerId) => {
  try {
    const response = await apiClient.get(`/api/refinancing/borrower/${borrowerId}/eligibility`);
    return response.data;
  } catch (error) {
    console.error('Error fetching borrower eligibility:', error);
    throw error;
  }
};

/**
 * Submit refinancing application
 * @param {Object} applicationData - Application data
 * @returns {Promise}
 */
export const submitRefinancingApplication = async (applicationData) => {
  try {
    const response = await apiClient.post('/api/refinancing/apply', applicationData);
    return response.data;
  } catch (error) {
    console.error('Error submitting refinancing application:', error);
    throw error;
  }
};

/**
 * Accept a matched refinancing opportunity
 * @param {number} opportunityId - Opportunity ID
 * @param {number} investmentAmount - Amount to invest
 * @returns {Promise}
 */
export const acceptMatchedOpportunity = async (opportunityId, investmentAmount) => {
  try {
    const response = await apiClient.post(`/api/refinancing/${opportunityId}/accept`, {
      amount: investmentAmount
    });
    return response.data;
  } catch (error) {
    console.error('Error accepting matched opportunity:', error);
    throw error;
  }
};

/**
 * Get refinancing portfolio summary for investor
 * @returns {Promise}
 */
export const getRefinancingPortfolio = async () => {
  try {
    const response = await apiClient.get('/api/refinancing/portfolio');
    return response.data;
  } catch (error) {
    console.error('Error fetching refinancing portfolio:', error);
    throw error;
  }
};

/**
 * Update investor preferences for matching
 * @param {Object} preferences - Investment preferences
 * @returns {Promise}
 */
export const updateInvestorPreferences = async (preferences) => {
  try {
    const response = await apiClient.put('/api/refinancing/investor/preferences', preferences);
    return response.data;
  } catch (error) {
    console.error('Error updating investor preferences:', error);
    throw error;
  }
};

// Match criteria configuration
export const MATCH_CRITERIA = {
  // Risk tolerance levels
  RISK_TOLERANCE: {
    CONSERVATIVE: { label: 'Conservative', maxDefaultProbability: 10 },
    MODERATE: { label: 'Moderate', maxDefaultProbability: 25 },
    AGGRESSIVE: { label: 'Aggressive', maxDefaultProbability: 40 }
  },
  
  // Minimum credit score thresholds
  CREDIT_SCORE_THRESHOLDS: {
    EXCELLENT: 750,
    GOOD: 700,
    FAIR: 650,
    POOR: 600
  },
  
  // Preferred loan characteristics
  LOAN_CHARACTERISTICS: {
    minCollateralCoverage: 1.2, // Collateral should be 120% of loan
    maxLoanAge: 12, // months
    maxRemainingTerm: 24 // months
  },
  
  // Investment preferences
  INVESTMENT_PREFERENCES: {
    minInvestmentAmount: 100,
    maxInvestmentAmount: 50000,
    preferredLoanSizes: ['small', 'medium', 'large'] // <10k, 10k-50k, >50k
  }
};

export default {
  getMatchedOpportunities,
  getMatchScore,
  getRecommendations,
  getRefinancingMarketAnalytics,
  getBorrowerEligibility,
  submitRefinancingApplication,
  acceptMatchedOpportunity,
  getRefinancingPortfolio,
  updateInvestorPreferences,
  MATCH_CRITERIA
};
