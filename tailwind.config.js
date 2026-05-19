/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#fbf5e8",
        ink: "#17211b",
        moss: "#315c4f",
        clay: "#b7653b",
        honey: "#f0b84d",
        skywash: "#d7e8e5"
      },
      fontFamily: {
        display: ['"Literata"', '"Iowan Old Style"', "Georgia", "serif"],
        sans: ['"Manrope"', '"Aptos"', '"Segoe UI"', "sans-serif"]
      },
      boxShadow: {
        soft: "0 18px 60px rgba(30, 44, 36, 0.12)"
      }
    }
  },
  plugins: []
};
