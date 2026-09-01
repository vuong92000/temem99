/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#07080c',
          900: '#0b0d13',
          850: '#0f1219',
          800: '#141822',
          750: '#1a1f2b',
          700: '#222836',
          600: '#2c3444',
          500: '#3a4356',
        },
        brand: {
          50: '#f2eeff',
          100: '#e4dbff',
          200: '#c9b7ff',
          300: '#a98fff',
          400: '#8c6bff',
          500: '#7c5cff',
          600: '#6541e6',
          700: '#5030bd',
          800: '#3b2490',
          900: '#271761',
        },
        aqua: {
          400: '#3ddbd9',
          500: '#22c1c3',
        },
        ember: {
          400: '#ff9f45',
          500: '#ff7a18',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        node: '0 10px 30px -12px rgba(0,0,0,0.85), 0 2px 8px -2px rgba(0,0,0,0.6)',
        glow: '0 0 0 1px rgba(124,92,255,0.55), 0 0 28px -6px rgba(124,92,255,0.55)',
        panel: '0 20px 60px -30px rgba(0,0,0,0.9)',
      },
      keyframes: {
        'pop-in': {
          '0%': { opacity: 0, transform: 'scale(0.94) translateY(6px)' },
          '100%': { opacity: 1, transform: 'scale(1) translateY(0)' },
        },
        'slide-up': {
          '0%': { opacity: 0, transform: 'translateY(10px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'slide-left': {
          '0%': { opacity: 0, transform: 'translateX(16px)' },
          '100%': { opacity: 1, transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(124,92,255,0.45)' },
          '70%': { boxShadow: '0 0 0 12px rgba(124,92,255,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(124,92,255,0)' },
        },
      },
      animation: {
        'pop-in': 'pop-in 180ms cubic-bezier(0.22,1,0.36,1)',
        'slide-up': 'slide-up 220ms ease-out',
        'slide-left': 'slide-left 220ms ease-out',
        shimmer: 'shimmer 1.6s linear infinite',
        'pulse-ring': 'pulse-ring 1.6s ease-out infinite',
      },
    },
  },
  plugins: [],
}
