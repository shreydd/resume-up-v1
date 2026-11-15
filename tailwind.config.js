/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
        serif: [
          '"Computer Modern Serif"',
          'Georgia',
          'Cambria',
          'serif',
        ],
        mono: [
          '"JetBrains Mono"',
          'Fira Code',
          'Menlo',
          'monospace',
        ],
      },
      screens: {
        print: { raw: 'print' },
      },
    },
  },
  plugins: [],
}
