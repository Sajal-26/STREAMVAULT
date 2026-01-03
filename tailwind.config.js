/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      screens: {
        'short': { 'raw': '(max-height: 550px)' },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        background: 'var(--bg-main)',
        surface: 'var(--bg-card)',
        primary: 'var(--text-main)',
        secondary: 'var(--text-muted)',
        brand: {
          primary: 'var(--color-primary)',
          blue: '#007AFF',
          dark: '#141414',
          gray: '#2F2F2F'
        }
      }
    }
  },
  plugins: [],
}