"""
Windows-Specific Automation Implementation
Uses PowerShell, Win32 APIs, and WMI for system control
"""

import subprocess
import os
from typing import Dict, Any, Optional
import json


class WindowsAutomation:
    """Windows platform automation using PowerShell and Win32"""
    
    @staticmethod
    def click(x: int, y: int):
        """Click at coordinates"""
        script = f"Set-CursorPos {x} {y}; Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('')"
        # Better approach using mouse_event
        script = f"""
        Add-Type -TypeDefinition @"
        using System;
        using System.Runtime.InteropServices;
        public class MouseSelect {{
            [DllImport("user32.dll")]
            public static extern void mouse_event(int dwFlags, int dx, int dy, int cButtons, int dwExtraInfo);
            [DllImport("user32.dll")]
            public static extern bool SetCursorPos(int x, int y);
        }}
"@
        [MouseSelect]::SetCursorPos({x}, {y})
        [MouseSelect]::mouse_event(0x0002, 0, 0, 0, 0) # Left down
        [MouseSelect]::mouse_event(0x0004, 0, 0, 0, 0) # Left up
        """
        WindowsAutomation.run_powershell(script)

    @staticmethod
    def type_text(text: str):
        """Type text"""
        script = f'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait("{text}")'
        WindowsAutomation.run_powershell(script)

    @staticmethod
    def press_key(key: str):
        """Press a key"""
        # Map common keys to PowerShell format
        key_map = {
            "enter": "{ENTER}",
            "return": "{ENTER}",
            "tab": "{TAB}",
            "esc": "{ESC}",
            "escape": "{ESC}",
            "space": " ",
            "backspace": "{BACKSPACE}"
        }
        ps_key = key_map.get(key.lower(), f"{{{key.upper()}}}") if len(key) > 1 else key
        script = f'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait("{ps_key}")'
        WindowsAutomation.run_powershell(script)

    @staticmethod
    def scroll(direction: str, amount: int):
        """Scroll screen"""
        # 120 is the default WHEEL_DELTA
        clicks = amount * 120 if direction == "up" else -amount * 120
        script = f"""
        Add-Type -TypeDefinition @"
        using System;
        using System.Runtime.InteropServices;
        public class MouseScroll {{
            [DllImport("user32.dll")]
            public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);
        }}
"@
        [MouseScroll]::mouse_event(0x0800, 0, 0, {clicks}, 0) # MOUSEEVENTF_WHEEL
        """
        WindowsAutomation.run_powershell(script)
    
    @staticmethod
    def run_powershell(script: str) -> Dict[str, Any]:
        """Execute PowerShell script and return result"""
        try:
            result = subprocess.run(
                ["powershell", "-Command", script],
                capture_output=True,
                text=True,
                timeout=30
            )
            return {
                "success": result.returncode == 0,
                "stdout": result.stdout,
                "stderr": result.stderr
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # MUSIC CONTROL
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    @staticmethod
    def play_music(song: str, app: str = "spotify") -> Dict[str, Any]:
        """Play music using Windows Media Controls or app-specific automation"""
        
        if app.lower() == "spotify":
            return WindowsAutomation._control_spotify(song, "play")
        else:
            # Generic: Try to open music app and use keyboard shortcuts
            return WindowsAutomation._generic_music_control(song, app)
    
    @staticmethod
    def _control_spotify(song: str, action: str = "play") -> Dict[str, Any]:
        """Control Spotify on Windows"""
        script = f"""
        # Find Spotify process
        $spotify = Get-Process spotify -ErrorAction SilentlyContinue
        
        if ($spotify) {{
            # Bring Spotify to foreground
            Add-Type @"
                using System;
                using System.Runtime.InteropServices;
                public class WinAPI {{
                    [DllImport("user32.dll")]
                    public static extern bool SetForegroundWindow(IntPtr hWnd);
                }}
"@
            [WinAPI]::SetForegroundWindow($spotify.MainWindowHandle)
            Start-Sleep -Milliseconds 500
            
            # Send keyboard shortcut for search (Ctrl+L)
            Add-Type -AssemblyName System.Windows.Forms
            [System.Windows.Forms.SendKeys]::SendWait("^l")
            Start-Sleep -Milliseconds 300
            
            # Type song name
            [System.Windows.Forms.SendKeys]::SendWait("{song}")
            Start-Sleep -Milliseconds 200
            
            # Press Enter
            [System.Windows.Forms.SendKeys]::SendWait("{{ENTER}}")
            
            Write-Output "SUCCESS"
        }} else {{
            # Start Spotify
            Start-Process "C:\\Users\\$env:USERNAME\\AppData\\Roaming\\Spotify\\Spotify.exe"
            Start-Sleep -Seconds 3
            # Retry
            $spotify = Get-Process spotify -ErrorAction SilentlyContinue
            if ($spotify) {{
                Write-Output "STARTED"
            }} else {{
                Write-Output "ERROR: Spotify not found"
            }}
        }}
        """
        
        result = WindowsAutomation.run_powershell(script)
        if result["success"] and ("SUCCESS" in result["stdout"] or "STARTED" in result["stdout"]):
            return {"success": True, "message": f"Playing {song} on Spotify", "platform": "windows"}
        else:
            return {"success": False, "error": result.get("stderr", "Unknown error"), "platform": "windows"}
    
    @staticmethod
    def pause_media() -> Dict[str, Any]:
        """Pause media playback"""
        script = """
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.SendKeys]::SendWait("{MEDIA_PLAY_PAUSE}")
        """
        result = WindowsAutomation.run_powershell(script)
        return {"success": result["success"], "message": "Media paused", "platform": "windows"}
    
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # FILE OPERATIONS
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    @staticmethod
    def open_file(filename: str, directory: Optional[str] = None) -> Dict[str, Any]:
        """Open file in default application"""
        try:
            if directory:
                full_path = os.path.join(directory, filename)
            else:
                # Search common locations
                search_dirs = [
                    os.path.expanduser("~\\Documents"),
                    os.path.expanduser("~\\Desktop"),
                    os.path.expanduser("~\\Downloads"),
                ]
                full_path = None
                for search_dir in search_dirs:
                    potential_path = os.path.join(search_dir, filename)
                    if os.path.exists(potential_path):
                        full_path = potential_path
                        break
                
                if not full_path:
                    return {"success": False, "error": f"File not found: {filename}", "platform": "windows"}
            
            os.startfile(full_path)
            return {"success": True, "path": full_path, "platform": "windows"}
        except Exception as e:
            return {"success": False, "error": str(e), "platform": "windows"}
    
    @staticmethod
    def create_folder(folder_name: str, location: Optional[str] = None) -> Dict[str, Any]:
        """Create new folder"""
        try:
            if location is None:
                location = os.path.expanduser("~\\Desktop")
            
            full_path = os.path.join(location, folder_name)
            os.makedirs(full_path, exist_ok=True)
            return {"success": True, "path": full_path, "platform": "windows"}
        except Exception as e:
            return {"success": False, "error": str(e), "platform": "windows"}
    
    @staticmethod
    def delete_file(filename: str, directory: Optional[str] = None) -> Dict[str, Any]:
        """Move file to Recycle Bin (safe delete)"""
        try:
            from send2trash import send2trash
            
            if directory:
                full_path = os.path.join(directory, filename)
            else:
                # Find file
                search_dirs = [
                    os.path.expanduser("~\\Documents"),
                    os.path.expanduser("~\\Desktop"),
                    os.path.expanduser("~\\Downloads"),
                ]
                full_path = None
                for search_dir in search_dirs:
                    potential_path = os.path.join(search_dir, filename)
                    if os.path.exists(potential_path):
                        full_path = potential_path
                        break
                
                if not full_path:
                    return {"success": False, "error": f"File not found: {filename}", "platform": "windows"}
            
            send2trash(full_path)
            return {"success": True, "message": f"{filename} moved to Recycle Bin", "platform": "windows"}
        except ImportError:
            return {
                "success": False,
                "error": "send2trash not installed. Install with: pip install send2trash",
                "platform": "windows"
            }
        except Exception as e:
            return {"success": False, "error": str(e), "platform": "windows"}
    
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # SCREENSHOT
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    @staticmethod
    def take_screenshot(path: str = "C:\\Temp\\screenshot.png") -> Dict[str, Any]:
        """Take screenshot using PIL"""
        try:
            from PIL import ImageGrab
            
            # Ensure directory exists
            os.makedirs(os.path.dirname(path), exist_ok=True)
            
            screenshot = ImageGrab.grab()
            screenshot.save(path)
            return {"success": True, "path": path, "platform": "windows"}
        except ImportError:
            return {
                "success": False,
                "error": "PIL/Pillow not installed. Install with: pip install pillow",
                "platform": "windows"
            }
        except Exception as e:
            return {"success": False, "error": str(e), "platform": "windows"}
    
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # MESSAGING
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    @staticmethod
    def send_message(app: str, contact: str, message: str) -> Dict[str, Any]:
        """Send message via desktop app using UI automation"""
        script = f"""
        # Find and activate messaging app
        $app = Get-Process {app} -ErrorAction SilentlyContinue
        
        if ($app) {{
            # Bring to foreground
            Add-Type @"
                using System;
                using System.Runtime.InteropServices;
                public class WinAPI {{
                    [DllImport("user32.dll")]
                    public static extern bool SetForegroundWindow(IntPtr hWnd);
                }}
"@
            [WinAPI]::SetForegroundWindow($app.MainWindowHandle)
            Start-Sleep -Milliseconds 500
            
            # Open search (Ctrl+F or Ctrl+K depending on app)
            Add-Type -AssemblyName System.Windows.Forms
            [System.Windows.Forms.SendKeys]::SendWait("^f")
            Start-Sleep -Milliseconds 300
            
            # Type contact name
            [System.Windows.Forms.SendKeys]::SendWait("{contact}")
            Start-Sleep -Milliseconds 500
            [System.Windows.Forms.SendKeys]::SendWait("{{ENTER}}")
            Start-Sleep -Milliseconds 500
            
            # Type message
            [System.Windows.Forms.SendKeys]::SendWait("{message}")
            Start-Sleep -Milliseconds 200
            [System.Windows.Forms.SendKeys]::SendWait("{{ENTER}}")
            
            Write-Output "SUCCESS"
        }} else {{
            Write-Output "ERROR: {app} not running"
        }}
        """
        
        result = WindowsAutomation.run_powershell(script)
        if result["success"] and "SUCCESS" in result["stdout"]:
            return {"success": True, "message": f"Message sent via {app}", "platform": "windows"}
        else:
            return {"success": False, "error": result.get("stderr", "App not running"), "platform": "windows"}
    
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # SYSTEM CONTROL
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    @staticmethod
    def lock_screen() -> Dict[str, Any]:
        """Lock Windows screen"""
        script = "rundll32.exe user32.dll,LockWorkStation"
        result = WindowsAutomation.run_powershell(script)
        return {"success": result["success"], "message": "Screen locked", "platform": "windows"}
    
    @staticmethod
    def sleep_system() -> Dict[str, Any]:
        """Put system to sleep"""
        script = "Add-Type -Assembly System.Windows.Forms; [System.Windows.Forms.Application]::SetSuspendState('Suspend', $false, $false)"
        result = WindowsAutomation.run_powershell(script)
        return {"success": result["success"], "message": "System sleeping", "platform": "windows"}
    
    @staticmethod
    def open_app(app_name: str) -> Dict[str, Any]:
        """Open an application"""
        script = f'Start-Process "{app_name}"'
        result = WindowsAutomation.run_powershell(script)
        return {"success": result["success"], "message": f"Opened {app_name}", "platform": "windows"}
    
    @staticmethod
    def close_app(app_name: str) -> Dict[str, Any]:
        """Close an application"""
        script = f'Stop-Process -Name "{app_name}" -Force'
        result = WindowsAutomation.run_powershell(script)
        return {"success": result["success"], "message": f"Closed {app_name}", "platform": "windows"}
