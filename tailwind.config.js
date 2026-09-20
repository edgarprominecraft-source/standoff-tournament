/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0A0A0A",
        card: "#141414",
        card2: "#1E1E1E",
        card3: "#262626",
        border: "#2A2A2A",
        muted: "#888888",
        accent: "#FFFFFF",
        danger: "#FF4444",
        success: "#44DD88",
      },
      boxShadow: {
        glow: "0 0 24px rgba(255,255,255,0.12)",
        glowStrong: "0 0 40px rgba(255,255,255,0.28)",
        inner: "inset 0 1px 0 rgba(255,255,255,0.06)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(255,255,255,0.1)" },
          "50%": { boxShadow: "0 0 40px rgba(255,255,255,0.4)" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: 0 },
          "100%": { transform: "translateY(0)", opacity: 1 },
        },
      },
      animation: {
        shimmer: "shimmer 2s infinite linear",
        pulseGlow: "pulseGlow 2s infinite ease-in-out",
        slideUp: "slideUp 0.3s ease-out",
      },
    },
  },
  plugins: [],
};