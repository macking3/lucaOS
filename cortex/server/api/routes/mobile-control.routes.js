import express from 'express';
import { systemControlService } from '../../services/systemControlService.js';

const router = express.Router();

/**
 * MOBILE DEVICE CONTROL ENDPOINT (Android & iOS)
 * Refactored to use systemControlService for centralized cross-platform logic.
 * Supports Neural Link (preferred) and ADB/libimobiledevice (fallback).
 */
router.post('/control-mobile', async (req, res) => {
    try {
        const result = await systemControlService.executeMobileAction(req.body);
        res.json(result);
    } catch (error) {
        console.error('[MOBILE_CONTROL_ERROR]', error);
        res.status(500).json({ success: false, result: error.message });
    }
});

export default router;
