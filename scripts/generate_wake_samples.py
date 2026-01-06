import os
import io
import wave
import base64
import json
from piper.voice import PiperVoice

# Configuration
MODELS_DIR = "."
VOICE_NAME = "en_US-amy-medium"
OUTPUT_DIR = "public/models/wake/samples"
WAKE_WORD = "Luca"

def generate_sample(voice, text, filename, length_scale=1.0):
    path = os.path.join(OUTPUT_DIR, filename)
    print(f"Generating {filename} (length_scale={length_scale})...")
    
    try:
        # Synthesize to file
        with wave.open(path, "wb") as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2) # 16-bit
            wav_file.setframerate(voice.config.sample_rate)
            voice.synthesize(text, wav_file)
        print(f"Successfully generated {path}")
    except Exception as e:
        print(f"Error generating sample {filename}: {e}")

def main():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    onnx_path = os.path.join(MODELS_DIR, f"{VOICE_NAME}.onnx")
    json_path = os.path.join(MODELS_DIR, f"{VOICE_NAME}.onnx.json")

    if not os.path.exists(onnx_path):
        print(f"Model not found at {onnx_path}")
        return

    print(f"Loading voice model {VOICE_NAME}...")
    voice = PiperVoice.load(onnx_path, config_path=json_path)

    # Generate variations of the wake word
    variations = [
        {"name": "luca_1.wav", "text": "Luca"},
        {"name": "luca_2.wav", "text": "Luca."},
        {"name": "luca_3.wav", "text": "Luca!"},
        {"name": "luca_4.wav", "text": "Luca..."},
        {"name": "luca_5.wav", "text": "Luca?"},
    ]
    
    for v in variations:
        generate_sample(voice, v["text"], v["name"])
        
    print("Wake word sample generation complete.")

if __name__ == "__main__":
    main()
