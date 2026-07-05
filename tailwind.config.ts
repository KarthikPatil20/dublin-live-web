import type { Config } from "tailwindcss";

// Colors ported 1:1 from lib/core/constants/app_colors.dart
export default {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#003D7A",
        primaryLight: "#1565C0",
        secondary: "#00843D",
        accent: "#F4A233",
        // transport livery
        bus: "#007B40",
        busYellow: "#FFD100",
        dart: "#00843D",
        rail: "#003D7A",
        luasRed: "#CC0000",
        luasGreen: "#007D3C",
        // dark theme
        dark: {
          bg: "#0D1117",
          surface: "#161B22",
          card: "#1C2128",
          border: "#30363D",
          text: "#E6EDF3",
          muted: "#8B949E",
        },
        // light theme
        light: {
          bg: "#F4F6F9",
          surface: "#FFFFFF",
          card: "#FFFFFF",
          border: "#E2E8F0",
          text: "#0F172A",
          muted: "#64748B",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
