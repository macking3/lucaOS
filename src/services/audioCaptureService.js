/**
 * Audio Capture Service
 * Platform-specific audio capture for Always-On Audio Monitoring System
 * Supports continuous passive audio monitoring
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const execAsync = (cmd, options = {}) => {
    return new Promise((resolve, reject) => {
        // Enhance PATH to include common Homebrew locations (Apple Silicon / Intel)
        const env = { 
            ...process.env, 
            ...options.env,
            PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH}` 
        };
        
        exec(cmd, { ...options, env }, (error, stdout, stderr) => {
            if (error) {
                // Attach stdout/stderr for better debugging
                error.stdout = stdout;
                error.stderr = stderr;
                reject(error);
                return;
            }
            resolve({ stdout, stderr });
        });
    });
};

class AudioCaptureService {
    constructor() {
        this.platform = process.platform;
        this.tempDir = path.join(process.cwd(), 'tmp', 'audio');
        this.currentStream = null;
        this.isCapturing = false;
        
        // Ensure temp directory exists
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }

        this.ffmpegPath = this._resolveBinary('ffmpeg');
        this.soxPath = this._resolveBinary('sox');
        
        console.log(`[AUDIO_CAPTURE] Initialized for platform: ${this.platform}`);
        console.log(`[AUDIO_CAPTURE] Resolved ffmpeg: ${this.ffmpegPath}`);
    }

    _resolveBinary(name) {
        const potentialPaths = [
            `/opt/homebrew/bin/${name}`,
            `/usr/local/bin/${name}`,
            `/usr/bin/${name}`,
            `/bin/${name}`
        ];
        
        console.log(`[AUDIO_CAPTURE] Resolving binary '${name}'...`);
        for (const p of potentialPaths) {
            const exists = fs.existsSync(p);
            console.log(`[AUDIO_CAPTURE] Checking ${p}: ${exists}`);
            if (exists) return p;
        }
        console.log(`[AUDIO_CAPTURE] Binary '${name}' not found in standard paths. Using fallback.`);
        return name; // Fallback to system PATH
    }

    /**
     * Detect the current platform
     */
    getPlatform() {
        return this.platform;
    }

    /**
     * Start continuous audio capture
     * Returns a readable stream for audio data
     */
    async startCapture(options = {}) {
        // MIGRATION: Backend Audio Capture is DISABLED in favor of Porcupine (Frontend).
        console.log('[AUDIO_CAPTURE] 🛑 Backend capture disabled. Using Porcupine.');
        return;

        if (this.isCapturing) {
            console.warn('[AUDIO_CAPTURE] Already capturing, stopping previous stream');
            await this.stopCapture();
        }

        const {
            duration = 5000,        // 5 seconds per chunk
            sampleRate = 16000,     // 16kHz (sufficient for voice/events)
            channels = 1,           // Mono
            format = 'wav'          // WAV format for compatibility
        } = options;

        try {
            this.isCapturing = true;
            console.log(`[AUDIO_CAPTURE] Starting capture on ${this.platform}`);

            switch (this.platform) {
                case 'darwin':
                    return await this.captureMacOS({ duration, sampleRate, channels, format });
                case 'win32':
                    return await this.captureWindows({ duration, sampleRate, channels, format });
                case 'linux':
                    return await this.captureLinux({ duration, sampleRate, channels, format });
                default:
                    throw new Error(`Unsupported platform: ${this.platform}`);
            }
        } catch (error) {
            console.error('[AUDIO_CAPTURE] Start capture failed:', error.message);
            this.isCapturing = false;
            throw error;
        }
    }

    /**
     * Stop audio capture
     */
    async stopCapture() {
        if (!this.isCapturing) {
            return;
        }

        try {
            // Kill any running capture processes
            if (this.currentStream) {
                if (this.currentStream.kill) {
                    this.currentStream.kill();
                }
                this.currentStream = null;
            }

            // Platform-specific cleanup
            switch (this.platform) {
                case 'darwin':
                case 'linux':
                    // Kill any ffmpeg or sox processes
                    try {
                        await execAsync(`pkill -f "ffmpeg.*audio.*capture" || true`);
                    } catch (e) {
                        // Ignore if no process found
                    }
                    break;
                case 'win32':
                    // Windows cleanup would go here
                    break;
            }

            this.isCapturing = false;
            console.log('[AUDIO_CAPTURE] Capture stopped');
        } catch (error) {
            console.error('[AUDIO_CAPTURE] Stop capture failed:', error.message);
        }
    }

    /**
     * Capture audio chunk on macOS
     * Uses ffmpeg (if available) or sox, falls back to system_record
     */
    async captureMacOS(options) {
        const { duration, sampleRate, channels, format } = options;
        const outputPath = path.join(this.tempDir, `audio_${Date.now()}.${format}`);

        try {
            // Try ffmpeg first (most reliable)
            // Try ffmpeg first (most reliable)
            if (this.ffmpegPath && this.ffmpegPath !== 'ffmpeg') {
                const ffmpegCmd = `"${this.ffmpegPath}" -f avfoundation -i ":0" -t ${duration / 1000} -ar ${sampleRate} -ac ${channels} -y "${outputPath}" 2>/dev/null`;
                
                const process = exec(ffmpegCmd);
                this.currentStream = process;
                
                return {
                    success: true,
                    filePath: outputPath,
                    stream: process,
                    platform: 'darwin',
                    method: 'ffmpeg'
                };
            } else {
                // Check if 'ffmpeg' is in PATH if absolute path failed
                try {
                     await execAsync('which ffmpeg');
                     // If we get here, it's in PATH
                     const ffmpegCmd = `ffmpeg -f avfoundation -i ":0" -t ${duration / 1000} -ar ${sampleRate} -ac ${channels} -y "${outputPath}" 2>/dev/null`;
                     const process = exec(ffmpegCmd);
                     this.currentStream = process;
                     return { success: true, filePath: outputPath, stream: process, platform: 'darwin', method: 'ffmpeg' };
                } catch (e) {
                    // Fallthrough to sox
                }
            }

            // Try sox as fallback
            if (this.soxPath && this.soxPath !== 'sox') {
                 const soxCmd = `"${this.soxPath}" -d -t wav -r ${sampleRate} -c ${channels} "${outputPath}" trim 0 ${duration / 1000}`;
                 const process = exec(soxCmd);
                 this.currentStream = process;
                 return { success: true, filePath: outputPath, stream: process, platform: 'darwin', method: 'sox' };
            }
                    
            // Start of clean fallback logic if needed, otherwise this block returns
            return {
                success: false,
                error: 'No audio capture tools available. Install ffmpeg.',
                platform: 'darwin'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                platform: 'darwin'
            };
        }
    }

    /**
     * Capture audio chunk on Windows
     * Uses ffmpeg with DirectShow or WASAPI
     */
    async captureWindows(options) {
        const { duration, sampleRate, channels, format } = options;
        const outputPath = path.join(this.tempDir, `audio_${Date.now()}.${format}`);

        try {
            // Check for ffmpeg
            await execAsync(`where ffmpeg`);
            
            // Try WASAPI (Windows Audio Session API) first, fallback to DirectShow
            let ffmpegCmd = `ffmpeg -f dshow -i audio="virtual-audio-capturer" -t ${duration / 1000} -ar ${sampleRate} -ac ${channels} -y "${outputPath}" 2>nul`;
            
            // If virtual-audio-capturer not available, try default microphone
            try {
                const process = exec(ffmpegCmd);
                this.currentStream = process;
                
                return {
                    success: true,
                    filePath: outputPath,
                    stream: process,
                    platform: 'win32',
                    method: 'ffmpeg-dshow'
                };
            } catch (dshowError) {
                // Fallback to default audio input
                ffmpegCmd = `ffmpeg -f dshow -i audio="default" -t ${duration / 1000} -ar ${sampleRate} -ac ${channels} -y "${outputPath}" 2>nul`;
                const process = exec(ffmpegCmd);
                this.currentStream = process;
                
                return {
                    success: true,
                    filePath: outputPath,
                    stream: process,
                    platform: 'win32',
                    method: 'ffmpeg-dshow-default'
                };
            }
        } catch (error) {
            return {
                success: false,
                error: `FFmpeg not found or audio device not available: ${error.message}`,
                platform: 'win32',
                suggestion: 'Install FFmpeg and ensure microphone is connected'
            };
        }
    }

    /**
     * Capture audio chunk on Linux
     * Uses ALSA (arecord) or PulseAudio (parecord), falls back to ffmpeg
     */
    async captureLinux(options) {
        const { duration, sampleRate, channels, format } = options;
        const outputPath = path.join(this.tempDir, `audio_${Date.now()}.${format}`);

        try {
            // Try ALSA arecord first
            try {
                await execAsync(`which arecord`);
                const arecordCmd = `arecord -D default -f cd -t ${format} -d ${duration / 1000} -r ${sampleRate} -c ${channels} "${outputPath}"`;
                
                const process = exec(arecordCmd);
                this.currentStream = process;
                
                return {
                    success: true,
                    filePath: outputPath,
                    stream: process,
                    platform: 'linux',
                    method: 'alsa-arecord'
                };
            } catch (alsaError) {
                // Try PulseAudio parecord
                try {
                    await execAsync(`which parecord`);
                    const parecordCmd = `parecord --rate=${sampleRate} --channels=${channels} --file-format=${format} --raw "${outputPath}" & sleep ${duration / 1000} && kill $!`;
                    
                    const process = exec(parecordCmd);
                    this.currentStream = process;
                    
                    return {
                        success: true,
                        filePath: outputPath,
                        stream: process,
                        platform: 'linux',
                        method: 'pulseaudio-parecord'
                    };
                } catch (pulseError) {
                    // Fallback to ffmpeg
                    try {
                        await execAsync(`which ffmpeg`);
                        const ffmpegCmd = `ffmpeg -f alsa -i default -t ${duration / 1000} -ar ${sampleRate} -ac ${channels} -y "${outputPath}" 2>/dev/null`;
                        
                        const process = exec(ffmpegCmd);
                        this.currentStream = process;
                        
                        return {
                            success: true,
                            filePath: outputPath,
                            stream: process,
                            platform: 'linux',
                            method: 'ffmpeg-alsa'
                        };
                    } catch (ffmpegError) {
                        throw new Error('No audio capture tools available. Install: sudo apt-get install alsa-utils pulseaudio-utils ffmpeg');
                    }
                }
            }
        } catch (error) {
            return {
                success: false,
                error: error.message,
                platform: 'linux'
            };
        }
    }

    /**
     * Capture a single audio chunk and return file path
     * This is a convenience method for one-shot captures
     */
    async captureChunk(options = {}) {
        const result = await this.startCapture(options);
        
        if (!result.success) {
            return result;
        }

        // Wait for the capture to complete
        return new Promise((resolve, reject) => {
            const duration = options.duration || 5000;
            
            setTimeout(async () => {
                await this.stopCapture();
                
                // Check if file exists
                if (fs.existsSync(result.filePath)) {
                    const stats = fs.statSync(result.filePath);
                    resolve({
                        success: true,
                        filePath: result.filePath,
                        size: stats.size,
                        platform: result.platform,
                        method: result.method
                    });
                } else {
                    reject({
                        success: false,
                        error: 'Audio file not created',
                        platform: result.platform
                    });
                }
            }, duration + 500); // Add 500ms buffer
        });
    }

    /**
     * Check if audio capture is available on this platform
     */
    async checkAvailability() {
        try {
            switch (this.platform) {
                case 'darwin':
                    if (this.ffmpegPath !== 'ffmpeg') return { available: true, method: 'ffmpeg' };
                    if (this.soxPath !== 'sox') return { available: true, method: 'sox' };
                    
                    // Fallback to checking PATH
                    try {
                        await execAsync(`which ffmpeg`);
                        return { available: true, method: 'ffmpeg' };
                    } catch (e) {
                        try {
                            await execAsync(`which sox`);
                            return { available: true, method: 'sox' };
                        } catch (e2) {
                            return { available: false, error: 'Install ffmpeg or sox: brew install ffmpeg' };
                        }
                    }
                case 'win32':
                    try {
                        await execAsync(`where ffmpeg`);
                        return { available: true, method: 'ffmpeg' };
                    } catch (e) {
                        return { available: false, error: 'Install FFmpeg and ensure microphone is connected' };
                    }
                case 'linux':
                    try {
                        await execAsync(`which arecord`);
                        return { available: true, method: 'alsa' };
                    } catch (e) {
                        try {
                            await execAsync(`which parecord`);
                            return { available: true, method: 'pulseaudio' };
                        } catch (e2) {
                            try {
                                await execAsync(`which ffmpeg`);
                                return { available: true, method: 'ffmpeg' };
                            } catch (e3) {
                                return { available: false, error: 'Install audio tools: sudo apt-get install alsa-utils pulseaudio-utils ffmpeg' };
                            }
                        }
                    }
                default:
                    return { available: false, error: `Unsupported platform: ${this.platform}` };
            }
        } catch (error) {
            return { available: false, error: error.message };
        }
    }
}

// Export singleton instance
export const audioCaptureService = new AudioCaptureService();

