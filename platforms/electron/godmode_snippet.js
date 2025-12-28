
async function toggleGodMode(enabled) {
    const endpoint = enabled ? 'start' : 'stop';
    try {
        // Node 18+ has native fetch. Electron 29+ has it.
        // Or usage of electron.net
        // Let's use fetch if available, else net.
        console.log(`[TRAY] Toggling God Mode: ${endpoint.toUpperCase()}`);
        
        // Simple fetch attempt
        await fetch(`http://localhost:3001/api/autonomy/${endpoint}`, { method: 'POST' });
        
        // Notify windows
        const status = enabled ? 'ENABLED' : 'DISABLED';
        if (mainWindow) mainWindow.webContents.send('god-mode-status', enabled);
        if (widgetWindow) widgetWindow.webContents.send('god-mode-status', enabled);
        
        console.log(`[TRAY] God Mode ${status}`);
    } catch (e) {
        console.error(`[TRAY] Failed to toggle God Mode:`, e);
    }
}
