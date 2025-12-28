import express from 'express';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import os from 'os';

const router = express.Router();

const MACROS_DIR = path.join(process.cwd(), 'storage/macros');
if (!fs.existsSync(MACROS_DIR)) {
    fs.mkdirSync(MACROS_DIR, { recursive: true });
}

router.post('/execute', async (req, res) => {
    const { script } = req.body;
    
    if (!script || !Array.isArray(script)) {
        return res.status(400).json({ error: 'Script must be an array of RPC commands' });
    }

    const results = [];
    
    for (const step of script) {
        const { method, params } = step;
        
        try {
            if (method === 'shell.run') {
                const { message, path: workPath, venv } = params;
                const cwd = workPath ? path.resolve(process.cwd(), workPath) : process.cwd();
                
                const result = await new Promise((resolve, reject) => {
                    let command = message;
                    if (venv) {
                        const venvPath = path.resolve(process.cwd(), venv);
                        const platform = os.platform();
                        if (platform === 'win32') {
                            command = `"${path.join(venvPath, 'Scripts', 'activate.bat')}" && ${message}`;
                        } else {
                            command = `source "${path.join(venvPath, 'bin', 'activate')}" && ${message}`;
                        }
                    }
                    
                    exec(command, { cwd, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
                        if (err) {
                            reject({ error: err.message, stderr });
                        } else {
                            resolve({ stdout, stderr: stderr || '' });
                        }
                    });
                });
                
                results.push({ method, success: true, ...result });
            } else if (method === 'fs.write') {
                const { path: filePath, content } = params;
                const fullPath = path.resolve(process.cwd(), filePath);
                const dir = path.dirname(fullPath);
                
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                
                fs.writeFileSync(fullPath, content, 'utf8');
                results.push({ method, success: true, path: fullPath });
            } else {
                results.push({ method, success: false, error: 'Unknown RPC method' });
            }
        } catch (e) {
            results.push({ method, success: false, error: e.message });
        }
    }
    
    res.json({ results });
});

router.post('/macro/save', (req, res) => {
    const { name, script } = req.body;
    try {
        const macroPath = path.join(MACROS_DIR, `${name}.json`);
        fs.writeFileSync(macroPath, JSON.stringify({ name, script }, null, 2));
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/macro/list', (req, res) => {
    try {
        const files = fs.readdirSync(MACROS_DIR);
        const macros = files.filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
        res.json({ macros });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/macro/:name', (req, res) => {
    try {
        const macroPath = path.join(MACROS_DIR, `${req.params.name}.json`);
        if (!fs.existsSync(macroPath)) {
            return res.status(404).json({ error: 'Macro not found' });
        }
        const macro = JSON.parse(fs.readFileSync(macroPath, 'utf8'));
        res.json(macro);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
