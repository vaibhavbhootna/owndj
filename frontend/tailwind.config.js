/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dj: {
          bg: "#0B0E14",
          surface: "#121722",
          card: "#192030",
          border: "#252F45",
          cyan: "#00E5FF",
          magenta: "#FF007A",
          green: "#00FF85",
          purple: "#7928CA",
          amber: "#FFB800",
        }
      },
      animation: {
        'spin-slow': 'spin 12s linear infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: 1, filter: 'drop-shadow(0 0 12px rgba(0,229,255,0.6))' },
          '50%': { opacity: 0.8, filter: 'drop-shadow(0 0 4px rgba(0,229,255,0.2))' },
        }
      }
    },
  },
  plugins: [],
}
