import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    root: path.resolve(__dirname),
    setupFiles: ["./setup.ts"],
    include: [
      "unit/**/*.test.{ts,tsx}",
      "components/**/*.test.{ts,tsx}",
      "integration/**/*.test.{ts,tsx}",
    ],
    exclude: ["e2e/**", "smoke/**"],
    alias: {
      "@": path.resolve(__dirname, "../"),
    },
    typecheck: {
      include: ["**/*.test.{ts,tsx}"],
    },
  },
});
