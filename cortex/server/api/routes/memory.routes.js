import express from 'express';
import { memoryStore } from '../../../../src/services/memoryStore.js';

const router = express.Router();

// --- MEMORY SYNC ---
router.get('/load', (req, res) => {
    try {
        const memories = memoryStore.getAll();
        res.json(memories);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/save', (req, res) => {
    try {
        const memories = req.body;
        if (!Array.isArray(memories)) {
            return res.status(400).json({ error: "Expected array of memories" });
        }
        memoryStore.sync(memories);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Wipe all memories (Factory Reset)
router.post('/wipe', (req, res) => {
    try {
        memoryStore.wipe();
        res.json({ success: true, message: "All memories wiped" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- VECTOR OPERATIONS ---
router.post('/vector-search', (req, res) => {
    try {
        const { embedding, limit } = req.body;
        if (!embedding || !Array.isArray(embedding)) {
            return res.status(400).json({ error: "Invalid embedding" });
        }
        const results = memoryStore.searchByVector(embedding, limit);
        res.json(results);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/vector-save', (req, res) => {
    try {
        memoryStore.addVector(req.body);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- GRAPH VISUALIZATION ---
router.get('/graph/visualize', (req, res) => {
    try {
        const graph = memoryStore.getGraph();
        res.json(graph);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- LANGGRAPH EVENT LOGGING ---
router.post('/log-event', (req, res) => {
    try {
        const { toolName, args, result, sessionId, previousEventId } = req.body;
        const eventId = memoryStore.logExecutionEvent(toolName, args, result, sessionId, previousEventId);
        res.json({ success: true, eventId });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
