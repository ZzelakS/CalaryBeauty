/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        porcelain: '#FBF6EF', // page — warm, never white
        linen: '#F4EADC',     // card plates, raised surfaces
        sand: '#EADCC6',      // tinted bands
        ink: '#2C1F16',       // body text, hairlines
        mocha: '#6B5340',     // secondary text
        gold: '#C08A34',      // the logo gold — prices, CTA, accents
        honey: '#E8B45C',     // the logo's highlight gold
        signal: '#A9701F',    // scan / survey instrument colour
        noir: '#1A1511',      // the one dark band, where the logo sits native
      },
      fontFamily: {
        display: ['"Bodoni Moda Variable"', '"Bodoni Moda"', 'Didot', 'serif'],
        body: ['"Karla Variable"', 'Karla', 'system-ui', 'sans-serif'],
        mono: ['"Space Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      letterSpacing: { hud: '0.32em', wide2: '0.18em' },
      transitionTimingFunction: { atelier: 'cubic-bezier(0.16, 1, 0.3, 1)' },
      keyframes: {
        blink: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.25' } },
        rise: {
          '0%': { opacity: '0', transform: 'translateY(14px)', filter: 'blur(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)', filter: 'blur(0)' },
        },
      },
      animation: { blink: 'blink 1.2s ease-in-out infinite', rise: 'rise 0.9s cubic-bezier(0.16, 1, 0.3, 1) both' },
    },
  },
  plugins: [],
}
