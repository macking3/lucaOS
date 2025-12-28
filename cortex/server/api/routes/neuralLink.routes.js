import express from 'express';
import { socketService } from '../../services/socketService.js';
import { WS_PORT } from '../../config/constants.js';

const router = express.Router();

/**
 * POST /api/neural-link/start
 * Start the Neural Link socket server (on-demand)
 */
router.post('/start', (req, res) => {
    try {
        if (socketService.isRunning()) {
            return res.json({ success: true, message: 'Neural Link already running', status: 'running' });
        }

        socketService.initialize();
        res.json({ success: true, message: 'Neural Link server started', status: 'running' });
    } catch (error) {
        console.error('[NEURAL_LINK] Failed to start:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/neural-link/stop
 * Stop the Neural Link socket server
 */
router.post('/stop', (req, res) => {
    try {
        if (!socketService.isRunning()) {
            return res.json({ success: true, message: 'Neural Link already stopped', status: 'stopped' });
        }

        socketService.shutdown();
        res.json({ success: true, message: 'Neural Link server stopped', status: 'stopped' });
    } catch (error) {
        console.error('[NEURAL_LINK] Failed to stop:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/neural-link/status
 * Get the current status of the Neural Link socket server
 */
router.get('/status', (req, res) => {
    const isRunning = socketService.isRunning();
    res.json({
        status: isRunning ? 'running' : 'stopped',
        port: isRunning ? WS_PORT : null
    });
});

export default router;
