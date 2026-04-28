import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      // Mirror tsconfig paths so vitest-resolved imports match tsc-resolved imports.
      "@": resolve(__dirname, "./src"),
      "@/types": resolve(__dirname, "./src/types/index.ts"),
    },
  },
  test: {
    // Non-globals: import describe/it/expect explicitly (RN-006).
    globals: false,
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      reportsDirectory: "./coverage",
    },
    // vitest 4 workspaces are configured inline via test.projects.
    projects: [
      // Project 1: standard runtime tests.
      {
        test: {
          name: "unit",
          include: ["**/*.test.ts", "**/*.test.tsx"],
          exclude: ["**/*.test-d.ts", "node_modules/**"],
        },
      },
      // Project 2: type-level tests (compile-only; no runtime assertions).
      {
        test: {
          name: "types",
          include: ["**/*.test-d.ts"],
          typecheck: {
            enabled: true,
          },
        },
      },
    ],
  },
});
