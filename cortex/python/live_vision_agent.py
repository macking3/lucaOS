import os
import io
import base64
import torch
from threading import Lock
from PIL import Image
from transformers import AutoProcessor, AutoModelForVision2Seq
from typing import Optional

class LiveVisionAgent:
    def __init__(self, model_name="HuggingFaceTB/SmolVLM-500M-Instruct"):
        """
        Initialize the Local Astra Scan Agent (SmolVLM).
        Lazy loads the model to save memory until Astra Scan is actually toggled.
        """
        self.model_name = model_name
        self.model = None
        self.processor = None
        self.lock = Lock()
        self.device = "cuda" if torch.cuda.is_available() else ("mps" if torch.backends.mps.is_available() else "cpu")
        
        # Production-Ready Path Logic (Consistent with UI-TARS and Piper)
        import sys
        is_frozen = getattr(sys, 'frozen', False)
        mode_env = os.environ.get("LUCA_MODE", "").lower()
        mode = "production" if (is_frozen or mode_env == "production") else "development"
        
        home_dir = os.path.expanduser("~")
        prod_cache_dir = os.path.join(home_dir, "Luca", "models")
        dev_cache_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
        
        if mode == "production":
            self.cache_dir = prod_cache_dir
        else:
            try:
                os.makedirs(dev_cache_dir, exist_ok=True)
                test_file = os.path.join(dev_cache_dir, ".write_test_vlm")
                with open(test_file, "w") as f: f.write("test")
                os.remove(test_file)
                self.cache_dir = dev_cache_dir
            except:
                self.cache_dir = prod_cache_dir
        
        self.model_dir = os.path.join(self.cache_dir, "smolvlm")
        os.makedirs(self.model_dir, exist_ok=True)
        
        print(f"[ASTRA-LOCAL] Initialized (Device: {self.device}, Dir: {self.model_dir})")

    def load_model(self):
        """Loads SmolVLM into memory."""
        if self.model is not None:
            return

        with self.lock:
            if self.model is not None: return
            
            print(f"[ASTRA-LOCAL] Loading SmolVLM: {self.model_name}...")
            try:
                # Use 4-bit quantization if on CUDA to keep it ultra-light
                load_kwargs = {
                    "cache_dir": self.model_dir,
                    "trust_remote_code": True,
                }
                
                if self.device == "cuda":
                    load_kwargs["load_in_4bit"] = True
                elif self.device == "mps":
                    load_kwargs["torch_dtype"] = torch.float16
                
                self.processor = AutoProcessor.from_pretrained(self.model_name, cache_dir=self.model_dir)
                self.model = AutoModelForVision2Seq.from_pretrained(
                    self.model_name,
                    **load_kwargs
                )
                
                if self.device == "mps":
                    self.model.to("mps")
                elif self.device == "cpu":
                    self.model.to(torch.float32)

                print("[ASTRA-LOCAL] SmolVLM Loaded Successfully.")
            except Exception as e:
                print(f"[ASTRA-LOCAL] Load Error: {e}")
                raise e

    def analyze(self, image_base64: str, prompt: str = None) -> Optional[str]:
        """Analyzes a single frame for user presence and activity."""
        if self.model is None:
            self.load_model()
            
        if not prompt:
            prompt = "Describe the user and their activity."

        try:
            # 1. Decode Image
            if "," in image_base64:
                image_base64 = image_base64.split(",")[1]
            image_data = base64.b64decode(image_base64)
            image = Image.open(io.BytesIO(image_data)).convert("RGB")
            
            # 2. Prepare Inputs
            messages = [
                {
                    "role": "user",
                    "content": [
                        {"type": "image"},
                        {"type": "text", "text": prompt}
                    ]
                }
            ]
            
            text = self.processor.apply_chat_template(messages, add_generation_prompt=True)
            inputs = self.processor(text=text, images=[image], return_tensors="pt").to(self.device)
            
            # 3. Generate
            with torch.no_grad():
                generated_ids = self.model.generate(**inputs, max_new_tokens=64)
            
            # 4. Decode
            generated_texts = self.processor.batch_decode(
                generated_ids,
                skip_special_tokens=True,
            )
            
            # SmolVLM chat template might include the prompt in the output, split it if needed
            response = generated_texts[0].split("Assistant:")[-1].strip() if "Assistant:" in generated_texts[0] else generated_texts[0]
            
            print(f"[ASTRA-LOCAL] Analysis: {response}")
            return response

        except Exception as e:
            print(f"[ASTRA-LOCAL] Inference Error: {e}")
            return None

# Singleton
astra_local = LiveVisionAgent()
