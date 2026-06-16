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
        'sentiment-positive': '#22c55e',
        'sentiment-neutral': '#6b7280',
        'sentiment-negative': '#ef4444',
      },
    },
  },
  plugins: [],
}
