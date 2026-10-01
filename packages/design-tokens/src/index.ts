// ─────────────────────────────────────────────────────────────────────────────
// Colors
// Platform-agnostic hex/rgba values. Web consumers use them directly in CSS
// or Tailwind; React Native consumers apply them via StyleSheet.
// ─────────────────────────────────────────────────────────────────────────────

export const colors = {
  // Brand
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },
  secondary: {
    50: '#f5f3ff',
    100: '#ede9fe',
    200: '#ddd6fe',
    300: '#c4b5fd',
    400: '#a78bfa',
    500: '#8b5cf6',
    600: '#7c3aed',
    700: '#6d28d9',
    800: '#5b21b6',
    900: '#4c1d95',
    950: '#2e1065',
  },

  // Neutrals
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    950: '#030712',
  },

  // Semantic
  success: {
    light: '#dcfce7',
    main: '#22c55e',
    dark: '#15803d',
  },
  warning: {
    light: '#fef9c3',
    main: '#eab308',
    dark: '#a16207',
  },
  error: {
    light: '#fee2e2',
    main: '#ef4444',
    dark: '#b91c1c',
  },
  info: {
    light: '#dbeafe',
    main: '#3b82f6',
    dark: '#1d4ed8',
  },

  // Base
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Spacing
// Base unit = 4px (0.25rem). Values are raw numbers in pixels.
// Web: apply as px or rem; Mobile: use directly in StyleSheet.
// ─────────────────────────────────────────────────────────────────────────────

export const spacing = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
  28: 112,
  32: 128,
  36: 144,
  40: 160,
  44: 176,
  48: 192,
  52: 208,
  56: 224,
  60: 240,
  64: 256,
  72: 288,
  80: 320,
  96: 384,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Typography
// ─────────────────────────────────────────────────────────────────────────────

export const fontFamily = {
  sans: ['Inter', 'system-ui', 'sans-serif'],
  mono: ['JetBrains Mono', 'Consolas', 'monospace'],
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
  '6xl': 60,
  '7xl': 72,
} as const;

export const fontWeight = {
  thin: '100',
  extralight: '200',
  light: '300',
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
  black: '900',
} as const;

export const lineHeight = {
  none: 1,
  tight: 1.25,
  snug: 1.375,
  normal: 1.5,
  relaxed: 1.625,
  loose: 2,
} as const;

export const letterSpacing = {
  tighter: -0.8,
  tight: -0.4,
  normal: 0,
  wide: 0.4,
  wider: 0.8,
  widest: 1.6,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Border radius
// ─────────────────────────────────────────────────────────────────────────────

export const borderRadius = {
  none: 0,
  sm: 2,
  DEFAULT: 4,
  md: 6,
  lg: 8,
  xl: 12,
  '2xl': 16,
  '3xl': 24,
  full: 9999,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Shadows
// Format: { offsetX, offsetY, blurRadius, spreadRadius, color }
// Web consumers map these to CSS box-shadow strings.
// React Native consumers use the shadow* props.
// ─────────────────────────────────────────────────────────────────────────────

export const shadows = {
  none: {
    offsetX: 0,
    offsetY: 0,
    blurRadius: 0,
    spreadRadius: 0,
    color: 'transparent',
  },
  sm: {
    offsetX: 0,
    offsetY: 1,
    blurRadius: 2,
    spreadRadius: 0,
    color: 'rgba(0, 0, 0, 0.05)',
  },
  DEFAULT: {
    offsetX: 0,
    offsetY: 1,
    blurRadius: 3,
    spreadRadius: 0,
    color: 'rgba(0, 0, 0, 0.1)',
  },
  md: {
    offsetX: 0,
    offsetY: 4,
    blurRadius: 6,
    spreadRadius: -1,
    color: 'rgba(0, 0, 0, 0.1)',
  },
  lg: {
    offsetX: 0,
    offsetY: 10,
    blurRadius: 15,
    spreadRadius: -3,
    color: 'rgba(0, 0, 0, 0.1)',
  },
  xl: {
    offsetX: 0,
    offsetY: 20,
    blurRadius: 25,
    spreadRadius: -5,
    color: 'rgba(0, 0, 0, 0.1)',
  },
  '2xl': {
    offsetX: 0,
    offsetY: 25,
    blurRadius: 50,
    spreadRadius: -12,
    color: 'rgba(0, 0, 0, 0.25)',
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Breakpoints (in px — for reference in JS/TS code)
// ─────────────────────────────────────────────────────────────────────────────

export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Animation
// ─────────────────────────────────────────────────────────────────────────────

export const duration = {
  75: 75,
  100: 100,
  150: 150,
  200: 200,
  300: 300,
  500: 500,
  700: 700,
  1000: 1000,
} as const;

export const easing = {
  linear: 'linear',
  in: 'cubic-bezier(0.4, 0, 1, 1)',
  out: 'cubic-bezier(0, 0, 0.2, 1)',
  inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Tokens object — all tokens in one place
// ─────────────────────────────────────────────────────────────────────────────

export const tokens = {
  colors,
  spacing,
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,
  borderRadius,
  shadows,
  breakpoints,
  duration,
  easing,
} as const;

export type Tokens = typeof tokens;
