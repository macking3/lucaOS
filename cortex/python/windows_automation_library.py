"""
Windows Automation Library - Tier 1
Reusable PowerShell templates for common Windows applications
Similar to automation_library.py for macOS
"""

from typing import Dict, Any


class WindowsAutomationLibrary:
    """
    Tier 1: Pre-built PowerShell automation templates for common apps
    Fast, reliable, app-specific automation
    """
    
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # SPOTIFY TEMPLATES
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    SPOTIFY_PLAY = """
    # Smart Spotify launcher with UI polling
    $spotify = Get-Process spotify -ErrorAction SilentlyContinue
    
    if (-not $spotify) {{
        # Launch Spotify
        $spotifyPath = "$env:APPDATA\\Spotify\\Spotify.exe"
        if (Test-Path $spotifyPath) {{
            Start-Process $spotifyPath
            
            # Poll for window (max 15 seconds)
            $timeout = 15
            $elapsed = 0
            while ($elapsed -lt $timeout) {{
                Start-Sleep -Milliseconds 500
                $elapsed += 0.5
                $spotify = Get-Process spotify -ErrorAction SilentlyContinue
                if ($spotify -and $spotify.MainWindowHandle -ne 0) {{
                    break
                }}
            }}
        }}
    }}
    
    if ($spotify) {{
        # Bring to foreground
        Add-Type @"
            using System;
            using System.Runtime.InteropServices;
            public class WinAPI {{
                [DllImport("user32.dll")]
                public static extern bool SetForegroundWindow(IntPtr hWnd);
                [DllImport("user32.dll")]
                public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
            }}
"@
        [WinAPI]::ShowWindow($spotify.MainWindowHandle, 9)  # SW_RESTORE
        [WinAPI]::SetForegroundWindow($spotify.MainWindowHandle)
        Start-Sleep -Milliseconds 500
        
        # Search for song
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.SendKeys]::SendWait("^l")  # Ctrl+L
        Start-Sleep -Milliseconds 300
        [System.Windows.Forms.SendKeys]::SendWait("{SONG}")
        Start-Sleep -Milliseconds 200
        [System.Windows.Forms.SendKeys]::SendWait("{{ENTER}}")
        
        Write-Output "SUCCESS"
    }} else {{
        Write-Output "ERROR: Spotify not found"
    }}
    """
    
    SPOTIFY_PAUSE = """
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.SendKeys]::SendWait("{MEDIA_PLAY_PAUSE}")
    Write-Output "SUCCESS"
    """
    
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # CHROME TEMPLATES
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    CHROME_OPEN_URL = """
    $chrome = Get-Process chrome -ErrorAction SilentlyContinue
    
    if (-not $chrome) {{
        Start-Process chrome "{URL}"
    }} else {{
        # Open in new tab
        Start-Process chrome "{URL}"
    }}
    Write-Output "SUCCESS"
    """
    
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # WHATSAPP TEMPLATES
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    WHATSAPP_MESSAGE = """
    $whatsapp = Get-Process WhatsApp -ErrorAction SilentlyContinue
    
    if (-not $whatsapp) {{
        # Launch WhatsApp
        $whatsappPath = "$env:LOCALAPPDATA\\WhatsApp\\WhatsApp.exe"
        if (Test-Path $whatsappPath) {{
            Start-Process $whatsappPath
            Start-Sleep -Seconds 3
        }}
    }}
    
    $whatsapp = Get-Process WhatsApp -ErrorAction SilentlyContinue
    if ($whatsapp) {{
        Add-Type @"
            using System;
            using System.Runtime.InteropServices;
            public class WinAPI {{
                [DllImport("user32.dll")]
                public static extern bool SetForegroundWindow(IntPtr hWnd);
            }}
"@
        [WinAPI]::SetForegroundWindow($whatsapp.MainWindowHandle)
        Start-Sleep -Milliseconds 500
        
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.SendKeys]::SendWait("^f")  # Ctrl+F for search
        Start-Sleep -Milliseconds 300
        [System.Windows.Forms.SendKeys]::SendWait("{CONTACT}")
        Start-Sleep -Milliseconds 500
        [System.Windows.Forms.SendKeys]::SendWait("{{ENTER}}")
        Start-Sleep -Milliseconds 500
        [System.Windows.Forms.SendKeys]::SendWait("{MESSAGE}")
        Start-Sleep -Milliseconds 200
        [System.Windows.Forms.SendKeys]::SendWait("{{ENTER}}")
        
        Write-Output "SUCCESS"
    }} else {{
        Write-Output "ERROR: WhatsApp not found"
    }}
    """
    
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # VS CODE TEMPLATES
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    VSCODE_OPEN_FILE = """
    $code = Get-Process Code -ErrorAction SilentlyContinue
    
    if (-not $code) {{
        Start-Process code "{FILE}"
    }} else {{
        Start-Process code "{FILE}"
    }}
    Write-Output "SUCCESS"
    """
    
    @classmethod
    def get_template(cls, app: str, action: str) -> str:
        """Get automation template for app/action combo"""
        templates = {
            "spotify": {
                "play": cls.SPOTIFY_PLAY,
                "pause": cls.SPOTIFY_PAUSE,
            },
            "chrome": {
                "open_url": cls.CHROME_OPEN_URL,
            },
            "whatsapp": {
                "message": cls.WHATSAPP_MESSAGE,
            },
            "vscode": {
                "open_file": cls.VSCODE_OPEN_FILE,
            },
        }
        
        app_templates = templates.get(app.lower(), {})
        return app_templates.get(action.lower())
    
    @classmethod
    def has_template(cls, app: str, action: str) -> bool:
        """Check if template exists for app/action"""
        return cls.get_template(app, action) is not None
    
    @classmethod
    def substitute_params(cls, template: str, **params) -> str:
        """Substitute parameters in template"""
        for key, value in params.items():
            placeholder = "{" + key.upper() + "}"
            template = template.replace(placeholder, str(value))
        return template
