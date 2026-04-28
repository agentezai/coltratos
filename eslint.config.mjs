import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Project-specific:
    "docs/**",       // Documentation + vendored design bundle (HTML/JSX prototypes are reference-only)
    "coverage/**",   // vitest coverage output
    "supabase/**",   // Supabase CLI artifacts
    ".nybo/**",      // nybo memory + foundation
  ]),
]);

export default eslintConfig;
