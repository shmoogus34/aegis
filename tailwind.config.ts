import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          DEFAULT: '#070709',
          '50':  '#1a1a22',
          '100': '#111116',
          '200': '#0d0d11',
          '300': '#070709',
        },
        accent: {
          DEFAULT: '#7C6BF0',
          'light': '#9B8DF5',
          'dim': '#5A4DC0',
          'glow': '#B4A5FF',
          'muted': '#3D3580',
        },
        terminal: {
          cyan:  '#4DD9E0',
          green: '#4ADE80',
          red:   '#F87171',
          purple:'#C084FC',
          blue:  '#60A5FA',
        },
      },
      fontFamily: {
        title: ['Seramonde', 'Georgia', 'serif'],
        sans: ['Nexa', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'JetBrains Mono', 'Space Mono', 'Courier New', 'monospace'],
      },
      animation: {
        'pulse-slow':    'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan':          'scan 4s linear infinite',
        'flicker':       'flicker 8s linear infinite',
        'glow-breathe':  'glowBreathe 2s ease-in-out infinite',
        'spin-slow':     'spin 20s linear infinite',
        'float':         'float 6s ease-in-out infinite',
      },
      keyframes: {
        scan: {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '92%':      { opacity: '1' },
          '93%':      { opacity: '0.8' },
          '94%':      { opacity: '1' },
          '96%':      { opacity: '0.9' },
          '97%':      { opacity: '1' },
        },
        glowBreathe: {
          '0%, 100%': { boxShadow: '0 0 8px #7C6BF040, 0 0 20px #7C6BF020' },
          '50%':      { boxShadow: '0 0 20px #7C6BF080, 0 0 40px #7C6BF040' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
      },
      backgroundImage: {
        'grid-accent': `linear-gradient(rgba(124,107,240,0.04) 1px, transparent 1px),
                       linear-gradient(90deg, rgba(124,107,240,0.04) 1px, transparent 1px)`,
        'grid-perspective': `linear-gradient(rgba(124,107,240,0.06) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(124,107,240,0.06) 1px, transparent 1px)`,
      },
      backgroundSize: {
        'grid-sm': '40px 40px',
        'grid-lg': '80px 80px',
      },
    },
  },
  plugins: [],
};

export default config;
