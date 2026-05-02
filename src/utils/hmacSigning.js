/**
 * SEC-013: HMAC Request Signing Utility
 * Provides request signing for API security
 * 
 * This implements request signing to prevent tampering
 * and ensure request integrity for sensitive API calls.
 */

import { getStoredToken } from './storage';

// HMAC algorithm to use
const HMAC_ALGORITHM = 'SHA-256';

/**
 * Generate HMAC signature for request
 * @param {string} method - HTTP method
 * @param {string} path - Request path
 * @param {object} params - Request parameters
 * @param {string} secret - Secret key for signing
 * @returns {string} Base64-encoded signature
 */
export const generateSignature = async (method, path, params = {}, secret) => {
    try {
        // Create canonical string to sign
        const timestamp = Date.now();
        const nonce = generateNonce();
        
        // Sort and serialize params
        const sortedParams = sortObjectKeys(params);
        const canonicalParams = JSON.stringify(sortedParams);
        
        // Create string to sign
        const stringToSign = `${method}:${path}:${timestamp}:${nonce}:${canonicalParams}`;
        
        // Generate HMAC using Web Crypto API
        const signature = await hmacSha256(stringToSign, secret);
        
        return {
            signature,
            timestamp,
            nonce,
        };
    } catch (error) {
        console.error('Error generating HMAC signature:', error);
        throw error;
    }
};

/**
 * Create HMAC-SHA256 signature
 * @param {string} message - Message to sign
 * @param {string} key - Secret key
 * @returns {string} Base64-encoded signature
 */
const hmacSha256 = async (message, key) => {
    const encoder = new TextEncoder();
    const keyEncoder = new TextEncoder();
    
    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyEncoder.encode(key),
        { name: 'HMAC', hash: HMAC_ALGORITHM },
        false,
        ['sign']
    );
    
    const signature = await crypto.subtle.sign(
        'HMAC',
        cryptoKey,
        encoder.encode(message)
    );
    
    // Convert to base64
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
};

/**
 * Generate a random nonce
 * @returns {string} Random nonce
 */
const generateNonce = () => {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Sort object keys recursively
 * @param {object} obj - Object to sort
 * @returns {object} Object with sorted keys
 */
const sortObjectKeys = (obj) => {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    
    if (Array.isArray(obj)) {
        return obj.map(item => sortObjectKeys(item));
    }
    
    const sorted = {};
    const keys = Object.keys(obj).sort();
    
    for (const key of keys) {
        sorted[key] = sortObjectKeys(obj[key]);
    }
    
    return sorted;
};

/**
 * Add HMAC signature to request headers
 * @param {object} config - Axios request config
 * @param {string} apiSecret - API secret key
 * @returns {object} Updated config with signature headers
 */
export const signRequest = async (config, apiSecret) => {
    const token = getStoredToken();
    if (!token || !apiSecret) {
        return config; // No signing if no token or secret
    }
    
    try {
        const { signature, timestamp, nonce } = await generateSignature(
            config.method.toUpperCase(),
            config.url,
            config.data || {},
            apiSecret
        );
        
        config.headers['X-Request-Signature'] = signature;
        config.headers['X-Request-Timestamp'] = timestamp.toString();
        config.headers['X-Request-Nonce'] = nonce;
        
        return config;
    } catch (error) {
        console.error('Error signing request:', error);
        return config; // Proceed without signing on error
    }
};

/**
 * Verify HMAC signature on server side (CakePHP)
 * This is the verification logic that should be implemented in the backend
 * 
 * @param {string} method - HTTP method
 * @param {string} path - Request path
 * @param {object} params - Request parameters
 * @param {string} signature - Provided signature
 * @param {string} timestamp - Request timestamp
 * @param {string} secret - API secret
 * @param {number} maxAgeMs - Maximum age of request in ms (default 5 minutes)
 * @returns {boolean} True if signature is valid
 */
export const verifySignature = async (
    method,
    path,
    params,
    signature,
    timestamp,
    secret,
    maxAgeMs = 5 * 60 * 1000
) => {
    // Check timestamp is within acceptable window
    const requestTime = parseInt(timestamp, 10);
    const now = Date.now();
    
    if (Math.abs(now - requestTime) > maxAgeMs) {
        console.warn('Request timestamp outside acceptable window');
        return false;
    }
    
    // Generate expected signature
    const { signature: expectedSignature } = await generateSignature(
        method,
        path,
        params,
        secret
    );
    
    // Constant-time comparison to prevent timing attacks
    return timingSafeEqual(signature, expectedSignature);
};

/**
 * Constant-time string comparison
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {boolean} True if strings are equal
 */
const timingSafeEqual = (a, b) => {
    if (a.length !== b.length) {
        return false;
    }
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    
    return result === 0;
};

/**
 * Create signed request config for fetch/axios
 * @param {string} url - Request URL
 * @param {string} method - HTTP method
 * @param {object} data - Request body
 * @param {string} apiSecret - API secret for signing
 * @returns {Promise<object>} Request options with signature
 */
export const createSignedRequest = async (url, method = 'GET', data = null, apiSecret) => {
    const token = getStoredToken();
    
    const options = {
        method: method.toUpperCase(),
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
        },
    };
    
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        options.body = JSON.stringify(data);
    }
    
    // Add HMAC signature if we have a secret
    if (apiSecret) {
        const { signature, timestamp, nonce } = await generateSignature(
            method,
            url,
            data || {},
            apiSecret
        );
        
        options.headers['X-Request-Signature'] = signature;
        options.headers['X-Request-Timestamp'] = timestamp.toString();
        options.headers['X-Request-Nonce'] = nonce;
    }
    
    return options;
};

export default {
    generateSignature,
    signRequest,
    verifySignature,
    createSignedRequest,
};
