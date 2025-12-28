import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    base: "./",
    server: {
      port: 3000,
      proxy: {
        "/api": "http://localhost:3002",
      },
    },
    resolve: {
      alias: {
        three: "three",
        child_process: path.resolve(__dirname, "src/mocks/child_process.js"),
        util: path.resolve(__dirname, "src/mocks/node_polyfills.js"),
        fs: path.resolve(__dirname, "src/mocks/node_polyfills.js"),
        path: path.resolve(__dirname, "src/mocks/node_polyfills.js"),
        crypto: path.resolve(__dirname, "src/mocks/node_polyfills.js"),
      },
    },
    define: {
      // Safely shim process for browser compatibility
      "process.env": {
        // Explicitly expose all API keys for browser access
        GEMINI_API_KEY: JSON.stringify(
          env.GEMINI_API_KEY || env.VITE_API_KEY || env.API_KEY || ""
        ),
        VITE_API_KEY: JSON.stringify(
          env.VITE_API_KEY || env.GEMINI_API_KEY || env.API_KEY || ""
        ),
        API_KEY: JSON.stringify(
          env.API_KEY || env.GEMINI_API_KEY || env.VITE_API_KEY || ""
        ),
      },
      "process.platform": JSON.stringify(process.platform),
    },
    // Expose environment variables to import.meta.env (Vite's native way)
    envPrefix: ["VITE_", "API_", "GEMINI_"],
    build: {
      rollupOptions: {
        external: [
          // Exclude server-only tools from mobile builds
          /src\/services\/integrations\/ingestor/,
        ],
      },
    },
  };
});
