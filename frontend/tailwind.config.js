/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        diane: {
          bg: '#0f1419',
          surface: '#1a2332',
          border: '#2d3a4d',
          mute: '#6b7c93',
          accent: '#00d4aa',
          accentDim: '#00a884',
          danger: '#f87171',
          warn: '#fbbf24',
        },
      },
    },
  },
  plugins: [],
}
