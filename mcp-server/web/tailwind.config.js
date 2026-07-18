/** @type {import('tailwindcss').Config} */

// PRISM brand-blue scale -- the single source of truth for both the `prism` and
// `primary` color keys below. (LAUNCH-FE: 2026-06-23, slot:quebec) The shared
// <Button> primary variant + 31 components reference bg-/text-/ring-/border-/
// from-/to-primary-{50..950}; before this scale existed those keys were
// UNDEFINED, so Tailwind emitted NO CSS for them -> invisible primary CTAs
// across SFC, PPG, the post-processor store, login + every UI primitive.
const brandBlue = {
  50: '#f0f4ff',
  100: '#dbe4ff',
  200: '#bac8ff',
  300: '#91a7ff',
  400: '#748ffc',
  500: '#5c7cfa',
  600: '#4c6ef5',
  700: '#4263eb',
  800: '#3b5bdb',
  900: '#364fc7',
  950: '#2a3a94',
};

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        prism: brandBlue,
        // `primary` === the PRISM brand-blue scale (alias of `prism`). DEFAULT
        // (600) serves the bare `bg-primary` / `text-primary` usages; the numeric
        // shades serve bg-/text-/ring-/border-/from-/to-primary-{50..950}. The
        // shared <Button> primary variant (the DEFAULT variant) depends on
        // primary-600/700/500 -- keep this key in lockstep with `prism`.
        primary: {
          DEFAULT: brandBlue[600],
          ...brandBlue,
        },
        safety: {
          pass: '#2b8a3e',
          warn: '#e67700',
          fail: '#c92a2a',
          info: '#1971c2',
        },
        // FLEET-IOS-REDESIGN U3c (2026-06-10, slot:hotel) -- the user-overridable
        // accent as a real Tailwind color so bg-accent / text-accent / ring-accent
        // / border-accent (+ /alpha modifiers) all resolve to --accent-rgb, which
        // useThemeTokens writes on document.body. The `<alpha-value>` placeholder
        // is what makes the opacity modifiers (bg-accent/10, ring-accent/70) work.
        // accent-fg is the AA-compliant dark text color for a solid accent fill.
        accent: 'rgb(var(--accent-rgb) / <alpha-value>)',
        'accent-fg': 'rgb(var(--accent-fg) / <alpha-value>)',
      },
      // FLEET-IOS-REDESIGN U1 (2026-06-09, slot:hotel) -- Tailwind utilities that
      // point AT the CSS-var foundation in src/index.css :root, so the vars are
      // the single source of truth. font-sans/font-mono (incl. the preflight
      // html default) resolve to the SF stack; rounded-ios-*/shadow-ios-* are
      // NEW keys for U2 primitive upgrades (existing rounded-2xl etc. untouched).
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      borderRadius: {
        'ios-sm': 'var(--radius-sm)',
        'ios-md': 'var(--radius-md)',
        'ios-lg': 'var(--radius-lg)',
        'ios-xl': 'var(--radius-xl)',
      },
      boxShadow: {
        'ios-1': 'var(--shadow-1)',
        'ios-2': 'var(--shadow-2)',
        'ios-accent': 'var(--shadow-accent)',
      },
    },
  },
  plugins: [],
};
