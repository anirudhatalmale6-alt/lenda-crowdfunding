/**
 * Socket.io Client Hook for React (PERF-08, PERF-09)
 * 
 * This hook provides real-time WebSocket functionality for:
 * - Loan status updates
 * - Funding notifications
 * - Payment alerts
 * - Admin dashboard live updates
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";
import { getStoredToken } from "./storage";

// Singleton socket instance
let socketInstance = null;

/**
 * Initialize or get the socket connection
 */
export const getSocket = (options = {}) => {
  if (!socketInstance) {
    const socketUrl = options.url || import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";
    
    socketInstance = io(socketUrl, {
      auth: {
        // SEC-008: Get token from secure storage, not localStorage
        token: options.token || getStoredToken()
      },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000
    });
    
    socketInstance.on("connect", () => {
      console.log("Socket connected:", socketInstance.id);
    });
    
    socketInstance.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
    });
    
    socketInstance.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });
  }
  
  return socketInstance;
};

/**
 * Hook for using Socket.io with React components
 */
export const useSocket = (options = {}) => {
  const socket = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const listenersRef = useRef({});
  
  useEffect(() => {
    // Initialize socket
    socket.current = getSocket(options);
    
    // Connection status
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    
    socket.current.on("connect", onConnect);
    socket.current.on("disconnect", onDisconnect);
    
    // Check initial state
    setIsConnected(socket.current.connected);
    
    return () => {
      // Clean up listeners
      socket.current.off("connect", onConnect);
      socket.current.off("disconnect", onDisconnect);
      
      // Remove custom listeners
      Object.entries(listenersRef.current).forEach(([event, callback]) => {
        socket.current.off(event, callback);
      });
    };
  }, []);
  
  /**
   * Subscribe to a socket event
   */
  const subscribe = useCallback((event, callback) => {
    if (!socket.current) return;
    
    // Store listener for cleanup
    listenersRef.current[event] = callback;
    
    socket.current.on(event, callback);
  }, []);
  
  /**
   * Unsubscribe from a socket event
   */
  const unsubscribe = useCallback((event) => {
    if (!socket.current || !listenersRef.current[event]) return;
    
    socket.current.off(event, listenersRef.current[event]);
    delete listenersRef.current[event];
  }, []);
  
  /**
   * Emit an event to the server
   */
  const emit = useCallback((event, data) => {
    if (!socket.current || !isConnected) {
      console.warn("Socket not connected, cannot emit:", event);
      return;
    }
    
    return socket.current.emit(event, data);
  }, [isConnected]);
  
  return {
    socket: socket.current,
    isConnected,
    lastMessage,
    subscribe,
    unsubscribe,
    emit
  };
};

/**
 * Hook for loan-specific real-time updates
 */
export const useLoanUpdates = (loanId) => {
  const { subscribe, unsubscribe, isConnected } = useSocket();
  const [loanData, setLoanData] = useState(null);
  const [fundingUpdate, setFundingUpdate] = useState(null);
  const [repaymentUpdate, setRepaymentUpdate] = useState(null);
  
  useEffect(() => {
    if (!loanId || !isConnected) return;
    
    // Subscribe to loan-specific updates
    subscribe("loan:updated", (data) => {
      if (data.loanId === loanId) {
        setLoanData(data);
      }
    });
    
    subscribe("loan:funded", (data) => {
      if (data.loanId === loanId) {
        setFundingUpdate(data);
      }
    });
    
    subscribe("loan:repayment", (data) => {
      if (data.loanId === loanId) {
        setRepaymentUpdate(data);
      }
    });
    
    // Request current loan status
    subscribe("loan:status", (data) => {
      if (data.loanId === loanId) {
        setLoanData(data);
      }
    });
    
    // Join loan room
    emit("loan:subscribe", loanId);
    
    return () => {
      unsubscribe("loan:updated");
      unsubscribe("loan:funded");
      unsubscribe("loan:repayment");
      unsubscribe("loan:status");
      
      // Leave loan room
      emit("loan:unsubscribe", loanId);
    };
  }, [loanId, isConnected]);
  
  return {
    loanData,
    fundingUpdate,
    repaymentUpdate
  };
};

/**
 * Hook for market-wide updates
 */
export const useMarketUpdates = () => {
  const { subscribe, unsubscribe, isConnected } = useSocket();
  const [marketUpdates, setMarketUpdates] = useState([]);
  
  useEffect(() => {
    if (!isConnected) return;
    
    const handleMarketUpdate = (data) => {
      setMarketUpdates(prev => [data, ...prev].slice(0, 50)); // Keep last 50
    };
    
    subscribe("loan:updated", handleMarketUpdate);
    subscribe("market:update", handleMarketUpdate);
    
    return () => {
      unsubscribe("loan:updated");
      unsubscribe("market:update");
    };
  }, [isConnected]);
  
  return marketUpdates;
};

/**
 * Hook for user notifications
 */
export const useNotifications = () => {
  const { subscribe, unsubscribe, isConnected } = useSocket();
  const [notifications, setNotifications] = useState([]);
  
  useEffect(() => {
    if (!isConnected) return;
    
    subscribe("notification", (notification) => {
      setNotifications(prev => [notification, ...prev]);
      
      // Show browser notification if permitted
      if (Notification.permission === "granted") {
        new Notification("Lenda Update", {
          body: notification.message,
          icon: "/favicon.ico"
        });
      }
    });
    
    return () => {
      unsubscribe("notification");
    };
  }, [isConnected]);
  
  /**
   * Clear notifications
   */
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);
  
  /**
   * Request browser notification permission
   */
  const requestNotificationPermission = useCallback(async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }
    return false;
  }, []);
  
  return {
    notifications,
    clearNotifications,
    requestNotificationPermission
  };
};

/**
 * Hook for admin dashboard real-time stats
 */
export const useAdminStats = () => {
  const { subscribe, unsubscribe, isConnected } = useSocket();
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  
  useEffect(() => {
    if (!isConnected) return;
    
    subscribe("admin:stats", (data) => {
      setStats(data);
    });
    
    subscribe("admin:alert", (alert) => {
      setAlerts(prev => [alert, ...prev].slice(0, 20)); // Keep last 20
      
      // Play alert sound for critical alerts
      if (alert.type === "loan_defaulted" || alert.type === "collateral_seized") {
        // Could play sound here
      }
    });
    
    // Request initial stats
    emit("admin:getStats");
    
    return () => {
      unsubscribe("admin:stats");
      unsubscribe("admin:alert");
    };
  }, [isConnected]);
  
  return {
    stats,
    alerts
  };
};

/**
 * Hook for blockchain events
 */
export const useBlockchainEvents = () => {
  const { subscribe, unsubscribe, isConnected } = useSocket();
  const [events, setEvents] = useState([]);
  
  useEffect(() => {
    if (!isConnected) return;
    
    const handleEvent = (event) => {
      setEvents(prev => [event, ...prev].slice(0, 100)); // Keep last 100
    };
    
    subscribe("blockchain:loan_funded", handleEvent);
    subscribe("blockchain:loan_repaid", handleEvent);
    subscribe("collateral:deposited", handleEvent);
    subscribe("collateral:seized", handleEvent);
    subscribe("loan:defaulted", handleEvent);
    
    return () => {
      unsubscribe("blockchain:loan_funded");
      unsubscribe("blockchain:loan_repaid");
      unsubscribe("collateral:deposited");
      unsubscribe("collateral:seized");
      unsubscribe("loan:defaulted");
    };
  }, [isConnected]);
  
  return events;
};

/**
 * Disconnect socket connection
 */
export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};
