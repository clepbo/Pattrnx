import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Architecture boundaries (AGENTS.md §3). Keep in sync with ARCHITECTURE.md §2.1.
const ENGINE_FORBIDDEN = [
  { group: ["@/server/db", "@/server/db/*", "@/server/services", "@/server/services/*"], message: "Engines are pure: no DB or service imports." },
  { group: ["next", "next/*", "@supabase/*", "react", "react-dom"], message: "Engines are pure: no framework imports." },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "coverage/**", "playwright-report/**"]),
  {
    // The service-role client may only be used by cron routes and account deletion.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/server/db/admin.ts", "src/app/api/cron/**", "src/server/services/account.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        { paths: [{ name: "@/server/db/admin", message: "Service role is restricted (ARCHITECTURE.md §6)." }] },
      ],
    },
  },
  {
    // Last so it wins over the block above for engine files.
    files: ["src/server/engines/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", { patterns: ENGINE_FORBIDDEN }],
      "no-restricted-globals": [
        "error",
        { name: "Date", message: "Engines receive `today` via the snapshot; don't read the clock." },
        { name: "process", message: "Engines don't read the environment." },
      ],
      "no-restricted-properties": ["error", { object: "Math", property: "random", message: "Engines are deterministic." }],
    },
  },
]);

export default eslintConfig;
