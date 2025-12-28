import express from 'express';
import { systemControlService } from '../../services/systemControlService.js';

const router = express.Router();

/**
 * SYSTEM INPUT CONTROL (Mouse/Keyboard)
 * Refactored to use systemControlService
 */
router.post('/input', async (req, res) => {
    try {
        const result = await systemControlService.executeAction(req.body);
        res.json({ status: result.success ? 'ok' : 'error', ...result });
    } catch (error) {
        console.error('[AUTOMATION_INPUT_ERROR]', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GENERIC COMMAND DISPATCHER
 * Redirects tool requests to the centralized service
 */
router.post('/command', async (req, res) => {
    try {
        const result = await systemControlService.executeAction(req.body);
        res.json(result);
    } catch (error) {
        console.error('[AUTOMATION_COMMAND_ERROR]', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
