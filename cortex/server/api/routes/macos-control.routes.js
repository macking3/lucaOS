import express from 'express';
import os from 'os';
import { systemControlService } from '../../services/systemControlService.js';

const router = express.Router();

/** 
 * COMPREHENSIVE MACOS CONTROL ENDPOINT
 * Refactored to use systemControlService for core logic
 */
router.post('/control-macos', async (req, res) => {
    const platform = os.platform();
    
    if (platform !== 'darwin') {
        return res.json({ success: false, result: 'This endpoint is macOS-only.' });
    }

    try {
        const result = await systemControlService.executeMacOSAction(req.body);
        res.json(result);
    } catch (error) {
        console.error('[MACOS_CONTROL_ROUTE] Error:', error);
        res.status(500).json({ success: false, result: error.message });
    }
});

export default router;
