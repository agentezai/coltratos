import { describe, it, expect } from "vitest";

describe("project-bootstrap smoke test", () => {
  it("vitest is installed and runs (REQ-006)", () => {
    expect(true).toBe(true);
  });

  it("the @/types barrel exists and is importable (REQ-013)", async () => {
    // domain-model-primitives T4 shipped src/types/index.ts — barrel now exists.
    const importedModule = await import("@/types");
    expect(importedModule).not.toBeNull();
  });
});
