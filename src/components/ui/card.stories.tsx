import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { Card, CardHead, CardBody } from "./card";
import { Button } from "./button";

const meta = {
  title: "UI/Card",
  component: Card,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "The unit of layout. White surface, hairline border, low shadow, 12 px radius. " +
          "Composed of `Card` + `CardHead` (title / sub / actions) + `CardBody`. " +
          "Never apply colored left-border accents (anti-pattern from the bundle's avoid list).",
      },
    },
  },
  args: {
    children: <CardBody>Contenido del card.</CardBody>,
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <>
        <CardHead title="Mis análisis" sub="Últimos 30 días" />
        <CardBody>147 análisis · 70% de elegibilidad promedio.</CardBody>
      </>
    ),
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText("Mis análisis")).toBeInTheDocument();
  },
};

export const WithActions: Story = {
  args: {
    children: (
      <>
        <CardHead
          title="Resultado del análisis"
          sub="Pliego LP-2024-0025 · Constructora Andes S.A.S."
          actions={
            <>
              <Button variant="ghost" leadingIcon="download" size="sm">
                Exportar
              </Button>
              <Button variant="secondary" leadingIcon="eye" size="sm">
                Ver detalle
              </Button>
            </>
          }
        />
        <CardBody>
          <div className="text-sm text-[var(--fg-2)]">
            Cumples la mayoría de requisitos. Revisa las observaciones del bloque
            financiero antes de presentarte al proceso.
          </div>
        </CardBody>
      </>
    ),
  },
};

export const BodyOnly: Story = {
  args: {
    children: (
      <CardBody>
        <p className="text-sm text-[var(--fg-2)]">
          Tu archivo se analiza de forma privada y segura.
        </p>
      </CardBody>
    ),
  },
};
