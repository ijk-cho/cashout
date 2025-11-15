/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Premium Dark Backgrounds
        'bg-primary': '#0A0E14',
        'bg-secondary': '#12161F',
        'bg-tertiary': '#1A1F2E',

        // Elevated Surfaces
        'surface-base': '#1E2433',
        'surface-elevated': '#252B3D',
        'surface-hover': '#2D3447',

        // Premium Gold Accent
        'accent': {
          DEFAULT: '#D4AF37',
          light: '#F5D576',
          dark: '#C9A942',
        },

        // Semantic Colors
        'success': '#10B981',
        'danger': '#EF4444',
        'warning': '#F59E0B',
        'info': '#3B82F6',

        // Text Colors
        'text-primary': '#F8FAFC',
        'text-secondary': '#CBD5E1',
        'text-tertiary': '#64748B',
        'text-disabled': '#475569',

        // Legacy poker colors (for gradual migration)
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
        'sans': ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Segoe UI', 'system-ui', 'sans-serif'],
        'serif': ['Playfair Display', 'serif'],
        'mono': ['SF Mono', 'Roboto Mono', 'Consolas', 'IBM Plex Mono', 'monospace'],
      },
      borderRadius: {
        'card': '16px',
        'card-lg': '24px',
      },
      backgroundImage: {
        'gradient-card': 'linear-gradient(135deg, #1E2433 0%, #252B3D 100%)',
        'gradient-premium': 'linear-gradient(135deg, #1A1F2E 0%, #252B3D 50%, #2D3447 100%)',
        'gradient-gold': 'linear-gradient(135deg, #D4AF37 0%, #C9A942 100%)',
        'gradient-success': 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
        'gradient-danger': 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
        'gradient-overlay': 'linear-gradient(180deg, transparent 0%, rgba(10, 14, 20, 0.6) 100%)',
      },
      boxShadow: {
        'premium': '0 8px 32px rgba(0, 0, 0, 0.4)',
        'premium-sm': '0 4px 24px rgba(0, 0, 0, 0.4)',
        'gold': '0 4px 16px rgba(212, 175, 55, 0.3)',
        'gold-lg': '0 6px 24px rgba(212, 175, 55, 0.4)',
      },
    },
  },
  plugins: [],
}
