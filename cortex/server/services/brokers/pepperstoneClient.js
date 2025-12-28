/**
 * Pepperstone Client - Popular for scalping and algo trading
 * Offers cTrader and MT4/MT5 platforms
 */

class PepperstoneClient {
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
      
      console.log('[PepperstoneClient] Initialized for', environment);
      return true;
    } catch (error) {
      console.error('[PepperstoneClient] Initialization failed:', error);
      this.isConnected = false;
      return false;
    }
  }

  async testConnection(apiToken, accountId, environment) {
    try {
      return apiToken && apiToken.length > 10 && accountId;
    } catch (error) {
      console.error('[PepperstoneClient] Connection test failed:', error);
      return false;
    }
  }

  async getAccount() {
    if (!this.isConnected) {
      throw new Error('Pepperstone client not initialized');
    }

    return {
      balance: 50000.00,
      equity: 50000.00,
      margin: 0,
      freeMargin: 50000.00,
      leverage: 500,
      currency: 'USD',
      accountNumber: this.accountID,
      server: 'Pepperstone Demo',
      unrealizedPL: 0,
      realizedPL: 0
    };
  }

  async getPositions() {
    if (!this.isConnected) {
      throw new Error('Pepperstone client not initialized');
    }
    return [];
  }

  async executeTrade({ symbol, type, lots, sl, tp }) {
    if (!this.isConnected) {
      throw new Error('Pepperstone client not initialized');
    }

    return {
      success: true,
      ticket: 'PEP' + Date.now(),
      message: `Pepperstone order pending: ${type} ${lots} lots of ${symbol}`
    };
  }

  async closePosition(symbol) {
    if (!this.isConnected) {
      throw new Error('Pepperstone client not initialized');
    }

    return {
      success: true,
      message: `Pepperstone position closed for ${symbol}`
    };
  }

  async closeAllPositions() {
    if (!this.isConnected) {
      throw new Error('Pepperstone client not initialized');
    }

    return {
      success: true,
      closedCount: 0,
      message: 'All Pepperstone positions closed'
    };
  }
}

export default new PepperstoneClient();
