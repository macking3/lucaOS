/**
 * 🎯 Trading API Routes
 * 
 * RESTful API for advanced trading features
 * Based on NoFx patterns with Luca enhancements
 * 
 * Endpoints:
 * - /api/trading/exchange/* - Exchange connection & management
 * - /api/trading/positions/* - Position management
 * - /api/trading/orders/* - Order execution
 * - /api/trading/analyze/* - Technical analysis
 * - /api/trading/strategy/* - Strategy CRUD
 */

import { Router } from 'express';
import exchangeManager, { SUPPORTED_EXCHANGES } from '../../services/exchangeManager.js';
import indicatorService from '../../services/indicatorService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Storage paths
const STORAGE_DIR = path.join(__dirname, '../../../../storage');
const STRATEGIES_DIR = path.join(STORAGE_DIR, 'strategies');
const TRADES_DIR = path.join(STORAGE_DIR, 'trades');

// Ensure storage directories exist
[STORAGE_DIR, STRATEGIES_DIR, TRADES_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// ============================================================================
// Middleware
// ============================================================================

// Logging middleware
router.use((req, res, next) => {
  console.log(`[Trading API] ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// Exchange Management
// ============================================================================

/**
 * GET /api/trading/exchange/supported
 * List supported exchanges
 */
router.get('/exchange/supported', (req, res) => {
  res.json({
    success: true,
    exchanges: SUPPORTED_EXCHANGES.map(e => ({
      id: e,
      name: e.charAt(0).toUpperCase() + e.slice(1),
      features: {
        futures: true,
        spot: true,
        margin: e !== 'hyperliquid'
      }
    }))
  });
});

/**
 * GET /api/trading/exchange/connected
 * List connected exchanges
 */
router.get('/exchange/connected', (req, res) => {
  res.json({
    success: true,
    exchanges: exchangeManager.getConnectedExchanges()
  });
});

/**
 * POST /api/trading/exchange/connect
 * Connect to an exchange
 */
router.post('/exchange/connect', async (req, res) => {
  const { exchange, apiKey, secretKey, passphrase, testnet } = req.body;

  if (!exchange || !apiKey || !secretKey) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: exchange, apiKey, secretKey'
    });
  }

  try {
    const result = await exchangeManager.connect(exchange, {
      apiKey,
      secretKey,
      passphrase,
      testnet
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/trading/exchange/disconnect
 * Disconnect from an exchange
 */
router.post('/exchange/disconnect', (req, res) => {
  const { exchange } = req.body;

  if (!exchange) {
    return res.status(400).json({
      success: false,
      error: 'Missing exchange parameter'
    });
  }

  exchangeManager.disconnect(exchange);

  res.json({
    success: true,
    message: `Disconnected from ${exchange}`
  });
});

/**
 * POST /api/trading/exchange/mode
 * Set trading mode (DEMO or REAL)
 */
router.post('/exchange/mode', (req, res) => {
  const { mode } = req.body;

  if (!mode || !['DEMO', 'REAL'].includes(mode.toUpperCase())) {
    return res.status(400).json({
      success: false,
      error: 'Invalid mode. Must be DEMO or REAL'
    });
  }

  exchangeManager.setMode(mode.toUpperCase() === 'DEMO');

  res.json({
    success: true,
    mode: mode.toUpperCase()
  });
});

// ============================================================================
// Balance & Positions
// ============================================================================

/**
 * GET /api/trading/exchange/:exchange/balance
 * Get account balance
 */
router.get('/exchange/:exchange/balance', async (req, res) => {
  const { exchange } = req.params;

  try {
    const balance = await exchangeManager.getBalance(exchange);

    res.json({
      success: true,
      exchange,
      balance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/trading/exchange/:exchange/positions
 * Get all open positions
 */
router.get('/exchange/:exchange/positions', async (req, res) => {
  const { exchange } = req.params;

  try {
    const positions = await exchangeManager.getPositions(exchange);

    res.json({
      success: true,
      exchange,
      positions,
      count: positions.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// Trading Operations
// ============================================================================

/**
 * POST /api/trading/exchange/:exchange/order
 * Execute a trade order
 */
router.post('/exchange/:exchange/order', async (req, res) => {
  const { exchange } = req.params;
  const { symbol, action, quantity, leverage = 10, stopLoss, takeProfit } = req.body;

  if (!symbol || !action) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: symbol, action'
    });
  }

  try {
    let result;

    switch (action.toLowerCase()) {
      case 'open_long':
        result = await exchangeManager.openLong(exchange, symbol, quantity, leverage);
        break;
      case 'open_short':
        result = await exchangeManager.openShort(exchange, symbol, quantity, leverage);
        break;
      case 'close_long':
        result = await exchangeManager.closeLong(exchange, symbol, quantity);
        break;
      case 'close_short':
        result = await exchangeManager.closeShort(exchange, symbol, quantity);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: `Invalid action: ${action}. Valid actions: open_long, open_short, close_long, close_short`
        });
    }

    // Set stop-loss and take-profit if provided
    if (result.success && stopLoss && (action === 'open_long' || action === 'open_short')) {
      const positionSide = action === 'open_long' ? 'LONG' : 'SHORT';
      await exchangeManager.setStopLoss(exchange, symbol, positionSide, quantity, stopLoss);
    }

    if (result.success && takeProfit && (action === 'open_long' || action === 'open_short')) {
      const positionSide = action === 'open_long' ? 'LONG' : 'SHORT';
      await exchangeManager.setTakeProfit(exchange, symbol, positionSide, quantity, takeProfit);
    }

    // Log trade for memory
    logTrade({
      exchange,
      ...result,
      action,
      stopLoss,
      takeProfit,
      timestamp: Date.now()
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/trading/exchange/:exchange/close-all
 * EMERGENCY: Close all positions
 */
router.post('/exchange/:exchange/close-all', async (req, res) => {
  const { exchange } = req.params;

  console.log(`[Trading API] ⚠️ EMERGENCY CLOSE ALL requested on ${exchange}`);

  try {
    const results = await exchangeManager.closeAllPositions(exchange);

    res.json({
      success: true,
      message: 'Emergency close all executed',
      results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/trading/exchange/:exchange/leverage
 * Set leverage for a symbol
 */
router.post('/exchange/:exchange/leverage', async (req, res) => {
  const { exchange } = req.params;
  const { symbol, leverage } = req.body;

  if (!symbol || !leverage) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: symbol, leverage'
    });
  }

  try {
    const result = await exchangeManager.setLeverage(exchange, symbol, leverage);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// Market Data & Analysis
// ============================================================================

/**
 * GET /api/trading/exchange/:exchange/price/:symbol
 * Get current market price
 */
router.get('/exchange/:exchange/price/:symbol', async (req, res) => {
  const { exchange, symbol } = req.params;

  try {
    const price = await exchangeManager.getMarketPrice(exchange, symbol);
    res.json({
      success: true,
      ...price
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/trading/analyze
 * Analyze a symbol with technical indicators
 */
router.post('/analyze', async (req, res) => {
  const { exchange, symbol, timeframe = '5m', limit = 100 } = req.body;

  if (!exchange || !symbol) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: exchange, symbol'
    });
  }

  try {
    // Fetch OHLCV data
    const klines = await exchangeManager.getOHLCV(exchange, symbol, timeframe, limit);

    // Analyze with indicators
    const analysis = indicatorService.analyzeSymbol(klines, symbol, { timeframe });
    const series = indicatorService.calculateSeriesData(klines, 10, timeframe);

    // Get additional data
    const fundingRate = await exchangeManager.getFundingRate(exchange, symbol);
    const openInterest = await exchangeManager.getOpenInterest(exchange, symbol);

    const result = {
      ...analysis,
      fundingRate,
      openInterest: openInterest ? {
        latest: openInterest.openInterest,
        average: openInterest.openInterest * 0.999 // Approximate
      } : null,
      series
    };

    res.json({
      success: true,
      data: result,
      formatted: indicatorService.formatForAI(result, symbol)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/trading/analyze/multi-timeframe
 * Analyze multiple timeframes
 */
router.post('/analyze/multi-timeframe', async (req, res) => {
  const { exchange, symbol, timeframes = ['5m', '15m', '1h', '4h'], limit = 100 } = req.body;

  if (!exchange || !symbol) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: exchange, symbol'
    });
  }

  try {
    const timeframeData = {};

    // Fetch OHLCV for each timeframe
    for (const tf of timeframes) {
      try {
        timeframeData[tf] = await exchangeManager.getOHLCV(exchange, symbol, tf, limit);
      } catch (e) {
        console.warn(`[Trading API] Failed to fetch ${tf} data:`, e.message);
      }
    }

    // Analyze all timeframes
    const analysis = indicatorService.analyzeMultiTimeframe(timeframeData, timeframes[0]);

    res.json({
      success: true,
      symbol,
      data: analysis
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/trading/indicators
 * List available indicators
 */
router.get('/indicators', (req, res) => {
  res.json({
    success: true,
    indicators: indicatorService.AVAILABLE_INDICATORS
  });
});

// ============================================================================
// Strategy Management
// ============================================================================

/**
 * GET /api/trading/strategy
 * List all strategies
 */
router.get('/strategy', (req, res) => {
  try {
    const files = fs.readdirSync(STRATEGIES_DIR).filter(f => f.endsWith('.json'));
    const strategies = files.map(f => {
      const content = fs.readFileSync(path.join(STRATEGIES_DIR, f), 'utf-8');
      return JSON.parse(content);
    });

    res.json({
      success: true,
      strategies
    });
  } catch (error) {
    res.json({
      success: true,
      strategies: []
    });
  }
});

/**
 * GET /api/trading/strategy/:id
 * Get a specific strategy
 */
router.get('/strategy/:id', (req, res) => {
  const { id } = req.params;
  const filePath = path.join(STRATEGIES_DIR, `${id}.json`);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      success: false,
      error: 'Strategy not found'
    });
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    res.json({
      success: true,
      strategy: JSON.parse(content)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/trading/strategy
 * Create a new strategy
 */
router.post('/strategy', (req, res) => {
  const strategy = req.body;

  if (!strategy.name) {
    return res.status(400).json({
      success: false,
      error: 'Strategy name is required'
    });
  }

  // Validate configuration
  const warnings = validateStrategyConfig(strategy);

  // Generate ID if not provided
  if (!strategy.id) {
    strategy.id = `strategy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Set timestamps
  strategy.createdAt = Date.now();
  strategy.updatedAt = Date.now();

  // Save to file
  const filePath = path.join(STRATEGIES_DIR, `${strategy.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(strategy, null, 2));

  res.json({
    success: true,
    id: strategy.id,
    warnings: warnings.length > 0 ? warnings : undefined
  });
});

/**
 * PUT /api/trading/strategy/:id
 * Update a strategy
 */
router.put('/strategy/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const filePath = path.join(STRATEGIES_DIR, `${id}.json`);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      success: false,
      error: 'Strategy not found'
    });
  }

  try {
    const existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // Check if it's a default strategy
    if (existing.isDefault) {
      return res.status(403).json({
        success: false,
        error: 'Cannot modify default strategy'
      });
    }

    // Merge updates
    const updated = { ...existing, ...updates, id, updatedAt: Date.now() };

    // Validate configuration
    const warnings = validateStrategyConfig(updated);

    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2));

    res.json({
      success: true,
      strategy: updated,
      warnings: warnings.length > 0 ? warnings : undefined
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/trading/strategy/:id
 * Delete a strategy
 */
router.delete('/strategy/:id', (req, res) => {
  const { id } = req.params;
  const filePath = path.join(STRATEGIES_DIR, `${id}.json`);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      success: false,
      error: 'Strategy not found'
    });
  }

  try {
    const existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    if (existing.isDefault) {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete default strategy'
      });
    }

    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: 'Strategy deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/trading/strategy/:id/export
 * Export strategy as JSON
 */
router.post('/strategy/:id/export', (req, res) => {
  const { id } = req.params;
  const filePath = path.join(STRATEGIES_DIR, `${id}.json`);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      success: false,
      error: 'Strategy not found'
    });
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const strategy = JSON.parse(content);

  // Remove internal fields for export
  delete strategy.userId;
  delete strategy.createdAt;
  delete strategy.updatedAt;

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${strategy.name}.json"`);
  res.send(JSON.stringify(strategy, null, 2));
});

/**
 * POST /api/trading/strategy/import
 * Import strategy from JSON
 */
router.post('/strategy/import', (req, res) => {
  const strategy = req.body;

  if (!strategy.name) {
    return res.status(400).json({
      success: false,
      error: 'Invalid strategy: name is required'
    });
  }

  // Generate new ID for import
  strategy.id = `strategy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  strategy.createdAt = Date.now();
  strategy.updatedAt = Date.now();
  strategy.isDefault = false;

  const filePath = path.join(STRATEGIES_DIR, `${strategy.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(strategy, null, 2));

  res.json({
    success: true,
    id: strategy.id,
    message: 'Strategy imported successfully'
  });
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate strategy configuration (NoFx pattern)
 */
function validateStrategyConfig(config) {
  const warnings = [];

  // Check quant data URL placeholder
  if (config.indicators?.enableQuantData && config.indicators?.quantDataAPIURL) {
    if (!config.indicators.quantDataAPIURL.includes('{symbol}')) {
      warnings.push('Quant data URL does not contain {symbol} placeholder. The same data will be used for all coins.');
    }
  }

  // Check risk control limits
  if (config.riskControl) {
    if (config.riskControl.maxPositions > 10) {
      warnings.push('High number of max positions (>10) may increase risk.');
    }
    if (config.riskControl.positionSizePercent > 50) {
      warnings.push('Position size >50% of balance is very risky.');
    }
    if (config.riskControl.btcEthLeverage > 20 || config.riskControl.altcoinLeverage > 10) {
      warnings.push('High leverage detected. Proceed with caution.');
    }
  }

  return warnings;
}

/**
 * Log trade for memory/archive
 */
function logTrade(trade) {
  try {
    const date = new Date().toISOString().split('T')[0];
    const logFile = path.join(TRADES_DIR, `trades_${date}.json`);

    let trades = [];
    if (fs.existsSync(logFile)) {
      trades = JSON.parse(fs.readFileSync(logFile, 'utf-8'));
    }

    trades.push(trade);
    fs.writeFileSync(logFile, JSON.stringify(trades, null, 2));
  } catch (error) {
    console.error('[Trading API] Failed to log trade:', error.message);
  }
}

// ============================================================================
// Trade History
// ============================================================================

/**
 * GET /api/trading/history
 * Get trade history
 */
router.get('/history', (req, res) => {
  const { date, limit = 100 } = req.query;

  try {
    let trades = [];

    if (date) {
      // Get specific date
      const logFile = path.join(TRADES_DIR, `trades_${date}.json`);
      if (fs.existsSync(logFile)) {
        trades = JSON.parse(fs.readFileSync(logFile, 'utf-8'));
      }
    } else {
      // Get all trades
      const files = fs.readdirSync(TRADES_DIR)
        .filter(f => f.startsWith('trades_') && f.endsWith('.json'))
        .sort()
        .reverse();

      for (const file of files) {
        const content = JSON.parse(fs.readFileSync(path.join(TRADES_DIR, file), 'utf-8'));
        trades.push(...content);
        if (trades.length >= limit) break;
      }
    }

    res.json({
      success: true,
      trades: trades.slice(0, limit),
      count: trades.length
    });
  } catch (error) {
    res.json({
      success: true,
      trades: [],
      count: 0
    });
  }
});

export default router;
