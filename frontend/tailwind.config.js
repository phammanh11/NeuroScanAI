/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        navy: {
          50: '#f0f4f9',
          100: '#d9e4f1',
          200: '#b3c9e4',
          300: '#80a6d2',
          400: '#4d82be',
          500: '#2b61a3',
          600: '#1f4b82',
          700: '#193b68',
          800: '#153155',
          900: '#0f233f',
          950: '#091528',
        },
        medical: {
          50: '#eff8ff',
          100: '#dbeefe',
          200: '#bfe2fe',
          300: '#93d0fd',
          400: '#60b5fa',
          500: '#3b95f6',
          600: '#2577eb',
          700: '#1d61d8',
          800: '#1e4fae',
          900: '#1e458a',
          950: '#172b54',
        },
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        soft: '0 2px 15px -3px rgba(15, 35, 63, 0.06), 0 4px 6px -4px rgba(15, 35, 63, 0.04)',
        card: '0 4px 20px -2px rgba(15, 35, 63, 0.05), 0 1px 3px 0 rgba(15, 35, 63, 0.03)',
      },
    },
  },
  plugins: [],
};
