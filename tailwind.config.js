/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary-blue': '#23599e',
        'secondary-blue': '#aecede',
        'accent-orange': '#f48c06',
        'accent-green': '#2ca02c',
        'dark-navy': '#1a2a3a',
        'bg-creme': '#fbf8ef',
        'text-main': '#2d3436',
        'text-muted': '#636e72',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Outfit', 'sans-serif'],
      },
      boxShadow: {
        'sm': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        'md': '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        'lg': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
}