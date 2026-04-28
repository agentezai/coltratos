import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { Icon, type IconName } from "./icon";

const ICON_NAMES: IconName[] = [
  "upload", "file", "chart", "bell", "card", "users", "settings", "search",
  "check-circle", "alert", "x-circle", "eye", "download", "filter",
  "chev-down", "chev-right", "sparkles", "shield", "clock", "plus", "x",
  "arrow-up-right", "database", "more", "logout", "globe", "trophy",
  "rocket", "build", "trend",
];

const meta = {
  title: "UI/Icon",
  component: Icon,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "28-path inline SVG registry. No external icon library (ADR-018). Names typed as " +
          "`IconName = keyof typeof PATHS`; the type-test in icon.test-d.ts asserts the union " +
          "matches the documented set.",
      },
    },
  },
  argTypes: {
    name: {
      control: { type: "select" },
      options: ICON_NAMES,
    },
    size: { control: { type: "range", min: 12, max: 48, step: 2 } },
  },
  args: {
    name: "sparkles",
    size: 24,
  },
} satisfies Meta<typeof Icon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Single: Story = {
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector("svg")).toBeInTheDocument();
  },
};

export const Gallery: Story = {
  render: () => (
    <div className="grid grid-cols-10 gap-3">
      {ICON_NAMES.map((n) => (
        <div key={n} className="flex flex-col items-center gap-1.5">
          <div className="w-10 h-10 rounded-md border border-[var(--border-hairline)] flex items-center justify-center text-graphite-700">
            <Icon name={n} size={18} />
          </div>
          <span className="text-[10px] font-mono text-[var(--fg-3)] truncate w-full text-center">
            {n}
          </span>
        </div>
      ))}
    </div>
  ),
  parameters: {
    layout: "padded",
    docs: { description: { story: "All 28 registered names." } },
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    // Spot-check one name from the gallery
    await expect(c.getByText("upload")).toBeInTheDocument();
    await expect(c.getByText("trend")).toBeInTheDocument();
  },
};

export const StrokeOnDark: Story = {
  args: { name: "shield", size: 28 },
  parameters: {
    backgrounds: { default: "navy" },
    docs: {
      description: {
        story:
          "Icons inherit `currentColor` for stroke; on dark surfaces, set the parent's text color to " +
          "`var(--fg-inverse)` or a Tailwind `text-white` class.",
      },
    },
  },
  render: (args) => (
    <div className="text-white">
      <Icon {...args} />
    </div>
  ),
};
