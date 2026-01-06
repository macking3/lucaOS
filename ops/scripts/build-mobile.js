import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('[MOBILE BUILD] Starting...');

// 1. Run Vite Build
console.log('[MOBILE BUILD] Running Vite Build...');
execSync('npx vite build', { stdio: 'inherit' });

// 2. Prepare Dist for Mobile
const distDir = path.join(process.cwd(), 'dist');
const mobileDir = path.join(distDir, 'mobile');
const indexHtml = path.join(distDir, 'index.html');
const mobileIndexHtml = path.join(mobileDir, 'index.html');

if (fs.existsSync(mobileIndexHtml)) {
    console.log('[MOBILE BUILD] Swapping index.html for Mobile...');

    // Backup Desktop index (optional)
    fs.renameSync(indexHtml, path.join(distDir, 'desktop_index.html'));

    // Move Mobile index to root
    fs.copyFileSync(mobileIndexHtml, indexHtml);

    // Ensure socket.io.js is in root or accessible
    // In index.html we reference "socket.io.js" (relative)
    // So we need socket.io.js in dist root
    const socketSrc = path.join(mobileDir, 'socket.io.js');
    const socketDest = path.join(distDir, 'socket.io.js');

    if (fs.existsSync(socketSrc)) {
        fs.copyFileSync(socketSrc, socketDest);
        console.log('[MOBILE BUILD] Copied socket.io.js to root');
    } else {
        console.warn('[MOBILE BUILD] Warning: socket.io.js not found in mobile dir');
    }

    console.log('[MOBILE BUILD] Dist ready for Capacitor');
} else {
    console.error('[MOBILE BUILD] Error: mobile/index.html not found in dist');
    process.exit(1);
}

// 3. Handle Capacitor Commands
const args = process.argv.slice(2);
const command = args[0];
const platform = args[1]; // e.g., 'android' or 'ios'

try {
    if (command === 'sync') {
        console.log('[MOBILE BUILD] Running Capacitor Sync...');
        execSync('npx cap sync', { stdio: 'inherit' });
    } else if (command === 'open') {
        if (!platform) {
            console.error('[MOBILE BUILD] Error: Platform required for open command');
            process.exit(1);
        }
        console.log(`[MOBILE BUILD] Opening ${platform}...`);
        execSync(`npx cap open ${platform}`, { stdio: 'inherit' });
    } else if (command === 'init') {
        console.log('[MOBILE BUILD] Initializing Capacitor...');
        const appName = "Luca";
        const appId = "com.luca.ai";
        execSync(`npx cap init "${appName}" "${appId}" --web-dir dist`, { stdio: 'inherit' });
    }
} catch (error) {
    console.error(`[MOBILE BUILD] Error executing command: ${command}`);
    process.exit(1);
}
