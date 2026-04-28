import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  // Honor tsconfig.json paths (@/* and @/types) so vitest resolves
  // imports the same way tsc does.
  plugins: [tsconfigPaths()],
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
        plugins: [tsconfigPaths()],
        test: {
          name: "unit",
          include: ["**/*.test.ts", "**/*.test.tsx"],
          exclude: ["**/*.test-d.ts", "node_modules/**"],
        },
      },
      // Project 2: type-level tests (compile-only; no runtime assertions).
      {
        plugins: [tsconfigPaths()],
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
