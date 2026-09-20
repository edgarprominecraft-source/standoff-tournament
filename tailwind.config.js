/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#FFFFFF",
        bg2: "#F7F7F7",
        bg3: "#EFEFEF",
        card: "#FFFFFF",
        card2: "#FAFAFA",
        border: "#E5E5E5",
        border2: "#D5D5D5",
        text: "#0A0A0A",
        text2: "#333333",
        muted: "#888888",
        muted2: "#AAAAAA",
        orange: "#FF6B00",
        orange2: "#FF8A2B",
        orangeDark: "#E55A00",
        orangeLight: "#FFF0E0",
        black: "#0A0A0A",
        danger: "#FF3B30",
        success: "#34C759",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        cardHover: "0 8px 24px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)",
        glow: "0 4px 20px rgba(255,107,0,0.35)",
        glowStrong: "0 8px 32px rgba(255,107,0,0.5)",
        orange: "0 4px 16px rgba(255,107,0,0.25)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        pulseOrange: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(255,107,0,0.6)" },
          "50%": { boxShadow: "0 0 0 12px rgba(255,107,0,0)" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: 0 },
          "100%": { transform: "translateY(0)", opacity: 1 },
        },
        bounceIn: {
          "0%": { transform: "scale(0.9)", opacity: 0 },
          "50%": { transform: "scale(1.05)" },
          "100%": { transform: "scale(1)", opacity: 1 },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        shimmer: "shimmer 2s infinite linear",
        pulseOrange: "pulseOrange 1.8s infinite",
        slideUp: "slideUp 0.3s ease-out",
        bounceIn: "bounceIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        float: "float 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};