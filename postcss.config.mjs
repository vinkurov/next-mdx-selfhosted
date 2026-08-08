/**
 * Tailwind CSS 4 is configured in CSS, not in JavaScript — see
 * `src/app/globals.css`. This file only wires the PostCSS plugin, which is why
 * there is no `tailwind.config.js` anywhere in the repository.
 */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}

export default config
