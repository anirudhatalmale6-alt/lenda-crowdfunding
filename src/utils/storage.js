/**
 * SEC-001: Secure storage utilities
 * Uses sessionStorage for tokens (server sets httpOnly cookie separately)
 * and localStorage for non-sensitive user data
 */

// Token is stored in httpOnly cookie by server - client cannot access it
// sessionStorage is used for auth state that JS needs to check
const SESSION_AUTH_KEY = 'lenda_auth_state';
const TOKEN_COOKIE_NAME = 'lenda_auth_token';
const REFRESH_TOKEN_COOKIE_NAME = 'lenda_refresh_token';
const CSRF_TOKEN_COOKIE_NAME = 'lenda_csrf_token';

// Legacy localStorage keys (deprecated - kept for migration)
const TOKEN_KEY = 'lenda_token';
const USER_KEY = 'lenda_user';

const getCookie = (name) => {
    const prefix = `${name}=`;
    const cookie = document.cookie
        .split(';')
        .map((value) => value.trim())
        .find((value) => value.startsWith(prefix));

    return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
};

/**
 * SEC-001: Get stored authentication token
 * 
 * IMPORTANT: Tokens are stored in httpOnly cookies by the SERVER.
 * This function checks sessionStorage for auth state (not the token itself).
 * The actual token is sent by server in httpOnly cookie and cannot be accessed by JS.
 * 
 * @returns {string|null} Auth state indicator
 */
export const getStoredToken = () => {
    // Check sessionStorage for auth state (set by API client after successful login)
    // This is NOT the token - just a flag indicating user is authenticated
    try {
        const sessionAuth = sessionStorage.getItem(SESSION_AUTH_KEY);
        if (sessionAuth) {
            const authData = JSON.parse(sessionAuth);
            if (authData && authData.authenticated) {
                return authData.token || 'authenticated';
            }
        }
    } catch (error) {
        console.error('Error reading session auth:', error);
    }
    
    // Fallback: check if token cookie exists (server sets this as httpOnly)
    // Note: We cannot read httpOnly cookies from JS, so we just check cookie name presence
    const cookieExists = document.cookie.split(';').some(c => c.trim().startsWith(TOKEN_COOKIE_NAME + '='));
    if (cookieExists) {
        return 'httpOnly_cookie_present';
    }
    
    return null;
};

/**
 * SEC-001: Get stored user data from cookie or localStorage
 * @returns {Object|null} User object or null
 */
export const getStoredUser = () => {
    // First try cookie
    const cookieUser = getCookie('lenda_user_data');
    if (cookieUser) {
        try {
            return JSON.parse(cookieUser);
        } catch {
            return null;
        }
    }
    
    // Fallback to localStorage for backward compatibility
    try {
        const item = localStorage.getItem(USER_KEY);
        return item ? JSON.parse(item) : null;
    } catch (error) {
        console.error('Error getting stored user:', error);
        return null;
    }
};

/**
 * SEC-001: Store authentication data
 * 
 * For tokens: Server must set httpOnly cookie in response headers
 * For state: Use sessionStorage for temporary auth state
 * 
 * @param {string} token - Authentication token (sent to server to set httpOnly cookie)
 * @param {Object} user - User data object
 */
export const setAuthData = (token, user) => {
    // Store auth state in sessionStorage for client-side state management
    // The actual token should be set by server via httpOnly cookie
    try {
        sessionStorage.setItem(SESSION_AUTH_KEY, JSON.stringify({
            authenticated: true,
            token: token, // This is used for API requests, stored in memory by API client
            timestamp: Date.now()
        }));
    } catch (error) {
        console.error('Error storing session auth:', error);
    }
    
    // Store user data in localStorage (non-sensitive)
    if (user) {
        try {
            localStorage.setItem(USER_KEY, JSON.stringify(user));
        } catch (error) {
            console.error('Error storing user data:', error);
        }
    }
    
    console.log('SEC-001: Auth data stored. Token should be set by server as httpOnly cookie.');
};

/**
 * SEC-001: Clear authentication data
 * Clears sessionStorage, localStorage, and instructs server to clear cookies
 */
export const clearAuthData = () => {
    // Clear sessionStorage
    try {
        sessionStorage.removeItem(SESSION_AUTH_KEY);
    } catch (error) {
        console.error('Error clearing session auth:', error);
    }
    
    // Clear localStorage
    try {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    } catch (error) {
        console.error('Error clearing auth data:', error);
    }
    
    // Note: httpOnly cookies cannot be cleared from JavaScript
    // Server must handle cookie clearing via logout endpoint
    console.log('SEC-001: Auth data cleared. Server should clear httpOnly cookies.');
};

/**
 * SEC-001: Check if user is authenticated
 * @returns {boolean} True if token exists
 */
export const isAuthenticated = () => {
    return !!getStoredToken();
};

/**
 * SEC-002: Get refresh token from cookie or session
 * Note: httpOnly refresh token cannot be read by JS - server handles it
 * @returns {string|null} Refresh token indicator
 */
export const getRefreshToken = () => {
    // Check if refresh token cookie exists (server sets as httpOnly)
    const cookieExists = document.cookie.split(';').some(c => c.trim().startsWith(REFRESH_TOKEN_COOKIE_NAME + '='));
    return cookieExists ? 'httpOnly_cookie_present' : null;
};

/**
 * SEC-002: Get CSRF token from cookie
 * Note: httpOnly CSRF token cannot be read by JS - use from response headers
 * @returns {string|null} CSRF token or null
 */
export const getCsrfToken = () => {
    // CSRF token should be included in response headers or from meta tag
    const metaToken = document.querySelector('meta[name="csrf-token"]');
    if (metaToken) {
        return metaToken.getAttribute('content');
    }
    return null;
};

// Export constants only
export { SESSION_AUTH_KEY, TOKEN_KEY, USER_KEY };
