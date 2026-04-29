import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { Topbar } from "./topbar";

const meta = {
  title: "Shell/Topbar",
  component: Topbar,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Search + actions + primary CTA. Server Component (no state); the search input is " +
          "uncontrolled in v1. Downstream FE specs lift it into a Client wrapper if they need " +
          "to react to typing.",
      },
    },
  },
} satisfies Meta<typeof Topbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(
      c.getByPlaceholderText("Buscar análisis, procesos, entidades..."),
    ).toBeInTheDocument();
    await expect(c.getByText("Subir pliego")).toBeInTheDocument();
  },
};
