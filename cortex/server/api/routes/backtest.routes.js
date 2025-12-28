import express from 'express';
import backtestService from '../../services/backtestService.js';

const router = express.Router();

/**
 * POST /api/backtest/run
 * Start a new backtest
 */
router.post('/run', async (req, res) => {
  try {
    const { symbol, timeframe, initialCapital, strategyId } = req.body;

    console.log(`[Backtest] Starting backtest for ${symbol}`);

    // Run backtest (async, returns results when complete)
    const results = await backtestService.runBacktest({
      symbol,
      timeframe: timeframe || '1h',
      initialCapital: initialCapital || 10000,
      strategyId
    });

    res.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('[Backtest] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/backtest/:id/pause
 */
router.post('/:id/pause', (req, res) => {
    const success = backtestService.pauseBacktest(req.params.id);
    res.json({ success });
});

/**
 * POST /api/backtest/:id/resume
 */
router.post('/:id/resume', (req, res) => {
    const success = backtestService.resumeBacktest(req.params.id);
    res.json({ success });
});

/**
 * POST /api/backtest/:id/stop
 */
router.post('/:id/stop', (req, res) => {
    const success = backtestService.stopBacktest(req.params.id);
    res.json({ success });
});

/**
 * GET /api/backtest/:id/results
 * Get full results (live or completed)
 */
router.get('/:id/results', (req, res) => {
    const active = backtestService.activeBacktests.get(req.params.id);
    if (active) {
        res.json({ status: active.status, results: active.results });
    } else {
        // TODO: Check completed/archived store if not active
        res.status(404).json({ error: 'Backtest not found' });
    }
});

/**
 * GET /api/backtest/:id/trace
 * Get decision trace for timeline
 */
router.get('/:id/trace', (req, res) => {
    const active = backtestService.activeBacktests.get(req.params.id);
    if (active && active.results) {
        res.json({ trace: active.results.decisionTrace });
    } else {
        res.status(404).json({ error: 'Trace not found' });
    }
});

/**
 * GET /api/backtest/:id/export
 * Export results to CSV
 */
router.get('/:id/export', (req, res) => {
    const active = backtestService.activeBacktests.get(req.params.id);
    if (active && active.results) {
        const csv = backtestService.getCSV(active.results);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=backtest_${req.params.id}.csv`);
        res.send(csv);
    } else {
        res.status(404).json({ error: 'Results not found' });
    }
});

/**
 * GET /api/backtest/:id/status
 * Get backtest progress
 */
router.get('/:id/status', (req, res) => {
  const status = backtestService.activeBacktests.get(req.params.id);
  if (status) {
      res.json({ 
          id: req.params.id, 
          status: status.status, 
          progress: status.progress,
          equity: status.results?.equityCurve?.slice(-1)[0]?.equity // Latest equity
      });
  } else {
      res.status(404).json({ error: 'Backtest not found' });
  }
});

export default router;
