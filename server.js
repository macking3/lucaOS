// Load environment variables from .env file (Node.js only)
import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import http from 'http';
import fs from 'fs';
import path from 'path';
// Use explicit path or ensure this file exists. 
// If constants.js relies on process.cwd(), it should be fine.
import { SERVER_PORT, MANIFEST_FILE } from './cortex/server/config/constants.js';

// Services
import { socketService } from './cortex/server/services/socketService.js';
import './cortex/server/services/whatsappService.js';
// import { fileWatcher } from './src/services/fileWatcherService.js'; // DISABLED: causes EMFILE error
import { memoryStore } from './src/services/memoryStore.js';
import './src/services/relayService.js';
import iotManager from './src/services/iot/IoTManager.js';
import { DlnaProvider } from './src/services/iot/providers/DlnaProvider.js';
import { mcpClientManager } from './src/services/mcpClientManager.js';

// Admin Imports (Database initialization side-effect)
import './src/services/db.js';

// Initialize Native Discovery
const dlna = new DlnaProvider();
iotManager.registerProvider(dlna).catch(err => console.error("Failed to register DLNA:", err));

// Admin Imports (Partial extraction, db still centralized)


// Routes
import rootRoutes from './cortex/server/api/routes/root.routes.js';
import adminRoutes from './cortex/server/api/routes/admin.routes.js';
import systemRoutes from './cortex/server/api/routes/system.routes.js';
import iotRoutes from './cortex/server/api/routes/iot.routes.js';
import memoryRoutes from './cortex/server/api/routes/memory.routes.js';
import filesRoutes from './cortex/server/api/routes/files.routes.js';
import automationRoutes from './cortex/server/api/routes/automation.routes.js';
import whatsappRoutes from './cortex/server/api/routes/whatsapp.routes.js';
import androidRoutes from './cortex/server/api/routes/android.routes.js';
import mobileRoutes from './cortex/server/api/routes/mobile.routes.js';
import knowledgeRoutes from './cortex/server/api/routes/knowledge.routes.js';
import skillsRoutes from './cortex/server/api/routes/skills.routes.js';
import networkRoutes from './cortex/server/api/routes/network.routes.js';
import pythonRoutes from './cortex/server/api/routes/python.routes.js';
import rpcRoutes from './cortex/server/api/routes/rpc.routes.js';
import uiRoutes from './cortex/server/api/routes/ui.routes.js';
import osintRoutes from './cortex/server/api/routes/osint.routes.js';
import officeRoutes from './cortex/server/api/routes/office.routes.js';
import subsystemsRoutes from './cortex/server/api/routes/subsystems.routes.js';
import cryptoRoutes from './cortex/server/api/routes/crypto.routes.js';
import forexRoutes from './cortex/server/api/routes/forex.routes.js';
import financeRoutes from './cortex/server/api/routes/finance.routes.js';
import buildRoutes from './cortex/server/api/routes/build.routes.js';
import hackingRoutes from './cortex/server/api/routes/hacking.routes.js';
import c2Routes from './cortex/server/api/routes/c2.routes.js';
import forgeRoutes from './cortex/server/api/routes/forge.routes.js';
import audioRoutes from './cortex/server/api/routes/audio.routes.js';
import webRoutes from './cortex/server/api/routes/web.routes.js';
import tradingRoutes from './cortex/server/api/routes/trading.routes.js';
import debateRoutes from './cortex/server/api/routes/debate.routes.js';
import backtestRoutes from './cortex/server/api/routes/backtest.routes.js';
import evolutionRoutes from './cortex/server/api/routes/evolution.routes.js';
import telegramRoutes from './cortex/server/api/routes/telegram.routes.js';
import googleRoutes from './cortex/server/api/routes/google.routes.js';
import securityRoutes from './cortex/server/api/routes/security.routes.js';
import neuralLinkRoutes from './cortex/server/api/routes/neuralLink.routes.js';
import routerRoutes from './cortex/server/api/routes/router.routes.js';
import macosControlRoutes from './cortex/server/api/routes/macos-control.routes.js';
import windowsControlRoutes from './cortex/server/api/routes/windows-control.routes.js';
import mobileControlRoutes from './cortex/server/api/routes/mobile-control.routes.js';
import unifiedControlRoutes from './cortex/server/api/routes/unified-control.routes.js';
import visionRoutes from './cortex/server/api/routes/vision.routes.js';
import systemStatusRoutes from './cortex/server/api/routes/system-status.routes.js';
import mcpRoutes from './cortex/server/api/routes/mcp.routes.js';
import chromeProfileRoutes from './cortex/server/api/routes/chromeProfile.routes.js';

const app = express();
const server = http.createServer(app);

// --- INITIALIZATION ---
console.log('[SERVER] Initializing Services...');

try {
    memoryStore.migrateFromJson();
} catch (e) {
    console.warn('[MEMORY] Migration warning:', e.message);
}

// DISABLED: File watcher causes EMFILE error on large projects
// try {
//     fileWatcher.start(process.cwd());
// } catch (e) {
//     console.warn('[WATCHER] Start warning:', e.message);
// }

// MCP Auto-Connect (reads from ~/.luca/mcp-settings.json)
import os from 'os';
const mcpSettingsFile = path.join(os.homedir(), '.luca', 'mcp-settings.json');
try {
    if (fs.existsSync(mcpSettingsFile)) {
        const mcpSettings = JSON.parse(fs.readFileSync(mcpSettingsFile, 'utf8'));
        mcpClientManager.loadFromSettings(mcpSettings);
    }
} catch (e) {
    console.warn('[MCP] Auto-connect warning:', e.message);
}

// Goal Scheduler Auto-Start
import { goalScheduler } from './cortex/server/services/goalScheduler.js';
try {
    console.log('[GOAL_SCHEDULER] Initializing recurring goals...');
    goalScheduler.initialize();
} catch (e) {
    console.warn('[GOAL_SCHEDULER] Initialization warning:', e.message);
}

// Socket service is now ON-DEMAND. Do NOT auto-initialize.
// It will be started when user clicks "Link Device" via /api/neural-link/start
app.set('socketService', socketService);

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/mobile', express.static(path.join(process.cwd(), 'public/mobile')));

// --- TOOLS LOADER (Dynamic) ---
let lucaToolsManifest = { tools: [] };
if (fs.existsSync(MANIFEST_FILE)) {
    try {
        const content = fs.readFileSync(MANIFEST_FILE, 'utf8');
        lucaToolsManifest = JSON.parse(content);
        console.log(`[LUCA_TOOLS] Loaded ${lucaToolsManifest.tools.length} tools from manifest.`);
    } catch (e) {
        console.error('[LUCA_TOOLS] Failed to load manifest:', e);
    }
}

// --- MOUNT ROUTES ---
app.use('/api', rootRoutes); // Mounts /api/health, /api/status, etc.
app.use('/api/admin', adminRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/iot', iotRoutes);
app.use('/api/relay', iotRoutes); // Reusing IoT router as it contains relay logic for now
app.use('/api/memory', memoryRoutes);
app.use('/api/fs', filesRoutes);
app.use('/api', automationRoutes); // Mount input & command at root /api level
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/android', androidRoutes);
app.use('/api/mobile', mobileRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/skills', skillsRoutes);
app.use('/api/network', networkRoutes);
app.use('/api/python', pythonRoutes);
app.use('/api/rpc', rpcRoutes);
app.use('/api/ui', uiRoutes);
app.use('/api/osint', osintRoutes);
app.use('/api/office', officeRoutes);
app.use('/api/subsystems', subsystemsRoutes);
app.use('/api/crypto', cryptoRoutes);
app.use('/api/forex', forexRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/web', webRoutes);
app.use('/api/build', buildRoutes);
app.use('/api/hacking', hackingRoutes);
app.use('/api/c2', c2Routes);
app.use('/api/forge', forgeRoutes);
app.use('/api/audio', audioRoutes); // Retaining audio routes as it was not explicitly removed
// Trading & Debate Routes
app.use('/api/trading', tradingRoutes);
app.use('/api/debate', debateRoutes);
app.use('/api/backtest', backtestRoutes);
app.use('/api/evolution', evolutionRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api/google', googleRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/neural-link', neuralLinkRoutes);
app.use('/api/router', routerRoutes);
app.use('/api/macos-control', macosControlRoutes);
app.use('/api/windows-control', windowsControlRoutes);
app.use('/api/mobile-control', mobileControlRoutes);
app.use('/api/control', unifiedControlRoutes);
app.use('/api/vision', visionRoutes);
app.use('/api/system-status', systemStatusRoutes);
app.use('/api/mcp', mcpRoutes);
app.use('/api/chrome-profile', chromeProfileRoutes);

// --- ROOT ---
app.get('/', (req, res) => {
    res.send(`
        <html>
            <body style="background: #000; color: #3b82f6; font-family: monospace; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh;">
                <h1>LUCA LOCAL CORE :: ONLINE</h1>
                <p>Status: ACTIVE (Refactored)</p>
                <p>Platform: ${process.platform}</p>
                <p>Port: ${SERVER_PORT || 3000}</p>
                <p>Gateway: Modular</p>
            </body>
        </html>
    `);
});

// START SERVER
const PORT = SERVER_PORT || 3000;
server.listen(PORT, () => {
    console.log(`\n[LUCA CORE] Server running on port ${PORT}`);
    console.log(`[LUCA CORE] Neural Link Socket: ON-DEMAND (Port 3003 when enabled)`);
});

// EXPORT FOR TESTING
export { app, server };
