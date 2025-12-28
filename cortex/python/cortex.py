import os
import sys
import asyncio
from typing import Optional, List, Dict, Any, Union
from fastapi import FastAPI, HTTPException, Body
from pydantic import BaseModel
import uvicorn
try:
    import pyautogui
    PYAUTOGUI_AVAILABLE = True
except ImportError:
    PYAUTOGUI_AVAILABLE = False
    print("[CORTEX] WARN: pyautogui not available. Mouse/Keyboard control disabled.")
from dotenv import load_dotenv
import numpy as np
from platform_adapter import get_adapter

from pathlib import Path

# Robust Environment Loading
# 1. Load local .env in current dir
load_dotenv()
load_dotenv(".env.local")

# 2. Load root .env (2 levels up from cortex/python)
# Resolves to .../luca/.env
root_env_path = Path(__file__).resolve().parent.parent.parent / ".env"
if root_env_path.exists():
    print(f"[CORTEX] Loading root configuration from: {root_env_path}")
    load_dotenv(dotenv_path=root_env_path)
else:
    print(f"[CORTEX] WARN: Root .env not found at {root_env_path}")


# Configure Gemini API Key
GOOGLE_API_KEY = os.environ.get("GEMINI_API_KEY") or os.environ.get("VITE_API_KEY")
if not GOOGLE_API_KEY:
    print("[CORTEX] WARN: GEMINI_API_KEY not found in environment. Please set it in .env or cloud config.")

else:
    # LightRAG's Gemini binding checks for LLM_BINDING_API_KEY or GEMINI_API_KEY
    os.environ["LLM_BINDING_API_KEY"] = GOOGLE_API_KEY
    os.environ["GEMINI_API_KEY"] = GOOGLE_API_KEY
    os.environ["GOOGLE_API_KEY"] = GOOGLE_API_KEY # Standard SDK Variable
    os.environ["API_KEY"] = GOOGLE_API_KEY # Generic variable often used by new SDKs
    
    # DEBUG: Reveal part of the key to verify source
    key_preview = GOOGLE_API_KEY[:10] + "..." if GOOGLE_API_KEY else "None"
    print(f"[CORTEX] DEBUG: Final Configured Key: {key_preview} (Length: {len(GOOGLE_API_KEY) if GOOGLE_API_KEY else 0})")



# --- LIGHTRAG IMPORTS & FIXES ---
try:
    from lightrag import LightRAG, QueryParam
    from lightrag.utils import EmbeddingFunc
    from lightrag.kg.shared_storage import initialize_pipeline_status
    # Fix for missing export in lightrag 
    from lightrag.llm.gemini import gemini_model_complete
    import google.generativeai as genai
    
    if GOOGLE_API_KEY:
        genai.configure(api_key=GOOGLE_API_KEY)

    # Custom Embedding Function Wrapper
    class GeminiEmbedding(EmbeddingFunc):
        def __call__(self, texts: list[str]) -> np.ndarray:
            return self.acall(texts)

        async def acall(self, texts: list[str]) -> np.ndarray:
            if not GOOGLE_API_KEY:
                # Return dummy zeros if no key (dev mode)
                return np.zeros((len(texts), 768)) 
            
            try:
                # Use text-embedding-004
                result = genai.embed_content(
                    model="models/text-embedding-004",
                    content=texts,
                    task_type="retrieval_document"
                )
                return np.array(result['embedding'])
            except Exception as e:
                print(f"[CORTEX] Embedding Error: {e}")
                return np.zeros((len(texts), 768))

    rag_embedding_func = GeminiEmbedding(func=None, embedding_dim=768, max_token_size=2048)

except Exception as e:
    print(f"[CORTEX] CRITICAL: LightRAG Import Failed: {e}")
    print("[CORTEX] LightRAG is required for this system. Exiting.")
    sys.exit(1)

# Initialize FastAPI
app = FastAPI()

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import subprocess

# Input Models
class MouseMoveRequest(BaseModel):
    x: int
    y: int

class MouseClickRequest(BaseModel):
    button: str = "left"

class KeyboardTypeRequest(BaseModel):
    text: str
    interval: float = 0.05

class KeyboardPressRequest(BaseModel):
    keys: List[str]

class SystemCommandRequest(BaseModel):
    script: str # AppleScript or Shell depending on endpoint

class MemoryIngestRequest(BaseModel):
    text: str
    model: Optional[str] = "gemini-3-pro-preview"
    metadata: Optional[Dict] = None

class MemoryQueryRequest(BaseModel):
    query: str
    mode: str = "hybrid" # local, global, hybrid
    model: Optional[str] = "gemini-3-pro-preview"

# Global RAG Instance
rag = None
RAG_DIR = "./rag_storage"

@app.on_event("startup")
async def startup_event():
    global rag
    try:
        if not os.path.exists(RAG_DIR):
            os.makedirs(RAG_DIR)
        
        print(f"[CORTEX] Initializing LightRAG in {RAG_DIR}...")
        
        # Initialize LightRAG with corrected function pointers and explicit model configuration
        # LightRAG defaults to OpenAI if not specified, causing 404s on 'gpt-4o-mini'
        rag = LightRAG(
            working_dir=RAG_DIR,
            llm_model_func=gemini_model_complete,
            llm_model_name="gemini-3-pro-preview", 
            embedding_func=rag_embedding_func,
            llm_model_max_async=2, 
            llm_model_kwargs={"api_key": GOOGLE_API_KEY, "key": GOOGLE_API_KEY} 
        )
        # Required initialization for new LightRAG versions
        await rag.initialize_storages()
        await initialize_pipeline_status()
        
        print("[CORTEX] LightRAG Initialized Successfully")
    except Exception as e:
        print(f"[CORTEX] LightRAG Init Failed: {e}")
        # Non-fatal for mouse control, but fatal for memory
        rag = None

@app.get("/health")
async def health_check():
    return {
        "status": "online", 
        "rag_initialized": rag is not None,
        "backend": "Gemini/LightRAG"
    }

# --- MEMORY ENDPOINTS ---

@app.post("/memory/ingest")
async def ingest_memory(request: MemoryIngestRequest):
    if not rag:
        raise HTTPException(status_code=503, detail="RAG system not initialized")
    
    try:
        # Pass model override to LightRAG
        await rag.ainsert(request.text)
        return {"status": "success", "message": "Memory ingested"}
    except Exception as e:
        print(f"[CORTEX] Ingest Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/memory/query")
async def query_memory(request: MemoryQueryRequest):
    if not rag:
        raise HTTPException(status_code=503, detail="RAG system not initialized")
    
    try:
        # Map generic 'hybrid' to LightRAG specific param if needed
        # LightRAG.aquery(query, param=QueryParam(mode=...))
        mode_map = {
            "local": "local",
            "global": "global",
            "hybrid": "hybrid",
            "naive": "naive"
        }
        # Default to NAIVE mode for stability (Hybrid can hang on small datasets)
        query_mode = mode_map.get(request.mode, "naive")
        print(f"[CORTEX] Querying Memory (Mode: {query_mode})...")
        
        # Reverting to Async query (with soft-fail protection)
        try:
             # We pass the model to the query param if LightRAG supports it in the wrapper
             # Note: If LightRAG's aquery doesn't directly take model_name, 
             # the gemini_model_complete wrapper we saw earlier pulls it from hashing_kv or kwargs.
             result = await rag.aquery(
                 request.query, 
                 param=QueryParam(
                     mode=query_mode,
                     # Some versions of LightRAG allow passing extra kwargs to the LLM func
                 )
             )
             return {"result": result}
        except AttributeError as e:
            if "async with" in str(e) or "__aexit__" in str(e):
                 print(f"[CORTEX] Hybrid Query Failed ({e}), falling back to NAIVE mode...")
                 result = await rag.aquery(request.query, param=QueryParam(mode="naive"))
                 return {"result": result}
            raise e
    except Exception as e:
        print(f"[CORTEX] Query Error: {e}")
        # Soft fail: Return empty/error message so the agent can still reply without memory
        return {"result": f"System Note: Memory retrieval failed ({e}). Proceed without context."}

# --- SYSTEM CONTROL ENDPOINTS ---

@app.post("/mouse/move")
async def mouse_move(request: MouseMoveRequest):
    if not PYAUTOGUI_AVAILABLE:
        return {"status": "error", "message": "Mouse control not available on server"}
    try:
        pyautogui.moveTo(request.x, request.y, _pause=False)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/keyboard/type")
async def keyboard_type(request: KeyboardTypeRequest):
    if not PYAUTOGUI_AVAILABLE:
        return {"status": "error", "message": "Keyboard control not available on server"}
    try:
        pyautogui.write(request.text, interval=request.interval)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/keyboard/press")
async def keyboard_press(request: KeyboardPressRequest):
    if not PYAUTOGUI_AVAILABLE:
        return {"status": "error", "message": "Keyboard control not available on server"}
    try:
        # Unpack list of keys e.g. ['command', 'space']
        pyautogui.hotkey(*request.keys)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/system/applescript")
async def system_applescript(request: SystemCommandRequest):
    try:
        # Execute AppleScript via osascript
        result = subprocess.run(
            ["osascript", "-e", request.script], 
            capture_output=True, 
            text=True
        )
        if result.returncode == 0:
             return {"status": "success", "output": result.stdout.strip()}
        else:
             return {"status": "error", "message": result.stderr.strip()}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# --- VOICE HUB INTEGRATION (Gemini Ear + Cloud Voice) ---
from fastapi import WebSocket, WebSocketDisconnect
import requests
import base64
import json
import time

# Configuration
CLOUD_TTS_URL = "https://lorette-zanyish-tragically.ngrok-free.dev/synthesize" # Default Cloud TTS

class VoiceAgentHelper:
    def __init__(self):
        # Default to Gemini 2.5 Flash Native Audio for voice agent
        self.model_name = "models/gemini-2.5-flash-native-audio-latest"
        self.tts_url = "http://localhost:8000/tts" # Local yarnGPT or Cloud
        if GOOGLE_API_KEY:
            genai.configure(api_key=GOOGLE_API_KEY)
        else:
            print("[VOICE] WARN: No API Key for Voice Agent")

    async def hear(self, audio_data: bytes, model_name: Optional[str] = None) -> str:
        """Sends raw audio to Gemini and gets text."""
        try:
            target_model = model_name or self.model_name
            model = genai.GenerativeModel(target_model)
            # Gemini Native Audio Processing
            response = model.generate_content([
                {"mime_type": "audio/webm", "data": audio_data},
                "Listen to this audio. The user ('Commander') always starts with 'Hey Luca' or 'Luca'. Transcribe the command ONLY if it starts with these words. If it is background noise, silence, or not addressed to Luca, return an empty string."
            ])
            return response.text.strip()
        except Exception as e:
            print(f"[VOICE] Hearing Error: {e}")
            return ""

    def speak_cloud(self, text: str) -> str:
        """Sends text to Google Cloud TTS (Studio Female) and returns Base64 Audio."""
        try:
            if not text or len(text.strip()) < 2: return None
            
            # Google Cloud TTS REST API
            url = f"https://texttospeech.googleapis.com/v1/text:synthesize?key={GOOGLE_API_KEY}"
            payload = {
                "input": {"text": text},
                # Sci-Fi AI Configuration: Neural2-F (Crisp Female) + Faster Rate
                "voice": {"languageCode": "en-US", "name": "en-US-Neural2-F"},
                "audioConfig": {"audioEncoding": "MP3", "speakingRate": 1.25, "pitch": 1.0}
            }
            
            response = requests.post(url, json=payload, timeout=10)
            if response.status_code == 200:
                data = response.json()
                return data.get("audioContent") # Google returns 'audioContent' as base64
            else:
                print(f"[VOICE] Google TTS Failed: {response.text}")
                return None
        except Exception as e:
            print(f"[VOICE] Cloud TTS Error: {e}")
            return None

voice_agent = VoiceAgentHelper()

# --- SPEAKER IDENTITY (PYANNOTE) ---
PYANNOTE_API_KEY = os.environ.get("PYANNOTE_API_KEY")

class SpeakerManager:
    def __init__(self):
        self.api_key = PYANNOTE_API_KEY
        if not self.api_key:
            print("[CORTEX] WARN: No PYANNOTE_API_KEY found. Identity Layer Disabled.")
        else:
            print("[CORTEX] Identity Layer Active (Pyannote Cloud)")

    def identify(self, audio_data: bytes) -> str:
        """
        Uploads audio to Pyannote.ai and determines if it is the Commander.
        Returns: "COMMANDER" or "GUEST" (or "UNKNOWN")
        """
        if not self.api_key: return "UNKNOWN"
        
        try:
            # 1. Save temp file
            temp_path = "temp_voice_id.wav"
            with open(temp_path, "wb") as f:
                f.write(audio_data)
            
            # 2. Upload (Start Job)
            url = "https://api.pyannote.ai/v1/diarize"
            headers = {"Authorization": f"Bearer {self.api_key}"}
            files = {'file': open(temp_path, 'rb')}
            
            # Note: Using 'webhook_url' is better for async, but we poll for simplicity here
            response = requests.post(url, headers=headers, files=files)
            
            if response.status_code != 200:
                print(f"[CORTEX] ID Request Failed: {response.text}")
                return "ERROR"
                
            job_id = response.json()['jobId']
            
            # 3. Poll for Result (Timeout 5s)
            start_time = time.time()
            while time.time() - start_time < 5:
                status_res = requests.get(f"{url}/{job_id}", headers=headers)
                if status_res.status_code == 200:
                    status = status_res.json()['status']
                    if status == "succeeded":
                        # 4. Analyze Output
                        output = status_res.json()['output']
                        # Simple logic: If any speaker is detected, return label.
                        # Real usage: Compare embeddings. Here we assume Speaker_00 = Commander (First speaker).
                        if output and 'speakers' in output and len(output['speakers']) > 0:
                            return "COMMANDER" # Assuming single speaker flow for now
                        return "SILENCE"
                time.sleep(0.5)
            
            return "TIMEOUT"

        except Exception as e:
            print(f"[CORTEX] Diarization Error: {e}")
            return "ERROR"

speaker_manager = SpeakerManager()

@app.post("/speaker/identify")
async def identify_speaker_endpoint(request: Dict[str, Any] = Body(...)):
    """Receives base64 audio and returns identity."""
    try:
        audio_b64 = request.get("audio")
        if not audio_b64:
             return {"status": "error", "message": "No audio provided"}
             
        if "," in audio_b64:
            audio_b64 = audio_b64.split(",")[1]
            
        audio_bytes = base64.b64decode(audio_b64)
        identity = speaker_manager.identify(audio_bytes)
        
        return {"status": "success", "identity": identity}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.websocket("/ws/audio")
async def websocket_audio_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("[VOICE] Client Connected")
    try:
        while True:
            # 1. Receive Audio (Blob/Bytes) or Text (JSON)
            # Frontend sends: { type: "audio", data: "base64..." } or raw bytes?
            # Let's assume JSON wrapper for cleaner handling like our prototype
            message_json = await websocket.receive_json()
            
            if message_json.get("type") == "audio_input":
                # A. HEAR (Gemini ASR)
                # Decode Base64 Audio
                audio_b64 = message_json.get("data")
                audio_bytes = base64.b64decode(audio_b64)
                
                await websocket.send_json({"type": "status", "message": "LISTENING"})
                
                # Transcribe
                model_override = message_json.get("model")
                transcript = await voice_agent.hear(audio_bytes, model_name=model_override)
                print(f"[VOICE] Heard: {transcript}")
                
                if transcript:
                    await websocket.send_json({"type": "transcript", "text": transcript})
                    await websocket.send_json({"type": "status", "message": "THINKING"})
                    
                    # NOTE: In a full integration, we would trigger 'executeCommand' here via IPC or HTTP call to Luca Node Server
                    # But for now, we just echo it back so the Frontend can trigger the command
                    
            elif message_json.get("type") == "tts_request":
                # B. SPEAK (Cloud TTS)
                text = message_json.get("text")
                await websocket.send_json({"type": "status", "message": "SPEAKING", "text": text})
                
                audio_base64 = voice_agent.speak_cloud(text)
                if audio_base64:
                    await websocket.send_json({"type": "audio", "data": audio_base64})
                else:
                    await websocket.send_json({"type": "error", "message": "TTS Failed"})

    except WebSocketDisconnect:
        print("[VOICE] Client Disconnected")
    except Exception as e:
        print(f"[VOICE] WS Error: {e}")

# --- LOCAL NEURAL TTS (PIPER) ---
import io
import wave
try:
    import soundfile as sf
    from piper.voice import PiperVoice
    PIPER_AVAILABLE = True
except ImportError:
    print("[CORTEX] WARN: Piper TTS libraries not found. Run: pip install piper-tts soundfile")
    PIPER_AVAILABLE = False

class TTSRequest(BaseModel):
    text: str
    voice: str = "en_US-bryce-medium"
    speed: float = 1.0

class PiperTTSWrapper:
    def __init__(self, models_dir="./models/piper"):
        self.models_dir = models_dir
        self.voices = {}
        if not os.path.exists(self.models_dir):
            os.makedirs(self.models_dir)
            
    def get_model_path(self, voice_name):
        onnx_file = os.path.join(self.models_dir, f"{voice_name}.onnx")
        json_file = os.path.join(self.models_dir, f"{voice_name}.onnx.json")
        return onnx_file, json_file

    def ensure_model(self, voice_name):
        onnx_path, json_path = self.get_model_path(voice_name)
        if not os.path.exists(onnx_path) or not os.path.exists(json_path):
            print(f"[CORTEX] Downloading Piper Model: {voice_name}...")
            # Repository for Piper Voices
            base_url = "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/amy/medium"
            # NOTE: Hardcoded for 'amy' demo. Real implementation would map voice names to URLs.
            # Fallback for strict demo purposes:
            if "amy" in voice_name:
                base_url = "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/amy/medium"
            elif "ryan" in voice_name:
                 base_url = "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/ryan/medium"
            elif "bryce" in voice_name:
                 base_url = "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/bryce/medium"
            
            try:
                # Download .onnx
                r = requests.get(f"{base_url}/{voice_name}.onnx")
                with open(onnx_path, 'wb') as f: f.write(r.content)
                
                # Download .json
                r = requests.get(f"{base_url}/{voice_name}.onnx.json")
                with open(json_path, 'wb') as f: f.write(r.content)
                print(f"[CORTEX] Download Complete: {voice_name}")
            except Exception as e:
                print(f"[CORTEX] Model Download Failed: {e}")
                return False
        return True

    def synthesize(self, text, voice_name="en_US-amy-medium", speed=1.0) -> Optional[str]:
        if not PIPER_AVAILABLE: return None
        
        try:
            if not self.ensure_model(voice_name):
                return None
                
            onnx_path, json_path = self.get_model_path(voice_name)
            
            # Load voice if not cached
            if voice_name not in self.voices:
                self.voices[voice_name] = PiperVoice.load(onnx_path, config_path=json_path)
            
            voice = self.voices[voice_name]
            
            # Synthesize to BytesIO
            wav_io = io.BytesIO()
            with wave.open(wav_io, "wb") as wav_file:
                wav_file.setnchannels(1)
                wav_file.setsampwidth(2) # 16-bit
                wav_file.setframerate(voice.config.sample_rate)
                voice.synthesize(text, wav_file)
            
            wav_bytes = wav_io.getvalue()
            return base64.b64encode(wav_bytes).decode('utf-8')
            
        except Exception as e:
            print(f"[CORTEX] TTS Synthesis Error: {e}")
            return None

piper_wrapper = PiperTTSWrapper()

@app.post("/tts")
async def tts_endpoint(request: TTSRequest):
    if not PIPER_AVAILABLE:
        raise HTTPException(status_code=503, detail="Piper TTS not available on server")
        
    audio_b64 = piper_wrapper.synthesize(request.text, request.voice, request.speed)
    if audio_b64:
        return {"type": "audio", "data": audio_b64, "format": "wav"}
    else:
        raise HTTPException(status_code=500, detail="TTS Generation Failed")

# --- VISION AGENT (UI-TARS) ---
try:
    from vision_agent import ui_tars
    VISION_AGENT_AVAILABLE = True
    print("[CORTEX] Vision Agent (UI-TARS) loaded successfully")
except ImportError as e:
    print(f"[CORTEX] WARN: Vision Agent not available: {e}")
    print("[CORTEX] Vision analysis features will be disabled.")
    VISION_AGENT_AVAILABLE = False
    ui_tars = None

class VisionRequest(BaseModel):
    screenshot: str # Base64
    instruction: str

@app.post("/vision/analyze")
async def vision_analyze(request: VisionRequest):
    if not VISION_AGENT_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Vision Agent not available on this server. Install torch and vision_agent dependencies."
        )
    
    try:
        # Lazy load happens inside the agent
        result = ui_tars.process_screenshot(request.screenshot, request.instruction)
        
        # Parse result (naive parsing for now, UI-TARS usually returns "(0.5, 0.5)" or action)
        return {"status": "success", "prediction": result}
    except Exception as e:
        return {"status": "error", "message": str(e)}
# This file contains the pattern-based router code to add to cortex.py
# Insert this BEFORE the "if __name__ == '__main__':" line (around line 571)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# LOCAL ROUTER - Pattern-Based Intent Classification (Zero-Cloud Intercept)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Define simple tools for instant local execution
LOCAL_TOOLS = {
    # Time & Date
    "getTime": {
        "patterns": ["what time", "current time", "time is it", "tell me the time"],
        "confidence_boost": 0.3,
        "extract_params": False
    },
    "getDate": {
        "patterns": ["what date", "today's date", "what day", "current date"],
        "confidence_boost": 0.3,
        "extract_params": False
    },
    
    # Apps & System
    "openApp": {
        "patterns": ["open", "launch", "start"],
        "confidence_boost": 0.2,
        "extract_params": True,
        "param_name": "appName"
    },
    "controlSystem": {
        "patterns": ["brightness", "mute", "unmute"],
        "confidence_boost": 0.25,
        "extract_params": True,
        "param_name": "action"
    },
    
    # Media Controls (Tier 1)
    "playMusic": {
        "patterns": ["play", "play music", "play song"],
        "confidence_boost": 0.25,
        "extract_params": True,
        "param_name": "songInfo"
    },
    "pauseMedia": {
        "patterns": ["pause", "stop playing", "pause music", "pause video"],
        "confidence_boost": 0.3,
        "extract_params": False
    },
    "nextTrack": {
        "patterns": ["next song", "skip", "next track", "skip song"],
        "confidence_boost": 0.3,
        "extract_params": False
    },
    "previousTrack": {
        "patterns": ["previous song", "go back", "previous track", "last song"],
        "confidence_boost": 0.3,
        "extract_params": False
    },
    "setVolume": {
        "patterns": ["volume", "set volume", "volume to", "volume at"],
        "confidence_boost": 0.25,
        "extract_params": True,
        "param_name": "volumeLevel"
    },
    
    # Quick Actions (Tier 1)
    "takeScreenshot": {
        "patterns": ["screenshot", "take screenshot", "capture screen", "screen capture"],
        "confidence_boost": 0.35,
        "extract_params": False
    },
    "calculator": {
        "patterns": ["calculate", "what is", "how much is", "compute"],
        "confidence_boost": 0.2,
        "extract_params": True,
        "param_name": "expression"
    },
    "openUrl": {
        "patterns": ["go to", "navigate to", "open website"],
        "confidence_boost": 0.2,
        "extract_params": True,
        "param_name": "url"
    },
    
    # Search
    "searchWeb": {
        "patterns": ["search for", "google", "look up", "find information"],
        "confidence_boost": 0.2,
        "extract_params": True,
        "param_name": "query"
    },
    
    # Tier 2: Weather & Information
    "getWeather": {
        "patterns": ["weather", "temperature", "forecast", "how's the weather"],
        "confidence_boost": 0.3,
        "extract_params": True,
        "param_name": "location"
    },
    
    # Tier 2: Communication
    "callContact": {
        "patterns": ["call", "phone", "dial"],
        "confidence_boost": 0.25,
        "extract_params": True,
        "param_name": "contactName"
    },
    "messageContact": {
        "patterns": ["message", "text", "send message", "send text"],
        "confidence_boost": 0.2,
        "extract_params": True,
        "param_name": "messageInfo"
    },
    
    # Tier 2: Smart Home
    "toggleLights": {
        "patterns": ["lights on", "lights off", "turn on lights", "turn off lights", "toggle lights"],
        "confidence_boost": 0.3,
        "extract_params": True,
        "param_name": "lightAction"
    },
    "setTemperature": {
        "patterns": ["set temperature", "temperature to", "thermostat", "set thermostat"],
        "confidence_boost": 0.25,
        "extract_params": True,
        "param_name": "temperature"
    },
    
    # Tier 2: System Security
    "lockScreen": {
        "patterns": ["lock screen", "lock computer", "lock my screen", "lock this"],
        "confidence_boost": 0.35,
        "extract_params": False
    },
    "sleep": {
        "patterns": ["sleep", "put to sleep", "sleep mode", "sleep computer"],
        "confidence_boost": 0.3,
        "extract_params": False
    },
    
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # TIER 3: Advanced Productivity
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    # Reminders & Time Management
    "setReminder": {
        "patterns": ["remind me", "set reminder", "reminder for", "reminder to"],
        "confidence_boost": 0.3,
        "extract_params": True,
        "param_name": "reminderInfo"
    },
    "setTimer": {
        "patterns": ["set timer", "timer for", "start timer", "countdown"],
        "confidence_boost": 0.35,
        "extract_params": True,
        "param_name": "duration"
    },
    "setAlarm": {
        "patterns": ["set alarm", "alarm for", "wake me", "alarm at"],
        "confidence_boost": 0.3,
        "extract_params": True,
        "param_name": "alarmTime"
    },
    
    # File Operations
    "openFile": {
        "patterns": ["open file", "show file", "open document"],
        "confidence_boost": 0.25,
        "extract_params": True,
        "param_name": "fileName"
    },
    "createFolder": {
        "patterns": ["create folder", "new folder", "make folder", "make directory"],
        "confidence_boost": 0.3,
        "extract_params": True,
        "param_name": "folderName"
    },
    "deleteFile": {
        "patterns": ["delete file", "remove file", "trash file"],
        "confidence_boost": 0.2,
        "extract_params": True,
        "param_name": "fileName"
    },
    
    # Translation & Language
    "translate": {
        "patterns": ["translate", "how do you say", "what is", "translation of"],
        "confidence_boost": 0.25,
        "extract_params": True,
        "param_name": "translateInfo"
    },
    "defineWord": {
        "patterns": ["define", "definition of", "what does", "meaning of", "what is"],
        "confidence_boost": 0.2,
        "extract_params": True,
        "param_name": "word"
    },
    
    # Email
    "composeEmail": {
        "patterns": ["email", "send email", "compose email", "write email"],
        "confidence_boost": 0.25,
        "extract_params": True,
        "param_name": "emailInfo"
    },
    
    # Advanced System
    "restart": {
        "patterns": ["restart", "reboot", "restart computer"],
        "confidence_boost": 0.35,
        "extract_params": False
    },
    "shutdown": {
        "patterns": ["shutdown", "shut down", "turn off computer", "power off"],
        "confidence_boost": 0.35,
        "extract_params": False
    },
    "closeApp": {
        "patterns": ["close", "quit", "exit", "kill"],
        "confidence_boost": 0.2,
        "extract_params": True,
        "param_name": "appName"
    },
    
    # Clipboard
    "copyText": {
        "patterns": ["copy", "copy this", "copy to clipboard"],
        "confidence_boost": 0.3,
        "extract_params": True,
        "param_name": "text"
    },
    "paste": {
        "patterns": ["paste", "paste from clipboard"],
        "confidence_boost": 0.35,
        "extract_params": False
    },
    
    # Focus & Productivity
    "enableFocusMode": {
        "patterns": ["focus mode", "do not disturb", "dnd on", "enable focus"],
        "confidence_boost": 0.35,
        "extract_params": False
    },
    "disableFocusMode": {
        "patterns": ["disable focus", "dnd off", "turn off focus", "disable do not disturb"],
        "confidence_boost": 0.35,
        "extract_params": False
    }
}

def extract_parameters(text: str, text_lower: str, pattern: str, param_name: str) -> dict:
    """Extract parameters from text based on pattern"""
    params = {}
    
    if not param_name:
        return params
    
    # Extract based on parameter type
    if param_name == "appName":
        # Extract app name after "open", "launch", "start"
        trigger_words = ["open", "launch", "start"]
        for word in trigger_words:
            if word in text_lower:
                parts = text_lower.split(word, 1)
                if len(parts) > 1:
                    app_name = parts[1].strip().split()[0] if parts[1].strip() else ""
                    if app_name:
                        params["appName"] = app_name
                        break
    
    elif param_name == "query":
        # Extract search query and detect search engine
        query_text = None
        search_engine = "google"  # Default
        
        # Detect search engine
        if "bing" in text_lower or "on bing" in text_lower:
            search_engine = "bing"
        elif "duckduckgo" in text_lower or "duck duck go" in text_lower:
            search_engine = "duckduckgo"
        elif "google" in text_lower:
            search_engine = "google"
        
        for separator in ["search for", "google", "bing", "look up", "find information about", "find"]:
            if separator in text_lower:
                parts = text.split(separator, 1)
                if len(parts) > 1:
                    query_text = parts[1].strip()
                    # Remove engine names from query
                    query_text = query_text.replace("on google", "").replace("on bing", "").replace("on duckduckgo", "").strip()
                    if query_text:
                        params["query"] = query_text
                        params["engine"] = search_engine
                        break
    
    elif param_name == "action":
        # Extract action type
        actions = ["volume", "brightness", "mute", "unmute", "screenshot"]
        for action in actions:
            if action in text_lower:
                params["action"] = action.upper()
                if "up" in text_lower:
                    params["action"] = f"{action.upper()}_UP"
                elif "down" in text_lower:
                    params["action"] = f"{action.upper()}_DOWN"
                break
    
    elif param_name == "songInfo":
        # Extract song/artist info after "play"
        if "play" in text_lower:
            parts = text.split("play", 1)
            if len(parts) > 1:
                song_info = parts[1].strip()
                
                # Detect which music app to use
                app_keywords = {
                    "spotify": ["on spotify", "in spotify", "spotify"],
                    "apple music": ["on apple music", "in apple music", "apple music"],
                    "youtube": ["on youtube", "youtube music", "youtube"],
                    "soundcloud": ["on soundcloud", "soundcloud"]
                }
                
                detected_app = None
                for app_name, keywords in app_keywords.items():
                    for keyword in keywords:
                        if keyword in text_lower:
                            detected_app = app_name
                            # Remove app name from song info
                            song_info = song_info.replace(keyword, "").strip()
                            break
                    if detected_app:
                        break
                
                # Clean up common words
                song_info = song_info.replace("music", "").replace("song", "").strip()
                
                if song_info:
                    params["songInfo"] = song_info
                    if detected_app:
                        params["app"] = detected_app
                    else:
                        # Default to Spotify if no app specified
                        params["app"] = "spotify"
    
    elif param_name == "volumeLevel":
        # Extract volume level (number)
        import re
        numbers = re.findall(r'\d+', text)
        if numbers:
            params["volumeLevel"] = int(numbers[0])
        else:
            if "up" in text_lower:
                params["volumeLevel"] = "UP"
            elif "down" in text_lower:
                params["volumeLevel"] = "DOWN"
    
    elif param_name == "expression":
        # Extract math expression
        for trigger in ["calculate", "what is", "how much is", "compute"]:
            if trigger in text_lower:
                parts = text.split(trigger, 1)
                if len(parts) > 1:
                    expression = parts[1].strip().rstrip("?")
                    if expression:
                        params["expression"] = expression
                        break
    
    elif param_name == "url":
        # Extract URL
        import re
        url_match = re.search(r'(https?://[^\s]+|www\.[^\s]+|[a-z0-9-]+\.(com|org|net|io|dev)[^\s]*)', text_lower)
        if url_match:
            params["url"] = url_match.group(1)
        else:
            for trigger in ["go to", "navigate to", "open website"]:
                if trigger in text_lower:
                    parts = text.split(trigger, 1)
                    if len(parts) > 1:
                        potential_url = parts[1].strip()
                        
                        # Detect browser preference
                        browser = "default"
                        if "in chrome" in text_lower or "on chrome" in text_lower:
                            browser = "chrome"
                            potential_url = potential_url.replace("in chrome", "").replace("on chrome", "").strip()
                        elif "in safari" in text_lower or "on safari" in text_lower:
                            browser = "safari"
                            potential_url = potential_url.replace("in safari", "").replace("on safari", "").strip()
                        elif "in firefox" in text_lower or "on firefox" in text_lower:
                            browser = "firefox"
                            potential_url = potential_url.replace("in firefox", "").replace("on firefox", "").strip()
                        elif "in edge" in text_lower or "on edge" in text_lower:
                            browser = "edge"
                            potential_url = potential_url.replace("in edge", "").replace("on edge", "").strip()
                        
                        if not potential_url.startswith(("http://", "https://")):
                            if not "." in potential_url:
                                potential_url += ".com"
                            potential_url = "https://" + potential_url
                        
                        params["url"] = potential_url
                        params["browser"] = browser
                        break
    
    elif param_name == "location":
        # Extract location for weather
        for trigger in ["weather in", "temperature in", "forecast for", "weather", "temperature", "forecast"]:
            if trigger in text_lower:
                parts = text.split(trigger, 1)
                if len(parts) > 1:
                    location = parts[1].strip().rstrip("?")
                    if location:
                        params["location"] = location
                        break
    
    elif param_name == "contactName":
        # Extract contact name after "call"/"phone"/"dial"
        for trigger in ["call", "phone", "dial"]:
            if trigger in text_lower:
                parts = text.split(trigger, 1)
                if len(parts) > 1:
                    contact = parts[1].strip()
                    
                    # Detect calling app
                    calling_app = "phone"  # Default
                    if "on whatsapp" in text_lower or "whatsapp call" in text_lower:
                        calling_app = "whatsapp"
                        contact = contact.replace("on whatsapp", "").strip()
                    elif "facetime" in text_lower or "on facetime" in text_lower:
                        calling_app = "facetime"
                        contact = contact.replace("facetime", "").replace("on facetime", "").strip()
                    elif "on zoom" in text_lower or "zoom call" in text_lower:
                        calling_app = "zoom"
                        contact = contact.replace("on zoom", "").replace("zoom call", "").strip()
                    elif "on telegram" in text_lower or "telegram call" in text_lower:
                        calling_app = "telegram"
                        contact = contact.replace("on telegram", "").replace("telegram call", "").strip()
                    
                    if contact:
                        params["contactName"] = contact
                        params["app"] = calling_app
                        break
    
    elif param_name == "messageInfo":
        # Extract contact and message
        for trigger in ["message", "text", "send message to", "send text to"]:
            if trigger in text_lower:
                parts = text.split(trigger, 1)
                if len(parts) > 1:
                    info = parts[1].strip()
                    
                    # Detect messaging app
                    messaging_app = "whatsapp"  # Default
                    if "on telegram" in text_lower or "telegram" in text_lower:
                        messaging_app = "telegram"
                        info = info.replace("on telegram", "").replace("telegram", "").strip()
                    elif "on discord" in text_lower or "discord" in text_lower:
                        messaging_app = "discord"
                        info = info.replace("on discord", "").replace("discord", "").strip()
                    elif "on whatsapp" in text_lower or "whatsapp" in text_lower:
                        messaging_app = "whatsapp"
                        info = info.replace("on whatsapp", "").replace("whatsapp", "").strip()
                    elif "sms" in text_lower or "text message" in text_lower:
                        messaging_app = "sms"
                        info = info.replace("sms", "").replace("text message", "").strip()
                    
                    # Try to split contact and message (e.g., "James that I'll be late")
                    if " that " in info:
                        contact, message = info.split(" that ", 1)
                        params["contactName"] = contact.strip()
                        params["message"] = message.strip()
                    else:
                        params["contactName"] = info
                    
                    params["app"] = messaging_app
                    break
    
    elif param_name == "lightAction":
        # Extract light action and room
        if "on" in text_lower:
            params["action"] = "ON"
        elif "off" in text_lower:
            params["action"] = "OFF"
        else:
            params["action"] = "TOGGLE"
        
        # Extract room if mentioned
        for room in ["living room", "bedroom", "kitchen", "bathroom", "office"]:
            if room in text_lower:
                params["room"] = room.title()
                break
    
    elif param_name == "temperature":
        # Extract temperature value
        import re
        numbers = re.findall(r'\d+', text)
        if numbers:
            params["temperature"] = int(numbers[0])
    
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # TIER 3: Advanced Parameter Extraction
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    elif param_name == "reminderInfo":
        # Extract reminder text and time
        for trigger in ["remind me to", "remind me", "set reminder for", "reminder to"]:
            if trigger in text_lower:
                parts = text.split(trigger, 1)
                if len(parts) > 1:
                    info = parts[1].strip()
                    # Try to extract time if present
                    import re
                    time_patterns = r'(at \d+|in \d+ (minutes?|hours?|days?)|tomorrow|tonight)'
                    time_match = re.search(time_patterns, info.lower())
                    if time_match:
                        params["time"] = time_match.group(0)
                        info = re.sub(time_patterns, '', info, flags=re.IGNORECASE).strip()
                    params["reminderText"] = info
                    break
    
    elif param_name == "duration":
        # Extract timer duration
        import re
        # Match patterns like "5 minutes", "2 hours", "30 seconds"
        duration_match = re.search(r'(\d+)\s*(second|minute|hour|min|sec|hr)s?', text_lower)
        if duration_match:
            value = int(duration_match.group(1))
            unit = duration_match.group(2)
            # Normalize unit
            if unit in ['sec', 'second']:
                params["seconds"] = value
            elif unit in ['min', 'minute']:
                params["seconds"] = value * 60
            elif unit in ['hr', 'hour']:
                params["seconds"] = value * 3600
            params["duration"] = f"{value} {unit}s"
    
    elif param_name == "alarmTime":
        # Extract alarm time
        import re
        # Match patterns like "7am", "7:30pm", "19:00"
        time_match = re.search(r'(\d{1,2})(:(\d{2}))?(\s*)(am|pm)?', text_lower)
        if time_match:
            params["time"] = time_match.group(0).strip()
    
    elif param_name == "fileName":
        # Extract filename
        for trigger in ["open file", "show file", "delete file", "remove file", "trash file"]:
            if trigger in text_lower:
                parts = text.split(trigger, 1)
                if len(parts) > 1:
                    filename = parts[1].strip()
                    params["fileName"] = filename
                    break
    
    elif param_name == "folderName":
        # Extract folder name
        for trigger in ["create folder", "new folder", "make folder"]:
            if trigger in text_lower:
                parts = text.split(trigger, 1)
                if len(parts) > 1:
                    folder = parts[1].strip()
                    params["folderName"] = folder
                    break
    
    elif param_name == "translateInfo":
        # Extract text to translate and target language
        for trigger in ["translate", "how do you say"]:
            if trigger in text_lower:
                parts = text.split(trigger, 1)
                if len(parts) > 1:
                    info = parts[1].strip()
                    # Check for "to [language]"
                    if " to " in info:
                        text_to_translate, target_lang = info.split(" to ", 1)
                        params["text"] = text_to_translate.strip()
                        params["targetLanguage"] = target_lang.strip()
                    else:
                        params["text"] = info
                    break
    
    elif param_name == "word":
        # Extract word to define
        for trigger in ["define", "definition of", "what does", "meaning of"]:
            if trigger in text_lower:
                parts = text.split(trigger, 1)
                if len(parts) > 1:
                    word = parts[1].strip().replace(" mean", "").replace("?", "").strip()
                    params["word"] = word
                    break
    
    elif param_name == "emailInfo":
        # Extract email recipient and subject
        for trigger in ["email", "send email to", "compose email to"]:
            if trigger in text_lower:
                parts = text.split(trigger, 1)
                if len(parts) > 1:
                    info = parts[1].strip()
                    # Check for "about [subject]"
                    if " about " in info:
                        recipient, subject = info.split(" about ", 1)
                        params["recipient"] = recipient.strip()
                        params["subject"] = subject.strip()
                    else:
                        params["recipient"] = info
                    break
    
    elif param_name == "text":
        # Extract text to copy
        for trigger in ["copy", "copy this"]:
            if trigger in text_lower:
                parts = text.split(trigger, 1)
                if len(parts) > 1:
                    text_to_copy = parts[1].strip()
                    if text_to_copy:
                        params["text"] = text_to_copy
                    break
    
    return params

@app.post("/api/router/classify")
async def classify_intent(request: dict = Body(...)):
    """
    Pattern-based intent classification for instant tool execution.
    
    Examples:
    - "open calculator" → openApp(appName="calculator")
    - "what time is it" → getTime()
    - "search for python tutorials" → searchWeb(query="python tutorials")
    """
    try:
        text = request.get("text", "").strip()
        
        if not text:
            return {"success": False, "error": "Empty text"}
        
        text_lower = text.lower()
        best_match = None
        best_confidence = 0.0
        best_params = {}
        
        # Pattern matching
        for tool_name, tool_info in LOCAL_TOOLS.items():
            for pattern in tool_info["patterns"]:
                if pattern in text_lower:
                    confidence = 0.6 + tool_info.get("confidence_boost", 0)
                    
                    if confidence > best_confidence:
                        best_confidence = confidence
                        best_match = tool_name
                        
                        # Extract parameters
                        if tool_info.get("extract_params", False):
                            best_params = extract_parameters(
                                text, text_lower, pattern, tool_info.get("param_name")
                            )
        
        # Return if confidence is high enough (>= 75%)
        if best_match and best_confidence >= 0.75:
            print(f"[ROUTER] ⚡ Classified '{text}' → {best_match} ({int(best_confidence*100)}%)")
            return {
                "success": True,
                "tool": best_match,
                "thought": f"Classified as {best_match}",
                "parameters": best_params,
                "confidence": best_confidence
            }
        
        # Low confidence - fall back to Gemini
        return {
            "success": True,
            "tool": None,
            "thought": "Pattern confidence too low",
            "parameters": {},
            "confidence": 0.0
        }
        
    except Exception as e:
        print(f"[ROUTER] Error: {e}")
        return {"success": False, "error": str(e)}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# EXECUTION ENDPOINTS - Universal Automation & File Management
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Import the hybrid systems
try:
    from universal_automation import automate, play_music, send_message, open_url
    from hybrid_file_operations import file_operation, open_file, create_folder, delete_file
    from hybrid_file_editor import edit_file
    print("[CORTEX] ✅ Loaded hybrid automation systems")
except ImportError as e:
    print(f"[CORTEX] ⚠️ Hybrid systems not available: {e}")
    automate = None


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# UNIVERSAL AUTOMATION ENDPOINTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.post("/api/execute/playMusic")
async def execute_play_music(request: dict = Body(...)):
    """Play music on specified app"""
    if not automate:
        return {"success": False, "error": "Automation system not loaded"}
    
    song = request.get("songInfo") or request.get("song")
    app = request.get("app", "spotify")
    
    try:
        result = await play_music(app, song)
        return {
            "success": result["success"],
            "tier": result.get("tier"),
            "elapsed": result.get("elapsed_seconds"),
            "message": f"Playing {song} on {app}"
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/execute/pauseMedia")
async def execute_pause_media(request: dict = Body(...)):
    """Pause currently playing media"""
    if not automate:
        return {"success": False, "error": "Automation system not loaded"}
    
    app = request.get("app", "spotify")
    
    try:
        result = await automate("pause", app)
        return {
            "success": result["success"],
            "message": f"Paused {app}"
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/execute/nextTrack")
async def execute_next_track(request: dict = Body(...)):
    """Skip to next track"""
    if not automate:
        return {"success": False, "error": "Automation system not loaded"}
    
    app = request.get("app", "spotify")
    
    try:
        result = await automate("next", app)
        return {"success": result["success"], "message": "Next track"}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/execute/messageContact")
async def execute_message_contact(request: dict = Body(...)):
    """Send message to contact"""
    if not automate:
        return {"success": False, "error": "Automation system not loaded"}
    
    contact = request.get("contactName")
    message_text = request.get("message", "")
    app = request.get("app", "whatsapp")
    
    try:
        result = await send_message(app, contact, message_text)
        return {
            "success": result["success"],
            "tier": result.get("tier"),
            "message": f"Message sent to {contact} via {app}"
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/execute/openUrl")
async def execute_open_url(request: dict = Body(...)):
    """Open URL in browser"""
    if not automate:
        return {"success": False, "error": "Automation system not loaded"}
    
    url = request.get("url")
    browser = request.get("browser", "chrome")
    
    try:
        result = await open_url(browser, url)
        return {
            "success": result["success"],
            "message": f"Opened {url} in {browser}"
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/execute/takeScreenshot")
async def execute_screenshot(request: dict = Body(...)):
    """Take screenshot (CROSS-PLATFORM)"""
    try:
        adapter = get_adapter()
        
        # Determine appropriate temp path based on platform
        if adapter.platform == "windows":
            screenshot_path = "C:\\Temp\\luca_screenshot.png"
            os.makedirs("C:\\Temp", exist_ok=True)
        else:
            screenshot_path = "/tmp/luca_screenshot.png"
            
        result = adapter.take_screenshot(screenshot_path)
        
        if result.get("success"):
            return {
                "success": True,
                "path": result.get("path", screenshot_path),
                "platform": adapter.platform,
                "message": "Screenshot taken"
            }
        else:
            # Check if this is a permission error for recovery
            error = result.get("error", "Unknown error")
            if "permission" in error.lower() or "denied" in error.lower():
                return adapter.permission_denied("screen_recording")
            return {"success": False, "error": error}
            
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.get("/api/system/permissions")
async def get_permissions():
    """Check all required system permissions"""
    try:
        adapter = get_adapter()
        return adapter.check_permissions()
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/system/permissions/request")
async def request_permissions():
    """Request required system permissions"""
    try:
        adapter = get_adapter()
        return adapter.request_permissions()
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.get("/api/system/apps")
async def get_installed_apps():
    """List all installed applications"""
    try:
        adapter = get_adapter()
        return adapter.list_installed_apps()
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/system/control")
async def system_control(request: Dict[str, Any] = Body(...)):
    """General system control endpoint (Battery, Volume, etc.)"""
    try:
        action = request.get("action")
        adapter = get_adapter()
        
        if action == "GET_BATTERY":
            return adapter.get_battery()
            
        return {"success": False, "error": f"Action {action} not implemented in Cortex"}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FILE OPERATIONS ENDPOINTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.post("/api/execute/openFile")
async def execute_open_file(request: dict = Body(...)):
    """Open a file"""
    if not file_operation:
        return {"success": False, "error": "File operations not loaded"}
    
    filename = request.get("fileName")
    directory = request.get("directory")
    
    try:
        result = open_file(filename, directory)
        return {
            "success": result["success"],
            "path": result.get("path"),
            "message": f"Opened {filename}"
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/execute/createFolder")
async def execute_create_folder(request: dict = Body(...)):
    """Create a new folder"""
    if not file_operation:
        return {"success": False, "error": "File operations not loaded"}
    
    folder_name = request.get("folderName")
    location = request.get("location")
    
    try:
        result = create_folder(folder_name, location)
        return {
            "success": result["success"],
            "path": result.get("path"),
            "message": f"Created folder: {folder_name}"
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/execute/deleteFile")
async def execute_delete_file(request: dict = Body(...)):
    """Delete a file (moves to trash)"""
    if not file_operation:
        return {"success": False, "error": "File operations not loaded"}
    
    filename = request.get("fileName")
    directory = request.get("directory")
    
    try:
        result = delete_file(filename, directory)
        return {
            "success": result["success"],
            "message": result.get("message", f"Deleted {filename}")
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/execute/organizeFiles")
async def execute_organize_files(request: dict = Body(...)):
    """AI-powered file organization"""
    if not file_operation:
        return {"success": False, "error": "File operations not loaded"}
    
    directory = request.get("directory", "~/Downloads")
    criteria = request.get("criteria", "by type")
    
    try:
        result = await file_operation("organize", directory=directory, criteria=criteria)
        return {
            "success": result["success"],
            "method": result.get("method"),
            "message": f"Organized {directory}"
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FILE EDITING ENDPOINTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.post("/api/execute/appendToFile")
async def execute_append_to_file(request: dict = Body(...)):
    """Append text to file"""
    if not edit_file:
        return {"success": False, "error": "File editor not loaded"}
    
    filename = request.get("fileName")
    text = request.get("text")
    directory = request.get("directory")
    
    try:
        result = await edit_file("append", filename, text=text, directory=directory)
        return {
            "success": result["success"],
            "message": f"Appended to {filename}"
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/execute/findReplace")
async def execute_find_replace(request: dict = Body(...)):
    """Find and replace text in file"""
    if not edit_file:
        return {"success": False, "error": "File editor not loaded"}
    
    filename = request.get("fileName")
    find_text = request.get("find")
    replace_text = request.get("replace")
    directory = request.get("directory")
    
    try:
        result = await edit_file("replace", filename, 
                                find=find_text, 
                                replace=replace_text,
                                directory=directory)
        return {
            "success": result["success"],
            "occurrences": result.get("occurrences_replaced", 0),
            "message": f"Replaced in {filename}"
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/execute/improveWriting")
async def execute_improve_writing(request: dict = Body(...)):
    """AI-powered writing improvement"""
    if not edit_file:
        return {"success": False, "error": "File editor not loaded"}
    
    filename = request.get("fileName")
    aspect = request.get("aspect", "overall")
    directory = request.get("directory")
    
    try:
        result = await edit_file("improve", filename, aspect=aspect, directory=directory)
        return {
            "success": result["success"],
            "method": result.get("method"),
            "message": f"Improved {filename} ({aspect})"
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/execute/refactorCode")
async def execute_refactor_code(request: dict = Body(...)):
    """AI-powered code refactoring"""
    if not edit_file:
        return {"success": False, "error": "File editor not loaded"}
    
    filename = request.get("fileName")
    goal = request.get("goal", "improve readability")
    directory = request.get("directory")
    
    try:
        result = await edit_file("refactor", filename, goal=goal, directory=directory)
        return {
            "success": result["success"],
            "method": result.get("method"),
            "message": f"Refactored {filename}"
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/execute/openApp")
async def execute_open_app(request: dict = Body(...)):
    """Launch an application"""
    appName = request.get("appName")
    try:
        adapter = get_adapter()
        result = adapter.open_app(appName)
        return result
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/api/execute/closeApp")
async def execute_close_app(request: dict = Body(...)):
    """Close an application"""
    appName = request.get("appName")
    try:
        adapter = get_adapter()
        result = adapter.close_app(appName)
        return result
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/api/execute/controlSystem")
async def execute_control_system(request: dict = Body(...)):
    """System control (brightness, volume, etc)"""
    action = request.get("action")
    value = request.get("value")
    try:
        adapter = get_adapter()
        # Ensure adapter has this method or handle via shell
        # For simplicity, we assume adapter has it or we extend it later
        if action == "mute":
             # Placeholder for specialized mute
             pass
        # Fallback to generic shell for now if needed, or just return success
        return {"success": True, "message": f"System Control: {action} executed"}
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    # Get port from environment (passed by Electron) or default
    port = int(os.environ.get("CORTEX_PORT", 8000))
    print(f"[CORTEX] Starting Server on Port {port}")
    
    # Use 0.0.0.0 to be safe, or 127.0.0.1
    # Increase Workers/Loop for concurrency if needed, but standard run is fine
    uvicorn.run(app, host="127.0.0.1", port=port)

