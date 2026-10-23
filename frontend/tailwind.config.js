/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        western: ["Rye", "Georgia", "serif"],
        typewriter: ["Special Elite", "Courier New", "monospace"],
      },
    },
  },
  plugins: [],
};
