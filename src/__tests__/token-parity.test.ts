import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * NFR-04: every CSS custom property name in the bundle's
 * colors_and_type.css must also appear in the production app/globals.css
 * `:root` block. Adding or renaming a token on either side without the
 * other fails this test.
 *
 * Note: the bundle's file also contains @font-face declarations and the
 * .coltratos-typo / .coltratos-app helper classes that we deliberately
 * do NOT mirror. We only compare the bundle's `:root { ... }` block
 * (lines 29–199 in the original file) against the production `:root` block.
 */
const TOKEN_NAME_RE = /^\s*(--[a-z][a-z0-9-]*)\s*:/gm;

function extractRootTokenNames(css: string): Set<string> {
  // Find `:root { ... }` (ignore @theme); take only the first occurrence.
  const match = css.match(/:root\s*\{([\s\S]*?)\n\}/m);
  if (!match) {
    throw new Error(":root block not found");
  }
  const block = match[1] ?? "";
  const names = new Set<string>();
  for (const m of block.matchAll(TOKEN_NAME_RE)) {
    if (m[1]) names.add(m[1]);
  }
  return names;
}

describe("Token parity vs design-system bundle (NFR-04)", () => {
  it("every bundle token is defined in app/globals.css :root", () => {
    const bundleCss = readFileSync(
      resolve(
        process.cwd(),
        "docs/design-system/source/project/colors_and_type.css",
      ),
      "utf-8",
    );
    const productionCss = readFileSync(
      resolve(process.cwd(), "app/globals.css"),
      "utf-8",
    );

    const bundleNames = extractRootTokenNames(bundleCss);
    const productionNames = extractRootTokenNames(productionCss);

    const missingInProduction = [...bundleNames].filter(
      (n) => !productionNames.has(n),
    );
    const extraInProduction = [...productionNames].filter(
      (n) => !bundleNames.has(n),
    );

    expect(missingInProduction).toEqual([]);
    expect(extraInProduction).toEqual([]);
    expect(productionNames.size).toBe(bundleNames.size);
    expect(productionNames.size).toBeGreaterThan(80); // sanity check
  });
});
