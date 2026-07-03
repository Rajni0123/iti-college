/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#195de6',
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#195de6',
          600: '#1e40af',
          700: '#1e3a8a',
        },
        accent: {
          DEFAULT: '#ef4444',
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#ef4444',
          600: '#dc2626',
        },
        'background-light': '#f6f6f8',
        'background-dark': '#111621',
      },
      fontFamily: {
        display: ['Public Sans', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        full: '9999px',
      },
      animation: {
        marquee: 'marquee 30s linear infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translate(0, 0)' },
          '100%': { transform: 'translate(-100%, 0)' },
        },
      },
    },
  },
  plugins: [],
}
