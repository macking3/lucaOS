import express from 'express';
import { telegramService } from '../../services/telegramService.js';

const router = express.Router();

router.get('/status', async (req, res) => {
    try {
        const status = telegramService.getStatus();
        const me = await telegramService.getMe();
        res.json({ status, me });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/auth/request', async (req, res) => {
    const { phoneNumber, apiId, apiHash } = req.body;
    if (!phoneNumber || !apiId || !apiHash) {
        return res.status(400).json({ error: "Missing required fields: phoneNumber, apiId, apiHash" });
    }
    try {
        const result = await telegramService.requestAuth(phoneNumber, apiId, apiHash);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/auth/verify', async (req, res) => {
    const { phoneNumber, code, password, apiId, apiHash } = req.body;
    try {
        const result = await telegramService.verifyAuth(phoneNumber, code, password, apiId, apiHash);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/message', async (req, res) => {
    const { target, message, apiId, apiHash } = req.body;
    if (!target || !message) {
        return res.status(400).json({ error: "Target and message required" });
    }
    try {
        const result = await telegramService.sendMessage(target, message, apiId, apiHash);
        res.json(result);
    } catch (e) {
        res.status(503).json({ error: e.message });
    }
});

router.post('/history', async (req, res) => {
    const { target, limit, apiId, apiHash } = req.body;
    if (!target) {
        return res.status(400).json({ error: "Target required" });
    }
    try {
        const history = await telegramService.getHistory(target, limit, apiId, apiHash);
        res.json({ success: true, history });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/chats', async (req, res) => {
    const { limit, apiId, apiHash } = req.body;
    try {
        const chats = await telegramService.getChats(limit, apiId, apiHash);
        res.json({ success: true, chats });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/contacts', async (req, res) => {
    const { apiId, apiHash } = req.body;
    try {
        const contacts = await telegramService.getContacts(apiId, apiHash);
        res.json({ success: true, contacts });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
