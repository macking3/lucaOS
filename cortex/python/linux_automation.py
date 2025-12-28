"""
Linux-Specific Automation Implementation
Uses D-Bus, xdg-utils, and X11/Wayland tools for system control
"""

import subprocess
import os
from typing import Dict, Any, Optional
import shutil


class LinuxAutomation:
    """Linux platform automation using D-Bus, xdg-utils, and system tools"""
    
    @staticmethod
    def click(x: int, y: int):
        """Click at coordinates using xdotool"""
        if LinuxAutomation.command_exists("xdotool"):
            LinuxAutomation.run_command(["xdotool", "mousemove", str(x), str(y), "click", "1"])
        else:
            print("[LINUX] ⚠️ xdotool not found for click")

    @staticmethod
    def type_text(text: str):
        """Type text using xdotool"""
        if LinuxAutomation.command_exists("xdotool"):
            LinuxAutomation.run_command(["xdotool", "type", text])
        else:
            print("[LINUX] ⚠️ xdotool not found for type")

    @staticmethod
    def press_key(key: str):
        """Press a key using xdotool"""
        if LinuxAutomation.command_exists("xdotool"):
            # Map common names
            key_map = {"enter": "Return", "return": "Return", "esc": "Escape"}
            xd_key = key_map.get(key.lower(), key)
            LinuxAutomation.run_command(["xdotool", "key", xd_key])
        else:
            print("[LINUX] ⚠️ xdotool not found for key press")

    @staticmethod
    def scroll(direction: str, amount: int):
        """Scroll using xdotool"""
        if LinuxAutomation.command_exists("xdotool"):
            # Button 4 is scroll up, Button 5 is scroll down
            button = "4" if direction == "up" else "5"
            for _ in range(amount):
                LinuxAutomation.run_command(["xdotool", "click", button])
        else:
            print("[LINUX] ⚠️ xdotool not found for scroll")
    
    @staticmethod
    def run_command(cmd: list, timeout: int = 30) -> Dict[str, Any]:
        """Execute shell command and return result"""
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=timeout
            )
            return {
                "success": result.returncode == 0,
                "stdout": result.stdout,
                "stderr": result.stderr
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    @staticmethod
    def command_exists(cmd: str) -> bool:
        """Check if a command exists on the system"""
        return shutil.which(cmd) is not None
    
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # MUSIC CONTROL (via MPRIS D-Bus)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    @staticmethod
    def play_music(song: str, app: str = "spotify") -> Dict[str, Any]:
        """Play music using MPRIS D-Bus interface"""
        
        if app.lower() == "spotify":
            return LinuxAutomation._control_spotify(song, "play")
        else:
            # Try generic MPRIS control
            return LinuxAutomation._mpris_control(app, "Play")
    
    @staticmethod
    def _control_spotify(song: str, action: str = "play") -> Dict[str, Any]:
        """Control Spotify via D-Bus and keyboard automation"""
        
        # First, ensure Spotify is running
        if not LinuxAutomation.command_exists("spotify"):
            return {"success": False, "error": "Spotify not installed", "platform": "linux"}
        
        # Check if Spotify is running
        check = LinuxAutomation.run_command(["pgrep", "-x", "spotify"])
        if not check["success"]:
            # Start Spotify
            subprocess.Popen(["spotify"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            import time
            time.sleep(3)
        
        # Use xdotool for UI automation (if available)
        if LinuxAutomation.command_exists("xdotool"):
            # Bring Spotify to focus
            LinuxAutomation.run_command(["xdotool", "search", "--name", "Spotify", "windowactivate"])
            import time
            time.sleep(0.5)
            
            # Send Ctrl+L for search
            LinuxAutomation.run_command(["xdotool", "key", "ctrl+l"])
            time.sleep(0.3)
            
            # Type song name
            LinuxAutomation.run_command(["xdotool", "type", song])
            time.sleep(0.2)
            
            # Press Enter
            LinuxAutomation.run_command(["xdotool", "key", "Return"])
            
            return {"success": True, "message": f"Playing {song} on Spotify", "platform": "linux"}
        else:
            return {
                "success": False,
                "error": "xdotool not installed. Install with: sudo apt install xdotool",
                "platform": "linux"
            }
    
    @staticmethod
    def _mpris_control(player: str, command: str) -> Dict[str, Any]:
        """Control media player via MPRIS D-Bus"""
        player_name = f"org.mpris.MediaPlayer2.{player}"
        
        cmd = [
            "dbus-send",
            "--print-reply",
            f"--dest={player_name}",
            "/org/mpris/MediaPlayer2",
            f"org.mpris.MediaPlayer2.Player.{command}"
        ]
        
        result = LinuxAutomation.run_command(cmd)
        if result["success"]:
            return {"success": True, "message": f"{command} executed", "platform": "linux"}
        else:
            return {"success": False, "error": result["stderr"], "platform": "linux"}
    
    @staticmethod
    def pause_media() -> Dict[str, Any]:
        """Pause media playback"""
        # Try common players
        players = ["spotify", "vlc", "rhythmbox"]
        
        for player in players:
            result = LinuxAutomation._mpris_control(player, "Pause")
            if result["success"]:
                return result
        
        return {"success": False, "error": "No active media player found", "platform": "linux"}
    
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # FILE OPERATIONS
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    @staticmethod
    def open_file(filename: str, directory: Optional[str] = None) -> Dict[str, Any]:
        """Open file using xdg-open"""
        try:
            if directory:
                full_path = os.path.join(directory, filename)
            else:
                # Search common locations
                search_dirs = [
                    os.path.expanduser("~/Documents"),
                    os.path.expanduser("~/Desktop"),
                    os.path.expanduser("~/Downloads"),
                ]
                full_path = None
                for search_dir in search_dirs:
                    potential_path = os.path.join(search_dir, filename)
                    if os.path.exists(potential_path):
                        full_path = potential_path
                        break
                
                if not full_path:
                    return {"success": False, "error": f"File not found: {filename}", "platform": "linux"}
            
            result = LinuxAutomation.run_command(["xdg-open", full_path])
            if result["success"]:
                return {"success": True, "path": full_path, "platform": "linux"}
            else:
                return {"success": False, "error": result["stderr"], "platform": "linux"}
        except Exception as e:
            return {"success": False, "error": str(e), "platform": "linux"}
    
    @staticmethod
    def create_folder(folder_name: str, location: Optional[str] = None) -> Dict[str, Any]:
        """Create new folder"""
        try:
            if location is None:
                location = os.path.expanduser("~/Desktop")
            
            full_path = os.path.join(location, folder_name)
            os.makedirs(full_path, exist_ok=True)
            return {"success": True, "path": full_path, "platform": "linux"}
        except Exception as e:
            return {"success": False, "error": str(e), "platform": "linux"}
    
    @staticmethod
    def delete_file(filename: str, directory: Optional[str] = None) -> Dict[str, Any]:
        """Move file to trash (safe delete)"""
        try:
            if directory:
                full_path = os.path.join(directory, filename)
            else:
                # Find file
                search_dirs = [
                    os.path.expanduser("~/Documents"),
                    os.path.expanduser("~/Desktop"),
                    os.path.expanduser("~/Downloads"),
                ]
                full_path = None
                for search_dir in search_dirs:
                    potential_path = os.path.join(search_dir, filename)
                    if os.path.exists(potential_path):
                        full_path = potential_path
                        break
                
                if not full_path:
                    return {"success": False, "error": f"File not found: {filename}", "platform": "linux"}
            
            # Use trash-cli if available, otherwise use gio trash
            if LinuxAutomation.command_exists("trash-put"):
                result = LinuxAutomation.run_command(["trash-put", full_path])
            elif LinuxAutomation.command_exists("gio"):
                result = LinuxAutomation.run_command(["gio", "trash", full_path])
            else:
                return {
                    "success": False,
                    "error": "No trash utility found. Install trash-cli or use gio",
                    "platform": "linux"
                }
            
            if result["success"]:
                return {"success": True, "message": f"{filename} moved to trash", "platform": "linux"}
            else:
                return {"success": False, "error": result["stderr"], "platform": "linux"}
        except Exception as e:
            return {"success": False, "error": str(e), "platform": "linux"}
    
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # SCREENSHOT
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    @staticmethod
    def take_screenshot(path: str = "/tmp/screenshot.png") -> Dict[str, Any]:
        """Take screenshot using available tools"""
        
        # Try different screenshot tools in order of preference
        tools = [
            (["gnome-screenshot", "-f", path], "gnome-screenshot"),
            (["scrot", path], "scrot"),
            (["spectacle", "-b", "-o", path], "spectacle"),  # KDE
            (["import", "-window", "root", path], "imagemagick"),  # ImageMagick
        ]
        
        for cmd, tool_name in tools:
            if LinuxAutomation.command_exists(cmd[0]):
                result = LinuxAutomation.run_command(cmd)
                if result["success"]:
                    return {"success": True, "path": path, "tool": tool_name, "platform": "linux"}
        
        return {
            "success": False,
            "error": "No screenshot tool found. Install: gnome-screenshot, scrot, spectacle, or imagemagick",
            "platform": "linux"
        }
    
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # MESSAGING
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    @staticmethod
    def send_message(app: str, contact: str, message: str) -> Dict[str, Any]:
        """Send message via desktop app using xdotool"""
        
        if not LinuxAutomation.command_exists("xdotool"):
            return {
                "success": False,
                "error": "xdotool not installed. Install with: sudo apt install xdotool",
                "platform": "linux"
            }
        
        try:
            import time
            
            # Find and activate app window
            LinuxAutomation.run_command(["xdotool", "search", "--name", app, "windowactivate"])
            time.sleep(0.5)
            
            # Open search (Ctrl+F or Ctrl+K)
            LinuxAutomation.run_command(["xdotool", "key", "ctrl+f"])
            time.sleep(0.3)
            
            # Type contact name
            LinuxAutomation.run_command(["xdotool", "type", contact])
            time.sleep(0.5)
            LinuxAutomation.run_command(["xdotool", "key", "Return"])
            time.sleep(0.5)
            
            # Type message
            LinuxAutomation.run_command(["xdotool", "type", message])
            time.sleep(0.2)
            LinuxAutomation.run_command(["xdotool", "key", "Return"])
            
            return {"success": True, "message": f"Message sent via {app}", "platform": "linux"}
        except Exception as e:
            return {"success": False, "error": str(e), "platform": "linux"}
    
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # SYSTEM CONTROL
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    @staticmethod
    def lock_screen() -> Dict[str, Any]:
        """Lock screen (works on GNOME, KDE, XFCE)"""
        # Try different desktop environments
        lock_commands = [
            ["gnome-screensaver-command", "-l"],  # GNOME
            ["qdbus", "org.freedesktop.ScreenSaver", "/ScreenSaver", "Lock"],  # KDE
            ["xflock4"],  # XFCE
            ["loginctl", "lock-session"],  # systemd
        ]
        
        for cmd in lock_commands:
            if LinuxAutomation.command_exists(cmd[0]):
                result = LinuxAutomation.run_command(cmd)
                if result["success"]:
                    return {"success": True, "message": "Screen locked", "platform": "linux"}
        
        return {"success": False, "error": "No lock command found", "platform": "linux"}
    
    @staticmethod
    def sleep_system() -> Dict[str, Any]:
        """Put system to sleep"""
        # Try systemctl first, then pm-suspend
        if LinuxAutomation.command_exists("systemctl"):
            result = LinuxAutomation.run_command(["systemctl", "suspend"])
        elif LinuxAutomation.command_exists("pm-suspend"):
            result = LinuxAutomation.run_command(["sudo", "pm-suspend"])
        else:
            return {"success": False, "error": "No sleep command found", "platform": "linux"}
        
        return {"success": result["success"], "message": "System sleeping", "platform": "linux"}
    
    @staticmethod
    def open_app(app_name: str) -> Dict[str, Any]:
        """Open an application"""
        # Try to launch app
        try:
            subprocess.Popen([app_name], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return {"success": True, "message": f"Opened {app_name}", "platform": "linux"}
        except Exception as e:
            return {"success": False, "error": str(e), "platform": "linux"}
    
    @staticmethod
    def close_app(app_name: str) -> Dict[str, Any]:
        """Close an application"""
        result = LinuxAutomation.run_command(["pkill", "-x", app_name])
        if result["success"]:
            return {"success": True, "message": f"Closed {app_name}", "platform": "linux"}
        else:
            return {"success": False, "error": f"App {app_name} not running", "platform": "linux"}
