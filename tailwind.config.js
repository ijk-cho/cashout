/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'poker-green': {
          DEFAULT: '#0B3D2E',
          light: '#114C38',
          dark: '#082B21',
        },
        'poker-gold': {
          DEFAULT: '#FFD700',
          light: '#FFE44D',
          dark: '#CCB000',
        },
        'poker-burgundy': {
          DEFAULT: '#8B0000',
          light: '#A61010',
          dark: '#6B0000',
        },
        'poker-cream': '#F5F5F5',
        'poker-grey': '#E0E0E0',
      },
      fontFamily: {
        'serif': ['Playfair Display', 'serif'],
        'sans': ['Inter', 'sans-serif'],
        'mono': ['IBM Plex Mono', 'monospace'],
      },
      borderRadius: {
        'card': '16px',
        'card-lg': '24px',
      },
      backgroundImage: {
        'felt': "url('data:image/svg+xml,%3Csvg width=\"100\" height=\"100\" xmlns=\"http://www.w3.org/2000/svg\"...)",
      },
    },
  },
  plugins: [],
}