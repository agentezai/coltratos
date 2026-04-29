import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { Button } from "./button";

const meta = {
  title: "UI/Button",
  component: Button,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Primary action primitive. 4 variants × 3 sizes; optional leading / trailing icons. " +
          "Locked-down: no `style` prop accepted (RN-005); variant union enforced at compile time.",
      },
    },
  },
  argTypes: {
    variant: {
      control: { type: "inline-radio" },
      options: ["primary", "secondary", "ghost", "success"],
    },
    size: {
      control: { type: "inline-radio" },
      options: ["sm", "md", "lg"],
    },
    leadingIcon: {
      control: { type: "select" },
      options: [
        undefined,
        "plus",
        "upload",
        "download",
        "check-circle",
        "search",
        "arrow-up-right",
      ],
    },
    trailingIcon: {
      control: { type: "select" },
      options: [
        undefined,
        "arrow-up-right",
        "chev-right",
        "chev-down",
      ],
    },
    disabled: { control: "boolean" },
  },
  args: {
    children: "Subir pliego",
    variant: "primary",
    size: "md",
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: { variant: "primary", leadingIcon: "plus" },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    // Smoke (REQ-012 surrogate): the primitive renders a real <button>.
    await expect(c.getByRole("button")).toBeInTheDocument();
    await expect(c.getByText("Subir pliego")).toBeInTheDocument();
  },
};

export const Secondary: Story = {
  args: { variant: "secondary", leadingIcon: "download", children: "Descargar" },
};

export const Ghost: Story = {
  args: { variant: "ghost", trailingIcon: "arrow-up-right", children: "Ver detalle" },
};

export const Success: Story = {
  args: { variant: "success", leadingIcon: "check-circle", children: "Confirmar" },
};

export const Disabled: Story = {
  args: { variant: "primary", disabled: true, children: "Disabled" },
};

export const SizesMatrix: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Button variant="primary" size="sm">Sm</Button>
      <Button variant="primary" size="md">Md</Button>
      <Button variant="primary" size="lg">Lg</Button>
    </div>
  ),
  parameters: {
    docs: { description: { story: "Three sizes; type stays at 13 / 14 / 15 px." } },
  },
};

export const VariantsMatrix: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="primary" leadingIcon="plus">Subir pliego</Button>
      <Button variant="secondary" leadingIcon="download">Descargar</Button>
      <Button variant="ghost" trailingIcon="arrow-up-right">Ver detalle</Button>
      <Button variant="success" leadingIcon="check-circle">Confirmar</Button>
      <Button variant="primary" disabled>Disabled</Button>
    </div>
  ),
};
