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
        // Orion Galaxy Theme - Clean & Professional
        orion: {
          // Deep space backgrounds (cleaner navy tones)
          space: "#0f1419",
          dark: "#151b23",
          darker: "#0a0e12",
          light: "#1c242d",

          // Nebula purples (secondary accent)
          nebula: {
            50: "#f3e8ff",
            100: "#e4cfff",
            200: "#c9a0ff",
            300: "#a855f7",
            400: "#9333ea",
            500: "#7c3aed",
            600: "#6d28d9",
            700: "#5b21b6",
            800: "#4c1d95",
            900: "#2e1065",
          },

          // Cosmic blues
          cosmic: {
            50: "#e0f2fe",
            100: "#bae6fd",
            200: "#7dd3fc",
            300: "#38bdf8",
            400: "#0ea5e9",
            500: "#0284c7",
            600: "#0369a1",
            700: "#075985",
            800: "#0c4a6e",
            900: "#082f49",
          },

          // Star colors
          star: {
            white: "#f8fafc",
            silver: "#94a3b8",
            gold: "#fbbf24",
            amber: "#f59e0b",
          },

          // Accent color (blue - like the Inexas reference)
          accent: "#3b82f6",
          "accent-light": "#60a5fa",
          "accent-dark": "#2563eb",

          // Status colors
          success: "#10b981",
          warning: "#f59e0b",
          danger: "#ef4444",
          info: "#06b6d4",
        },

        // Keep primary for compatibility (blue)
        primary: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
        },
      },
      backgroundImage: {
        'orion-gradient': 'linear-gradient(135deg, #0f1419 0%, #1a2332 50%, #0f1419 100%)',
        'nebula-glow': 'radial-gradient(ellipse at 30% 20%, rgba(59, 130, 246, 0.08) 0%, transparent 50%)',
        'accent-glow': 'radial-gradient(ellipse at center, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
      },
      boxShadow: {
        'glow-sm': '0 0 10px rgba(59, 130, 246, 0.2)',
        'glow-md': '0 0 20px rgba(59, 130, 246, 0.3)',
        'glow-lg': '0 0 30px rgba(59, 130, 246, 0.4)',
        'glow-purple': '0 0 20px rgba(124, 58, 237, 0.3)',
        'glow-cyan': '0 0 20px rgba(6, 182, 212, 0.3)',
        'glow-amber': '0 0 20px rgba(245, 158, 11, 0.3)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2)',
        'card-hover': '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'twinkle': 'twinkle 4s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(59, 130, 246, 0.2)' },
          '100%': { boxShadow: '0 0 15px rgba(59, 130, 246, 0.4)' },
        },
        twinkle: {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '0.8' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
