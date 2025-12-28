import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Vault Location: /luca/.vault
// We store sessions as {domain}.json (e.g., whatsapp.com.json)
const VAULT_DIR = path.resolve(__dirname, "../../.vault");

if (!fs.existsSync(VAULT_DIR)) {
  fs.mkdirSync(VAULT_DIR, { recursive: true });
}

export class AuthService {
  /**
   * Save a browser session state (cookies, localStorage) to the Vault.
   * @param domain The domain key (e.g. 'whatsapp', 'tiktok')
   * @param state The storage state object from Playwright
   */
  async saveSession(domain: string, state: any): Promise<void> {
    const filePath = path.join(VAULT_DIR, `${domain}.json`);
    try {
      fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
      console.log(`[AUTH] Session saved for: ${domain}`);
    } catch (e) {
      console.error(`[AUTH] Failed to save session for ${domain}:`, e);
      throw e;
    }
  }

  /**
   * Retrieve a browser session state from the Vault.
   * @param domain The domain key
   * @returns The storage state object or null if not found
   */
  async getSession(domain: string): Promise<any | null> {
    const filePath = path.join(VAULT_DIR, `${domain}.json`);
    if (fs.existsSync(filePath)) {
      try {
        const data = fs.readFileSync(filePath, "utf-8");
        console.log(`[AUTH] Session loaded for: ${domain}`);
        return JSON.parse(data);
      } catch (e) {
        console.error(`[AUTH] Failed to load session for ${domain}:`, e);
      }
    }
    return null;
  }

  /**
   * List all stored sessions.
   */
  async listSessions(): Promise<string[]> {
    if (!fs.existsSync(VAULT_DIR)) return [];
    const files = fs.readdirSync(VAULT_DIR);
    return files
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(".json", ""));
  }
}

export const authService = new AuthService();
