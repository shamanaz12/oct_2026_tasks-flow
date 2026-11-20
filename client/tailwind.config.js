const lagoon = { 50: '#effaf8', 100: '#d5f3ee', 200: '#aae6dd', 300: '#74d3c8', 400: '#3dbab0', 500: '#1fa095', 600: '#14867d', 700: '#126b66', 800: '#135553', 900: '#0b3b3c' };
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: { colors: { violet: lagoon, brand: lagoon } } },
  plugins: [],
};
