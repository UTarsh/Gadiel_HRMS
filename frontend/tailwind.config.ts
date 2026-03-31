import type { Config } from 'tailwindcss'
import tailwindcssAnimate from 'tailwindcss-animate'

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Gadiel Technologies — Blue design system
        primary: {
          DEFAULT: '#3B82F6',           // Gadiel Blue
          container: '#93C5FD',
          fixed: '#93C5FD',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#16A34A',            // Approval / Success Green
          container: '#86EFAC',
          foreground: '#ffffff',
        },
        tertiary: {
          DEFAULT: '#D97706',            // Amber — alerts, highlights
          container: '#FCD34D',
          foreground: '#ffffff',
        },
        // Surface system - Light Blue Theme
        surface: {
          DEFAULT: '#E0F2FE',            // Sky 100
          dim: '#DBEAFE',                // Blue 100
          variant: '#F0F9FF',            // Sky 50
        },
        'surface-container': {
          lowest: '#ffffff',
          low: '#F0F9FF',
          DEFAULT: '#E0F2FE',
          high: '#BAE6FD',
          highest: '#7DD3FC',
        },
        'on-surface': '#0F172A',
        'on-surface-variant': '#334155',
        outline: '#BAE6FD',
        'outline-variant': '#E0F2FE',
        // shadcn compat aliases
        background: '#E0F2FE',
        foreground: '#0F172A',
        border: 'rgba(186,230,253,0.4)',
        input: '#F0F9FF',
        ring: '#3B82F6',
        card: { DEFAULT: '#ffffff', foreground: '#0F172A' },
        popover: { DEFAULT: '#ffffff', foreground: '#0F172A' },
        muted: { DEFAULT: '#E0F2FE', foreground: '#475569' },
        accent: { DEFAULT: '#BAE6FD', foreground: '#0F172A' },
        destructive: { DEFAULT: '#DC2626', foreground: '#ffffff' },
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
        body: ['"Be Vietnam Pro"', 'sans-serif'],
        sans: ['"Be Vietnam Pro"', '"Plus Jakarta Sans"', 'sans-serif'],
      },
      fontSize: {
        'display-lg': ['3.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-md': ['2.75rem', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-lg': ['2rem', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '700' }],
        'headline-md': ['1.75rem', { lineHeight: '1.25', letterSpacing: '-0.01em', fontWeight: '600' }],
        'headline-sm': ['1.375rem', { lineHeight: '1.3', fontWeight: '600' }],
        'title-lg': ['1.25rem', { lineHeight: '1.4', fontWeight: '600' }],
        'title-md': ['1.125rem', { lineHeight: '1.4', fontWeight: '600' }],
        'title-sm': ['1rem', { lineHeight: '1.5', fontWeight: '600' }],
        'body-lg': ['1rem', { lineHeight: '1.6' }],
        'body-md': ['0.875rem', { lineHeight: '1.6' }],
        'body-sm': ['0.75rem', { lineHeight: '1.5' }],
      },
      borderRadius: {
        none: '0',
        sm: '0.5rem',
        DEFAULT: '1rem',
        md: '1rem',
        lg: '1.25rem',
        xl: '1.5rem',
        '2xl': '2rem',
        '3xl': '3rem',
        full: '9999px',
      },
      boxShadow: {
        card: '0px 4px 16px rgba(30,41,59,0.06)',
        'card-hover': '0px 8px 24px rgba(30,41,59,0.10)',
        float: '0px 8px 24px rgba(59,130,246,0.16)',
        glow: '0px 0px 32px rgba(59,130,246,0.3)',
        sidebar: '4px 0 24px rgba(30,41,59,0.06)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #1D4ED8, #3B82F6)',
        'gradient-green': 'linear-gradient(135deg, #16A34A, #86EFAC)',
        'gradient-amber': 'linear-gradient(135deg, #D97706, #FCD34D)',
        'gradient-light': 'linear-gradient(135deg, #F0F9FF, #E0F2FE)',
        'gradient-hero': 'linear-gradient(135deg, #1D4ED8 0%, #3B82F6 50%, #F0F9FF 100%)',
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        'fade-up': { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'scale-in': { from: { opacity: '0', transform: 'scale(0.96)' }, to: { opacity: '1', transform: 'scale(1)' } },
        'slide-in-right': { from: { opacity: '0', transform: 'translateX(24px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-up': 'fade-up 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        shimmer: 'shimmer 2s infinite linear',
      },
    },
  },
  plugins: [tailwindcssAnimate],
}

export default config
