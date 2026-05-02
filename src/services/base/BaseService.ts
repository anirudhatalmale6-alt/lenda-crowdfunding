/**
 * Base Service Class
 * 
 * Standardized error handling for all frontend services
 * ARCH-011: Addresses inconsistent error handling patterns
 */

// Error types
export enum ErrorCode {
    // Network errors
    NETWORK_ERROR = 'NETWORK_ERROR',
    TIMEOUT = 'TIMEOUT',
    SERVER_UNAVAILABLE = 'SERVER_UNAVAILABLE',
    
    // Authentication errors
    UNAUTHORIZED = 'UNAUTHORIZED',
    FORBIDDEN = 'FORBIDDEN',
    TOKEN_EXPIRED = 'TOKEN_EXPIRED',
    INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
    
    // Validation errors
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
    INVALID_FORMAT = 'INVALID_FORMAT',
    
    // Resource errors
    NOT_FOUND = 'NOT_FOUND',
    ALREADY_EXISTS = 'ALREADY_EXISTS',
    CONFLICT = 'CONFLICT',
    
    // Business logic errors
    INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
    LOAN_NOT_FUNDABLE = 'LOAN_NOT_FUNDABLE',
    LOAN_ALREADY_FUNDED = 'LOAN_ALREADY_FUNDED',
    INVALID_LOAN_STATE = 'INVALID_LOAN_STATE',
    
    // Rate limiting
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
    
    // Unknown
    UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Service error interface
 */
export interface ServiceError {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
    statusCode?: number;
}

/**
 * Service result interface
 */
export interface ServiceResult<T = unknown> {
    success: boolean;
    data?: T;
    error?: ServiceError;
    metadata?: {
        timestamp: string;
        requestId?: string;
    };
}

/**
 * Base service class providing standardized error handling
 */
export abstract class BaseService {
    protected baseURL: string;
    
    constructor(baseURL: string = '') {
        this.baseURL = baseURL || import.meta.env.VITE_API_URL || 'http://localhost:3000';
    }
    
    /**
     * Make a request with standardized error handling
     */
    protected async request<T>(
        method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
        endpoint: string,
        options: {
            body?: unknown;
            headers?: Record<string, string>;
            params?: Record<string, string | number>;
        } = {}
    ): Promise<ServiceResult<T>> {
        const { body, headers = {}, params } = options;
        
        try {
            // Build URL with query params
            let url = `${this.baseURL}${endpoint}`;
            if (params) {
                const searchParams = new URLSearchParams();
                Object.entries(params).forEach(([key, value]) => {
                    searchParams.append(key, String(value));
                });
                url += `?${searchParams.toString()}`;
            }
            
            // Build request options
            const requestOptions: RequestInit = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers,
                    ...this.getAuthHeaders()
                }
            };
            
            if (body && method !== 'GET') {
                requestOptions.body = JSON.stringify(body);
            }
            
            // Make request
            const response = await fetch(url, requestOptions);
            
            // Handle response
            return await this.handleResponse<T>(response);
        } catch (error) {
            return this.handleError(error);
        }
    }
    
    /**
     * Handle HTTP response
     */
    protected async handleResponse<T>(response: Response): Promise<ServiceResult<T>> {
        const statusCode = response.status;
        
        // Try to parse response body
        let body: unknown;
        const contentType = response.headers.get('content-type');
        
        if (contentType?.includes('application/json')) {
            try {
                body = await response.json();
            } catch {
                body = null;
            }
        }
        
        // Handle different status codes
        if (response.ok) {
            return {
                success: true,
                data: body as T,
                metadata: {
                    timestamp: new Date().toISOString()
                }
            };
        }
        
        // Handle error responses
        const error = this.parseErrorResponse(statusCode, body);
        
        return {
            success: false,
            error,
            metadata: {
                timestamp: new Date().toISOString()
            }
        };
    }
    
    /**
     * Parse error response into ServiceError
     */
    protected parseErrorResponse(statusCode: number, body: unknown): ServiceError {
        // Handle body as error response
        if (body && typeof body === 'object') {
            const errorBody = body as Record<string, unknown>;
            
            return {
                code: this.mapStatusToErrorCode(statusCode, errorBody.code as string),
                message: (errorBody.message as string) || this.getDefaultErrorMessage(statusCode),
                details: errorBody.errors as Record<string, unknown>,
                statusCode
            };
        }
        
        // Default error handling
        return {
            code: this.mapStatusToErrorCode(statusCode, ''),
            message: this.getDefaultErrorMessage(statusCode),
            statusCode
        };
    }
    
    /**
     * Map HTTP status code to ErrorCode
     */
    protected mapStatusToErrorCode(statusCode: number, serverCode: string): ErrorCode {
        // First check server-provided code
        if (serverCode) {
            const codeMap: Record<string, ErrorCode> = {
                'UNAUTHORIZED': ErrorCode.UNAUTHORIZED,
                'TOKEN_EXPIRED': ErrorCode.TOKEN_EXPIRED,
                'NOT_FOUND': ErrorCode.NOT_FOUND,
                'VALIDATION_ERROR': ErrorCode.VALIDATION_ERROR,
                'RATE_LIMIT_EXCEEDED': ErrorCode.RATE_LIMIT_EXCEEDED
            };
            
            if (codeMap[serverCode]) {
                return codeMap[serverCode];
            }
        }
        
        // Map by status code
        switch (statusCode) {
            case 400:
                return ErrorCode.VALIDATION_ERROR;
            case 401:
                return ErrorCode.UNAUTHORIZED;
            case 403:
                return ErrorCode.FORBIDDEN;
            case 404:
                return ErrorCode.NOT_FOUND;
            case 409:
                return ErrorCode.CONFLICT;
            case 422:
                return ErrorCode.VALIDATION_ERROR;
            case 429:
                return ErrorCode.RATE_LIMIT_EXCEEDED;
            case 500:
            case 502:
            case 503:
                return ErrorCode.SERVER_UNAVAILABLE;
            default:
                return ErrorCode.UNKNOWN_ERROR;
        }
    }
    
    /**
     * Get default error message for status code
     */
    protected getDefaultErrorMessage(statusCode: number): string {
        const messages: Record<number, string> = {
            400: 'Bad request. Please check your input.',
            401: 'You are not authorized. Please log in.',
            403: 'You do not have permission to perform this action.',
            404: 'The requested resource was not found.',
            409: 'A conflict occurred with the current state.',
            422: 'Validation failed. Please check your input.',
            429: 'Too many requests. Please try again later.',
            500: 'Server error. Please try again later.',
            502: 'Service temporarily unavailable.',
            503: 'Service temporarily unavailable.'
        };
        
        return messages[statusCode] || 'An unexpected error occurred.';
    }
    
    /**
     * Handle network/fetch errors
     */
    protected handleError(error: unknown): ServiceResult<never> {
        if (error instanceof TypeError && error.message.includes('fetch')) {
            return {
                success: false,
                error: {
                    code: ErrorCode.NETWORK_ERROR,
                    message: 'Network error. Please check your connection.'
                },
                metadata: {
                    timestamp: new Date().toISOString()
                }
            };
        }
        
        if (error instanceof Error) {
            // Check for abort error (timeout)
            if (error.name === 'AbortError') {
                return {
                    success: false,
                    error: {
                        code: ErrorCode.TIMEOUT,
                        message: 'Request timed out. Please try again.'
                    },
                    metadata: {
                        timestamp: new Date().toISOString()
                    }
                };
            }
            
            return {
                success: false,
                error: {
                    code: ErrorCode.UNKNOWN_ERROR,
                    message: error.message || 'An unexpected error occurred.'
                },
                metadata: {
                    timestamp: new Date().toISOString()
                }
            };
        }
        
        return {
            success: false,
            error: {
                code: ErrorCode.UNKNOWN_ERROR,
                message: 'An unexpected error occurred.'
            },
            metadata: {
                timestamp: new Date().toISOString()
            }
        };
    }
    
    /**
     * Get authentication headers
     */
    protected getAuthHeaders(): Record<string, string> {
        const token = localStorage.getItem('lenda_token');
        return token ? { Authorization: `Bearer ${token}` } : {};
    }
    
    /**
     * Helper methods for common operations
     */
    protected async get<T>(endpoint: string, params?: Record<string, string | number>): Promise<ServiceResult<T>> {
        return this.request<T>('GET', endpoint, { params });
    }
    
    protected async post<T>(endpoint: string, body?: unknown): Promise<ServiceResult<T>> {
        return this.request<T>('POST', endpoint, { body });
    }
    
    protected async put<T>(endpoint: string, body?: unknown): Promise<ServiceResult<T>> {
        return this.request<T>('PUT', endpoint, { body });
    }
    
    protected async patch<T>(endpoint: string, body?: unknown): Promise<ServiceResult<T>> {
        return this.request<T>('PATCH', endpoint, { body });
    }
    
    protected async delete<T>(endpoint: string): Promise<ServiceResult<T>> {
        return this.request<T>('DELETE', endpoint);
    }
}

export default BaseService;
