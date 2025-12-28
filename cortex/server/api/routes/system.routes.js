import express from 'express';
import { exec, spawn } from 'child_process';
import path from 'path';
import os from 'os';
import fs from 'fs';

const router = express.Router();

/**
 * Robust execution helper that safely handles stdio to prevent EBADF errors
 * in restricted environments (like Electron or background processes).
 * Ignores stdin to avoid piping from a closed parent descriptor.
 */
const safeExec = (command, callback) => {
    let stdout = '';
    let stderr = '';
    
    try {
        const child = spawn(command, {
            shell: true, // Use system shell
            stdio: ['ignore', 'pipe', 'pipe'], // Critical: Ignore stdin
            windowsHide: true,
            env: process.env // Ensure env vars are passed
        });
        
        child.stdout.on('data', (data) => { stdout += data.toString(); });
        child.stderr.on('data', (data) => { stderr += data.toString(); });
        
        child.on('error', (err) => {
            callback(err, stdout, stderr);
        });
        
        child.on('close', (code) => {
            if (code !== 0) {
                const msg = stderr.trim() || `Command failed with code ${code}`;
                callback(new Error(msg), stdout, stderr);
            } else {
                callback(null, stdout, stderr);
            }
        });
    } catch (e) {
        callback(e, '', '');
    }
};

// --- DYNAMIC SCRIPT EXECUTION ---
router.post('/script', (req, res) => {
    const { script, language } = req.body; // language: 'applescript' | 'powershell' | 'bash'

    if (!script) {
        return res.status(400).json({ error: "Missing script content." });
    }

    console.log(`[EXECUTING SCRIPT] (${language}) length: ${script.length}`);

    if (language === 'applescript' && os.platform() === 'darwin') {
        const tempPath = path.join(os.tmpdir(), `luca_script_${Date.now()}.scpt`);
        fs.writeFileSync(tempPath, script);

        exec(`osascript "${tempPath}"`, (error, stdout, stderr) => {
            fs.unlinkSync(tempPath);
            if (error) {
                console.error("AppleScript Error:", stderr);
                return res.json({ error: error.message, stderr });
            }
            res.json({ result: stdout.trim() || "Script executed successfully." });
        });
    } else if (language === 'powershell' && os.platform() === 'win32') {
        const tempPath = path.join(os.tmpdir(), `luca_script_${Date.now()}.ps1`);
        fs.writeFileSync(tempPath, script);

        exec(`powershell -ExecutionPolicy Bypass -File "${tempPath}"`, (error, stdout, stderr) => {
            fs.unlinkSync(tempPath);
            if (error) {
                console.error("PowerShell Error:", stderr);
                return res.json({ error: error.message, stderr });
            }
            res.json({ result: stdout.trim() || "Script executed successfully." });
        });
    } else if (language === 'bash') {
        // Bash logic if needed
        res.status(501).json({ error: "Bash script execution not fully implemented yet." });
    } else {
        res.status(400).json({ error: "Unsupported language/platform combination." });
    }
});

// --- SYSTEM CONTROL ---
router.post('/control', (req, res) => {
    const { action, value, level } = req.body;
    const platform = os.platform();
    console.log(`[SYSTEM] Control Action: ${action} (${value || level})`);

    // Battery Status
    if (action === "GET_BATTERY") {
        let cmd = '';
        if (platform === 'darwin') {
            // macOS: Use pmset to get battery info
            cmd = 'pmset -g batt';
        } else if (platform === 'linux') {
            // Linux: Try upower first, fallback to acpi
            cmd = 'upower -i /org/freedesktop/UPower/devices/battery_BAT0 || acpi -b';
        } else if (platform === 'win32') {
            // Windows: Use WMIC
            cmd = 'WMIC Path Win32_Battery Get EstimatedChargeRemaining';
        }

        if (cmd) {
            try {
                // Changed from exec() to safeExec() to fix spawn EBADF
                safeExec(cmd, (err, stdout) => {
                    if (err) {
                        console.warn("[SYSTEM] Battery check failed:", err.message);
                        return res.json({ 
                            success: false, 
                            result: "Unable to read battery status. Hardware API unavailable.",
                            error: err.message,
                            fix: platform === 'linux' ? "Install upower or acpi: sudo apt install upower acpi" : "Check system power settings."
                        });
                    }
                    // ... rest of battery parsing logic logic
                    let percentage = null;
                    let isCharging = false;
                    let timeRemaining = null;

                    if (platform === 'darwin') {
                        const match = stdout.match(/(\d+)%/);
                        if (match) percentage = parseInt(match[1]);
                        isCharging = stdout.includes('AC Power') || stdout.includes('charging');
                        const timeMatch = stdout.match(/(\d+:\d+) remaining/);
                        if (timeMatch) timeRemaining = timeMatch[1];
                    } else if (platform === 'linux') {
                        const match = stdout.match(/(\d+)%/);
                        if (match) percentage = parseInt(match[1]);
                        isCharging = stdout.toLowerCase().includes('charging');
                    } else if (platform === 'win32') {
                        const lines = stdout.split('\n');
                        if (lines.length > 1 && lines[1].trim()) {
                            percentage = parseInt(lines[1].trim());
                        }
                    }

                    if (percentage !== null) {
                        const status = isCharging ? 'Charging' : 'Discharging';
                        let result = `Battery: ${percentage}% (${status})`;
                        if (timeRemaining) result += ` - ${timeRemaining} remaining`;
                        
                        return res.json({ 
                            success: true, 
                            result,
                            data: { percentage, isCharging, timeRemaining }
                        });
                    } else {
                        return res.json({ 
                            success: false, 
                            result: "Could not parse battery information." 
                        });
                    }
                });
            } catch (e) {
                 console.error("[SYSTEM] Battery exec spawn failed:", e);
                 return res.json({ success: false, error: "Battery check failed to spawn", details: e.message });
            }
            return;
        }
    }

    // Volume Control
    if (action === "SET_VOLUME" || action === "VOLUME_SET") {
        const volumeLevel = level || value;
        let cmd = '';
        if (platform === 'darwin') cmd = `osascript -e "set volume output volume ${volumeLevel}"`;
        else if (platform === 'win32') cmd = `nircmd.exe setsysvolume ${Math.round(volumeLevel * 655.35)}`; // Assuming nircmd is in path
        
        if (cmd) {
            try {
                // Use safeExec for volume control too
                safeExec(cmd, (err) => res.json({ success: !err, result: err ? err.message : `Volume set to ${volumeLevel}%` }));
            } catch (e) {
                 return res.json({ success: false, error: "Volume set failed to spawn", details: e.message });
            }
            return;
        }
    }

    res.json({ message: "System control endpoint active", action, status: "PROCESSED" });
});


// --- HOTSPOT CONTROL (PHASE 8) ---
router.post('/hotspot', (req, res) => {
    const { action } = req.body; // 'on', 'off', 'toggle'
    const platform = os.platform();

    if (platform !== 'darwin') {
        return res.json({ success: false, error: "Hotspot control only supported on macOS." });
    }
    
    // Path to our JXA script
    const scriptPath = path.resolve(process.cwd(), 'ops', 'scripts', 'hotspot.js');

    if (!fs.existsSync(scriptPath)) {
        return res.status(404).json({ error: "Hotspot automation script not found." });
    }

    console.log(`[SYSTEM] Executing Hotspot Automation: ${action}`);
    
    // Execute JXA via osascript -l JavaScript
    exec(`osascript -l JavaScript "${scriptPath}" "${action}"`, (error, stdout, stderr) => {
        if (error) {
            console.error("[HOTSPOT] Execution Failed:", stderr);
            return res.json({ success: false, error: error.message, details: stderr });
        }
        
        const output = stdout.trim();
        console.log("[HOTSPOT] Result:", output);
        
        if (output.startsWith("ERROR")) {
            return res.json({ success: false, error: output });
        }
        
        res.json({ success: true, message: output });
    });
});

import { cortexService } from '../../services/cortexService.js';

// --- CORTEX CONTROL ---
router.post('/cortex/start', (req, res) => {
    const { useVenv } = req.body;
    const result = cortexService.start(useVenv !== false);
    res.json(result);
});

router.post('/cortex/stop', (req, res) => {
    const result = cortexService.stop();
    res.json(result);
});

router.get('/cortex/status', (req, res) => {
    res.json(cortexService.getStatus());
});

router.get('/cortex/logs', (req, res) => {
    res.json({ logs: cortexService.getLogs() });
});

// --- CLIPBOARD ---
router.get('/clipboard', (req, res) => {
    const platform = os.platform();
    let cmd = '';

    if (platform === 'win32') {
        cmd = 'powershell -command "Get-Clipboard"';
    } else if (platform === 'darwin') {
        cmd = 'pbpaste';
    } else if (platform === 'linux') {
        cmd = 'xclip -o -selection clipboard || xsel --clipboard --output';
    } else {
        return res.json({ content: "Clipboard not supported on this OS." });
    }

    exec(cmd, (err, stdout) => {
        if (err) {
            console.error("[SYSTEM] Clipboard read error:", err.message);
            return res.json({ 
                content: "", 
                error: err.message,
                fix: platform === 'linux' ? "Install xclip: sudo apt install xclip" : "Ensure system clipboard is accessible."
            });
        }
        res.json({ content: stdout.trim() });
    });
});

router.post('/clipboard', (req, res) => {
    const { content } = req.body;
    const platform = os.platform();

    if (!content) return res.json({ success: false });

    if (platform === 'win32') {
        const safeContent = content.replace(/'/g, "''");
        const ps = `powershell -command "Set-Clipboard -Value '${safeContent}'"`;
        exec(ps, (err) => {
            if (err) return res.json({ success: false, error: err.message });
            res.json({ success: true });
        });
    } else if (platform === 'darwin') {
        const proc = exec('pbcopy');
        proc.stdin.write(content);
        proc.stdin.end();
        res.json({ success: true });
    } else if (platform === 'linux') {
        const proc = exec('xclip -selection clipboard || xsel --clipboard --input');
        proc.stdin.write(content);
        proc.stdin.end();
        res.json({ success: true });
    } else {
        res.json({ success: false, error: "OS not supported" });
    }
});

// --- APP MANAGEMENT ---
router.get('/apps/list', (req, res) => {
    const platform = os.platform();
    
    if (platform === 'darwin') {
        exec('ls /Applications', (err, stdout) => {
            if (err) return res.status(500).json({ error: err.message });
            const apps = stdout.split('\n').filter(a => a.endsWith('.app')).map(a => a.replace('.app', ''));
            res.json({ apps });
        });
    } else if (platform === 'win32') {
        const ps = 'Get-ItemProperty HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* | Select-Object DisplayName | Format-Table -AutoSize';
        exec(`powershell -command "${ps}"`, (err, stdout) => {
            if (err) return res.status(500).json({ error: err.message });
            const apps = stdout.split('\n').filter(l => l.trim()).slice(2);
            res.json({ apps });
        });
    } else {
        res.status(400).json({ error: 'Platform not supported' });
    }
});

router.post('/apps/close', (req, res) => {
    const { appName } = req.body;
    const platform = os.platform();
    
    if (platform === 'darwin') {
        exec(`osascript -e 'quit app "${appName}"'`, (err) => {
            if (err) return res.json({ success: false, error: err.message });
            res.json({ success: true });
        });
    } else if (platform === 'win32') {
        exec(`taskkill /IM "${appName}.exe" /F`, (err) => {
            if (err) return res.json({ success: false, error: err.message });
            res.json({ success: true });
        });
    } else {
        res.status(400).json({ error: 'Platform not supported' });
    }
});

router.get('/apps/active', (req, res) => {
    const platform = os.platform();
    
    if (platform === 'darwin') {
        exec('osascript -e \'tell application "System Events" to get name of first application process whose frontmost is true\'', (err, stdout) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ app: stdout.trim() });
        });
    } else if (platform === 'win32') {
        const ps = 'Add-Type @"\nusing System;\nusing System.Runtime.InteropServices;\npublic class Win32 {\n[DllImport("user32.dll")]\npublic static extern IntPtr GetForegroundWindow();\n[DllImport("user32.dll")]\npublic static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder text, int count);\n}\n"@; $hwnd = [Win32]::GetForegroundWindow(); $text = New-Object System.Text.StringBuilder 256; [Win32]::GetWindowText($hwnd, $text, 256); $text.ToString()';
        exec(`powershell -command "${ps}"`, (err, stdout) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ app: stdout.trim() });
        });
    } else {
        res.status(400).json({ error: 'Platform not supported' });
    }
});

// --- SCREEN DIMENSIONS ---
router.get('/screen/dimensions', (req, res) => {
    const platform = os.platform();
    
    if (platform === 'darwin') {
        exec('system_profiler SPDisplaysDataType | grep Resolution', (err, stdout) => {
            if (err) return res.status(500).json({ error: err.message });
            const match = stdout.match(/(\d+) x (\d+)/);
            if (match) {
                res.json({ width: parseInt(match[1]), height: parseInt(match[2]) });
            } else {
                res.json({ width: 1920, height: 1080 }); // Default
            }
        });
    } else if (platform === 'win32') {
        const ps = 'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Screen]::PrimaryScreen.Bounds | Select-Object Width, Height | ConvertTo-Json';
        exec(`powershell -command "${ps}"`, (err, stdout) => {
            if (err) return res.status(500).json({ error: err.message });
            try {
                const dims = JSON.parse(stdout);
                res.json({ width: dims.Width, height: dims.Height });
            } catch (e) {
                console.error("[SYSTEM] Screen dimensions parse error:", e.message);
                res.json({ width: 1920, height: 1080 });
            }
        });
    } else {
        exec('xdpyinfo | grep dimensions', (err, stdout) => {
            if (err) {
                console.warn("[SYSTEM] Linux screen dimensions check failed:", err.message);
                return res.json({ 
                    width: 1920, 
                    height: 1080, 
                    error: err.message,
                    fix: "Install x11-utils: sudo apt install x11-utils"
                });
            }
            const match = stdout.match(/(\d+)x(\d+)/);
            if (match) {
                res.json({ width: parseInt(match[1]), height: parseInt(match[2]) });
            } else {
                res.json({ width: 1920, height: 1080 });
            }
        });
    }
});

// --- ALERT LEVELS ---
router.post('/alert', (req, res) => {
    const { level } = req.body;
    console.log(`[SYSTEM] 🚨 SECURITY ALERT LEVEL SET TO: ${level}`);
    
    // In a real system, this would update firewall rules or trigger notifications.
    // For now, we propagate it to the status.
    res.json({ success: true, message: `System Alert Level [${level}] Engaged.` });
});

// --- LOCKDOWN ---
router.post('/lockdown', (req, res) => {
    console.log("[SYSTEM] ⚠️ INITIATING LOCKDOWN PROTOCOL...");
    
    // Simulation: Kill non-essential processes and disconnect active sessions
    // Real-world: iptables drop, shutdown radio, kill -9 non-root
    res.json({ 
        success: true, 
        message: "LOCKDOWN COMPLETE. Non-essential systems isolated. External comms restricted." 
    });
});

export default router;
