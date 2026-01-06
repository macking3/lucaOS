/**
 * Chrome Profile Service
 * Copies user's Chrome profile data to Luca's Ghost Browser directory
 * Enables Ghost Browser to have logged-in sessions, bookmarks, etc.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

// Platform-specific Chrome profile paths
const CHROME_PROFILE_PATHS = {
    darwin: path.join(os.homedir(), 'Library', 'Application Support', 'Google', 'Chrome'),
    win32: path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data'),
    linux: path.join(os.homedir(), '.config', 'google-chrome')
};

// Luca's profile storage
const LUCA_DATA_DIR = path.join(os.homedir(), 'Documents', 'Luca');
const LUCA_BROWSER_PROFILE_DIR = path.join(LUCA_DATA_DIR, 'browser-profile');

/**
 * Get the Chrome profile path for current OS
 */
export function getChromeProfilePath() {
    const platform = process.platform;
    return CHROME_PROFILE_PATHS[platform] || null;
}

/**
 * Check if Chrome is currently running
 */
export async function isChromeRunning() {
    try {
        const platform = process.platform;
        if (platform === 'darwin') {
            const { stdout } = await execAsync('pgrep -x "Google Chrome"');
            return stdout.trim().length > 0;
        } else if (platform === 'win32') {
            const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq chrome.exe"');
            return stdout.includes('chrome.exe');
        } else {
            const { stdout } = await execAsync('pgrep -x chrome');
            return stdout.trim().length > 0;
        }
    } catch (e) {
        return false; // pgrep returns error if no process found
    }
}

/**
 * Get import status and last sync time
 */
export function getImportStatus() {
    const metaFile = path.join(LUCA_BROWSER_PROFILE_DIR, '.luca-import-meta.json');
    if (fs.existsSync(metaFile)) {
        try {
            const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
            return {
                imported: true,
                lastSync: meta.lastSync,
                profileName: meta.profileName,
                size: meta.size
            };
        } catch (e) {
            return { imported: false };
        }
    }
    return { imported: false };
}

/**
 * Copy Chrome profile to Luca's directory
 * @param profileName - Chrome profile folder name (default: 'Default')
 */
export async function importChromeProfile(profileName = 'Default') {
    const chromeBase = getChromeProfilePath();
    if (!chromeBase) {
        throw new Error(`Chrome profile not found for platform: ${process.platform}`);
    }

    const chromeProfile = path.join(chromeBase, profileName);
    if (!fs.existsSync(chromeProfile)) {
        throw new Error(`Chrome profile "${profileName}" not found at ${chromeProfile}`);
    }

    // Check if Chrome is running
    if (await isChromeRunning()) {
        throw new Error('Chrome is currently running. Please close Chrome before importing.');
    }

    // Create Luca browser profile directory
    if (!fs.existsSync(LUCA_BROWSER_PROFILE_DIR)) {
        fs.mkdirSync(LUCA_BROWSER_PROFILE_DIR, { recursive: true });
    }

    const destProfile = path.join(LUCA_BROWSER_PROFILE_DIR, 'Default');

    // Key files/folders to copy (not everything - just what's needed for sessions)
    const itemsToCopy = [
        'Cookies',
        'Login Data',
        'Web Data',
        'Preferences',
        'Secure Preferences',
        'Bookmarks',
        'History',
        'Local Storage',
        'Session Storage',
        'IndexedDB',
        'Extension State'
    ];

    // Create destination profile folder
    if (!fs.existsSync(destProfile)) {
        fs.mkdirSync(destProfile, { recursive: true });
    }

    let totalSize = 0;
    let copiedItems = [];

    for (const item of itemsToCopy) {
        const src = path.join(chromeProfile, item);
        const dest = path.join(destProfile, item);

        if (fs.existsSync(src)) {
            try {
                const stat = fs.statSync(src);
                if (stat.isDirectory()) {
                    await copyDirectory(src, dest);
                } else {
                    fs.copyFileSync(src, dest);
                }
                totalSize += stat.size || 0;
                copiedItems.push(item);
            } catch (e) {
                console.warn(`[ChromeProfile] Failed to copy ${item}:`, e.message);
            }
        }
    }

    // Also copy Local State file from parent directory (needed for decryption)
    const localState = path.join(chromeBase, 'Local State');
    if (fs.existsSync(localState)) {
        fs.copyFileSync(localState, path.join(LUCA_BROWSER_PROFILE_DIR, 'Local State'));
    }

    // Save import metadata
    const meta = {
        lastSync: new Date().toISOString(),
        profileName,
        size: totalSize,
        itemsCopied: copiedItems
    };
    fs.writeFileSync(
        path.join(LUCA_BROWSER_PROFILE_DIR, '.luca-import-meta.json'),
        JSON.stringify(meta, null, 2)
    );

    return {
        success: true,
        profilePath: LUCA_BROWSER_PROFILE_DIR,
        itemsCopied: copiedItems,
        size: totalSize
    };
}

/**
 * Clear imported profile
 */
export async function clearImportedProfile() {
    if (fs.existsSync(LUCA_BROWSER_PROFILE_DIR)) {
        await fs.promises.rm(LUCA_BROWSER_PROFILE_DIR, { recursive: true, force: true });
    }
    return { success: true };
}

/**
 * Get path to Luca's browser profile (for Puppeteer userDataDir)
 */
export function getLucaBrowserProfilePath() {
    if (fs.existsSync(LUCA_BROWSER_PROFILE_DIR)) {
        return LUCA_BROWSER_PROFILE_DIR;
    }
    return null;
}

/**
 * List available Chrome profiles
 */
export function listChromeProfiles() {
    const chromeBase = getChromeProfilePath();
    if (!chromeBase || !fs.existsSync(chromeBase)) {
        return [];
    }

    const profiles = [];
    const items = fs.readdirSync(chromeBase);
    
    for (const item of items) {
        const profilePath = path.join(chromeBase, item);
        const prefsPath = path.join(profilePath, 'Preferences');
        
        if (fs.existsSync(prefsPath)) {
            try {
                const prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf8'));
                profiles.push({
                    folderName: item,
                    displayName: prefs.profile?.name || item,
                    email: prefs.account_info?.[0]?.email || null
                });
            } catch (e) {
                profiles.push({ folderName: item, displayName: item });
            }
        }
    }
    
    return profiles;
}

// Helper: Copy directory recursively
async function copyDirectory(src, dest) {
    await fs.promises.mkdir(dest, { recursive: true });
    const entries = await fs.promises.readdir(src, { withFileTypes: true });
    
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        if (entry.isDirectory()) {
            await copyDirectory(srcPath, destPath);
        } else {
            await fs.promises.copyFile(srcPath, destPath);
        }
    }
}

export default {
    getChromeProfilePath,
    isChromeRunning,
    getImportStatus,
    importChromeProfile,
    clearImportedProfile,
    getLucaBrowserProfilePath,
    listChromeProfiles
};
