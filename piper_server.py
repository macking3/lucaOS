import os
import sys
import logging
import subprocess
import urllib.request
from flask import Flask, request, send_file, jsonify
from flask_cors import CORS

# --- CONFIGURATION ---
PIPER_BINARY = "./piper/piper"
VOICE_MODEL = "en_US-amy-medium.onnx"
VOICE_CONFIG = "en_US-amy-medium.onnx.json"
DOWNLOAD_URL_MODEL = "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium/en_US-amy-medium.onnx"
DOWNLOAD_URL_CONFIG = "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium/en_US-amy-medium.onnx.json"
PORT = 5050

# --- SETUP APP ---
app = Flask(__name__)
CORS(app)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_binary():
    if not os.path.exists(PIPER_BINARY):
        logger.error(f"Piper binary not found at {PIPER_BINARY}")
        logger.error("Please run: sh setup_piper.sh")
        sys.exit(1)

def download_voice():
    """Download the voice model if not present."""
    if not os.path.exists(VOICE_MODEL):
        logger.info(f"Downloading voice model: {VOICE_MODEL}...")
        urllib.request.urlretrieve(DOWNLOAD_URL_MODEL, VOICE_MODEL)
        urllib.request.urlretrieve(DOWNLOAD_URL_CONFIG, VOICE_CONFIG)
        logger.info("Download complete.")
    else:
        logger.info("Voice model found.")

@app.route('/status', methods=['GET'])
def status():
    return jsonify({"status": "online", "model": VOICE_MODEL})

@app.route('/synthesize', methods=['POST'])
def synthesize():
    data = request.json
    text = data.get("text", "")
    
    if not text:
        return jsonify({"error": "No text provided"}), 400
        
    logger.info(f"Synthesizing: {text[:50]}...")
    
    try:
        # Define output file
        output_file = "synthesis.wav"
        
        # Run Piper Binary
        # Command: echo "text" | ./piper/piper --model model.onnx --output_file synthesis.wav
        process = subprocess.Popen(
            [PIPER_BINARY, "--model", VOICE_MODEL, "--output_file", output_file],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        stdout, stderr = process.communicate(input=text)
        
        if process.returncode != 0:
            logger.error(f"Piper Error: {stderr}")
            return jsonify({"error": "Synthesis failed", "details": stderr}), 500
            
        return send_file(
            output_file,
            mimetype="audio/wav",
            as_attachment=False,
            download_name="synthesis.wav"
        )
            
    except Exception as e:
        logger.error(f"Server Error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    check_binary()
    download_voice()
    print(f"🎙️  Piper TTS Server (Binary Mode) running on http://localhost:{PORT}")
    app.run(host='0.0.0.0', port=PORT)
