import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { Well } from "./well";
import { Icon } from "./icon";

const meta = {
  title: "UI/Well",
  component: Well,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Pastel circular well behind an icon. Pairs an icon at its `-500/-600/-700` hue with " +
          "the matching `--tint-*` background. Default size 42 px (the bundle's KPI card size); " +
          "32 px and 56 px are also documented sizes.",
      },
    },
  },
  argTypes: {
    tint: {
      control: { type: "inline-radio" },
      options: ["blue", "green", "amber", "red", "violet", "sky"],
    },
    size: { control: { type: "range", min: 24, max: 80, step: 2 } },
  },
  args: {
    tint: "blue",
    size: 42,
    children: <Icon name="chart" size={20} />,
  },
} satisfies Meta<typeof Well>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Blue: Story = {
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-component="well"]')).toBeInTheDocument();
  },
};
export const Green: Story = { args: { tint: "green", children: <Icon name="check-circle" size={20} /> } };
export const Amber: Story = { args: { tint: "amber", children: <Icon name="alert" size={20} /> } };
export const Red: Story = { args: { tint: "red", children: <Icon name="x-circle" size={20} /> } };
export const Violet: Story = { args: { tint: "violet", children: <Icon name="clock" size={20} /> } };
export const Sky: Story = { args: { tint: "sky", children: <Icon name="globe" size={20} /> } };

export const AllTints: Story = {
  render: () => (
    <div className="flex gap-4">
      <Well tint="blue"><Icon name="chart" size={20} /></Well>
      <Well tint="green"><Icon name="check-circle" size={20} /></Well>
      <Well tint="amber"><Icon name="alert" size={20} /></Well>
      <Well tint="red"><Icon name="x-circle" size={20} /></Well>
      <Well tint="violet"><Icon name="clock" size={20} /></Well>
      <Well tint="sky"><Icon name="globe" size={20} /></Well>
    </div>
  ),
};

export const SizeRange: Story = {
  render: () => (
    <div className="flex items-end gap-4">
      {[32, 42, 56, 72].map((s) => (
        <Well key={s} tint="blue" size={s}>
          <Icon name="sparkles" size={Math.round(s * 0.45)} />
        </Well>
      ))}
    </div>
  ),
};
