#!/bin/bash
echo "[SETUP] Setting up UI-TARS Vision Environment..."

# 1. Install/Verify Python 3.11
if ! command -v python3.11 &> /dev/null; then
    echo "[SETUP] Python 3.11 not found. Attempting to install via Homebrew..."
    brew install python@3.11
fi

# 2. Create Virtual Environment
VENV_DIR="cortex/python/venv"
if [ ! -d "$VENV_DIR" ]; then
    echo "[SETUP] Creating Virtual Environment in $VENV_DIR..."
    python3.11 -m venv $VENV_DIR
fi

# 3. Upgrade pip
echo "[SETUP] Upgrading pip..."
source $VENV_DIR/bin/activate
pip install --upgrade pip

# 4. Install Dependencies
echo "[SETUP] Installing UI-TARS Dependencies (This may take a few minutes)..."
pip install -r cortex/python/requirements.txt

echo "[SETUP] Done! Environment is ready."
