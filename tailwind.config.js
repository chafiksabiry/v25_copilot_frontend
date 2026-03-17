/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'harx': {
          50: '#fff5f5',
          100: '#ffe0e0',
          200: '#ffc2c2',
          300: '#ff9494',
          400: '#ff6b6b',
          500: '#ff4d4d', // Primary HARX red-orange
          600: '#ff3333',
          700: '#ff1a1a',
          800: '#ff0000',
          900: '#cc0000',
          950: '#990000',
        },
        'harx-alt': {
          50: '#fdf2f8',
          100: '#fce7f3',
          200: '#fbcfe8',
          300: '#f9a8d4',
          400: '#f472b6',
          500: '#ec4899', // Secondary HARX pink
          600: '#db2777',
          700: '#be185d',
          800: '#9d174d',
          900: '#831843',
          950: '#500724',
        },
      },
      backgroundImage: {
        'gradient-harx': 'linear-gradient(to right, #ff4d4d, #ec4899)',
      },
    },
  },
  plugins: [
    require('tailwind-scrollbar'),
  ],
}
