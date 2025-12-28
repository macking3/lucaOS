import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import exchangeManager from './exchangeManager.js';
import indicatorService from './indicatorService.js';
import tradingDebateService from './tradingDebateService.js';

// ============================================================================
// Simulated Exchange Adapter (Parity with ExchangeManager)
// ============================================================================

class SimulatedExchange {
  constructor(initialBalance = 10000) {
    this.balance = {
      USDT: { free: initialBalance, used: 0, total: initialBalance }
    };
    this.positions = [];
    this.orders = [];
    this.tradeHistory = [];
    this.currentPrice = 0;
    this.currentTime = 0;
  }

  // Set current context (called by backtest loop)
  updateContext(price, timestamp) {
    this.currentPrice = price;
    this.currentTime = timestamp;
    this.updatePnL(); // Update unrealized PnL
  }

  async getBalance() {
    return this.balance;
  }

  async getPositions() {
    return this.positions;
  }

  async createOrder(symbol, type, side, amount, price = null, params = {}) {
    // Simulate order execution
    const executionPrice = price || this.currentPrice;
    const value = amount * executionPrice;
    const fee = value * 0.0004; // 0.04% taker fee (Binance Futures)

    // Check balance
    if (this.balance.USDT.free < fee) {
      throw new Error('Insufficient balance for fees');
    }

    const orderId = `sim_ord_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    // Update Balance
    this.balance.USDT.free -= fee;
    this.balance.USDT.total -= fee;

    // Create/Update Position
    let position = this.positions.find(p => p.symbol === symbol && p.side === (side === 'buy' ? 'long' : 'short'));
    
    if (position) {
      // AVG Entry Price calculation
      const totalVal = (position.contracts * position.entryPrice) + value;
      position.contracts += amount;
      position.entryPrice = totalVal / position.contracts;
    } else {
      position = {
        symbol,
        side: side === 'buy' ? 'long' : 'short',
        contracts: amount,
        entryPrice: executionPrice,
        unrealizedPnL: 0,
        leverage: params.leverage || 1
      };
      this.positions.push(position);
    }

    // Log Trade
    this.tradeHistory.push({
      id: orderId,
      timestamp: this.currentTime,
      symbol,
      side,
      amount,
      price: executionPrice,
      fee,
      pnl: 0 // Realized PnL calculated on close
    });

    return {
      id: orderId,
      symbol,
      status: 'closed', // Instant execution
      filled: amount,
      average: executionPrice
    };
  }

  updatePnL() {
    this.positions.forEach(pos => {
      const diff = this.currentPrice - pos.entryPrice;
      if (pos.side === 'long') {
        pos.unrealizedPnL = diff * pos.contracts;
      } else {
        pos.unrealizedPnL = -diff * pos.contracts;
      }
    });

    // Update Simulated Equity
    const totalUnrealized = this.positions.reduce((sum, p) => sum + p.unrealizedPnL, 0);
    this.balance.USDT.total = this.balance.USDT.free + totalUnrealized;
  }
}

// ============================================================================
// Backtest Service
// ============================================================================

// ============================================================================
// Backtest Service
// ============================================================================

class BacktestService extends EventEmitter {
  constructor() {
    super();
    this.activeBacktests = new Map();
    this.controllers = new Map(); // Stores execution control { stop, paused, resumeResolve }
  }

  /**
   * Run a backtest using historical data
   * @param {Object} config - { symbol, timeframe, startDate, endDate, initialCapital, decisionTrace: boolean }
   */
  async runBacktest(config) {
    const backtestId = `bt_${Date.now()}`;
    console.log(`[Backtest] Starting ${backtestId} for ${config.symbol}`);

    // Store in active backtests map
    this.activeBacktests.set(backtestId, { 
        status: 'running', 
        progress: 0,
        startTime: Date.now()
    });

    // Initialize Controller
    this.controllers.set(backtestId, {
        stop: false,
        paused: false,
        resumeResolve: null
    });

    // Run async (don't block)
    this.executeBacktest(backtestId, config);

    return { id: backtestId };
  }

  /**
   * Pause a running backtest
   */
  pauseBacktest(id) {
      const controller = this.controllers.get(id);
      if (controller && !controller.paused) {
          controller.paused = true;
          const status = this.activeBacktests.get(id);
          if (status) status.status = 'paused';
          this.emit('statusChange', { id, status: 'paused' });
          console.log(`[Backtest] ${id} PAUSED`);
          return true;
      }
      return false;
  }

  /**
   * Resume a paused backtest
   */
  resumeBacktest(id) {
      const controller = this.controllers.get(id);
      if (controller && controller.paused) {
          controller.paused = false;
          // Resolve the promise needed to unblock the loop
          if (controller.resumeResolve) {
              controller.resumeResolve();
              controller.resumeResolve = null;
          }
          const status = this.activeBacktests.get(id);
          if (status) status.status = 'running';
          this.emit('statusChange', { id, status: 'running' });
          console.log(`[Backtest] ${id} RESUMED`);
          return true;
      }
      return false;
  }

  /**
   * Stop/Cancel a backtest
   */
  stopBacktest(id) {
      const controller = this.controllers.get(id);
      if (controller) {
          controller.stop = true;
          // If paused, we must resume it so it can exit the loop
          if (controller.paused && controller.resumeResolve) {
              controller.resumeResolve();
          }
          this.activeBacktests.delete(id);
          this.controllers.delete(id);
          console.log(`[Backtest] ${id} STOPPED`);
          return true;
      }
      return false;
  }

  /**
   * Execute the backtest (async, emits events)
   */
  async executeBacktest(backtestId, config, results) {
    try {
      // 1. Fetch Historical Data (using ExchangeManager)
      // For now, fetching last 500 candles as mock history
      // In production: Use full history downloader
      const klines = await exchangeManager.getOHLCV('binance', config.symbol, config.timeframe, 500);
      
      // 2. Initialize Simulation
      const simExchange = new SimulatedExchange(config.initialCapital || 10000);
      // results is passed in now

      // 3. Iteration Loop (Tick-by-Tick Simulation)
      for (let i = 50; i < klines.length; i++) { // Start after warm-up period
        
        // CHECK CONTROL SIGNALS
        const controller = this.controllers.get(backtestId);
        if (!controller || controller.stop) break; // Exit if stopped or removed

        // Handle PAUSE
        if (controller.paused) {
            await new Promise(resolve => {
                controller.resumeResolve = resolve;
            });
            // Re-check stop after resume
            if (this.controllers.get(backtestId)?.stop) break;
        }

        const slice = klines.slice(0, i + 1);
        const currentCandle = klines[i];
        
        // Update Simulator Context
        simExchange.updateContext(currentCandle[4], currentCandle[0]); // Close price, Timestamp

        // 4. Calculate Indicators (Reusing IndicatorService)
        const analysis = await indicatorService.analyzeSymbol(slice, config.symbol);

        // 5. Strategy Logic (Reuse Debate Service Logic or simple strategy)
        // Fast-Forward: We can't run full AI debate for every candle (too slow/expensive)
        // So we use a "Fast Strategy" or "Cached Decision" logic here
        // For parity proof, we'll implement a simple MACD strategy here to test the engine
        
        let decision = { action: 'HOLD', reason: 'No signal', confidence: 0 };

        if (analysis.macd && analysis.macd.histogram > 0 && analysis.rsi < 70) {
          // BUY Signal
          decision = { action: 'BUY', reason: 'MACD Crossover + RSI Oversold', confidence: 0.85 };
          const balance = (await simExchange.getBalance()).USDT.free;
          if (balance > 100) {
            const quantity = (balance * 0.95) / currentCandle[4]; // 95% of capital
            await simExchange.createOrder(config.symbol, 'market', 'buy', quantity, currentCandle[4]);
          }
        } else if (analysis.macd && analysis.macd.histogram < 0) {
          // SELL Signal (Close Position)
          decision = { action: 'SELL', reason: 'MACD Bearish Div', confidence: 0.75 };
          const positions = await simExchange.getPositions();
          const longPos = positions.find(p => p.side === 'long');
          if (longPos) {
             // Close logic (simplified for proof of concept)
             // In real engine: simExchange.createOrder(..., 'sell', ...)
             // For now assuming simulation handles position closing via order
          }
        }

        // 6. Record State & Trace
        const balance = await simExchange.getBalance();
        results.equityCurve.push({
          time: currentCandle[0],
          equity: balance.USDT.total,
          price: currentCandle[4]
        });

        // Record Decision Trace (Limit size if needed, or sample)
        results.decisionTrace.push({
            time: currentCandle[0],
            equity: balance.USDT.total,
            indicators: { rsi: analysis.rsi, macd: analysis.macd?.histogram },
            decision: decision.action,
            reason: decision.reason,
            confidence: decision.confidence
        });

        // Emit Progress
        const progress = Math.round(((i - 50) / (klines.length - 50)) * 100);
        // Throttle updates to avoid event spam
        if (i % 5 === 0) {
            this.emit('progress', { id: backtestId, progress, equity: balance.USDT.total });
            
            // Also update internal state
            const state = this.activeBacktests.get(backtestId);
            if(state) state.progress = progress;
        }
        
        // Artificial Delay to demonstrate Pause/Resume UI (remove in production for speed)
        await new Promise(r => setTimeout(r, 10)); 
      }

      // 7. Final Report
      const finalEquity = results.equityCurve[results.equityCurve.length - 1].equity;
      
      // Calculate Max Drawdown
      let peak = -Infinity;
      let maxDrawdown = 0;
      for (const point of results.equityCurve) {
        if (point.equity > peak) peak = point.equity;
        const drawdown = (peak - point.equity) / peak * 100;
        if (drawdown > maxDrawdown) maxDrawdown = drawdown;
      }

      // Calculate Win Rate
      const completedTrades = simExchange.tradeHistory.filter(t => t.status === 'closed' || t.pnl !== 0); 
      
      const totalTrades = completedTrades.length;
      const winningTrades = completedTrades.filter(t => t.pnl > 0).length;
      const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

      results.metrics = {
        totalReturn: ((finalEquity - config.initialCapital) / config.initialCapital) * 100,
        winRate: winRate, 
        maxDrawdown: maxDrawdown,
        totalTrades: totalTrades
      };

      // Cleanup
      this.activeBacktests.delete(backtestId);
      this.controllers.delete(backtestId);

      this.emit('complete', { id: backtestId, results });
      return results;

    } catch (error) {
      console.error(`[Backtest] Failed: ${error.message}`);
      this.activeBacktests.delete(backtestId);
      this.controllers.delete(backtestId);
      this.emit('error', { id: backtestId, error: error.message });
      throw error;
    }
  }

  // Export Helper
  getCSV(results) {
      if (!results || !results.trades) return '';
      const header = 'Date,Type,Symbol,Side,Price,Amount,Fee,PnL\n';
      const rows = results.trades.map(t => {
          return `${new Date(t.timestamp).toISOString()},${t.type},${t.symbol},${t.side},${t.price},${t.amount},${t.fee},${t.pnl}`;
      }).join('\n');
      return header + rows;
  }
}

const backtestService = new BacktestService();
export default backtestService;
