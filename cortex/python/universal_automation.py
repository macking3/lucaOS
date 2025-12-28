"""
3-Tier Automation System Integration
Combines custom templates, intelligent automation, and generic fallback
"""

import asyncio
from typing import Dict, Any, Optional
from automation_library import get_automation_script, APPLESCRIPT_TEMPLATES
from intelligent_automation import intelligent_automate
from platform_adapter import get_adapter


class UniversalAutomation:
    """
    3-Tier automation system:
    - Tier 1: Custom templates (fastest, most reliable)
    - Tier 2: Gemini Vision (universal, intelligent)
    - Tier 3: Generic launch (simple, always works)
    """
    
    def __init__(self):
        # Initialize platform adapter
        self.adapter = get_adapter()
        self.platform = self.adapter.platform
        # Track which tier was used for analytics
        self.tier_usage = {"tier1": 0, "tier2": 0, "tier3": 0}
    
    async def execute_automation(
        self,
        action: str,
        app: str,
        **params
    ) -> Dict[str, Any]:
        """
        Main entry point for all automation
        Automatically chooses best tier
        
        Args:
            action: What to do (e.g., "play", "message", "open_url")
            app: Which app (e.g., "spotify", "whatsapp")
            **params: Action parameters (e.g., song="Shape of You")
        
        Returns:
            Dict with success status, tier used, and timing info
        """
        import time
        start_time = time.time()
        
        print(f"\n[UNIVERSAL] Automation request:")
        print(f"  Action: {action}")
        print(f"  App: {app}")
        print(f"  Params: {params}")
        
        # Normalize app name
        app_normalized = app.lower().replace(" ", "_")
        key = (action, app_normalized)
        
        # Tier 1: Check for custom template
        if self._has_custom_template(key):
            print(f"[UNIVERSAL] ✅ Using Tier 1: Custom Template")
            result = await self._execute_tier1(action, app, params)
            self.tier_usage["tier1"] += 1
            tier = 1
 
        # Tier 2: Use intelligent automation if action needs UI interaction
        elif self._needs_ui_interaction(action):
            print(f"[UNIVERSAL] 🤖 Using Tier 2: Gemini Vision")
            result = await self._execute_tier2(action, app, params)
            self.tier_usage["tier2"] += 1
            tier = 2
        
        # Tier 3: Generic launch fallback
        else:
            print(f"[UNIVERSAL] 🚀 Using Tier 3: Generic Launch")
            result = await self._execute_tier3(app, params)
            self.tier_usage["tier3"] += 1
            tier = 3
        
        elapsed = time.time() - start_time
        
        print(f"[UNIVERSAL] ⏱️  Completed in {elapsed:.2f}s (Tier {tier})")
        print(f"[UNIVERSAL] Result: {result['success']}")
        
        return {
            **result,
            "tier": tier,
            "elapsed_seconds": elapsed,
            "tier_stats": self.tier_usage.copy()
        }
    
    def _has_custom_template(self, key: tuple) -> bool:
        """Check if a custom template exists"""
        script_map = {
            ("play", "spotify"): True,
            ("play", "apple_music"): True,
            ("pause", "spotify"): True,
            ("next", "spotify"): True,
            ("message", "whatsapp"): True,
            ("message", "telegram"): True,
            ("message", "discord"): True,
            ("open_url", "chrome"): True,
            ("open_url", "safari"): True,
            ("open_url", "firefox"): True,
            ("open", "vscode"): True,
            ("create_note", "notes"): True,
            ("open", "calculator"): True,
            ("open_folder", "finder"): True,
        }
        return script_map.get(key, False)
    
    def _needs_ui_interaction(self, action: str) -> bool:
        """Determine if action needs UI interaction"""
        # Actions that require more than just launching
        interactive_actions = [
            "play", "search", "message", "call", 
            "create", "edit", "send", "type"
        ]
        return action.lower() in interactive_actions
    
    async def _execute_tier1(
        self, 
        action: str, 
        app: str, 
        params: Dict
    ) -> Dict[str, Any]:
        """Execute using custom template or adapter-specific logic"""
        import subprocess
        
        try:
            # First, check if the adapter can handle this directly (highest reliability)
            # This allows WindowsAdapter/LinuxAdapter to provide native implementations
            if action == "play" and hasattr(self.adapter, "play_music"):
                result = self.adapter.play_music(params.get("song", ""), app)
                if result.get("success"):
                    return {**result, "method": "adapter_native"}
            
            # Fallback to templates if it's macOS or if we have a template
            if self.platform == "macos":
                script = get_automation_script(action, app, **params)
                result = subprocess.run(
                    ["osascript", "-e", script],
                    capture_output=True,
                    text=True,
                    timeout=30
                )
                if result.returncode == 0:
                    return {
                        "success": True,
                        "method": "custom_template",
                        "output": result.stdout
                    }
            
            # If we reach here, Tier 1 failed or wasn't applicable, try Tier 2
            print(f"[TIER 1] Falling back to Tier 2 for {action} on {app}")
            return await self._execute_tier2(action, app, params)
                
        except Exception as e:
            print(f"[TIER 1] Error: {e}")
            return {"success": False, "error": str(e)}
    
    async def _execute_tier2(
        self, 
        action: str, 
        app: str, 
        params: Dict
    ) -> Dict[str, Any]:
        """Execute using Gemini Vision"""
        try:
            # Build task description
            task_desc = self._build_task_description(action, params)
            
            # Call intelligent automation
            result = await intelligent_automate(app, task_desc, **params)
            
            return {
                **result,
                "method": "intelligent_vision"
            }
            
        except Exception as e:
            print(f"[TIER 2] Error: {e}")
            # Fall back to Tier 3
            print(f"[TIER 2] Falling back to Tier 3")
            return await self._execute_tier3(app, params)
    
    async def _execute_tier3(
        self, 
        app: str, 
        params: Dict
    ) -> Dict[str, Any]:
        """Execute using generic launch (CROSS-PLATFORM via adapter)"""
        import subprocess
        
        try:
            # Use adapter to open app if possible
            if hasattr(self.adapter, "automation") and hasattr(self.adapter.automation, "open_app"):
                result = self.adapter.automation.open_app(app)
                if result.get("success"):
                    return {**result, "method": "adapter_launch"}

            # Fallback to macOS-specific launch
            if self.platform == "macos":
                script = get_automation_script("launch", app, app=app)
                result = subprocess.run(
                    ["osascript", "-e", script],
                    capture_output=True,
                    text=True,
                    timeout=15
                )
                if result.returncode == 0:
                    return {
                        "success": True,
                        "method": "generic_launch",
                        "message": f"{app} launched"
                    }
            
            # Last resort: generic subprocess call of the app name
            try:
                subprocess.Popen([app], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                return {"success": True, "method": "subprocess_launch", "message": f"Attempted to launch {app}"}
            except:
                return {"success": False, "error": f"Failed to launch {app} on {self.platform}"}
                
        except Exception as e:
            print(f"[TIER 3] Error: {e}")
            return {"success": False, "error": str(e)}
    
    def _build_task_description(self, action: str, params: Dict) -> str:
        """Convert action + params into natural task description"""
        if action == "play":
            song = params.get("song") or params.get("songInfo", "music")
            return f"search for and play '{song}'"
        
        elif action == "message":
            contact = params.get("contact") or params.get("contactName", "")
            message = params.get("message", "")
            return f"send message to {contact}: {message}"
        
        elif action == "search":
            query = params.get("query", "")
            return f"search for: {query}"
        
        elif action == "open_url":
            url = params.get("url", "")
            return f"open URL: {url}"
        
        else:
            return f"{action} with params: {params}"


# Global instance
universal_automation = UniversalAutomation()


# Public API
async def automate(action: str, app: str, **params) -> Dict[str, Any]:
    """
    Universal automation - automatically chooses best method
    
    Usage:
        # Tier 1 (custom): Fast and reliable
        result = await automate("play", "spotify", song="Shape of You")
        
        # Tier 2 (intelligent): Works for any app
        result = await automate("play", "YouTube Music", song="Lo-fi beats")
        
        # Tier 3 (generic): Just launches
        result = await automate("open", "MyCustomApp")
    """
    return await universal_automation.execute_automation(action, app, **params)


# Convenience functions
async def play_music(app: str, song: str) -> Dict[str, Any]:
    """Shortcut for playing music"""
    return await automate("play", app, song=song)


async def send_message(app: str, contact: str, message: str) -> Dict[str, Any]:
    """Shortcut for sending messages"""
    return await automate("message", app, contact=contact, message=message)


async def open_url(browser: str, url: str) -> Dict[str, Any]:
    """Shortcut for opening URLs"""
    return await automate("open_url", browser, url=url)
