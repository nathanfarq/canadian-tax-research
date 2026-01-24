import { defineConfig } from "vitest/config";
import path from "path";

/**
 * Smoke test config - does NOT mock environment variables
 * These tests hit real external services
 */
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["**/*.test.ts"],
    // No setup file - we want real env vars
    alias: {
      "@": path.resolve(__dirname, "../../"),
    },
    // Load .env.local for real API keys
    env: {
      ...process.env,
    },
  },
});
