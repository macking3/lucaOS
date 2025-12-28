/**
 * Secure Vault
 * Stores sensitive credentials encrypted at rest
 */

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VAULT_DIR = path.join(__dirname, '../../data/vault');
const ENCRYPTION_KEY = process.env.VAULT_KEY || 'luca-vault-secret-key-change-in-production';

export class SecureVault {
  constructor() {
    this.ensureVaultDir();
  }

  async ensureVaultDir() {
    try {
      await fs.mkdir(VAULT_DIR, { recursive: true });
    } catch (err) {
      console.error('[SecureVault] Failed to create vault directory:', err);
    }
  }

  /**
   * Encrypt data
   */
  encrypt(data) {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      iv: iv.toString('hex'),
      encryptedData: encrypted
    };
  }

  /**
   * Decrypt data
   */
  decrypt(encrypted) {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const iv = Buffer.from(encrypted.iv, 'hex');
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted.encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }

  /**
   * Store data in vault
   */
  async store(key, data) {
    try {
      const encrypted = this.encrypt(data);
      const filePath = path.join(VAULT_DIR, `${key}.enc`);
      await fs.writeFile(filePath, JSON.stringify(encrypted), 'utf8');
      return true;
    } catch (error) {
      console.error('[SecureVault] Store failed:', error);
      throw error;
    }
  }

  /**
   * Retrieve data from vault
   */
  async retrieve(key) {
    try {
      const filePath = path.join(VAULT_DIR, `${key}.enc`);
      const encrypted = JSON.parse(await fs.readFile(filePath, 'utf8'));
      return this.decrypt(encrypted);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null; // Key not found
      }
      console.error('[SecureVault] Retrieve failed:', error);
      throw error;
    }
  }

  /**
   * Delete data from vault
   */
  async delete(key) {
    try {
      const filePath = path.join(VAULT_DIR, `${key}.enc`);
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return true; // Already deleted
      }
      console.error('[SecureVault] Delete failed:', error);
      throw error;
    }
  }

  /**
   * List all vault keys
   */
  async list() {
    try {
      const files = await fs.readdir(VAULT_DIR);
      return files
        .filter(f => f.endsWith('.enc'))
        .map(f => f.replace('.enc', ''));
    } catch (error) {
      console.error('[SecureVault] List failed:', error);
      return [];
    }
  }
}

export default SecureVault;
