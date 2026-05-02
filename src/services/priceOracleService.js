/**
 * Price Oracle Service
 * Provides real-time price feeds for collateral valuation
 * Supports multiple oracle sources for redundancy
 */

import api from '../utils/api/client';

const ORACLE_API = '/api/oracle';

// Default trusted oracle sources
const ORACLE_SOURCES = {
  primary: {
    name: 'Chainlink',
    logo: '🔗',
    reliability: 99.9
  },
  secondary: {
    name: 'Uniswap',
    logo: '🦄',
    reliability: 99.5
  },
  tertiary: {
    name: 'CoinGecko',
    logo: '🐢',
    reliability: 98.0
  }
};

// Cache for price data
let priceCache = {};
const CACHE_DURATION = 60000; // 1 minute

class PriceOracleService {
  constructor() {
    this.sources = ORACLE_SOURCES;
    this.primarySource = 'primary';
    this.fallbackEnabled = true;
  }

  /**
   * Get price for a single asset
   */
  async getPrice(assetSymbol) {
    // Check cache first
    const cached = this.getFromCache(assetSymbol);
    if (cached) {
      return cached;
    }

    try {
      const response = await api.get(`${ORACLE_API}/price/${assetSymbol}`);
      const priceData = response.data;
      
      // Cache the result
      this.setCache(assetSymbol, priceData);
      
      return priceData;
    } catch (error) {
      // Try fallback sources
      if (this.fallbackEnabled) {
        return this.getPriceFromFallback(assetSymbol);
      }
      throw error;
    }
  }

  /**
   * Get prices for multiple assets
   */
  async getPrices(assetSymbols) {
    const prices = {};
    const promises = assetSymbols.map(async (symbol) => {
      try {
        prices[symbol] = await this.getPrice(symbol);
      } catch (error) {
        prices[symbol] = null;
      }
    });
    
    await Promise.all(promises);
    return prices;
  }

  /**
   * Get price with multiple source validation
   */
  async getPriceWithValidation(assetSymbol) {
    const [primary, secondary, tertiary] = await Promise.allSettled([
      this.fetchFromSource(assetSymbol, 'primary'),
      this.fetchFromSource(assetSymbol, 'secondary'),
      this.fetchFromSource(assetSymbol, 'tertiary')
    ]);

    const results = {
      primary: primary.status === 'fulfilled' ? primary.value : null,
      secondary: secondary.status === 'fulfilled' ? secondary.value : null,
      tertiary: tertiary.status === 'fulfilled' ? tertiary.value : null
    };

    // Calculate weighted average if we have multiple sources
    const validSources = Object.entries(results)
      .filter(([_, value]) => value !== null)
      .map(([key, value]) => ({
        source: key,
        ...value,
        weight: this.sources[key]?.reliability || 90
      }));

    if (validSources.length === 0) {
      throw new Error(`No price data available for ${assetSymbol}`);
    }

    if (validSources.length === 1) {
      return {
        ...validSources[0],
        isAggregated: false
      };
    }

    // Calculate weighted average
    const totalWeight = validSources.reduce((sum, s) => sum + s.weight, 0);
    const weightedPrice = validSources.reduce((sum, s) => 
      sum + (s.price * s.weight / totalWeight), 0
    );

    // Check for significant deviations
    const prices = validSources.map(s => s.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const deviation = maxPrice - minPrice;
    const deviationPercent = (deviation / weightedPrice) * 100;

    // Alert if deviation is too high
    const hasDeviation = deviationPercent > 5;

    return {
      price: weightedPrice,
      currency: 'USD',
      timestamp: Date.now(),
      sources: validSources.map(s => s.source),
      isAggregated: true,
      deviation: hasDeviation ? deviationPercent : 0,
      warning: hasDeviation ? 'Price deviation exceeds 5%' : null
    };
  }

  /**
   * Get collateral value for multiple assets
   */
  async getCollateralValue(collaterals) {
    const results = [];
    
    for (const collateral of collaterals) {
      try {
        const priceData = await this.getPriceWithValidation(collateral.symbol);
        const value = collateral.amount * priceData.price;
        
        results.push({
          id: collateral.id,
          symbol: collateral.symbol,
          amount: collateral.amount,
          price: priceData.price,
          value: value,
          currency: 'USD',
          source: priceData.sources?.[0] || 'unknown',
          lastUpdated: priceData.timestamp
        });
      } catch (error) {
        results.push({
          id: collateral.id,
          symbol: collateral.symbol,
          error: error.message
        });
      }
    }
    
    return results;
  }

  /**
   * Calculate LTV (Loan-to-Value) ratio
   */
  async calculateLTV(loanAmount, collateralAssets) {
    const collateralValues = await this.getCollateralValue(collateralAssets);
    
    const totalCollateralValue = collateralValues.reduce((sum, c) => 
      sum + (c.value || 0), 0
    );
    
    if (totalCollateralValue === 0) {
      return { ltv: 0, isValid: false };
    }
    
    const ltv = (loanAmount / totalCollateralValue) * 100;
    
    return {
      ltv: Math.round(ltv * 100) / 100,
      loanAmount,
      collateralValue: totalCollateralValue,
      isValid: ltv <= 100,
      riskLevel: this.getRiskLevel(ltv)
    };
  }

  /**
   * Get risk level based on LTV
   */
  getRiskLevel(ltv) {
    if (ltv <= 25) return { level: 'A', label: 'Excellent', color: 'green' };
    if (ltv <= 50) return { level: 'B', label: 'Good', color: 'blue' };
    if (ltv <= 70) return { level: 'C', label: 'Fair', color: 'yellow' };
    if (ltv <= 85) return { level: 'D', label: 'Poor', color: 'orange' };
    return { level: 'F', label: 'Very High Risk', color: 'red' };
  }

  /**
   * Get historical price data
   */
  async getHistoricalPrices(assetSymbol, days = 30) {
    const response = await api.get(`${ORACLE_API}/history/${assetSymbol}`, {
      params: { days }
    });
    return response.data;
  }

  /**
   * Get price change percentage
   */
  async getPriceChange(assetSymbol, period = '24h') {
    const response = await api.get(`${ORACLE_API}/change/${assetSymbol}`, {
      params: { period }
    });
    return response.data;
  }

  /**
   * Get supported assets
   */
  getSupportedAssets() {
    return [
      { symbol: 'BTC', name: 'Bitcoin', type: 'crypto' },
      { symbol: 'ETH', name: 'Ethereum', type: 'crypto' },
      { symbol: 'USDT', name: 'Tether', type: 'stablecoin' },
      { symbol: 'USDC', name: 'USD Coin', type: 'stablecoin' },
      { symbol: 'WBTC', name: 'Wrapped Bitcoin', type: 'crypto' },
      { symbol: 'WETH', name: 'Wrapped Ethereum', type: 'crypto' },
      { symbol: 'LINK', name: 'Chainlink', type: 'crypto' }
    ];
  }

  /**
   * Fetch price from specific source
   */
  async fetchFromSource(assetSymbol, source) {
    // In production, this would call actual oracle APIs
    const response = await api.get(`${ORACLE_API}/price/${assetSymbol}`, {
      params: { source }
    });
    return response.data;
  }

  /**
   * Fallback price retrieval
   */
  async getPriceFromFallback(assetSymbol) {
    const sources = ['secondary', 'tertiary'];
    
    for (const source of sources) {
      try {
        const data = await this.fetchFromSource(assetSymbol, source);
        this.setCache(assetSymbol, data);
        return data;
      } catch (error) {
        continue;
      }
    }
    
    // Return cached data if available, even if stale
    if (priceCache[assetSymbol]) {
      return {
        ...priceCache[assetSymbol],
        isStale: true
      };
    }
    
    throw new Error(`Unable to fetch price for ${assetSymbol}`);
  }

  /**
   * Cache management
   */
  getFromCache(symbol) {
    const cached = priceCache[symbol];
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > CACHE_DURATION) {
      delete priceCache[symbol];
      return null;
    }
    
    return cached;
  }

  setCache(symbol, data) {
    priceCache[symbol] = {
      ...data,
      timestamp: Date.now()
    };
  }

  /**
   * Clear price cache
   */
  clearCache() {
    priceCache = {};
  }
}

export default new PriceOracleService();
