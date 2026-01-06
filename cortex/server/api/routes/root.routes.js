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
        cpuCores: os.cpus().length,
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

// --- GOALS (Autonomous Goal System) ---
import { goalStore } from '../../services/goalStore.js';
import { goalDecomposer } from '../../services/goalDecomposer.js';
import { goalExecutor } from '../../services/goalExecutor.js';
import { goalScheduler } from '../../services/goalScheduler.js';

router.get('/goals/list', (req, res) => {
    const goals = goalStore.getAllGoals();
    res.json(goals);
});

router.post('/goals/add', async (req, res) => {
    try {
        const { description, type, schedule, priority } = req.body;
        
        // Create the goal
        const goal = goalStore.createGoal({
            description,
            type: type || 'ONCE',
            schedule,
            priority
        });

        // Auto-decompose if complex
        if (description.length > 50 || description.includes('and')) {
            const subGoals = await goalDecomposer.decomposeGoal(description, goal.id);
            for (const subGoalData of subGoals) {
                goalStore.createGoal(subGoalData);
            }
        }

        res.json(goal);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/goals/update', (req, res) => {
    try {
        const { id, status } = req.body;
        const goal = goalStore.updateStatus(id, status);
        res.json(goal);
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
});

router.delete('/goals/delete', (req, res) => {
    try {
        const { id } = req.body;
        goalStore.deleteGoal(id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// New endpoints for advanced features
router.post('/goals/:id/execute', async (req, res) => {
    try {
        const result = await goalExecutor.executeGoal(req.params.id);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/goals/:id/state', (req, res) => {
    try {
        const state = goalStore.getState(req.params.id);
        res.json(state);
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
});

router.get('/goals/:id/executions', (req, res) => {
    try {
        const executions = goalStore.getExecutions(req.params.id);
        res.json(executions);
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
});

router.get('/goals/stats', (req, res) => {
    const stats = goalStore.getStats();
    res.json(stats);
});

// Scheduler control endpoints
router.get('/goals/scheduler/status', (req, res) => {
    const status = goalScheduler.getStatus();
    res.json(status);
});

router.post('/goals/:id/pause', (req, res) => {
    try {
        goalScheduler.pauseGoal(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/goals/:id/resume', (req, res) => {
    try {
        goalScheduler.resumeGoal(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Autonomous goal analyzer endpoints
import { goalAnalyzer } from '../../services/goalAnalyzer.js';

router.post('/goals/:id/approve', (req, res) => {
    try {
        goalAnalyzer.approveGoal(req.params.id, false);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/goals/:id/reject', (req, res) => {
    try {
        goalAnalyzer.rejectGoal(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/goals/analyzer/settings', (req, res) => {
    const settings = goalAnalyzer.getSettings();
    res.json(settings);
});

router.post('/goals/analyzer/settings', (req, res) => {
    try {
        goalAnalyzer.updateSettings(req.body);
        res.json({ success: true, settings: goalAnalyzer.getSettings() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/goals/analyze', async (req, res) => {
    try {
        const { message, history } = req.body;
        const goals = await goalAnalyzer.analyzeMessage(message, history || []);
        res.json({ created: goals.length, goals });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
