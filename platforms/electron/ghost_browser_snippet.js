
// --- GHOST BROWSER (Standalone) ---
function createGhostBrowserWindow(url = 'https://google.com') {
    const isDev = !app.isPackaged;
    const browserWin = new BrowserWindow({
        width: 1024,
        height: 768,
        title: "Ghost Browser",
        backgroundColor: '#000000',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.cjs'),
            webviewTag: true // Vital
        }
    });

    // Use ?mode=browser&initialUrl=...
    const appUrl = isDev 
        ? `http://localhost:3000?mode=browser&initialUrl=${encodeURIComponent(url)}` 
        : `file://${path.join(__dirname, '../dist/index.html')}?mode=browser&initialUrl=${encodeURIComponent(url)}`;
    
    browserWin.loadURL(appUrl);
}

// IPC to open browser from Renderer
ipcMain.on('open-browser', (event, { url }) => {
    createGhostBrowserWindow(url);
});
