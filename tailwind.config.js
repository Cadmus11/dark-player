/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,ts,tsx}',
    './components/**/*.{js,ts,tsx}',
    './screens/**/*.{js,ts,tsx}',
    './context/**/*.{js,ts,tsx}',
    './services/**/*.{js,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#F0F8FF',
          secondary: '#E8F0FE',
          card: '#F4F4F5',
          overlay: 'rgba(0,0,0,0.1)',
        },
        text: {
          primary: '#18181B',
          secondary: '#3F3F46',
          muted: '#71717A',
        },
        border: {
          DEFAULT: '#D4D4D8',
          subtle: '#E4E4E7',
        },
        surface: '#F4F4F5',
        dark: {
          bg: {
            primary: '#06060B',
            secondary: '#1D1D21',
            card: 'rgba(255,255,255,0.05)',
            overlay: 'rgba(0,0,0,0.5)',
          },
          text: {
            primary: '#FFFFFF',
            secondary: 'rgba(255,255,255,0.8)',
            muted: 'rgba(255,255,255,0.5)',
          },
          border: {
            DEFAULT: 'rgba(255,255,255,0.08)',
            subtle: 'rgba(255,255,255,0.04)',
          },
          surface: 'rgba(255,255,255,0.06)',
        },
        accent: {
          DEFAULT: '#F97316',
          muted: 'rgba(249, 115, 22, 0.2)',
        },
        darkAccent: {
          DEFAULT: '#C2FC4A',
          muted: 'rgba(194, 252, 74, 0.2)',
        },
      },
      borderRadius: {
        glass: '28px',
      },
    },
  },
  plugins: [],
};
