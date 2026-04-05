import type { Config } from 'tailwindcss'
import tailwindcssAnimate from 'tailwindcss-animate'

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Gadiel Technologies — Warm Orange design system
        primary: {
          DEFAULT: '#F97316',           // Gadiel Orange
          dark: '#EA580C',
          light: '#FFF7ED',
          container: '#FDBA74',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#3B82F6',           // Accent Blue
          container: '#93C5FD',
          foreground: '#ffffff',
        },
        success: {
          DEFAULT: '#22C55E',
          container: '#86EFAC',
          foreground: '#ffffff',
        },
        warning: {
          DEFAULT: '#EAB308',
          container: '#FDE68A',
          foreground: '#ffffff',
        },
        danger: {
          DEFAULT: '#EF4444',
          container: '#FCA5A5',
          foreground: '#ffffff',
        },
        // Warm surface system
        surface: {
          DEFAULT: '#FDF4EE',
          dim: '#FFEDE0',
          variant: '#FFF7F0',
        },
        'surface-container': {
          lowest: '#ffffff',
          low: '#FFF7F0',
          DEFAULT: '#FFEDE0',
          high: '#FFD9C0',
          highest: '#FFC8A0',
        },
        'on-surface': '#1A1A2E',
        'on-surface-variant': '#374151',
        outline: '#FFD9C0',
        'outline-variant': '#FFEDE0',
        // shadcn compat aliases
        background: '#FDF4EE',
        foreground: '#1A1A2E',
        border: 'rgba(249,115,22,0.15)',
        input: '#FFF7F0',
        ring: '#F97316',
        card: { DEFAULT: '#ffffff', foreground: '#1A1A2E' },
        popover: { DEFAULT: '#ffffff', foreground: '#1A1A2E' },
        muted: { DEFAULT: '#FFEDE0', foreground: '#6B7280' },
        accent: { DEFAULT: '#FFD9C0', foreground: '#1A1A2E' },
        destructive: { DEFAULT: '#EF4444', foreground: '#ffffff' },
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
        card: '0px 4px 16px rgba(249,115,22,0.07)',
        'card-hover': '0px 8px 24px rgba(249,115,22,0.12)',
        float: '0px 8px 24px rgba(249,115,22,0.18)',
        glow: '0px 0px 32px rgba(249,115,22,0.28)',
        sidebar: '4px 0 24px rgba(249,115,22,0.06)',
        'card-blue': '0px 4px 20px rgba(59,130,246,0.15)',
        'card-green': '0px 4px 20px rgba(34,197,94,0.15)',
        'card-orange': '0px 4px 20px rgba(249,115,22,0.18)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #EA580C, #F97316)',
        'gradient-warm': 'linear-gradient(135deg, #FFF7ED, #FFEDE0)',
        'gradient-blue': 'linear-gradient(135deg, #1D4ED8, #3B82F6)',
        'gradient-green': 'linear-gradient(135deg, #15803D, #22C55E)',
        'gradient-purple': 'linear-gradient(135deg, #7C3AED, #A855F7)',
        'gradient-teal': 'linear-gradient(135deg, #0D9488, #14B8A6)',
        'gradient-rose': 'linear-gradient(135deg, #BE185D, #EC4899)',
        'gradient-app': 'linear-gradient(135deg, #FFEADF 0%, #FFD6C8 15%, #F5E8FF 42%, #E0E8FF 65%, #C8D8FF 100%)',
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        'fade-up': { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'scale-in': { from: { opacity: '0', transform: 'scale(0.96)' }, to: { opacity: '1', transform: 'scale(1)' } },
        'slide-in-right': { from: { opacity: '0', transform: 'translateX(24px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-4px)' } },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-up': 'fade-up 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        shimmer: 'shimmer 2s infinite linear',
        float: 'float 3s ease-in-out infinite',
      },
    },
  },
  plugins: [tailwindcssAnimate],
}

export default config
