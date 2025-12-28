import express from 'express';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const router = express.Router();

router.post('/execute', (req, res) => {
    const { script, venv } = req.body;
    
    if (!script) {
        return res.status(400).json({ error: 'Script content required' });
    }

    // Pre-flight check: Ensure python3 exists
    exec('python3 --version', (checkErr) => {
        if (checkErr) {
            return res.status(503).json({ 
                error: "Python 3 is not installed or not in PATH.",
                fix: "Install Python 3 and ensure 'python3' command is available in your shell."
            });
        }

        const tempPath = path.join(os.tmpdir(), `luca_py_${Date.now()}.py`);
        fs.writeFileSync(tempPath, script);

        let command = `python3 "${tempPath}"`;
        if (venv) {
            const venvPath = path.resolve(process.cwd(), venv);
            const platform = os.platform();
            
            if (!fs.existsSync(venvPath)) {
                fs.unlinkSync(tempPath);
                return res.status(400).json({
                    error: `Virtual environment not found at: ${venv}`,
                    fix: `Create the venv: python3 -m venv ${venv}`
                });
            }

            if (platform === 'win32') {
                command = `"${path.join(venvPath, 'Scripts', 'python.exe')}" "${tempPath}"`;
            } else {
                command = `"${path.join(venvPath, 'bin', 'python')}" "${tempPath}"`;
            }
        }

        exec(command, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
            fs.unlinkSync(tempPath);
            if (err) {
                return res.json({ error: err.message, stderr, fix: "Check Python script syntax or dependencies." });
            }
            res.json({ result: stdout, stderr });
        });
    });
});

export default router;
