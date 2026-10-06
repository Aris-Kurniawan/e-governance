/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: 'hsl(210 69% 23% / <alpha-value>)',
          light: 'hsl(210 50% 95% / <alpha-value>)',
          border: 'hsl(210 47% 88% / <alpha-value>)',
        },
        ink: {
          DEFAULT: 'hsl(220 43% 11% / <alpha-value>)',
          secondary: 'hsl(216 18% 34% / <alpha-value>)',
          tertiary: 'hsl(219 14% 60% / <alpha-value>)',
        },
        surface: {
          DEFAULT: 'hsl(0 0% 100% / <alpha-value>)',
          alt: 'hsl(216 29% 97% / <alpha-value>)',
          subtle: 'hsl(210 40% 98% / <alpha-value>)',
        },
        danger: {
          text: 'hsl(0 70% 35% / <alpha-value>)',
          light: 'hsl(0 86% 97% / <alpha-value>)',
          border: 'hsl(0 93% 94% / <alpha-value>)',
        },
        warning: {
          text: 'hsl(23 83% 31% / <alpha-value>)',
          light: 'hsl(48 96% 89% / <alpha-value>)',
          border: 'hsl(48 97% 77% / <alpha-value>)',
        },
        border: 'hsl(218 17% 91% / <alpha-value>)',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))',
        },
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '16px',
      },
      fontSize: {
        display: ['46px', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        h1: ['36px', { lineHeight: '1.2' }],
        h2: ['30px', { lineHeight: '1.25' }],
        h3: ['26px', { lineHeight: '1.3' }],
        'body-lg': ['18px', { lineHeight: '1.5' }],
        body: ['16px', { lineHeight: '1.5' }],
        'body-sm': ['14px', { lineHeight: '1.5' }],
        label: ['14px', { lineHeight: '1.3', fontWeight: '600' }],
        caption: ['12px', { lineHeight: '1.4' }],
        overline: ['10px', { lineHeight: '1.2', letterSpacing: '0.5px' }],
      },
      boxShadow: {
        sm: '0 1px 2px 0 hsl(0 0% 0% / 0.03)',
        md: '0 1px 2px 0 hsl(0 0% 0% / 0.05)',
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
