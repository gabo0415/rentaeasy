/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        tinta: '#101936',
        electrico: '#3563ff',
        cian: '#1cc8d4',
        violeta: '#7857ff',
        neblina: '#f5f7fb',
      },
      boxShadow: {
        suave: '0 18px 55px rgba(16, 25, 54, 0.10)',
      },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
