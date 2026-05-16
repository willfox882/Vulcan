/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          base: "#0a0a0a",
          surface: "#141414",
          elevated: "#1c1c1c",
        },
        border: {
          subtle: "rgba(255,255,255,0.06)",
          strong: "rgba(255,255,255,0.12)",
        },
        text: {
          primary: "#fafafa",
          secondary: "#a1a1aa",
          tertiary: "#52525b",
        },
        accent: {
          DEFAULT: "#dc2626",
          hover: "#ef4444",
        },
        semantic: {
          pass: "#10b981",
          warning: "#f59e0b",
          fail: "#ef4444",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
