import fs from 'fs';
import path from 'path';
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { Api } from "telegram/tl/api.js";
import { DATA_DIR } from '../config/constants.js';

class TelegramService {
    constructor() {
        this.sessionFile = path.join(DATA_DIR, 'telegram_session.txt');
        this.client = null;
        this.phoneCodeHash = null;
        this.status = 'INIT'; // INIT, WAITING_CODE, WAITING_PASSWORD, READY, ERROR
    }

    _loadSession() {
        if (fs.existsSync(this.sessionFile)) {
            return fs.readFileSync(this.sessionFile, 'utf8').trim();
        }
        return "";
    }

    _saveSession(session) {
        if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
        fs.writeFileSync(this.sessionFile, session);
    }

    getStatus() {
        return this.status;
    }

    async getMe() {
        if (this.client && this.status === 'READY') {
            try {
                const meData = await this.client.getMe();
                return {
                    id: Number(meData.id),
                    username: meData.username,
                    firstName: meData.firstName,
                    phone: meData.phone
                };
            } catch (e) {
                console.error("[TELEGRAM] Failed to fetch 'me':", e);
                return null;
            }
        }
        return null;
    }

    async requestAuth(phoneNumber, apiId, apiHash) {
        try {
            console.log(`[TELEGRAM] Requesting auth for ${phoneNumber}...`);
            const session = new StringSession(this._loadSession());
            
            this.client = new TelegramClient(session, parseInt(apiId), apiHash, {
                connectionRetries: 5,
            });

            await this.client.connect();

            const { phoneCodeHash, isCodeViaApp } = await this.client.sendCode(
                {
                    apiId: parseInt(apiId),
                    apiHash: apiHash
                },
                phoneNumber
            );

            this.phoneCodeHash = phoneCodeHash;
            this.status = 'WAITING_CODE';
            
            console.log("[TELEGRAM] Code sent via", isCodeViaApp ? "App" : "SMS");
            return { success: true, status: 'WAITING_CODE', isCodeViaApp };
        } catch (e) {
            console.error("[TELEGRAM] Request failed:", e);
            this.status = 'ERROR';
            throw e;
        }
    }

    async verifyAuth(phoneNumber, code, password, apiId, apiHash) {
        if (!code || !this.client || !this.phoneCodeHash) {
            throw new Error("Invalid state or missing code");
        }

        try {
            console.log(`[TELEGRAM] Verifying code for ${phoneNumber}...`);
            
            await this.client.invoke(
                new Api.auth.SignIn({
                    phoneNumber,
                    phoneCodeHash: this.phoneCodeHash,
                    phoneCode: code,
                })
            ).catch(async (e) => {
                if (e.message.includes("SESSION_PASSWORD_NEEDED")) {
                    if (!password) {
                        throw new Error("2FA_REQUIRED");
                    }
                    await this.client.signInUserWithPassword({
                        apiId: parseInt(apiId),
                        apiHash: apiHash,
                        password: password,
                        phoneNumber: phoneNumber,
                        phoneCode: code,
                        onError: (err) => { throw err; }
                    });
                } else {
                    throw e;
                }
            });

            this.status = 'READY';
            this._saveSession(this.client.session.save());
            console.log(`[TELEGRAM] Login Successful! Session saved.`);
            return { success: true, status: 'READY' };
        } catch (e) {
            if (e.message === "2FA_REQUIRED") {
                this.status = 'WAITING_PASSWORD';
                return { success: false, status: 'WAITING_PASSWORD', error: "2FA Password Required" };
            }
            console.error("[TELEGRAM] Verify failed:", e);
            throw e;
        }
    }

    async ensureReady(apiId, apiHash) {
        if (this.status === 'READY' && this.client) return this.client;

        const sessionStr = this._loadSession();
        if (!sessionStr) {
            throw new Error("Telegram Neural Link not configured. Please connect in Settings.");
        }

        if (!apiId || !apiHash) {
            // Try to use environment variables if not provided
            apiId = process.env.TELEGRAM_API_ID;
            apiHash = process.env.TELEGRAM_API_HASH;
        }

        if (!apiId || !apiHash) {
            throw new Error("Telegram API credentials missing. Please configure in Settings.");
        }

        console.log("[TELEGRAM] JIT: Autonomously resuming session...");
        const session = new StringSession(sessionStr);
        this.client = new TelegramClient(session, parseInt(apiId), apiHash, {
            connectionRetries: 5,
        });

        await this.client.connect();
        this.status = 'READY';
        return this.client;
    }

    async sendMessage(target, message, apiId, apiHash) {
        await this.ensureReady(apiId, apiHash);
        try {
            await this.client.sendMessage(target, { message });
            return { success: true };
        } catch (e) {
            console.error("[TELEGRAM] Send failed:", e);
            throw e;
        }
    }

    async getHistory(target, limit = 20, apiId, apiHash) {
        await this.ensureReady(apiId, apiHash);
        try {
            const messages = await this.client.getMessages(target, { limit });
            return messages.map(m => ({
                id: m.id,
                text: m.message,
                senderId: m.fromId ? Number(m.fromId.userId) : null,
                date: m.date
            }));
        } catch (e) {
            console.error("[TELEGRAM] History retrieval failed:", e);
            throw e;
        }
    }

    async getChats(limit = 10, apiId, apiHash) {
        await this.ensureReady(apiId, apiHash);
        try {
            const dialogs = await this.client.getDialogs({ limit });
            return dialogs.map(d => ({
                id: d.id.toString(),
                name: d.title || (d.entity && (d.entity.username || d.entity.firstName)) || "Unknown",
                lastMessage: d.message ? d.message.message : "",
                unreadCount: d.unreadCount,
                type: d.isGroup ? 'group' : 'private'
            }));
        } catch (e) {
            console.error("[TELEGRAM] Failed to fetch chats:", e);
            throw e;
        }
    }

    async getContacts(apiId, apiHash) {
        await this.ensureReady(apiId, apiHash);
        try {
            const result = await this.client.invoke(new Api.contacts.GetContacts({}));
            return result.users.map(u => ({
                id: u.id.toString(),
                name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.username || "Unknown",
                username: u.username,
                phone: u.phone
            }));
        } catch (e) {
            console.error("[TELEGRAM] Failed to fetch contacts:", e);
            throw e;
        }
    }
}

export const telegramService = new TelegramService();
