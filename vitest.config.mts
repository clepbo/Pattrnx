import { existsSync } from "node:fs";

import { defineConfig } from "vitest/config";

// Integration helpers read local Supabase keys from .env.local (`pnpm env:local`); CI sets them directly.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    projects: [
      {
        extends: true,
        test: { name: "unit", environment: "node", include: ["src/**/*.test.ts"] },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.test.ts"],
          // Tests share one local Supabase instance; run files serially.
          fileParallelism: false,
          testTimeout: 20_000,
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["src/lib/**", "src/server/engines/**"],
      exclude: ["**/*.test.ts"],
    },
  },
});
