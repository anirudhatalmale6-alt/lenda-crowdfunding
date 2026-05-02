/**
 * Lenda WebSocket Hook for React Components
 * 
 * Provides easy integration of WebSocket events with React components
 * and Redux store synchronization.
 */

import { useEffect, useCallback, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { 
  connectSocket, 
  disconnectSocket, 
  isConnected,
  subscribeToLoan,
  unsubscribeFromLoan,
  on,
  off
} from './client';

// Import Redux actions for real-time updates
import { 
  updateLoanFunding,
  updateLoanStatus,
  addNotification 
} from '../../store/slices/loanSlice';

import { 
  updateMarketplaceStats 
} from '../../store/slices/marketplaceSlice';

/**
 * Hook to connect to WebSocket and handle authentication
 * @param {string} token - JWT authentication token
 * @returns {boolean} Connection status
 */
export function useSocketConnection(token) {
  const [connected, setConnected] = useState(false);
  
  useEffect(() => {
    if (token) {
      connectSocket(token);
      setConnected(isConnected());
    } else {
      connectSocket();
      setConnected(isConnected());
    }
    
    return () => {
      disconnectSocket();
    };
  }, [token]);
  
  return connected;
}

/**
 * Hook to receive loan updates in real-time
 * @param {number|string} loanId - Loan ID to subscribe to
 */
export function useLoanUpdates(loanId) {
  const dispatch = useDispatch();
  
  useEffect(() => {
    if (!loanId) return;
    
    // Subscribe to loan updates
    subscribeToLoan(loanId);
    
    // Set up event listeners
    const unsubFunding = on('loan:funded', (data) => {
      if (data.loanId === loanId) {
        dispatch(updateLoanFunding({ 
          loanId: data.loanId, 
          amount: data.amount 
        }));
        
        // Also add notification
        dispatch(addNotification({
          type: 'funding',
          message: `Your loan received $${data.amount} in funding`,
          loanId: data.loanId
        }));
      }
    });
    
    const unsubUpdate = on('loan:updated', (data) => {
      if (data.loanId === loanId) {
        dispatch(updateLoanStatus({
          loanId: data.loanId,
          status: data.status,
          fundedAmount: data.fundedAmount
        }));
      }
    });
    
    const unsubDefault = on('loan:defaulted', (data) => {
      if (data.loanId === loanId) {
        dispatch(updateLoanStatus({
          loanId: data.loanId,
          status: 'defaulted'
        }));
      }
    });
    
    return () => {
      unsubscribeFromLoan(loanId);
      off('loan:funded', unsubFunding);
      off('loan:updated', unsubUpdate);
      off('loan:defaulted', unsubDefault);
    };
  }, [loanId, dispatch]);
}

/**
 * Hook for marketplace real-time updates
 */
export function useMarketplaceUpdates() {
  const dispatch = useDispatch();
  
  useEffect(() => {
    // Subscribe to market updates
    const unsubMarket = on('market:update', (data) => {
      dispatch(updateMarketplaceStats(data));
    });
    
    const unsubLoanFunded = on('blockchain:loan_funded', (data) => {
      dispatch(updateMarketplaceStats({
        totalFunded: data.amount,
        loanId: data.loanId,
        type: 'loan_funded'
      }));
    });
    
    const unsubLoanRepaid = on('blockchain:loan_repaid', (data) => {
      dispatch(updateMarketplaceStats({
        totalRepaid: data.amount,
        loanId: data.loanId,
        type: 'loan_repaid'
      }));
    });
    
    return () => {
      off('market:update', unsubMarket);
      off('blockchain:loan_funded', unsubLoanFunded);
      off('blockchain:loan_repaid', unsubLoanRepaid);
    };
  }, [dispatch]);
}

/**
 * Hook for real-time notifications
 */
export function useRealTimeNotifications() {
  const dispatch = useDispatch();
  
  useEffect(() => {
    const unsubNotification = on('notification', (data) => {
      dispatch(addNotification({
        type: data.type,
        message: data.message,
        loanId: data.loanId,
        timestamp: data.timestamp
      }));
    });
    
    return () => {
      off('notification', unsubNotification);
    };
  }, [dispatch]);
}

/**
 * Hook for admin real-time alerts
 */
export function useAdminAlerts() {
  const dispatch = useDispatch();
  const alertsRef = useRef([]);
  
  useEffect(() => {
    const unsubAlert = on('admin:alert', (data) => {
      alertsRef.current.unshift(data);
      
      // Keep only last 50 alerts in memory
      if (alertsRef.current.length > 50) {
        alertsRef.current = alertsRef.current.slice(0, 50);
      }
      
      // Dispatch to Redux store
      dispatch({
        type: 'admin/addAlert',
        payload: data
      });
    });
    
    return () => {
      off('admin:alert', unsubAlert);
    };
  }, [dispatch]);
  
  return alertsRef.current;
}

/**
 * Combined hook for full real-time functionality
 * @param {string} token - JWT token for authenticated features
 * @param {number|string} loanId - Optional loan ID to track
 */
export function useRealtimeUpdates(token, loanId = null) {
  const connected = useSocketConnection(token);
  const dispatch = useDispatch();
  
  useEffect(() => {
    if (!connected) return;
    
    // Set up global listeners
    
    // Loan funding updates
    const unsubFunded = on('loan:funded', (data) => {
      dispatch(updateLoanFunding({ 
        loanId: data.loanId, 
        amount: data.amount 
      }));
    });
    
    // Loan status updates
    const unsubStatus = on('loan:updated', (data) => {
      dispatch(updateLoanStatus({
        loanId: data.loanId,
        status: data.status
      }));
    });
    
    // Notifications
    const unsubNotif = on('notification', (data) => {
      dispatch(addNotification({
        type: data.type,
        message: data.message,
        loanId: data.loanId
      }));
    });
    
    // Market updates
    const unsubMarket = on('market:update', (data) => {
      dispatch(updateMarketplaceStats(data));
    });
    
    // Subscribe to specific loan if provided
    if (loanId) {
      subscribeToLoan(loanId);
    }
    
    return () => {
      off('loan:funded', unsubFunded);
      off('loan:updated', unsubStatus);
      off('notification', unsubNotif);
      off('market:update', unsubMarket);
      
      if (loanId) {
        unsubscribeFromLoan(loanId);
      }
    };
  }, [connected, loanId, dispatch]);
}

export default {
  useSocketConnection,
  useLoanUpdates,
  useMarketplaceUpdates,
  useRealTimeNotifications,
  useAdminAlerts,
  useRealtimeUpdates
};
