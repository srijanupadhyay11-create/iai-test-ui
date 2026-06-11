/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Consolas', 'monospace'],
      },
      animation: {
        'float':       'float 5s ease-in-out infinite',
        'glow-pulse':  'glow-pulse 2.5s ease-in-out infinite',
        'slide-up':    'slide-up 0.5s ease-out forwards',
        'fade-in':     'fade-in 0.6s ease-out forwards',
        'shimmer':     'shimmer 2.5s linear infinite',
        'spin-slow':   'spin 2s linear infinite',
        'pulse-dot':   'pulse-dot 1.2s ease-in-out infinite',
        'tab-enter':   'tab-enter 0.2s ease-out forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-12px)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 15px rgba(99,102,241,0.4), 0 0 30px rgba(99,102,241,0.12)' },
          '50%':      { boxShadow: '0 0 30px rgba(99,102,241,0.7), 0 0 60px rgba(99,102,241,0.25)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition:  '200% center' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.3' },
        },
        'tab-enter': {
          from: { opacity: '0', transform: 'translateX(-6px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
      },
      boxShadow: {
        'neon':         '0 0 20px rgba(99,102,241,0.5), 0 0 40px rgba(99,102,241,0.2)',
        'neon-sm':      '0 0 10px rgba(99,102,241,0.4)',
        'neon-cyan':    '0 0 20px rgba(34,211,238,0.5)',
        'neon-emerald': '0 0 15px rgba(52,211,153,0.4)',
        'neon-rose':    '0 0 15px rgba(244,63,94,0.4)',
        'glass':        '0 4px 30px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)',
        'glass-lg':     '0 8px 60px rgba(0,0,0,0.5),  inset 0 1px 0 rgba(255,255,255,0.05)',
      },
    },
  },
  plugins: [],
};
