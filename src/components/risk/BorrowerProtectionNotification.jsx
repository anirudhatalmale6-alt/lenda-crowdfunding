import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectSystemHealthStatus, selectCoveragePercentage } from '../../store/slices/capitalProtectionSlice';

/**
 * Borrower Protection Notification
 * Shows notifications to borrowers when system enters protection mode
 */
const BorrowerProtectionNotification = () => {
  const systemHealth = useSelector(selectSystemHealthStatus);
  const coverageRatio = useSelector(selectCoveragePercentage);
  const [visible, setVisible] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    // Check if system is in protection mode
    if (coverageRatio < 30) {
      setVisible(true);
      
      if (coverageRatio < 15) {
        setNotification({
          type: 'emergency',
          title: 'Emergency Protection Mode',
          message: 'Due to elevated risk levels, only collateral-backed loans are currently allowed. New loans above ₦25,000 are temporarily restricted.',
          color: 'red'
        });
      } else if (coverageRatio < 20) {
        setNotification({
          type: 'pause',
          title: 'New Loan Listings Paused',
          message: 'Due to increased loan demand and risk management requirements, new loan listings are temporarily paused. Please check back later.',
          color: 'orange'
        });
      } else if (coverageRatio < 30) {
        setNotification({
          type: 'slowdown',
          title: 'Loan Restrictions Apply',
          message: 'Due to elevated risk levels, new loans above ₦50,000 are temporarily restricted. Smaller loans remain available.',
          color: 'yellow'
        });
      }
    } else {
      setVisible(false);
    }
  }, [coverageRatio, systemHealth]);

  if (!visible || !notification) {
    return null;
  }

  const colorClasses = {
    red: {
      bg: 'bg-red-50',
      border: 'border-red-300',
      title: 'text-red-800',
      message: 'text-red-700',
      icon: 'text-red-500'
    },
    orange: {
      bg: 'bg-orange-50',
      border: 'border-orange-300',
      title: 'text-orange-800',
      message: 'text-orange-700',
      icon: 'text-orange-500'
    },
    yellow: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-300',
      title: 'text-yellow-800',
      message: 'text-yellow-700',
      icon: 'text-yellow-500'
    }
  };

  const colors = colorClasses[notification.color] || colorClasses.yellow;

  return (
    <div className={`p-4 rounded-lg border ${colors.bg} ${colors.border}`}>
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 ${colors.icon}`}>
          {notification.type === 'emergency' ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ) : notification.type === 'pause' ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>

        {/* Content */}
        <div className="flex-1">
          <h4 className={`font-semibold ${colors.title}`}>{notification.title}</h4>
          <p className={`text-sm mt-1 ${colors.message}`}>{notification.message}</p>
        </div>

        {/* Dismiss button */}
        <button
          onClick={() => setVisible(false)}
          className={`flex-shrink-0 ${colors.icon} hover:opacity-75`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Current status indicator */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Current Reserve Coverage:</span>
          <span className="font-medium text-gray-700">{coverageRatio.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
};

export default BorrowerProtectionNotification;
