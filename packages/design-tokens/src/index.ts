// ─────────────────────────────────────────────────────────────────────────────
// NEXA Design Tokens
//
// Single source of truth for the Miro-inspired visual workspace interface
// described in /DESIGN.md ("Miro-design-analysis"). Every token here maps 1:1
// to a key in that document, using the same names, so a `{colors.brand-yellow}`
// reference in the spec resolves to `colors['brand-yellow']` in code.
//
// Platform-agnostic: hex/number values only. Web consumers use them directly in
// CSS-in-JS or via `cssVariables`; React Native consumers use `mobileTypography`
// and the spacing/rounded scales in StyleSheet.
//
// System contracts (see DESIGN.md → Do's and Don'ts):
//   · White canvas everywhere — the signature clean whiteboard surface.
//   · Black-pill primary CTAs ({rounded.full}) as the dominant interactive element.
//   · Brand yellow reserved for wordmark, promo banner, and yellow-tag chips only.
//   · Pastel feature cards (yellow, rose, coral, teal) echo sticky-note palette.
//   · Roobert PRO across every UI surface; no weight above 600.
//   · No heavy shadows — predominantly flat with strategic depth on hero mockups.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Colors
// ─────────────────────────────────────────────────────────────────────────────

export const colors = {
  // Primary — near-black. All primary CTAs, h1/h2 ink type, footer background.
  primary: '#1c1c1e',
  'on-primary': '#ffffff',

  // Brand accent colors
  'brand-yellow': '#ffd02f',       // wordmark, top promo banner, "yellow tag" pills
  'brand-yellow-deep': '#fcb900',  // hover states and emphasis
  'yellow-light': '#fff4c4',       // pale yellow background tint for tag chips
  'yellow-dark': '#746019',        // yellow-tag text color (dark olive)

  'brand-blue': '#4262ff',         // action blue for inline links and featured-pricing border
  'blue-450': '#5b76fe',           // mid-tint blue
  'blue-pressed': '#2a41b6',       // pressed-state blue
  'info-surface': '#f5f8ff',

  'brand-coral': '#ff9999',        // coral accent for warm callouts
  'coral-light': '#ffc6c6',        // pale coral for feature card backgrounds
  'coral-dark': '#600000',         // coral-tag text color (deep wine)

  'brand-rose': '#ffd8f4',         // soft rose-pink for feature card variants
  'rose-light': '#fde0f0',         // rose feature card bg / tag chip bg
  'brand-pink': '#fde0f0',         // alias — pale pink for soft callouts

  'brand-teal': '#0fbcb0',         // brand teal
  'teal-light': '#c3faf5',         // pale teal for feature card backgrounds
  'moss-dark': '#187574',          // deep teal-green text color

  'brand-orange-light': '#ffe6cd', // soft orange for feature card backgrounds

  'brand-red': '#fbd4d4',          // soft red for error backgrounds
  'brand-red-dark': '#e3c5c5',     // stronger red for error borders

  'success-accent': '#00b473',     // confirmation/success indicator green
  'success-surface': '#f0fdf9',
  danger: '#dc2626',
  'danger-surface': '#fef2f2',
  'skeleton-base': '#edf0f5',
  'skeleton-highlight': '#f8f9fb',
  'overlay-scrim': 'rgba(28, 28, 30, 0.5)',

  // Surface — the white canvas and its variants
  canvas: '#ffffff',                       // page background and primary card surface
  surface: '#f7f8fa',                      // subtle section backgrounds, search-pill rest
  'surface-soft': '#fafbfc',              // quieter section divisions
  'surface-yellow': '#fff8e0',            // pale yellow-tinted surface for tag chip
  'surface-pricing-featured': '#f5f3ff',  // pale lavender for featured pricing tier

  // Hairlines
  hairline: '#e0e2e8',         // 1px borders and primary dividers
  'hairline-soft': '#eef0f3',  // quieter table-row dividers
  'hairline-strong': '#c7cad5', // stronger 1px border for inputs

  // Text
  'ink-deep': '#050038',  // headlines on lighter feature cards
  ink: '#1c1c1e',         // primary headlines and body text
  charcoal: '#2c2c34',    // body emphasis text
  slate: '#555a6a',       // secondary text, metadata
  steel: '#6b6f7e',       // tertiary text, footer links
  stone: '#8e91a0',       // captions, muted labels
  muted: '#a5a8b5',       // disabled labels, input placeholders

  // On-dark
  'on-dark': '#ffffff',
  'on-dark-muted': '#a5a8b5',

  // Footer
  'footer-bg': '#1c1c1e',

  // Base
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
} as const;

export type ColorName = keyof typeof colors;
export type ColorValue = (typeof colors)[ColorName];

/** The pastel feature-card surfaces in DESIGN.md cycle order. */
export const featureCardCycle = [
  'brand-yellow',
  'coral-light',
  'teal-light',
  'rose-light',
  'brand-orange-light',
  'canvas',
] as const satisfies readonly ColorName[];

// ─────────────────────────────────────────────────────────────────────────────
// Typography
//
// Roobert PRO is Miro's custom geometric sans-serif. It is used across every
// UI surface. Fallbacks: Noto Sans, -apple-system, BlinkMacSystemFont, sans-serif.
// Weight scale: 400 (body) · 500 (medium emphasis + headings) · 600 (badges/uppercase).
// Display sizes use negative letter-spacing; body sizes relax to 0.
// ─────────────────────────────────────────────────────────────────────────────

/** Font family stacks as ordered arrays (React Native friendly). */
export const fontFamily = {
  display: [
    'Roobert PRO',
    'Noto Sans',
    '-apple-system',
    'BlinkMacSystemFont',
    'sans-serif',
  ],
  sans: ['Roobert PRO', 'Noto Sans', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
} as const;

const cssFontStack = (families: readonly string[]): string =>
  families.map((family) => (family.includes(' ') ? `"${family}"` : family)).join(', ');

/** Font family stacks as CSS `font-family` strings (web friendly). */
export const fontStacks = {
  display: cssFontStack(fontFamily.display),
  sans: cssFontStack(fontFamily.sans),
} as const;

/**
 * Roobert PRO is a licensed custom typeface. If unavailable, Noto Sans at
 * weight 500 with negative letter-spacing is the documented substitute.
 */
export const fontSubstitutes = {
  display: 'Noto Sans',
  sans: 'Noto Sans',
} as const;

export const typography = {
  /** 80px — Marketing hero ("See how teams get great done with Miro") */
  'hero-display': {
    fontFamily: fontStacks.display,
    fontSize: 80,
    fontWeight: '500' as const,
    lineHeight: 1.05,
    letterSpacing: -2,
  },
  /** 60px — Major section openers */
  'display-lg': {
    fontFamily: fontStacks.display,
    fontSize: 60,
    fontWeight: '500' as const,
    lineHeight: 1.1,
    letterSpacing: -1.5,
  },
  /** 48px — Page-level headlines */
  'heading-1': {
    fontFamily: fontStacks.display,
    fontSize: 48,
    fontWeight: '500' as const,
    lineHeight: 1.15,
    letterSpacing: -1,
  },
  /** 36px — Subsection headlines */
  'heading-2': {
    fontFamily: fontStacks.display,
    fontSize: 36,
    fontWeight: '500' as const,
    lineHeight: 1.2,
    letterSpacing: -0.5,
  },
  /** 28px — Card titles */
  'heading-3': {
    fontFamily: fontStacks.display,
    fontSize: 28,
    fontWeight: '500' as const,
    lineHeight: 1.25,
    letterSpacing: 0,
  },
  /** 22px — Feature tile titles */
  'heading-4': {
    fontFamily: fontStacks.display,
    fontSize: 22,
    fontWeight: '500' as const,
    lineHeight: 1.3,
    letterSpacing: 0,
  },
  /** 18px — FAQ questions, smaller cards */
  'heading-5': {
    fontFamily: fontStacks.display,
    fontSize: 18,
    fontWeight: '500' as const,
    lineHeight: 1.4,
    letterSpacing: 0,
  },
  /** 18px — Hero subtitle */
  subtitle: {
    fontFamily: fontStacks.sans,
    fontSize: 18,
    fontWeight: '400' as const,
    lineHeight: 1.5,
    letterSpacing: 0,
  },
  /** 16px / 400 — Primary body text */
  'body-md': {
    fontFamily: fontStacks.sans,
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 1.5,
    letterSpacing: 0,
  },
  /** 16px / 500 — Logo wall labels */
  'body-md-medium': {
    fontFamily: fontStacks.sans,
    fontSize: 16,
    fontWeight: '500' as const,
    lineHeight: 1.5,
    letterSpacing: 0,
  },
  /** 14px / 400 — Secondary body, table cells */
  'body-sm': {
    fontFamily: fontStacks.sans,
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 1.5,
    letterSpacing: 0,
  },
  /** 14px / 500 — Filter dropdowns, button labels */
  'body-sm-medium': {
    fontFamily: fontStacks.sans,
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 1.5,
    letterSpacing: 0,
  },
  /** 13px / 400 — Helper text */
  caption: {
    fontFamily: fontStacks.sans,
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 1.4,
    letterSpacing: 0,
  },
  /** 13px / 600 — Badge labels, tag chips */
  'caption-bold': {
    fontFamily: fontStacks.sans,
    fontSize: 13,
    fontWeight: '600' as const,
    lineHeight: 1.4,
    letterSpacing: 0,
  },
  /** 12px / 500 — Footer microcopy */
  micro: {
    fontFamily: fontStacks.sans,
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 1.4,
    letterSpacing: 0,
  },
  /** 11px / 600 — Section dividers in tables */
  'micro-uppercase': {
    fontFamily: fontStacks.sans,
    fontSize: 11,
    fontWeight: '600' as const,
    lineHeight: 1.4,
    letterSpacing: 0.5,
  },
  /** 14px / 500 — Pill button labels */
  'button-md': {
    fontFamily: fontStacks.sans,
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 1.3,
    letterSpacing: 0,
  },
  /** 64px / 500 — "100M+ users" stat callouts */
  'stat-display': {
    fontFamily: fontStacks.display,
    fontSize: 64,
    fontWeight: '500' as const,
    lineHeight: 1.1,
    letterSpacing: -1.5,
  },
} as const;

export type TypographyName = keyof typeof typography;
export type TypographyStyle = (typeof typography)[TypographyName];
export type FontWeight = TypographyStyle['fontWeight'];

/** React Native needs `lineHeight` in points, not as a unitless multiplier. */
export type MobileTypography = {
  fontFamily: string;
  fontSize: number;
  fontWeight: FontWeight;
  lineHeight: number;
  letterSpacing: number;
};

/** Resolve a typography token into React Native `TextStyle` values. */
export function mobileTypography(name: TypographyName): MobileTypography {
  const token = typography[name];
  const isDisplay = token.fontFamily === fontStacks.display;

  return {
    fontFamily: isDisplay ? fontSubstitutes.display : fontSubstitutes.sans,
    fontSize: token.fontSize,
    fontWeight: token.fontWeight,
    lineHeight: Math.round(token.fontSize * token.lineHeight),
    letterSpacing: token.letterSpacing,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Shapes
// ─────────────────────────────────────────────────────────────────────────────

/** Border radius scale (px). */
export const rounded = {
  xs: 4,      // small chips, micro-controls
  sm: 6,      // discount badges
  md: 8,      // inputs, search-pill
  lg: 12,     // standard cards, table containers
  xl: 16,     // pricing cards, feature panels
  xxl: 20,    // larger feature cards
  xxxl: 28,   // pastel feature cards (yellow, rose, coral, teal)
  feature: 32, // hero CTA banner cards
  full: 9999,  // all buttons, pill tabs, badges
} as const;

export type RoundedName = keyof typeof rounded;

// ─────────────────────────────────────────────────────────────────────────────
// Spacing — base unit 4px (8px primary increment)
// ─────────────────────────────────────────────────────────────────────────────

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  'section-sm': 48,
  section: 64,
  'section-lg': 96,
  hero: 120,
} as const;

export type SpacingName = keyof typeof spacing;

// ─────────────────────────────────────────────────────────────────────────────
// Layout
// ─────────────────────────────────────────────────────────────────────────────

export const layout = {
  /** Max content width (~1280px centered) at every breakpoint. */
  maxContentWidth: 1280,
  /** Horizontal gutter (32px). */
  gridGutter: spacing.xxl,
  /** Vertical padding between major editorial bands. */
  sectionPadding: spacing.section,
  /** Internal card padding: feature cards vs. compact cards. */
  cardPadding: {
    feature: spacing.xxl,  // 32px — feature panels, pricing tiers
    content: spacing.xl,   // 24px — compact content cards
  },
} as const;

export const breakpoints = {
  /** < 480px — single column, hero 36px, pill nav → hamburger, pricing 1-up. */
  mobileSm: 0,
  /** 480–767px — feature tiles 2-up, hero 48px. */
  mobileLg: 480,
  /** 768–1023px — 2-column grids, pill-tab nav returns. */
  tablet: 768,
  /** 1024–1279px — 4-tier pricing row, customer story 2-up, hero 64px. */
  desktop: 1024,
  /** ≥ 1280px — full hero at 80px. */
  wide: 1280,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Elevation & depth
//
// The system runs predominantly flat with strategic depth on hero mockups.
// ─────────────────────────────────────────────────────────────────────────────

export const shadows = {
  /** No shadow — default cards, table rows, form inputs. */
  none: {
    offsetX: 0,
    offsetY: 0,
    blurRadius: 0,
    spreadRadius: 0,
    color: 'transparent',
    css: 'none',
  },
  /** Subtle hover-elevated tiles. */
  subtle: {
    offsetX: 0,
    offsetY: 1,
    blurRadius: 2,
    spreadRadius: 0,
    color: 'rgba(5, 0, 56, 0.04)',
    css: 'rgba(5, 0, 56, 0.04) 0px 1px 2px 0px',
  },
  /** Standard feature cards. */
  card: {
    offsetX: 0,
    offsetY: 4,
    blurRadius: 12,
    spreadRadius: 0,
    color: 'rgba(5, 0, 56, 0.06)',
    css: 'rgba(5, 0, 56, 0.06) 0px 4px 12px 0px',
  },
  /** Hero whiteboard mockup framing. */
  mockup: {
    offsetX: 0,
    offsetY: 12,
    blurRadius: 32,
    spreadRadius: -4,
    color: 'rgba(5, 0, 56, 0.08)',
    css: 'rgba(5, 0, 56, 0.08) 0px 12px 32px -4px',
  },
  /** Modals, dropdowns. */
  modal: {
    offsetX: 0,
    offsetY: 16,
    blurRadius: 48,
    spreadRadius: -8,
    color: 'rgba(5, 0, 56, 0.12)',
    css: 'rgba(5, 0, 56, 0.12) 0px 16px 48px -8px',
  },
} as const;

export type ShadowName = keyof typeof shadows;

export const elevation = {
  /** No shadow, no border — body sections, top nav, hero. */
  flat: { boxShadow: shadows.none.css, borderWidth: 0, shadow: shadows.none },
  /** 1px hairline border — default cards, table rows, form inputs. */
  hairline: { boxShadow: shadows.none.css, borderWidth: 1, shadow: shadows.none },
  /** Subtle shadow — hover-elevated tiles. */
  subtle: { boxShadow: shadows.subtle.css, borderWidth: 0, shadow: shadows.subtle },
  /** Card shadow — standard feature cards. */
  card: { boxShadow: shadows.card.css, borderWidth: 0, shadow: shadows.card },
  /** Mockup shadow — hero whiteboard mockup framing. */
  mockup: { boxShadow: shadows.mockup.css, borderWidth: 0, shadow: shadows.mockup },
  /** Modal shadow — modals, dropdowns. */
  modal: { boxShadow: shadows.modal.css, borderWidth: 0, shadow: shadows.modal },
} as const;

export type ElevationName = keyof typeof elevation;

// ─────────────────────────────────────────────────────────────────────────────
// Components
//
// Component recipes exactly as specified in DESIGN.md. Variants (`-pressed`,
// `-disabled`, `-active`) are separate entries that only carry the properties
// they change; merge them over their base entry.
// ─────────────────────────────────────────────────────────────────────────────

export type ComponentToken = {
  readonly backgroundColor?: ColorValue;
  readonly textColor?: ColorValue;
  readonly typography?: TypographyStyle;
  readonly rounded?: number;
  /** CSS-ready padding shorthand. */
  readonly padding?: string;
  readonly height?: number;
  readonly size?: number;
  readonly borderWidth?: number;
  readonly borderColor?: ColorValue;
  readonly shadow?: string;
  readonly textDecoration?: string;
};

export const components = {
  // ── Buttons ────────────────────────────────────────────────────────────────

  /** Black pill primary CTA — "Get started free". */
  'button-primary': {
    backgroundColor: colors.primary,
    textColor: colors['on-primary'],
    typography: typography['button-md'],
    rounded: rounded.full,
    padding: '12px 24px',
  },
  /** Pressed state — lifts to charcoal. */
  'button-primary-pressed': {
    backgroundColor: colors.charcoal,
    textColor: colors['on-primary'],
  },
  /** Disabled state. */
  'button-primary-disabled': {
    backgroundColor: colors.hairline,
    textColor: colors.muted,
  },

  /** Brand-yellow pill for moments of brand emphasis. */
  'button-yellow': {
    backgroundColor: colors['brand-yellow'],
    textColor: colors.primary,
    typography: typography['button-md'],
    rounded: rounded.full,
    padding: '12px 24px',
  },

  /** Brand-blue pill for inline action callouts. */
  'button-blue': {
    backgroundColor: colors['brand-blue'],
    textColor: colors['on-primary'],
    typography: typography['button-md'],
    rounded: rounded.full,
    padding: '12px 24px',
  },

  /** Outlined pill for secondary actions — "Book a demo". */
  'button-secondary': {
    backgroundColor: colors.transparent,
    textColor: colors.ink,
    typography: typography['button-md'],
    rounded: rounded.full,
    padding: '12px 24px',
    borderWidth: 1,
    borderColor: colors['hairline-strong'],
  },

  /** White pill for dark CTA banners. */
  'button-on-dark': {
    backgroundColor: colors['on-dark'],
    textColor: colors.primary,
    typography: typography['button-md'],
    rounded: rounded.full,
    padding: '12px 24px',
  },

  /** Quieter rectangular ghost button. */
  'button-ghost': {
    backgroundColor: colors.transparent,
    textColor: colors.ink,
    typography: typography['button-md'],
    rounded: rounded.md,
    padding: '8px 12px',
  },

  /** Inline text link. */
  'button-link': {
    backgroundColor: colors.transparent,
    textColor: colors['brand-blue'],
    typography: typography['body-sm-medium'],
    padding: '0',
  },

  /** 36×36px circular utility button. */
  'button-icon-circular': {
    backgroundColor: colors.canvas,
    textColor: colors.ink,
    rounded: rounded.full,
    size: 36,
    borderWidth: 1,
    borderColor: colors.hairline,
  },

  // ── Cards & Containers ────────────────────────────────────────────────────

  /** Standard content card. */
  'card-base': {
    backgroundColor: colors.canvas,
    rounded: rounded.xl,
    padding: `${spacing.xl}px`,
    borderWidth: 1,
    borderColor: colors['hairline-soft'],
  },

  /** White feature card with larger 28px corners. */
  'card-feature': {
    backgroundColor: colors.canvas,
    rounded: rounded.xxxl,
    padding: `${spacing.xxl}px`,
    borderWidth: 1,
    borderColor: colors['hairline-soft'],
  },

  /** Pastel-yellow feature card. */
  'card-feature-yellow': {
    backgroundColor: colors['brand-yellow'],
    textColor: colors.primary,
    rounded: rounded.xxxl,
    padding: `${spacing.xxl}px`,
  },

  /** Pastel-coral feature card variant. */
  'card-feature-coral': {
    backgroundColor: colors['coral-light'],
    textColor: colors.primary,
    rounded: rounded.xxxl,
    padding: `${spacing.xxl}px`,
  },

  /** Pastel-teal feature card variant. */
  'card-feature-teal': {
    backgroundColor: colors['teal-light'],
    textColor: colors.primary,
    rounded: rounded.xxxl,
    padding: `${spacing.xxl}px`,
  },

  /** Pastel-rose feature card variant. */
  'card-feature-rose': {
    backgroundColor: colors['rose-light'],
    textColor: colors.primary,
    rounded: rounded.xxxl,
    padding: `${spacing.xxl}px`,
  },

  /** Customer story card — image fills the card. */
  'card-customer-story': {
    backgroundColor: colors.canvas,
    rounded: rounded.xxxl,
    padding: '0',
    borderWidth: 1,
    borderColor: colors['hairline-soft'],
  },

  /** Stat-row cell for "100M+ users". */
  'card-stat': {
    backgroundColor: colors.transparent,
    textColor: colors.ink,
    typography: typography['stat-display'],
    padding: `${spacing.lg}px`,
  },

  /** Standard pricing tier card. */
  'pricing-card': {
    backgroundColor: colors.canvas,
    rounded: rounded.xl,
    padding: `${spacing.xxl}px`,
    borderWidth: 1,
    borderColor: colors.hairline,
  },

  /** Featured pricing tier — lavender background + blue border. */
  'pricing-card-featured': {
    backgroundColor: colors['surface-pricing-featured'],
    rounded: rounded.xl,
    padding: `${spacing.xxl}px`,
    borderWidth: 2,
    borderColor: colors['brand-blue'],
  },

  /** Dark-canvas enterprise tier card. */
  'pricing-card-enterprise': {
    backgroundColor: colors.primary,
    textColor: colors['on-primary'],
    rounded: rounded.xl,
    padding: `${spacing.xxl}px`,
  },

  // ── Inputs & Forms ────────────────────────────────────────────────────────

  /** Standard text field. */
  'text-input': {
    backgroundColor: colors.canvas,
    textColor: colors.ink,
    typography: typography['body-md'],
    rounded: rounded.md,
    padding: `${spacing.sm}px ${spacing.md}px`,
    height: 44,
    borderWidth: 1,
    borderColor: colors['hairline-strong'],
  },

  /** Activated (focused) state — border switches to 2px brand-blue. */
  'text-input-focused': {
    backgroundColor: colors.canvas,
    textColor: colors.ink,
    borderWidth: 2,
    borderColor: colors['brand-blue'],
  },

  /** Search bar. */
  'search-pill': {
    backgroundColor: colors.surface,
    textColor: colors.steel,
    typography: typography['body-sm'],
    rounded: rounded.md,
    height: 40,
    borderWidth: 1,
    borderColor: colors.hairline,
  },

  /** Pill-shaped filter dropdown — "Company use" / "Industry" / "Use case". */
  'filter-dropdown': {
    backgroundColor: colors.canvas,
    textColor: colors.ink,
    typography: typography['body-sm-medium'],
    rounded: rounded.full,
    padding: `${spacing.xs}px ${spacing.md}px`,
    borderWidth: 1,
    borderColor: colors['hairline-strong'],
  },

  // ── Tabs ──────────────────────────────────────────────────────────────────

  /** Pill-style tab nav — inactive state. */
  'pill-tab': {
    backgroundColor: colors.canvas,
    textColor: colors.steel,
    typography: typography['body-sm-medium'],
    rounded: rounded.full,
    padding: `${spacing.xs}px ${spacing.md}px`,
    borderWidth: 1,
    borderColor: colors.hairline,
  },

  /** Pill-style tab nav — active state. */
  'pill-tab-active': {
    backgroundColor: colors.primary,
    textColor: colors['on-primary'],
    rounded: rounded.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },

  /** Two-state pill toggle — Monthly / Annual on pricing. */
  'toggle-monthly-yearly': {
    backgroundColor: colors.surface,
    textColor: colors.ink,
    rounded: rounded.full,
    padding: '4px',
  },

  // ── Badges & Status ───────────────────────────────────────────────────────

  /** Yellow promo banner badge. */
  'badge-promo': {
    backgroundColor: colors['brand-yellow'],
    textColor: colors.primary,
    typography: typography['caption-bold'],
    rounded: rounded.full,
    padding: '4px 10px',
  },

  /** Soft-yellow feature tag chip. */
  'badge-tag-yellow': {
    backgroundColor: colors['surface-yellow'],
    textColor: colors['yellow-dark'],
    typography: typography['caption-bold'],
    rounded: rounded.full,
    padding: '4px 10px',
  },

  /** Lavender feature tag chip — "AI agent" tag. */
  'badge-tag-purple': {
    backgroundColor: colors['surface-pricing-featured'],
    textColor: colors['brand-blue'],
    typography: typography['caption-bold'],
    rounded: rounded.full,
    padding: '4px 10px',
  },

  /** Coral feature tag chip variant. */
  'badge-tag-coral': {
    backgroundColor: colors['coral-light'],
    textColor: colors['coral-dark'],
    typography: typography['caption-bold'],
    rounded: rounded.full,
    padding: '4px 10px',
  },

  /** Green success indicator. */
  'badge-success': {
    backgroundColor: colors['success-accent'],
    textColor: colors['on-primary'],
    typography: typography['caption-bold'],
    rounded: rounded.full,
    padding: '4px 10px',
  },

  /** Yellow rectangular discount pill — "Save 15%". */
  'badge-discount': {
    backgroundColor: colors['brand-yellow'],
    textColor: colors.primary,
    typography: typography['caption-bold'],
    rounded: rounded.sm,
    padding: '2px 6px',
  },

  /** Sticky black promo strip ABOVE the top nav. */
  'promo-banner': {
    backgroundColor: colors.primary,
    textColor: colors['on-primary'],
    typography: typography['body-sm-medium'],
    padding: `${spacing.sm}px ${spacing.md}px`,
  },

  // ── Tables ────────────────────────────────────────────────────────────────

  /** Pricing feature comparison table. */
  'comparison-table': {
    backgroundColor: colors.canvas,
    textColor: colors.ink,
    typography: typography['body-sm'],
    rounded: rounded.md,
    borderWidth: 1,
    borderColor: colors.hairline,
  },

  /** Individual feature row. */
  'comparison-row': {
    backgroundColor: colors.canvas,
    textColor: colors.ink,
    padding: `${spacing.md}px ${spacing.lg}px`,
  },

  // ── Signature Sections ────────────────────────────────────────────────────

  /** Marketing hero band. */
  'hero-band-marketing': {
    backgroundColor: colors.canvas,
    textColor: colors.ink,
    typography: typography['hero-display'],
    rounded: 0,
    padding: `${spacing.hero}px`,
  },

  /** Dark CTA banner at the bottom of feature pages. */
  'cta-banner-dark': {
    backgroundColor: colors.primary,
    textColor: colors['on-primary'],
    rounded: rounded.feature,
    padding: `${spacing.section}px`,
  },

  /** Real Miro-board UI rendered as feature illustration. */
  'whiteboard-mockup': {
    backgroundColor: colors.canvas,
    rounded: rounded.xl,
    borderWidth: 1,
    borderColor: colors['hairline-soft'],
    shadow: shadows.mockup.css,
  },

  /** Template thumbnail card. */
  'template-card': {
    backgroundColor: colors.canvas,
    rounded: rounded.xl,
    padding: `${spacing.md}px`,
    borderWidth: 1,
    borderColor: colors.hairline,
  },

  /** FAQ panel item. */
  'faq-accordion-item': {
    backgroundColor: colors.canvas,
    rounded: rounded.md,
    padding: `${spacing.xl}px`,
    borderWidth: 1,
    borderColor: colors.hairline,
  },

  /** Customer logo wordmark cell. */
  'logo-wall-item': {
    backgroundColor: colors.transparent,
    textColor: colors.steel,
    typography: typography['body-md-medium'],
    padding: `${spacing.lg}px`,
  },

  /** Industry-vertical tile. */
  'industry-tile': {
    backgroundColor: colors.canvas,
    rounded: rounded.xl,
    padding: `${spacing.xl}px`,
    borderWidth: 1,
    borderColor: colors['hairline-soft'],
  },

  /** Review/rating badge in the footer. */
  'capterra-badge': {
    backgroundColor: colors.canvas,
    textColor: colors.ink,
    typography: typography.caption,
    rounded: rounded.md,
    padding: `${spacing.sm}px ${spacing.md}px`,
    borderWidth: 1,
    borderColor: colors.hairline,
  },

  /** App store / Google Play download pill. */
  'app-store-badge': {
    backgroundColor: colors.canvas,
    textColor: colors.primary,
    typography: typography['caption-bold'],
    rounded: rounded.md,
    padding: `${spacing.sm}px ${spacing.md}px`,
  },

  // ── Navigation & Footer ───────────────────────────────────────────────────

  /** Sticky white top nav — height ~64px. */
  'top-nav': {
    backgroundColor: colors.canvas,
    textColor: colors.ink,
    height: 64,
  },

  /** Multi-column dark footer. */
  'footer-region': {
    backgroundColor: colors['footer-bg'],
    textColor: colors['on-dark'],
    typography: typography['body-sm'],
    padding: `${spacing.section}px ${spacing.xxl}px`,
  },

  /** Individual link in the footer. */
  'footer-link': {
    backgroundColor: colors.transparent,
    textColor: colors['on-dark-muted'],
    typography: typography['body-sm'],
    padding: `${spacing.xxs}px 0`,
  },
} satisfies Record<string, ComponentToken>;

export type ComponentName = keyof typeof components;

/**
 * A component token flattened into CSS property names, ready to spread onto a
 * React `style` prop (or any CSS-in-JS target).
 */
export type WebComponentStyle = {
  backgroundColor: string;
  color: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: FontWeight;
  lineHeight?: number;
  letterSpacing?: number;
  borderRadius?: number;
  padding?: string;
  height?: number;
  border?: string;
  boxShadow?: string;
  textDecoration?: string;
};

/**
 * Flatten a component token into a web-ready style object. Typography fields are
 * inlined so the result can be spread straight onto a React element.
 */
export function componentStyle(name: ComponentName): WebComponentStyle {
  const token: ComponentToken = components[name];
  const style: WebComponentStyle = {
    backgroundColor: token.backgroundColor ?? colors.transparent,
    color: token.textColor ?? colors.ink,
  };

  if (token.typography) {
    style.fontFamily = token.typography.fontFamily;
    style.fontSize = token.typography.fontSize;
    style.fontWeight = token.typography.fontWeight;
    style.lineHeight = token.typography.lineHeight;
    style.letterSpacing = token.typography.letterSpacing;
  }
  if (token.rounded !== undefined) style.borderRadius = token.rounded;
  if (token.padding !== undefined) style.padding = token.padding;
  if (token.height !== undefined) style.height = token.height;
  if (token.borderWidth) {
    style.border = `${token.borderWidth}px solid ${token.borderColor ?? colors.hairline}`;
  }
  if (token.shadow !== undefined) style.boxShadow = token.shadow;
  if (token.textDecoration !== undefined) style.textDecoration = token.textDecoration;

  return style;
}

// ─────────────────────────────────────────────────────────────────────────────
// CSS custom properties
//
// Mirrored by apps/web/src/app/globals.css so plain CSS can reach the same
// values. Naming: `--color-*`, `--space-*`, `--radius-*`, `--text-*`,
// `--font-*`, `--shadow-*`.
// ─────────────────────────────────────────────────────────────────────────────

export const cssVariables: Record<string, string> = {
  ...Object.fromEntries(Object.entries(colors).map(([name, value]) => [`--color-${name}`, value])),
  ...Object.fromEntries(
    Object.entries(spacing).map(([name, value]) => [`--space-${name}`, `${value}px`]),
  ),
  ...Object.fromEntries(
    Object.entries(rounded).map(([name, value]) => [`--radius-${name}`, `${value}px`]),
  ),
  ...Object.fromEntries(
    Object.entries(typography).map(([name, value]) => [`--text-${name}-size`, `${value.fontSize}px`]),
  ),
  '--font-display': fontStacks.display,
  '--font-sans': fontStacks.sans,
  '--shadow-none': shadows.none.css,
  '--shadow-subtle': shadows.subtle.css,
  '--shadow-card': shadows.card.css,
  '--shadow-mockup': shadows.mockup.css,
  '--shadow-modal': shadows.modal.css,
  '--layout-max-width': `${layout.maxContentWidth}px`,
};

// ─────────────────────────────────────────────────────────────────────────────
// Tokens object — every token group in one place
// ─────────────────────────────────────────────────────────────────────────────

export const tokens = {
  colors,
  typography,
  fontFamily,
  fontStacks,
  fontSubstitutes,
  rounded,
  spacing,
  layout,
  breakpoints,
  shadows,
  elevation,
  components,
  featureCardCycle,
  cssVariables,
} as const;

export type Tokens = typeof tokens;

export default tokens;
