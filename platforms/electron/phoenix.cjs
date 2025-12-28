/**
 * PHOENIX LAUNCHER (The Immortal Supervisor)
 * -----------------------------------------
 * This script runs OUTSIDE of Electron. It is the "God Process".
 * It spawns Luca, watches for death, and performs divine intervention (AI Repair).
 */

require('dotenv').config({ path: '../../.env' }); // Load env vars
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// CONFIGURATION
const MAX_CRASH_LOOP = 5;
const CRASH_WINDOW_MS = 60000; // 5 crashes in 1 minute = AI Repair
let crashCount = 0;
let lastCrashTime = 0;

// API KEY (Vital for Resurrection)
const API_KEY = process.env.VITE_API_KEY || process.env.GEMINI_API_KEY;

// LOGGING
function log(msg, type = 'PHOENIX') {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`\x1b[35m[${type}] ${timestamp} ➤ ${msg}\x1b[0m`);
}

// CLEANUP (Kill Zombies)
async function killPort(port) {
    return new Promise(resolve => {
        exec(`lsof -ti:${port} | xargs kill -9`, (err) => resolve());
    });
}

// AI REPAIR DOCTOR (Ported from Medic)
async function performDivineIntervention(errorLogs) {
    if (!API_KEY) {
        log("Cannot perform Divine Intervention: No API KEY found.", "DEATH");
        return false;
    }

    log("Summoning Gemini for Code Surgery...", "DIVINE");
    
    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

        const prompt = `
        CRITICAL SYSTEM FAILURE DETECTED.
        You are the Phoenix Recovery AI.
        
        The application failed to start.
        Here are the last 50 lines of stderr:
        ${errorLogs.slice(-50).join('\n')}

        TASK: Analyze the error and provide a fix.
        
        OPTIONS:
        1. IF it is a shell command fix (install dependency, kill port):
           Return "type": "shell", "command": "..."
        2. IF it is a CODE fix (syntax error, typo, bad import) AND you know the file path:
           Return "type": "evolve", "targetPath": "relative/path/to/file", "code": "FULL NEW FILE CONTENT"

        CONSTRAINTS:
        - OS is macOS.
        - For 'evolve', you MUST provide the FULL file content, not a diff.
        
        Return JSON ONLY:
        {
            "reasoning": "Explanation",
            "type": "shell" | "evolve",
            "command": "Shell command (if type=shell)",
            "targetPath": "Path (if type=evolve)",
            "code": "Code (if type=evolve)"
        }
        `;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const plan = JSON.parse(jsonStr);

        log(`Diagnosis: ${plan.reasoning}`, "DOCTOR");

        if (plan.type === 'evolve') {
            log(`Attempting Safe Evolution on: ${plan.targetPath}`, "EVOLUTION");
            
            // Call Safe Evolution API
            // Assuming Server is running on 3001. If not, this might fail, but Phoenix is high-stakes.
            try {
                const response = await fetch('http://localhost:3001/api/evolution/evolve', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        targetPath: plan.targetPath,
                        code: plan.code
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    log("Evolution Successful. Application healed.", "LIFE");
                    return true;
                } else {
                    log(`Evolution Failed: ${data.message}`, "DEATH");
                    if (data.details && data.details.output) {
                        log(`Verification Output: ${data.details.output}`, "DEBUG");
                    }
                    return false;
                }
            } catch (err) {
                log(`Evolution API Unreachable: ${err.message}. Is Server running?`, "ERROR");
                return false;
            }

        } else {
            // Legacy Shell Execution
            log(`Prescription: ${plan.command}`, "DOCTOR");
            
            await new Promise((resolve, reject) => {
                exec(plan.command, { cwd: path.join(__dirname, '../../') }, (err, stdout, stderr) => {
                    if (err) {
                        log(`Surgery Failed: ${stderr}`, "DEATH");
                        resolve(false);
                    } else {
                        log("Surgery Complete.", "LIFE");
                        resolve(true);
                    }
                });
            });
            return true;
        }

    } catch (e) {
        log(`Divine Intervention Failed: ${e.message}`, "DEATH");
        return false;
    }
}

// KEY MANAGEMENT & SETUP WIZARD
async function getKey() {
    let key = process.env.VITE_API_KEY || process.env.GEMINI_API_KEY;
    if (key) return key;

    log("NO API KEY FOUND. INITIATING SETUP PROTOCOL.", "INIT");
    
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        readline.question('\x1b[36m[PHOENIX] ENTER GEMINI API KEY TO ACTIVATE REDQUEEN OS: \x1b[0m', (input) => {
            const newKey = input.trim();
            if (newKey.length > 20) {
                // Save to .env
                fs.appendFileSync(path.join(__dirname, '../../.env'), `\nVITE_API_KEY=${newKey}\n`);
                process.env.VITE_API_KEY = newKey; // Set in current memory
                log("API KEY ACCEPTED. BIOS UNLOCKED.", "SUCCESS");
                resolve(newKey);
            } else {
                log("INVALID KEY. SYSTEM HALTED.", "ERROR");
                process.exit(1);
            }
            readline.close();
        });
    });
}

// THE IMMORTAL LOOP
async function spawnLuca() {
    // 0. Ensure Key Exists (Boot Check)
    const activeKey = await getKey();

    // 1. Pre-Flight Cleanup
    await killPort(3001);
    await killPort(8000);

    log("Spawning Luca Process...", "BIRTH");

    // Determine Run Mode (Dev or Prod)
    // We launch via npm run electron:dev to keep dev tools available, or electron . directly
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    
    const luca = spawn(npmCmd, ['run', 'electron:dev'], {
        cwd: path.join(__dirname, '../../'),
        stdio: 'pipe', // We need to read stderr
        env: { ...process.env, PHOENIX_SAVED: 'true', VITE_API_KEY: activeKey }
    });

    const errorBuffer = [];

    luca.stdout.on('data', (data) => {
        const line = data.toString().trim();
        // Pipe through but maybe suppress noise
        // console.log(line); 
        if (line.includes('PHOENIX')) console.log(line); // Pass through internal logs
    });

    luca.stderr.on('data', (data) => {
        const line = data.toString();
        errorBuffer.push(line);
        if (errorBuffer.length > 100) errorBuffer.shift(); // Keep last 100 lines
        process.stderr.write(`[LUCA STDERR] ${line}`);
    });

    luca.on('close', async (code) => {
        log(`Luca died with exit code: ${code}`, "DEATH");

        if (code === 0) {
            log("Clean exit. Phoenix resting.", "SLEEP");
            process.exit(0);
        }

        // CRASH DETECTED
        const now = Date.now();
        if (now - lastCrashTime < CRASH_WINDOW_MS) {
            crashCount++;
        } else {
            crashCount = 1;
        }
        lastCrashTime = now;

        if (crashCount > MAX_CRASH_LOOP) {
            log("Too many crashes! Initiating DIVINE INTERVENTION.", "EMERGENCY");
            const fixed = await performDivineIntervention(errorBuffer);
            if (fixed) {
                crashCount = 0; // Reset on success
            } else {
                log("Resurrection failed. Giving up.", "GAMEOVER");
                process.exit(1);
            }
        }

        log("Resurrecting in 2 seconds...", "MAGIC");
        setTimeout(spawnLuca, 2000);
    });
}

// IGNITION
log("Phoenix Supervisor v1.0 Online.", "INIT");
spawnLuca();
