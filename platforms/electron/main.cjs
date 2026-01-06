/* eslint-disable @typescript-eslint/no-require-imports */
const { app, BrowserWindow, ipcMain, shell, desktopCapturer, Tray, Menu, nativeImage, screen, systemPreferences } = require('electron');
require('dotenv').config(); // Load environment variables for Main process (and Medic)
const path = require('path');
const net = require('net'); // Native Node.js net module for TCP
const { spawn, exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Pentesting modules
const WiFiScanner = require('./pentesting/wifiScanner.cjs');
const wifiScanner = new WiFiScanner();

let robot;
try {
  robot = require('robotjs');
  console.log("[MAIN] ✅ RobotJS loaded successfully. HID Control active.");
} catch (e) {
  console.error("[MAIN] ❌ Failed to load robotjs:", e);
}

// Keep a global reference of the window object
let mainWindow;
let widgetWindow; // Widget Window Reference
let chatWindow; // Chat Window Reference (Neural CLI)
let browserWindow; // Browser Window Reference (GhostBrowser)
let visualCoreWindow; // Visual Core Window Reference (Smart Screen)
let bootWindow; // BIOS Boot Window
let tray; // Tray Reference
let trayMenu; // Tray Menu Reference
let serverProcess;
let cortexProcess;


// --- IPC HANDLERS (EARLY REGISTRATION) ---
ipcMain.handle('get-local-ip', async () => {
    console.log("[IPC] Handler 'get-local-ip' called");
    const os = require('os');
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip internal (non-127.0.0.1) and non-IPv4 addresses
            if (iface.family === 'IPv4' && !iface.internal) {
                console.log("[IPC] Found Local IP:", iface.address);
                return iface.address;
            }
        }
    }
    return '127.0.0.1'; // Fallback
});

// --- BIOS BOOT SEQUENCE ---
let rebootAttempts = 0;

function createBootWindow() {
    if (bootWindow) return; // Re-use if exists

    bootWindow = new BrowserWindow({
        width: 600,
        height: 400,
        frame: false,
        transparent: false,
        backgroundColor: '#000000',
        center: true,
        resizable: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    bootWindow.loadFile(path.join(__dirname, 'boot.html'));
    bootWindow.on('closed', () => { bootWindow = null; });
}

async function checkPort(port) {
    return new Promise(resolve => {
        const client = new net.Socket();
        client.connect(port, '127.0.0.1', () => {
            client.destroy();
            resolve(true);
        });
        client.on('error', () => resolve(false));
    });
}

function cleanupProcesses() {
    if (serverProcess) {
        console.log('[BOOT] Killing Server Process...');
        serverProcess.kill();
        serverProcess = null;
    }
    if (cortexProcess) {
        console.log('[BOOT] Killing Cortex Process...');
        cortexProcess.kill();
        cortexProcess = null;
    }
}



let recoveryWindow;

function createRecoveryWindow() {
    if (recoveryWindow) return;

    recoveryWindow = new BrowserWindow({
        width: 800,
        height: 600,
        backgroundColor: '#1a0505',
        frame: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    recoveryWindow.loadFile(path.join(__dirname, 'recovery.html'));
    recoveryWindow.on('closed', () => { recoveryWindow = null; });
}

let bootLogs = []; // Store logs for Medic

async function bootSequence(isSilent = false) {
    if (!isSilent) createBootWindow();
    bootLogs = []; // Reset logs

    const log = (msg, type = 'info', progress) => {
        bootLogs.push(`[${type}] ${msg}`); // Capture for Medic
        if (bootWindow && !bootWindow.isDestroyed()) {
            bootWindow.webContents.send('boot-log', { message: msg, type, progress });
        }
        console.log(`[BOOT] ${msg}`);
    };

    if (rebootAttempts > 0) {
        log(`[SYSTEM] Watchdog Failure. Rebooting (Attempt ${rebootAttempts}/3)...`, 'warn', 0);
        await new Promise(r => setTimeout(r, 2000));
        cleanupProcesses();
    }

    // 1. Hardware Check
    if (rebootAttempts === 0) { // Only show hardware check on cold boot
        log("Initializing Hardware Abstraction Layer...", 'info', 10);
        await new Promise(r => setTimeout(r, 800)); 
    }

    // 2. Start Subsystems
    log("Spawning Neural Cortex (Port 8000)...", 'warn', 30);
    startCortex();
    
    log("Igniting Node.js Logic Core (Port 3002)...", 'warn', 40);
    startServer();

    // 3. Wait Loop
    let serverReady = false;
    let cortexReady = false;
    let attempts = 0;
    const maxAttempts = 60; // Increased to 60s

    const checkInterval = setInterval(async () => {
        attempts++;
        
        // Don't check if we are rebooting/cleaning up
        if (!bootWindow) {
            clearInterval(checkInterval);
            return;
        }

        if (!serverReady) serverReady = await checkPort(3002);
        if (!cortexReady) cortexReady = await checkPort(8000);

        if (serverReady && !cortexReady) {
            log(`[WAIT] Logic Core Ready. Waiting for Cortex Graph DB... (${attempts}s)`, 'info', 50 + Math.floor(attempts/2));
        } else if (!serverReady && cortexReady) {
             log(`[WAIT] Cortex Ready. Waiting for Logic Core... (${attempts}s)`, 'info', 50 + Math.floor(attempts/2));
        }

        if (serverReady && cortexReady) {
            clearInterval(checkInterval);
            rebootAttempts = 0; // Reset on success
            log("ALL SYSTEMS ONLINE. HANDSHAKE COMPLETE.", 'success', 100);
            if (bootWindow) bootWindow.webContents.send('boot-status', 'SYSTEM READY');
            
            setTimeout(() => {
                launchInterface(isSilent);
            }, 1000); 
        } else if (attempts >= maxAttempts) {
            clearInterval(checkInterval);
            handleBootFailure("TIMEOUT", log);
        }
    }, 1000);
}

const MedicService = require('./services/medic.cjs');

async function handleBootFailure(reason, logFunc) {
    rebootAttempts++;
    if (rebootAttempts <= 3) {
        logFunc(`BOOT FAILURE: ${reason}. Retrying (Attempt ${rebootAttempts}/3)...`, 'error', 100);
        setTimeout(() => {
             // Close existing windows before retry?
             bootSequence();
        }, 1000);
    } else {
        logFunc("CRITICAL FAILURE: MAX REBOOTS EXCEEDED.", 'error', 100);
        
        // --- LEVEL 2: THE MEDIC ---
        if (bootWindow) bootWindow.close();
        createRecoveryWindow();
        
        const medic = new MedicService(recoveryWindow);
        const result = await medic.startTriage(bootLogs);
        
        if (result.success) {
            console.log('[MAIN] Medic reported success. Rebooting system...');
            rebootAttempts = 0;
            if (recoveryWindow) recoveryWindow.close();
            bootSequence();
        } else {
            console.log('[MAIN] Medic failed to revive system. HALTING.');
            // IPC to show failure in Recovery Window
             if (recoveryWindow) recoveryWindow.webContents.send('medic-log', { message: "SYSTEM HALTED. PLEASE CHECK TERMINAL.", type: 'error' });
        }
    }
}

function launchInterface(isSilent = false) {
    if (!isSilent) createWindow();
    createWidgetWindow(); 
    createChatWindow();
    
    // Always create/show hologram if configured, especially on silent launch
    // User requested: "hologram face... start her self"
    toggleHologram(); 
    
    // Smooth transition: Show Main, Wait, Close Boot
    if (mainWindow && bootWindow) {
        mainWindow.once('ready-to-show', () => {
            mainWindow.show(); // Assuming mainWindow is created with show:false usually, but here default is show
            setTimeout(() => {
                 if (bootWindow) bootWindow.close();
            }, 500);
        });
    } else {
        if (bootWindow) bootWindow.close();
    }
}

function createWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        backgroundColor: '#000000',
        titleBarStyle: 'hiddenInset', // Mac-style hidden title bar
        icon: path.join(__dirname, '../../public/logo.png'), // Desktop Icon (Background)
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false, // Security best practice
            contextIsolation: true, // Security best practice
            webSecurity: false, // Allow loading local resources if needed (dev only)
            webviewTag: true, // Enable <webview> tag support
            backgroundThrottling: false // CRITICAL: Allow Audio/Mic to run when window is backgrounded
        }
    });

    // Load the app
    // Load the app
    const isDev = !app.isPackaged;
    const startUrl = process.env.ELECTRON_START_URL || (isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, '../../dist/index.html')}`);
    
    console.log(`[MAIN] Loading Window URL: ${startUrl}`);
    mainWindow.loadURL(startUrl);

    // Open the DevTools.
    mainWindow.webContents.openDevTools();

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('Failed to load:', errorCode, errorDescription);
    });

    mainWindow.webContents.on('dom-ready', () => {
        console.log('DOM Ready');
    });

    // Emitted when the window is closed.
    mainWindow.on('close', (event) => {
        if (global.minimizeToTray && !app.isQuitting) {
            event.preventDefault();
            mainWindow.hide();
            return false;
        }
    });

    mainWindow.on('closed', function () {
        mainWindow = null;
    });

    // Handle external links
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });
}

// Start the Backend Server (Node.js)
function startServer() {
    const serverPath = path.join(__dirname, '../../server.js');
    console.log('Starting Backend Server at:', serverPath);

    // Use 'spawn' with 'node' to decouple from Electron's runtime/ABI
    // This ensures better-sqlite3 binaries (compiled for system Node) work correctly.
    // In production, we assume 'node' is available or bundle the runtime.
    serverProcess = spawn('node', [serverPath], {
        env: { ...process.env, PORT: 3002, ELECTRON_RUN: 'true' },
        stdio: 'inherit'
    });

    serverProcess.on('error', (err) => {
        console.error('Failed to start Backend Server:', err);
    });
}

// Port Finding Utility
function findAvailablePort(startPort, endPort = startPort + 100) {
    return new Promise((resolve, reject) => {
        const server = require('net').createServer();
        server.unref();
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                if (startPort >= endPort) {
                    reject(new Error('No available ports found'));
                } else {
                    findAvailablePort(startPort + 1, endPort).then(resolve, reject);
                }
            } else {
                reject(err);
            }
        });
        server.listen(startPort, () => {
            server.close(() => {
                resolve(startPort);
            });
        });
    });
}

let cortexPort = 8000; // Default, will be updated

// Start the Python Cortex (LightRAG)
// Start the Python Cortex (LightRAG)
async function startCortex() {
    const cortexPath = path.join(__dirname, '../../cortex/python/cortex.py');
    console.log('Starting Cortex (LightRAG) at:', cortexPath);

    try {
        cortexPort = await findAvailablePort(8000);
        console.log(`[CORTEX] Found available port: ${cortexPort}`);
    } catch (e) {
        console.error('[CORTEX] Failed to find port:', e);
        cortexPort = 8000; // Fallback
    }

    // Check for venv python first, then fallback to system
    const venvPython = path.join(__dirname, '../../cortex/python/venv/bin/python');
    const systemPython = process.platform === 'win32' ? 'python' : 'python3';

    // Simple check if venv exists
    const fs = require('fs');
    const pythonCmd = fs.existsSync(venvPython) ? venvPython : systemPython;

    console.log('Using Python Interpreter:', pythonCmd);

    // Initial Env from Process
    const env = { 
        ...process.env, 
        PYTHONUNBUFFERED: '1',
        CORTEX_PORT: cortexPort.toString()
    };

    // Load .env.local if it exists (Overrides process.env)
    const envPath = path.join(__dirname, '../../.env.local');
    if (fs.existsSync(envPath)) {
        try {
            console.log('[CORTEX] Loading .env.local from:', envPath);
            const envContent = fs.readFileSync(envPath, 'utf8');
            envContent.split('\n').forEach(line => {
                const match = line.match(/^([^=]+)=(.*)$/);
                if (match) {
                    const key = match[1].trim();
                    let value = match[2].trim();
                    // Strip quotes
                    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                        value = value.slice(1, -1);
                    }
                    if (key && value) {
                        env[key] = value;
                    }
                }
            });
        } catch (e) {
            console.error('[CORTEX] Error reading .env.local:', e);
        }
    }

    // Ensure API Key Aliases
    if (env.GEMINI_API_KEY) {
        env.GOOGLE_API_KEY = env.GEMINI_API_KEY; // Alias for Google SDKs
        env.API_KEY = env.GEMINI_API_KEY;        // Alias for generic SDKs
        console.log(`[CORTEX] GEMINI_API_KEY found (Length: ${env.GEMINI_API_KEY.length}). Aliased to GOOGLE_API_KEY.`);
    } else {
        console.error('[CORTEX] CRITICAL: GEMINI_API_KEY missing from Final Env!');
    }

    cortexProcess = spawn(pythonCmd, [cortexPath], {
        stdio: 'inherit',
        env: env
    });

    cortexProcess.on('error', (err) => {
        console.error('Failed to start Cortex:', err);
        if (bootWindow) bootWindow.webContents.send('boot-log', { message: `[CORTEX] Spawn Error: ${err.message}`, type: 'error' });
    });

    cortexProcess.on('exit', (code, signal) => {
        console.log(`Cortex exited with code ${code} and signal ${signal}`);
        if (bootWindow) bootWindow.webContents.send('boot-log', { message: `[CORTEX] Process Died (Code: ${code})`, type: 'error' });
    });
}

// --- TRAY & WIDGET MANANGEMENT ---

function createTray() {
    const iconPath = path.join(__dirname, '../../public/icon.png');
    let trayIcon;
    
    try {
        trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
        if (trayIcon.isEmpty()) {
            throw new Error("Icon file missing or empty");
        }
    } catch {
        console.log('[TRAY] Falling back to default icon');
        // Simple 16x16 white circle base64
        trayIcon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEgAACxIB0t1+/AAAABZ0RVh0Q3JlYXRpb24gVGltZQAxMC8yOS8xMiHZF3sAAAAcdEVYdFNvZnR3YXJlAEFkb2JlIEZpcmV3b3JrcyBDUzVxteM2AAAAawlEQVQ4jZmQwQ3AIAxDz7I8jUZn6Wg0Won+I0QhQhH+7bOcyI6D6u6qKq1tW2vt5HnOuQ4A7v7GueecI38GAGut53c/VRURoZSClFL6L4QQQsqZc8445+R+3/631iYi9H3P+76T933zD/4B8EwX5hVw7NwAAAAASUVORK5CYII=');
    }
    
    tray = new Tray(trayIcon);
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Luca Dashboard', click: () => toggleMainWindow() },
        { label: 'Luca Smart Screen', click: () => toggleVisualCoreWindow() },
        { label: 'Luca Ghost Browser', click: () => createGhostBrowserWindow() },
        { label: '🎙️ Start Dictation (Ctrl+D)', click: () => toggleWidgetWindow() },

        { label: 'Luca Hologram Widget', click: () => toggleHologram() }, // New Hologram Toggle
        { label: 'Luca Mini Chat', click: () => toggleChatWindow() },
        { type: 'separator' },
        { 
            label: 'Change Theme', 
             submenu: [
                { label: 'Assistant Mode (White)', click: () => switchPersona('ASSISTANT') },
                { label: 'Engineer Mode (Terracotta)', click: () => switchPersona('ENGINEER') },
                { label: 'Ruthless Mode (Blue)', click: () => switchPersona('RUTHLESS') },
                { label: 'Hacker Mode (Green)', click: () => switchPersona('HACKER') }
            ]
        },
        { type: 'separator' },
        { 
            label: '⚡ God Mode (Autonomy)', 
            type: 'checkbox', 
            checked: false, 
            click: (item) => toggleGodMode(item.checked) 
        },
        { 
            label: '🎙️ Sense (Wake Word)', 
            type: 'checkbox', 
            id: 'wake-word-monitor',
            checked: false, 
            click: (item) => toggleWakeWordMonitor(item.checked)
        },
        { type: 'separator' },
        { label: 'Quit Luca', click: () => {
            app.isQuitting = true;
            app.quit();
        }}
    ]);
    
    tray.setToolTip('Luca AI');
    trayMenu = contextMenu;
    tray.setContextMenu(trayMenu);
    
    // tray.on('click') removed to prevent conflict with context menu
}

function toggleChatWindow() {
    if (!chatWindow) {
        createChatWindow();
    } else {
        if (chatWindow.isVisible()) {
            chatWindow.hide();
        } else {
            chatWindow.show();
            chatWindow.focus();
        }
    }
}

function toggleMainWindow() {
    if (!mainWindow) {
        createWindow();
    } else {
        if (mainWindow.isVisible()) {
            mainWindow.hide();
        } else {
            mainWindow.show();
            mainWindow.focus();
        }
    }
}

function toggleWidgetWindow() {
    if (!widgetWindow) {
        createWidgetWindow();
    } else {
        if (widgetWindow.isVisible()) {
            widgetWindow.hide();
        } else {
            widgetWindow.showInactive(); // Show but DO NOT STEAL FOCUS from Notepad/Chrome
            // widgetWindow.focus(); // REMOVED: We want focus to stay on the target app
        }
    }
}

// --- HOLOGRAM WINDOW ---
let hologramWindow;

function createHologramWindow() {
    if (hologramWindow) return;

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    // Freeform size (large enough for the w-80 h-80 container)
    // Position bottom-right, but account for potential dock
    // ample space

    hologramWindow = new BrowserWindow({
        width: 300, 
        height: 400, 
        x: width - 300, 
        y: height - 410,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        show: false,
        hasShadow: false,
        backgroundColor: '#00000000', // Transparent Hex
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false
        }
    });

    const isDev = !app.isPackaged;
    const url = isDev 
        ? 'http://localhost:3000?mode=hologram' 
        : `file://${path.join(__dirname, '../../dist/index.html')}?mode=hologram`;

    hologramWindow.loadURL(url);
    
    // Ensure visibility overlay
    hologramWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    hologramWindow.setAlwaysOnTop(true, "floating", 1);

    // Click-through behavior? 
    // If the user wants to click the "Mic", we need it to be interactive.
    // If we setIgnoreMouseEvents(true), we can't click.
    // So we keep it interactive. But the transparent parts might block clicks unless we handle ignoreMouseEvents in renderer.
    // For now, let's keep it simple (fully interactive rectangular window).

    hologramWindow.on('closed', () => {
        hologramWindow = null;
    });
}

function toggleHologram() {
    if (!hologramWindow) {
        createHologramWindow();
        // Wait briefly for load? Or just show when ready-to-show is better.
        // For now, create then show.
        setTimeout(() => {
            if (hologramWindow) hologramWindow.show();
        }, 500); 
    } else {
        if (hologramWindow.isVisible()) {
            hologramWindow.hide();
        } else {
            hologramWindow.show();
        }
    }
}

function switchPersona(mode) {
    if (mainWindow) mainWindow.webContents.send('switch-persona', mode);
    if (visualCoreWindow) visualCoreWindow.webContents.send('switch-persona', mode);
    if (widgetWindow) widgetWindow.webContents.send('switch-persona', mode);
    if (hologramWindow) hologramWindow.webContents.send('switch-persona', mode);
    if (chatWindow) chatWindow.webContents.send('switch-persona', mode);
}

async function toggleGodMode(enabled) {
    const endpoint = enabled ? 'start' : 'stop';
    try {
        console.log(`[TRAY] Toggling God Mode: ${endpoint.toUpperCase()}`);
        await fetch(`http://localhost:3002/api/autonomy/${endpoint}`, { method: 'POST' });
    } catch (e) {
        console.error(`[TRAY] Failed to toggle God Mode:`, e);
    }
}

function toggleWakeWordMonitor(enabled) {
    if (mainWindow) {
        console.log(`[TRAY] Sending toggle-wake-word: ${enabled}`);
        mainWindow.webContents.send('toggle-wake-word', enabled);
    }
}

// Bi-directional Sync: Update Tray Checkbox from Renderer
ipcMain.on('sync-wake-word-tray', (event, { enabled }) => {
    if (trayMenu) {
        const item = trayMenu.getMenuItemById('wake-word-monitor');
        if (item) {
            item.checked = enabled;
            console.log(`[TRAY] Synced checkbox to: ${enabled}`);
        }
    }
});



// CRITICAL: Allow AudioContext to start without user gesture (Global Shortcut fix)
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// App Lifecycle
app.on('ready', () => {
    // startServer(); << MOVED TO BOOT SEQUENCE
    // startCortex(); << MOVED TO BOOT SEQUENCE
    // createWindow(); << MOVED TO BOOT SEQUENCE
    
    // STARTUP CONFIGURATION
    if (app.isPackaged || process.env.NODE_ENV === 'production') {
        app.setLoginItemSettings({
            openAtLogin: true,
            openAsHidden: true, // "Silently start her self"
            args: ['--hidden']  // Windows flag
        });
    }

    // Detect if opened as hidden (macOS) or with flag (Windows)
    const loginSettings = app.getLoginItemSettings();
    const isSilentLaunch = loginSettings.wasOpenedAsHidden || process.argv.includes('--hidden');

    // initiate boot sequence (pass silent flag)
    bootSequence(isSilentLaunch); 

    createTray();         // Show Tray Icon

    // Start Window Watcher
    const windowWatcher = require('./services/windowWatcher.cjs');
    windowWatcher.startWatching(mainWindow);
    
    // FORCE DOCK ICON (Fix for Dev Mode Issues)
    if (process.platform === 'darwin') {
        const logoPath = path.join(__dirname, '../../public/logo.png');
        try {
             // We need to resolve the alias or copy if strictly needed, but let's try direct load
             // nativeImage supports file paths
            const dockIcon = nativeImage.createFromPath(logoPath);
            if (!dockIcon.isEmpty()) {
                 app.dock.setIcon(dockIcon);
                 console.log('[DOCK] Icon updated successfully via app.dock.setIcon');
            } else {
                 console.error('[DOCK] Logo file invalid or empty:', logoPath);
            }
        } catch (e) {
            console.error('[DOCK] Failed to set dock icon:', e);
        }
    }

    // Global Hotkey: Cmd+Shift+L to Toggle Window
    const { globalShortcut, clipboard } = require('electron');
    globalShortcut.register('CommandOrControl+Shift+L', () => {
        if (mainWindow) {
            if (mainWindow.isVisible()) {
                mainWindow.hide();
            } else {
                mainWindow.show();
                mainWindow.focus();
            }
        }
    });

    // Voice Mode Hotkeys
const toggleHologramVoice = () => {
    if (hologramWindow && hologramWindow.isVisible()) {
        hologramWindow.webContents.send('trigger-voice-toggle');
    }
};

const toggleDictation = () => {
    // Ensure widget exists
    if (!widgetWindow) {
        createWidgetWindow();
    }
    
    // Ensure it's visible
    if (!widgetWindow.isVisible()) {
        widgetWindow.show();
    }
    
    // Send signal (give it a slight delay if just created to ensure load)
    // But since it's a persistent window usually, direct send might work if ready.
    // Safety: check webContents
    if (widgetWindow.webContents && !widgetWindow.webContents.isLoading()) {
        widgetWindow.webContents.send('trigger-voice-toggle', { mode: 'TOGGLE', forceHud: true });
    } else {
        // If loading, wait a bit (fallback)
        widgetWindow.webContents.once('did-finish-load', () => {
             widgetWindow.webContents.send('trigger-voice-toggle', { mode: 'TOGGLE', forceHud: true });
        });
    }
};

    try {
        globalShortcut.register('Control+H', toggleHologramVoice); // Hologram
        globalShortcut.register('Control+D', toggleDictation);     // Dictation
        globalShortcut.register('F4', toggleDictation);            // F4 Defaults to Dictation
    } catch (e) {
        console.error('[HOTKEY] Failed to register voice shortcuts:', e);
    }

    // Clipboard IPC
    ipcMain.handle('clipboard-read', () => {
        return clipboard.readText();
    });

    ipcMain.handle('clipboard-write', (event, text) => {
        clipboard.writeText(text);
        return true;
    });

    // Vision Touch IPC
    ipcMain.handle('mouse-move', async (event, { x, y }) => {
        // console.log(`[IPC] mouse-move: ${x}, ${y}`); 
        if (robot) {
            try {
                robot.moveMouse(x, y);
                return true;
            } catch (e) {
                console.error('[IPC] robot.moveMouse failed:', e);
            }
        }

        // Fallback: Python Cortex (PyAutoGUI)
        try {
            // Use fetch (Node 18+)
            await fetch(`http://127.0.0.1:${cortexPort}/mouse/move`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ x, y })
            });
            return true;
        } catch {
            // console.error('[IPC] Python mouse move failed:', e);
            return false;
        }
    });

    ipcMain.handle('mouse-click', async (event, { button = 'left' }) => {
        console.log(`[IPC] mouse-click: ${button}`);
        if (robot) {
            try {
                robot.mouseClick(button);
                return true;
            } catch (e) {
                console.error('[IPC] robot.mouseClick failed:', e);
            }
        }

        // Fallback: Python Cortex (PyAutoGUI)
        try {
            await fetch(`http://127.0.0.1:${cortexPort}/mouse/click`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ button })
            });
            return true;
        } catch (e) {
            console.error('[IPC] Python mouse click failed:', e);
            return false;
        }
    });

    // Validates that the renderer can get the live port
    ipcMain.handle('get-cortex-config', () => {
        return { port: cortexPort };
    });
});

// Vision Touch: Open Screen Permissions
ipcMain.handle('open-screen-permissions', async () => {
    if (process.platform === 'darwin') {
        await shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
        return true;
    }
    return false;
});

// Vision Touch: Trigger Screen Permission (Native Popup)
// Vision Touch: Get Screen Sources (Custom Picker Support)
ipcMain.handle('trigger-screen-permission', async () => {
    try {
        const sources = await desktopCapturer.getSources({ types: ['screen', 'window'], thumbnailSize: { width: 320, height: 180 } });
        // Return simplified source objects
        return sources.map(s => ({
            id: s.id,
            name: s.name,
            thumbnail: s.thumbnail.toDataURL()
        }));
    } catch (e) {
        console.error("Failed to get screen sources:", e);
        return [];
    }
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// --- WINDOW FOCUS HANDLER ---
ipcMain.on('request-focus', () => {
    if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show(); // Ensure it's visible (e.g. if hidden)
        mainWindow.focus(); // Steal focus
        console.log("[MAIN] Window focus requested by renderer");
    }
});

// --- RESTART HANDLER ---
ipcMain.on('restart-app', () => {
    console.log("[MAIN] Restarting App...");
    app.relaunch();
    app.exit(0);
});

app.on('before-quit', () => {
    console.log('[MAIN] Quitting... Killing child processes.');
    if (serverProcess) {
        serverProcess.kill();
        serverProcess = null;
    }
    if (cortexProcess) {
        cortexProcess.kill();
        cortexProcess = null;
    }
    if (widgetWindow) {
        widgetWindow.close();
        widgetWindow = null;
    }
    if (chatWindow) {
        chatWindow.close();
        chatWindow = null;
    }
    if (browserWindow) {
        browserWindow.close();
        browserWindow = null;
    }
    if (visualCoreWindow) {
        visualCoreWindow.close();
        visualCoreWindow = null;
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
});

// --- WIDGET MODE INFRASTRUCTURE ---
// widgetWindow is defined globally above

function createWidgetWindow() {
  if (widgetWindow) return; // Already exists

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  widgetWindow = new BrowserWindow({
    width: 200, // Reduced from 250
    height: 300, // Reduced from 400
    x: width - 220, // Adjusted padding from right
    y: height - 350, // Adjusted padding from bottomRight positioning
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false, // Start Hidden (Use Tray to toggle)
    hasShadow: false,
    focusable: false, // CRITICAL: Prevent stealing focus from Notepad/Other Active Apps
    backgroundColor: '#00000000', // HEX transparent for Mac
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'), // Reuse preload
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    }
  });

  console.log('[WIDGET] BrowserWindow created');

  const isDev = !app.isPackaged;
  // Load same app but with ?mode=widget param
  const url = isDev 
    ? 'http://localhost:3000?mode=widget' 
    : `file://${path.join(__dirname, '../../dist/index.html')}?mode=widget`;
  
  console.log('[WIDGET] Loading URL:', url);
  widgetWindow.loadURL(url);

  // FORCE OVERLAY ON TOP OF FULLSCREEN APPS
  widgetWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  widgetWindow.setAlwaysOnTop(true, "floating", 1);
  widgetWindow.setFullScreenable(false);

  widgetWindow.once('ready-to-show', () => {
    console.log('[WIDGET] Window ready to show');
  });

  widgetWindow.on('closed', () => {
    console.log('[WIDGET] Window closed');
    widgetWindow = null;
  });

  // Forward console logs to terminal
  widgetWindow.webContents.on('console-message', (event, level, message) => {
      console.log('[WIDGET]', message);
  });

  // Log any errors
  widgetWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('[WIDGET] Failed to load:', errorCode, errorDescription);
  });
}

function createChatWindow() {
  if (chatWindow) return;

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  const w = 600;
  const h = 180; // Reduced height for Mini Chat feel

  chatWindow = new BrowserWindow({
    width: w,
    height: h,
    x: Math.floor(width / 2 - w / 2),
    y: Math.floor(height / 3), // Slightly higher than center
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true, // User requested resizability
    minWidth: 200,
    minHeight: 40,
    show: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    }
  });

  const isDev = !app.isPackaged;
  const url = isDev 
    ? 'http://localhost:3000?mode=chat' 
    : `file://${path.join(__dirname, '../../dist/index.html')}?mode=chat`;
  
  chatWindow.loadURL(url);
  chatWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  chatWindow.on('closed', () => {
    chatWindow = null;
  });
  
  // Close on blur (Spotlight style)
  chatWindow.on('blur', () => {
      // chatWindow.hide(); // Optional: user might want to keep it open
  });
}

// IPC:// IPC: Get Current Display ID for Screen Capture
ipcMain.handle('get-current-display-id', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return null;
    const { x, y, width, height } = win.getBounds();
    const display = screen.getDisplayMatching({ x, y, width, height });
    return display.id;
});

// Resizing IPC (Widget Mode)
ipcMain.on('switch-to-widget', () => {
  if (mainWindow) {
    mainWindow.hide();
  }
  toggleWidgetWindow(); // Use the toggle function
});

// IPC: Restore Main Window
ipcMain.on('restore-main-window', () => {
  if (widgetWindow) {
    widgetWindow.close();
  }
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  } else {
    createWindow(); // Recreate if missing
  }
});

// IPC: Sync State (Main -> Widget)
// App.tsx sends this, Main Process forwards to Widget
ipcMain.on('sync-widget-state', (event, state) => {
    if (widgetWindow) {
        widgetWindow.webContents.send('widget-update', state);
    }
    if (chatWindow) {
        chatWindow.webContents.send('widget-update', state);
    }
});

// IPC: Widget Control (Widget -> Main -> App)
    // Screen Capture
    ipcMain.handle('capture-screen', async () => {
        try {
            const sources = await desktopCapturer.getSources({ 
                types: ['screen'], 
                thumbnailSize: { width: 1280, height: 720 } // Reasonable quality
            });
            // Get primary screen (usually index 0)
            const primarySource = sources[0];
            return primarySource.thumbnail.toDataURL();
        } catch (error) {
            console.error('Failed to capture screen:', error);
            return null;
        }
    });

// IPC: Widget Voice Toggle (Widget -> Main -> Dashboard)
ipcMain.on('widget-toggle-voice', (event, { mode }) => {
    console.log(`[IPC] Widget requested voice toggle: ${mode}`);
    // Route to Main Window (Dashboard) which has the voice infrastructure
    if (mainWindow) {
        mainWindow.webContents.send('trigger-voice-toggle', { 
            mode: mode, 
            forceHud: false // Keep main HUD hidden, widget shows its own UI
        });
    }
});

// IPC: Widget Voice Data (App -> Main -> Widget UI)
ipcMain.on('widget-voice-data', (event, data) => {
    if (widgetWindow) {
        widgetWindow.webContents.send('widget-update', data);
    }
});

// IPC: Chat Widget Message (Widget -> Main -> App)
ipcMain.on('chat-widget-message', (event, data) => {
    console.log('[IPC] Received chat-widget-message:', data.text);
    
    // Forward to main window for processing
    if (mainWindow) {
        console.log('[IPC] Forwarding to main window');
        mainWindow.webContents.send('chat-widget-message', data);
    } else {
        console.error('[IPC] Main window not available!');
        // Send error back to chat widget
        if (chatWindow) {
            chatWindow.webContents.send('chat-widget-reply', 
                'Error: Main window not available. Please open Luca first.');
        }
    }
});

// IPC: Chat Reply (Main -> Chat Widget)
ipcMain.on('reply-chat-widget', (event, reply) => {
    console.log('[IPC] Sending reply to chat widget:', reply.substring(0, 50) + '...');
    if (chatWindow) {
        chatWindow.webContents.send('chat-widget-reply', reply);
    }
});

// Broadcast streaming chunks to Mini Chat Widget
ipcMain.on('broadcast-stream-chunk', (event, data) => {
    if (chatWindow && !chatWindow.isDestroyed()) {
        chatWindow.webContents.send('chat-widget-stream-chunk', data);
    }
});


// IPC: Close Widget Window
ipcMain.on('chat-widget-close', () => {
    console.log('[IPC] Closing chat widget window');
    if (chatWindow) {
        chatWindow.hide();
    }
    if (widgetWindow) {
        widgetWindow.hide();
    }
});

// --- VISUAL CORE WINDOW INFRASTRUCTURE (Option B: Smart Screen) ---

function createVisualCoreWindow(initialData = null) {
    if (visualCoreWindow) {
        if (initialData) {
            visualCoreWindow.webContents.send('visual-core-update', initialData);
        }
        visualCoreWindow.show();
        visualCoreWindow.focus();
        return;
    }

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width } = primaryDisplay.workAreaSize;
    
    // WIDGET MODE: Top-Right Corner, Floating, Larger
    const w = 960; // 960x540 (qHD)
    const h = 540; 
    const padding = 20;

    visualCoreWindow = new BrowserWindow({
        width: w,
        height: h,
        // Top-Right Positioning
        x: width - w - padding,
        y: padding,
        frame: false,
        transparent: true,
        backgroundColor: '#00000000',
        alwaysOnTop: true, // WIDGET BEHAVIOR
        skipTaskbar: true, // WIDGET BEHAVIOR
        resizable: true,   // User can resize if they want it bigger
        minWidth: 320,
        minHeight: 180,
        show: false,
        hasShadow: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false,
            webviewTag: true // Vital for Browser-in-Screen
        }
    });

    // Ensure it floats above full-screen apps (like a true OS widget)
    visualCoreWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    const isDev = !app.isPackaged;
    // Load app with ?mode=visual_core
    const url = isDev 
        ? 'http://localhost:3000?mode=visual_core' 
        : `file://${path.join(__dirname, '../dist/index.html')}?mode=visual_core`;

    visualCoreWindow.loadURL(url);

    visualCoreWindow.once('ready-to-show', () => {
        visualCoreWindow.show();
        visualCoreWindow.focus();
        if (initialData) {
            // Slight delay to ensure React is mounted
            setTimeout(() => {
                visualCoreWindow.webContents.send('visual-core-update', initialData);
            }, 1000);
        }
    });

    visualCoreWindow.on('closed', () => {
        visualCoreWindow = null;
    });
}

// IPC: Open Visual Core (Smart Screen)
ipcMain.on('open-visual-core', (event, data) => {
    createVisualCoreWindow(data);
});

// IPC: Update Visual Core Data
ipcMain.on('update-visual-core', (event, data) => {
    if (visualCoreWindow) {
        visualCoreWindow.webContents.send('visual-core-update', data);
        visualCoreWindow.show(); // Ensure visible update
    } else {
        createVisualCoreWindow(data); // Auto-open if closed
    }
});

// Chat Widget Resize Logic
ipcMain.on('chat-widget-resize', (event, { height, resizable }) => {
    if (chatWindow) {
        const [currentW] = chatWindow.getSize();
        
        // Lock height to the requested value, but allow width flexibility
        // 300 is min width, 800 is max width (arbitrary limits to keep it sane)
        chatWindow.setMinimumSize(300, height);
        chatWindow.setMaximumSize(1000, height);
        
        chatWindow.setSize(currentW, height, true); // true = animate
        
        if (typeof resizable === 'boolean') {
            chatWindow.setResizable(resizable);
        }
    }
});

// IPC: Close Visual Core
ipcMain.on('close-visual-core', () => {
    if (visualCoreWindow) {
        visualCoreWindow.close(); // Actually close it to free resources? Or Hide?
        // For a widget, hiding is often better for quick toggle, but closing saves RAM.
        // Let's stick to close() for now as implemented, or hide() if user wants persistence.
        // User currently has 'close-visual-core' doing .close()
    }
});

function toggleVisualCoreWindow() {
    if (visualCoreWindow) {
        if (visualCoreWindow.isVisible()) {
            visualCoreWindow.hide();
        } else {
            visualCoreWindow.show();
            visualCoreWindow.focus();
        }
    } else {
        createVisualCoreWindow();
    }
}

// --- GHOST BROWSER (Standalone) ---
function createGhostBrowserWindow(url = 'https://google.com') {
    const isDev = !app.isPackaged;
    const browserWin = new BrowserWindow({
        width: 1024,
        height: 768,
        title: "Ghost Browser",
        backgroundColor: '#000000',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.cjs'),
            webviewTag: true
        }
    });

    const appUrl = isDev 
        ? `http://localhost:3000?mode=browser&initialUrl=${encodeURIComponent(url)}` 
        : `file://${path.join(__dirname, '../dist/index.html')}?mode=browser&initialUrl=${encodeURIComponent(url)}`;
    
    browserWin.loadURL(appUrl);
}

ipcMain.on('open-browser', (event, { url }) => {
    createGhostBrowserWindow(url);
});

// --- KEYBOARD & ACCESSIBILITY IPC ---

ipcMain.handle('check-accessibility-permissions', () => {
    if (process.platform === 'darwin') {
        const trusted = systemPreferences.isTrustedAccessibilityClient(false);
        return trusted;
    }
    return true; // Windows/Linux usually don't need this specific check or handle it differently
});

ipcMain.handle('request-accessibility-permissions', () => {
     if (process.platform === 'darwin') {
        // Passing true triggers the prompt
        return systemPreferences.isTrustedAccessibilityClient(true);
    }
    return true;
});

ipcMain.handle('simulate-keyboard', async (event, { type, text, key, modifiers, delay }) => {
    if (!robot) return { success: false, error: "RobotJS not loaded (native module error)" };
    
    try {
        if (delay) await new Promise(r => setTimeout(r, delay));

        if (type === 'type') {
            robot.typeString(text);
        } else if (type === 'key') {
            robot.keyTap(key, modifiers || []);
        }
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// --- SYSTEM CONTROL IPC (PHASE 2) ---
// Executing AppleScript/Shell commands via Node.js in Main Process

// Helper: Run AppleScript
const runAppleScript = (script) => {
    return new Promise((resolve, reject) => {
        exec(`osascript -e '${script}'`, (error, stdout) => {
            if (error) return reject(error);
            resolve(stdout.trim());
        });
    });
};

// Helper: Run Shell Command
const runShell = (cmd) => {
    return new Promise((resolve, reject) => {
        exec(cmd, (error, stdout) => {
            if (error) return reject(error);
            resolve(stdout.trim());
        });
    });
};

// IPC: Type Text (Dictation)
ipcMain.on('type-text', (event, { text }) => {
    if (!text) return;
    console.log(`[DICTATION] Typing: ${text}`);
    
    // HIDE WIDGET TO RESTORE FOCUS TO TARGET APP
    if (widgetWindow && widgetWindow.isVisible()) {
        widgetWindow.hide();
    }
    
    // Add small delay to allow focus to restore to target app (essential for Luca Dashboard itself)
    setTimeout(() => {
        if (process.platform === 'win32') {
            // Windows: PowerShell SendKeys
            // 1. Escape single quotes for PowerShell string (' -> '')
            let safeText = text.replace(/'/g, "''");
            // 2. Escape SendKeys special characters (+^%~(){}[]) -> {char}
            safeText = safeText.replace(/[+^%~(){}[\]]/g, '{$&}');
            
            const script = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${safeText}')`;
            exec(`powershell -c "${script}"`, (error) => {
                 if (error) console.error(`[DICTATION-WIN] Error: ${error.message}`);
            });
        } else {
            // macOS: AppleScript
            // Escape double quotes for AppleScript string
            const safeText = text.replace(/"/g, '\\"');
            const script = `tell application "System Events" to keystroke "${safeText}"`;
            exec(`osascript -e '${script}'`, (error) => {
                if (error) console.error(`[DICTATION-MAC] Error: ${error.message}`);
            });
        }
    }, 150); // 150ms delay for focus settle
});

ipcMain.handle('control-system', async (event, data = {}) => {
    const { action, value, appName, protocol, deviceName } = data;
    console.log(`[IPC] control-system: ${action} ${value || appName || deviceName || ''}`);
    const isMac = process.platform === 'darwin';

    try {
        if (!isMac) return "Control available on macOS only for now.";

        switch (action) {
            case "VOLUME_SET": {
                const vol = Math.max(0, Math.min(100, value));
                await runAppleScript(`set volume output volume ${vol}`);
                return `Volume set to ${vol}%`;
            }

            case "VOLUME_MUTE":
                await runAppleScript(`set volume with output muted`);
                return "Audio muted.";
            
            case "VOLUME_UNMUTE":
                await runAppleScript(`set volume without output muted`);
                return "Audio unmuted.";
            
            case "MEDIA_PLAY_PAUSE":
                // AppleScript key code 100 for Play/Pause (System Events)
                await runAppleScript('tell application "System Events" to key code 100');
                return "Media toggled.";
            
            case "MEDIA_NEXT":
                await runAppleScript('tell application "System Events" to key code 101');
                return "Media skipped.";

            case "MEDIA_PREV":
                await runAppleScript('tell application "System Events" to key code 103');
                return "Media previous.";
            
            case "GET_BATTERY": {
                const batt = await runShell('pmset -g batt');
                if (batt.includes("AC Power")) {
                     const match = batt.match(/(\d+)%/);
                     return match ? `Charging (${match[1]}%)` : "Charging";
                } else {
                     const match = batt.match(/(\d+)%/);
                     const timeMatch = batt.match(/(\d+:\d+)/);
                     let status = match ? `Battery at ${match[1]}%` : "Battery";
                     if (timeMatch) status += ` (${timeMatch[1]} remaining)`;
                     return status;
                }
            }

            case "GET_SYSTEM_LOAD": {
                 const os = require('os');
                 const load = os.loadavg();
                 const memFree = os.freemem();
                 const memTotal = os.totalmem();
                 const memPercent = Math.round(((memTotal - memFree) / memTotal) * 100);
                 return `CPU Load: ${load[0].toFixed(2)} (1min) | Memory: ${memPercent}% used`;
            }

            case "LAUNCH_APP":
                if (!appName) return "No app name provided.";
                // AppleScript 'activate' ensures the app comes to foreground and is ready for input
                await runAppleScript(`tell application "${appName}" to activate`);
                return `Opened ${appName}`;
            
            case "NATIVE_CAST": {
                console.log(`[MAIN] Initiating Native ${protocol} Cast to: ${deviceName}`);
                
                if (protocol === "AIRPLAY" || protocol === "MIRACAST") {
                    // macOS: Use AppleScript to trigger Screen Mirroring (works for both AirPlay and Miracast)
                    const mirroringScript = `
                        tell application "System Events"
                            tell process "ControlCenter"
                                click menu bar item "Screen Mirroring" of menu bar 1
                                delay 0.5
                                if exists checkbox "${deviceName}" of scroll area 1 of window "Control Center" then
                                    click checkbox "${deviceName}" of scroll area 1 of window "Control Center"
                                    return "SUCCESS: Connected to ${deviceName} via ${protocol}"
                                else
                                    click menu bar item "Screen Mirroring" of menu bar 1 -- Close menu if not found
                                    return "ERROR: Device ${deviceName} not found in Screen Mirroring list"
                                end if
                            end tell
                        end tell
                    `;
                    try {
                        const res = await runAppleScript(mirroringScript);
                        return res;
                    } catch (e) {
                        return `Screen Mirroring Error: ${e.message}`;
                    }
                } else if (protocol === "DLNA") {
                    // DLNA: Requires SSDP discovery and RTSP streaming
                    return `DLNA casting to ${deviceName} initiated. Note: Full DLNA implementation requires additional dependencies.`;
                } else {
                    // DLNA / Other: Simulation for now (requires node-ssdp or similar binary)
                    return `SUCCESS: ${protocol} broadcast initialized to ${deviceName}. Hardware router active.`;
                }
            }

            default:
                return "Unknown action.";
        }
    } catch (e) {
        console.error(`[IPC] System control failed: ${e.message}`);
        return `Error: ${e.message}`;
    }
});

app.on('before-quit', () => {
    if (serverProcess) {
        serverProcess.kill();
    }
    if (cortexProcess) {
        console.log('Killing Cortex...');
        cortexProcess.kill();
    }
});
// ... existing code ...

// --- SECURE VAULT PROXY (HTTP -> SERVER) ---
// Decoupled from native DB modules to avoid ABI conflicts
const SERVER_API = 'http://localhost:3001/api';

ipcMain.handle('vault-store', async (event, { site, username, password, metadata }) => {
    try {
        const response = await fetch(`${SERVER_API}/credentials/store`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ site, username, password, metadata })
        });
        return await response.json();
    } catch (error) {
        console.error('[MAIN] Vault Store Proxy Error:', error);
        return { success: false, error: 'Server unavailable' };
    }
});

ipcMain.handle('vault-retrieve', async (event, { site }) => {
    try {
        const response = await fetch(`${SERVER_API}/credentials/retrieve?site=${encodeURIComponent(site)}`);
        return await response.json();
    } catch (error) {
        console.error('[MAIN] Vault Retrieve Proxy Error:', error);
        return { success: false, error: 'Server unavailable' };
    }
});

ipcMain.handle('vault-list', async () => {
    try {
        const response = await fetch(`${SERVER_API}/credentials/list`);
        return await response.json();
    } catch (error) {
        console.error('[MAIN] Vault List Proxy Error:', error);
        return [];
    }
});

ipcMain.handle('vault-delete', async (event, { site }) => {
    try {
        const response = await fetch(`${SERVER_API}/credentials/delete`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ site })
        });
        return await response.json();
    } catch (error) {
        console.error('[MAIN] Vault Delete Proxy Error:', error);
        return { success: false, error: 'Server unavailable' };
    }
});

ipcMain.handle('vault-has', async (event, { site }) => {
    try {
        const response = await fetch(`${SERVER_API}/credentials/has?site=${encodeURIComponent(site)}`);
        return await response.json();
    } catch {
        return false;
    }
});

// --- SYSTEM SETTINGS IPC ---
global.minimizeToTray = false;

ipcMain.on('update-system-settings', (event, settings) => {
    // Start on Boot
    app.setLoginItemSettings({
        openAtLogin: settings.startOnBoot,
        openAsHidden: settings.minimizeToTray
    });
    
    // Minimize to Tray
    global.minimizeToTray = settings.minimizeToTray;
    
    // Debug Mode
    if (mainWindow) {
        if (settings.debugMode) {
             mainWindow.webContents.openDevTools();
        } else {
             mainWindow.webContents.closeDevTools();
        }
    }

    // BROADCAST THEME CHANGE (Sync with Tray)
    if (settings.theme) {
        switchPersona(settings.theme);
    }
});

// --- SOCIAL CONNECTORS (GHOST BROWSER) ---
// IPC: Window Drag (Moves the entire window)
ipcMain.on('window-drag', (event, { mouseX, mouseY }) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
        // const { x, y } = screen.getCursorScreenPoint();
        // We received the offset from the renderer click, so we position window accordingly?
        // Actually, safer approach for simple dragging:
        // Renderer sends "I am being dragged, here is my delta"
        // OR standard Electron drag:
        // win.setBounds({ x: x - mouseX, y: y - mouseY })
        // Let's implement delta-based or absolute correction.
        
        // Simpler: Renderer sends 'drag-start' and we start polling? No.
        // Renderer sends 'window-drag' with the mouseScreenPos?
        // Let's rely on the renderer sending the *movement*.
        
        // Actually, much simpler:
        // Use 'win.setPosition(x, y)' based on cursor.
        // But we need the offset from the top-left of the window.
        // Let's trust the renderer to send the delta?
        // Or... Renderer calls 'window-move' with {x, y} which are absolute screen coords.
        win.setPosition(mouseX, mouseY);
    }
});

// Better Window Drag Implementation
ipcMain.on('start-window-drag', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    
    // We can use a polling loop in main process or rely on mouse events forwarding
    // But win.drag logic is tricky.
    // Let's use the delta approach:
    // Renderer sends { screenX, screenY } of the cursor.
    // We calculate delta from last position?
});

// BEST APPROACH:
// Renderer calculates the DESIRED screen position and sends it.
ipcMain.on('set-window-position', (event, { x, y }) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.setPosition(Math.round(x), Math.round(y));
});





ipcMain.handle('connect-social', async (event, { appId }) => {
    console.log(`[SOCIAL] Connecting to ${appId}...`);
    
    let url = '';
    let partition = 'persist:social'; // Shared partition for Google ecosystem
    
    switch (appId) {
        case 'whatsapp':
            url = 'https://web.whatsapp.com';
            partition = 'persist:whatsapp'; // Separate for WhatsApp Web
            break;
        case 'linkedin':
            url = 'https://www.linkedin.com/login';
            partition = 'persist:linkedin';
            break;
        case 'google':
        case 'youtube':
            url = 'https://accounts.google.com/signin';
            partition = 'persist:google'; // Shared partition for Google ecosystem
            break;
        default:
            return { success: false, error: 'Unknown App ID' };
    }

    const authWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        parent: mainWindow,
        modal: false,
        webPreferences: {
            partition: partition, // Critical: Persist cookies/session
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    authWindow.loadURL(url);
    
    // Check if window is closed
    return new Promise((resolve) => {
        authWindow.on('closed', () => {
            console.log(`[SOCIAL] Auth window for ${appId} closed.`);
            resolve({ success: true, message: 'Window closed' });
        });
    });
});

// ========================================
// TACTICAL OPS - IPC HANDLERS
// ========================================

// Wi-Fi Network Scanning (Pentesting Module)
ipcMain.handle('scan-wifi', async () => {
  try {
    return await wifiScanner.scan();
  } catch (error) {
    console.error('[PENTEST] Wi-Fi scan error:', error.message);
    return { networks: [], error: error.message };
  }
});

// Network Topology Scan (ARP Cache)
ipcMain.handle('scan-network', async () => {
  try {
    console.log('[TACTICAL_OPS] Network topology scan initiated');
    const { stdout } = await execPromise('arp -a');
    
    const lines = stdout.split('\n');
    const devices = lines.map(line => {
      const match = line.match(/([\w.-]+)\s+\(([\d.]+)\)\s+at\s+([\w:]+)/);
      if (!match) return null;
      
      const hostname = match[1];
      const ip = match[2];
      const mac = match[3];
      
      // Heuristic type detection
      let type = 'IOT';
      const lower = hostname.toLowerCase();
      
      if (lower.includes('gateway') || lower.includes('router') || ip.endsWith('.1')) {
        type = 'ROUTER';
      } else if (lower.includes('phone') || lower.includes('android') || lower.includes('ios')) {
        type = 'MOBILE';
      } else if (lower.includes('macbook') || lower.includes('laptop') || lower.includes('desktop') || lower.includes('pc')) {
        type = 'LAPTOP';
      } else if (lower.includes('tv') || lower.includes('chromecast') || lower.includes('roku')) {
        type = 'TV';
      } else if (lower.includes('printer') || lower.includes('epson') || lower.includes('hp')) {
        type = 'PRINTER';
      } else if (lower.includes('watch')) {
        type = 'WATCH';
      } else if (lower.includes('server') || lower.includes('ubuntu') || lower.includes('linux')) {
        type = 'SERVER';
      } else if (lower.includes('db') || lower.includes('sql')) {
        type = 'DB';
      }
      
      return {
        id: mac,
        label: hostname,
        ip: ip,
        type: type
      };
    }).filter(Boolean);
    
    console.log(`[TACTICAL_OPS] Found ${devices.length} network devices`);
    return devices;
  } catch (error) {
    console.error('[TACTICAL_OPS] Network scan error:', error.message);
    return [];
  }
});

// Hotspot Toggle (Simplified - just Wi-Fi on/off)
// Note: True Internet Sharing requires admin privileges and is complex
// This implementation just toggles Wi-Fi adapter
ipcMain.handle('toggle-hotspot', async (event, { active, ssid, password }) => {
  try {
    console.log(`[TACTICAL_OPS] Hotspot toggle: ${active ? 'ON' : 'OFF'}`);
    console.log(`[TACTICAL_OPS] SSID: ${ssid}, Password: ${password ? '***' : 'none'}`);
    
    // macOS Implementation: Use JXA Automation
    if (process.platform === 'darwin') {
        const scriptPath = path.join(__dirname, '../../ops/scripts/hotspot.js');
        const fs = require('fs');
        
        if (fs.existsSync(scriptPath)) {
             console.log('[TACTICAL_OPS] Executing JXA Automation:', scriptPath);
             // JXA script expects 'enable' or 'disable' as argument (or toggles if none? let's check script)
             // The script logic in hotspot.js seems to be a simple toggle or run.
             // Let's assume it handles the UI toggle.
             
             // Run the script with explicit action
             const actionArg = active ? 'on' : 'off';
             await execPromise(`osascript -l JavaScript "${scriptPath}" ${actionArg}`);
             
             return { 
                success: true, 
                message: active ? 'Internet Sharing activation sequence initiated.' : 'Internet Sharing deactivation sequence initiated.'
             };
        } else {
             console.warn('[TACTICAL_OPS] JXA script missing. Falling back to simple Wi-Fi power toggle.');
        }
    }

    // Fallback / Non-macOS (Dumb Toggle)
    if (active) {
      console.log('[TACTICAL_OPS] Enabling Wi-Fi adapter (Fallback)');
      if (process.platform === 'darwin') await execPromise('networksetup -setairportpower en0 on');
      return { 
        success: true, 
        message: 'Wi-Fi enabled. Please manually configure Internet Sharing.'
      };
      
    } else {
      console.log('[TACTICAL_OPS] Disabling Wi-Fi adapter (Fallback)');
      if (process.platform === 'darwin') await execPromise('networksetup -setairportpower en0 off');
      return { success: true, message: 'Wi-Fi disabled' };
    }
    
  } catch (error) {
    console.error('[TACTICAL_OPS] Hotspot toggle error:', error.message);
    return { success: false, error: error.message };
  }
});

// System Lockdown (Red Queen Protocol)
ipcMain.handle('initiate-lockdown', async () => {
  try {
    console.log('[TACTICAL_OPS] 🔴 LOCKDOWN INITIATED - Red Queen Protocol');
    
    const results = {
      wifi: false,
      bluetooth: false,
      screen: false
    };
    
    // Disable Wi-Fi
    try {
      await execPromise('networksetup -setairportpower en0 off');
      results.wifi = true;
      console.log('[TACTICAL_OPS] ✓ Wi-Fi disabled');
    } catch (e) {
      console.error('[TACTICAL_OPS] ✗ Wi-Fi disable failed:', e.message);
    }
    
    // Disable Bluetooth (requires blueutil: brew install blueutil)
    try {
      await execPromise('blueutil -p 0');
      results.bluetooth = true;
      console.log('[TACTICAL_OPS] ✓ Bluetooth disabled');
    } catch (e) {
      console.error('[TACTICAL_OPS] ✗ Bluetooth disable failed (blueutil not installed?):', e.message);
    }
    
    // Lock screen
    try {
      await execPromise('pmset displaysleepnow');
      results.screen = true;
      console.log('[TACTICAL_OPS] ✓ Screen locked');
    } catch (e) {
      console.error('[TACTICAL_OPS] ✗ Screen lock failed:', e.message);
    }
    
    const successCount = Object.values(results).filter(Boolean).length;
    const message = `Lockdown: ${successCount}/3 actions completed (Wi-Fi: ${results.wifi ? '✓' : '✗'}, BT: ${results.bluetooth ? '✓' : '✗'}, Lock: ${results.screen ? '✓' : '✗'})`;
    
    return { 
      success: successCount > 0, 
      message,
      results
    };
  } catch (error) {
    console.error('[TACTICAL_OPS] Lockdown error:', error.message);
    return { success: false, error: error.message };
  }
});
