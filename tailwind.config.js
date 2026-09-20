/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0A0A0A",
        card: "#1A1A1A",
        card2: "#222222",
        border: "#333333",
        muted: "#A0A0A0",
        accent: "#FFFFFF",
      },
      boxShadow: {
        glow: "0 0 20px rgba(255,255,255,0.15)",
        glowStrong: "0 0 30px rgba(255,255,255,0.35)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
}