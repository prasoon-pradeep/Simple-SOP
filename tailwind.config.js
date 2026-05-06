/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "media",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--bg-app)",
        foreground: "hsl(var(--foreground))",
        panel: "var(--bg-panel)",
        surface: "var(--bg-surface)",
        secondary: "var(--bg-secondary)",
        hover: "var(--bg-hover)",
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
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
