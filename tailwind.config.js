/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,ts,tsx}", "./components/**/*.{js,ts,tsx}", "./screens/**/*.{js,ts,tsx}", "./context/**/*.{js,ts,tsx}", "./services/**/*.{js,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#06060B',
          surface: '#1D1D21',
          card: 'rgba(255, 255, 255, 0.05)',
          border: 'rgba(255, 255, 255, 0.08)',
          text: '#ffffff',
          muted: 'rgba(255, 255, 255, 0.5)',
        },
        neon: {
          lime: '#C2FC4A',
        },
      },
      borderRadius: {
        glass: '28px',
      },
    },
  },
  plugins: [],
}
