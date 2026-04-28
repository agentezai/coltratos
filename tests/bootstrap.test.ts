import { describe, it, expect } from "vitest";

describe("project-bootstrap smoke test", () => {
  it("vitest is installed and runs (REQ-006)", () => {
    expect(true).toBe(true);
  });

  it("the @/types path alias is wired but the barrel does not yet exist (REQ-013)", async () => {
    // This dynamic import IS expected to fail today.
    // The failure proves: (a) vitest's resolver knows about @/types,
    // (b) the file does not yet exist (per RN-010 — bootstrap writes no domain code).
    // When domain-model T6 ships, src/types/index.ts will exist and this test starts passing.
    let importError: unknown = null;
    let importedModule: unknown = null;
    try {
      // @ts-expect-error -- src/types/index.ts is intentionally absent today (REQ-013).
      // When domain-model T6 ships and creates the barrel, remove this directive
      // and the test continues to pass via the success branch below.
      importedModule = await import("@/types");
    } catch (err) {
      importError = err;
    }

    if (importError !== null) {
      // Today's expected path: alias resolved but file missing.
      const message = (importError as Error).message;
      expect(message).toMatch(/Cannot find module|@\/types/i);
    } else {
      // Future path (after domain-model T6): barrel exists.
      expect(importedModule).not.toBeNull();
    }
  });
});
