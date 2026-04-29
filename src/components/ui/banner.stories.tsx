import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { Banner } from "./banner";

const meta = {
  title: "UI/Banner",
  component: Banner,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Information banner used near uploads and forms. The 6%-alpha blue fill on white " +
          "is the bundle's only sanctioned 'soft callout' — no toasts, no frosted-glass chrome.",
      },
    },
  },
  argTypes: {
    icon: {
      control: { type: "select" },
      options: [undefined, "shield", "bell", "alert", "check-circle", "sparkles"],
    },
  },
  args: {
    children:
      "Tu archivo se analiza de forma privada y segura. No compartimos tu información con terceros.",
  },
} satisfies Meta<typeof Banner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText(/privada y segura/)).toBeInTheDocument();
  },
};

export const WithShieldIcon: Story = {
  args: { icon: "shield" },
};

export const WithSparklesIcon: Story = {
  args: { icon: "sparkles", children: "Análisis completado en menos de 1 minuto." },
};

export const RichContent: Story = {
  args: {
    icon: "shield",
    children: (
      <>
        <strong className="text-blue-800 font-semibold">
          Tu archivo se analiza de forma privada y segura.
        </strong>{" "}
        No compartimos tu información con terceros.
      </>
    ),
  },
};
