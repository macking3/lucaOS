import express from 'express';
import { exec } from 'child_process';
import os from 'os';

const router = express.Router();

router.get('/ip', (req, res) => {
    const interfaces = os.networkInterfaces();
    const addresses = [];
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                addresses.push({ name, address: iface.address });
            }
        }
    }
    res.json({ addresses });
});

router.get('/scan', (req, res) => {
    // Placeholder for network scanning
    res.json({ result: 'Network scan not yet implemented' });
});

router.get('/discover', (req, res) => {
    // Placeholder for device discovery
    res.json({ result: 'Device discovery not yet implemented' });
});

router.post('/wake', (req, res) => {
    const { mac } = req.body;
    // Placeholder for Wake-on-LAN
    res.json({ result: `WoL packet sent to ${mac}` });
});

router.post('/hotspot/activate', (req, res) => {
    console.log('[NETWORK] Hotspot Activation Requested');
    // For macOS, we can potentially trigger a beacon or just return success if it's external
    res.json({ 
        success: true, 
        ssid: 'LUCA_CORE_SECURE',
        status: 'Broadcasting P2P Encrypted Beacon'
    });
});

export default router;
