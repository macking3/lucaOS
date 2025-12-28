import wwebjs from 'whatsapp-web.js';
import path from 'path';
import fs from 'fs';
import { DATA_DIR } from '../config/constants.js';

const { Client, LocalAuth } = wwebjs;

class WhatsAppService {
    constructor() {
        this.client = null;
        this.status = 'DISCONNECTED';
        this.qr = null;
        this.startTime = 0;
        this.messageCount = 0;
    }

    getStatus() {
        return {
            status: this.status,
            qr: this.qr,
            startTime: this.startTime,
            messageCount: this.messageCount,
            error: this.errorDetails || null,
            fix: this.fixSuggestion || null
        };
    }

    async initialize() {
        if (this.client) return; // Already initialized

        console.log('[WHATSAPP] Initializing client (Lazy Load)...');
        this.status = 'INITIALIZING';
        this.qr = null;

        try {
            // Use LUCA_ROOT_DIR for persistent session storage
            const authPath = path.join(DATA_DIR, '.wwebjs_auth');
            if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

            this.client = new Client({
                authStrategy: new LocalAuth({ dataPath: authPath }),
                authTimeoutMs: 60000,
                qrMaxRetries: 5,
                puppeteer: {
                    headless: true,
                    handleSIGINT: false,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-accelerated-2d-canvas',
                        '--no-first-run',
                        '--no-zygote',
                        '--disable-gpu'
                    ],
                    timeout: 60000
                }
            });

            this._setupEventListeners();
            await this.client.initialize();
        } catch (e) {
            console.error("[WHATSAPP] Critical Init Error:", e);
            this.status = 'ERROR_CRITICAL';
            this.errorDetails = e.message;
            this.fixSuggestion = "Ensure Chromium is installed: 'sudo apt install chromium-browser' or delete '.wwebjs_auth' and restart.";
            this.client = null;
        }
    }

    _setupEventListeners() {
        let qrLogCount = 0;
        
        this.client.on('qr', (qr) => {
            if (qrLogCount === 0 || qrLogCount % 10 === 0) {
                console.log('[WHATSAPP] QR Code received (Scan in Web App)');
            }
            qrLogCount++;
            this.qr = qr;
            this.status = 'SCAN_QR';
        });

        this.client.on('ready', () => {
            console.log('[WHATSAPP] Client is ready!');
            this.status = 'READY';
            this.qr = null;
            this.startTime = Date.now();
        });

        this.client.on('authenticated', () => {
            console.log('[WHATSAPP] Authenticated');
            this.status = 'AUTHENTICATED';
            this.qr = null;
        });

        this.client.on('message', () => {
            this.messageCount++;
        });

        this.client.on('message_create', (msg) => {
            if (msg.fromMe) this.messageCount++;
        });

        this.client.on('auth_failure', msg => {
            console.error('[WHATSAPP] AUTH FAILURE', msg);
            this.status = 'ERROR_AUTH';
        });

        this.client.on('disconnected', (reason) => {
            console.log('[WHATSAPP] Client was disconnected', reason);
            this.status = 'DISCONNECTED';
            this.client = null;
            this.qr = null;
            this.startTime = 0;
            this.messageCount = 0;
        });
    }

    async ensureInitialized() {
        if (!this.client) {
            await this.initialize();
        }
        
        let attempts = 0;
        while (this.status === 'INITIALIZING' && attempts < 20) {
            await new Promise(r => setTimeout(r, 500));
            attempts++;
        }
        return this.client;
    }

    getClient() {
        return this.client;
    }
}

export const whatsappService = new WhatsAppService();
