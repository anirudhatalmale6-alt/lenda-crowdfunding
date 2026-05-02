/**
 * Event Bus for inter-service communication
 * 
 * This provides a centralized pub/sub mechanism for services to communicate
 * without tight coupling. Events are used for:
 * - Loan status changes
 * - Wallet balance updates
 * - Blockchain event notifications
 * - User actions
 * - System notifications
 */

// Event types
export const EventTypes = {
    // Loan events
    LOAN_CREATED: 'loan:created',
    LOAN_FUNDED: 'loan:funded',
    LOAN_APPROVED: 'loan:approved',
    LOAN_REJECTED: 'loan:rejected',
    LOAN_REPAID: 'loan:repaid',
    LOAN_DEFAULTED: 'loan:defaulted',
    LOAN_CANCELLED: 'loan:cancelled',
    
    // Funding events
    FUNDING_CREATED: 'funding:created',
    FUNDING_CONFIRMED: 'funding:confirmed',
    
    // Wallet events
    WALLET_BALANCE_UPDATED: 'wallet:balance_updated',
    WALLET_DEPOSIT: 'wallet:deposit',
    WALLET_WITHDRAWAL: 'wallet:withdrawal',
    WALLET_TRANSFER: 'wallet:transfer',
    
    // Collateral events
    COLLATERAL_UPLOADED: 'collateral:uploaded',
    COLLATERAL_VERIFIED: 'collateral:verified',
    COLLATERAL_REJECTED: 'collateral:rejected',
    COLLATERAL_RELEASED: 'collateral:released',
    
    // Escrow events
    ESCROW_CREATED: 'escrow:created',
    ESCROW_FUNDED: 'escrow:funded',
    ESCROW_SHIPPED: 'escrow:shipped',
    ESCROW_DELIVERED: 'escrow:delivered',
    ESCROW_RELEASED: 'escrow:released',
    ESCROW_DISPUTED: 'escrow:disputed',
    ESCROW_RESOLVED: 'escrow:resolved',
    
    // Blockchain events
    BLOCKCHAIN_SYNC_START: 'blockchain:sync_start',
    BLOCKCHAIN_SYNC_COMPLETE: 'blockchain:sync_complete',
    BLOCKCHAIN_SYNC_ERROR: 'blockchain:sync_error',
    BLOCKCHAIN_EVENT_RECEIVED: 'blockchain:event_received',
    
    // User events
    USER_LOGGED_IN: 'user:logged_in',
    USER_LOGGED_OUT: 'user:logged_out',
    USER_PROFILE_UPDATED: 'user:profile_updated',
    USER_KYC_UPDATED: 'user:kyc_updated',
    
    // System events
    NOTIFICATION: 'system:notification',
    ERROR: 'system:error',
    MAINTENANCE_MODE: 'system:maintenance',
    RATE_LIMIT_EXCEEDED: 'system:rate_limit',
    
    // Admin events
    ADMIN_LOAN_APPROVED: 'admin:loan_approved',
    ADMIN_LOAN_REJECTED: 'admin:loan_rejected',
    ADMIN_COLLATERAL_VERIFIED: 'admin:collateral_verified',
    ADMIN_DEFAULT_INITIATED: 'admin:default_initiated',
    
    // Market events
    MARKET_STATS_UPDATED: 'market:stats_updated',
    INTEREST_RATE_CHANGED: 'market:interest_rate_changed',
};

class EventBus {
    constructor() {
        this.listeners = new Map();
        this.eventHistory = [];
        this.maxHistorySize = 100;
        
        // Initialize listeners for all event types
        Object.values(EventTypes).forEach(type => {
            this.listeners.set(type, []);
        });
    }
    
    /**
     * Subscribe to an event
     * @param {string} eventType - The event type to subscribe to
     * @param {function} callback - The callback function
     * @returns {function} Unsubscribe function
     */
    on(eventType, callback) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, []);
        }
        
        const listeners = this.listeners.get(eventType);
        listeners.push(callback);
        
        // Return unsubscribe function
        return () => {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        };
    }
    
    /**
     * Subscribe to an event once
     * @param {string} eventType - The event type to subscribe to
     * @param {function} callback - The callback function
     */
    once(eventType, callback) {
        const unsubscribe = this.on(eventType, (data) => {
            unsubscribe();
            callback(data);
        });
        return unsubscribe;
    }
    
    /**
     * Unsubscribe from an event
     * @param {string} eventType - The event type to unsubscribe from
     * @param {function} callback - The callback function to remove
     */
    off(eventType, callback) {
        if (!this.listeners.has(eventType)) {
            return;
        }
        
        const listeners = this.listeners.get(eventType);
        const index = listeners.indexOf(callback);
        
        if (index > -1) {
            listeners.splice(index, 1);
        }
    }
    
    /**
     * Emit an event
     * @param {string} eventType - The event type to emit
     * @param {*} data - The data to pass to listeners
     */
    emit(eventType, data) {
        // Add to history
        this._addToHistory(eventType, data);
        
        if (!this.listeners.has(eventType)) {
            return;
        }
        
        const listeners = this.listeners.get(eventType);
        
        // Create a copy to avoid issues if listeners are modified during iteration
        const listenersCopy = [...listeners];
        
        listenersCopy.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event listener for ${eventType}:`, error);
                // Emit error event
                this.emit(EventTypes.ERROR, {
                    eventType,
                    error: error.message,
                    stack: error.stack
                });
            }
        });
    
        // Also emit wildcard listeners
        this._emitWildcard(eventType, data);
    }
    
    /**
     * Emit to wildcard listeners (*)
     */
    _emitWildcard(eventType, data) {
        const wildcardListeners = this.listeners.get('*') || [];
        
        wildcardListeners.forEach(callback => {
            try {
                callback(eventType, data);
            } catch (error) {
                console.error('Error in wildcard event listener:', error);
            }
        });
    }
    
    /**
     * Subscribe to all events (wildcard)
     * @param {function} callback - Called with (eventType, data)
     */
    onAny(callback) {
        return this.on('*', callback);
    }
    
    /**
     * Add event to history
     */
    _addToHistory(eventType, data) {
        this.eventHistory.push({
            type: eventType,
            data: data,
            timestamp: new Date().toISOString()
        });
        
        // Trim history if needed
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory.shift();
        }
    }
    
    /**
     * Get event history
     * @param {number} limit - Maximum number of events to return
     * @returns {Array} Event history
     */
    getHistory(limit = 50) {
        return this.eventHistory.slice(-limit);
    }
    
    /**
     * Get events by type
     * @param {string} eventType - The event type to filter by
     * @param {number} limit - Maximum number of events to return
     * @returns {Array} Filtered event history
     */
    getHistoryByType(eventType, limit = 50) {
        return this.eventHistory
            .filter(event => event.type === eventType)
            .slice(-limit);
    }
    
    /**
     * Clear event history
     */
    clearHistory() {
        this.eventHistory = [];
    }
    
    /**
     * Remove all listeners
     */
    removeAllListeners() {
        this.listeners.forEach(listeners => {
            listeners.length = 0;
        });
    }
    
    /**
     * Get listener count for an event type
     * @param {string} eventType - The event type
     * @returns {number} Number of listeners
     */
    listenerCount(eventType) {
        return (this.listeners.get(eventType) || []).length;
    }
    
    /**
     * Get all event types with listeners
     * @returns {Array} List of event types
     */
    getEventTypes() {
        return Array.from(this.listeners.keys()).filter(type => type !== '*' && this.listenerCount(type) > 0);
    }
}

// Export singleton instance
const eventBus = new EventBus();

export default eventBus;

// Helper functions for common use cases
export const createLoanEvent = (loan) => ({
    loanId: loan.id,
    borrowerId: loan.borrower_id,
    amount: loan.loan_amount,
    status: loan.status,
    timestamp: new Date().toISOString()
});

export const createWalletEvent = (wallet, type, amount) => ({
    walletId: wallet.id,
    userId: wallet.user_id,
    type,
    amount,
    balance: wallet.balance,
    timestamp: new Date().toISOString()
});

export const createBlockchainEvent = (eventData) => ({
    ...eventData,
    receivedAt: new Date().toISOString()
});
