import express from 'express';
import { securityTools } from '../../services/securityTools.js';

const router = express.Router();

// A1: Proxy Resolution
router.post('/source', async (req, res) => {
    const { address, chain } = req.body;
    const result = await securityTools.fetchSource(address, chain);
    res.json(result);
});

// A1: Constructor Resolution
router.post('/constructor', async (req, res) => {
    const { address, chain } = req.body;
    const result = await securityTools.resolveConstructor(address, chain);
    res.json(result);
});

// A1: Code Sanitization
router.post('/sanitize', async (req, res) => {
    const { code } = req.body;
    const result = await securityTools.sanitizeCode(code);
    res.json({ sanitizedCode: result });
});

// Quimera: Storage Reading
router.post('/storage', async (req, res) => {
    const { address, options, chain } = req.body;
    const result = await securityTools.readStorage(address, options, chain);
    res.json(result);
});

// Anthropic: Swap Routing
router.post('/swap-route', async (req, res) => {
    const { tokenIn, tokenOut, amount } = req.body;
    const result = await securityTools.findSwapRoute(tokenIn, tokenOut, amount);
    res.json(result);
});

// God Loop: Exploit Validation (Forge)
router.post('/validate', async (req, res) => {
    const { pocCode, chain } = req.body;
    const result = await securityTools.validateExploit(pocCode, chain);
    res.json(result);
});

// God Loop: Exploit Ingestion (Security Dojo)
router.post('/ingest-library', async (req, res) => {
    const { repoUrl } = req.body;
    const io = req.app.get('socketService')?.getIO();
    const result = await securityTools.ingestExploitLibrary(io, repoUrl);
    res.json(result);
});

// God Loop: Simulation Demo
router.post('/simulate', async (req, res) => {
    const { target } = req.body;
    const io = req.app.get('socketService')?.getIO();
    const result = await securityTools.simulateSecurityAudit(io, target);
    res.json(result);
});

// God Loop: Mempool Monitoring Simulation
router.post('/mempool', async (req, res) => {
    const { target } = req.body;
    const io = req.app.get('socketService')?.getIO();
    const result = await securityTools.monitorMempool(io, target);
    res.json(result);
});

// God Loop: Broad L1 Atomic Discovery
router.post('/scan-arbs', async (req, res) => {
    const io = req.app.get('socketService')?.getIO();
    const result = await securityTools.scanForAtomicArbs(io);
    res.json(result);
});

// God Loop: Targeted Extraction Strategy
router.post('/extract', async (req, res) => {
    const { lead } = req.body;
    const io = req.app.get('socketService')?.getIO();
    const result = await securityTools.executeExtraction(io, lead);
    res.json(result);
});

// God Loop: Global EVM Sovereignty Sweep
router.post('/scan-global', async (req, res) => {
    const io = req.app.get('socketService')?.getIO();
    const result = await securityTools.scanGlobalMempools(io);
    res.json(result);
});

// God Loop: Global Sovereignty Dashboard
router.post('/dashboard', async (req, res) => {
    const io = req.app.get('socketService')?.getIO();
    const result = await securityTools.getGlobalSovereigntyStats(io);
    res.json(result);
});

export default router;
