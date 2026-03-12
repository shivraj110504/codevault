/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        bg: '#0d0d0d',
        surface: '#141414',
        border: '#1e1e1e',
        accent: '#00ff88',
        'accent-dim': '#00cc6a',
        muted: '#666',
        text: '#e8e8e8',
      },
    },
  },
  plugins: [],
}
