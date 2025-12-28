#!/bin/bash

# --- L0p4 Ghost Mode (Anonsurf adaptation for macOS) ---
# Intent: Route traffic through Tor (SOCKS5 9050)
# Limitations: Requires 'tor' and 'networksetup' permissions.

MODE=$1

if [ "$MODE" == "start" ]; then
    echo "[*] Engaging Ghost Mode..."
    
    # 1. Check if Tor is running
    if ! pgrep -x "tor" > /dev/null; then
        echo "[!] Tor is not running. Attempting to start..."
        # Try brew service or just direct execution
        if command -v tor &> /dev/null; then
            tor &> /dev/null &
            echo "[+] Tor process started."
            sleep 3
        else
            echo "[-] Tor binary not found. Install with: brew install tor"
            exit 1
        fi
    fi

    # 2. Check Tor Connection
    CURRENT_IP=$(curl -s --socks5 127.0.0.1:9050 http://checkip.amazonaws.com)
    
    if [ -z "$CURRENT_IP" ]; then
        echo "[-] Failed to connect via Tor. Is it fully bootstrapped?"
        exit 1
    fi

    echo "[+] Ghost Mode ACTIVE."
    echo "[+] Tor IP: $CURRENT_IP"
    echo "[+] SOCKS5 Proxy available at 127.0.0.1:9050"
    echo "[!] INFO: To force all Luca tools through Tor, the server sets ALL_PROXY env var."

elif [ "$MODE" == "stop" ]; then
    echo "[*] Disengaging Ghost Mode..."
    pkill -x tor
    echo "[-] Tor process killed."
    echo "[-] Direct connection restored."

else
    echo "Usage: ./anonsurf_mac.sh [start|stop]"
fi
