import express from 'express';
import { alwaysOnAudioService } from '../../../../src/services/alwaysOnAudioService.js';

const router = express.Router();

// Real Audio Status
router.get('/status', (req, res) => {
    res.json(alwaysOnAudioService.getStatus());
});

// Start Monitoring
router.post('/start', (req, res) => {
    alwaysOnAudioService.start();
    res.json(alwaysOnAudioService.getStatus());
});

// Stop Monitoring
router.post('/stop', (req, res) => {
    alwaysOnAudioService.stop();
    res.json(alwaysOnAudioService.getStatus());
});

// Toggle (Optional helper)
router.post('/toggle', (req, res) => {
    if (alwaysOnAudioService.isRunning) {
        alwaysOnAudioService.stop();
    } else {
        alwaysOnAudioService.start();
    }
    res.json(alwaysOnAudioService.getStatus());
});

export default router;
