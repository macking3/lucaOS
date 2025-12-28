"""
Hybrid File Operations System
Combines fast direct operations with AI-powered complex file management
"""

import os
import subprocess
import shutil
from pathlib import Path
from typing import Dict, List, Optional, Any
import asyncio


class HybridFileOperations:
    """
    Hybrid file management:
    - Simple operations (open, create, delete) → Direct execution
    - Complex operations (organize, batch rename) → Gemini Vision
    """
    
    def __init__(self):
        self.common_locations = [
            os.path.expanduser("~/Documents"),
            os.path.expanduser("~/Desktop"),
            os.path.expanduser("~/Downloads"),
            os.path.expanduser("~/"),
        ]
    
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # TIER 1: Simple Direct Operations (Fast)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    def open_file(self, filename: str, directory: Optional[str] = None) -> Dict[str, Any]:
        """
        Open a file in its default application
        
        Examples:
            open_file("report.pdf")
            open_file("notes.txt", "~/Documents")
        """
        print(f"[FILE] Opening file: {filename}")
        
        # Find file
        file_path = self._find_file(filename, directory)
        
        if not file_path:
            return {
                "success": False, 
                "error": f"File not found: {filename}",
                "searched": self.common_locations
            }
        
        # Open with default app (macOS)
        try:
            subprocess.run(["open", file_path], check=True)
            print(f"[FILE] ✅ Opened: {file_path}")
            return {"success": True, "path": file_path, "method": "direct"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def create_folder(self, folder_name: str, location: Optional[str] = None) -> Dict[str, Any]:
        """
        Create a new folder
        
        Examples:
            create_folder("ProjectX")
            create_folder("NewFolder", "~/Documents")
        """
        if location is None:
            location = "~/Desktop"
        
        full_path = os.path.expanduser(f"{location}/{folder_name}")
        print(f"[FILE] Creating folder: {full_path}")
        
        try:
            os.makedirs(full_path, exist_ok=True)
            print(f"[FILE] ✅ Created: {full_path}")
            return {"success": True, "path": full_path, "method": "direct"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def delete_file(self, filename: str, directory: Optional[str] = None) -> Dict[str, Any]:
        """
        Safely move file to trash (not permanent delete!)
        
        Examples:
            delete_file("old_notes.txt")
            delete_file("temp.pdf", "~/Downloads")
        """
        print(f"[FILE] Deleting file: {filename}")
        
        # Find file
        file_path = self._find_file(filename, directory)
        
        if not file_path:
            return {"success": False, "error": f"File not found: {filename}"}
        
        # Move to trash (safe delete)
        try:
            # macOS: use osascript to move to trash
            script = f'''
            tell application "Finder"
                delete POSIX file "{file_path}"
            end tell
            '''
            result = subprocess.run(
                ["osascript", "-e", script],
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                print(f"[FILE] ✅ Moved to trash: {file_path}")
                return {
                    "success": True, 
                    "message": f"{filename} moved to trash",
                    "path": file_path,
                    "method": "direct"
                }
            else:
                raise Exception(result.stderr)
                
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def copy_file(self, filename: str, destination: str) -> Dict[str, Any]:
        """Copy a file to a new location"""
        file_path = self._find_file(filename)
        
        if not file_path:
            return {"success": False, "error": f"File not found: {filename}"}
        
        dest_path = os.path.expanduser(destination)
        
        try:
            shutil.copy2(file_path, dest_path)
            return {"success": True, "from": file_path, "to": dest_path, "method": "direct"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def move_file(self, filename: str, destination: str) -> Dict[str, Any]:
        """Move a file to a new location"""
        file_path = self._find_file(filename)
        
        if not file_path:
            return {"success": False, "error": f"File not found: {filename}"}
        
        dest_path = os.path.expanduser(destination)
        
        try:
            shutil.move(file_path, dest_path)
            return {"success": True, "from": file_path, "to": dest_path, "method": "direct"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def list_files(self, directory: str, pattern: Optional[str] = None) -> Dict[str, Any]:
        """List files in a directory"""
        dir_path = os.path.expanduser(directory)
        
        if not os.path.exists(dir_path):
            return {"success": False, "error": f"Directory not found: {directory}"}
        
        try:
            files = []
            for item in os.listdir(dir_path):
                item_path = os.path.join(dir_path, item)
                if pattern and pattern not in item:
                    continue
                files.append({
                    "name": item,
                    "type": "folder" if os.path.isdir(item_path) else "file",
                    "size": os.path.getsize(item_path) if os.path.isfile(item_path) else None
                })
            
            return {"success": True, "directory": dir_path, "files": files, "method": "direct"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # TIER 2: Complex AI-Powered Operations (Intelligent)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    async def organize_files(self, directory: str, criteria: str = "by type") -> Dict[str, Any]:
        """
        Use Gemini Vision to intelligently organize files
        
        Examples:
            organize_files("~/Downloads", "by type")
            organize_files("~/Desktop", "by project")
        """
        print(f"[FILE] 🤖 AI-organizing files in {directory} ({criteria})")
        
        from intelligent_automation import intelligent_automate
        
        # Build task description
        task = f"organize files in {directory} {criteria}"
        
        # Use Gemini Vision to plan organization
        result = await intelligent_automate("Finder", task, directory=directory, criteria=criteria)
        
        return {**result, "method": "ai_vision"}
    
    async def batch_rename(self, directory: str, pattern: str, new_pattern: str) -> Dict[str, Any]:
        """
        AI-powered batch file renaming
        
        Examples:
            batch_rename("~/Photos", "IMG_*.jpg", "Vacation_2024_*.jpg")
        """
        print(f"[FILE] 🤖 AI batch renaming: {pattern} → {new_pattern}")
        
        from intelligent_automation import intelligent_automate
        
        task = f"rename files matching '{pattern}' to '{new_pattern}' in {directory}"
        
        result = await intelligent_automate("Finder", task, 
                                           directory=directory, 
                                           pattern=pattern, 
                                           new_pattern=new_pattern)
        
        return {**result, "method": "ai_vision"}
    
    async def smart_cleanup(self, directory: str, keep_recent_days: int = 30) -> Dict[str, Any]:
        """
        AI-powered intelligent file cleanup
        Safely moves old/duplicate files to archive
        """
        print(f"[FILE] 🤖 AI cleanup: {directory} (keep {keep_recent_days} days)")
        
        from intelligent_automation import intelligent_automate
        
        task = f"cleanup old files in {directory}, keep files from last {keep_recent_days} days"
        
        result = await intelligent_automate("Finder", task,
                                           directory=directory,
                                           keep_days=keep_recent_days)
        
        return {**result, "method": "ai_vision"}
    
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # HYBRID DISPATCHER: Automatically choose best method
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    async def execute(self, operation: str, **params) -> Dict[str, Any]:
        """
        Smart dispatcher - chooses direct or AI method
        
        Usage:
            execute("open", filename="report.pdf")
            execute("create", folder_name="ProjectX")
            execute("organize", directory="~/Downloads", criteria="by type")
        """
        # Simple operations → Direct (fast)
        simple_ops = {
            "open": lambda: self.open_file(params.get("filename"), params.get("directory")),
            "create": lambda: self.create_folder(params.get("folder_name"), params.get("location")),
            "delete": lambda: self.delete_file(params.get("filename"), params.get("directory")),
            "copy": lambda: self.copy_file(params.get("filename"), params.get("destination")),
            "move": lambda: self.move_file(params.get("filename"), params.get("destination")),
            "list": lambda: self.list_files(params.get("directory"), params.get("pattern")),
        }
        
        # Complex operations → AI (intelligent)
        complex_ops = {
            "organize": lambda: self.organize_files(params.get("directory"), params.get("criteria", "by type")),
            "batch_rename": lambda: self.batch_rename(
                params.get("directory"), 
                params.get("pattern"), 
                params.get("new_pattern")
            ),
            "cleanup": lambda: self.smart_cleanup(
                params.get("directory"), 
                params.get("keep_days", 30)
            ),
        }
        
        # Execute
        if operation in simple_ops:
            print(f"[HYBRID] ⚡ Using direct method for: {operation}")
            return simple_ops[operation]()
        elif operation in complex_ops:
            print(f"[HYBRID] 🤖 Using AI method for: {operation}")
            return await complex_ops[operation]()
        else:
            return {"success": False, "error": f"Unknown operation: {operation}"}
    
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # Helper Methods
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    def _find_file(self, filename: str, hint_directory: Optional[str] = None) -> Optional[str]:
        """Smart file finder - searches common locations"""
        # Try hint directory first
        if hint_directory:
            full_path = os.path.expanduser(f"{hint_directory}/{filename}")
            if os.path.exists(full_path):
                return full_path
        
        # Search common locations
        for directory in self.common_locations:
            full_path = os.path.join(directory, filename)
            if os.path.exists(full_path):
                return full_path
        
        # Try recursive search in Documents
        try:
            for root, dirs, files in os.walk(os.path.expanduser("~/Documents")):
                if filename in files:
                    return os.path.join(root, filename)
        except Exception:
            pass
        
        return None


# Global instance
hybrid_files = HybridFileOperations()


# Public API
async def file_operation(operation: str, **params) -> Dict[str, Any]:
    """
    Universal file operation handler
    
    Usage:
        # Simple (direct)
        await file_operation("open", filename="report.pdf")
        await file_operation("create", folder_name="ProjectX")
        await file_operation("delete", filename="old_notes.txt")
        
        # Complex (AI-powered)
        await file_operation("organize", directory="~/Downloads", criteria="by type")
        await file_operation("batch_rename", directory="~/Photos", 
                           pattern="IMG_*.jpg", new_pattern="Vacation_*.jpg")
        await file_operation("cleanup", directory="~/Desktop", keep_days=30)
    """
    return await hybrid_files.execute(operation, **params)


# Convenience functions
def open_file(filename: str, directory: str = None) -> Dict[str, Any]:
    """Quick file opener"""
    return hybrid_files.open_file(filename, directory)

def create_folder(folder_name: str, location: str = None) -> Dict[str, Any]:
    """Quick folder creator"""
    return hybrid_files.create_folder(folder_name, location)

def delete_file(filename: str, directory: str = None) -> Dict[str, Any]:
    """Quick safe file deleter"""
    return hybrid_files.delete_file(filename, directory)

async def organize_folder(directory: str, criteria: str = "by type") -> Dict[str, Any]:
    """AI-powered folder organization"""
    return await hybrid_files.organize_files(directory, criteria)
