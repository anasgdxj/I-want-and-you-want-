/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Cairo', 'system-ui', 'sans-serif'],
      },
      colors: {
        olive: {
          50: '#f4f7f2',
          100: '#e5ece1',
          200: '#cbd9c4',
          300: '#a5bd9b',
          400: '#7b9b6e',
          500: '#5b7d4e',
          600: '#4a6b3e',
          700: '#3b5531',
          800: '#304429',
          900: '#273822',
          950: '#141e11',
        },
      },
    },
  },
  plugins: [],
};
