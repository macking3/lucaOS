import express from 'express';

const router = express.Router();

// Subsystem management routes
// (Variable 'subsystems' is defined below with spawn info)

import { spawn } from 'child_process';

let subsystems = {
    cortex: { status: 'stopped', port: 8000, pid: null },
    whatsapp: { status: 'stopped', pid: null },
    iot: { status: 'stopped', pid: null },
    // DYNAMIC REGISTRY
};

router.post('/start', (req, res) => {
    const { name, command, args } = req.body;
    
    // 1. Define Standard Commands if missing
    let cmd = command;
    let cmdArgs = args || [];
    
    if (!cmd) {
        if (name === 'redis') { cmd = 'redis-server'; }
        else if (name === 'python_server') { cmd = 'python3'; cmdArgs = ['-m', 'http.server', '8080']; }
        else {
            return res.status(400).json({ error: "No command provided for custom subsystem." });
        }
    }

    // 2. Spawn Process
    try {
        const subprocess = spawn(cmd, cmdArgs, {
            detached: true,
            stdio: 'ignore' 
        });
        
        subprocess.unref(); // Allow node to exit independently if needed

        subsystems[name] = { 
            status: 'running', 
            pid: subprocess.pid,
            command: cmd
        };

        console.log(`[SUBSYSTEM] Started ${name} (PID: ${subprocess.pid})`);
        res.json({ success: true, subsystem: name, status: 'running', pid: subprocess.pid });

    } catch (e) {
        console.error(`[SUBSYSTEM] Failed to start ${name}:`, e);
        res.status(500).json({ error: e.message });
    }
});

router.post('/stop', (req, res) => {
    const { name } = req.body;
    if (subsystems[name]) {
        subsystems[name].status = 'stopped';
        res.json({ success: true, subsystem: name, status: 'stopped' });
    } else {
        res.status(404).json({ error: `Subsystem "${name}" not found` });
    }
});

router.get('/list', (req, res) => {
    res.json({ subsystems });
});

export default router;
