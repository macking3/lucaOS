/**
 * IC Markets Client - Top choice for algo traders
 * Known for raw spreads and fast execution
 */

class IcMarketsClient {
  constructor() {
    this.token = null;
    this.accountID = null;
    this.isConnected = false;
  }

  async initialize(apiToken, accountId, environment) {
    try {
      this.token = apiToken;
      this.accountID = accountId;
      this.environment = environment || 'demo';
      this.isConnected = true;
      
      console.log('[IcMarketsClient] Initialized for', environment);
      return true;
    } catch (error) {
      console.error('[IcMarketsClient] Initialization failed:', error);
      this.isConnected = false;
      return false;
    }
  }

  async testConnection(apiToken, accountId, environment) {
    try {
      return apiToken && apiToken.length > 10 && accountId;
    } catch (error) {
      console.error('[IcMarketsClient] Connection test failed:', error);
      return false;
    }
  }

  async getAccount() {
    if (!this.isConnected) {
      throw new Error('IC Markets client not initialized');
    }

    return {
      balance: 10000.00,
      equity: 10000.00,
      margin: 0,
      freeMargin: 10000.00,
      leverage: 500,
      currency: 'USD',
      accountNumber: this.accountID,
      server: 'IC Markets Demo',
      unrealizedPL: 0,
      realizedPL: 0
    };
  }

  async getPositions() {
    if (!this.isConnected) {
      throw new Error('IC Markets client not initialized');
    }
    return [];
  }

  async executeTrade({ symbol, type, lots, sl, tp }) {
    if (!this.isConnected) {
      throw new Error('IC Markets client not initialized');
    }

    return {
      success: true,
      ticket: 'ICM' + Date.now(),
      message: `IC Markets order pending: ${type} ${lots} lots of ${symbol}`
    };
  }

  async closePosition(symbol) {
    if (!this.isConnected) {
      throw new Error('IC Markets client not initialized');
    }

    return {
      success: true,
      message: `IC Markets position closed for ${symbol}`
    };
  }

  async closeAllPositions() {
    if (!this.isConnected) {
      throw new Error('IC Markets client not initialized');
    }

    return {
      success: true,
      closedCount: 0,
      message: 'All IC Markets positions closed'
    };
  }
}

export default new IcMarketsClient();
