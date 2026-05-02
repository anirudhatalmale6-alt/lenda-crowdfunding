/**
 * Reputation Badges Component
 * Displays borrower performance badges
 */

import React from 'react';
import { BADGE_TYPES } from '../../services/creditReputationService';

// Badge icons mapping
const badgeIcons = {
  'shield-check': (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  ),
  'fire': (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
    </svg>
  ),
  'lock': (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
    </svg>
  ),
  'star': (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  ),
  'clock': (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
    </svg>
  ),
  'flag': (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
    </svg>
  ),
  'trending-up': (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
    </svg>
  ),
  'award': (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  ),
  'percent': (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M4 10a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zm5-3a1 1 0 100 2h5a1 1 0 100-2H9z" clipRule="evenodd" />
    </svg>
  ),
  'zap': (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M13 7H7v6h6V7z" clipRule="evenodd" />
    </svg>
  )
};

const getBadgeColor = (color) => {
  const colorMap = {
    emerald: 'bg-emerald-100 text-emerald-600 border-emerald-200',
    green: 'bg-green-100 text-green-600 border-green-200',
    blue: 'bg-blue-100 text-blue-600 border-blue-200',
    yellow: 'bg-yellow-100 text-yellow-600 border-yellow-200',
    orange: 'bg-orange-100 text-orange-600 border-orange-200',
    red: 'bg-red-100 text-red-600 border-red-200',
    purple: 'bg-purple-100 text-purple-600 border-purple-200',
    gray: 'bg-gray-100 text-gray-600 border-gray-200'
  };
  return colorMap[color] || colorMap.gray;
};

const ReputationBadges = ({ badges, showDescriptions = false, maxDisplay = 5 }) => {
  if (!badges || badges.length === 0) {
    return null;
  }
  
  const displayBadges = badges.slice(0, maxDisplay);
  const remainingCount = badges.length - maxDisplay;
  
  return (
    <div className="flex flex-wrap gap-2">
      {displayBadges.map((badge, index) => {
        const badgeConfig = BADGE_TYPES[badge.type] || {};
        const iconName = badge.icon || badgeConfig.icon || 'star';
        const badgeColor = getBadgeColor(badgeConfig.color || 'gray');
        
        return (
          <div
            key={index}
            className={`inline-flex items-center px-3 py-2 rounded-lg border ${badgeColor} cursor-help`}
            title={badge.description || badgeConfig.name}
          >
            <span className="mr-2">
              {badgeIcons[iconName] || badgeIcons['star']}
            </span>
            <span className="text-sm font-medium">
              {badge.name || badgeConfig.name}
            </span>
          </div>
        );
      })}
      
      {remainingCount > 0 && (
        <div className="inline-flex items-center px-3 py-2 rounded-lg border bg-gray-100 text-gray-600 border-gray-200">
          <span className="text-sm font-medium">+{remainingCount} more</span>
        </div>
      )}
    </div>
  );
};

// Compact version for loan cards
export const CompactReputationBadges = ({ badges }) => {
  if (!badges || badges.length === 0) {
    return null;
  }
  
  return (
    <div className="flex items-center gap-1">
      {badges.slice(0, 3).map((badge, index) => {
        const badgeConfig = BADGE_TYPES[badge.type] || {};
        const iconName = badge.icon || badgeConfig.icon || 'star';
        
        return (
          <div
            key={index}
            className={`p-1 rounded ${getBadgeColor(badgeConfig.color || 'gray')}`}
            title={badge.name || badgeConfig.name}
          >
            {badgeIcons[iconName] || badgeIcons['star']}
          </div>
        );
      })}
    </div>
  );
};

export default ReputationBadges;
