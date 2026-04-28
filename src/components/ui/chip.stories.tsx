import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { Chip } from "./chip";

const meta = {
  title: "UI/Chip",
  component: Chip,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Pill with optional dot. The traffic-light trio (green / amber / red) is the product's " +
          "whole point — never decorative. The `dot` prop defaults to true; the system relies on " +
          "dot + text label, not color alone (RN-007).",
      },
    },
  },
  argTypes: {
    variant: {
      control: { type: "inline-radio" },
      options: ["green", "amber", "red", "blue", "violet", "gray"],
    },
    dot: { control: "boolean" },
  },
  args: {
    variant: "green",
    dot: true,
    children: "Elegible",
  },
} satisfies Meta<typeof Chip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Elegible: Story = {
  args: { variant: "green", children: "Elegible" },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText("Elegible")).toBeInTheDocument();
  },
};

export const Observaciones: Story = {
  args: { variant: "amber", children: "Observaciones" },
};

export const NoElegible: Story = {
  args: { variant: "red", children: "No elegible" },
};

export const EnProceso: Story = {
  args: { variant: "blue", children: "En proceso" },
};

export const Pendiente: Story = {
  args: { variant: "violet", children: "Pendiente" },
};

export const Borrador: Story = {
  args: { variant: "gray", children: "Borrador" },
};

export const NoDot: Story = {
  args: { variant: "green", dot: false, children: "Sin punto" },
  parameters: {
    docs: {
      description: {
        story:
          "`dot: false` is allowed but discouraged outside of dense table contexts where the " +
          "dot would visually crowd the row.",
      },
    },
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Chip variant="green">Elegible</Chip>
      <Chip variant="amber">Observaciones</Chip>
      <Chip variant="red">No elegible</Chip>
      <Chip variant="blue">En proceso</Chip>
      <Chip variant="violet">Pendiente</Chip>
      <Chip variant="gray">Borrador</Chip>
    </div>
  ),
};
