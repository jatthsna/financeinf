import type { Config } from 'tailwindcss'

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // KAS INFORMATIKA brand palette
        'warm-white': '#F7F7F4',
        'near-black': '#191B19',
        'forest': {
          DEFAULT: '#174C3C',
          50: '#E8F5EF',
          100: '#D1EBDF',
          200: '#A3D7BF',
          300: '#75C39F',
          400: '#47AF7F',
          500: '#1E8C5F',
          600: '#174C3C',
          700: '#123D30',
          800: '#0E2E24',
          900: '#091F18',
          950: '#05100C',
        },
        'sage': {
          DEFAULT: '#DDE8DF',
          50: '#F5F8F5',
          100: '#EBF1EC',
          200: '#DDE8DF',
          300: '#C4D8C7',
          400: '#ABC8AF',
          500: '#92B897',
          600: '#79A87F',
          700: '#608867',
          800: '#4A6A50',
          900: '#344C39',
          950: '#1E2E22',
        },
        'amber-warning': '#D97706',
        'error-red': '#B91C1C',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'soft': '0 2px 8px -2px rgba(25, 27, 25, 0.08)',
        'medium': '0 4px 16px -4px rgba(25, 27, 25, 0.12)',
        'strong': '0 8px 32px -8px rgba(25, 27, 25, 0.16)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
