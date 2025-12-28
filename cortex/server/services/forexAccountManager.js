/**
 * Forex Account Manager
 * Handles multi-broker account connections and credential storage
 */

import { SecureVault } from './secureVault.js';
import { getBrokerClient, getAllBrokerIds } from './brokers/index.js';

class ForexAccountManager {
  constructor() {
    this.vault = new SecureVault();
    this.activeAccount = null;
  }

  /**
   * Save a new forex account
   */
  async saveAccount(config) {
    const { broker, alias, apiKey, accountId, environment } = config;
    
    // Validate required fields
    if (!broker || !alias || !apiKey) {
      throw new Error('Missing required fields: broker, alias, apiKey');
    }

    // Test connection first
    const isValid = await this.testConnection(broker, apiKey, accountId, environment);
    
    if (!isValid) {
      throw new Error('Invalid credentials or connection failed');
    }

    // Generate unique vault key
    const timestamp = Date.now();
    const vaultKey = `forex_${broker}_${alias.toLowerCase().replace(/\s+/g, '_')}_${timestamp}`;
    
    // Save to vault (encrypted)
    await this.vault.store(vaultKey, {
      broker,
      alias,
      apiKey,
      accountId: accountId || null,
      environment: environment || 'demo',
      createdAt: timestamp,
      lastUsed: timestamp
    });

    console.log(`[ForexAccountManager] Account saved: ${vaultKey}`);
    return { success: true, vaultKey };
  }

  /**
   * Test broker connection
   */
  async testConnection(broker, apiKey, accountId, environment) {
    try {
      // Validate broker exists
      if (!getAllBrokerIds().includes(broker)) {
        throw new Error(`Unsupported broker: ${broker}`);
      }
      
      // Get broker client and test
      const client = getBrokerClient(broker);
      return await client.testConnection(apiKey, accountId, environment);
    } catch (error) {
      console.error('[ForexAccountManager] Connection test failed:', error);
      return false;
    }
  }

  /**
   * List all saved forex accounts
   */
  async listAccounts() {
    try {
      const keys = await this.vault.list();
      const forexKeys = keys.filter(k => k.startsWith('forex_'));
      
      const accounts = [];
      for (const key of forexKeys) {
        try {
          const data = await this.vault.retrieve(key);
          if (data) {
            accounts.push({
              vaultKey: key,
              broker: data.broker,
              alias: data.alias,
              accountId: data.accountId || 'N/A',
              environment: data.environment || 'demo',
              createdAt: data.createdAt,
              isActive: this.activeAccount === key
            });
          }
        } catch (err) {
          console.warn(`[ForexAccountManager] Failed to load account ${key}:`, err);
        }
      }
      
      // Sort by last used
      accounts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      
      return accounts;
    } catch (error) {
      console.error('[ForexAccountManager] Failed to list accounts:', error);
      return [];
    }
  }

  /**
   * Set active forex account
   */
  async setActiveAccount(vaultKey) {
    const data = await this.vault.retrieve(vaultKey);
    if (!data) {
      throw new Error('Account not found');
    }
    
    this.activeAccount = vaultKey;
    
    // Update last used timestamp
    await this.vault.store(vaultKey, {
      ...data,
      lastUsed: Date.now()
    });
    
    console.log(`[ForexAccountManager] Active account set: ${vaultKey}`);
    return { success: true, account: data };
  }

  /**
   * Get current active account
   */
  async getActiveAccount() {
    if (!this.activeAccount) {
      // Try to get the most recently used account
      const accounts = await this.listAccounts();
      if (accounts.length > 0) {
        await this.setActiveAccount(accounts[0].vaultKey);
      } else {
        return null;
      }
    }
    
    const data = await this.vault.retrieve(this.activeAccount);
    return data;
  }

  /**
   * Get credentials for active account
   */
  async getActiveCredentials() {
    const account = await this.getActiveAccount();
    if (!account) {
      throw new Error('No active forex account. Please connect a broker account first.');
    }
    
    return {
      broker: account.broker,
      apiKey: account.apiKey,
      accountId: account.accountId,
      environment: account.environment
    };
  }

  /**
   * Delete a forex account
   */
  async deleteAccount(vaultKey) {
    await this.vault.delete(vaultKey);
    
    if (this.activeAccount === vaultKey) {
      this.activeAccount = null;
      
      // Set another account as active if available
      const accounts = await this.listAccounts();
      if (accounts.length > 0) {
        await this.setActiveAccount(accounts[0].vaultKey);
      }
    }
    
    console.log(`[ForexAccountManager] Account deleted: ${vaultKey}`);
    return { success: true };
  }

  /**
   * Check if any account is connected
   */
  async hasActiveAccount() {
    const account = await this.getActiveAccount();
    return account !== null;
  }
}

export default new ForexAccountManager();
