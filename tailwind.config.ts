import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}', './lib/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        graphite: '#0F0F10',
        gemma: '#FF4DA6',
        violet: '#6D28D9',
        turquoise: '#00E6D2',
        yellow: '#FFD93D',
        blush: '#FFB4DB',
      },
      fontFamily: { sans: ['var(--font-poppins)', 'Arial', 'sans-serif'] },
      boxShadow: { glow: '0 0 0 1px rgba(255,77,166,.3), 0 18px 60px rgba(255,77,166,.16)' },
      borderRadius: { blob: '42% 58% 55% 45% / 45% 44% 56% 55%' },
    },
  },
  plugins: [],
}
export default config
