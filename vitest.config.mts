// vitest.config.mts (.mts = ESM; с .ts Vite выдаёт предупреждение)
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { defineConfig } from "vitest/config";
const env = config({ path: ".env.test" }).parsed ?? {};
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
      // "server-only" кидает ошибку вне Next.js — подменяем пустышкой
      "server-only": fileURLToPath(
        new URL("tests/server-only-stub.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    env, // DATABASE_URL + BETTER_AUTH_* для server/env.ts
    globalSetup: ["./tests/global-setup.ts"],
    fileParallelism: false, // одна БД -> файлы по очереди
  },
});
// tests/server-only-stub.ts
export {};
