#!/bin/bash
echo "[LUCA] Cleaning up Zombie Processes..."

# Kill processes on Port 3001 (Main Server)
lsof -ti:3001 | xargs kill -9 2>/dev/null
if [ $? -eq 0 ]; then
    echo "[LUCA] Killed process on Port 3001."
else
    echo "[LUCA] Port 3001 was free."
fi

# Kill processes on Port 3002 (Neural Link)
lsof -ti:3002 | xargs kill -9 2>/dev/null
if [ $? -eq 0 ]; then
    echo "[LUCA] Killed process on Port 3002."
else
    echo "[LUCA] Port 3002 was free."
fi

echo "[LUCA] Cleanup Complete. Core is ready to start."
