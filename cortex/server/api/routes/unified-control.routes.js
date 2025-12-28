import express from 'express';
import { systemControlService } from '../../services/systemControlService.js';

const router = express.Router();

/**
 * UNIFIED CROSS-PLATFORM CONTROL ENDPOINT
 * Refactored to call systemControlService directly instead of internal HTTP fetch
 */
router.post('/control-unified', async (req, res) => {
    try {
        // executeAction automatically detects platform if not provided in req.body
        const result = await systemControlService.executeAction(req.body);
        res.json(result);
    } catch (error) {
        console.error('[UNIFIED_CONTROL_ERROR]', error);
        res.status(500).json({ success: false, result: error.message });
    }
});

export default router;
