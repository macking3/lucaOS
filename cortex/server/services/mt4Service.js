/**
 * 🔌 MT4 Bridge Service
 * 
 * Communicates with MT4 terminal via REST API bridge (LucaBridge EA).
 * The MQL4 Expert Advisor runs an HTTP server on localhost:8080.
 * This service acts as a proxy between LUCA's backend and MT4.
 * 
 * Architecture:
 * LUCA Backend → MT4Service → HTTP → LucaBridge EA (MQL4) → MT4 Terminal
 */

class MT4Service {
  constructor(bridgeUrl = 'http://localhost:8080') {
    this.bridgeUrl = bridgeUrl;
    this.isConnected = false;
  }

  /**
   * Test connection to MT4 bridge
   */
  async testConnection() {
    try {
      const res = await fetch(`${this.bridgeUrl}/ping`, { timeout: 2000 });
      this.isConnected = res.ok;
      return this.isConnected;
    } catch (error) {
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Get MT4 account information
   * @returns {Object} { balance, equity, margin, freeMargin, leverage, currency }
   */
  async getAccount() {
    if (!this.isConnected) {
      await this.testConnection();
    }

    try {
      const res = await fetch(`${this.bridgeUrl}/account`);
      if (!res.ok) throw new Error(`MT4 Bridge returned ${res.status}`);
      
      const data = await res.json();
      return {
        balance: parseFloat(data.balance || 0),
        equity: parseFloat(data.equity || 0),
        margin: parseFloat(data.margin || 0),
        freeMargin: parseFloat(data.freeMargin || 0),
        leverage: parseInt(data.leverage || 100),
        currency: data.currency || 'USD',
        server: data.server || 'Unknown',
        accountNumber: data.accountNumber || '0'
      };
    } catch (error) {
      console.error('[MT4Service] Failed to get account:', error.message);
      throw new Error('MT4 Bridge offline or not responding');
    }
  }

  /**
   * Get open positions
   * @returns {Array} [{ ticket, symbol, type, lots, openPrice, currentPrice, profit, sl, tp }]
   */
  async getPositions() {
    try {
      const res = await fetch(`${this.bridgeUrl}/positions`);
      if (!res.ok) throw new Error(`MT4 Bridge returned ${res.status}`);
      
      const positions = await res.json();
      return positions.map(p => ({
        ticket: p.ticket,
        symbol: p.symbol,
        type: p.type === 0 ? 'BUY' : 'SELL', // MT4: 0=Buy, 1=Sell
        lots: parseFloat(p.lots),
        openPrice: parseFloat(p.openPrice),
        currentPrice: parseFloat(p.currentPrice || p.openPrice),
        profit: parseFloat(p.profit || 0),
        sl: parseFloat(p.sl || 0),
        tp: parseFloat(p.tp || 0),
        openTime: p.openTime || Date.now()
      }));
    } catch (error) {
      console.error('[MT4Service] Failed to get positions:', error.message);
      return [];
    }
  }

  /**
   * Execute a market order
   * @param {Object} params - { symbol, type, lots, sl, tp }
   * @returns {Object} { success, ticket, message }
   */
  async executeTrade({ symbol, type, lots, sl, tp }) {
    try {
      const orderType = type.toUpperCase() === 'BUY' ? 0 : 1; // MT4: 0=Buy, 1=Sell
      
      const res = await fetch(`${this.bridgeUrl}/trade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          type: orderType,
          lots: parseFloat(lots),
          sl: parseFloat(sl || 0),
          tp: parseFloat(tp || 0)
        })
      });

      const result = await res.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Trade execution failed');
      }

      return {
        success: true,
        ticket: result.ticket,
        message: `Order ${result.ticket} executed: ${type} ${lots} lots of ${symbol}`
      };
    } catch (error) {
      console.error('[MT4Service] Trade execution failed:', error.message);
      return {
        success: false,
        ticket: null,
        message: error.message
      };
    }
  }

  /**
   * Close a specific position
   * @param {Number} ticket - Order ticket number
   * @returns {Object} { success, message }
   */
  async closePosition(ticket) {
    try {
      const res = await fetch(`${this.bridgeUrl}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket: parseInt(ticket) })
      });

      const result = await res.json();
      
      return {
        success: result.success || false,
        message: result.message || 'Position closed'
      };
    } catch (error) {
      console.error('[MT4Service] Failed to close position:', error.message);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Close all open positions
   * @returns {Object} { success, closedCount, message }
   */
  async closeAllPositions() {
    try {
      const positions = await this.getPositions();
      let closedCount = 0;

      for (const position of positions) {
        const result = await this.closePosition(position.ticket);
        if (result.success) closedCount++;
      }

      return {
        success: true,
        closedCount,
        message: `Closed ${closedCount} of ${positions.length} positions`
      };
    } catch (error) {
      console.error('[MT4Service] Failed to close all positions:', error.message);
      return {
        success: false,
        closedCount: 0,
        message: error.message
      };
    }
  }
}

export default new MT4Service();
