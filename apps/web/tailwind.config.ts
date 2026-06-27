import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#070711",
          900: "#0b0b1a",
          850: "#101026",
          800: "#16162e",
          700: "#1f1f3d",
          600: "#2a2a52",
        },
        brand: {
          DEFAULT: "#7c5cff",
          400: "#9b85ff",
          500: "#7c5cff",
          600: "#6a45f5",
        },
        cat: {
          product: "#6366F1",
          design: "#EC4899",
          growth: "#10B981",
          vc: "#F59E0B",
          engineering: "#3B82F6",
          founder: "#8B5CF6",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 3px rgba(124,92,255,0.35), 0 0 40px 0 rgba(124,92,255,0.45)",
      },
      keyframes: {
        "pulse-ring": {
          "0%": { transform: "scale(0.95)", opacity: "0.7" },
          "70%": { transform: "scale(1.25)", opacity: "0" },
          "100%": { transform: "scale(1.25)", opacity: "0" },
        },
        "speaking-bars": {
          "0%, 100%": { transform: "scaleY(0.4)" },
          "50%": { transform: "scaleY(1)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "float-in": {
          "0%": { opacity: "0", transform: "translateX(12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
      animation: {
        "pulse-ring": "pulse-ring 1.6s cubic-bezier(0.4,0,0.6,1) infinite",
        "speaking-bars": "speaking-bars 0.9s ease-in-out infinite",
        "fade-up": "fade-up 0.35s ease-out both",
        "float-in": "float-in 0.35s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
