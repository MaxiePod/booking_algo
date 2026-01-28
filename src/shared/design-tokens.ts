/** PodPlay brand design tokens — matches podplay.app dark theme */
export const colors = {
  primary: '#3897f0',
  primaryHover: '#5aabf5',
  primaryLight: 'rgba(56, 151, 240, 0.10)',
  success: '#22c55e',
  successLight: 'rgba(34, 197, 94, 0.08)',
  successDark: '#4ade80',
  danger: '#f87171',
  text: '#ffffff',
  textSecondary: '#9ca3af',
  textMuted: '#6b7280',
  background: '#111111',
  backgroundAlt: '#1a1a1a',
  border: '#2a2a2a',
  borderLight: '#222222',
  surface: '#1a1a1a',
  surfaceHover: '#222222',
  pageBg: '#000000',
} as const;

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
} as const;

export const borderRadius = {
  sm: '6px',
  md: '10px',
  lg: '16px',
} as const;

export const fonts = {
  family:
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  sizeSmall: '12px',
  sizeBase: '14px',
  sizeMd: '16px',
  sizeLg: '20px',
  sizeXl: '28px',
  sizeXxl: '36px',
  weightNormal: '400',
  weightMedium: '500',
  weightSemibold: '600',
  weightBold: '700',
} as const;

export const breakpoints = {
  mobile: '480px',
  tablet: '768px',
  desktop: '1024px',
} as const;
