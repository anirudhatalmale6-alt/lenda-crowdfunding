import React from 'react';

/**
 * WebSocket Service - Real-time marketplace updates
 * Addresses Gap: PERF-007 (Implement WebSocket server for real-time marketplace updates)
 */

import { store } from '../store';
import { 
  updateLoanStatus, 
  addNewLoan, 
  updateLoanFunding,
  updateStats 
} from '../store/slices/marketplaceSlice';
import { 
  updateEscrowStatus,
  addNewEscrow 
} from '../store/slices/escrowSlice';
import { 
  addNotification 
} from '../store/slices/uiSlice';

// WebSocket event types
export const WS_EVENTS = {
  // Loan events
  LOAN_CREATED: 'loan.created',
  LOAN_UPDATED: 'loan.updated',
  LOAN_FUNDED: 'loan.funded',
  LOAN_REPAID: 'loan.repaid',
  LOAN_DEFAULTED: 'loan.defaulted',
  
  // Marketplace events
  MARKETPLACE_STATS: 'marketplace.stats',
  NEW_INVESTMENT: 'investment.new',
  
  // Escrow events
  ESCROW_CREATED: 'escrow.created',
  ESCROW_UPDATED: 'escrow.updated',
  ESCROW_FUNDED: 'escrow.funded',
  
  // System events
  CONNECTION_STATUS: 'connection.status',
  HEARTBEAT: 'heartbeat'
};

// WebSocket message types
export const WS_MESSAGE_TYPES = {
  SUBSCRIBE: 'subscribe',
  UNSUBSCRIBE: 'unsubscribe',
  EVENT: 'event',
  HEARTBEAT: 'heartbeat',
  AUTH: 'auth'
};

class WebSocketService {
  constructor() {
    this.socket = null;
    this.url = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.heartbeatInterval = null;
    this.subscriptions = new Set();
    this.isConnected = false;
    this.listeners = new Map();
    this.messageQueue = [];
  }

  /**
   * Connect to WebSocket server
   * @param {string} url - WebSocket URL
   * @param {Object} options - Connection options
   */
  connect(url = null, options = {}) {
    // Get WebSocket URL from environment or use default
    this.url = url || this._getWebSocketUrl();
    
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(this.url);
        
        this.socket.onopen = (event) => {
          console.log('WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this._startHeartbeat();
          this._flushMessageQueue();
          this._resubscribe();
          this._emit('connection', { connected: true });
          resolve();
        };

        this.socket.onmessage = (event) => {
          this._handleMessage(event);
        };

        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          this._emit('error', error);
        };

        this.socket.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason);
          this.isConnected = false;
          this._stopHeartbeat();
          this._emit('connection', { connected: false, code: event.code });
          this._handleReconnect();
        };
      } catch (error) {
        console.error('Failed to create WebSocket:', error);
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    if (this.socket) {
      this.socket.close(1000, 'Client disconnect');
      this.socket = null;
      this.isConnected = false;
      this._stopHeartbeat();
    }
  }

  /**
   * Subscribe to an event channel
   * @param {string} channel - Channel name
   */
  subscribe(channel) {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.add(channel);
      
      if (this.isConnected) {
        this._send({
          type: WS_MESSAGE_TYPES.SUBSCRIBE,
          channel
        });
      }
    }
  }

  /**
   * Unsubscribe from an event channel
   * @param {string} channel - Channel name
   */
  unsubscribe(channel) {
    if (this.subscriptions.has(channel)) {
      this.subscriptions.delete(channel);
      
      if (this.isConnected) {
        this._send({
          type: WS_MESSAGE_TYPES.UNSUBSCRIBE,
          channel
        });
      }
    }
  }

  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        callbacks.delete(callback);
      }
    };
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  /**
   * Send message through WebSocket
   * @param {Object} message - Message to send
   */
  send(message) {
    if (this.isConnected) {
      this._send(message);
    } else {
      this.messageQueue.push(message);
    }
  }

  /**
   * Get WebSocket connection status
   * @returns {boolean}
   */
  getConnectionStatus() {
    return this.isConnected;
  }

  // Private methods

  _getWebSocketUrl() {
    // Use environment variable or construct from current location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = process.env.REACT_APP_WS_URL || `${protocol}//${window.location.host}/ws`;
    return host;
  }

  _send(message) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  _handleMessage(event) {
    try {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case WS_MESSAGE_TYPES.EVENT:
          this._handleEvent(message);
          break;
        case WS_MESSAGE_TYPES.HEARTBEAT:
          // Heartbeat received, connection is alive
          break;
        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  _handleEvent(message) {
    const { event, data } = message;
    
    // Emit to local listeners
    this._emit(event, data);
    
    // Dispatch to Redux store
    this._dispatchToStore(event, data);
  }

  _dispatchToStore(event, data) {
    switch (event) {
      case WS_EVENTS.LOAN_CREATED:
        store.dispatch(addNewLoan(data));
        this._showNotification('New loan available!', 'info');
        break;
        
      case WS_EVENTS.LOAN_UPDATED:
        store.dispatch(updateLoanStatus({ loanId: data.id, status: data.status }));
        break;
        
      case WS_EVENTS.LOAN_FUNDED:
        store.dispatch(updateLoanFunding({ loanId: data.loanId, fundedAmount: data.amount }));
        this._showNotification(`Loan funded: $${data.amount}`, 'success');
        break;
        
      case WS_EVENTS.LOAN_REPAID:
        store.dispatch(updateLoanStatus({ loanId: data.loanId, status: 'repaid' }));
        this._showNotification('Loan repaid!', 'success');
        break;
        
      case WS_EVENTS.LOAN_DEFAULTED:
        store.dispatch(updateLoanStatus({ loanId: data.loanId, status: 'defaulted' }));
        this._showNotification('Loan defaulted', 'warning');
        break;
        
      case WS_EVENTS.MARKETPLACE_STATS:
        store.dispatch(updateStats(data));
        break;
        
      case WS_EVENTS.ESCROW_CREATED:
        store.dispatch(addNewEscrow(data));
        break;
        
      case WS_EVENTS.ESCROW_UPDATED:
        store.dispatch(updateEscrowStatus({ escrowId: data.id, status: data.status }));
        break;
        
      case WS_EVENTS.ESCROW_FUNDED:
        store.dispatch(updateEscrowStatus({ escrowId: data.escrowId, status: 'funded' }));
        break;
        
      default:
        console.log('Unhandled WebSocket event:', event);
    }
  }

  _showNotification(message, type = 'info') {
    store.dispatch(addNotification({
      id: Date.now(),
      type,
      message,
      timestamp: new Date().toISOString()
    }));
  }

  _emit(event, data) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in WebSocket event callback:', error);
        }
      });
    }
  }

  _startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.send({
        type: WS_MESSAGE_TYPES.HEARTBEAT,
        timestamp: Date.now()
      });
    }, 30000); // Send heartbeat every 30 seconds
  }

  _stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  _handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect().catch(error => {
          console.error('Reconnection failed:', error);
        });
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
      this._emit('error', { message: 'Failed to reconnect after maximum attempts' });
    }
  }

  _resubscribe() {
    this.subscriptions.forEach(channel => {
      this._send({
        type: WS_MESSAGE_TYPES.SUBSCRIBE,
        channel
      });
    });
  }

  _flushMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this._send(message);
    }
  }
}

// Export singleton instance
const webSocketService = new WebSocketService();

export default webSocketService;

// Export event types for easy access
export { WS_EVENTS, WS_MESSAGE_TYPES };

// React hook for WebSocket
export function useWebSocket() {
  return webSocketService;
}

// Hook for subscribing to loan updates
export function useLoanUpdates(loanId, callback) {
  React.useEffect(() => {
    if (!loanId) return;
    
    const channel = `loan:${loanId}`;
    webSocketService.subscribe(channel);
    webSocketService.on(WS_EVENTS.LOAN_UPDATED, callback);
    
    return () => {
      webSocketService.unsubscribe(channel);
      webSocketService.off(WS_EVENTS.LOAN_UPDATED, callback);
    };
  }, [loanId, callback]);
}

// Hook for subscribing to marketplace updates
export function useMarketplaceUpdates(callback) {
  React.useEffect(() => {
    webSocketService.subscribe('marketplace');
    webSocketService.on(WS_EVENTS.MARKETPLACE_STATS, callback);
    
    return () => {
      webSocketService.unsubscribe('marketplace');
      webSocketService.off(WS_EVENTS.MARKETPLACE_STATS, callback);
    };
  }, [callback]);
}
