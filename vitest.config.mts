// vitest.config.mts (.mts = ESM; with .ts Vite prints a warning)
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { configDefaults, defineConfig } from "vitest/config";

const env = config({ path: ".env.test" }).parsed ?? {};

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
      "server-only": fileURLToPath(
        new URL("tests/server-only-stub.ts", import.meta.url),
      ),
    },
  },

  test: {
    environment: "node",
    exclude: [...configDefaults.exclude, "**/*.test.tsx"], // see vitest.components.config.mts
    env, // DATABASE_URL + BETTER_AUTH_* for server/env.ts
    globalSetup: ["./tests/global-setup.ts"],
    fileParallelism: false,
  },
});
