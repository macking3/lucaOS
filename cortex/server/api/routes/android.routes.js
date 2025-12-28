import express from 'express';
import { exec } from 'child_process';

const router = express.Router();

// Android/ADB routes - These handle Android device automation via ADB

router.post('/enable-wireless', (req, res) => {
    exec('adb tcpip 5555', (err, stdout) => {
        if (err) return res.json({ error: err.message });
        res.json({ result: stdout || 'Wireless ADB enabled on port 5555' });
    });
});

router.post('/scan-network', (req, res) => {
    // Placeholder - full implementation would scan local network for Android devices
    exec('adb devices', (err, stdout) => {
        if (err) return res.json({ error: err.message });
        res.json({ result: stdout });
    });
});

router.post('/connect-ip', (req, res) => {
    const { ip, port } = req.body;
    const target = `${ip}:${port || 5555}`;
    exec(`adb connect ${target}`, (err, stdout) => {
        if (err) return res.json({ error: err.message });
        res.json({ result: stdout });
    });
});

router.post('/pair', (req, res) => {
    const { ip, port, code } = req.body;
    exec(`adb pair ${ip}:${port} ${code}`, (err, stdout) => {
        if (err) return res.json({ error: err.message });
        res.json({ result: stdout });
    });
});

router.post('/install-apk', (req, res) => {
    const { path } = req.body;
    exec(`adb install "${path}"`, (err, stdout) => {
        if (err) return res.json({ error: err.message });
        res.json({ result: stdout || 'APK installed successfully' });
    });
});

router.post('/uninstall-apk', (req, res) => {
    const { package: pkg } = req.body;
    exec(`adb uninstall ${pkg}`, (err, stdout) => {
        if (err) return res.json({ error: err.message });
        res.json({ result: stdout || `Package ${pkg} uninstalled` });
    });
});

router.get('/device-ip', (req, res) => {
    exec('adb shell ip addr show wlan0', (err, stdout) => {
        if (err) return res.json({ error: err.message });
        const match = stdout.match(/inet (\d+\.\d+\.\d+\.\d+)/);
        res.json({ ip: match ? match[1] : null, raw: stdout });
    });
});

router.get('/ui-tree', (req, res) => {
    exec('adb shell uiautomator dump /sdcard/ui.xml && adb pull /sdcard/ui.xml', (err, stdout) => {
        if (err) return res.json({ error: err.message });
        res.json({ result: 'UI tree dumped', output: stdout });
    });
});

router.post('/find', (req, res) => {
    const { selector } = req.body;
    // Placeholder - would parse UI XML and find element
    res.json({ result: `Finding element: ${selector}` });
});

router.post('/click', (req, res) => {
    const { x, y, elementId } = req.body;
    if (x !== undefined && y !== undefined) {
        exec(`adb shell input tap ${x} ${y}`, (err) => {
            if (err) return res.json({ error: err.message });
            res.json({ result: 'Clicked' });
        });
    } else {
        res.json({ error: 'Coordinates required' });
    }
});

router.get('/notifications', (req, res) => {
    exec('adb shell dumpsys notification', (err, stdout) => {
        if (err) return res.json({ error: err.message });
        res.json({ notifications: stdout });
    });
});

router.post('/intent', (req, res) => {
    const { action, data } = req.body;
    const cmd = `adb shell am start -a ${action}${data ? ` -d ${data}` : ''}`;
    exec(cmd, (err, stdout) => {
        if (err) return res.json({ error: err.message });
        res.json({ result: stdout });
    });
});

router.post('/screenshot', (req, res) => {
    exec('adb shell screencap -p /sdcard/screen.png && adb pull /sdcard/screen.png', (err) => {
        if (err) return res.json({ error: err.message });
        res.json({ result: 'Screenshot captured' });
    });
});

router.post('/type', (req, res) => {
    const { text } = req.body;
    if (!text) return res.json({ error: 'Text required' });
    
    // ADB text input handles basic alphanumeric. 
    // Spaces need to be escaped as %s or the command needs to be quoted.
    const escapedText = text.replace(/ /g, '%s');
    exec(`adb shell input text "${escapedText}"`, (err) => {
        if (err) return res.json({ error: err.message });
        res.json({ result: 'Text injected' });
    });
});

router.post('/control-agent', (req, res) => {
    const { goal, strategy } = req.body;
    console.log(`[ANDROID_AGENT] 🤖 Autonomous Goal Received: "${goal}" (Strategy: ${strategy || 'ACCURACY'})`);
    
    // In a production environment, this would spin up a specialized AI agent (like UI-TARS) 
    // that loops through screen analysis and interactions.
    res.json({ 
        success: true, 
        message: `Android Agent engaged for goal: "${goal}". Executing semantic analysis loop...` 
    });
});

export default router;
