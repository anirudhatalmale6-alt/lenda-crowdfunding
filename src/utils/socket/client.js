/**
 * Lenda WebSocket Client for Real-time Updates (FTR-01)
 * 
 * This client connects to the Socket.io server for:
 * - Real-time loan status updates
 * - Funding notifications
 * - Payment/repayment alerts
 * - Marketplace updates
 * - Admin dashboard live updates
 */

import { io } from 'socket.io-client';

// Socket connection instance
let socket = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// Event callbacks storage
const eventCallbacks = {
  'loan:updated': [],
  'loan:funded': [],
  'loan:repayment': [],
  'loan:defaulted': [],
  'notification': [],
  'admin:alert': [],
  'market:update': [],
  'blockchain:loan_funded': [],
  'blockchain:loan_repaid': []
};

/**
 * Initialize WebSocket connection
 * @param {string} token - JWT authentication token (optional)
 * @returns {Socket} Socket.io instance
 */
export function connectSocket(token = null) {
  if (socket?.connected) {
    return socket;
  }

  const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

  socket = io(socketUrl, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  });

  // Connection event handlers
  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket.id);
    reconnectAttempts = 0;
    
    // Re-subscribe to rooms after reconnection
    if (window.__socketSubscriptions) {
      window.__socketSubscriptions.forEach(room => {
        socket.emit('loan:subscribe', room);
      });
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('[Socket] Connection error:', error.message);
    reconnectAttempts++;
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log('[Socket] Reconnected after', attemptNumber, 'attempts');
  });

  socket.on('reconnect_failed', () => {
    console.error('[Socket] Failed to reconnect after', MAX_RECONNECT_ATTEMPTS, 'attempts');
  });

  // Register event listeners from callbacks
  Object.keys(eventCallbacks).forEach(event => {
    socket.on(event, (data) => {
      eventCallbacks[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[Socket] Error in ${event} callback:`, error);
        }
      });
    });
  });

  return socket;
}

/**
 * Disconnect WebSocket connection
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Get current socket instance
 * @returns {Socket|null}
 */
export function getSocket() {
  return socket;
}

/**
 * Check if socket is connected
 * @returns {boolean}
 */
export function isConnected() {
  return socket?.connected ?? false;
}

/**
 * Subscribe to loan updates
 * @param {number|string} loanId 
 */
export function subscribeToLoan(loanId) {
  if (socket?.connected) {
    socket.emit('loan:subscribe', loanId);
    
    // Track subscriptions for reconnection
    window.__socketSubscriptions = window.__socketSubscriptions || [];
    if (!window.__socketSubscriptions.includes(loanId)) {
      window.__socketSubscriptions.push(loanId);
    }
  }
}

/**
 * Unsubscribe from loan updates
 * @param {number|string} loanId 
 */
export function unsubscribeFromLoan(loanId) {
  if (socket?.connected) {
    socket.emit('loan:unsubscribe', loanId);
    
    // Remove from subscriptions
    window.__socketSubscriptions = window.__socketSubscriptions || [];
    window.__socketSubscriptions = window.__socketSubscriptions.filter(id => id !== loanId);
  }
}

/**
 * Request loan status (for sync after reconnection)
 * @param {number|string} loanId 
 * @returns {Promise}
 */
export function requestLoanStatus(loanId) {
  return new Promise((resolve, reject) => {
    if (!socket?.connected) {
      reject(new Error('Socket not connected'));
      return;
    }

    socket.emit('loan:status', loanId);
    
    const timeout = setTimeout(() => {
      reject(new Error('Request timeout'));
    }, 5000);

    socket.once('loan:status', (data) => {
      clearTimeout(timeout);
      resolve(data);
    });
  });
}

/**
 * Register callback for specific event
 * @param {string} event - Event name
 * @param {Function} callback - Callback function
 * @returns {Function} Unsubscribe function
 */
export function on(event, callback) {
  if (eventCallbacks[event]) {
    eventCallbacks[event].push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = eventCallbacks[event].indexOf(callback);
      if (index > -1) {
        eventCallbacks[event].splice(index, 1);
      }
    };
  }
  
  // Fallback to socket listener if event not tracked
  if (socket?.on) {
    socket.on(event, callback);
    return () => socket.off(event, callback);
  }
  
  return () => {};
}

/**
 * Remove callback for specific event
 * @param {string} event - Event name
 * @param {Function} callback - Callback function
 */
export function off(event, callback) {
  if (eventCallbacks[event]) {
    const index = eventCallbacks[event].indexOf(callback);
    if (index > -1) {
      eventCallbacks[event].splice(index, 1);
    }
  }
}

/**
 * Emit event to server
 * @param {string} event - Event name
 * @param {any} data - Data to send
 */
export function emit(event, data) {
  if (socket?.emit) {
    socket.emit(event, data);
  }
}

/**
 * Hook for React components to use socket
 * @returns {Object} Socket hooks
 */
export function useSocket() {
  // This will be used with React's useEffect in components
  return {
    socket,
    isConnected: isConnected(),
    subscribeToLoan,
    unsubscribeFromLoan,
    on,
    off,
    emit
  };
}

export default {
  connectSocket,
  disconnectSocket,
  getSocket,
  isConnected,
  subscribeToLoan,
  unsubscribeFromLoan,
  requestLoanStatus,
  on,
  off,
  emit,
  useSocket
};
