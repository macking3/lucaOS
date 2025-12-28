import express from 'express';
import os from 'os';
import { systemControlService } from '../../services/systemControlService.js';

const router = express.Router();

/**
 * COMPREHENSIVE WINDOWS CONTROL ENDPOINT
 * Refactored to use systemControlService for centralized logic
 */
router.post('/control-windows', async (req, res) => {
    const platform = os.platform();
    
    if (platform !== 'win32') {
        return res.json({ success: false, result: 'This endpoint is Windows-only.' });
    }

    try {
        const result = await systemControlService.executeWindowsAction(req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, result: error.message });
    }
});

export default router;
