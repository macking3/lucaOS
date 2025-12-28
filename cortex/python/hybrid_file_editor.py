"""
Hybrid File Editing System
Combines direct text manipulation with AI-powered intelligent editing
"""

import os
import re
from typing import Dict, Any, Optional, List
import asyncio


class HybridFileEditor:
    """
    3-tier file editing system:
    - Tier 1: Simple text edits (append, replace, insert) → Direct I/O
    - Tier 2: Intelligent edits (refactor, rewrite, improve) → Gemini AI
    - Tier 3: Visual edits (complex formatting) → App automation
    """
    
    def __init__(self):
        from hybrid_file_operations import hybrid_files
        self.file_ops = hybrid_files
    
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # TIER 1: Simple Direct Edits (Fast - 10-50ms)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    def read_file(self, filename: str, directory: Optional[str] = None) -> Dict[str, Any]:
        """Read file contents"""
        file_path = self.file_ops._find_file(filename, directory)
        
        if not file_path:
            return {"success": False, "error": f"File not found: {filename}"}
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            return {
                "success": True,
                "path": file_path,
                "content": content,
                "lines": len(content.split('\n')),
                "chars": len(content),
                "method": "direct"
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def append_text(self, filename: str, text: str, directory: Optional[str] = None) -> Dict[str, Any]:
        """
        Append text to end of file
        
        Examples:
            append_text("notes.txt", "New note: Remember to call John")
            append_text("log.txt", f"{datetime.now()}: Task completed")
        """
        print(f"[EDIT] Appending to: {filename}")
        
        file_path = self.file_ops._find_file(filename, directory)
        
        if not file_path:
            return {"success": False, "error": f"File not found: {filename}"}
        
        try:
            with open(file_path, 'a', encoding='utf-8') as f:
                f.write('\n' + text)
            
            print(f"[EDIT] ✅ Appended {len(text)} characters")
            return {
                "success": True,
                "path": file_path,
                "added": len(text),
                "method": "direct"
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def replace_text(
        self, 
        filename: str, 
        find: str, 
        replace: str,
        directory: Optional[str] = None,
        all_occurrences: bool = True
    ) -> Dict[str, Any]:
        """
        Find and replace text in file
        
        Examples:
            replace_text("config.txt", "localhost", "192.168.1.100")
            replace_text("code.py", "old_function", "new_function")
        """
        print(f"[EDIT] Find/Replace in: {filename}")
        print(f"  Find: '{find}'")
        print(f"  Replace: '{replace}'")
        
        file_path = self.file_ops._find_file(filename, directory)
        
        if not file_path:
            return {"success": False, "error": f"File not found: {filename}"}
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Count occurrences
            occurrences = content.count(find)
            
            if occurrences == 0:
                return {
                    "success": False,
                    "error": f"Text '{find}' not found in file"
                }
            
            # Replace
            if all_occurrences:
                new_content = content.replace(find, replace)
            else:
                new_content = content.replace(find, replace, 1)
            
            # Write back
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            
            print(f"[EDIT] ✅ Replaced {occurrences if all_occurrences else 1} occurrence(s)")
            return {
                "success": True,
                "path": file_path,
                "occurrences_replaced": occurrences if all_occurrences else 1,
                "method": "direct"
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def insert_at_line(
        self,
        filename: str,
        line_number: int,
        text: str,
        directory: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Insert text at specific line number
        
        Examples:
            insert_at_line("code.py", 10, "# TODO: Add error handling")
            insert_at_line("notes.txt", 1, "IMPORTANT: Read this first!")
        """
        print(f"[EDIT] Inserting at line {line_number} in: {filename}")
        
        file_path = self.file_ops._find_file(filename, directory)
        
        if not file_path:
            return {"success": False, "error": f"File not found: {filename}"}
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            if line_number < 1 or line_number > len(lines) + 1:
                return {
                    "success": False,
                    "error": f"Line {line_number} out of range (file has {len(lines)} lines)"
                }
            
            # Insert (line_number is 1-indexed)
            lines.insert(line_number - 1, text + '\n')
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.writelines(lines)
            
            print(f"[EDIT] ✅ Inserted at line {line_number}")
            return {
                "success": True,
                "path": file_path,
                "line": line_number,
                "method": "direct"
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def delete_lines(
        self,
        filename: str,
        start_line: int,
        end_line: Optional[int] = None,
        directory: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Delete specific line(s) from file
        
        Examples:
            delete_lines("notes.txt", 5)  # Delete line 5
            delete_lines("code.py", 10, 15)  # Delete lines 10-15
        """
        if end_line is None:
            end_line = start_line
        
        print(f"[EDIT] Deleting lines {start_line}-{end_line} from: {filename}")
        
        file_path = self.file_ops._find_file(filename, directory)
        
        if not file_path:
            return {"success": False, "error": f"File not found: {filename}"}
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            if start_line < 1 or end_line > len(lines):
                return {
                    "success": False,
                    "error": f"Line range out of bounds (file has {len(lines)} lines)"
                }
            
            # Delete lines (convert to 0-indexed)
            del lines[start_line - 1:end_line]
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.writelines(lines)
            
            deleted_count = end_line - start_line + 1
            print(f"[EDIT] ✅ Deleted {deleted_count} line(s)")
            return {
                "success": True,
                "path": file_path,
                "lines_deleted": deleted_count,
                "method": "direct"
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def create_file(
        self,
        filename: str,
        content: str,
        directory: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create new file with content
        
        Examples:
            create_file("todo.txt", "1. Buy groceries\\n2. Call mom")
            create_file("script.py", "#!/usr/bin/env python3\\nprint('Hello')")
        """
        if directory is None:
            directory = "~/Documents"
        
        full_path = os.path.expanduser(f"{directory}/{filename}")
        print(f"[EDIT] Creating file: {full_path}")
        
        try:
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            print(f"[EDIT] ✅ Created with {len(content)} characters")
            return {
                "success": True,
                "path": full_path,
                "size": len(content),
                "method": "direct"
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # TIER 2: AI-Powered Intelligent Edits (Smart - 2-5s)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    async def rewrite_section(
        self,
        filename: str,
        section: str,
        instruction: str,
        directory: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        AI rewrites a specific section based on instructions
        
        Examples:
            rewrite_section("essay.txt", "introduction", "make it more engaging")
            rewrite_section("email.txt", "closing", "make it more professional")
        """
        print(f"[EDIT] 🤖 AI rewriting section '{section}' in: {filename}")
        
        # Read file
        result = self.read_file(filename, directory)
        if not result["success"]:
            return result
        
        content = result["content"]
        file_path = result["path"]
        
        # Use Gemini to rewrite
        import google.generativeai as genai
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        
        prompt = f"""You are editing a file. Here's the current content:

{content}

TASK: Rewrite the "{section}" section according to this instruction: {instruction}

Return the ENTIRE file content with the rewritten section. Keep everything else unchanged.
Return ONLY the file content, no explanations or markdown formatting."""
        
        response = model.generate_content(prompt)
        new_content = response.text.strip()
        
        # Remove markdown code blocks if present
        if new_content.startswith("```"):
            lines = new_content.split('\n')
            new_content = '\n'.join(lines[1:-1])
        
        # Write back
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        print(f"[EDIT] ✅ AI rewrote section: {section}")
        return {
            "success": True,
            "path": file_path,
            "section": section,
            "original_length": len(content),
            "new_length": len(new_content),
            "method": "ai_gemini"
        }
    
    async def improve_writing(
        self,
        filename: str,
        aspect: str = "overall",
        directory: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        AI improves writing quality
        
        Aspects: "grammar", "clarity", "tone", "conciseness", "overall"
        
        Examples:
            improve_writing("essay.txt", "grammar")
            improve_writing("email.txt", "tone")
        """
        print(f"[EDIT] 🤖 AI improving {aspect} in: {filename}")
        
        result = self.read_file(filename, directory)
        if not result["success"]:
            return result
        
        content = result["content"]
        file_path = result["path"]
        
        import google.generativeai as genai
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        
        prompts = {
            "grammar": "Fix all grammar, spelling, and punctuation errors.",
            "clarity": "Improve clarity and readability. Make the writing clearer and easier to understand.",
            "tone": "Improve the tone to be more professional and appropriate.",
            "conciseness": "Make the writing more concise without losing meaning.",
            "overall": "Improve the overall quality: fix grammar, improve clarity, and enhance tone."
        }
        
        instruction = prompts.get(aspect, prompts["overall"])
        
        prompt = f"""{instruction}

Original text:
{content}

Return the improved version. Keep the same structure and format. Return ONLY the improved text, no explanations."""
        
        response = model.generate_content(prompt)
        new_content = response.text.strip()
        
        # Write back
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        print(f"[EDIT] ✅ AI improved: {aspect}")
        return {
            "success": True,
            "path": file_path,
            "aspect": aspect,
            "original_length": len(content),
            "new_length": len(new_content),
            "method": "ai_gemini"
        }
    
    async def refactor_code(
        self,
        filename: str,
        goal: str = "improve readability",
        directory: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        AI refactors code
        
        Goals: "improve readability", "add comments", "optimize", "modern syntax"
        
        Examples:
            refactor_code("script.py", "add comments")
            refactor_code("app.js", "modern syntax")
        """
        print(f"[EDIT] 🤖 AI refactoring code: {filename}")
        
        result = self.read_file(filename, directory)
        if not result["success"]:
            return result
        
        content = result["content"]
        file_path = result["path"]
        
        import google.generativeai as genai
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        
        prompt = f"""Refactor this code. Goal: {goal}

Code:
{content}

Return the refactored code. Maintain all functionality. Return ONLY the code, no explanations or markdown."""
        
        response = model.generate_content(prompt)
        new_content = response.text.strip()
        
        # Remove markdown
        if new_content.startswith("```"):
            lines = new_content.split('\n')
            new_content = '\n'.join(lines[1:-1])
        
        # Write back
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        print(f"[EDIT] ✅ AI refactored code")
        return {
            "success": True,
            "path": file_path,
            "goal": goal,
            "method": "ai_gemini"
        }
    
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # TIER 3: App-Based Visual Editing (When needed)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    async def edit_in_app(
        self,
        filename: str,
        app: str = "TextEdit",
        directory: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Open file in app for visual editing
        
        Examples:
            edit_in_app("document.docx", "Microsoft Word")
            edit_in_app("presentation.pptx", "Keynote")
        """
        print(f"[EDIT] Opening {filename} in {app} for visual editing")
        
        from universal_automation import automate
        
        # Open file in specific app
        file_path = self.file_ops._find_file(filename, directory)
        
        if not file_path:
            return {"success": False, "error": f"File not found: {filename}"}
        
        result = await automate("open", app, file=file_path)
        
        return {
            **result,
            "path": file_path,
            "app": app,
            "method": "visual_app"
        }


# Global instance
hybrid_editor = HybridFileEditor()


# Public API
async def edit_file(operation: str, filename: str, **params) -> Dict[str, Any]:
    """
    Universal file editing API
    
    Usage:
        # Simple (direct)
        await edit_file("append", "notes.txt", text="New note")
        await edit_file("replace", "config.txt", find="localhost", replace="192.168.1.100")
        
        # AI-powered
        await edit_file("improve", "essay.txt", aspect="grammar")
        await edit_file("refactor", "code.py", goal="add comments")
        
        # Visual
        await edit_file("open", "document.docx", app="Microsoft Word")
    """
    ops = {
        # Tier 1: Direct
        "read": lambda: hybrid_editor.read_file(filename, params.get("directory")),
        "append": lambda: hybrid_editor.append_text(filename, params.get("text"), params.get("directory")),
        "replace": lambda: hybrid_editor.replace_text(
            filename, params.get("find"), params.get("replace"),
            params.get("directory"), params.get("all", True)
        ),
        "insert": lambda: hybrid_editor.insert_at_line(
            filename, params.get("line", 1), params.get("text"), params.get("directory")
        ),
        "delete_lines": lambda: hybrid_editor.delete_lines(
            filename, params.get("start"), params.get("end"), params.get("directory")
        ),
        "create": lambda: hybrid_editor.create_file(
            filename, params.get("content", ""), params.get("directory")
        ),
        
        # Tier 2: AI
        "rewrite": lambda: hybrid_editor.rewrite_section(
            filename, params.get("section"), params.get("instruction"), params.get("directory")
        ),
        "improve": lambda: hybrid_editor.improve_writing(
            filename, params.get("aspect", "overall"), params.get("directory")
        ),
        "refactor": lambda: hybrid_editor.refactor_code(
            filename, params.get("goal", "improve readability"), params.get("directory")
        ),
        
        # Tier 3: Visual
        "open": lambda: hybrid_editor.edit_in_app(
            filename, params.get("app", "TextEdit"), params.get("directory")
        ),
    }
    
    if operation not in ops:
        return {"success": False, "error": f"Unknown operation: {operation}"}
    
    result = ops[operation]()
    
    # Handle async operations
    if asyncio.iscoroutine(result):
        return await result
    
    return result
