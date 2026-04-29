import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * NFR-05: only src/components/shell/sidebar.tsx may carry the "use client"
 * directive in v1 of the design-system spec. Adding it to a primitive
 * file (button, card, chip, well, banner, icon) or any other shell file
 * fails this test.
 */

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const USE_CLIENT_RE = /^["']use client["']\s*;?/m;

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, acc);
    } else if (/\.(tsx?|jsx?)$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

describe('RSC purity (NFR-05)', () => {
  it('only src/components/shell/sidebar.tsx carries "use client"', () => {
    const files = walk(SRC).filter((f) => {
      const head = readFileSync(f, "utf-8").slice(0, 200);
      return USE_CLIENT_RE.test(head);
    }).map((f) => relative(ROOT, f)).sort();

    expect(files).toEqual(["src/components/shell/sidebar.tsx"]);
  });
});
