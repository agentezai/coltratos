import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * NFR-05 (design-system): only src/components/shell/sidebar.tsx may carry
 * the "use client" directive inside src/components/. Primitive UI files
 * (button, card, chip, well, banner, icon) and any other shell files must
 * remain Server Components.
 *
 * Scope is intentionally limited to src/components/ — auth pages under
 * src/app/(auth)/ are Client Components by design (they use form state).
 *
 * NFR-01 (auth-and-tenancy): src/lib/supabase/ must never import server-only
 * modules (next/headers) from client.ts, and must never expose
 * SUPABASE_SERVICE_ROLE_KEY in client-side files.
 */

const ROOT = process.cwd();
const COMPONENTS = join(ROOT, "src", "components");
const LIB_SUPABASE = join(ROOT, "src", "lib", "supabase");
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

/**
 * NFR-02 approved exception: src/components/ui/pdf-viewer.tsx carries
 * "use client" because react-pdf requires a browser environment (canvas,
 * Worker). This exception is confirmed and flagged for /nybo-verify.
 *
 * T18 exception: src/components/ui/feedback-thumbs.tsx carries "use client"
 * per NFR-01 (REQ-026 explicitly lists the feedback control as a Client
 * Component). This exception is intentional.
 */
const USE_CLIENT_ALLOWLIST = new Set([
  "src/components/shell/sidebar.tsx",
  "src/components/ui/feedback-thumbs.tsx",
  "src/components/ui/pdf-viewer.tsx",
]);

describe('RSC purity (NFR-05)', () => {
  it('only allowlisted components carry "use client" inside src/components/', () => {
    const files = walk(COMPONENTS).filter((f) => {
      const head = readFileSync(f, "utf-8").slice(0, 200);
      return USE_CLIENT_RE.test(head);
    }).map((f) => relative(ROOT, f)).sort();

    expect(files).toEqual([...USE_CLIENT_ALLOWLIST].sort());
  });

  it('src/lib/supabase/client.ts contains no server-only imports or service-role key (RN-001)', () => {
    const clientPath = join(LIB_SUPABASE, "client.ts");
    try {
      const content = readFileSync(clientPath, "utf-8");
      expect(content).not.toMatch(/next\/headers/);
      expect(content).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    } catch (e: unknown) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
        // File not yet created — test will fail until T1 is implemented
        throw new Error('src/lib/supabase/client.ts does not exist yet');
      }
      throw e;
    }
  });
});
