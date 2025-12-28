import os
import requests
import json
from dotenv import load_dotenv

# Load env
load_dotenv(".env.local")
load_dotenv()

API_KEY = os.environ.get("GEMINI_API_KEY") or os.environ.get("VITE_API_KEY")

if not API_KEY:
    print("❌ Critical: No API Key found in .env or .env.local")
    exit(1)

print(f"🔑 Testing API Key: {API_KEY[:5]}... (Redacted)")

def test_tts(text="Hello! Verification of Nigerian voice synthesis complete."):
    url = f"https://texttospeech.googleapis.com/v1/text:synthesize?key={API_KEY}"
    
    # Payload for Nigerian English (WaveNet or Standard)
    payload = {
        "input": {"text": text},
        "voice": {"languageCode": "en-NG", "name": "en-NG-Standard-A"}, # Trying Standard for safety
        "audioConfig": {"audioEncoding": "MP3"}
    }
    
    print(f"\n📡 Sending request to Google Cloud TTS...")
    print(f"   Voice: en-NG-Standard-A")
    
    try:
        response = requests.post(url, json=payload, timeout=10)
        
        if response.status_code == 200:
            print("✅ SUCCESS: TTS API replied with Audio Data.")
            data = response.json()
            audio_content = data.get("audioContent")
            if audio_content:
                print(f"   Audio Size: {len(audio_content)} chars")
                # Save to file
                with open("tts_verify.mp3", "wb") as f:
                    import base64
                    f.write(base64.b64decode(audio_content))
                print("   Saved to 'tts_verify.mp3'. Play this file to confirm.")
            else:
                print("⚠️ Warning: Response 200 but no audioContent found.")
        else:
            print(f"❌ FAILURE: API Status {response.status_code}")
            print(f"   Error: {response.text}")
            
    except Exception as e:
        print(f"❌ CONNECTION ERROR: {e}")

if __name__ == "__main__":
    test_tts()
