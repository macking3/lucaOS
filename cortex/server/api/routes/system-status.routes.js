import express from 'express';
import { systemControlService } from '../../services/systemControlService.js';

const router = express.Router();

/**
 * SYSTEM STATUS & READINESS ENDPOINT
 * Returns the status of physical control subsystems (MacOS, Windows, ADB, etc.)
 * Used by the frontend to show diagnostic health and fix instructions.
 */
router.get('/status', (req, res) => {
    try {
        const status = systemControlService.getStatus();
        res.json({ success: true, ...status });
    } catch (error) {
        res.status(500).json({ success: false, result: error.message });
    }
});

/**
 * TRIGGER DEPENDENCY RE-CHECK
 */
router.post('/check-dependencies', async (req, res) => {
    try {
        const readiness = await systemControlService.verifySystemReadiness();
        res.json({ success: true, ...readiness });
    } catch (error) {
        res.status(500).json({ success: false, result: error.message });
    }
});

export default router;
