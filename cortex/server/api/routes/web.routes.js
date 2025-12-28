import express from 'express';
import { webSurferService } from '../../services/webSurferService.js';

const router = express.Router();

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
