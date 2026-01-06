import express from 'express';
import { mcpClientManager } from '../../services/mcpClientManager.js';

const router = express.Router();

// In-memory settings proxy (will be replaced by actual API to frontend settings)
// For now, we use a simple file-based approach
import fs from 'fs';
import path from 'path';
import os from 'os';

const SETTINGS_FILE = path.join(os.homedir(), '.luca', 'mcp-settings.json');

// Ensure directory exists
const settingsDir = path.dirname(SETTINGS_FILE);
if (!fs.existsSync(settingsDir)) {
    fs.mkdirSync(settingsDir, { recursive: true });
}

// Helper to load/save settings
const loadSettings = () => {
    try {
        if (fs.existsSync(SETTINGS_FILE)) {
            return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
        }
    } catch (e) {
        console.warn('[MCP Routes] Failed to load settings:', e.message);
    }
    return { mcp: { servers: [] } };
};

const saveSettings = async (update) => {
    const current = loadSettings();
    const merged = { ...current, ...update };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(merged, null, 2));
    return merged;
};

// Auto-initialize MCP servers on module load
(async () => {
    try {
        console.log('[MCP Routes] Auto-initializing MCP servers...');
        const settings = loadSettings();
        await mcpClientManager.loadFromSettings(settings);
        const status = mcpClientManager.getConnectionStatus();
        console.log(`[MCP Routes] Initialized ${status.length} MCP connections`);
    } catch (e) {
        console.error('[MCP Routes] Failed to auto-initialize:', e.message);
    }
})();

/**
 * GET /api/mcp/list
 * Returns all configured servers and their connection status
 */
router.get('/list', (req, res) => {
    try {
        const settings = loadSettings();
        const status = mcpClientManager.getConnectionStatus();
        
        // Get built-in servers
        const builtInServers = mcpClientManager.getBuiltInServers ? 
            mcpClientManager.getBuiltInServers() : [];
        
        // Merge user servers with built-in
        const userServers = settings.mcp?.servers || [];
        const allServers = [...builtInServers, ...userServers];
        
        // Merge saved config with live status
        const servers = allServers.map(server => {
            const live = status.find(s => s.url === server.id || s.url === server.command);
            return {
                ...server,
                status: live ? 'connected' : 'disconnected',
                toolCount: live?.toolCount || 0
            };
        });
        
        res.json({ servers });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * GET /api/mcp/tools
 * Returns all tools from all connected MCP servers
 */
router.get('/tools', (req, res) => {
    try {
        const tools = mcpClientManager.getAllTools();
        res.json({ tools, count: tools.length });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * POST /api/mcp/connect
 * Add and connect to a new MCP server
 * Body: { name, type: 'stdio'|'sse', command?, args?, url?, env?, autoConnect? }
 */
router.post('/connect', async (req, res) => {
    const { name, type, command, args, url, env, autoConnect } = req.body;
    
    if (!name) {
        return res.status(400).json({ error: 'Server name is required' });
    }
    
    if (type === 'stdio' && !command) {
        return res.status(400).json({ error: 'STDIO transport requires a command' });
    }
    
    if (type === 'sse' && !url) {
        return res.status(400).json({ error: 'SSE transport requires a URL' });
    }
    
    try {
        const settings = loadSettings();
        const result = await mcpClientManager.addServer({
            name,
            type: type || 'stdio',
            command,
            args: args || [],
            url,
            env: env || {},
            autoConnect: autoConnect !== false
        }, settings, saveSettings);
        
        res.json({ 
            success: true, 
            ...result 
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * POST /api/mcp/disconnect
 * Disconnect from a server (keeps config)
 * Body: { id }
 */
router.post('/disconnect', async (req, res) => {
    const { id } = req.body;
    
    if (!id) {
        return res.status(400).json({ error: 'Server ID is required' });
    }
    
    try {
        await mcpClientManager.disconnect(id);
        res.json({ success: true, disconnected: id });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * POST /api/mcp/remove
 * Remove a server completely (disconnect and delete config)
 * Body: { id }
 */
router.post('/remove', async (req, res) => {
    const { id } = req.body;
    
    if (!id) {
        return res.status(400).json({ error: 'Server ID is required' });
    }
    
    try {
        const settings = loadSettings();
        const result = await mcpClientManager.removeServer(id, settings, saveSettings);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * POST /api/mcp/sync
 * Reconnect all auto-connect servers
 */
router.post('/sync', async (req, res) => {
    try {
        const settings = loadSettings();
        await mcpClientManager.loadFromSettings(settings);
        const status = mcpClientManager.getConnectionStatus();
        res.json({ success: true, connections: status.length });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * POST /api/mcp/execute
 * Execute a tool from a connected MCP server
 * Body: { server?, tool, args }
 * If server is provided, will only look for the tool on that specific server
 */
router.post('/execute', async (req, res) => {
    const { server, tool, args } = req.body;
    
    if (!tool) {
        return res.status(400).json({ error: 'Tool name is required' });
    }
    
    try {
        // If server is specified, execute on that specific server
        // Otherwise, search all servers for the tool
        const result = await mcpClientManager.executeTool(tool, args || {}, null, server);
        res.json({ success: true, result });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
