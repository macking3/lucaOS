"""
Linux Automation Library - Tier 1
Reusable shell/D-Bus scripts for common Linux applications
Similar to automation_library.py for macOS
"""

from typing import Dict, Any


class LinuxAutomationLibrary:
    """
    Tier 1: Pre-built automation templates for common Linux apps
    Fast, reliable, app-specific automation using D-Bus, xdotool, etc.
    """
    
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # SPOTIFY TEMPLATES (MPRIS D-Bus + xdotool)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    SPOTIFY_PLAY = """#!/bin/bash
# Smart Spotify launcher with polling
if ! pgrep -x spotify > /dev/null; then
    spotify &
    # Poll for window (max 15 seconds)
    timeout=30
    elapsed=0
    while [ $elapsed -lt $timeout ]; do
        sleep 0.5
        elapsed=$((elapsed + 1))
        if pgrep -x spotify > /dev/null; then
            # Wait for window to appear
            sleep 2
            break
        fi
    done
fi

if pgrep -x spotify > /dev/null; then
    # Bring to focus
    xdotool search --name "Spotify" windowactivate 2>/dev/null
    sleep 0.5
    
    # Search for song (Ctrl+L)
    xdotool key ctrl+l
    sleep 0.3
    xdotool type "{SONG}"
    sleep 0.2
    xdotool key Return
    
    echo "SUCCESS"
else
    echo "ERROR: Spotify not found"
fi
"""
    
    SPOTIFY_PAUSE = """#!/bin/bash
# Pause via MPRIS D-Bus
dbus-send --print-reply --dest=org.mpris.MediaPlayer2.spotify \
    /org/mpris/MediaPlayer2 org.mpris.MediaPlayer2.Player.PlayPause 2>/dev/null

if [ $? -eq 0 ]; then
    echo "SUCCESS"
else
    # Fallback: media key
    xdotool key XF86AudioPlay
    echo "SUCCESS"
fi
"""
    
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # CHROME TEMPLATES
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    CHROME_OPEN_URL = """#!/bin/bash
if pgrep -x chrome > /dev/null || pgrep -x chromium > /dev/null; then
    # Chrome already running, open in new tab
    google-chrome "{URL}" 2>/dev/null || chromium "{URL}" 2>/dev/null
else
    # Launch Chrome
    google-chrome "{URL}" 2>/dev/null || chromium "{URL}" 2>/dev/null &
fi
echo "SUCCESS"
"""
    
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # WHATSAPP TEMPLATES (Web or Desktop app)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    WHATSAPP_MESSAGE = """#!/bin/bash
# WhatsApp Desktop automation
if ! pgrep -f whatsapp > /dev/null; then
    # Check different possible installations
    if [ -x "/usr/bin/whatsapp-desktop" ]; then
        whatsapp-desktop &
    elif [ -x "/opt/WhatsApp/whatsapp-desktop" ]; then
        /opt/WhatsApp/whatsapp-desktop &
    else
        # Fallback to web
        xdg-open "https://web.whatsapp.com" &
    fi
    sleep 3
fi

if pgrep -f whatsapp > /dev/null || pgrep -f chrome > /dev/null; then
    # Bring to focus
    xdotool search --name "WhatsApp" windowactivate 2>/dev/null
    sleep 0.5
    
    # Open search (Ctrl+F or Ctrl+/)
    xdotool key ctrl+f
    sleep 0.3
    xdotool type "{CONTACT}"
    sleep 0.5
    xdotool key Return
    sleep 0.5
    xdotool type "{MESSAGE}"
    sleep 0.2
    xdotool key Return
    
    echo "SUCCESS"
else
    echo "ERROR: WhatsApp not found"
fi
"""
    
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # VS CODE TEMPLATES
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    VSCODE_OPEN_FILE = """#!/bin/bash
if ! pgrep -x code > /dev/null; then
    code "{FILE}" &
else
    code "{FILE}"
fi
echo "SUCCESS"
"""
    
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # FIREFOX TEMPLATES
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    FIREFOX_OPEN_URL = """#!/bin/bash
if pgrep -x firefox > /dev/null; then
    firefox --new-tab "{URL}" 2>/dev/null
else
    firefox "{URL}" 2>/dev/null &
fi
echo "SUCCESS"
"""
    
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # TELEGRAM TEMPLATES
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    TELEGRAM_MESSAGE = """#!/bin/bash
if ! pgrep -f telegram > /dev/null; then
    telegram-desktop &
    sleep 3
fi

if pgrep -f telegram > /dev/null; then
    xdotool search --name "Telegram" windowactivate
    sleep 0.5
    
    # Open search (Ctrl+F)
    xdotool key ctrl+f
    sleep 0.3
    xdotool type "{CONTACT}"
    sleep 0.5
    xdotool key Return
    sleep 0.5
    xdotool type "{MESSAGE}"
    sleep 0.2
    xdotool key Return
    
    echo "SUCCESS"
else
    echo "ERROR: Telegram not found"
fi
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
            "firefox": {
                "open_url": cls.FIREFOX_OPEN_URL,
            },
            "whatsapp": {
                "message": cls.WHATSAPP_MESSAGE,
            },
            "telegram": {
                "message": cls.TELEGRAM_MESSAGE,
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
