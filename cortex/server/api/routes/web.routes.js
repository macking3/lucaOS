import express from 'express';
import { webSurferService } from '../../services/webSurferService.js';
import { socketService } from '../../services/socketService.js';

const router = express.Router();

router.post('/launch', async (req, res) => {
    const { url } = req.body;
    try {
        if (!url) return res.status(400).json({ error: "URL required" });
        
        // Trigger Frontend Mode Switch via Socket
        // We broadcast to 'desktop' room or all clients
        const io = socketService.getIO();
        if (io) {
            io.emit('ui:mode', { mode: 'BROWSER', url });
            res.json({ success: true, message: `Launched ${url} in Ghost Browser` });
        } else {
            res.status(503).json({ error: "Socket service not available" });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/browse', async (req, res) => {
    const { url } = req.body;
    try {
        if (!url) return res.status(400).json({ error: "URL required" });
        const result = await webSurferService.browse(url);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/click', async (req, res) => {
    const { selector } = req.body;
    try {
        const result = await webSurferService.click(selector);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/type', async (req, res) => {
    const { selector, text } = req.body;
    try {
        const result = await webSurferService.type(selector, text);
        res.json(result);
    } catch (e) {
         res.status(500).json({ error: e.message });
    }
});

export default router;
