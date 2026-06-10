/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        discord: {
          dark: '#160d0c',
          darker: '#0e0806',
          darkest: '#070302',
          gray: '#1c1210',
          light: '#241715',
          lighter: '#301e1c',
          accent: '#ff6b35',
          'accent-hover': '#e55a28',
          green: '#22c55e',
          red: '#ff3b55',
          yellow: '#f59e0b',
          text: '#f0e2de',
          'text-muted': '#826060',
          'text-dim': '#a08080',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'nexus-gradient': 'linear-gradient(135deg, #ff6b35 0%, #ff2d55 100%)',
      },
    },
  },
  plugins: [],
};
