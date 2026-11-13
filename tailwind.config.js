/** @type {import("tailwindcss").Config} */
export default {
  content: ["./index.html", "./app.js", "./asistencia-react.js"],
  theme: {
    extend: {
      colors: {
        tinta: "#0C1F4A",
        sol: "#FFC629",
        papel: "#F1F4F9",
      },
      fontFamily: {
        sans: ["Barlow", "system-ui", "sans-serif"],
        titulo: ["Barlow Condensed", "Barlow", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
