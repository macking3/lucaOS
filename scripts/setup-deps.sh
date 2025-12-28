#!/bin/bash

# Luca System Dependency Setup Script
# Installs missing tools for MacOS, Windows (via WSL/manual), and ADB

PLATFORM="$(uname)"

echo "------------------------------------------------"
echo "🔍 Luca Dependency Auditor starting..."
echo "------------------------------------------------"

if [ "$PLATFORM" == "Darwin" ]; then
    echo "🍎 Detected MacOS"
    
    # 1. Check for Python 3
    if ! command -v python3 &> /dev/null; then
        echo "❌ Python 3 not found. Please install it from python.org or 'brew install python'"
    else
        echo "✅ Python 3 found"
        # 2. Check for PyObjC (Quartz)
        echo "📦 Installing/Updating PyObjC (for mouse/keyboard control)..."
        pip3 install pyobjc
    fi

    # 3. Check for cliclick
    if ! command -v cliclick &> /dev/null; then
        echo "⚠️  cliclick not found. Optional but recommended: 'brew install cliclick'"
    fi

elif [ "$PLATFORM" == "Linux" ]; then
    echo "🐧 Detected Linux"
    # ADB check
    if ! command -v adb &> /dev/null; then
        echo "📦 Installing ADB..."
        sudo apt-get update && sudo apt-get install -y android-tools-adb
    fi
fi

# ADB check for all platforms
if ! command -v adb &> /dev/null; then
    echo "❌ ADB mission. Please install Android Platform Tools manually."
else
    echo "✅ ADB verified"
fi

echo "------------------------------------------------"
echo "✨ Dependency check complete."
echo "------------------------------------------------"
