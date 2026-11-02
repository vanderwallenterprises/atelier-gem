import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "tests/**/*.test.{ts,tsx}"],
    exclude: ["tests/e2e/**", "node_modules/**"],
    // `server-only` throws outside a React Server environment; tests import server modules directly.
    alias: { "server-only": fileURLToPath(new URL("./tests/server-only-stub.ts", import.meta.url)) },
    testTimeout: 30_000,
  },
});
