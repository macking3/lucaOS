"""
Linux Universal Automation - 3-Tier Orchestrator
Automatically selects best automation method for Linux apps
"""

import asyncio
from typing import Dict, Any


async def automate(action: str, app: str, **params) -> Dict[str, Any]:
    """
    LINUX 3-TIER UNIVERSAL AUTOMATION
    
    TIER 1: Bash/D-Bus Templates (Fast - 0.5-2s)
    TIER 2: Gemini Vision (Smart - 4-6s)
    TIER 3: Generic Launch (Fallback - 0.3s)
    
    Args:
        action: "play", "pause", "next", "message", etc.
        app: "spotify", "chrome", "whatsapp", etc.
        **params: Additional parameters (song, contact, message, url, etc.)
    
    Returns:
        Dict with success status and metadata
    """
    import time
    start_time = time.time()
    
    print(f"\n[LINUX AUTOMATION] Action: {action}, App: {app}")
    print(f"[LINUX AUTOMATION] Params: {params}")
    
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # TIER 1: Check for Bash/D-Bus Template
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    from linux_automation_library import LinuxAutomationLibrary
    
    if LinuxAutomationLibrary.has_template(app, action):
        print(f"[TIER 1] ⚡ Using bash/D-Bus template for {app}.{action}")
        
        try:
            # Get and execute template
            template = LinuxAutomationLibrary.get_template(app, action)
            script = LinuxAutomationLibrary.substitute_params(template, **params)
            
            # Execute bash script
            import subprocess
            import tempfile
            
            # Write to temp file and execute
            with tempfile.NamedTemporaryFile(mode='w', suffix='.sh', delete=False) as f:
                f.write(script)
                script_path = f.name
            
            result = subprocess.run(
                ["bash", script_path],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            # Cleanup
            import os
            os.unlink(script_path)
            
            elapsed = time.time() - start_time
            
            if result.returncode == 0 and "SUCCESS" in result.stdout:
                print(f"[TIER 1] ✅ Success in {elapsed:.2f}s")
                return {
                    "success": True,
                    "tier": 1,
                    "method": "bash_template",
                    "elapsed_seconds": elapsed,
                    "platform": "linux"
                }
            else:
                print(f"[TIER 1] ❌ Template failed: {result.stderr}")
                # Fall through to Tier 2
        except Exception as e:
            print(f"[TIER 1] ❌ Error: {e}")
            # Fall through to Tier 2
    else:
        print(f"[TIER 1] ⏭️  No template for {app}.{action}")
    
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # TIER 2: Gemini Vision (Universal)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    print(f"[TIER 2] 🤖 Using Gemini Vision for universal automation")
    
    try:
        from intelligent_automation import intelligent_automate
        
        # Build task description
        task_parts = [action]
        if "song" in params:
            task_parts.append(f"song: {params['song']}")
        if "contact" in params:
            task_parts.append(f"contact: {params['contact']}")
        if "message" in params:
            task_parts.append(f"message: {params['message']}")
        
        task_description = " ".join(task_parts)
        
        result = await intelligent_automate(app, task_description, params)
        elapsed = time.time() - start_time
        
        if result["success"]:
            print(f"[TIER 2] ✅ Success in {elapsed:.2f}s")
            return {
                **result,
                "tier": 2,
                "method": "gemini_vision",
                "elapsed_seconds": elapsed,
                "platform": "linux"
            }
        else:
            print(f"[TIER 2] ❌ Failed: {result.get('error')}")
            # Fall through to Tier 3
    except Exception as e:
        print(f"[TIER 2] ❌ Error: {e}")
        # Fall through to Tier 3
    
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # TIER 3: Generic Fallback
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    print(f"[TIER 3] 🔧 Attempting generic fallback")
    
    try:
        import subprocess
        
        if action == "launch" or action == "open":
            # Just launch the app
            subprocess.Popen([app], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            elapsed = time.time() - start_time
            return {
                "success": True,
                "tier": 3,
                "method": "generic_launch",
                "elapsed_seconds": elapsed,
                "platform": "linux"
            }
        
        elif action == "pause" or action == "play":
            # Try MPRIS D-Bus for any player
            cmd = [
                "dbus-send",
                "--print-reply",
                "--dest=org.mpris.MediaPlayer2.spotify",
                "/org/mpris/MediaPlayer2",
                "org.mpris.MediaPlayer2.Player.PlayPause"
            ]
            subprocess.run(cmd, stderr=subprocess.DEVNULL)
            elapsed = time.time() - start_time
            return {
                "success": True,
                "tier": 3,
                "method": "mpris_dbus",
                "elapsed_seconds": elapsed,
                "platform": "linux"
            }
        
        else:
            elapsed = time.time() - start_time
            return {
                "success": False,
                "error": f"No fallback available for action: {action}",
                "tier": 3,
                "elapsed_seconds": elapsed,
                "platform": "linux"
            }
    except Exception as e:
        elapsed = time.time() - start_time
        return {
            "success": False,
            "error": str(e),
            "tier": 3,
            "elapsed_seconds": elapsed,
            "platform": "linux"
        }


# Convenience functions
async def play_music(app: str, song: str) -> Dict[str, Any]:
    """Play music on Linux"""
    return await automate("play", app, song=song)


async def send_message(app: str, contact: str, message: str) -> Dict[str, Any]:
    """Send message on Linux"""
    return await automate("message", app, contact=contact, message=message)


async def open_url(browser: str, url: str) -> Dict[str, Any]:
    """Open URL on Linux"""
    return await automate("open_url", browser, url=url)
