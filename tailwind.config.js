/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,ts,tsx}", "./components/**/*.{js,ts,tsx}", "./screens/**/*.{js,ts,tsx}", "./context/**/*.{js,ts,tsx}", "./services/**/*.{js,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0a0a0a',
          card: 'rgba(255, 255, 255, 0.05)',
          border: 'rgba(255, 255, 255, 0.08)',
          text: '#ffffff',
          muted: 'rgba(255, 255, 255, 0.5)',
        },
        accent: {
          purple: '#6c5ce7',
          teal: '#00cec9',
          orange: '#e17055',
          yellow: '#fdcb6e',
          blue: '#74b9ff',
        },
      },
    },
  },
  plugins: [],
}
