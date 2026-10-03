import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "node:path";

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: { "server-only": path.resolve(__dirname, "tests/helpers/server-only.ts") },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    setupFiles: ["tests/setup.ts"],
    // Integration tests share one database; run files sequentially.
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
