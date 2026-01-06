import os
import sys
import json
import socket
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

# Try importing llama-cpp-python
try:
    from llama_cpp import Llama, LlamaGrammar
    LLAMA_CPP_AVAILABLE = True
except ImportError:
    LLAMA_CPP_AVAILABLE = False
    print("[LOCAL-LLM] llama-cpp-python not found. Please install it for offline chat.")

class LocalLLMAgent:
    def __init__(self, model_path: str = None, repo_id: str = "bartowski/gemma-2-2b-it-GGUF", filename: str = "gemma-2-2b-it-Q6_K.gguf"):
        """
        Initialize the Local LLM Agent for offline chat and tool use.
        Uses Gemma 2 2B (Google Native) for smart local intelligence.
        """
        self.model = None
        # Using Q6_K for better reasoning retention on 2B model (~2.1GB)
        self.repo_id = repo_id
        self.filename = filename 
        self.n_ctx = 8192 # Gemma 2 supports 8k context
        self.n_gpu_layers = -1 # Auto-offload
        
        # Production-Ready Path Logic (Consistent with Vision/TTS)
        is_frozen = getattr(sys, 'frozen', False)
        mode_env = os.environ.get("LUCA_MODE", "").lower()
        mode = "production" if (is_frozen or mode_env == "production") else "development"
        
        home_dir = os.path.expanduser("~")
        prod_cache_dir = os.path.join(home_dir, "Luca", "models")
        dev_cache_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
        
        if mode == "production":
            self.model_dir = os.path.join(prod_cache_dir, "llm")
        else:
             # Try writing to dev dir, fallback to prod
            try:
                os.makedirs(dev_cache_dir, exist_ok=True)
                test_file = os.path.join(dev_cache_dir, ".write_test_llm")
                with open(test_file, "w") as f: f.write("test")
                os.remove(test_file)
                self.model_dir = os.path.join(dev_cache_dir, "llm")
            except:
                self.model_dir = os.path.join(prod_cache_dir, "llm")
                
        os.makedirs(self.model_dir, exist_ok=True)
        self.model_file_path = os.path.join(self.model_dir, self.filename)
        
        print(f"[LOCAL-LLM] Initialized. Storage: {self.model_dir}")

    def download_model(self):
        """Downloads the model if not present."""
        if os.path.exists(self.model_file_path):
            return

        print(f"[LOCAL-LLM] Downloading {self.filename}...")
        try:
            from huggingface_hub import hf_hub_download
            hf_hub_download(
                repo_id=self.repo_id,
                filename=self.filename,
                local_dir=self.model_dir,
                local_dir_use_symlinks=False
            )
            print("[LOCAL-LLM] Download Complete.")
        except Exception as e:
            print(f"[LOCAL-LLM] Download Failed: {e}")
            raise e

    def load_model(self):
        """Lazy loads the model into RAM/VRAM."""
        if self.model is not None:
            return

        if not LLAMA_CPP_AVAILABLE:
            raise ImportError("llama-cpp-python is not installed.")

        self.download_model()

        print("[LOCAL-LLM] Loading Model into Memory...")
        try:
            self.model = Llama(
                model_path=self.model_file_path,
                n_ctx=self.n_ctx,
                n_gpu_layers=self.n_gpu_layers,
                verbose=False
            )
            print("[LOCAL-LLM] Model Loaded Successfully.")
        except Exception as e:
            print(f"[LOCAL-LLM] Load Error: {e}")
            raise e

    def generate_chat(self, messages: List[Dict[str, str]], tools: Optional[List[Dict]] = None) -> Dict[str, Any]:
        """
        Generates a chat response.
        If tools are provided, it attempts to enforce a JSON structure for tool calling.
        """
        if self.model is None:
            self.load_model()
            
        # 1. Format Messages (SmolLM2/Llama-3 Chat Template)
        # Using standard chat format. llama-cpp-python handles some templates, 
        # but manual construction is safer for custom system prompts.
        
        # Simple Chat Completion if no tools
        if not tools:
            response = self.model.create_chat_completion(
                messages=messages,
                max_tokens=512,
                temperature=0.7
            )
            return response

        # 2. Tool Calling Mode (Structured Output)
        # We instruct the model to output a specific JSON structure if it wants to use a tool.
        
        system_msg = next((m for m in messages if m["role"] == "system"), None)
        user_msgs = [m for m in messages if m["role"] != "system"]
        
        tool_desc = json.dumps(tools, indent=2)
        
        # Enhanced System Prompt for Tool Use
        tool_system_prompt = (
            f"{system_msg['content'] if system_msg else 'You are a helpful assistant.'}\n\n"
            f"You have access to the following tools:\n{tool_desc}\n\n"
            "To use a tool, you MUST respond with purely JSON in this format:\n"
            "{\n  \"tool\": \"tool_name\",\n  \"arguments\": { ... }\n}\n"
            "If no tool is needed, respond normally."
        )
        
        # Construct raw prompt for strict control
        # (Simplified for this iteration - assumes chat template handles logic)
        messages_with_tools = [{"role": "system", "content": tool_system_prompt}] + user_msgs
        
        # TODO: Implement strict Grammar to FORCE valid JSON
        # For now, we rely on the prompt engineering + strong instruct model
        
        response = self.model.create_chat_completion(
            messages=messages_with_tools,
            max_tokens=512,
            temperature=0.2, # Lower temp for tools
            response_format={
                "type": "json_object" # Force JSON mode if supported by backend
            }
        )
        
        return response

# Singleton
local_brain = LocalLLMAgent()
