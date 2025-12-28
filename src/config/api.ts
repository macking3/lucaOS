/**
 * API Configuration
 * Centralizes all backend API URLs for easy environment management
 */

// For Vite apps, use import.meta.env
// For Node/Electron, use process.env
const getEnvVar = (key: string, fallback: string): string => {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    return import.meta.env[key] || fallback;
  }
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
 * @param path - API path (e.g., '/api/whatsapp/chats')
 * @returns Full API URL
 */
export const apiUrl = (path: string): string => {
  // Ensure path starts with /
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

/**
 * Helper function for constructed Cortex (Python) URLs
 */
export const cortexUrl = (path: string): string => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${CORTEX_URL}${normalizedPath}`;
};
