/**
 * PodPlay Design System — Refined Professional Dark Theme
 *
 * A sophisticated dark interface with luminous accent colors,
 * careful typography hierarchy, and subtle depth through layering.
 */

export const colors = {
  // Primary brand - PodPlay gray
  primary: '#8B8B8B',
  primaryHover: '#A0A0A0',
  primaryMuted: '#6B6B6B',
  primaryLight: 'rgba(139, 139, 139, 0.12)',
  primaryGlow: 'rgba(139, 139, 139, 0.25)',

  // Accent - PodPlay cream/beige
  accent: '#E5E1D8',
  accentDark: '#D4CFC4',
  accentLight: 'rgba(229, 225, 216, 0.15)',

  // Success/positive
  success: '#10b981',
  successHover: '#34d399',
  successLight: 'rgba(16, 185, 129, 0.10)',
  successDark: '#34d399',
  successGlow: 'rgba(16, 185, 129, 0.20)',

  // Warning/amber
  warning: '#f59e0b',
  warningLight: 'rgba(245, 158, 11, 0.10)',

  // Danger/error
  danger: '#ef4444',
  dangerLight: 'rgba(239, 68, 68, 0.10)',

  // Neutrals - refined monochromatic palette
  text: '#FFFFFF',
  textSecondary: '#A3A3A3',
  textMuted: '#737373',
  textSubtle: '#525252',

  // Surfaces - layered depth (pure blacks/grays)
  pageBg: '#0A0A0A',
  background: '#141414',
  backgroundAlt: '#1F1F1F',
  surface: '#1F1F1F',
  surfaceHover: '#2A2A2A',
  surfaceElevated: '#252525',

  // Borders
  border: '#333333',
  borderLight: '#262626',
  borderSubtle: 'rgba(163, 163, 163, 0.1)',

  // Special
  overlay: 'rgba(0, 0, 0, 0.7)',
  glassBg: 'rgba(31, 31, 31, 0.85)',
} as const;

export const spacing = {
  '2xs': '2px',
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
  '3xl': '64px',
} as const;

export const borderRadius = {
  xs: '4px',
  sm: '6px',
  md: '10px',
  lg: '14px',
  xl: '20px',
  full: '9999px',
} as const;

export const fonts = {
  // Roboto family
  family: "'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono: "'Roboto Mono', 'SF Mono', Consolas, monospace",

  // Sizes - refined scale
  sizeXs: '11px',
  sizeSmall: '12px',
  sizeBase: '14px',
  sizeMd: '15px',
  sizeLg: '18px',
  sizeXl: '24px',
  sizeXxl: '32px',
  size3xl: '40px',

  // Weights - Roboto thin/light focused
  weightLight: 300,
  weightNormal: 300,
  weightMedium: 300,
  weightSemibold: 400,
  weightBold: 500,

  // Line heights
  lineHeightTight: 1.2,
  lineHeightNormal: 1.5,
  lineHeightRelaxed: 1.7,

  // Letter spacing
  trackingTight: '-0.02em',
  trackingNormal: '0',
  trackingWide: '0.05em',
  trackingWidest: '0.1em',
} as const;

export const shadows = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.4)',
  md: '0 4px 12px rgba(0, 0, 0, 0.5)',
  lg: '0 8px 24px rgba(0, 0, 0, 0.6)',
  xl: '0 16px 48px rgba(0, 0, 0, 0.7)',
  glow: '0 0 20px rgba(139, 139, 139, 0.15)',
  glowAccent: '0 0 20px rgba(229, 225, 216, 0.15)',
  glowSuccess: '0 0 20px rgba(16, 185, 129, 0.15)',
  glowWarning: '0 0 20px rgba(245, 158, 11, 0.15)',
  inner: 'inset 0 1px 2px rgba(0, 0, 0, 0.4)',
} as const;

export const transitions = {
  fast: '150ms ease',
  normal: '200ms ease',
  slow: '300ms ease',
  spring: '300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;

export const breakpoints = {
  mobile: '480px',
  tablet: '768px',
  desktop: '1024px',
  wide: '1280px',
} as const;

/**
 * Inject global styles for the design system
 */
export function injectGlobalStyles(): void {
  if (typeof document === 'undefined') return;

  const styleId = 'podplay-design-system';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    /* Import Roboto from Google Fonts */
    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;600;700&family=Roboto+Mono:wght@400;500&display=swap');

    /* Reset & Base */
    *, *::before, *::after {
      box-sizing: border-box;
    }

    /* Custom scrollbar */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    ::-webkit-scrollbar-track {
      background: ${colors.background};
    }
    ::-webkit-scrollbar-thumb {
      background: ${colors.border};
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: ${colors.textMuted};
    }

    /* Focus styles */
    :focus-visible {
      outline: 2px solid ${colors.primary};
      outline-offset: 2px;
    }

    /* Selection */
    ::selection {
      background: ${colors.primaryLight};
      color: ${colors.text};
    }

    /* Animations */
    @keyframes podplay-spin {
      to { transform: rotate(360deg); }
    }

    @keyframes podplay-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    @keyframes podplay-fade-in {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes podplay-scale-in {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }

    @keyframes podplay-shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    @keyframes podplay-glow-pulse {
      0%, 100% { box-shadow: 0 0 20px rgba(139, 139, 139, 0.15); }
      50% { box-shadow: 0 0 30px rgba(139, 139, 139, 0.25); }
    }

    @keyframes podplay-default-blink {
      0%    { opacity: 1;    transform: scale(2.5); }
      16.5% { opacity: 0.2;  transform: scale(2.5); }
      33%   { opacity: 1;    transform: scale(2.5); }
      49.5% { opacity: 0.2;  transform: scale(2.5); }
      66%   { opacity: 1;    transform: scale(1); }
      83%   { opacity: 0.2;  transform: scale(1); }
      100%  { opacity: 1;    transform: scale(1); }
    }

    .podplay-default-blink {
      animation: podplay-default-blink 1s ease-in-out 1;
    }

    .podplay-fade-in {
      animation: podplay-fade-in 0.3s ease-out;
    }

    .podplay-scale-in {
      animation: podplay-scale-in 0.2s ease-out;
    }

    /* Responsive grid helpers */
    @media (max-width: 768px) {
      .podplay-calc-grid,
      .podplay-timeline-row,
      .podplay-two-col {
        grid-template-columns: 1fr !important;
      }
    }

    /* Gradient border utility */
    .podplay-gradient-border {
      position: relative;
      background: ${colors.background};
    }
    .podplay-gradient-border::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      padding: 1px;
      background: linear-gradient(135deg, ${colors.accent}30, transparent 50%, ${colors.primary}30);
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      pointer-events: none;
    }

    /* Glass effect utility */
    .podplay-glass {
      background: ${colors.glassBg};
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }

    /* Smooth hover transitions on interactive elements */
    button, a, input, select, textarea {
      transition: all ${transitions.fast};
    }

    /* Number input spinners */
    input[type="number"]::-webkit-inner-spin-button,
    input[type="number"]::-webkit-outer-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    input[type="number"] {
      -moz-appearance: textfield;
    }

    /* Range input styling */
    input[type="range"] {
      -webkit-appearance: none;
      appearance: none;
      background: transparent;
      cursor: pointer;
    }
    input[type="range"]::-webkit-slider-runnable-track {
      height: 6px;
      border-radius: 3px;
    }
    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: ${colors.text};
      border: 2px solid ${colors.primary};
      margin-top: -6px;
      box-shadow: ${shadows.md};
      transition: transform ${transitions.fast}, box-shadow ${transitions.fast};
    }
    input[type="range"]:hover::-webkit-slider-thumb {
      transform: scale(1.1);
      box-shadow: ${shadows.glow};
    }
    input[type="range"]:active::-webkit-slider-thumb {
      transform: scale(0.95);
    }

    /* Checkbox styling */
    input[type="checkbox"] {
      width: 18px;
      height: 18px;
      accent-color: ${colors.primary};
      cursor: pointer;
    }
  `;
  document.head.appendChild(style);
}

// Auto-inject on module load
injectGlobalStyles();
