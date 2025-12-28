
import crypto from 'crypto';
import db from './db.js';

// Default Master Key for Dev (In Prod, use ENV: LUCA_VAULT_KEY)
const MASTER_KEY_HEX = process.env.LUCA_VAULT_KEY || '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f';

export class SecureVault {
    constructor(masterKey = null) {
        this.key = Buffer.from(masterKey || MASTER_KEY_HEX, 'hex');
        if (this.key.length !== 32) {
            throw new Error('Master Key must be 32 bytes (64 hex classs)');
        }
    }

    encrypt(text) {
        const iv = crypto.randomBytes(12); // GCM standard IV size
        const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag().toString('hex');
        return {
            encrypted,
            iv: iv.toString('hex'),
            authTag
        };
    }

    decrypt(encrypted, ivHex, authTagHex) {
        const decipher = crypto.createDecipheriv(
            'aes-256-gcm', 
            this.key, 
            Buffer.from(ivHex, 'hex')
        );
        decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }

    // --- Vault Interface ---

    async store(site, username, password, metadata = {}) {
        try {
            const { encrypted, iv, authTag } = this.encrypt(password);
            
            // Upsert
            const stmt = db.prepare(`
                INSERT INTO credentials (site, username, encrypted_password, iv, auth_tag, metadata_json, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(site) DO UPDATE SET
                    username=excluded.username,
                    encrypted_password=excluded.encrypted_password,
                    iv=excluded.iv,
                    auth_tag=excluded.auth_tag,
                    metadata_json=excluded.metadata_json,
                    updated_at=excluded.updated_at
            `);
            
            stmt.run(
                site, 
                username, 
                encrypted, 
                iv, 
                authTag, 
                JSON.stringify(metadata), 
                Date.now()
            );

            console.log(`[VAULT] Stored credentials for: ${site}`);
            return { success: true };
        } catch (error) {
            console.error('[VAULT] Store failed:', error);
            return { success: false, error: error.message };
        }
    }

    async retrieve(site) {
        try {
            const row = db.prepare('SELECT * FROM credentials WHERE site = ?').get(site);
            if (!row) {
                return { success: false, error: 'Not found' };
            }

            const password = this.decrypt(row.encrypted_password, row.iv, row.auth_tag);
            return {
                success: true,
                site: row.site,
                username: row.username,
                password,
                metadata: row.metadata_json ? JSON.parse(row.metadata_json) : {}
            };
        } catch (error) {
            console.error(`[VAULT] Retrieve failed for ${site}:`, error);
            return { success: false, error: error.message };
        }
    }

    async list() {
        try {
            const rows = db.prepare('SELECT site, username, metadata_json, updated_at FROM credentials').all();
            return rows.map(r => ({
                site: r.site,
                username: r.username,
                metadata: r.metadata_json ? JSON.parse(r.metadata_json) : {},
                updated_at: r.updated_at
            }));
        } catch (error) {
            return [];
        }
    }

    async delete(site) {
        try {
            const res = db.prepare('DELETE FROM credentials WHERE site = ?').run(site);
            return { success: res.changes > 0 };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async hasCredentials(site) {
        const row = db.prepare('SELECT 1 FROM credentials WHERE site = ?').get(site);
        return !!row;
    }
}
