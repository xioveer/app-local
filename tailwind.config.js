export default {
  content: ["./index.html", "./js/**/*.js"],
  theme: {
    extend: {
      colors: {
        tinta: "#0F172A",
        papel: "#F6F7F9",
        borde: "#E2E8F0",
        marca: {
          50: "#EEF2FF",
          100: "#E0E7FF",
          200: "#C7D2FE",
          300: "#A5B4FC",
          500: "#6366F1",
          600: "#4F46E5",
          700: "#4338CA",
          800: "#3730A3",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        titulo: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        suave: "0 1px 2px 0 rgb(15 23 42 / 0.04)",
        flotante: "0 8px 24px -6px rgb(15 23 42 / 0.12), 0 2px 6px -2px rgb(15 23 42 / 0.06)",
      },
      keyframes: {
        aparecer: {
          from: { opacity: "0", transform: "translateY(-6px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        desvanecer: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        aparecer: "aparecer 180ms cubic-bezier(0.16, 1, 0.3, 1)",
        desvanecer: "desvanecer 150ms ease-out",
      },
    },
  },
  plugins: [],
};
