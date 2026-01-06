#!/bin/bash
echo "Downloading Piper TTS for macOS (Intel)..."
curl -L -o piper.tar.gz https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_macos_x64.tar.gz

echo "Extracting..."
tar -xzf piper.tar.gz

echo "Cleaning up..."
rm piper.tar.gz

echo "Done! Piper binary is in ./piper/"
