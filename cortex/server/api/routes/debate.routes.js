/**
 * 🗣️ Debate API Routes
 * 
 * Endpoints for managing AI Debates.
 * Includes SSE for real-time updates.
 */

import express from 'express';
import debateManager from '../../services/tradingDebateService.js';
import osintService from '../../services/osintService.js';

const router = express.Router();

/**
 * POST /api/trading/debate
 * Start a new debate
 * Body: { symbol, exchange, maxRounds, participants, strategyId }
 */
router.post('/', async (req, res) => {
  const config = req.body;

  // Dynamic Symbol Selection (NoFx Parity)
  if (!config.symbol) {
    try {
      const topCoins = await osintService.getTopRatedCoins(1);
      if (topCoins && topCoins.length > 0) {
        config.symbol = topCoins[0];
        console.log(`[DebateRoute] Auto-selected symbol: ${config.symbol}`);
      } else {
        config.symbol = 'BTC/USDT'; // Fallback
      }
    } catch (e) {
      console.warn('[DebateRoute] Failed to auto-select symbol, using BTC/USDT');
      config.symbol = 'BTC/USDT';
    }
  }

  try {
    const session = await debateManager.startDebate(config);
    res.json({ success: true, session });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/trading/debate
 * List all debates
 */
router.get('/', (req, res) => {
  const debates = debateManager.getAllDebates();
  res.json({ success: true, count: debates.length, debates });
});

/**
 * GET /api/trading/debate/:id
 * Get debate details (polling)
 */
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const session = debateManager.getDebate(id);

  if (!session) {
    return res.status(404).json({ success: false, error: 'Debate not found' });
  }

  res.json({ success: true, session });
});

/**
 * POST /api/trading/debate/:id/execute
 * Manually execute debate consensus
 */
router.post('/:id/execute', async (req, res) => {
  const { id } = req.params;
  try {
    await debateManager.executeConsensus(id);
    res.json({ success: true, message: 'Execution triggered' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Real-time Streaming (SSE)
// ============================================================================

/**
 * GET /api/trading/debate/:id/events
 * Subscribe to debate updates (Server-Sent Events)
 */
router.get('/:id/events', (req, res) => {
  const { id } = req.params;
  const session = debateManager.getDebate(id);

  if (!session) {
    return res.status(404).json({ success: false, error: 'Debate not found' });
  }

  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send initial state
  res.write(`data: ${JSON.stringify({ type: 'init', session })}\n\n`);

  // Event Listeners
  const onUpdate = (debateId, updatedSession) => {
    if (debateId === id) {
      res.write(`data: ${JSON.stringify({ type: 'update', session: updatedSession })}\n\n`);
    }
  };

  const onMessage = (debateId, message) => {
    if (debateId === id) {
      res.write(`data: ${JSON.stringify({ type: 'message', message })}\n\n`);
    }
  };

  const onVote = (debateId, vote) => {
    if (debateId === id) {
      res.write(`data: ${JSON.stringify({ type: 'vote', vote })}\n\n`);
    }
  };

  // Bind listeners
  debateManager.on('update', onUpdate);
  debateManager.on('message', onMessage);
  debateManager.on('vote', onVote);

  // Cleanup on close
  req.on('close', () => {
    debateManager.off('update', onUpdate);
    debateManager.off('message', onMessage);
    debateManager.off('vote', onVote);
  });
});

export default router;
