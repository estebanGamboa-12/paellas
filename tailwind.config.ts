/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",      // ✅ Páginas en /app
    "./components/**/*.{js,ts,jsx,tsx}", // ✅ Componentes
    "./lib/**/*.{js,ts,jsx,tsx}",       // ✅ Tipos, utils
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
