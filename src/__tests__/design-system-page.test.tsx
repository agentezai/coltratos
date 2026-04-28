// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import DesignSystemPage from "../../app/(internal)/design-system/page";

/**
 * REQ-012 smoke test: the /design-system page must render at least one
 * instance of every primitive (Button, Card, Chip, Well, Banner) plus
 * the COLTRATOS wordmark. This catches a primitive accidentally being
 * removed from the preview composition or a broken default export.
 */
describe("/design-system page smoke (REQ-012)", () => {
  it("renders all 5 primitives + COLTRATOS wordmark", () => {
    const { container } = render(<DesignSystemPage />);

    expect(container.querySelector("button"), "Button primitive").toBeTruthy();
    expect(
      container.querySelector('[data-component="card"]'),
      "Card primitive",
    ).toBeTruthy();
    expect(
      container.querySelector('[data-component="chip"]'),
      "Chip primitive",
    ).toBeTruthy();
    expect(
      container.querySelector('[data-component="well"]'),
      "Well primitive",
    ).toBeTruthy();
    expect(
      container.querySelector('[data-component="banner"]'),
      "Banner primitive",
    ).toBeTruthy();

    expect(container.textContent).toContain("COLTRATOS");
    expect(container.textContent).toContain("Design system");
    expect(container.textContent).toContain("Elegible");
  });
});
