import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import path from "path";

/**
 * Smoke test config - does NOT mock environment variables
 * These tests hit real external services
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, "../../"), "");
  return {
    test: {
      environment: "node",
      globals: true,
      include: ["**/*.test.ts"],
      alias: {
        "@": path.resolve(__dirname, "../../"),
      },
      env,
    },
  };
});
