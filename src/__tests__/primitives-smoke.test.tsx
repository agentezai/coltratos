// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import {
  Banner,
  Button,
  Card,
  CardBody,
  CardHead,
  Chip,
  Icon,
  Well,
} from "@/components/ui";

/**
 * REQ-012 (post-Storybook revision, see deltas.md): the original /design-system
 * page is gone. The smoke contract — "every primitive renders without crashing
 * and exposes its data-component selector" — moves to this test, which
 * imports each primitive directly. Story play functions in *.stories.tsx
 * give the visual / interactive verification surface; this test gives the
 * automated CI gate without spinning up a browser.
 */
describe("Primitives smoke (REQ-012)", () => {
  it("Button renders a <button> with the COLTRATOS-style label", () => {
    const { container } = render(
      <Button variant="primary" leadingIcon="plus">Subir pliego</Button>,
    );
    expect(container.querySelector("button")).toBeTruthy();
    expect(container.textContent).toContain("Subir pliego");
  });

  it("Card + CardHead + CardBody compose with data-component selectors", () => {
    const { container } = render(
      <Card>
        <CardHead title="Mis análisis" sub="Últimos 30 días" />
        <CardBody>147 análisis</CardBody>
      </Card>,
    );
    expect(container.querySelector('[data-component="card"]')).toBeTruthy();
    expect(container.querySelector('[data-component="card-head"]')).toBeTruthy();
    expect(container.querySelector('[data-component="card-body"]')).toBeTruthy();
    expect(container.textContent).toContain("Mis análisis");
  });

  it("Chip renders with data-component=chip and its dot affordance", () => {
    const { container } = render(<Chip variant="green">Elegible</Chip>);
    const chip = container.querySelector('[data-component="chip"]');
    expect(chip).toBeTruthy();
    // dot defaults to true (RN-007: never color alone).
    expect(chip!.querySelectorAll("span").length).toBeGreaterThan(0);
  });

  it("Well wraps an Icon and exposes data-component=well", () => {
    const { container } = render(
      <Well tint="blue">
        <Icon name="chart" size={20} />
      </Well>,
    );
    expect(container.querySelector('[data-component="well"]')).toBeTruthy();
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("Banner renders with data-component=banner", () => {
    const { container } = render(
      <Banner variant="info" icon="shield">
        Tu archivo se analiza de forma privada y segura.
      </Banner>,
    );
    expect(container.querySelector('[data-component="banner"]')).toBeTruthy();
    expect(container.textContent).toContain("privada y segura");
  });

  it("Icon renders an svg with the documented attributes", () => {
    const { container } = render(<Icon name="upload" size={24} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
    expect(svg!.getAttribute("viewBox")).toBe("0 0 24 24");
    expect(svg!.getAttribute("stroke")).toBe("currentColor");
    expect(svg!.getAttribute("stroke-width")).toBe("1.75");
    expect(svg!.getAttribute("aria-hidden")).toBe("true");
  });
});
