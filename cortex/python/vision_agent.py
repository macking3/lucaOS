import os
import io
import base64
import torch
from threading import Lock
from PIL import Image
from transformers import AutoModel, AutoTokenizer, AutoProcessor

class UITarsAgent:
    def __init__(self, model_name="ByteDance-Seed/UI-TARS-2B-SFT"):
        """
        Initialize the UI-TARS Agent.
        This won't load the model immediately to save startup time.
        Call load_model() to load into VRAM.
        """
        self.model_name = model_name
        self.points_per_token = 1000 # Standard for UI-TARS
        self.model = None
        self.tokenizer = None
        self.lock = Lock()
        self.device = "cuda" if torch.cuda.is_available() else ("mps" if torch.backends.mps.is_available() else "cpu")
        print(f"[UI-TARS] Initialized Agent (Device: {self.device})")

    def load_model(self):
        """
        Load the model and processor into memory.
        """
        if self.model is not None:
            return

        with self.lock:
            if self.model is not None: return
            
            print(f"[UI-TARS] Loading model: {self.model_name}...")
            try:
                # Load Processor with extra robustness
                # UI-TARS sometimes has issues with the default size dict in some transformers versions
                from transformers import AutoProcessor
                try:
                    self.processor = AutoProcessor.from_pretrained(
                        self.model_name, 
                        trust_remote_code=True
                    )
                except Exception as e:
                     print(f"[UI-TARS] Standard processor load failed, trying reduced config: {e}")
                     # Fallback or specific handling if needed
                     raise e
                        
                # Patch for "shortest_edge" error in some transformers versions
                # WE MUST PATCH THE CONFIG OBJECT ITSELF IF POSSIBLE
                if hasattr(self.processor, "image_processor"):
                    if not hasattr(self.processor.image_processor, "size"):
                        self.processor.image_processor.size = {}
                    
                    # Ensure size dict has required keys if missing
                    # Force update regardless of type
                    if isinstance(self.processor.image_processor.size, dict):
                         self.processor.image_processor.size["shortest_edge"] = 384 
                         self.processor.image_processor.size["longest_edge"] = 384
                    elif self.processor.image_processor.size is None:
                         self.processor.image_processor.size = {"shortest_edge": 384, "longest_edge": 384}

                # Load Model
                self.model = AutoModel.from_pretrained(
                    self.model_name, 
                    trust_remote_code=True,
                    torch_dtype=torch.float16 if self.device != "cpu" else torch.float32,
                    device_map="auto" if self.device == "cuda" else None
                )
                if self.device == "mps":
                    self.model.to("mps")
                
                self.tokenizer = AutoTokenizer.from_pretrained(
                    self.model_name, 
                    trust_remote_code=True, 
                    padding_side='left'
                )
                
                print("[UI-TARS] Model and Processor Loaded Successfully")
            except Exception as e:
                print(f"[UI-TARS] CRITICAL LOAD ERROR: {e}")
                raise e

    def process_screenshot(self, screenshot_base64, instruction):
        """
        Process a screenshot and return the coordinate/action.
        """
        if self.model is None:
            self.load_model()
            
        try:
            # 1. Decode Image
            if "," in screenshot_base64:
                screenshot_base64 = screenshot_base64.split(",")[1]
            image_data = base64.b64decode(screenshot_base64)
            image = Image.open(io.BytesIO(image_data)).convert("RGB")
            
            # 2. Construct Messages (UI-TARS standard)
            # Using the format expected by the model's processor
            messages = [
                {
                    "role": "user",
                    "content": [
                        {"type": "image"},
                        {"type": "text", "text": instruction}
                    ]
                }
            ]
            
            # 3. Process Inputs
            prompt = self.processor.apply_chat_template(messages, add_generation_prompt=True)
            inputs = self.processor(text=prompt, images=image, return_tensors="pt").to(self.device)
            if self.device != "cpu":
                inputs = {k: v.to(torch.float16) if v.dtype == torch.float32 else v for k, v in inputs.items()}

            # 4. Generate
            print("[UI-TARS] Internal Generation Started...")
            with torch.no_grad():
                output_ids = self.model.generate(
                    **inputs,
                    max_new_tokens=128,
                    do_sample=False
                )
            
            # 5. Decode
            # Only decode the new tokens
            generated_ids = output_ids[0][inputs['input_ids'].shape[1]:]
            response = self.processor.decode(generated_ids, skip_special_tokens=True)
            
            print(f"[UI-TARS] Prediction: {response}")
            return response

        except Exception as e:
            print(f"[UI-TARS] Inference Error: {e}")
            return f"Error: {str(e)}"

# Singleton
ui_tars = UITarsAgent()
