/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        studio: {
          bg: '#121214',
          panel: '#1a1a1d',
          panel2: '#202024',
          border: '#2a2a2e',
          accent: '#5eead4',
          accent2: '#f472b6',
          warn: '#fbbf24',
          danger: '#f87171',
          text: '#e4e4e7',
          textDim: '#8a8a92'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      }
    }
  },
  plugins: []
};
