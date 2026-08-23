/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        surface: {
          DEFAULT: '#ffffff',
          muted:   '#f8fafc',
          card:    '#ffffff',
          border:  '#e2e8f0',
        },
        ink: {
          DEFAULT: '#0f172a',
          muted:   '#64748b',
          subtle:  '#94a3b8',
        },
        status: {
          submitted:   { bg: '#f0f9ff', text: '#0369a1', border: '#bae6fd' },
          verified:    { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
          assigned:    { bg: '#faf5ff', text: '#7e22ce', border: '#e9d5ff' },
          in_progress: { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
          resolved:    { bg: '#f0fdf4', text: '#166534', border: '#86efac' },
          rework:      { bg: '#fff1f2', text: '#be123c', border: '#fecdd3' },
        },
        priority: {
          low:    { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0', dot: '#22c55e' },
          medium: { bg: '#fffbeb', text: '#92400e', border: '#fde68a', dot: '#f59e0b' },
          high:   { bg: '#fff1f2', text: '#be123c', border: '#fecdd3', dot: '#ef4444' },
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        modal: '0 20px 60px -10px rgb(0 0 0 / 0.25)',
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
        'pulse-dot': 'pulseDot 2s infinite',
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
        pulseDot: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
    },
  },
  plugins: [],
};
