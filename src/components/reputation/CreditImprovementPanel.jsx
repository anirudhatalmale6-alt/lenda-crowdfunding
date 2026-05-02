/**
 * Credit Improvement Panel Component
 * Shows borrowers how to improve their credit score
 */

import React from 'react';

// Icons
const CheckCircleIcon = () => (
  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
);

const ArrowUpIcon = () => (
  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
  </svg>
);

const ShieldIcon = () => (
  <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
  </svg>
);

const TrendUpIcon = () => (
  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
  </svg>
);

const getPriorityColor = (priority) => {
  switch (priority) {
    case 'high': return 'border-l-red-500 bg-red-50';
    case 'medium': return 'border-l-yellow-500 bg-yellow-50';
    case 'low': return 'border-l-green-500 bg-green-50';
    default: return 'border-l-gray-500 bg-gray-50';
  }
};

const CreditImprovementPanel = ({ creditScore, statistics }) => {
  // Generate recommendations based on current score and statistics
  const generateRecommendations = () => {
    const recommendations = [];
    
    // Check repayment history score
    if (creditScore?.factors?.repayment_history < 70) {
      recommendations.push({
        type: 'repay_early',
        title: 'Improve Repayment History',
        description: 'Make all payments on time or early. Late payments significantly impact your score.',
        priority: 'high',
        potentialImpact: 30,
        icon: <ClockIcon />
      });
    }
    
    // Check loan completion rate
    if (creditScore?.factors?.loan_completion < 60) {
      recommendations.push({
        type: 'complete_loans',
        title: 'Complete Your Loans',
        description: 'Finishing existing loans shows lenders you\'re reliable.',
        priority: 'high',
        potentialImpact: 25,
        icon: <CheckCircleIcon />
      });
    }
    
    // Check collateral
    if (creditScore?.factors?.collateral_quality < 50) {
      recommendations.push({
        type: 'provide_collateral',
        title: 'Provide Verified Collateral',
        description: 'Adding verified collateral strengthens your application and can improve your score.',
        priority: 'medium',
        potentialImpact: 15,
        icon: <ShieldIcon />
      });
    }
    
    // Check account age
    if (creditScore?.factors?.account_longevity < 40) {
      recommendations.push({
        type: 'build_history',
        title: 'Build Account History',
        description: 'The longer you\'re active on the platform, the better your score becomes.',
        priority: 'low',
        potentialImpact: 10,
        icon: <TrendUpIcon />
      });
    }
    
    // Check default history
    if (statistics?.defaulted_loans > 0) {
      recommendations.push({
        type: 'reduce_debt',
        title: 'Resolve Outstanding Defaults',
        description: 'Work on resolving any defaulted loans to improve your reputation.',
        priority: 'high',
        potentialImpact: 40,
        icon: <ArrowUpIcon />
      });
    }
    
    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push({
        type: 'maintain',
        title: 'Maintain Your Score',
        description: 'Keep up the great work! Continue making on-time payments.',
        priority: 'low',
        potentialImpact: 0,
        icon: <CheckCircleIcon />
      });
    }
    
    return recommendations;
  };
  
  const recommendations = generateRecommendations();
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800">Improve Your Credit Score</h3>
        <span className="text-sm text-gray-500">
          Current: {creditScore?.credit_score ?? 'N/A'}
        </span>
      </div>
      
      {/* Current Status Summary */}
      {statistics && (
        <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800">{statistics.total_loans || 0}</div>
            <div className="text-xs text-gray-500">Total Loans</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800">{statistics.repayment_rate || 0}%</div>
            <div className="text-xs text-gray-500">Repayment Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800">{statistics.defaulted_loans || 0}</div>
            <div className="text-xs text-gray-500">Defaults</div>
          </div>
        </div>
      )}
      
      {/* Recommendations List */}
      <div className="space-y-4">
        {recommendations.map((rec, index) => (
          <div 
            key={index}
            className={`border-l-4 p-4 rounded-r-lg ${getPriorityColor(rec.priority)}`}
          >
            <div className="flex items-start">
              <div className="flex-shrink-0 mt-1">
                {rec.icon}
              </div>
              <div className="ml-3 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-800">{rec.title}</h4>
                  {rec.potentialImpact > 0 && (
                    <span className="text-xs font-medium text-green-600">
                      +{rec.potentialImpact} pts
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                <span className={`inline-block mt-2 text-xs px-2 py-1 rounded-full ${
                  rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                  rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {rec.priority} priority
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Tips Section */}
      <div className="mt-6 pt-6 border-t">
        <h4 className="text-sm font-semibold text-gray-800 mb-3">Quick Tips</h4>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-center">
            <CheckCircleIcon />
            <span className="ml-2">Set up automatic payments to never miss a due date</span>
          </li>
          <li className="flex items-center">
            <CheckCircleIcon />
            <span className="ml-2">Borrow within your means - keep loan amounts manageable</span>
          </li>
          <li className="flex items-center">
            <CheckCircleIcon />
            <span className="ml-2">Provide verified collateral to strengthen your profile</span>
          </li>
          <li className="flex items-center">
            <CheckCircleIcon />
            <span className="ml-2">Build a history by successfully completing multiple loans</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default CreditImprovementPanel;
