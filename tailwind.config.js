/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#0A0E1A',
          900: '#0D1220',
          800: '#111827',
          700: '#1E2A3A',
          600: '#2D3A4A',
          500: '#3D4A5A',
        },
        cardinal: {
          400: '#F5253C',
          500: '#E8132F',
          600: '#C8102E',
          700: '#A30D26',
          800: '#7F0A1D',
        },
        gold: {
          300: '#FADA6A',
          400: '#F5C842',
          500: '#E5B830',
          600: '#C99E20',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Avenir', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
