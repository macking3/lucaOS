/**
 * Screen Capture Service
 * Platform-specific screen capture for Always-On Vision System
 * Supports macOS, Windows, and Linux
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const execAsync = promisify(exec);

class ScreenCaptureService {
    constructor() {
        this.platform = process.platform;
        const currentDir = (typeof process !== 'undefined' && typeof process.cwd === 'function') ? process.cwd() : '/';
        this.tempDir = path.join(currentDir, 'tmp', 'screenshots');
        this.lastCaptureHash = null;
        
        // Ensure temp directory exists
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }

        console.log(`[SCREEN_CAPTURE] Initialized for platform: ${this.platform}`);
    }

    /**
     * Detect the current platform
     */
    getPlatform() {
        return this.platform;
    }

    /**
     * Capture screenshot for current platform
     */
    async capture() {
        try {
            switch (this.platform) {
                case 'darwin':
                    return await this.captureMacOS();
                case 'win32':
                    return await this.captureWindows();
                case 'linux':
                    return await this.captureLinux();
                default:
                    return {
                        success: false,
                        error: `Unsupported platform: ${this.platform}`,
                        platform: this.platform
                    };
            }
        } catch (error) {
            console.error('[SCREEN_CAPTURE] Capture failed:', error.message);
            return {
                success: false,
                error: error.message,
                platform: this.platform
            };
        }
    }

    /**
     * Capture screenshot on macOS using screencapture command
     */
    async captureMacOS() {
        console.log('[SCREEN_CAPTURE] Starting macOS capture...');
        console.log('[SCREEN_CAPTURE] Temp directory:', this.tempDir);
        
        const imagePath = path.join(this.tempDir, `screenshot_${Date.now()}.png`);
        console.log('[SCREEN_CAPTURE] Target path:', imagePath);
        
        try {
            // Check if temp directory exists
            if (!fs.existsSync(this.tempDir)) {
                console.log('[SCREEN_CAPTURE] Temp directory does not exist, creating...');
                fs.mkdirSync(this.tempDir, { recursive: true });
            }
            
            // Use screencapture command (built-in macOS tool)
            // -x: no sounds, -t png: PNG format, -T 0: no delay
            const command = `screencapture -x -t png -T 0 "${imagePath}"`;
            console.log('[SCREEN_CAPTURE] Executing command:', command);
            
            // Use callback-based exec instead of promisified version to avoid EBADF
            await new Promise((resolve, reject) => {
                exec(command, (error, stdout, stderr) => {
                    if (error) {
                        console.error('[SCREEN_CAPTURE] Command error:', error);
                        reject(error);
                    } else {
                        console.log('[SCREEN_CAPTURE] Command executed successfully');
                        if (stderr) console.log('[SCREEN_CAPTURE] stderr:', stderr);
                        resolve();
                    }
                });
            });
            
            // Check if file was created
            if (!fs.existsSync(imagePath)) {
                console.error('[SCREEN_CAPTURE] File was not created!');
                return {
                    success: false,
                    error: 'Screenshot file was not created',
                    platform: 'darwin'
                };
            }
            
            const stats = fs.statSync(imagePath);
            console.log('[SCREEN_CAPTURE] File created, size:', stats.size, 'bytes');
            
            // Read the file
            const imageBuffer = fs.readFileSync(imagePath);
            console.log('[SCREEN_CAPTURE] Buffer read, length:', imageBuffer.length);
            
            return {
                success: true,
                imageBuffer,
                imagePath,
                platform: 'darwin'
            };
        } catch (error) {
            console.error('[SCREEN_CAPTURE] Error in captureMacOS:', error);
            
            // Detect permission errors (common on macOS)
            const isPermissionError = error.message.includes('Service not allowed') || 
                                    error.message.includes('not permitted');
            
            return {
                success: false,
                error: isPermissionError ? 'Screen Recording permission required.' : `macOS capture failed: ${error.message}`,
                platform: 'darwin',
                fix: isPermissionError ? 
                    'open "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"' : 
                    'Ensure terminal has permissions or restart the app.'
            };
        }
    }

    /**
     * Capture screenshot on Windows
     * Note: Requires screenshot-desktop package or robotjs
     */
    /**
     * Capture screenshot on Windows using PowerShell
     */
    async captureWindows() {
        console.log('[SCREEN_CAPTURE] Starting Windows capture via PowerShell...');
        const imagePath = path.join(this.tempDir, `screenshot_${Date.now()}.png`);
        
        try {
            // PowerShell command to capture screen
            // We use System.Windows.Forms and System.Drawing to capture the primary screen
            const psCommand = `Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; $bmp = New-Object System.Drawing.Bitmap([System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Width, [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Height); $graphics = [System.Drawing.Graphics]::FromImage($bmp); $graphics.CopyFromScreen(0,0,0,0, $bmp.Size); $bmp.Save('${imagePath}', [System.Drawing.Imaging.ImageFormat]::Png); $graphics.Dispose(); $bmp.Dispose();`;
            
            const command = `powershell -Command "${psCommand}"`;
            console.log('[SCREEN_CAPTURE] Executing PowerShell...');
            
            await execAsync(command);
            
            if (!fs.existsSync(imagePath)) {
                throw new Error('PowerShell failed to create screenshot file');
            }
            
            const imageBuffer = fs.readFileSync(imagePath);
            
            return {
                success: true,
                imageBuffer,
                imagePath,
                platform: 'win32'
            };
        } catch (error) {
            console.error('[SCREEN_CAPTURE] Windows capture failed:', error);
            return {
                success: false,
                error: `Windows capture failed: ${error.message}`,
                platform: 'win32',
                fix: 'Ensure PowerShell is available and ExecutionPolicy allows running commands.'
            };
        }
    }

    /**
     * Capture screenshot on Linux using xwd or import command
     */
    async captureLinux() {
        const imagePath = path.join(this.tempDir, `screenshot_${Date.now()}.png`);
        
        try {
            // Try using import command from ImageMagick (most common)
            try {
                await execAsync(`import -window root "${imagePath}"`);
            } catch {
                // Fallback to xwd + convert
                const xwdPath = imagePath.replace('.png', '.xwd');
                await execAsync(`xwd -root -out "${xwdPath}"`);
                await execAsync(`convert "${xwdPath}" "${imagePath}"`);
                // Clean up xwd file
                if (fs.existsSync(xwdPath)) {
                    fs.unlinkSync(xwdPath);
                }
            }
            
            // Read the file
            const imageBuffer = fs.readFileSync(imagePath);
            
            return {
                success: true,
                imageBuffer,
                imagePath,
                platform: 'linux'
            };
        } catch (error) {
            return {
                success: false,
                error: `Linux capture failed: ${error.message}.`,
                platform: 'linux',
                fix: 'sudo apt-get install imagemagick x11-utils && gnome-control-center privacy'
            };
        }
    }

    /**
     * Compare two images to detect if screen changed
     * Returns true if images are different
     */
    async hasScreenChanged(newImageBuffer) {
        try {
            const newHash = crypto.createHash('md5').update(newImageBuffer).digest('hex');
            
            if (this.lastCaptureHash === null) {
                // First capture, always consider it changed
                this.lastCaptureHash = newHash;
                return true;
            }
            
            const changed = newHash !== this.lastCaptureHash;
            this.lastCaptureHash = newHash;
            
            return changed;
        } catch (error) {
            console.error('[SCREEN_CAPTURE] Hash comparison failed:', error.message);
            // If comparison fails, assume changed to be safe
            return true;
        }
    }

    /**
     * Convert image buffer to base64 for API transmission
     */
    imageBufferToBase64(buffer) {
        return buffer.toString('base64');
    }

    /**
     * Clean up old screenshot files (keep last 10)
     */
    cleanupOldScreenshots() {
        try {
            const files = fs.readdirSync(this.tempDir)
                .filter(f => f.startsWith('screenshot_') && f.endsWith('.png'))
                .map(f => ({
                    name: f,
                    path: path.join(this.tempDir, f),
                    time: fs.statSync(path.join(this.tempDir, f)).mtime.getTime()
                }))
                .sort((a, b) => b.time - a.time); // Newest first

            // Keep only last 10 files
            if (files.length > 10) {
                const toDelete = files.slice(10);
                toDelete.forEach(file => {
                    try {
                        fs.unlinkSync(file.path);
                        console.log(`[SCREEN_CAPTURE] Cleaned up old screenshot: ${file.name}`);
                    } catch {
                        // Ignore deletion errors
                    }
                });
            }
        } catch (error) {
            console.warn('[SCREEN_CAPTURE] Cleanup failed:', error.message);
        }
    }

    /**
     * Reset hash state (useful for testing or restarting monitoring)
     */
    resetHashState() {
        this.lastCaptureHash = null;
        console.log('[SCREEN_CAPTURE] Hash state reset');
    }
}

// Export singleton instance
export const screenCaptureService = new ScreenCaptureService();
export default screenCaptureService;
