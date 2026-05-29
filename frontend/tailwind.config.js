export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#07111f',
        panel: '#0e1b2d',
        accent: '#59d0ff',
        accent2: '#a78bfa',
        danger: '#fb7185',
        warning: '#fbbf24',
        success: '#34d399',
      },
      boxShadow: {
        glow: '0 0 30px rgba(89,208,255,0.18)',
      },
    },
  },
  plugins: [],
};
