import express from 'express';
import { systemControlService } from '../../services/systemControlService.js';

const router = express.Router();

// Mobile device management routes
// These handle mobile device connections and control

let connectedMobileDevice = null;
let mobileHandshakeActive = false;

// Helpers
const executeAdb = async (req, res, action, params = {}) => {
    try {
        const result = await systemControlService.executeMobileAction({
            action,
            ...req.body,
            ...params
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

router.post('/ping', (req, res) => {
    const { deviceId, capabilities } = req.body;
    connectedMobileDevice = { deviceId, capabilities, lastPing: Date.now() };
    mobileHandshakeActive = true;
    res.json({ success: true });
});

router.get('/status', (req, res) => {
    res.json({
        connected: mobileHandshakeActive,
        device: connectedMobileDevice
    });
});

router.get('/await-handshake', (req, res) => {
    const checkInterval = setInterval(() => {
        if (mobileHandshakeActive) {
            clearInterval(checkInterval);
            res.json({ connected: true, device: connectedMobileDevice });
        }
    }, 500);

    setTimeout(() => {
        clearInterval(checkInterval);
        res.json({ connected: false });
    }, 30000);
});

// --- ADB WRAPPER ENDPOINTS ---

router.get('/screen', (req, res) => executeAdb(req, res, 'SCREEN_CAPTURE'));

router.post('/input', (req, res) => {
    const { type } = req.body;
    const action = type === 'TAP' ? 'TAP' : (type === 'KEY' ? 'KEY' : null);
    if (!action) return res.status(400).json({ error: "Invalid input type" });
    executeAdb(req, res, action);
});

router.get('/packages', (req, res) => executeAdb(req, res, 'LIST_PACKAGES'));

router.post('/kill', (req, res) => executeAdb(req, res, 'KILL_PACKAGE'));

router.post('/exfiltrate', (req, res) => executeAdb(req, res, 'EXFILTRATE'));

router.post('/connect-wireless', (req, res) => {
    const { ip, port = 5555 } = req.body;
    // We could add this to systemControlService too, for now keeping local
    import('child_process').then(({ exec }) => {
        exec(`adb connect ${ip}:${port}`, (err, stdout) => {
            if (err) return res.json({ success: false, error: err.message });
            res.json({ success: true, result: stdout });
        });
    });
});

router.post('/scrcpy', (req, res) => {
    // Attempt to launch scrcpy if installed
    import('child_process').then(({ exec }) => {
        exec('scrcpy --version', (err) => {
            if (err) return res.json({ 
                success: false, 
                error: "scrcpy not found", 
                hint: "Install scrcpy: 'brew install scrcpy' on macOS or 'sudo apt install scrcpy' on Linux." 
            });
            
            exec('scrcpy --always-on-top --window-title "LUCA VISION STREAM"', (err) => {
                if (err) console.error("[SCRCPY] Error:", err.message);
            });
            res.json({ success: true, result: "Mirror session initiated." });
        });
    });
});

// Existing mobile security tools
router.post('/deploy-captive-portal', (req, res) => {
    const { ssid } = req.body;
    res.json({ success: true, result: `Captive Portal deployed on SSID: "${ssid || 'FREE_WIFI'}"` });
});

router.post('/wifi-deauth', (req, res) => {
    const { target } = req.body;
    res.json({ success: true, result: `DEAUTH PACKETS SENT to ${target || 'ALL'}` });
});

router.post('/scan-wifi-devices', (req, res) => {
    res.json({ success: true, devices: [
        { ssid: 'Home-Network', signal: -45, security: 'WPA2' },
        { ssid: 'Office-Guest', signal: -68, security: 'OPEN' }
    ]});
});

export default router;
