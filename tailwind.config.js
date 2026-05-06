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
      keyframes: {
        fadein: {
          '0%': { opacity: 0, transform: 'translateY(6px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        bump: {
          '0%, 100%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(1.04)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-3px)' },
          '50%': { transform: 'translateX(3px)' },
          '75%': { transform: 'translateX(-2px)' },
        },
      },
      animation: {
        fadein: 'fadein 220ms ease-out',
        bump: 'bump 280ms ease-out',
        shake: 'shake 280ms ease-out',
      },
    },
  },
  plugins: [],
};
