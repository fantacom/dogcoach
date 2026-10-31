/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        // Ruhig, warm, vertrauenswürdig (CLAUDE.md §9). Kontraste AA geprüft gegen bg/surface.
        primary: { DEFAULT: '#2F6B57', dark: '#7CC4A8' },
        bg: { DEFAULT: '#FAF7F2', dark: '#141412' },
        surface: { DEFAULT: '#FFFFFF', dark: '#1F1E1B' },
        ink: { DEFAULT: '#1F1D1A', dark: '#F2EFEA' },
        muted: { DEFAULT: '#5E5A53', dark: '#B5B0A7' },
        border: { DEFAULT: '#DDD7CD', dark: '#3A3833' },
        danger: { DEFAULT: '#B3261E', dark: '#F2B8B5' },
      },
    },
  },
  plugins: [],
};
