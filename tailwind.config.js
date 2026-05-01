/** @type {import('tailwindcss').Config} */
export default {
  darkMode: false,
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--bg-app)",
        panel: "var(--bg-panel)",
        surface: "var(--bg-surface)",
        secondary: "var(--bg-secondary)",
        hover: "var(--bg-hover)",
        brand: {
          DEFAULT: "var(--brand)",
          light: "var(--brand-light)",
          hover: "var(--brand-hover)",
        },
        status: {
          green: "var(--status-green)",
          "green-bg": "var(--status-green-bg)",
          red: "var(--status-red)",
          "red-bg": "var(--status-red-bg)",
          amber: "var(--status-amber)",
          "amber-bg": "var(--status-amber-bg)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
          quaternary: "var(--text-quaternary)",
        },
        border: {
          subtle: "var(--border-subtle)",
          standard: "var(--border-standard)",
          strong: "var(--border-strong)",
        },
      },
      fontFamily: {
        primary: ["DM Sans", "system-ui", "sans-serif"],
        mono: ["DM Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        DEFAULT: "6px",
      },
    },
  },
  plugins: [],
}
