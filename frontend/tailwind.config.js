/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        serif: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      colors: {
        // Warm Clinical Monochrome scale replacing generic cool Tailwind slate
        slate: {
          50: '#f7f7f5',
          100: '#efeeea',
          200: '#e4e3de',
          300: '#d1d0c9',
          400: '#9c9b93',
          500: '#717069',
          600: '#52524c',
          700: '#383935',
          800: '#232524',
          900: '#161819',
          950: '#0d0f10',
        },
        // Muted Clinical Teal accent (calm, high-trust medical tone)
        teal: {
          50: '#f1f8f7',
          100: '#d9efec',
          200: '#b4dfd9',
          300: '#82c7be',
          400: '#4ea99e',
          500: '#17877d',
          600: '#0f6f67',
          700: '#0f5953',
          800: '#114743',
          900: '#123b38',
          950: '#062220',
        },
        // Utilitarian Charcoal / Deep Clinical Ink for primary actions
        navy: {
          50: '#f4f5f6',
          100: '#e5e7ea',
          200: '#cbd0d6',
          300: '#a3acb7',
          400: '#748090',
          500: '#535f6f',
          600: '#3d4755',
          700: '#2b323d',
          800: '#16191d',
          900: '#0c0e11',
          950: '#07080a',
        },
        medical: {
          50: '#f2f7fb',
          100: '#e2eef7',
          200: '#c7dfef',
          300: '#9dc5e2',
          400: '#6aa4cf',
          500: '#4284b8',
          600: '#306a99',
          700: '#27557c',
          800: '#234766',
          900: '#203c55',
          950: '#152738',
        },
      },
      // Crisp, restrained corners instead of bloated AI-template pill cards
      borderRadius: {
        lg: '0.375rem',
        xl: '0.5rem',
        '2xl': '0.75rem',
        '3xl': '1rem',
      },
      // Ultra-flat architectural elevation (nearly invisible shadows)
      boxShadow: {
        soft: '0 1px 2px rgba(16, 20, 24, 0.05)',
        card: '0 1px 2px rgba(16, 20, 24, 0.04)',
      },
    },
  },
  plugins: [],
};
