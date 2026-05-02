/**
 * DiversificationService - Investment diversification recommendations
 * Helps investors build a balanced portfolio across different loan risk profiles
 */

// Risk categories for loans
export const RISK_CATEGORIES = {
    LOW: { label: 'Low Risk', maxLTV: 30, color: 'green' },
    MEDIUM: { label: 'Medium Risk', maxLTV: 60, color: 'yellow' },
    HIGH: { label: 'High Risk', maxLTV: 100, color: 'red' },
};

// Target allocation percentages
const TARGET_ALLOCATION = {
    LOW: 50,      // 50% in low-risk loans
    MEDIUM: 30,   // 30% in medium-risk loans
    HIGH: 20,     // 20% in high-risk loans
};

// Maximum exposure per loan
const MAX_EXPOSURE_PER_LOAN = 0.1; // 10% of portfolio per loan
// Maximum exposure per borrower
const MAX_EXPOSURE_PER_BORROWER = 0.2; // 20% of portfolio per borrower

class DiversificationService {
    constructor() {
        this.minimumPortfolioSize = 100; // Minimum investment for recommendations
    }

    /**
     * Analyze current portfolio diversification
     * @param {Array} investments - Array of { loanId, amount, riskLevel, borrowerId }
     * @returns {Object} Portfolio analysis
     */
    analyzePortfolio(investments) {
        if (!investments || investments.length === 0) {
            return this._getEmptyAnalysis();
        }

        const totalValue = investments.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
        
        if (totalValue < this.minimumPortfolioSize) {
            return {
                ...this._getEmptyAnalysis(),
                warning: 'Portfolio too small for meaningful diversification',
            };
        }

        // Calculate current allocation by risk category
        const allocation = {
            LOW: 0,
            MEDIUM: 0,
            HIGH: 0,
        };

        const borrowerExposure = new Map();
        const loanExposure = new Map();

        investments.forEach(inv => {
            const riskLevel = inv.riskLevel || 'MEDIUM';
            allocation[riskLevel] += parseFloat(inv.amount);

            // Track borrower exposure
            const borrowerTotal = borrowerExposure.get(inv.borrowerId) || 0;
            borrowerExposure.set(inv.borrowerId, borrowerTotal + parseFloat(inv.amount));

            // Track loan exposure
            const loanTotal = loanExposure.get(inv.loanId) || 0;
            loanExposure.set(inv.loanId, loanTotal + parseFloat(inv.amount));
        });

        // Convert to percentages
        const allocationPercentages = {
            LOW: (allocation.LOW / totalValue) * 100,
            MEDIUM: (allocation.MEDIUM / totalValue) * 100,
            HIGH: (allocation.HIGH / totalValue) * 100,
        };

        // Check for overexposure
        const overexposedLoans = [];
        const overexposedBorrowers = [];

        loanExposure.forEach((amount, loanId) => {
            if (amount / totalValue > MAX_EXPOSURE_PER_LOAN) {
                overexposedLoans.push({ loanId, amount, percentage: (amount / totalValue) * 100 });
            }
        });

        borrowerExposure.forEach((amount, borrowerId) => {
            if (amount / totalValue > MAX_EXPOSURE_PER_BORROWER) {
                overexposedBorrowers.push({ borrowerId, amount, percentage: (amount / totalValue) * 100 });
            }
        });

        // Calculate diversification score (0-100)
        const diversificationScore = this._calculateDiversificationScore(
            allocationPercentages,
            overexposedLoans.length,
            overexposedBorrowers.length
        );

        return {
            totalValue,
            allocation: allocationPercentages,
            targetAllocation: TARGET_ALLOCATION,
            diversificationScore,
            overexposedLoans,
            overexposedBorrowers,
            loanCount: investments.length,
            borrowerCount: borrowerExposure.size,
            isBalanced: diversificationScore >= 70,
        };
    }

    /**
     * Get investment recommendations
     * @param {Object} portfolioAnalysis - Result from analyzePortfolio
     * @param {Array} availableLoans - Array of available loans to invest in
     * @returns {Object} Recommendations
     */
    getRecommendations(portfolioAnalysis, availableLoans = []) {
        const recommendations = {
            actions: [],
            suggestedLoans: [],
            rebalancingNeeded: false,
            maxInvestmentPerLoan: 0,
        };

        if (!portfolioAnalysis.totalValue) {
            return recommendations;
        }

        // Calculate recommended investment amounts
        recommendations.maxInvestmentPerLoan = Math.min(
            portfolioAnalysis.totalValue * MAX_EXPOSURE_PER_LOAN,
            portfolioAnalysis.totalValue * 0.1 // Default 10% max
        );

        // Check if rebalancing is needed
        const { LOW, MEDIUM, HIGH } = portfolioAnalysis.allocation;
        
        if (LOW < TARGET_ALLOCATION.LOW - 10) {
            recommendations.actions.push({
                type: 'UNDERWEIGHT_LOW_RISK',
                message: `Consider investing more in low-risk loans. Current: ${LOW.toFixed(1)}%, Target: ${TARGET_ALLOCATION.LOW}%`,
                priority: 'medium',
            });
            recommendations.rebalancingNeeded = true;
        }

        if (HIGH > TARGET_ALLOCATION.HIGH + 10) {
            recommendations.actions.push({
                type: 'OVERWEIGHT_HIGH_RISK',
                message: `Consider reducing high-risk exposure. Current: ${HIGH.toFixed(1)}%, Target: ${TARGET_ALLOCATION.HIGH}%`,
                priority: 'high',
            });
            recommendations.rebalancingNeeded = true;
        }

        if (portfolioAnalysis.overexposedLoans.length > 0) {
            recommendations.actions.push({
                type: 'OVEREXPOSED_LOANS',
                message: `${portfolioAnalysis.overexposedLoans.length} loans are overexposed. Consider diversifying.`,
                priority: 'high',
            });
            recommendations.rebalancingNeeded = true;
        }

        // Find suitable loans for investment
        if (availableLoans.length > 0) {
            const underweightCategory = this._getUnderweightCategory(portfolioAnalysis.allocation);
            
            recommendations.suggestedLoans = availableLoans
                .filter(loan => loan.riskLevel === underweightCategory)
                .sort((a, b) => b.interestRate - a.interestRate)
                .slice(0, 5)
                .map(loan => ({
                    ...loan,
                    recommendedAmount: this._calculateRecommendedAmount(
                        loan,
                        portfolioAnalysis.totalValue,
                        underweightCategory
                    ),
                }));
        }

        return recommendations;
    }

    /**
     * Calculate optimal portfolio allocation
     * @param {number} totalInvestment - Total amount to invest
     * @param {Object} availableLoans - Loans available for investment
     * @returns {Object} Optimal allocation
     */
    calculateOptimalAllocation(totalInvestment, availableLoans = []) {
        const allocation = {
            LOW: 0,
            MEDIUM: 0,
            HIGH: 0,
            loans: [],
        };

        if (!availableLoans || availableLoans.length === 0) {
            // Return target allocation even without available loans
            return {
                LOW: totalInvestment * TARGET_ALLOCATION.LOW / 100,
                MEDIUM: totalInvestment * TARGET_ALLOCATION.MEDIUM / 100,
                HIGH: totalInvestment * TARGET_ALLOCATION.HIGH / 100,
                total: totalInvestment,
            };
        }

        // Group available loans by risk category
        const loansByRisk = {
            LOW: availableLoans.filter(l => l.riskLevel === 'LOW'),
            MEDIUM: availableLoans.filter(l => l.riskLevel === 'MEDIUM'),
            HIGH: availableLoans.filter(l => l.riskLevel === 'HIGH'),
        };

        // Calculate allocation based on target percentages
        const targetLow = totalInvestment * TARGET_ALLOCATION.LOW / 100;
        const targetMedium = totalInvestment * TARGET_ALLOCATION.MEDIUM / 100;
        const targetHigh = totalInvestment * TARGET_ALLOCATION.HIGH / 100;

        // Distribute investments across risk categories
        Object.keys(loansByRisk).forEach(risk => {
            const loans = loansByRisk[risk];
            let targetAmount = risk === 'LOW' ? targetLow : risk === 'MEDIUM' ? targetMedium : targetHigh;
            
            loans.forEach(loan => {
                const availableAmount = parseFloat(loan.loanAmount) - parseFloat(loan.fundedAmount || 0);
                const investmentAmount = Math.min(targetAmount, availableAmount);
                
                if (investmentAmount > 0) {
                    allocation.loans.push({
                        loanId: loan.id,
                        amount: investmentAmount,
                        riskLevel: risk,
                    });
                    allocation[risk] += investmentAmount;
                    targetAmount -= investmentAmount;
                }
            });
        });

        return {
            ...allocation,
            total: totalInvestment,
        };
    }

    /**
     * Get risk assessment for a potential investment
     * @param {Object} loan - Loan details
     * @param {Object} currentPortfolio - Current portfolio analysis
     * @returns {Object} Risk assessment
     */
    assessInvestmentRisk(loan, currentPortfolio) {
        const ltv = parseFloat(loan.ltv || 0);
        let riskLevel = 'MEDIUM';
        
        if (ltv <= 30) riskLevel = 'LOW';
        else if (ltv >= 70) riskLevel = 'HIGH';

        // Calculate portfolio impact
        const currentAllocation = currentPortfolio.allocation?.[riskLevel] || 0;
        const newAllocation = currentAllocation + (parseFloat(loan.amount) / currentPortfolio.totalValue) * 100;
        
        const wouldOverweight = newAllocation > TARGET_ALLOCATION[riskLevel] + 15;
        
        return {
            riskLevel,
            ltv,
            currentCategoryAllocation: currentAllocation,
            projectedCategoryAllocation: newAllocation,
            wouldOverweight,
            recommendation: wouldOverweight ? 'Consider other risk categories' : 'Good fit for portfolio',
        };
    }

    _getEmptyAnalysis() {
        return {
            totalValue: 0,
            allocation: { LOW: 0, MEDIUM: 0, HIGH: 0 },
            targetAllocation: TARGET_ALLOCATION,
            diversificationScore: 0,
            overexposedLoans: [],
            overexposedBorrowers: [],
            loanCount: 0,
            borrowerCount: 0,
            isBalanced: false,
        };
    }

    _calculateDiversificationScore(allocation, overexposedLoanCount, overexposedBorrowerCount) {
        let score = 100;

        // Deduct for allocation imbalance
        const imbalances = [
            Math.abs(allocation.LOW - TARGET_ALLOCATION.LOW),
            Math.abs(allocation.MEDIUM - TARGET_ALLOCATION.MEDIUM),
            Math.abs(allocation.HIGH - TARGET_ALLOCATION.HIGH),
        ];
        
        const avgImbalance = imbalances.reduce((a, b) => a + b, 0) / 3;
        score -= avgImbalance * 1.5;

        // Deduct for overexposure
        score -= overexposedLoanCount * 10;
        score -= overexposedBorrowerCount * 15;

        return Math.max(0, Math.min(100, score));
    }

    _getUnderweightCategory(allocation) {
        const diffs = {
            LOW: TARGET_ALLOCATION.LOW - allocation.LOW,
            MEDIUM: TARGET_ALLOCATION.MEDIUM - allocation.MEDIUM,
            HIGH: TARGET_ALLOCATION.HIGH - allocation.HIGH,
        };

        return Object.keys(diffs).reduce((a, b) => diffs[a] > diffs[b] ? a : b);
    }

    _calculateRecommendedAmount(loan, portfolioTotal, riskCategory) {
        const targetAmount = portfolioTotal * TARGET_ALLOCATION[riskCategory] / 100;
        const availableAmount = parseFloat(loan.loanAmount) - parseFloat(loan.fundedAmount || 0);
        
        return Math.min(
            targetAmount * 0.2, // 20% of target allocation per loan
            availableAmount,
            portfolioTotal * MAX_EXPOSURE_PER_LOAN
        );
    }
}

// Export singleton instance
const diversificationService = new DiversificationService();
export default diversificationService;
