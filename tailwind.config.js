/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'primary-blue': 'var(--primary-blue)',
                'secondary-blue': 'var(--secondary-blue)',
                'accent-orange': 'var(--accent-orange)',
                'accent-green': 'var(--accent-green)',
                'dark-navy': 'var(--dark-navy)',
                'bg-creme': 'var(--bg-creme)',
                'bg-white': 'var(--bg-white)', // Custom white that adapts
                'text-main': 'var(--text-main)',
                'text-muted': 'var(--text-muted)',
                'text-light': 'var(--text-light)',
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