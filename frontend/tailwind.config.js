/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: 'var(--brand)',
          strong:  'var(--brand-strong)',
          soft:    'var(--brand-soft)',
        },
        surface: 'var(--surface)',
        ink:     'var(--ink)',
        muted:   'var(--muted)',
        bg:      'var(--bg)',
        border:  'var(--border)',
        ok:      'var(--ok)',
        warn:    'var(--warn)',
        danger:  'var(--danger)',
      },
      fontFamily: {
        sans:    ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        body:    ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card:    'var(--radius-card)',
        control: 'var(--radius-control)',
      },
      boxShadow: {
        card:        '0 2px 10px rgba(20,40,30,.05)',
        'card-hover':'0 8px 24px rgba(20,40,30,.10)',
        brand:       '0 4px 14px rgba(31,110,90,.25)',
        'brand-lg':  '0 6px 20px rgba(31,110,90,.38)',
      },
    },
  },
  plugins: [],
};
