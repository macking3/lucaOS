import { exec } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';
import iotManager from '../../../src/services/iot/IoTManager.js';

/**
 * SYSTEM CONTROL SERVICE
 * Centralizes cross-platform execution logic for macOS, Windows, and Mobile.
 * This service allows for direct function calls instead of internal HTTP requests.
 */
class SystemControlService {
    constructor() {
        this.neuralLinkManager = null;
        this.status = 'initializing';
        this.currentWorkingDirectory = process.cwd();
        this.dependencies = {
            darwin: [
                { id: 'python3', cmd: 'python3 --version', fix: 'Install Python 3' },
                { id: 'quartz', cmd: 'python3 -c "import Quartz.CoreGraphics"', fix: 'pip3 install pyobjc' },
                { id: 'osascript', cmd: 'osascript -e "return"', fix: 'System utility missing' },
                { id: 'cliclick', cmd: 'cliclick --version', fix: 'brew install cliclick (optional for legacy support)' }
            ],
            win32: [
                { id: 'powershell', cmd: 'powershell -Command "return"', fix: 'System utility missing' },
                { id: 'nircmd', cmd: 'nircmd.exe /?', fix: 'Ensure nircmd.exe is in PATH or luca folder' }
            ],
            mobile: [
                { id: 'adb', cmd: 'adb version', fix: 'Install Android SDK Platform Tools' }
            ]
        };
        this.readiness = { status: 'unknown', missing: [] };
        this._initService();
    }

    async _initService() {
        this.status = 'checking_dependencies';
        await this.verifySystemReadiness();
        await this._initNeuralLink();
    }

    async verifySystemReadiness() {
        const platform = os.platform();
        const deps = [...(this.dependencies[platform] || []), ...(this.dependencies.mobile || [])];
        const results = await Promise.all(deps.map(d => this._checkDep(d)));
        
        this.readiness.missing = results.filter(r => !r.present);
        this.readiness.status = this.readiness.missing.length === 0 ? 'ready' : 'degraded';
        
        if (this.readiness.status === 'degraded') {
            console.warn('[SYSTEM_CONTROL_SERVICE] Dependencies missing:', this.readiness.missing.map(m => m.id).join(', '));
        } else {
            console.log('[SYSTEM_CONTROL_SERVICE] All system dependencies verified');
        }
        return this.readiness;
    }

    _checkDep(dep) {
        return new Promise((resolve) => {
            exec(dep.cmd, (err) => {
                resolve({ id: dep.id, present: !err, fix: dep.fix });
            });
        });
    }

    async _initNeuralLink() {
        try {
            const module = await import('../../../src/services/neuralLinkManager.server.js');
            this.neuralLinkManager = module.neuralLinkManager;
            console.log('[SYSTEM_CONTROL_SERVICE] Neural Link Manager integrated');
            this.status = 'ready';
        } catch {
            console.warn('[SYSTEM_CONTROL_SERVICE] Neural Link Manager not available, ADB-only mode');
            this.status = 'degraded';
        }
    }

    /**
     * MACOS ACTION DISPATCHER
     */
    async executeMacOSAction(params) {
        const { action, type, value, level, appName, title, message, path: filePath, x, y, x2, y2, key, payload } = params;
        const actionType = action || type;
        
        // Pre-flight check for automation actions
        if (['MOVE', 'DRAG', 'CLICK', 'DOUBLE_CLICK', 'RIGHT_CLICK'].includes(actionType)) {
            const quartz = this.readiness.missing.find(m => m.id === 'quartz');
            if (quartz) {
                return { success: false, result: `Action "${actionType}" requires Quartz. Fix: ${quartz.fix}`, missing: 'quartz' };
            }
        }

        // Logic extracted from macos-control.routes.js
        return new Promise((resolve) => {
            // Audio & Media
            if (action === 'VOLUME_MUTE') {
                exec(`osascript -e "set volume with output muted"`, (err) => resolve({ success: !err, result: err ? err.message : 'Audio muted' }));
                return;
            }
            if (action === 'VOLUME_UNMUTE') {
                exec(`osascript -e "set volume without output muted"`, (err) => resolve({ success: !err, result: err ? err.message : 'Audio unmuted' }));
                return;
            }
            if (action === 'MEDIA_PLAY_PAUSE') {
                exec(`osascript -e 'tell application "System Events" to keystroke space using {command down}'`, (err) => resolve({ success: !err, result: err ? err.message : 'Play/Pause toggled' }));
                return;
            }
            if (action === 'MEDIA_NEXT') {
                exec(`osascript -e 'tell application "System Events" to keystroke "right" using {command down, shift down}'`, (err) => resolve({ success: !err, result: err ? err.message : 'Next track' }));
                return;
            }
            if (action === 'MEDIA_PREV') {
                exec(`osascript -e 'tell application "System Events" to keystroke "left" using {command down, shift down}'`, (err) => resolve({ success: !err, result: err ? err.message : 'Previous track' }));
                return;
            }
            if (action === 'MEDIA_STOP') {
                exec(`osascript -e 'tell application "Music" to stop'`, (err) => resolve({ success: !err, result: err ? err.message : 'Media stopped' }));
                return;
            }

            // System Info
            if (action === 'GET_DISK_SPACE') {
                exec('df -h / | tail -1', (err, stdout) => {
                    if (err) return resolve({ success: false, result: err.message });
                    const parts = stdout.trim().split(/\s+/);
                    resolve({ 
                        success: true, 
                        result: `Disk: ${parts[2]} used of ${parts[1]} (${parts[4]} full)`,
                        data: { total: parts[1], used: parts[2], available: parts[3], percentage: parts[4] }
                    });
                });
                return;
            }
            if (action === 'GET_NETWORK_INFO') {
                exec('ifconfig | grep "inet " | grep -v 127.0.0.1', (err, stdout) => {
                    if (err) return resolve({ success: false, result: err.message });
                    resolve({ success: true, result: `Network interfaces:\n${stdout.trim()}` });
                });
                return;
            }
            if (action === 'GET_SYSTEM_LOAD') {
                exec('top -l 1 | grep "CPU usage"', (err, stdout) => {
                    if (err) return resolve({ success: false, result: err.message });
                    resolve({ success: true, result: `CPU: ${stdout.trim()}` });
                });
                return;
            }

            // Display & Screen
            if (action === 'SET_BRIGHTNESS') {
                const brightness = (value || level) / 100;
                exec(`osascript -e 'tell application "System Events" to tell appearance preferences to set dark mode to ${brightness}'`, (err) =>
                    resolve({ success: !err, result: err ? err.message : `Brightness set to ${value || level}%` }));
                return;
            }
            if (action === 'TOGGLE_DARK_MODE') {
                exec(`osascript -e 'tell application "System Events" to tell appearance preferences to set dark mode to not dark mode'`, (err) =>
                    resolve({ success: !err, result: err ? err.message : 'Dark mode toggled' }));
                return;
            }
            if (action === 'LOCK_SCREEN') {
                exec('/System/Library/CoreServices/Menu\\ Extras/User.menu/Contents/Resources/CGSession -suspend', (err) =>
                    resolve({ success: !err, result: err ? err.message : 'Screen locked' }));
                return;
            }
            if (action === 'SLEEP_DISPLAY') {
                exec('pmset displaysleepnow', (err) =>
                    resolve({ success: !err, result: err ? err.message : 'Display sleeping' }));
                return;
            }
            if (action === 'TAKE_SCREENSHOT') {
                const timestamp = Date.now();
                const screenshotPath = path.join(os.homedir(), 'Desktop', `screenshot_${timestamp}.png`);
                exec(`screencapture -x "${screenshotPath}"`, (err) =>
                    resolve({ success: !err, result: err ? err.message : `Screenshot saved to ${screenshotPath}`, path: screenshotPath }));
                return;
            }

            // App Management
            if (action === 'LAUNCH_APP') {
                if (!appName) return resolve({ success: false, result: 'appName required' });
                exec(`osascript -e 'tell application "${appName}" to activate'`, (err) =>
                    resolve({ success: !err, result: err ? err.message : `${appName} launched` }));
                return;
            }
            if (action === 'QUIT_APP') {
                if (!appName) return resolve({ success: false, result: 'appName required' });
                exec(`osascript -e 'tell application "${appName}" to quit'`, (err) =>
                    resolve({ success: !err, result: err ? err.message : `${appName} quit` }));
                return;
            }
            if (action === 'FORCE_QUIT_APP') {
                if (!appName) return resolve({ success: false, result: 'appName required' });
                exec(`pkill -9 "${appName}"`, (err) =>
                    resolve({ success: !err, result: err ? err.message : `${appName} force quit` }));
                return;
            }
            if (action === 'GET_RUNNING_APPS') {
                exec(`osascript -e 'tell application "System Events" to get name of every process whose background only is false'`, (err, stdout) => {
                    if (err) return resolve({ success: false, result: err.message });
                    const apps = stdout.trim().split(', ');
                    resolve({ success: true, result: `Running apps: ${apps.join(', ')}`, data: { apps } });
                });
                return;
            }

            // App Management (Continued)
            if (action === 'GET_FRONTMOST_APP') {
                exec(`osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true'`, (err, stdout) => {
                    if (err) return resolve({ success: !err, result: err ? err.message : 'Frontmost app: ' + stdout.trim(), data: { app: stdout.trim() } });
                    resolve({ success: true, result: `Frontmost app: ${stdout.trim()}`, data: { app: stdout.trim() } });
                });
                return;
            }

            // Window Control
            if (action === 'MINIMIZE_WINDOW') {
                exec(`osascript -e 'tell application "System Events" to tell (first process whose frontmost is true) to set value of attribute "AXMinimized" of window 1 to true'`, (err) =>
                    resolve({ success: !err, result: err ? err.message : 'Window minimized' }));
                return;
            }
            if (action === 'CLOSE_WINDOW') {
                exec(`osascript -e 'tell application "System Events" to keystroke "w" using command down'`, (err) =>
                    resolve({ success: !err, result: err ? err.message : 'Window closed' }));
                return;
            }

            // Notifications
            if (action === 'SEND_NOTIFICATION') {
                const notifTitle = title || 'Luca';
                const notifMessage = message || 'Notification from Luca';
                exec(`osascript -e 'display notification "${notifMessage}" with title "${notifTitle}"'`, (err) =>
                    resolve({ success: !err, result: err ? err.message : 'Notification sent' }));
                return;
            }
            if (action === 'TOGGLE_DND') {
                exec(`osascript -e 'tell application "System Events" to keystroke "d" using {command down, shift down, option down, control down}'`, (err) =>
                    resolve({ success: !err, result: err ? err.message : 'Do Not Disturb toggled' }));
                return;
            }

            // Clipboard
            if (action === 'GET_CLIPBOARD') {
                exec('pbpaste', (err, stdout) => {
                    if (err) return resolve({ success: false, result: err.message });
                    resolve({ success: true, result: stdout, data: { clipboard: stdout } });
                });
                return;
            }
            if (action === 'SET_CLIPBOARD') {
                if (!message) return resolve({ success: false, result: 'message required for clipboard content' });
                exec(`echo "${message}" | pbcopy`, (err) =>
                    resolve({ success: !err, result: err ? err.message : 'Clipboard updated' }));
                return;
            }

            // Finder & Files
            if (action === 'OPEN_FINDER') {
                exec(`osascript -e 'tell application "Finder" to activate'`, (err) =>
                    resolve({ success: !err, result: err ? err.message : 'Finder opened' }));
                return;
            }
            if (action === 'REVEAL_IN_FINDER') {
                if (!filePath) return resolve({ success: false, result: 'path required' });
                exec(`osascript -e 'tell application "Finder" to reveal POSIX file "${filePath}"'`, (err) =>
                    resolve({ success: !err, result: err ? err.message : `Revealed ${filePath} in Finder` }));
                return;
            }
            if (action === 'EMPTY_TRASH') {
                exec(`osascript -e 'tell application "Finder" to empty trash'`, (err) =>
                    resolve({ success: !err, result: err ? err.message : 'Trash emptied' }));
                return;
            }
            if (action === 'NEW_FINDER_WINDOW') {
                exec(`osascript -e 'tell application "Finder" to make new Finder window'`, (err) =>
                    resolve({ success: !err, result: err ? err.message : 'New Finder window opened' }));
                return;
            }

            // System Preferences
            if (action === 'OPEN_SYSTEM_PREFERENCES') {
                exec(`osascript -e 'tell application "System Preferences" to activate'`, (err) =>
                    resolve({ success: !err, result: err ? err.message : 'System Preferences opened' }));
                return;
            }
            if (action === 'TOGGLE_WIFI') {
                exec('networksetup -setairportpower en0 off && sleep 1 && networksetup -setairportpower en0 on', (err) =>
                    resolve({ success: !err, result: err ? err.message : 'WiFi toggled' }));
                return;
            }
            if (action === 'TOGGLE_BLUETOOTH') {
                exec('blueutil -p toggle', (err) =>
                    resolve({ success: !err, result: err ? err.message : 'Bluetooth toggled (requires blueutil)' }));
                return;
            }
            if (action === 'EJECT_ALL') {
                exec(`osascript -e 'tell application "Finder" to eject (every disk whose ejectable is true)'`, (err) =>
                    resolve({ success: !err, result: err ? err.message : 'All ejectable disks ejected' }));
                return;
            }

            // Power
            if (action === 'RESTART') {
                exec(`osascript -e 'tell application "System Events" to restart'`, (err) =>
                    resolve({ success: !err, result: err ? err.message : 'System restarting...' }));
                return;
            }
            if (action === 'SHUTDOWN') {
                exec(`osascript -e 'tell application "System Events" to shut down'`, (err) =>
                    resolve({ success: !err, result: err ? err.message : 'System shutting down...' }));
                return;
            }
            if (action === 'SLEEP') {
                exec(`osascript -e 'tell application "System Events" to sleep'`, (err) =>
                    resolve({ success: !err, result: err ? err.message : 'System sleeping...' }));
                return;
            }
            if (action === 'LOG_OUT') {
                exec(`osascript -e 'tell application "System Events" to log out'`, (err) =>
                    resolve({ success: !err, result: err ? err.message : 'Logging out...' }));
                return;
            }

            // AUTOMATION / INPUTS
            if (actionType === 'MOVE' || actionType === 'DRAG') {
                const pyScript = actionType === 'MOVE' 
                    ? `
import Quartz.CoreGraphics as CG
e = CG.CGEventCreateMouseEvent(None, CG.kCGEventMouseMoved, (${x}, ${y}), 0)
CG.CGEventPost(CG.kCGHIDEventTap, e)
`
                    : `
import Quartz.CoreGraphics as CG
import time
def post_event(type, pos, button=0):
    e = CG.CGEventCreateMouseEvent(None, type, pos, button)
    CG.CGEventPost(CG.kCGHIDEventTap, e)

post_event(CG.kCGEventMouseMoved, (${x}, ${y}))
post_event(CG.kCGEventLeftMouseDown, (${x}, ${y}))
time.sleep(0.1)
post_event(CG.kCGEventLeftMouseDragged, (${x2}, ${y2}))
time.sleep(0.1)
post_event(CG.kCGEventLeftMouseUp, (${x2}, ${y2}))
`;
                const tempPy = path.join(os.tmpdir(), `mouse_${actionType.toLowerCase()}_${Date.now()}.py`);
                fs.writeFileSync(tempPy, pyScript);
                exec(`python3 "${tempPy}"`, (err) => {
                    fs.unlinkSync(tempPy);
                    if (err) console.error(`Mouse ${actionType} Failed (Quartz/PyObjC missing?)`);
                    resolve({ success: !err, result: err ? err.message : `Mouse ${actionType.toLowerCase()} complete` });
                });
                return;
            }
            if (actionType === 'CLICK' || actionType === 'DOUBLE_CLICK' || actionType === 'RIGHT_CLICK') {
                let script = '';
                if (actionType === 'CLICK') {
                    script = (x !== undefined && y !== undefined) 
                        ? `tell application "System Events" to click at {${x}, ${y}}`
                        : `tell application "System Events" to click`;
                } else if (actionType === 'DOUBLE_CLICK') {
                    script = (x !== undefined && y !== undefined)
                        ? `tell application "System Events" to click at {${x}, ${y}}\\ndelay 0.1\\ntell application "System Events" to click at {${x}, ${y}}`
                        : `tell application "System Events" to click\\ndelay 0.1\\ntell application "System Events" to click`;
                } else { // RIGHT_CLICK
                    script = (x !== undefined && y !== undefined)
                        ? `tell application "System Events" to click at {${x}, ${y}} using control down`
                        : `tell application "System Events" to click using control down`;
                }
                exec(`osascript -e '${script}'`, (err) => resolve({ success: !err, result: err ? err.message : 'Click sent' }));
                return;
            }
            if (actionType === 'TYPE' || actionType === 'text') {
                const textToType = key || payload || message || value;
                const keyMap = { 'Enter': 36, 'Return': 36, 'Backspace': 51, 'Delete': 51, 'Tab': 48, 'Space': 49, ' ': 49, 'Escape': 53, 'Esc': 53, 'Up': 126, 'Down': 125, 'Left': 123, 'Right': 124 };
                let script = '';
                if (textToType.toLowerCase().includes('cmd+') || textToType.toLowerCase().includes('command+')) {
                    script = `tell application "System Events" to keystroke "${textToType.split('+')[1]}" using command down`;
                } else if (textToType.toLowerCase().includes('ctrl+') || textToType.toLowerCase().includes('control+')) {
                    script = `tell application "System Events" to keystroke "${textToType.split('+')[1]}" using control down`;
                } else if (keyMap[textToType]) {
                    script = `tell application "System Events" to key code ${keyMap[textToType]}`;
                } else {
                    script = `tell application "System Events" to keystroke "${textToType.replace(/"/g, '\\"')}"`;
                }
                exec(`osascript -e '${script}'`, (err) => resolve({ success: !err, result: err ? err.message : 'Text typed' }));
                return;
            }

            // Default
            resolve({ success: false, result: `Action "${actionType}" not implemented or unrecognized in MacOS service` });
        });
    }

    /**
     * WINDOWS ACTION DISPATCHER
     */
    async executeWindowsAction(params) {
        const { action, type, value, level, appName, title, message, path: filePath, x, y, x2, y2, key, payload } = params;
        const actionType = action || type;
        const platform = os.platform();
        
        if (platform !== 'win32') {
            return { success: false, result: 'Action requires Windows platform' };
        }

        // Pre-flight check for automation actions
        if (['MOVE', 'CLICK', 'RIGHT_CLICK', 'DOUBLE_CLICK', 'DRAG'].includes(actionType)) {
            const nircmd = this.readiness.missing.find(m => m.id === 'nircmd');
            if (nircmd) {
                return { success: false, result: `Action "${actionType}" requires NirCmd. Fix: ${nircmd.fix}`, missing: 'nircmd' };
            }
        }

        return new Promise((resolve) => {
            // AUDIO & MEDIA
            if (action === 'VOLUME_MUTE') {
                exec('nircmd.exe mutesysvolume 1', (err) => 
                    resolve({ success: !err, result: err ? err.message : 'Audio muted' }));
            }
            else if (action === 'VOLUME_UNMUTE') {
                exec('nircmd.exe mutesysvolume 0', (err) => 
                    resolve({ success: !err, result: err ? err.message : 'Audio unmuted' }));
            }
            else if (action === 'MEDIA_PLAY_PAUSE') {
                exec('nircmd.exe sendkeypress 0xB3', (err) => 
                    resolve({ success: !err, result: err ? err.message : 'Play/Pause toggled' }));
            }
            else if (action === 'MEDIA_NEXT') {
                exec('nircmd.exe sendkeypress 0xB0', (err) => 
                    resolve({ success: !err, result: err ? err.message : 'Next track' }));
            }
            else if (action === 'MEDIA_PREV') {
                exec('nircmd.exe sendkeypress 0xB1', (err) => 
                    resolve({ success: !err, result: err ? err.message : 'Previous track' }));
            }
            // SYSTEM INFO
            else if (action === 'GET_BATTERY') {
                exec('WMIC Path Win32_Battery Get EstimatedChargeRemaining,BatteryStatus', (err, stdout) => {
                    if (err) return resolve({ success: false, result: 'Unable to read battery' });
                    const lines = stdout.trim().split('\n');
                    if (lines.length > 1) {
                        const data = lines[1].trim().split(/\s+/);
                        const status = data[0] === '2' ? 'Charging' : 'Discharging';
                        resolve({ success: true, result: `Battery: ${data[1]}% (${status})` });
                    } else {
                        resolve({ success: false, result: 'Could not parse battery info' });
                    }
                });
            }
            // DISPLAY & SCREEN
            else if (action === 'SET_BRIGHTNESS') {
                const brightness = value || level;
                exec(`powershell (Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods).WmiSetBrightness(1,${brightness})`, (err) =>
                    resolve({ success: !err, result: err ? err.message : `Brightness set to ${brightness}%` }));
            }
            else if (action === 'TAKE_SCREENSHOT') {
                const timestamp = Date.now();
                const screenshotPath = path.join(os.homedir(), 'Desktop', `screenshot_${timestamp}.png`);
                exec(`nircmd.exe savescreenshot "${screenshotPath}"`, (err) =>
                    resolve({ success: !err, result: err ? err.message : `Screenshot saved to ${screenshotPath}`, path: screenshotPath }));
            }
            // APP MANAGEMENT
            else if (action === 'LAUNCH_APP') {
                if (!appName) return resolve({ success: false, result: 'appName required' });
                exec(`start "" "${appName}"`, (err) =>
                    resolve({ success: !err, result: err ? err.message : `${appName} launched` }));
            }
            else if (action === 'QUIT_APP') {
                if (!appName) return resolve({ success: false, result: 'appName required' });
                exec(`taskkill /IM "${appName}.exe" /F`, (err) =>
                    resolve({ success: !err, result: err ? err.message : `${appName} quit` }));
            }
            // NOTIFICATIONS
            else if (action === 'SEND_NOTIFICATION') {
                const notifTitle = title || 'Luca';
                const notifMessage = message || 'Notification from Luca';
                const psScript = `
                    [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
                    [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null
                    $template = @"
                    <toast><visual><binding template="ToastText02"><text id="1">${notifTitle}</text><text id="2">${notifMessage}</text></binding></visual></toast>
"@
                    $xml = New-Object Windows.Data.Xml.Dom.XmlDocument
                    $xml.LoadXml($template)
                    $toast = New-Object Windows.UI.Notifications.ToastNotification $xml
                    [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("Luca").Show($toast)
                `;
                exec(`powershell -Command "${psScript.replace(/\n/g, ' ')}"`, (err) =>
                    resolve({ success: !err, result: err ? err.message : 'Notification sent' }));
            }
            // POWER
            else if (action === 'RESTART') {
                exec('shutdown /r /t 0', (err) => resolve({ success: !err, result: 'Restarting...' }));
            }
            else if (action === 'SHUTDOWN') {
                exec('shutdown /s /t 0', (err) => resolve({ success: !err, result: 'Shutting down...' }));
            }
            // WINDOW CONTROL
            else if (action === 'MINIMIZE_WINDOW') {
                exec('nircmd.exe win min foreground', (err) => resolve({ success: !err, result: 'Window minimized' }));
            }
            else if (action === 'MAXIMIZE_WINDOW') {
                exec('nircmd.exe win max foreground', (err) => resolve({ success: !err, result: 'Window maximized' }));
            }
            else if (action === 'CLOSE_WINDOW') {
                exec('nircmd.exe win close foreground', (err) => resolve({ success: !err, result: 'Window closed' }));
            }
            // CLIPBOARD
            else if (action === 'GET_CLIPBOARD') {
                exec('powershell Get-Clipboard', (err, stdout) => resolve({ success: !err, result: stdout }));
            }
            else if (action === 'SET_CLIPBOARD') {
                exec(`powershell Set-Clipboard -Value "${message.replace(/"/g, '\\"')}"`, (err) => resolve({ success: !err, result: 'Clipboard updated' }));
            }
            // EXPLORER & FILES
            else if (action === 'OPEN_FINDER') {
                exec('explorer.exe', (err) => resolve({ success: !err, result: 'Explorer opened' }));
            }
            else if (action === 'REVEAL_IN_FINDER') {
                if (!filePath) return resolve({ success: false, result: 'path required' });
                exec(`explorer.exe /select,"${filePath}"`, (err) => resolve({ success: !err, result: `Revealed ${filePath} in Explorer` }));
            }
            // AUTOMATION / INPUTS
            else if (['MOVE', 'CLICK', 'RIGHT_CLICK', 'DOUBLE_CLICK', 'DRAG'].includes(actionType)) {
                let psScript = `Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing;`;
                if (actionType === 'MOVE') {
                    psScript += `[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y})`;
                } else if (actionType === 'CLICK' || actionType === 'RIGHT_CLICK' || actionType === 'DOUBLE_CLICK') {
                    if (x !== undefined && y !== undefined) psScript += `[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y});`;
                    const mCode = actionType === 'RIGHT_CLICK' ? '0x08, 0x10' : '0x02, 0x04';
                    psScript += `
                        $code = @"
                        [DllImport("user32.dll")] public static extern void mouse_event(int dwFlags, int dx, int dy, int cButtons, int dwExtraInfo);
"@
                        $mouse = Add-Type -MemberDefinition $code -Name "Mouse" -Namespace "Win32" -PassThru
                        ${actionType === 'DOUBLE_CLICK' ? `$mouse::mouse_event(0x02,0,0,0,0); $mouse::mouse_event(0x04,0,0,0,0); Start-Sleep -Milliseconds 100; $mouse::mouse_event(0x02,0,0,0,0); $mouse::mouse_event(0x04,0,0,0,0);` : `$mouse::mouse_event(${mCode.split(',')[0]},0,0,0,0); $mouse::mouse_event(${mCode.split(',')[1]},0,0,0,0);`}
                    `;
                } else if (actionType === 'DRAG') {
                    psScript += `
                        $code = @"
                        [DllImport("user32.dll")] public static extern void mouse_event(int dwFlags, int dx, int dy, int cButtons, int dwExtraInfo);
"@
                        $mouse = Add-Type -MemberDefinition $code -Name "Mouse" -Namespace "Win32" -PassThru
                        [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y});
                        $mouse::mouse_event(0x02, 0, 0, 0, 0); Start-Sleep -Milliseconds 200;
                        [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x2}, ${y2}); Start-Sleep -Milliseconds 200;
                        $mouse::mouse_event(0x04, 0, 0, 0, 0);
                    `;
                }
                const tempPath = path.join(os.tmpdir(), `input_${Date.now()}.ps1`);
                fs.writeFileSync(tempPath, psScript);
                exec(`powershell -ExecutionPolicy Bypass -File "${tempPath}"`, (err) => {
                    fs.unlinkSync(tempPath);
                    resolve({ success: !err, result: err ? err.message : 'Action sent' });
                });
            }
            else if (actionType === 'TYPE' || actionType === 'text') {
                const textToType = key || payload || message || value;
                const map = { 'Enter': '{ENTER}', 'Backspace': '{BACKSPACE}', 'Tab': '{TAB}', 'Space': ' ', 'Escape': '{ESC}', 'Esc': '{ESC}', 'Up': '{UP}', 'Down': '{DOWN}', 'Left': '{LEFT}', 'Right': '{RIGHT}' };
                let keys = map[textToType] || textToType;
                if (textToType.toLowerCase().includes('ctrl+')) keys = '^' + textToType.split('+')[1];
                const safeKeys = keys.replace(/'/g, "''");
                exec(`powershell -c "$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys('${safeKeys}')"`, (err) =>
                    resolve({ success: !err, result: err ? err.message : 'Text typed' }));
            }
            else {
                resolve({ success: false, result: `Action "${actionType}" not implemented for Windows service` });
            }
        });
    }

    /**
     * GENERIC COMMAND DISPATCHER
     */
    async executeCommand(params) {
        let { tool, action, args } = params;
        const cmdType = tool || action;
        if (!args || Object.keys(args).length === 0) args = params;

        return new Promise((resolve) => {
            (async () => {
                if (cmdType === 'executeTerminalCommand') {
                    exec(args.command, { cwd: this.currentWorkingDirectory }, (error, stdout, stderr) => {
                        resolve({ success: !error, result: stdout || stderr || (error ? error.message : "Executed") });
                    });
                }
                else if (cmdType === 'runDiagnostics') {
                    const stats = {
                        Hostname: os.hostname(),
                        Platform: os.platform(),
                        CPU: os.cpus()[0].model,
                        Memory_Total: `${(os.totalmem() / 1e9).toFixed(2)} GB`,
                        Uptime: `${(os.uptime() / 3600).toFixed(1)} Hours`
                    };
                    resolve({ success: true, result: JSON.stringify(stats, null, 2) });
                }
                else if (cmdType === 'controlSmartTV') {
                    try {
                        const result = await iotManager.controlDevice(args.deviceId || args.id || args.device?.id, args.action, args);
                        resolve({ success: !!result, result: result ? "Command Sent" : "Device not found" });
                    } catch (err) {
                        resolve({ success: false, result: err.message });
                    }
                }
                else {
                    resolve({ success: false, result: `Tool "${cmdType}" not implemented` });
                }
            })();
        });
    }

    /**
     * MOBILE ACTION DISPATCHER (Android & iOS)
     */
    async executeMobileAction(params) {
        const { action, value, level, appName, title, message, deviceId, platform } = params;
        const isAndroid = platform === 'android' || !platform;
        
        // 1. Try Neural Link (AI Wireless)
        let neuralDevice = null;
        if (this.neuralLinkManager && this.neuralLinkManager.devices) {
            for (const [id, device] of this.neuralLinkManager.devices) {
                if (id === deviceId || device.metadata?.deviceId === deviceId) {
                    neuralDevice = device;
                    break;
                }
            }
        }

        if (neuralDevice) {
            try {
                const response = await this.neuralLinkManager.delegateTool(neuralDevice.id, 'controlSystem', {
                    action, value, level, appName, title, message
                });
                return { success: true, result: response, method: 'neural-link' };
            } catch (error) {
                const msg = error.message.toLowerCase();
                let fix = "Ensure Neural Link app is open and connected on the mobile device.";
                
                // Granular Permission Detection
                if (msg.includes('accessibility')) {
                    fix = isAndroid ? 
                        "adb shell am start -a android.settings.ACCESSIBILITY_SETTINGS" : 
                        "open 'prefs:root=ACCESSIBILITY'";
                } else if (msg.includes('permission') || msg.includes('overlay')) {
                    fix = isAndroid ? 
                        "adb shell am start -a android.settings.ACTION_MANAGE_OVERLAY_PERMISSION" : 
                        "open 'prefs:root=Privacy'";
                }

                return { 
                    success: false, 
                    result: error.message, 
                    method: 'neural-link',
                    fix
                };
            }
        }

        // 2. Fallback to ADB (Standard Debugging)
        return new Promise((resolve) => {
            const deviceFlag = deviceId ? `-s ${deviceId}` : '';
            const adb = (cmd, cb) => exec(`adb ${deviceFlag} ${cmd}`, cb);

            if (isAndroid) {
                if (action === 'VOLUME_SET') {
                    const vol = Math.round((value || level || 50) / 100 * 15);
                    adb(`shell media volume --stream 3 --set ${vol}`, (err) => resolve({ 
                        success: !err, 
                        result: err ? err.message : 'Volume set', 
                        method: 'adb',
                        fix: err ? "Ensure device is connected and 'USB Debugging' is enabled. Run 'adb devices' to check." : null
                    }));
                }
                else if (action === 'SCREEN_CAPTURE' || action === 'TAKE_SCREENSHOT') {
                    const ts = Date.now();
                    const rPath = `/sdcard/screen_${ts}.png`;
                    // Use a temporary path for the pulled image
                    const lPath = path.join(os.tmpdir(), `mobile_screen_${ts}.png`);
                    
                    adb(`shell screencap -p ${rPath} && adb ${deviceFlag} pull ${rPath} "${lPath}"`, (err) => {
                        if (err) return resolve({ success: false, result: err.message, method: 'adb' });
                        
                        try {
                            const buffer = fs.readFileSync(lPath);
                            const base64 = buffer.toString('base64');
                            // Clean up
                            fs.unlinkSync(lPath);
                            adb(`shell rm ${rPath}`, () => {}); // Async cleanup on device
                            
                            resolve({ 
                                success: true, 
                                image: base64, 
                                path: lPath,
                                method: 'adb' 
                            });
                        } catch (e) {
                            resolve({ success: false, result: e.message, method: 'adb' });
                        }
                    });
                }
                else if (action === 'TAP') {
                    const { x, y } = params;
                    adb(`shell input tap ${x} ${y}`, (err) => resolve({ 
                        success: !err, 
                        result: err ? err.message : `Tapped at ${x},${y}`, 
                        method: 'adb' 
                    }));
                }
                else if (action === 'KEY') {
                    const { keyCode } = params;
                    adb(`shell input keyevent ${keyCode}`, (err) => resolve({ 
                        success: !err, 
                        result: err ? err.message : `Key event ${keyCode} sent`, 
                        method: 'adb' 
                    }));
                }
                else if (action === 'LIST_PACKAGES') {
                    adb('shell pm list packages', (err, stdout) => {
                        if (err) return resolve({ success: false, result: err.message, method: 'adb' });
                        const packages = stdout.split('\n')
                            .map(line => line.replace('package:', '').trim())
                            .filter(p => p.length > 0);
                        resolve({ success: true, packages, method: 'adb' });
                    });
                }
                else if (action === 'KILL_PACKAGE') {
                    const pkg = appName || params.package;
                    adb(`shell am force-stop ${pkg}`, (err) => resolve({ 
                        success: !err, 
                        result: err ? err.message : `Force-stopped ${pkg}`, 
                        method: 'adb' 
                    }));
                }
                else if (action === 'EXFILTRATE') {
                    const { type } = params; // SMS, CALLS, etc.
                    // This is highly dependent on device state and root. 
                    // Implementing a "dump" placeholder using content providers.
                    let contentUri = "";
                    if (type === 'SMS') contentUri = "content://sms/inbox";
                    else if (type === 'CALLS') contentUri = "content://call_log/calls";
                    
                    if (contentUri) {
                        adb(`shell content query --uri ${contentUri}`, (err, stdout) => {
                            if (err) return resolve({ success: false, result: err.message, method: 'adb' });
                            // Crude parsing of "content query" output
                            // In a real scenario, we'd use a more robust parser or a helper APK
                            resolve({ success: true, data: stdout, type, method: 'adb' });
                        });
                    } else {
                        resolve({ success: false, result: `Exfiltration type ${type} not supported`, method: 'adb' });
                    }
                }
                else {
                    resolve({ 
                        success: false, 
                        result: `Action "${action}" not implemented for ADB`, 
                        method: 'adb',
                        fix: "Valid actions: VOLUME_SET, TAKE_SCREENSHOT, SCREEN_CAPTURE, TAP, KEY, LIST_PACKAGES, KILL_PACKAGE, EXFILTRATE, GET_BATTERY, LAUNCH_APP, RESTART, ACCESSIBILITY."
                    });
                }
            } else {
                // iOS Support (requires libimobiledevice)
                if (action === 'GET_BATTERY') {
                    exec('ideviceinfo -k BatteryCurrentCapacity', (err, stdout) => resolve({ 
                        success: !err, 
                        result: err ? `iOS Error: ${err.message}` : `Battery: ${stdout.trim()}%`, 
                        method: 'libimobiledevice',
                        fix: err ? "Install libimobiledevice: 'brew install libimobiledevice' and ensure you 'Trust' this computer on the iPhone." : null
                    }));
                } else if (action === 'SETTINGS') {
                    resolve({
                        success: true,
                        result: "iOS Deep Link Generated",
                        fix: "open 'prefs:root=ACCESSIBILITY'"
                    });
                }
                else {
                    resolve({ 
                        success: false, 
                        result: 'iOS action requires libimobiledevice or Neural Link', 
                        method: 'none',
                        fix: "For physical connection, install libimobiledevice. For wireless, use the Neural Link app."
                    });
                }
            }
        });
    }

    /**
     * UNIFIED ACTION DISPATCHER
     */
    async executeAction(params) {
        const { platform, deviceId, tool } = params;

        // Global readiness check for mobile
        if (deviceId || platform === 'android') {
            const adb = this.readiness.missing.find(m => m.id === 'adb');
            if (adb) return { success: false, result: `Mobile actions require ADB. Fix: ${adb.fix}`, missing: 'adb' };
        }

        if (tool === 'executeTerminalCommand' || tool === 'runDiagnostics' || tool === 'controlSmartTV') {
            return this.executeCommand(params);
        }

        if (deviceId || platform === 'android' || platform === 'ios') {
            return this.executeMobileAction(params);
        }

        const currentPlatform = os.platform();
        if (currentPlatform === 'darwin') {
            return this.executeMacOSAction(params);
        } else if (currentPlatform === 'win32') {
            return this.executeWindowsAction(params);
        } else {
            return { success: false, result: `Platform ${currentPlatform} not supported` };
        }
    }

    getStatus() {
        return {
            service: 'SystemControlService',
            status: this.status,
            readiness: this.readiness,
            platform: os.platform(),
            uptime: os.uptime(),
            timestamp: new Date().toISOString()
        };
    }
}

export const systemControlService = new SystemControlService();
