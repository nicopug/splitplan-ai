/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'border': 'hsl(var(--border))',
                'input': 'hsl(var(--input))',
                'ring': 'hsl(var(--ring))',
                'background': 'hsl(var(--background))',
                'foreground': 'hsl(var(--foreground))',
                'primary': {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))',
                },
                'secondary': {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))',
                },
                'destructive': {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))',
                },
                'muted': {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))',
                },
                'accent': {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))',
                },
                'popover': {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))',
                },
                'card': {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))',
                },
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