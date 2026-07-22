module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,css}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
        outfit: ['Outfit', 'sans-serif']
      },
      colors: {
        brand: {
          50: '#eefcf5', 100: '#d7f6e4', 200: '#b2edd0', 300: '#7cdfb4',
          400: '#43cb93', 500: '#1db175', 600: '#11905d', 700: '#0e734c',
          800: '#0f5c3e', 900: '#0e4c34', 950: '#052b1e'
        },
        slate: {
          350: '#a8b3c4', 450: '#7c899d', 550: '#657286', 650: '#465166',
          805: '#202938', 850: '#18202c', 955: '#080d14'
        },
        emerald: { 450: '#22c58b' },
        blue: { 450: '#4a8ff0' },
        rose: { 450: '#f55274' },
        yellow: { 450: '#f4c62b' },
        purple: { 750: '#6d28b3' },
        indigo: { 750: '#4338a8' }
      },
      spacing: { '9.5': '2.375rem' },
      zIndex: { '45': '45', '55': '55', '60': '60', '70': '70', '80': '80' }
    }
  },
  plugins: []
};
