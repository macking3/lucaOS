import express from 'express';
import { exec } from 'child_process';
import os from 'os';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// --- UI AUTOMATION TREE (X-RAY VISION) ---
router.get('/tree', (req, res) => {
    const platform = os.platform();

    if (platform === 'win32') {
        // Windows UI Automation via PowerShell
        const psScript = `
            Add-Type -AssemblyName UIAutomationClient
            Add-Type -AssemblyName UIAutomationTypes
            
            function Get-UITree {
                param($element, $depth = 0)
                
                $result = @{
                    name = $element.Current.Name
                    role = $element.Current.ControlType.ProgrammaticName
                    bounds = @{
                        x = $element.Current.BoundingRectangle.X
                        y = $element.Current.BoundingRectangle.Y
                        width = $element.Current.BoundingRectangle.Width
                        height = $element.Current.BoundingRectangle.Height
                    }
                    isEnabled = $element.Current.IsEnabled
                    isVisible = $element.Current.IsOffscreen -eq $false
                    automationId = $element.Current.AutomationId
                    className = $element.Current.ClassName
                    children = @()
                }
                
                if ($depth -lt 5) {
                    $children = $element.FindAll([System.Windows.Automation.TreeScope]::Children, [System.Windows.Automation.Condition]::TrueCondition)
                    foreach ($child in $children) {
                        $result.children += (Get-UITree -element $child -depth ($depth + 1))
                    }
                }
                
                return $result
            }
            
            $root = [System.Windows.Automation.AutomationElement]::RootElement
            $activeWindow = $root.FindFirst([System.Windows.Automation.TreeScope]::Children, 
                [System.Windows.Automation.Condition]::TrueCondition)
            
            if ($activeWindow) {
                $tree = Get-UITree -element $activeWindow
                $tree | ConvertTo-Json -Depth 10
            } else {
                Write-Output '{"error": "No active window found"}'
            }
        `;

        const tempPath = path.join(os.tmpdir(), `uitree_${Date.now()}.ps1`);
        fs.writeFileSync(tempPath, psScript);

        exec(`powershell -ExecutionPolicy Bypass -File "${tempPath}"`, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
            fs.unlinkSync(tempPath);
            if (err) {
                return res.status(500).json({ error: `UI Tree extraction failed: ${err.message}`, stderr });
            }
            try {
                const tree = JSON.parse(stdout.trim());
                res.json({ tree, platform: 'windows' });
            } catch (e) {
                res.status(500).json({ error: 'Failed to parse UI tree', raw: stdout });
            }
        });

    } else if (platform === 'darwin') {
        // macOS Accessibility via AppleScript
        const script = `
            tell application "System Events"
                set frontApp to first application process whose frontmost is true
                set appName to name of frontApp
                
                try
                    set windowList to windows of frontApp
                    if (count of windowList) > 0 then
                        set frontWindow to first item of windowList
                        return "Window: " & name of frontWindow
                    end if
                end try
            end tell
        `;

        exec(`osascript -e '${script}'`, (err, stdout) => {
            if (err) {
                return res.status(500).json({ error: `macOS UI Tree extraction failed: ${err.message}` });
            }
            res.json({
                tree: { name: stdout.trim(), platform: 'macos' },
                note: 'macOS full tree requires native bridge. Basic info returned.',
                platform: 'macos'
            });
        });

    } else if (platform === 'linux') {
        exec('xdotool getactivewindow getwindowname', (err, stdout) => {
            if (err) {
                return res.status(500).json({ error: 'xdotool not available' });
            }
            res.json({
                tree: { name: stdout.trim(), platform: 'linux' },
                note: 'Linux full tree requires AT-SPI2 Python bindings. Basic info returned.',
                platform: 'linux'
            });
        });
    } else {
        res.status(400).json({ error: 'UI Automation not supported on this platform' });
    }
});

// Find UI element
router.post('/find', (req, res) => {
    const { name, role, automationId, className } = req.body;
    const platform = os.platform();

    if (platform === 'win32') {
        const psScript = `
            Add-Type -AssemblyName UIAutomationClient
            Add-Type -AssemblyName UIAutomationTypes
            
            $root = [System.Windows.Automation.AutomationElement]::RootElement
            $activeWindow = $root.FindFirst([System.Windows.Automation.TreeScope]::Children, 
                [System.Windows.Automation.Condition]::TrueCondition)
            
            if (-not $activeWindow) {
                Write-Output '{"error": "No active window"}'
                exit
            }
            
            $conditions = @()
            ${name ? `$nameCondition = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::NameProperty, "${name}")
            $conditions += $nameCondition` : ''}
            
            if ($conditions.Count -eq 0) {
                Write-Output '{"error": "No search criteria provided"}'
                exit
            }
            
            $element = $activeWindow.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $conditions[0])
            
            if ($element) {
                $result = @{
                    found = $true
                    name = $element.Current.Name
                    role = $element.Current.ControlType.ProgrammaticName
                    bounds = @{
                        x = $element.Current.BoundingRectangle.X
                        y = $element.Current.BoundingRectangle.Y
                        width = $element.Current.BoundingRectangle.Width
                        height = $element.Current.BoundingRectangle.Height
                    }
                    isEnabled = $element.Current.IsEnabled
                    isVisible = $element.Current.IsOffscreen -eq $false
                    automationId = $element.Current.AutomationId
                    className = $element.Current.ClassName
                }
                $result | ConvertTo-Json
            } else {
                Write-Output '{"found": false, "error": "Element not found"}'
            }
        `;

        const tempPath = path.join(os.tmpdir(), `uifind_${Date.now()}.ps1`);
        fs.writeFileSync(tempPath, psScript);

        exec(`powershell -ExecutionPolicy Bypass -File "${tempPath}"`, (err, stdout) => {
            fs.unlinkSync(tempPath);
            if (err) {
                return res.status(500).json({ error: `UI Find failed: ${err.message}` });
            }
            try {
                const result = JSON.parse(stdout.trim());
                res.json(result);
            } catch (e) {
                res.status(500).json({ error: 'Failed to parse result', raw: stdout });
            }
        });
    } else {
        res.json({ found: false, error: 'UI find only supported on Windows currently' });
    }
});

// Click UI element
router.post('/click', (req, res) => {
    const { name, x, y } = req.body;
    
    if (x !== undefined && y !== undefined) {
        // Direct coordinate click - delegate to automation routes
        const platform = os.platform();
        if (platform === 'darwin') {
            exec(`osascript -e 'tell application "System Events" to click at {${x}, ${y}}'`, (err) => {
                if (err) return res.json({ success: false, error: err.message });
                res.json({ success: true });
            });
        } else if (platform === 'win32') {
            const ps = `[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y}); Start-Sleep -Milliseconds 100; Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")`;
            exec(`powershell -command "${ps}"`, (err) => {
                if (err) return res.json({ success: false, error: err.message });
                res.json({ success: true });
            });
        } else {
            exec(`xdotool mousemove ${x} ${y} click 1`, (err) => {
                if (err) return res.json({ success: false, error: err.message });
                res.json({ success: true });
            });
        }
    } else if (name) {
        // Find by name first, then click
        res.json({ success: false, error: 'Click by name not yet implemented - use coordinates' });
    } else {
        res.status(400).json({ error: 'Either coordinates (x,y) or element name required' });
    }
});

export default router;
