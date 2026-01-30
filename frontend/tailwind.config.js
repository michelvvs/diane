/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Source Sans 3', 'system-ui', 'sans-serif'],
        display: ['Crimson Pro', 'Georgia', 'serif'],
        mono: ['Courier Prime', 'ui-monospace', 'monospace'],
      },
      colors: {
        diane: {
          bg: '#0a0808',
          surface: '#140e0e',
          surfaceLight: '#1c1414',
          border: '#3d2020',
          mute: '#9a8a8a',
          accent: '#8B2942',
          accentDim: '#6b2030',
          cream: '#f5f0e6',
          lodge: '#5c1010',
          danger: '#c45c5c',
          warn: '#d4a84b',
        },
      },
      backgroundImage: {
        'chevron': `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 10h20v10H0V10zm0-10h20v10H0V0z' fill='%231a1212' fill-opacity='0.4' fill-rule='evenodd'/%3E%3C/svg%3E")`,
        'curtain': 'linear-gradient(90deg, rgba(92,16,16,0.15) 0%, transparent 50%, rgba(92,16,16,0.15) 100%)',
      },
    },
  },
  plugins: [],
}
