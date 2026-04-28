import type { Preview } from "@storybook/nextjs-vite";

// Pulls in @import "tailwindcss" + the @font-face / @theme / :root tokens that
// the production app reads at runtime. Stories render against the same CSS as
// the running app — no parallel theme.
import "../app/globals.css";

const preview: Preview = {
  parameters: {
    layout: "padded",
    backgrounds: {
      default: "canvas",
      values: [
        { name: "canvas", value: "#f5f7fb" }, // --surface-canvas
        { name: "white", value: "#ffffff" },
        { name: "navy", value: "#0b1a3a" }, // --navy-900
      ],
    },
    controls: {
      matchers: {
        color: /(background|color|fill|stroke)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      // Show a11y violations in the test UI (does not fail CI).
      // Flip to "error" once primitives are battle-tested.
      test: "todo",
    },
    docs: {
      toc: true,
    },
  },
  tags: ["autodocs"],
};

export default preview;
