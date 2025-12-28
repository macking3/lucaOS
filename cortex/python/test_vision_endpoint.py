import base64
import requests
import pyautogui
import io
import time
from PIL import Image

def test_vision():
    print("[TEST] Starting UI-TARS Vision Test...")
    
    # 1. Capture Screenshot
    print("[TEST] Capturing screenshot...")
    screenshot = pyautogui.screenshot()
    
    # 2. Convert to Base64
    buffered = io.BytesIO()
    screenshot.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    
    # 3. Prepare Request
    url = "http://localhost:8000/vision/analyze"
    payload = {
        "screenshot": img_str,
        "instruction": "What is visible on the screen? Identify the main window or application."
    }
    
    # 4. Send Request
    print(f"[TEST] Sending request to {url}...")
    print("[TEST] Note: The first run will trigger model loading (~5-8GB VRAM). Please wait...")
    
    start_time = time.time()
    try:
        response = requests.post(url, json=payload, timeout=300) # Long timeout for loading
        end_time = time.time()
        
        if response.status_code == 200:
            result = response.json()
            print("\n" + "="*50)
            print("UI-TARS ANALYSIS RESULT")
            print("="*50)
            print(f"Status: {result.get('status')}")
            print(f"Latency: {end_time - start_time:.2f} seconds")
            print(f"Prediction: {result.get('prediction')}")
            print("="*50)
        else:
            print(f"[TEST] Error: Server returned {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"[TEST] Failed to connect to Cortex: {e}")

if __name__ == "__main__":
    test_vision()
