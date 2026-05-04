import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { Sidebar } from "./sidebar";

const meta = {
  title: "Shell/Sidebar",
  component: Sidebar,
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
      navigation: { pathname: "/dashboard" },
    },
    docs: {
      description: {
        component:
          "Navy 244-px sidebar. The only Client Component in the design system v1 (NFR-05). " +
          "Holds active route in component state; downstream specs replace with " +
          "`usePathname()` ([S009] in suggestions). The reverse-engineered logo carries the " +
          "REQ-013 warning; replace with the authoritative SVG when supplied.",
      },
    },
  },
  args: {},
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText("COLTRATOS")).toBeInTheDocument();
    await expect(c.getByText("Dashboard")).toBeInTheDocument();
    await expect(c.getByText("María Rodríguez")).toBeInTheDocument();
    // Badge counts
    await expect(c.getByText("147")).toBeInTheDocument();
    await expect(c.getByText("3")).toBeInTheDocument();
  },
};

export const ActiveSubir: Story = {
  args: {},
};

export const ActiveAlertas: Story = {
  args: {},
};

export const LowCredits: Story = {
  args: { credits: { used: 3, total: 50 } },
  parameters: {
    docs: { description: { story: "Visual stress-test for the credits progress bar at low fill." } },
  },
};

export const FullCredits: Story = {
  args: { credits: { used: 50, total: 50 } },
};

export const CustomUser: Story = {
  args: {
    user: {
      name: "Juan David Castillo",
      email: "j.castillo@empresa-ejemplo.co",
      initials: "JC",
    },
  },
};
