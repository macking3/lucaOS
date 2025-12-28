import express from 'express';
import iotManager from '../../../../src/services/iot/IoTManager.js';
import { HomeAssistantProvider } from '../../../../src/services/iot/providers/HomeAssistantProvider.js';
import { relayService } from '../../../../src/services/relayService.js';

const router = express.Router();

// --- RELAY SERVICE ENDPOINTS ---
router.get('/relay/status', (req, res) => {
    res.json(relayService.getStatus());
});

router.post('/relay/start', async (req, res) => {
    try {
        const url = await relayService.start();
        res.json({ success: true, url });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/relay/stop', (req, res) => {
    relayService.stop();
    res.json({ success: true });
});

// --- IOT ENDPOINTS ---
router.get('/devices', (req, res) => {
    res.json(iotManager.getAllDevices());
});

router.post('/control', async (req, res) => {
    const { deviceId, action, params } = req.body;
    try {
        const success = await iotManager.controlDevice(deviceId, action, params);
        res.json({ success });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/config', async (req, res) => {
    const { provider, config } = req.body;
    console.log(`[IoT CONFIG] Received config for provider: ${provider}`, { url: config?.url, token: config?.token ? '***' : 'MISSING' });
    if (provider === 'home-assistant') {
        const ha = new HomeAssistantProvider(config.url, config.token);
        await iotManager.registerProvider(ha);
        res.json({ success: true });
    } else {
        res.status(400).json({ error: 'Unknown provider' });
    }
});

export default router;
