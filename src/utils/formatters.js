/**
 * Common formatting utility functions
 * Extracts repeated formatting logic from across the application
 */

// Ethereum/Token constants
const WEI_DECIMALS = 18;
const DISPLAY_DECIMALS = {
  NATIVE: 4,      // For ETH/BNB etc
  TOKEN: 8,       // For token amounts (matches DECIMAL(15,8))
    CURRENCY: 2,   // For fiat values
  PERCENTAGE: 2, // For percentages
  RATE: 4,       // For interest rates
  RATIO: 2       // For ratios
};

/**
 * Convert wei to token amount
 * @param {string|number} weiAmount - Amount in wei
 * @param {number} decimals - Token decimals (default 18)
 * @returns {number} Amount in tokens
 */
export const weiToToken = (weiAmount, decimals = WEI_DECIMALS) => {
  if (weiAmount === null || weiAmount === undefined || weiAmount === 0) return 0;
  const amount = typeof weiAmount === 'string' ? BigInt(weiAmount) : BigInt(Math.floor(weiAmount));
  const divisor = BigInt(10) ** BigInt(decimals);
  return Number(amount) / Number(divisor);
};

/**
 * Convert token amount to wei
 * @param {string|number} tokenAmount - Amount in tokens
 * @param {number} decimals - Token decimals (default 18)
 * @returns {string} Amount in wei
 */
export const tokenToWei = (tokenAmount, decimals = WEI_DECIMALS) => {
  if (tokenAmount === null || tokenAmount === undefined || tokenAmount === 0) return '0';
  const multiplier = BigInt(10) ** BigInt(decimals);
  return (BigInt(Math.floor(tokenAmount * 10000)) * multiplier / BigInt(10000)).toString();
};

/**
 * Format wei to display with standardized precision
 * @param {string|number} weiAmount - Amount in wei
 * @param {string} type - Display type (NATIVE, TOKEN, CURRENCY)
 * @returns {string} Formatted display value
 */
export const formatWei = (weiAmount, type = 'NATIVE') => {
  if (weiAmount === null || weiAmount === undefined || weiAmount === 0) return '0';
  
  const decimals = DISPLAY_DECIMALS[type] || DISPLAY_DECIMALS.NATIVE;
  const tokenAmount = weiToToken(weiAmount, WEI_DECIMALS);
  
  return formatNumber(tokenAmount, decimals);
};

/**
 * Format wei to currency display (NGN)
 * @param {string|number} weiAmount - Amount in wei
 * @param {number} fiatPrice - Fiat price per token (optional)
 * @returns {string} Formatted currency value
 */
export const formatWeiCurrency = (weiAmount, fiatPrice = null) => {
    if (weiAmount === null || weiAmount === undefined || weiAmount === 0) return '₦0.00';
  
  const tokenAmount = weiToToken(weiAmount, WEI_DECIMALS);
  
    if (fiatPrice !== null) {
        const fiatValue = tokenAmount * fiatPrice;
        return formatCurrency(fiatValue);
  }
  
  return formatNumber(tokenAmount, DISPLAY_DECIMALS.CURRENCY);
};

/**
 * Format currency amount
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: NGN)
 * @param {string} locale - Locale for formatting (default: en-NG)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency = 'NGN', locale = 'en-NG') => {
    if (amount === null || amount === undefined) return '₦0.00';

    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
};

/**
 * Format a number with thousand separators
 * @param {number} num - Number to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted number string
 */
export const formatNumber = (num, decimals = 0) => {
    if (num === null || num === undefined) return '0';

    return new Intl.NumberFormat('en-NG', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(num);
};

/**
 * Format percentage
 * @param {number} value - Value to format as percentage (0-100 or 0-1)
 * @param {number} decimals - Number of decimal places
 * @param {boolean} isDecimal - Whether the value is in decimal form (0.05 = 5%)
 * @returns {string} Formatted percentage string
 */
export const formatPercentage = (value, decimals = 2, isDecimal = false) => {
    if (value === null || value === undefined) return '0%';

    const percentage = isDecimal ? value * 100 : value;
    return `${formatNumber(percentage, decimals)}%`;
};

/**
 * Format date string to readable format
 * @param {string|Date} date - Date to format
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export const formatDate = (date, options = {}) => {
    if (!date) return '';

    const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    };

    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-NG', { ...defaultOptions, ...options }).format(dateObj);
};

/**
 * Format date to relative time (e.g., "2 hours ago")
 * @param {string|Date} date - Date to format
 * @returns {string} Relative time string
 */
export const formatRelativeTime = (date) => {
    if (!date) return '';

    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffInSeconds = Math.floor((now - dateObj) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`;
    return `${Math.floor(diffInSeconds / 31536000)} years ago`;
};

/**
 * Format Ethereum address (truncate middle)
 * @param {string} address - Full Ethereum address
 * @param {number} startChars - Number of characters to show at start
 * @param {number} endChars - Number of characters to show at end
 * @returns {string} Truncated address
 */
export const formatAddress = (address, startChars = 6, endChars = 4) => {
    if (!address || address.length < startChars + endChars) return address;
    return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
};

/**
 * Format loan status for display
 * @param {string} status - Status code
 * @returns {string} Human-readable status
 */
export const formatLoanStatus = (status) => {
    const statusMap = {
        REQUESTED: 'Requested',
        FUNDED: 'Funded',
        ACTIVE: 'Active',
        REPAID: 'Repaid',
        DEFAULTED: 'Defaulted',
        PLATFORM_SETTLED: 'Platform Settled',
        RECOVERY_SALE: 'In Recovery',
        PENDING: 'Pending',
        APPROVED: 'Approved',
        REJECTED: 'Rejected',
        CANCELLED: 'Cancelled',
    };

    return statusMap[status?.toUpperCase()] || status;
};

/**
 * Format escrow status for display
 * @param {string} status - Status code
 * @returns {string} Human-readable status
 */
export const formatEscrowStatus = (status) => {
    const statusMap = {
        CREATED: 'Created',
        FUNDED: 'Funded',
        SHIPPED: 'Shipped',
        DELIVERED: 'Delivered',
        DISPUTED: 'Disputed',
        RELEASED: 'Released',
        REFUNDED: 'Refunded',
    };

    return statusMap[status?.toUpperCase()] || status;
};

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength = 100) => {
    if (!text || text.length <= maxLength) return text;
    return `${text.slice(0, maxLength)}...`;
};

/**
 * Format phone number
 * @param {string} phone - Phone number
 * @returns {string} Formatted phone number
 */
export const formatPhoneNumber = (phone) => {
    if (!phone) return '';

    const cleaned = phone.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);

    if (match) {
        return `(${match[1]}) ${match[2]}-${match[3]}`;
    }

    return phone;
};

/**
 * Calculate and format loan interest
 * @param {number} principal - Principal amount
 * @param {number} rate - Annual interest rate (percentage)
 * @param {number} months - Loan duration in months
 * @returns {string} Formatted interest amount
 */
export const calculateInterest = (principal, rate, months) => {
    const monthlyRate = rate / 100 / 12;
    const interest = principal * monthlyRate * months;
    return formatCurrency(interest);
};

/**
 * Calculate total loan payment (principal + interest)
 * @param {number} principal - Principal amount
 * @param {number} rate - Annual interest rate (percentage)
 * @param {number} months - Loan duration in months
 * @returns {string} Formatted total amount
 */
export const calculateTotalPayment = (principal, rate, months) => {
    const monthlyRate = rate / 100 / 12;
    const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) /
        (Math.pow(1 + monthlyRate, months) - 1);
    return formatCurrency(monthlyPayment * months);
};
