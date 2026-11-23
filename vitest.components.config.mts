// React component tests: jsdom, no DB (without globalSetup)
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },

  test: {
    environment: "jsdom",
    include: ["app/**/*.test.tsx"],
    setupFiles: ["./tests/components-setup.ts"],
  },
});
