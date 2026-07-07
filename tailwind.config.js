/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#f0f4ff", 100: "#e0e9ff", 200: "#c7d6fe",
          300: "#a5b8fc", 400: "#8191f8", 500: "#6068f1",
          600: "#4a4ae4", 700: "#3c3bc9", 800: "#3233a3",
          900: "#2d3181", 950: "#0b1628",
        },
        orange: {
          50: "#fff7ed", 100: "#ffedd5", 200: "#fed7aa",
          300: "#fdba74", 400: "#fb923c", 500: "#f97316",
          600: "#ea580c", 700: "#c2410c", 800: "#9a3412",
          900: "#7c2d12",
        },
        steel: {
          50: "#f8fafc", 100: "#f1f5f9", 200: "#e2e8f0",
          300: "#cbd5e1", 400: "#94a3b8", 500: "#64748b",
          600: "#475569", 700: "#334155", 800: "#1e293b",
          900: "#0f172a",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        fadeIn: { from: { opacity: 0, transform: "translateY(8px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        slideUp: { from: { opacity: 0, transform: "translateY(24px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        "card-hover": "0 8px 24px rgba(0,0,0,0.1)",
        navy: "0 4px 14px rgba(11,22,40,0.35)",
        orange: "0 4px 14px rgba(249,115,22,0.4)",
        glow: "0 0 0 3px rgba(249,115,22,0.2)",
      },
    },
  },
  plugins: [],
};
