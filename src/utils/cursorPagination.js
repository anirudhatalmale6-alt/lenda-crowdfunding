/**
 * Cursor-based Pagination Utility
 * Provides efficient pagination for large datasets
 * Addresses Gap: PERF-002 (Implement cursor-based pagination on loan marketplace queries)
 */

import { createApiClient } from '../utils/api/client';

const api = createApiClient('/api');

/**
 * CursorPagination class for handling cursor-based pagination
 */
export class CursorPagination {
  /**
   * @param {Object} options - Pagination options
   * @param {number} options.limit - Number of items per page
   * @param {string} options.cursor - Cursor for next page
   * @param {string} options.orderBy - Field to order by
   * @param {string} options.orderDir - Order direction (asc/desc)
   */
  constructor(options = {}) {
    this.limit = options.limit || 20;
    this.cursor = options.cursor || null;
    this.orderBy = options.orderBy || 'id';
    this.orderDir = options.orderDir || 'desc';
    this.hasMore = true;
    this.items = [];
  }

  /**
   * Set the cursor from a paginated response
   * @param {Object} response - API response
   */
  setFromResponse(response) {
    if (response.data && response.data.length > 0) {
      const lastItem = response.data[response.data.length - 1];
      this.cursor = lastItem[this.orderBy] || lastItem.id;
      this.hasMore = response.data.length >= this.limit;
    } else {
      this.hasMore = false;
    }
  }

  /**
   * Get query parameters for the next request
   * @returns {Object} Query parameters
   */
  getQueryParams() {
    return {
      limit: this.limit,
      cursor: this.cursor,
      order_by: this.orderBy,
      order_dir: this.orderDir
    };
  }

  /**
   * Reset pagination to initial state
   */
  reset() {
    this.cursor = null;
    this.hasMore = true;
    this.items = [];
  }

  /**
   * Check if there are more pages
   * @returns {boolean}
   */
  canLoadMore() {
    return this.hasMore;
  }
}

/**
 * Hook for cursor-based pagination in React components
 * @param {string} endpoint - API endpoint
 * @param {Object} initialParams - Initial query parameters
 * @returns {Object} Pagination state and methods
 */
export function useCursorPagination(endpoint, initialParams = {}) {
  const pagination = new CursorPagination(initialParams);
  
  const fetchPage = async (params = {}) => {
    const queryParams = {
      ...pagination.getQueryParams(),
      ...params
    };
    
    const response = await api.get(endpoint, { params: queryParams });
    pagination.setFromResponse(response);
    
    return response.data;
  };

  return {
    pagination,
    fetchPage,
    canLoadMore: () => pagination.canLoadMore(),
    reset: () => pagination.reset()
  };
}

/**
 * Create a paginated query function
 * @param {string} endpoint - API endpoint
 * @param {Object} defaultOptions - Default options
 * @returns {Function} Paginated fetch function
 */
export function createPaginatedQuery(endpoint, defaultOptions = {}) {
  return async (params = {}) => {
    const pagination = new CursorPagination({
      limit: defaultOptions.limit || 20,
      orderBy: defaultOptions.orderBy || 'id',
      orderDir: defaultOptions.orderDir || 'desc'
    });

    const queryParams = {
      ...pagination.getQueryParams(),
      ...params
    };

    const response = await api.get(endpoint, { params: queryParams });
    
    return {
      data: response.data,
      pagination: {
        cursor: pagination.cursor,
        hasMore: pagination.hasMore,
        limit: pagination.limit
      }
    };
  };
}

/**
 * Create a paginated service method
 * @param {Object} service - Service object with get method
 * @param {string} methodName - Method name to call
 * @returns {Function} Paginated method
 */
export function createPaginatedServiceMethod(service, methodName) {
  return async (params = {}) => {
    const pagination = new CursorPagination({
      limit: params.limit || 20,
      orderBy: params.orderBy || 'id',
      orderDir: params.orderDir || 'desc'
    });

    const queryParams = {
      ...pagination.getQueryParams(),
      ...params
    };

    const response = await service[methodName](queryParams);
    
    pagination.setFromResponse(response);
    
    return {
      data: response.data || response,
      pagination: {
        cursor: pagination.cursor,
        hasMore: pagination.hasMore,
        limit: pagination.limit
      }
    };
  };
}

/**
 * Loan marketplace pagination helper
 * Specialized pagination for loan listings
 */
export const loanMarketplacePagination = {
  /**
   * Fetch paginated loan listings
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Paginated loans
   */
  async getLoans(params = {}) {
    const pagination = new CursorPagination({
      limit: params.limit || 20,
      orderBy: params.orderBy || 'created_at',
      orderDir: params.orderDir || 'desc'
    });

    const queryParams = pagination.getQueryParams();

    try {
      const response = await api.get('/loans', { params: queryParams });
      pagination.setFromResponse(response);
      
      return {
        loans: response.data?.loans || response.data || [],
        pagination: {
          cursor: pagination.cursor,
          hasMore: pagination.hasMore,
          limit: pagination.limit
        }
      };
    } catch (error) {
      console.error('Error fetching paginated loans:', error);
      throw error;
    }
  },

  /**
   * Fetch paginated funded loans for a lender
   * @param {string} lenderId - Lender ID
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Paginated fundings
   */
  async getLenderFundings(lenderId, params = {}) {
    const pagination = new CursorPagination({
      limit: params.limit || 20,
      orderBy: params.orderBy || 'funded_at',
      orderDir: params.orderDir || 'desc'
    });

    const queryParams = pagination.getQueryParams();

    try {
      const response = await api.get(`/lenders/${lenderId}/fundings`, { params: queryParams });
      pagination.setFromResponse(response);
      
      return {
        fundings: response.data?.fundings || response.data || [],
        pagination: {
          cursor: pagination.cursor,
          hasMore: pagination.hasMore,
          limit: pagination.limit
        }
      };
    } catch (error) {
      console.error('Error fetching lender fundings:', error);
      throw error;
    }
  }
};

export default CursorPagination;
