/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        discord: {
          dark: '#202225', darker: '#18191c', darkest: '#111214',
          gray: '#2f3136', light: '#36393f', lighter: '#40444b',
          accent: '#5865f2', 'accent-hover': '#4752c4',
          green: '#3ba55d', red: '#ed4245', yellow: '#faa81a',
          text: '#dcddde', 'text-muted': '#72767d', 'text-dim': '#96989d',
        },
      },
    },
  },
  plugins: [],
};
