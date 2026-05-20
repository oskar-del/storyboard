import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg:       "#0e0e14",
        surface:  "#16161f",
        surface2: "#1c1c28",
        accent:   "#7c6bff",
        accent2:  "#4ecdc4",
        accent3:  "#ff6b9d",
        green:    "#56cfaa",
        yellow:   "#ffd166",
        orange:   "#ff9f43",
        muted:    "#7a7a9a",
        muted2:   "#9a9ab8",
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Inter", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
