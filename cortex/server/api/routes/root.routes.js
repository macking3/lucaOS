import express from 'express';

const router = express.Router();

// --- SYSTEM HEALTH (Boot Handshake) ---
router.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});

router.get('/status', (req, res) => {
    // Basic system status for frontend dashboard
    res.json({ 
        system: 'online', 
        modules: ['cortex', 'iot', 'admin', 'memory'],
        uptime: process.uptime() 
    });
});

import os from 'os';
router.get('/monitor', (req, res) => {
    res.json({
        cpu: os.loadavg()[0],
        memory: {
            total: os.totalmem(),
            free: os.freemem(),
            used: os.totalmem() - os.freemem()
        },
        uptime: os.uptime(),
        platform: os.platform()
    });
});

// --- VISION SUBSYSTEM (Mock/Proxy) ---
router.get('/vision/status', (req, res) => {
    // TODO: Wire up to actual Vision Service if it exists on backend
    // For now, return active to pass boot check
    res.json({ active: true, running: true, model: 'mediapipe', mode: 'passive' });
});

// --- GOALS/MEMORY (Live Strategy Store) ---
let securityGoals = [];

router.get('/goals/list', (req, res) => {
    res.json(securityGoals); 
});

router.post('/goals/add', (req, res) => {
    const { title, description, priority } = req.body;
    const newGoal = { id: Date.now().toString(), title, description, priority, status: 'PENDING' };
    securityGoals.push(newGoal);
    res.json(newGoal);
});

router.post('/goals/update', (req, res) => {
    const { id, status } = req.body;
    const goal = securityGoals.find(g => g.id === id);
    if (goal) {
        goal.status = status;
        res.json(goal);
    } else {
        res.status(404).json({ error: 'Goal not found' });
    }
});

router.delete('/goals/delete', (req, res) => {
    const { id } = req.body;
    securityGoals = securityGoals.filter(g => g.id !== id);
    res.json({ success: true });
});

export default router;
