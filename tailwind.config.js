/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        reddit: {
          orange: '#ff4500',
        },
      },
    },
  },
  plugins: [],
};
