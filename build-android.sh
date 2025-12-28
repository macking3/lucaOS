#!/bin/bash

echo "🔧 Android Build Helper - Java Version Fix"
echo "==========================================="
echo ""

# Check if Java 17 is installed via Homebrew
JAVA17_PATH="/usr/local/opt/openjdk@17"

if [ -d "$JAVA17_PATH" ]; then
    echo "✅ Java 17 found at $JAVA17_PATH"
    export JAVA_HOME="$JAVA17_PATH"
    export PATH="$JAVA_HOME/bin:$PATH"
    echo "📍 JAVA_HOME set to: $JAVA_HOME"
    echo ""
    echo "🚀 Starting Android build..."
    npm run mobile:build:android
else
    echo "❌ Java 17 not found!"
    echo ""
    echo "Please install Java 17 first:"
    echo "  brew install openjdk@17"
    echo ""
    echo "Then run this script again."
    exit 1
fi
