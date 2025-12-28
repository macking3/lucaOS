"""
Cross-Platform Adapter for Luca Local Tools
Provides unified API that works across macOS, Windows, Linux, Android, iOS, Web
"""

import platform
import subprocess
import os
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional


class PlatformDetector:
    """Detect the current platform"""
    
    @staticmethod
    def get_platform() -> str:
        """Returns: macos, windows, linux, android, ios, web, unknown"""
        system = platform.system().lower()
        
        # Desktop platforms
        if system == "darwin":
            return "macos"
        elif system == "windows":
            return "windows"
        elif system == "linux":
            # Check if Android (termux, etc.)
            if "android" in platform.release().lower():
                return "android"
            return "linux"
        
        # Mobile (set via environment variable from mobile app)
        mobile_type = os.environ.get("LUCA_DEVICE_TYPE", "").lower()
        if mobile_type in ["android", "ios"]:
            return mobile_type
        
        return "unknown"
    
    @staticmethod
    def get_capabilities() -> Dict[str, bool]:
        """Return dict of what features are available on this platform"""
        plat = PlatformDetector.get_platform()
        
        return {
            "music_control": plat in ["macos", "windows", "linux", "android", "ios"],
            "file_operations": plat in ["macos", "windows", "linux", "android", "ios"],
            "file_editing": plat in ["macos", "windows", "linux"],
            "screenshot": plat in ["macos", "windows", "linux"],
            "messaging": plat in ["macos", "windows", "linux", "android", "ios"],
            "system_control": plat in ["macos", "windows", "linux"],
        }


class PlatformAdapter(ABC):
    """Abstract base class for platform-specific implementations"""
    
    def __init__(self):
        self.platform = PlatformDetector.get_platform()
        self.capabilities = PlatformDetector.get_capabilities()
    
    @abstractmethod
    def play_music(self, song: str, app: str = "default") -> Dict[str, Any]:
        """Play music on specified app"""
        pass
    
    @abstractmethod
    def open_file(self, filename: str, directory: Optional[str] = None) -> Dict[str, Any]:
        """Open a file in default application"""
        pass
    
    @abstractmethod
    def take_screenshot(self, path: str = "/tmp/screenshot.png") -> Dict[str, Any]:
        """Take a screenshot"""
        pass
    
    @abstractmethod
    def open_app(self, app_name: str) -> Dict[str, Any]:
        """Open an application"""
        pass

    @abstractmethod
    def close_app(self, app_name: str) -> Dict[str, Any]:
        """Close an application"""
        pass

    @abstractmethod
    def get_battery(self) -> Dict[str, Any]:
        """Get battery status and percentage"""
        pass
    
    @abstractmethod
    def check_permissions(self) -> Dict[str, Any]:
        """Check all required system permissions"""
        pass
        
    @abstractmethod
    def request_permissions(self) -> Dict[str, Any]:
        """Request required system permissions (triggers OS prompts)"""
        pass
    
    @abstractmethod
    def list_installed_apps(self) -> Dict[str, Any]:
        """List all installed applications on the system"""
        pass

    def check_capability(self, feature: str) -> bool:
        """Check if a feature is supported on this platform"""
        return self.capabilities.get(feature, False)
    
    def not_implemented(self, feature: str) -> Dict[str, Any]:
        """Standard response for unimplemented features"""
        return {
            "success": False,
            "error": f"{feature} not implemented on {self.platform}",
            "platform": self.platform,
            "suggestion": f"Consider using a {self.get_supported_platforms(feature)} device"
        }
    
    def permission_denied(self, recovery_type: str) -> Dict[str, Any]:
        """Standard response for permission errors to trigger recovery UI"""
        return {
            "success": False,
            "error": "PERMISSION_DENIED",
            "recovery_type": recovery_type,
            "platform": self.platform
        }
    
    def get_supported_platforms(self, feature: str) -> str:
        """Get list of platforms that support a feature"""
        # This would check all adapters
        return "macOS or Windows"


class MacOSAdapter(PlatformAdapter):
    """macOS-specific implementation using AppleScript"""
    
    def play_music(self, song: str, app: str = "spotify") -> Dict[str, Any]:
        if not self.check_capability("music_control"):
            return self.not_implemented("music_control")
        
        # Use the existing universal_automation system
        from universal_automation import automate
        import asyncio
        
        try:
            # Run async automate function
            loop = asyncio.get_event_loop()
            result = loop.run_until_complete(automate("play", app, song=song))
            return result
        except Exception as e:
            return {"success": False, "error": str(e), "platform": "macos"}
    
    def open_file(self, filename: str, directory: Optional[str] = None) -> Dict[str, Any]:
        # Use existing hybrid_file_operations
        from hybrid_file_operations import open_file
        
        try:
            result = open_file(filename, directory)
            result["platform"] = "macos"
            return result
        except Exception as e:
            return {"success": False, "error": str(e), "platform": "macos"}
    
    def take_screenshot(self, path: str = "/tmp/screenshot.png") -> Dict[str, Any]:
        try:
            subprocess.run(["screencapture", "-x", path], check=True)
            return {"success": True, "path": path, "platform": "macos"}
        except Exception as e:
            return {"success": False, "error": str(e), "platform": "macos"}
            
    def open_app(self, app_name: str) -> Dict[str, Any]:
        try:
            subprocess.run(["open", "-a", app_name], check=True)
            return {"success": True, "message": f"Opened {app_name}", "platform": "macos"}
        except Exception as e:
            # Fallback for app names that might be paths
            try:
                subprocess.run(["open", app_name], check=True)
                return {"success": True, "message": f"Opened {app_name}", "platform": "macos"}
            except:
                return {"success": False, "error": str(e), "platform": "macos"}

    def close_app(self, app_name: str) -> Dict[str, Any]:
        try:
            # Use osascript to quit app gracefully
            script = f'quit app "{app_name}"'
            subprocess.run(["osascript", "-e", script], check=True)
            return {"success": True, "message": f"Closed {app_name}", "platform": "macos"}
        except Exception as e:
            try:
                # Force kill if quit fails
                subprocess.run(["pkill", "-f", app_name], check=True)
                return {"success": True, "message": f"Force closed {app_name}", "platform": "macos"}
            except Exception as e2:
                return {"success": False, "error": str(e2), "platform": "macos"}

    def get_battery(self) -> Dict[str, Any]:
        try:
            cmd = ["pmset", "-g", "batt"]
            output = subprocess.check_output(cmd).decode("utf-8")
            
            percentage = 0
            is_charging = False
            time_remaining = None
            
            import re
            match = re.search(r"(\d+)%", output)
            if match:
                percentage = int(match.group(1))
            
            is_charging = "AC Power" in output or "charging" in output
            
            time_match = re.search(r"(\d+:\d+) remaining", output)
            if time_match:
                time_remaining = time_match.group(1)
                
            status = "Charging" if is_charging else "Discharging"
            result_str = f"Battery: {percentage}% ({status})"
            if time_remaining:
                result_str += f" - {time_remaining} remaining"
                
            return {
                "success": True,
                "result": result_str,
                "data": {
                    "percentage": percentage,
                    "isCharging": is_charging,
                    "timeRemaining": time_remaining
                },
                "platform": "macos"
            }
        except Exception as e:
            return {"success": False, "error": str(e), "platform": "macos"}

    def check_permissions(self) -> Dict[str, Any]:
        """Check macOS Accessibility and Screen Recording permissions"""
        results = {
            "accessibility": False,
            "screen_recording": False,
            "platform": "macos"
        }
        
        # Check Accessibility via AppleScript fallback
        try:
            # If we can get the frontmost app name via System Events, we have Accessibility
            script = 'tell application "System Events" to name of first item of (every process whose frontmost is true)'
            proc = subprocess.run(["osascript", "-e", script], capture_output=True, text=True, timeout=2)
            results["accessibility"] = proc.returncode == 0
        except:
            results["accessibility"] = False
            
        # Check Screen Recording
        # On macOS, if we can take a tiny screenshot without error, we likely have permission
        temp_path = "/tmp/perm_check.png"
        try:
            proc = subprocess.run(["screencapture", "-x", "-R0,0,1,1", temp_path], capture_output=True, timeout=5)
            if proc.returncode == 0:
                results["screen_recording"] = True
                if os.path.exists(temp_path):
                    os.remove(temp_path)
            else:
                results["screen_recording"] = False
        except:
            results["screen_recording"] = False
            
        return {
            "success": all([results["accessibility"], results["screen_recording"]]),
            "permissions": results
        }

    def request_permissions(self) -> Dict[str, Any]:
        """Trigger macOS permission prompts"""
        # Accessibility prompt is triggered by trying to use System Events
        # Screen Recording prompt is triggered by screencapture
        self.check_permissions()
        
        return {
            "success": True,
            "message": "Permission prompts triggered if necessary. Please check your system dialogs.",
            "guidance": "Go to System Settings > Privacy & Security > Accessibility / Screen Recording and ensure Luca (or your Terminal) is enabled."
        }

    def list_installed_apps(self) -> Dict[str, Any]:
        """List macOS applications using mdfind"""
        try:
            # Look for everything with a .app bundle
            cmd = ["mdfind", "kMDItemContentType == 'com.apple.application-bundle'"]
            output = subprocess.check_output(cmd).decode('utf-8')
            apps = []
            for path in output.splitlines():
                if path.strip() and path.startswith('/'):
                    name = os.path.basename(path).replace('.app', '')
                    apps.append({"name": name, "path": path})
            
            # Sort alphabetically
            apps.sort(key=lambda x: x['name'].lower())
            return {"success": True, "apps": apps, "platform": "macos"}
        except Exception as e:
            return {"success": False, "error": str(e), "platform": "macos"}


class WindowsAdapter(PlatformAdapter):
    """Windows-specific implementation using PowerShell/Win32"""
    
    def __init__(self):
        super().__init__()
        from windows_automation import WindowsAutomation
        self.automation = WindowsAutomation()
    
    def play_music(self, song: str, app: str = "spotify") -> Dict[str, Any]:
        if not self.check_capability("music_control"):
            return self.not_implemented("music_control")
        return self.automation.play_music(song, app)
    
    def open_file(self, filename: str, directory: Optional[str] = None) -> Dict[str, Any]:
        return self.automation.open_file(filename, directory)
    
    def take_screenshot(self, path: str = "C:\\Temp\\screenshot.png") -> Dict[str, Any]:
        return self.automation.take_screenshot(path)

    def open_app(self, app_name: str) -> Dict[str, Any]:
        return self.automation.open_app(app_name)

    def close_app(self, app_name: str) -> Dict[str, Any]:
        try:
            # Stop-Process via PowerShell
            ps_cmd = f"Stop-Process -Name '{app_name}' -Force"
            subprocess.run(["powershell", "-Command", ps_cmd], check=True)
            return {"success": True, "message": f"Closed {app_name}", "platform": "windows"}
        except Exception as e:
             return {"success": False, "error": str(e), "platform": "windows"}

    def get_battery(self) -> Dict[str, Any]:
        try:
            # WMIC
            cmd = ["WMIC", "Path", "Win32_Battery", "Get", "EstimatedChargeRemaining"]
            output = subprocess.check_output(cmd).decode("utf-8")
            lines = [l.strip() for l in output.splitlines() if l.strip()]
            
            percentage = 0
            if len(lines) > 1 and lines[1].isdigit():
                percentage = int(lines[1])
                
            return {
                "success": True,
                "result": f"Battery: {percentage}%",
                "data": {"percentage": percentage, "isCharging": False}, # WMIC charging status is harder, skipping or adding later
                "platform": "windows"
            }
        except Exception as e:
            return {"success": False, "error": str(e), "platform": "windows"}

    def check_permissions(self) -> Dict[str, Any]:
        """Windows permissions check (Elevation check)"""
        import ctypes
        is_admin = False
        try:
            is_admin = ctypes.windll.shell32.IsUserAnAdmin() != 0
        except:
            pass
            
        return {
            "success": True, # Most things work without admin, but we report it
            "permissions": {
                "is_admin": is_admin,
                "platform": "windows"
            }
        }

    def request_permissions(self) -> Dict[str, Any]:
        """Request elevation on Windows if needed"""
        import ctypes
        is_admin = False
        try:
            is_admin = ctypes.windll.shell32.IsUserAnAdmin() != 0
        except:
            pass

        if not is_admin:
            return self.permission_denied("admin_privileges")
        else:
            return {
                "success": True,
                "message": "Running as Administrator.",
                "platform": "windows"
            }

    def list_installed_apps(self) -> Dict[str, Any]:
        """List Windows applications using PowerShell"""
        try:
            # Get apps from Start Menu via PowerShell
            ps_cmd = "Get-StartApps | Select-Object Name, AppID | ConvertTo-Json"
            output = subprocess.check_output(["powershell", "-Command", ps_cmd]).decode('utf-8')
            import json
            raw_apps = json.loads(output)
            
            apps = []
            # Handle both single object and list
            if isinstance(raw_apps, dict):
                raw_apps = [raw_apps]
                
            for app in raw_apps:
                apps.append({
                    "name": app.get("Name"),
                    "id": app.get("AppID")
                })
            
            return {"success": True, "apps": apps, "platform": "windows"}
        except Exception as e:
            return {"success": False, "error": str(e), "platform": "windows"}


class LinuxAdapter(PlatformAdapter):
    """Linux-specific implementation using D-Bus/xdg-utils"""
    
    def __init__(self):
        super().__init__()
        from linux_automation import LinuxAutomation
        self.automation = LinuxAutomation()
    
    def play_music(self, song: str, app: str = "spotify") -> Dict[str, Any]:
        if not self.check_capability("music_control"):
            return self.not_implemented("music_control")
        return self.automation.play_music(song, app)
    
    def open_file(self, filename: str, directory: Optional[str] = None) -> Dict[str, Any]:
        return self.automation.open_file(filename, directory)
    
    def take_screenshot(self, path: str = "/tmp/screenshot.png") -> Dict[str, Any]:
        return self.automation.take_screenshot(path)
        
    def open_app(self, app_name: str) -> Dict[str, Any]:
        return self.automation.open_app(app_name)

    def close_app(self, app_name: str) -> Dict[str, Any]:
        try:
            subprocess.run(["pkill", "-f", app_name], check=True)
            return {"success": True, "message": f"Closed {app_name}", "platform": "linux"}
        except Exception as e:
            return {"success": False, "error": str(e), "platform": "linux"}

    def get_battery(self) -> Dict[str, Any]:
        try:
            # Try upower first
            cmd = "upower -i /org/freedesktop/UPower/devices/battery_BAT0 || acpi -b"
            output = subprocess.check_output(cmd, shell=True).decode("utf-8")
            
            percentage = 0
            is_charging = False
            
            import re
            match = re.search(r"(\d+)%", output)
            if match:
                percentage = int(match.group(1))
            
            is_charging = "charging" in output.lower() and "discharging" not in output.lower()
            
            status = "Charging" if is_charging else "Discharging"
            return {
                "success": True,
                "result": f"Battery: {percentage}% ({status})",
                "data": {"percentage": percentage, "isCharging": is_charging},
                "platform": "linux"
            }
        except Exception as e:
            return {"success": False, "error": str(e), "platform": "linux"}

    def check_permissions(self) -> Dict[str, Any]:
        """Linux permissions check (X11/Wayland tools)"""
        has_x11 = os.environ.get("DISPLAY") is not None
        has_wayland = os.environ.get("WAYLAND_DISPLAY") is not None
        
        # Check for common tools
        from linux_automation import LinuxAutomation
        has_xdotool = LinuxAutomation.command_exists("xdotool")
        
        return {
            "success": has_x11 or has_wayland,
            "permissions": {
                "x11": has_x11,
                "wayland": has_wayland,
                "xdotool": has_xdotool,
                "platform": "linux"
            }
        }

    def request_permissions(self) -> Dict[str, Any]:
        """Guidance for Linux setup"""
        return {
            "success": True,
            "message": "Linux automation requires specific tools.",
            "guidance": "Ensure 'xdotool' and a screenshot tool like 'scrot' or 'gnome-screenshot' are installed."
        }

    def list_installed_apps(self) -> Dict[str, Any]:
        """List Linux applications by scanning .desktop files"""
        try:
            apps = []
            search_paths = ["/usr/share/applications", os.path.expanduser("~/.local/share/applications")]
            
            for base_path in search_paths:
                if not os.path.exists(base_path):
                    continue
                    
                for filename in os.listdir(base_path):
                    if filename.endswith(".desktop"):
                        path = os.path.join(base_path, filename)
                        try:
                            with open(path, 'r', errors='ignore') as f:
                                content = f.read()
                                name = ""
                                for line in content.splitlines():
                                    if line.startswith("Name="):
                                        name = line.split("=", 1)[1]
                                        break
                                if name:
                                    apps.append({"name": name, "path": path})
                        except:
                            continue
            
            # Remove duplicates and sort
            seen = set()
            unique_apps = []
            for app in apps:
                if app['name'] not in seen:
                    seen.add(app['name'])
                    unique_apps.append(app)
            
            unique_apps.sort(key=lambda x: x['name'].lower())
            return {"success": True, "apps": unique_apps, "platform": "linux"}
        except Exception as e:
            return {"success": False, "error": str(e), "platform": "linux"}


class MobileAdapter(PlatformAdapter):
    """Mobile adapter - delegates to device-specific native code"""
    
    def __init__(self):
        super().__init__()
        self.native_bridge_available = self._check_native_bridge()
    
    def _check_native_bridge(self) -> bool:
        """Check if native mobile bridge is available"""
        return os.environ.get("LUCA_NATIVE_BRIDGE") == "1"
    
    def _call_native(self, method: str, args: Dict[str, Any]) -> Dict[str, Any]:
        """Call native mobile bridge"""
        if not self.native_bridge_available:
            return {
                "success": False,
                "error": "Native bridge not available",
                "suggestion": "Use desktop Luca for this feature"
            }
        
        # TODO: Implement IPC to native mobile code
        # This would communicate with Flutter/React Native bridge
        return self.not_implemented(f"Mobile {method}")
    
    def play_music(self, song: str, app: str = "default") -> Dict[str, Any]:
        return self._call_native("playMusic", {"song": song, "app": app})
    
    def open_file(self, filename: str, directory: Optional[str] = None) -> Dict[str, Any]:
        return self._call_native("openFile", {"filename": filename, "directory": directory})
    
    def take_screenshot(self, path: str = "/tmp/screenshot.png") -> Dict[str, Any]:
        return self._call_native("takeScreenshot", {"path": path})

    def open_app(self, app_name: str) -> Dict[str, Any]:
        return self._call_native("openApp", {"appName": app_name})

    def close_app(self, app_name: str) -> Dict[str, Any]:
        return self._call_native("closeApp", {"appName": app_name})

    def check_permissions(self) -> Dict[str, Any]:
        return self._call_native("checkPermissions", {})

    def request_permissions(self) -> Dict[str, Any]:
        return self._call_native("requestPermissions", {})

    def list_installed_apps(self) -> Dict[str, Any]:
        return self._call_native("listInstalledApps", {})

    def get_battery(self) -> Dict[str, Any]:
        return self._call_native("getBattery", {})


# ============================================================================
# FACTORY FUNCTION
# ============================================================================

_adapter_cache: Optional[PlatformAdapter] = None

def get_adapter() -> PlatformAdapter:
    """
    Get the appropriate platform adapter (singleton pattern)
    """
    global _adapter_cache
    
    if _adapter_cache is not None:
        return _adapter_cache
    
    platform_name = PlatformDetector.get_platform()
    
    if platform_name == "macos":
        _adapter_cache = MacOSAdapter()
    elif platform_name == "windows":
        _adapter_cache = WindowsAdapter()
    elif platform_name == "linux":
        _adapter_cache = LinuxAdapter()
    elif platform_name in ["android", "ios"]:
        _adapter_cache = MobileAdapter()
    else:
        # Fallback: Try macOS adapter (might work on some Unix-likes)
        print(f"WARNING: Unknown platform {platform_name}, using macOS adapter")
        _adapter_cache = MacOSAdapter()
    
    print(f"[PLATFORM] Using {_adapter_cache.__class__.__name__} for {platform_name}")
    return _adapter_cache


# ============================================================================
# PUBLIC API - Platform-agnostic functions
# ============================================================================

def execute_tool(tool_name: str, **params) -> Dict[str, Any]:
    """
    Universal tool execution - works on any platform
    
    Usage:
        result = execute_tool("play_music", song="Shape of You", app="spotify")
        result = execute_tool("open_file", filename="report.pdf")
    """
    adapter = get_adapter()
    
    # Map tool names to adapter methods
    method_map = {
        "play_music": "play_music",
        "playMusic": "play_music",
        "open_file": "open_file",
        "openFile": "open_file",
        "take_screenshot": "take_screenshot",
        "takeScreenshot": "take_screenshot",
        "open_app": "open_app",
        "openApp": "open_app",
        "check_permissions": "check_permissions",
        "checkPermissions": "check_permissions",
        "request_permissions": "request_permissions",
        "requestPermissions": "request_permissions",
        "list_installed_apps": "list_installed_apps",
        "listInstalledApps": "list_installed_apps",
    }
    
    method_name = method_map.get(tool_name, tool_name)
    
    if not hasattr(adapter, method_name):
        return {
            "success": False,
            "error": f"Tool {tool_name} not found",
            "platform": adapter.platform
        }
    
    method = getattr(adapter, method_name)
    return method(**params)
