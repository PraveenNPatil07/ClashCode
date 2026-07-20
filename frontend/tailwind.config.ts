import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ember: '#f97316',
        steel: '#0f172a',
        mist: '#e2e8f0'
      }
    }
  },
  plugins: []
};

export default config;
