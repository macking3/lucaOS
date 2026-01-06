/**
 * Chrome Profile API Routes
 * Endpoints for importing Chrome profile to Ghost Browser
 */

import express from 'express';
import chromeProfileService from '../../../server/services/chromeProfileService.js';

const router = express.Router();

/**
 * GET /api/chrome-profile/status
 * Get import status and available profiles
 */
router.get('/status', async (req, res) => {
    try {
        const status = chromeProfileService.getImportStatus();
        const profiles = chromeProfileService.listChromeProfiles();
        const chromeRunning = await chromeProfileService.isChromeRunning();
        
        res.json({
            ...status,
            availableProfiles: profiles,
            chromeRunning
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * POST /api/chrome-profile/import
 * Import Chrome profile data
 * Body: { profileName?: string }
 */
router.post('/import', async (req, res) => {
    const { profileName } = req.body;
    
    try {
        const result = await chromeProfileService.importChromeProfile(profileName || 'Default');
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * POST /api/chrome-profile/clear
 * Clear imported profile data
 */
router.post('/clear', async (req, res) => {
    try {
        const result = await chromeProfileService.clearImportedProfile();
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * GET /api/chrome-profile/profiles
 * List available Chrome profiles
 */
router.get('/profiles', (req, res) => {
    try {
        const profiles = chromeProfileService.listChromeProfiles();
        res.json({ profiles });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
