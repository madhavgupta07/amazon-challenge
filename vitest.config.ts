import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    hookTimeout: 180_000,
    testTimeout: 60_000,
    pool: "forks",
    fileParallelism: false,
    reporters: ["default"],
  },
});
