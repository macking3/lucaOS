from typing import Literal, Optional
from mem0.llms.llm_configs import LLMConfig
import requests
import json
import os

class GoogleDorkingTool:
    def __init__(self):
        self.google_api_key = os.getenv("GOOGLE_API_KEY")
        self.google_cse_id = os.getenv("GOOGLE_CSE_ID")
        if not self.google_api_key or not self.google_cse_id:
            raise ValueError("GOOGLE_API_KEY and GOOGLE_CSE_ID must be set as environment variables.")

        self.dork_templates = {
            "files": "site:{domain} filetype:{filetype}",
            "configs": "site:{domain} inurl:config OR inurl:env OR inurl:.ini OR inurl:.bak",
            "vulnerabilities": "site:{domain} intext:\"index of /\" OR intext:\"parent directory\" OR intext:\"admin login\" OR intext:\"password file\"",
            "logs": "site:{domain} inurl:log OR intext:\"log file\"",
            "emails": "site:{domain} intext:\"@email.com\" OR intext:\"contact us\"", # Placeholder, actual email dorks are more complex
            "directories": "site:{domain} intitle:\"index of\""
        }

    def osintGoogleDork(self, target_domain: str, dork_type: Literal['files', 'configs', 'vulnerabilities', 'logs', 'emails', 'directories'], keywords: Optional[str] = None, filetype: Optional[str] = None) -> dict:
        """
        Performs advanced Google Dorking for OSINT on a target domain.
        Leverages specific search operators to find sensitive information indexed by Google.

        Args:
            target_domain: The domain to target (e.g., "example.com").
            dork_type: The type of information to search for ('files', 'configs', 'vulnerabilities', 'logs', 'emails', 'directories').
            keywords: Optional additional keywords to include in the search.
            filetype: Required if dork_type is 'files'. Specifies the file extension (e.g., "pdf", "docx", "env").
        
        Returns:
            A dictionary containing the search results or an error message.
        """
        
        if dork_type == "files" and not filetype:
            return {"error": "filetype is required for dork_type 'files'."}

        base_dork = self.dork_templates.get(dork_type)
        if not base_dork:
            return {"error": f"Invalid dork_type: {dork_type}"}

        formatted_dork = base_dork.format(domain=target_domain, filetype=filetype if filetype else "")
        
        if keywords:
            formatted_dork += f" {keywords}"

        search_query = formatted_dork
        
        # Use Google Custom Search Engine API
        url = f"https://www.googleapis.com/customsearch/v1?key={self.google_api_key}&cx={self.google_cse_id}&q={search_query}"
        
        try:
            response = requests.get(url)
            response.raise_for_status() # Raise an exception for HTTP errors
            search_results = response.json()
            
            # Extract relevant information
            items = []
            if "items" in search_results:
                for item in search_results["items"]:
                    items.append({
                        "title": item.get("title"),
                        "link": item.get("link"),
                        "snippet": item.get("snippet")
                    })
            
            return {"results": items}

        except requests.exceptions.RequestException as e:
            return {"error": f"HTTP Request failed: {e}"}
        except json.JSONDecodeError:
            return {"error": "Failed to decode JSON response from Google API."}
        except Exception as e:
            return {"error": f"An unexpected error occurred: {e}"}