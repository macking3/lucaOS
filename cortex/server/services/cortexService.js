import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

class CortexService {
    constructor() {
        this.process = null;
        this.logs = [];
        this.status = 'STOPPED';
        this.pid = null;
    }

    start(useVenv = true) {
        if (this.process) {
            console.log('[CORTEX] Already running');
            return { status: 'ALREADY_RUNNING', pid: this.pid };
        }

        console.log('[CORTEX] Starting Python Core...');
        
        try {
            // Define paths relative to CWD (root)
            const CORTEX_PYTHON_PATH = path.join(process.cwd(), 'cortex/python/cortex.py');
            // Assuming venv structure. Adjust if platform specific changes needed.
            const VENV_PYTHON = path.join(process.cwd(), 'cortex/python/venv/bin/python'); 
            
            const pythonExec = useVenv && fs.existsSync(VENV_PYTHON) ? VENV_PYTHON : 'python3';

            if (!fs.existsSync(CORTEX_PYTHON_PATH)) {
                throw new Error(`Cortex entry point not found at: ${CORTEX_PYTHON_PATH}`);
            }

            this.process = spawn(pythonExec, [CORTEX_PYTHON_PATH], {
                cwd: path.dirname(CORTEX_PYTHON_PATH), // Run from inside cortex/python/
                env: { 
                    ...process.env, 
                    PYTHONUNBUFFERED: '1',
                    PYTHONPATH: path.dirname(CORTEX_PYTHON_PATH)
                }
            });

            this.pid = this.process.pid;
            this.status = 'RUNNING';

            this._setupListeners();

            console.log(`[CORTEX] Started with PID: ${this.pid}`);
            return { status: 'STARTED', pid: this.pid };

        } catch (e) {
            console.error('[CORTEX] Failed to start:', e);
            this.status = 'ERROR';
            return { 
                status: 'ERROR', 
                error: e.message,
                fix: "Ensure Python 3 is installed and 'cortex/python/cortex.py' exists. Re-run 'setup-deps.sh' to restore the environment."
            };
        }
    }

    stop() {
        if (this.process) {
            this.process.kill();
            this.process = null;
            this.pid = null;
            this.status = 'STOPPED';
            console.log('[CORTEX] Stopped');
        }
        return { status: 'STOPPED' };
    }

    getStatus() {
        return {
            status: this.status,
            pid: this.pid,
            logs: this.logs.slice(-50) // Return last 50 logs
        };
    }

    _setupListeners() {
        this.process.stdout.on('data', (data) => {
            const msg = data.toString().trim();
            if (msg) {
                console.log(`[CORTEX_PY] ${msg}`);
                this._addLog('stdout', msg);
            }
        });

        this.process.stderr.on('data', (data) => {
            const msg = data.toString().trim();
            if (msg) {
                console.error(`[CORTEX_PY_ERR] ${msg}`);
                this._addLog('stderr', msg);
            }
        });

        this.process.on('close', (code) => {
            console.log(`[CORTEX] Process exited with code ${code}`);
            this.status = 'STOPPED';
            this.process = null;
            this.pid = null;

            // SELF-HEALING WATCHDOG
            // If exit was not intentional (code != 0 usually, but even 0 if we expect daemon)
            // or if we simply want it always running:
            if (code !== 0 && code !== null) {
                console.warn('[CORTEX] CRASH DETECTED. Initiating Self-Healing Protocol in 3s...');
                this._addLog('system', 'Crash detected. Rebooting...');
                setTimeout(() => {
                    this.start();
                }, 3000);
            }
        });
    }

    _addLog(type, message) {
        this.logs.push({
            timestamp: Date.now(),
            type,
            message
        });
        if (this.logs.length > 1000) this.logs.shift();
    }
}

export const cortexService = new CortexService();
