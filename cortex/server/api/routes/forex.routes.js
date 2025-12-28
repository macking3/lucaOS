/**
 * 📊 Forex Trading API Routes
 * 
 * RESTful API for MT4 forex trading via LucaBridge EA.
 * All routes proxy requests to the MT4 HTTP bridge running on localhost:8080.
 */

import { Router } from 'express';
import forexAccountManager from '../../services/forexAccountManager.js';
import { getBrokerClient, getAllBrokerIds, SUPPORTED_BROKERS } from '../../services/brokers/index.js';

const router = Router();

// Logging middleware
router.use((req, res, next) => {
  console.log(`[Forex API] ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// BROKER ACCOUNT MANAGEMENT ROUTES
// ============================================================================

/**
 * GET /api/forex/brokers
 * List all supported brokers with metadata
 */
router.get('/brokers', (req, res) => {
  try {
    const brokers = Object.entries(SUPPORTED_BROKERS).map(([id, broker]) => ({
      id,
      name: broker.name,
      icon: broker.icon,
      color: broker.color,
      nigeriaFriendly: broker.nigeriaFriendly,
      requiresAccountId: broker.requiresAccountId,
      features: broker.features,
      apiType: broker.apiType
    }));

    res.json({ success: true, brokers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/forex/accounts/connect
 * Connect a new forex broker account
 */
router.post('/accounts/connect', async (req, res) => {
  try {
    const { broker, alias, apiKey, accountId, environment } = req.body;

    // Validation
    if (!broker || !alias || !apiKey) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: broker, alias, apiKey'
      });
    }

    const result = await forexAccountManager.saveAccount({
      broker,
      alias,
      apiKey,
      accountId,
      environment: environment || 'demo'
    });

    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/forex/accounts
 * List all connected forex accounts
 */
router.get('/accounts', async (req, res) => {
  try {
    const accounts = await forexAccountManager.listAccounts();
    res.json({ success: true, accounts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/forex/accounts/activate
 * Set active forex account
 */
router.post('/accounts/activate', async (req, res) => {
  try {
    const { vaultKey } = req.body;

    if (!vaultKey) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: vaultKey'
      });
    }

    const result = await forexAccountManager.setActiveAccount(vaultKey);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/forex/accounts/:vaultKey
 * Delete a forex account
 */
router.delete('/accounts/:vaultKey', async (req, res) => {
  try {
    const result = await forexAccountManager.deleteAccount(req.params.vaultKey);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ============================================================================
// TRADING ROUTES (Use Active Account)
// ============================================================================

/**
 * GET /api/forex/status
 * Check if any forex account is connected
 */
router.get('/status', async (req, res) => {
  try {
    const hasAccount = await forexAccountManager.hasActiveAccount();
    const activeAccount = hasAccount ? await forexAccountManager.getActiveAccount() : null;

    res.json({
      success: true,
      connected: hasAccount,
      broker: activeAccount ? activeAccount.broker : null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      connected: false,
      error: error.message
    });
  }
});

/**
 * GET /api/forex/account
 * Get active account information
 */
router.get('/account', async (req, res) => {
  try {
    const credentials = await forexAccountManager.getActiveCredentials();
    const client = getBrokerClient(credentials.broker);
    await client.initialize(credentials.apiKey, credentials.accountId, credentials.environment);

    const account = await client.getAccount();
    res.json({ success: true, account });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: error.message,
      hint: 'Connect a forex broker account first'
    });
  }
});

/**
 * GET /api/forex/positions
 * Get all open positions from active account
 */
router.get('/positions', async (req, res) => {
  try {
    const credentials = await forexAccountManager.getActiveCredentials();
    const client = getBrokerClient(credentials.broker);
    await client.initialize(credentials.apiKey, credentials.accountId, credentials.environment);

    const positions = await client.getPositions();
    res.json({
      success: true,
      positions,
      count: positions.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      positions: []
    });
  }
});

/**
 * POST /api/forex/trade
 * Execute a market order
 * Body: { symbol, type, lots, sl?, tp? }
 */
router.post('/trade', async (req, res) => {
  try {
    const { symbol, type, lots, sl, tp } = req.body;

    // Validation
    if (!symbol || !type || !lots) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: symbol, type, lots'
      });
    }

    if (!['BUY', 'SELL'].includes(type.toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: 'Type must be BUY or SELL'
      });
    }

    const credentials = await forexAccountManager.getActiveCredentials();
    const client = getBrokerClient(credentials.broker);
    await client.initialize(credentials.apiKey, credentials.accountId, credentials.environment);

    const result = await client.executeTrade({
      symbol,
      type,
      lots: parseFloat(lots),
      sl: sl ? parseFloat(sl) : undefined,
      tp: tp ? parseFloat(tp) : undefined
    });

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/forex/close
 * Close a specific position
 * Body: { ticket }
 */
router.post('/close', async (req, res) => {
  try {
    const { ticket } = req.body;

    if (!ticket) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: ticket'
      });
    }

    const credentials = await forexAccountManager.getActiveCredentials();
    const client = getBrokerClient(credentials.broker);
    await client.initialize(credentials.apiKey, credentials.accountId, credentials.environment);

    const result = await client.closePosition(ticket);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/forex/closeAll
 * Close all open positions
 */
router.post('/closeAll', async (req, res) => {
  try {
    const credentials = await forexAccountManager.getActiveCredentials();
    const client = getBrokerClient(credentials.broker);
    await client.initialize(credentials.apiKey, credentials.accountId, credentials.environment);

    const result = await client.closeAllPositions();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
