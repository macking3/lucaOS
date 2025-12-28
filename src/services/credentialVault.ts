// Credential Vault Service (Frontend Proxy)
// Delegates to Electron Main Process via IPC

export class CredentialVault {
  constructor(masterPassword = "") {
    // Master password handling is managed by the main process or can be passed in future IPC calls if needed.
  }

  // Store credentials for a site
  async store(
    site: string,
    username: string,
    password: string,
    metadata: any = {}
  ) {
    if (!window.luca?.vault) {
      console.error("CredentialVault: Electron IPC not available");
      return { success: false, error: "IPC not available" };
    }
    return await window.luca.vault.store(site, username, password);
  }

  // Retrieve credentials for a site
  async retrieve(site: string) {
    if (!window.luca?.vault)
      return { success: false, error: "IPC not available" };
    return await window.luca.vault.retrieve(site);
  }

  // List all stored sites
  async list() {
    if (!window.luca?.vault) return [];
    return await window.luca.vault.list();
  }

  // Delete credentials for a site
  async delete(site: string) {
    if (!window.luca?.vault)
      return { success: false, error: "IPC not available" };
    return await window.luca.vault.delete(site);
  }

  // Check if credentials exist for a site
  async hasCredentials(site: string) {
    if (!window.luca?.vault) return false;
    return await window.luca.vault.hasCredentials(site);
  }
}
