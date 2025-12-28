const activeWin = require('active-win');

let intervalId = null;
let lastWindow = null;

function startWatching(mainWindow) {
    if (intervalId) return;

    console.log('[WINDOW_WATCHER] Started monitoring active window.');

    intervalId = setInterval(async () => {
        try {
            const windowInfo = await activeWin();

            if (!windowInfo) return;

            // Check if window changed to avoid spamming IPC
            const currentSignature = `${windowInfo.owner.name}:${windowInfo.title}`;
            if (lastWindow !== currentSignature) {
                lastWindow = currentSignature;

                // Send to Renderer
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('active-window-change', {
                        title: windowInfo.title,
                        app: windowInfo.owner.name,
                        url: windowInfo.url || null, // Only available on macOS with accessibility permissions
                        timestamp: Date.now()
                    });
                }
            }
        } catch (e) {
            // Suppress errors (e.g. permissions denied)
        }
    }, 2000); // Poll every 2 seconds
}

function stopWatching() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        console.log('[WINDOW_WATCHER] Stopped monitoring.');
    }
}

module.exports = { startWatching, stopWatching };
