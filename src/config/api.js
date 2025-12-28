/**
 * API Configuration (JS Version for Backend Services)
 * Mirrors api.ts but in pure JS for Node.js consumption
 */

// For Node/Electron, use process.env
const getEnvVar = (key, fallback) => {
  if (typeof process !== "undefined" && process.env) {
    return process.env[key] || fallback;
  }
  return fallback;
};

export const API_BASE_URL = getEnvVar("VITE_API_URL", "http://localhost:3002");
export const WS_PORT = getEnvVar("VITE_WS_PORT", "3003");
export const CORTEX_URL = getEnvVar("VITE_CORTEX_URL", "http://127.0.0.1:8000");
export const AUTH_DOMAIN = getEnvVar(
  "VITE_AUTH_DOMAIN",
  "http://localhost:3001"
);
export const FRONTEND_PORT = getEnvVar("VITE_FRONTEND_PORT", "3000");
// Cloud Relay Server for Mobile Connectivity (Deployment URL)
export const RELAY_SERVER_URL = getEnvVar("VITE_RELAY_SERVER_URL", "");

/**
 * Helper function for constructing API URLs
 * @param {string} path - API path (e.g., '/api/whatsapp/chats')
 * @returns {string} Full API URL
 */
export const apiUrl = (path) => {
  // Ensure path starts with /
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

/**
 * Helper function for constructed Cortex (Python) URLs
 * @param {string} path - Cortex API path
 * @returns {string} Full Cortex URL
 */
export const cortexUrl = (path) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${CORTEX_URL}${normalizedPath}`;
};
