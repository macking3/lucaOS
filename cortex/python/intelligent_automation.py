"""
Intelligent App Automation - Tier 2 (CROSS-PLATFORM)
Universal app control using Gemini Vision + AI planning
Works on macOS, Windows, and Linux!
"""

import os
import json
import base64
import asyncio
import platform
from pathlib import Path
import subprocess
from typing import Dict, List, Optional, Any
from platform_adapter import get_adapter

# Gemini API
import google.generativeai as genai

# Configure Gemini
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


class IntelligentAutomation:
    """
    Universal app automation using Gemini Vision
    Falls back when no custom template exists
    NOW CROSS-PLATFORM: macOS, Windows, Linux!
    """
    
    def __init__(self):
        self.model = genai.GenerativeModel('gemini-2.0-flash-exp')
        self.action_cache = {}  # Cache successful action sequences
        
        # Initialize platform adapter
        self.adapter = get_adapter()
        self.platform = self.adapter.platform
        
        print(f"[INTELLIGENT] Initialized for platform: {self.platform}")
    
    async def automate_app_task(
        self, 
        app_name: str, 
        task_description: str, 
        params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Main entry point for intelligent automation
        
        Args:
            app_name: Name of the app (e.g., "YouTube Music")
            task_description: What to do (e.g., "search and play")
            params: Parameters like {"song": "Lo-fi beats"}
        
        Returns:
            Dict with success status and details
        """
        print(f"\n[INTELLIGENT] Starting automation for {app_name}")
        print(f"[INTELLIGENT] Task: {task_description}")
        print(f"[INTELLIGENT] Params: {params}")
        
        try:
            # Step 1: Launch app with generic fallback
            await self._ensure_app_running(app_name)
            
            # Step 2: Capture screen
            screenshot_path = await self._capture_screenshot()
            
            # Step 3: Get action plan from Gemini
            action_plan = await self._get_action_plan(
                app_name, 
                task_description, 
                params, 
                screenshot_path
            )
            
            # Step 4: Execute actions
            result = await self._execute_action_plan(action_plan)
            
            # Step 5: Cache successful pattern
            if result["success"]:
                self._cache_action_pattern(app_name, task_description, action_plan)
            
            return result
            
        except Exception as e:
            print(f"[INTELLIGENT] ❌ Error: {e}")
            return {"success": False, "error": str(e)}
    
    async def _ensure_app_running(self, app_name: str):
        """Launch app and wait until ready (CROSS-PLATFORM via adapter)"""
        print(f"[INTELLIGENT] Launching {app_name} via platform adapter...")
        
        result = self.adapter.open_app(app_name)
        
        if not result.get("success"):
            print(f"[INTELLIGENT] ⚠️ Failed to launch {app_name} via adapter: {result.get('error')}")
            # Continue anyway, it might already be running or we can try simple subprocess
            try:
                subprocess.Popen([app_name], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            except:
                pass
        
        print(f"[INTELLIGENT] ✅ {app_name} launch triggered")
        await asyncio.sleep(1.0)  # Delay to ensure UI is stable
    
    async def _capture_screenshot(self) -> str:
        """Capture current screen and return path (CROSS-PLATFORM via adapter)"""
        print(f"[INTELLIGENT] 📸 Capturing screenshot via platform adapter...")
        
        # Determine appropriate temp path
        if self.platform == "windows":
            screenshot_path = "C:\\Temp\\luca_intelligent_automation.png"
            os.makedirs("C:\\Temp", exist_ok=True)
        else:
            # Use /tmp for macOS/Linux
            screenshot_path = "/tmp/luca_intelligent_automation.png"
            
        result = self.adapter.take_screenshot(screenshot_path)
        
        if not result.get("success"):
            raise Exception(f"Failed to capture screenshot: {result.get('error')}")
            
        final_path = result.get("path", screenshot_path)
        print(f"[INTELLIGENT] Screenshot saved: {final_path}")
        return final_path
    
    async def _get_action_plan(
        self, 
        app_name: str, 
        task_description: str, 
        params: Dict[str, Any],
        screenshot_path: str
    ) -> List[Dict[str, Any]]:
        """
        Send screenshot to Gemini and get action plan
        """
        print("[INTELLIGENT] 🤖 Asking Gemini for action plan...")
        
        # Read screenshot
        with open(screenshot_path, "rb") as f:
            screenshot_data = base64.b64encode(f.read()).decode('utf-8')
        
        # Build prompt
        prompt = f"""You are an expert at analyzing macOS application UIs and planning automation sequences.

APPLICATION: {app_name}

TASK: {task_description}

PARAMETERS: {json.dumps(params, indent=2)}

Analyze this screenshot and provide a PRECISE step-by-step action plan to complete the task.

For each step, specify:
- action: "click", "type", "press", "wait", or "scroll"
- description: Brief explanation
- coordinates: {{x, y}} for clicks (approximate center of element)
- value: Text to type or key name for press actions
- duration: Seconds for wait actions

IMPORTANT UI ANALYSIS GUIDELINES:
1. Search fields are usually in top-right or top-center
2. Play buttons are usually near search results or song titles
3. Common keyboard shortcuts:
   - Cmd+F = Search
   - Return/Enter = Execute search or play
   - Space = Play/Pause
4. Identify UI elements by their visual appearance and position
5. If you see a search icon (magnifying glass), use it
6. If you see text fields, they're likely for search/input

Return ONLY a JSON array of actions, no other text:
[
  {{"action": "click", "description": "Click search icon", "coordinates": {{"x": 850, "y": 45}}}},
  {{"action": "type", "description": "Type song name", "value": "song name here"}},
  {{"action": "press", "description": "Execute search", "value": "return"}},
  {{"action": "wait", "description": "Wait for results", "duration": 1}},
  {{"action": "click", "description": "Click first result", "coordinates": {{"x": 400, "y": 200}}}}
]

Be specific with coordinates. Base them on visible elements in the screenshot.
"""
        
        # Call Gemini with vision
        response = self.model.generate_content([
            prompt,
            {
                "mime_type": "image/png",
                "data": screenshot_data
            }
        ])
        
        # Parse response
        response_text = response.text.strip()
        
        # Extract JSON (remove markdown code blocks if present)
        if response_text.startswith("```"):
            # Remove ```json and ```
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
        
        action_plan = json.loads(response_text.strip())
        
        print(f"[INTELLIGENT] 📋 Gemini planned {len(action_plan)} actions:")
        for i, action in enumerate(action_plan, 1):
            print(f"  {i}. {action['action']}: {action['description']}")
        
        return action_plan
    
    async def _execute_action_plan(self, action_plan: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Execute each action in the plan"""
        print("\n[INTELLIGENT] 🎯 Executing action plan...")
        
        for i, action in enumerate(action_plan, 1):
            action_type = action["action"]
            description = action.get("description", "")
            
            print(f"[INTELLIGENT] Step {i}/{len(action_plan)}: {description}")
            
            try:
                if action_type == "click":
                    coords = action["coordinates"]
                    await self._click_at(coords["x"], coords["y"])
                
                elif action_type == "type":
                    await self._type_text(action["value"])
                
                elif action_type == "press":
                    await self._press_key(action["value"])
                
                elif action_type == "wait":
                    duration = action.get("duration", 1)
                    await asyncio.sleep(duration)
                
                elif action_type == "scroll":
                    direction = action.get("direction", "down")
                    amount = action.get("amount", 3)
                    await self._scroll(direction, amount)
                
                # Small delay between actions for stability
                await asyncio.sleep(0.2)
                
            except Exception as e:
                print(f"[INTELLIGENT] ⚠️ Action {i} failed: {e}")
                # Continue with next action
        
        print("[INTELLIGENT] ✅ Action plan completed!")
        return {"success": True, "actions_executed": len(action_plan)}
    
    async def _click_at(self, x: int, y: int):
        """Click at specific coordinates (DELEGATED TO ADAPTER)"""
        print(f"  → Clicking at ({x}, {y})")
        
        # Most adapters have mouse control via their automation property
        # or we can use the unified execute_tool approach if available
        if hasattr(self.adapter, 'automation'):
            # Tier 1 automation (Windows/Linux)
            self.adapter.automation.click(x, y)
        else:
            # macOS fallback or others
            try:
                import pyautogui
                pyautogui.click(x, y)
            except ImportError:
                # Last resort AppleScript for Mac
                if self.platform == "macos":
                    script = f'tell application "System Events" to click at {{{x}, {y}}}'
                    subprocess.run(["osascript", "-e", script])
                else:
                    print(f"[INTELLIGENT] ❌ No click capability for {self.platform}")
    
    async def _type_text(self, text: str):
        """Type text using keyboard automation (DELEGATED TO ADAPTER)"""
        print(f"  → Typing: {text}")
        
        if hasattr(self.adapter, 'automation'):
            self.adapter.automation.type_text(text)
        else:
            # macOS fallback
            try:
                import pyautogui
                pyautogui.write(text, interval=0.05)
            except ImportError:
                if self.platform == "macos":
                    script = f'tell application "System Events" to keystroke "{text}"'
                    subprocess.run(["osascript", "-e", script])
                else:
                    print(f"[INTELLIGENT] ❌ No type capability for {self.platform}")
    
    async def _press_key(self, key: str):
        """Press a keyboard key (DELEGATED TO ADAPTER)"""
        print(f"  → Pressing: {key}")
        
        if hasattr(self.adapter, 'automation'):
            self.adapter.automation.press_key(key)
        else:
            try:
                import pyautogui
                pyautogui.press(key)
            except ImportError:
                # Last resort AppleScript for Mac
                if self.platform == "macos":
                    # Map common key names
                    key_map = {
                        "return": "return",
                        "enter": "return",
                        "space": "space",
                        "tab": "tab",
                        "escape": "escape",
                        "esc": "escape"
                    }
                    applescript_key = key_map.get(key.lower(), key)
                    script = f'tell application "System Events" to keystroke {applescript_key}'
                    subprocess.run(["osascript", "-e", script])
                else:
                    print(f"[INTELLIGENT] ❌ No key capability for {self.platform}")
    
    async def _scroll(self, direction: str, amount: int):
        """Scroll in a direction (DELEGATED TO ADAPTER)"""
        print(f"  → Scrolling {direction} ({amount} units)")
        
        if hasattr(self.adapter, 'automation'):
            self.adapter.automation.scroll(direction, amount)
        else:
            try:
                import pyautogui
                if direction == "down":
                    pyautogui.scroll(-amount * 100)
                else:
                    pyautogui.scroll(amount * 100)
            except ImportError:
                print(f"[INTELLIGENT] ❌ No scroll capability for {self.platform}")
    
    def _cache_action_pattern(self, app_name: str, task: str, actions: List[Dict]):
        """Cache successful action sequences for future speedup"""
        cache_key = f"{app_name}:{task}"
        self.action_cache[cache_key] = actions
        print(f"[INTELLIGENT] 💾 Cached pattern for: {cache_key}")


# Global instance
intelligent_automation = IntelligentAutomation()


# Public API
async def intelligent_automate(app_name: str, task: str, **params) -> Dict[str, Any]:
    """
    Intelligently automate any app using Gemini Vision
    
    Usage:
        result = await intelligent_automate(
            "YouTube Music",
            "search and play music",
            song="Lo-fi beats"
        )
    """
    return await intelligent_automation.automate_app_task(app_name, task, params)
