import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark Pro Theme - Yellow/Gold Accent (like the reference image)
        orion: {
          // Deep dark backgrounds
          space: "#0a0a0a",
          dark: "#111111",
          darker: "#050505",
          light: "#1a1a1a",
          card: "#141414",

          // Gold/Yellow accent colors (primary)
          accent: "#f5c518",
          "accent-light": "#ffd54f",
          "accent-dark": "#c9a000",

          // Blue for charts
          blue: "#4a90d9",
          "blue-light": "#69a8e8",

          // Text colors
          star: {
            white: "#ffffff",
            silver: "#8a8a8a",
            gold: "#f5c518",
          },

          // Silver/gray text
          silver: "#8a8a8a",

          // Nebula (secondary - purple)
          nebula: {
            400: "#a855f7",
            500: "#9333ea",
          },

          // Status colors
          success: "#22c55e",
          warning: "#f5c518",
          danger: "#ef4444",
          info: "#3b82f6",
        },

        // Primary (gold)
        primary: {
          50: "#fefce8",
          100: "#fef9c3",
          200: "#fef08a",
          300: "#fde047",
          400: "#facc15",
          500: "#f5c518",
          600: "#ca8a04",
          700: "#a16207",
          800: "#854d0e",
          900: "#713f12",
        },
      },
      backgroundImage: {
        'orion-gradient': 'linear-gradient(180deg, #0a0a0a 0%, #111111 100%)',
      },
      boxShadow: {
        'glow-gold': '0 0 20px rgba(245, 197, 24, 0.2)',
        'glow-sm': '0 0 10px rgba(245, 197, 24, 0.15)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.5)',
        'card-hover': '0 10px 25px -5px rgba(0, 0, 0, 0.6)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
export default config;
