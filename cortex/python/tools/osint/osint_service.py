import sys
import os
import json
import asyncio
import subprocess
from pathlib import Path

# Add vendor paths to system path if needed
VENDOR_DIR = Path(__file__).parent.parent / "vendor"
sys.path.append(str(VENDOR_DIR))

class IdentityIntelligenceService:
    def __init__(self):
        self.vendor_dir = VENDOR_DIR
        self.results_dir = Path(__file__).parent.parent.parent / "data" / "osint_reports"
        self.results_dir.mkdir(parents=True, exist_ok=True)

    async def search_username(self, username: str, method: str = "quick"):
        """
        Search for a username across social networks.
        method: 'quick' (Blackbird) or 'deep' (Maigret)
        """
        if method == "deep":
            return await self._run_maigret(username)
        else:
            return await self._run_blackbird(username)

    async def check_email(self, email: str):
        """
        Check which sites an email is registered on using Holehe.
        """
        return await self._run_holehe(email)

    async def _run_blackbird(self, username: str):
        """Run Blackbird for quick username enumeration and AI profiling"""
        print(f"[*] Running Blackbird for {username}...")
        
        # Blackbird output dir
        output_file = self.results_dir / f"blackbird_{username}.json"
        
        # Command: python blackbird.py -u username --output json
        # We need to target the blackbird.py file in the vendor dir
        blackbird_script = self.vendor_dir / "blackbird" / "blackbird.py"
        
        if not blackbird_script.exists():
            return {"error": "Blackbird not installed"}

        cmd = [
            sys.executable,
            str(blackbird_script),
            "-u", username,
            "--no-update" # Skip update check for speed
        ]
        
        # We might need to pipe output because Blackbird doesn't strictly output concise JSON to stdout
        # But it creates report files.
        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(self.vendor_dir / "blackbird") # Run in its dir to avoid path issues
            )
            stdout, stderr = await process.communicate()
            
            # Blackbird saves results in a 'results' folder inside its dir usually.
            # We'll need to parse stdout or find that file.
            output_log = stdout.decode()
            
            # Simple parsing of stdout for now to find "FOUND" sites
            found_sites = []
            for line in output_log.split('\n'):
                if "[+]" in line and "FOUND" in line:
                    # Example: [+] FOUND on Instagram: https://instagram.com/username
                    parts = line.split(" ")
                    found_sites.append({
                        "site": parts[3] if len(parts) > 3 else "Unknown",
                        "url": parts[-1] if len(parts) > 0 else ""
                    })
            
            return {
                "tool": "blackbird",
                "target": username,
                "found_count": len(found_sites),
                "sites": found_sites,
                "raw_log": output_log[:1000] + "..." # Truncate log
            }
            
        except Exception as e:
            return {"error": str(e)}

    async def _run_maigret(self, username: str):
        """Run Maigret for deep inspection"""
        print(f"[*] Running Maigret for {username}...")
        
        # Maigret creates a report file. We should specify a folder.
        # Command: maigret <username> --json --folder <results_dir> --no-pdf
        
        try:
            cmd = [
                sys.executable,  # Use the same python interpreter (with installed packages)
                "-m", "maigret",
                username,
                "--json", "simple",
                "--no-pdf",
                "--folder", str(self.results_dir)
            ]
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()
            
            # Find the generated JSON file
            # Format usually: report_username_maigret.json
            expected_file = self.results_dir / f"report_{username}.json"
            
            # Maigret might name it differently, let's look for latest json in that dir
            # Or parse stdout for filename
            
            try:
                # Fallback: list files matching pattern
                candidates = list(self.results_dir.glob(f"report_{username}*.json"))
                if candidates:
                    latest_report = max(candidates, key=os.path.getctime)
                    with open(latest_report, "r") as f:
                        data = json.load(f)
                    return {"tool": "maigret", "data": data}
            except Exception as e:
                print(f"[OSINT] Error reading Maigret report: {e}")

            return {
                "tool": "maigret",
                "status": "completed", 
                "log": stdout.decode()[:500]
            }

        except Exception as e:
             return {"error": str(e)}

    async def _run_holehe(self, email: str):
        """Run Holehe for email check"""
        print(f"[*] Running Holehe for {email}...")
        
        # Holehe prints to stdout. 
        # Command: holehe <email> --only-used --no-color
        
        try:
            cmd = [
                sys.executable,
                "-m", "holehe",
                email,
                "--only-used",
                "--no-color"
            ]
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()
            output = stdout.decode()
            
            # Parse Holehe output
            # Format: [x] <site>
            found_sites = []
            for line in output.split('\n'):
                if "[+]" in line or "[x]" in line:
                    # Clean line
                    site = line.replace("[+]", "").replace("[x]", "").strip()
                    if site:
                        found_sites.append(site)
            
            return {
                "tool": "holehe",
                "target": email,
                "found_sites": found_sites
            }
            
        except Exception as e:
            return {"error": str(e)}

# Singleton instance
identity_service = IdentityIntelligenceService()
