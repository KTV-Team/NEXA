// ─────────────────────────────────────────────────────────────────────────────
// NEXA Design Tokens
//
// Single source of truth for the claymation-meets-data interface described in
// /DESIGN.md ("Clay-design-analysis"). Every token here maps 1:1 to a key in
// that document, using the same names, so a `{colors.brand-pink}` reference in
// the spec resolves to `colors['brand-pink']` in code.
//
// Platform-agnostic: hex/number values only. Web consumers use them directly in
// CSS-in-JS or via `cssVariables`; React Native consumers use `mobileTypography`
// and the spacing/rounded scales in StyleSheet.
//
// System contracts (see DESIGN.md → Do's and Don'ts):
//   · Cream canvas everywhere — never a cool gray floor, never a dark footer.
//   · Display type stays weight 500 with negative letter-spacing, never bolder.
//   · Six saturated feature-card colors, never a seventh, never twice in a row.
//   · Generous radii: 12px buttons/inputs, 16px cards, 24px feature cards.
//   · No heavy shadows — depth comes from saturated color on cream.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Colors
// ─────────────────────────────────────────────────────────────────────────────

export const colors = {
  // Primary — near-black with slight warmth. All primary CTAs, h1/h2 ink type.
  primary: '#0a0a0a',
  'primary-active': '#1f1f1f',
  'primary-disabled': '#e5e5e5',

  // Text
  ink: '#0a0a0a', //           headlines + primary text
  'body-strong': '#1a1a1a', // emphasized body, lead paragraphs
  body: '#3a3a3a', //          default running text
  muted: '#6a6a6a', //         sub-headings, breadcrumbs, footer body
  'muted-soft': '#9a9a9a', //  captions, fine-print

  // Hairlines
  hairline: '#e5e5e5', //      1px borders on cards and inputs
  'hairline-soft': '#f0f0f0',

  // Surface — the cream floor and its warm siblings
  canvas: '#fffaf0', //              default page floor (cream-tinted white)
  'surface-soft': '#faf5e8', //      footer + CTA band
  'surface-card': '#f5f0e0', //      cream feature / testimonial cards
  'surface-strong': '#ebe6d6', //    emphasized cream bands
  'surface-dark': '#0a1a1a', //      rare dark teal-tinted near-black card
  'surface-dark-elevated': '#1a2a2a',

  // On-color text
  'on-primary': '#ffffff', // text on primary buttons + pink/teal feature cards
  'on-dark': '#ffffff',
  'on-dark-soft': '#a0a0a0',

  // Brand — the six-card palette plus illustration accents
  'brand-pink': '#ff4d8b', //     sequencer / outbound feature card
  'brand-teal': '#1a3a3a', //     enterprise + featured pricing tier
  'brand-lavender': '#b8a4ed', // AI-agent products
  'brand-peach': '#ffb084', //    general SaaS warmth
  'brand-ochre': '#e8b94a', //    community / experts
  'brand-mint': '#a4d4c5', //     illustration + badge accent
  'brand-coral': '#ff6b5a', //    highlight accent

  // Semantic
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',

  // Base
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
} as const;

export type ColorName = keyof typeof colors;
export type ColorValue = (typeof colors)[ColorName];

/** The six feature-card surfaces, in DESIGN.md's recommended cycle order. */
export const featureCardCycle = [
  'brand-pink',
  'brand-teal',
  'brand-lavender',
  'brand-peach',
  'brand-ochre',
  'surface-card',
] as const satisfies readonly ColorName[];

// ─────────────────────────────────────────────────────────────────────────────
// Typography
//
// Display voice is Plain Black (custom rounded display face) at weight 500 with
// negative letter-spacing; everything else is Inter. Mixing the two is a system
// violation — display tokens are the only ones that use the display stack.
// ─────────────────────────────────────────────────────────────────────────────

/** Font family stacks as ordered arrays (React Native friendly). */
export const fontFamily = {
  display: [
    'Plain Black',
    'Inter',
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'Roboto',
    'sans-serif',
  ],
  sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
  mono: ['JetBrains Mono', 'Consolas', 'monospace'],
} as const;

const cssFontStack = (families: readonly string[]): string =>
  families.map((family) => (family.includes(' ') ? `"${family}"` : family)).join(', ');

/** Font family stacks as CSS `font-family` strings (web friendly). */
export const fontStacks = {
  display: cssFontStack(fontFamily.display),
  sans: cssFontStack(fontFamily.sans),
  mono: cssFontStack(fontFamily.mono),
} as const;

/**
 * Plain Black is licensed to Clay and has no public web or native build
 * (DESIGN.md → Known Gaps). Inter at weight 500 with negative letter-spacing is
 * the documented substitute; browsers get it for free via the fallback stack,
 * native platforms are resolved explicitly by `mobileTypography`.
 */
export const fontSubstitutes = {
  display: 'Inter',
  sans: 'Inter',
  mono: 'JetBrains Mono',
} as const;

export const typography = {
  'display-xl': {
    fontFamily: fontStacks.display,
    fontSize: 72,
    fontWeight: '500',
    lineHeight: 1,
    letterSpacing: -2.5,
  },
  'display-lg': {
    fontFamily: fontStacks.display,
    fontSize: 56,
    fontWeight: '500',
    lineHeight: 1.05,
    letterSpacing: -2,
  },
  'display-md': {
    fontFamily: fontStacks.display,
    fontSize: 40,
    fontWeight: '500',
    lineHeight: 1.1,
    letterSpacing: -1,
  },
  'display-sm': {
    fontFamily: fontStacks.display,
    fontSize: 32,
    fontWeight: '500',
    lineHeight: 1.15,
    letterSpacing: -0.5,
  },
  'title-lg': {
    fontFamily: fontStacks.sans,
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 1.3,
    letterSpacing: -0.3,
  },
  'title-md': {
    fontFamily: fontStacks.sans,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 1.4,
    letterSpacing: 0,
  },
  'title-sm': {
    fontFamily: fontStacks.sans,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 1.4,
    letterSpacing: 0,
  },
  'body-md': {
    fontFamily: fontStacks.sans,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 1.55,
    letterSpacing: 0,
  },
  'body-sm': {
    fontFamily: fontStacks.sans,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 1.55,
    letterSpacing: 0,
  },
  caption: {
    fontFamily: fontStacks.sans,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 1.4,
    letterSpacing: 0,
  },
  'caption-uppercase': {
    fontFamily: fontStacks.sans,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 1.4,
    letterSpacing: 1.5,
  },
  button: {
    fontFamily: fontStacks.sans,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 1,
    letterSpacing: 0,
  },
  'nav-link': {
    fontFamily: fontStacks.sans,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 1.4,
    letterSpacing: 0,
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
  xs: 6, //     small badges, dropdown items
  sm: 8, //     small buttons, hairline-border accent
  md: 12, //    standard CTA buttons, text inputs
  lg: 16, //    content cards, testimonials, pricing tiers
  xl: 24, //    saturated feature cards
  pill: 9999, // category tabs, badge pills
  full: 9999, // avatars, icon buttons
} as const;

export type RoundedName = keyof typeof rounded;

// ─────────────────────────────────────────────────────────────────────────────
// Spacing — base unit 4px
// ─────────────────────────────────────────────────────────────────────────────

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  section: 96, // vertical rhythm between major editorial bands
} as const;

export type SpacingName = keyof typeof spacing;

// ─────────────────────────────────────────────────────────────────────────────
// Layout
// ─────────────────────────────────────────────────────────────────────────────

export const layout = {
  /** Max content width (~1280px centered) at every breakpoint. */
  maxContentWidth: 1280,
  columns: 12,
  gridGutter: spacing.lg,
  /** Vertical padding between major bands. */
  sectionPadding: spacing.section,
  /** Internal card padding: feature cards / pricing tiers vs. content cards. */
  cardPadding: {
    feature: spacing.xl,
    content: spacing.lg,
  },
} as const;

export const breakpoints = {
  /** < 768px — hamburger nav, 1-up grids, hero stacks. */
  mobile: 0,
  /** 768–1024px — tightened nav, 2-up feature + pricing grids. */
  tablet: 768,
  /** 1024–1440px — full nav, 3-up feature + pricing grids. */
  desktop: 1024,
  /** > 1440px — same as desktop with more breathing room. */
  wide: 1440,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Elevation & depth
//
// The system uses no heavy shadows. Depth comes from the saturated color
// contrast between the cream canvas and the bright feature cards.
// ─────────────────────────────────────────────────────────────────────────────

export const shadows = {
  none: {
    offsetX: 0,
    offsetY: 0,
    blurRadius: 0,
    spreadRadius: 0,
    color: 'transparent',
    css: 'none',
  },
  /** Faint shadow for hover-elevated states (rare). */
  subtle: {
    offsetX: 0,
    offsetY: 1,
    blurRadius: 2,
    spreadRadius: 0,
    color: 'rgba(10, 10, 10, 0.06)',
    css: '0 1px 2px rgba(10, 10, 10, 0.06)',
  },
  /** Slightly deeper variant of the same faint treatment. */
  hover: {
    offsetX: 0,
    offsetY: 4,
    blurRadius: 12,
    spreadRadius: -2,
    color: 'rgba(10, 10, 10, 0.08)',
    css: '0 4px 12px -2px rgba(10, 10, 10, 0.08)',
  },
} as const;

export type ShadowName = keyof typeof shadows;

export const elevation = {
  /** No shadow, no border — body sections, top nav, hero. */
  flat: { boxShadow: shadows.none.css, borderWidth: 0, shadow: shadows.none },
  /** 1px hairline border — inputs, small content cards. */
  hairline: { boxShadow: shadows.none.css, borderWidth: 1, shadow: shadows.none },
  /** Brand pink/teal/lavender/peach/ochre fill — no shadow. */
  saturated: { boxShadow: shadows.none.css, borderWidth: 0, shadow: shadows.none },
  /** surface-card background — no shadow. */
  cream: { boxShadow: shadows.none.css, borderWidth: 0, shadow: shadows.none },
  /** Faint drop shadow — hover-elevated states (rare). */
  subtle: { boxShadow: shadows.subtle.css, borderWidth: 0, shadow: shadows.subtle },
} as const;

export type ElevationName = keyof typeof elevation;

// ─────────────────────────────────────────────────────────────────────────────
// Components
//
// Component recipes exactly as specified in DESIGN.md. Variants (`-active`,
// `-disabled`) are separate entries that only carry the properties they change;
// merge them over their base entry.
// ─────────────────────────────────────────────────────────────────────────────

export type ComponentToken = {
  readonly backgroundColor?: ColorValue;
  readonly textColor?: ColorValue;
  readonly typography?: TypographyStyle;
  readonly rounded?: number;
  /** CSS-ready padding shorthand. */
  readonly padding?: string;
  readonly height?: number;
  readonly borderWidth?: number;
  readonly borderColor?: ColorValue;
  readonly textDecoration?: string;
};

export const components = {
  'button-primary': {
    backgroundColor: colors.primary,
    textColor: colors['on-primary'],
    typography: typography.button,
    rounded: rounded.md,
    padding: '12px 20px',
    height: 44,
  },
  'button-primary-active': {
    backgroundColor: colors['primary-active'],
    textColor: colors['on-primary'],
    rounded: rounded.md,
  },
  'button-primary-disabled': {
    backgroundColor: colors['primary-disabled'],
    textColor: colors.muted,
    rounded: rounded.md,
  },
  'button-secondary': {
    backgroundColor: colors.canvas,
    textColor: colors.ink,
    typography: typography.button,
    rounded: rounded.md,
    padding: '12px 20px',
    height: 44,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  'button-on-color': {
    backgroundColor: colors.canvas,
    textColor: colors.ink,
    typography: typography.button,
    rounded: rounded.md,
    padding: '12px 20px',
    height: 44,
  },
  'button-text-link': {
    backgroundColor: colors.transparent,
    textColor: colors.ink,
    typography: typography.button,
  },
  'text-link': {
    backgroundColor: colors.transparent,
    textColor: colors.ink,
    typography: typography['body-md'],
    textDecoration: 'underline',
  },
  'top-nav': {
    backgroundColor: colors.canvas,
    textColor: colors.ink,
    typography: typography['nav-link'],
    height: 64,
  },
  'hero-band': {
    backgroundColor: colors.canvas,
    textColor: colors.ink,
    typography: typography['display-xl'],
    padding: '96px',
  },
  'hero-illustration-card': {
    backgroundColor: colors['surface-soft'],
    textColor: colors.ink,
    rounded: rounded.xl,
  },
  'feature-card-pink': {
    backgroundColor: colors['brand-pink'],
    textColor: colors['on-primary'],
    typography: typography['title-md'],
    rounded: rounded.xl,
    padding: '32px',
  },
  'feature-card-teal': {
    backgroundColor: colors['brand-teal'],
    textColor: colors['on-dark'],
    typography: typography['title-md'],
    rounded: rounded.xl,
    padding: '32px',
  },
  'feature-card-lavender': {
    backgroundColor: colors['brand-lavender'],
    textColor: colors.ink,
    typography: typography['title-md'],
    rounded: rounded.xl,
    padding: '32px',
  },
  'feature-card-peach': {
    backgroundColor: colors['brand-peach'],
    textColor: colors.ink,
    typography: typography['title-md'],
    rounded: rounded.xl,
    padding: '32px',
  },
  'feature-card-ochre': {
    backgroundColor: colors['brand-ochre'],
    textColor: colors.ink,
    typography: typography['title-md'],
    rounded: rounded.xl,
    padding: '32px',
  },
  'feature-card-cream': {
    backgroundColor: colors['surface-card'],
    textColor: colors.ink,
    typography: typography['title-md'],
    rounded: rounded.xl,
    padding: '32px',
  },
  'product-mockup-card': {
    backgroundColor: colors.canvas,
    textColor: colors.ink,
    typography: typography['title-md'],
    rounded: rounded.lg,
    padding: '24px',
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  'testimonial-card': {
    backgroundColor: colors['surface-card'],
    textColor: colors.ink,
    typography: typography['body-md'],
    rounded: rounded.lg,
    padding: '24px',
  },
  'pricing-tier-card': {
    backgroundColor: colors.canvas,
    textColor: colors.ink,
    typography: typography['title-lg'],
    rounded: rounded.lg,
    padding: '32px',
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  'pricing-tier-card-featured': {
    backgroundColor: colors['brand-teal'],
    textColor: colors['on-dark'],
    typography: typography['title-lg'],
    rounded: rounded.lg,
    padding: '32px',
  },
  'text-input': {
    backgroundColor: colors.canvas,
    textColor: colors.ink,
    typography: typography['body-md'],
    rounded: rounded.md,
    padding: '12px 16px',
    height: 44,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  'text-input-focused': {
    backgroundColor: colors.canvas,
    textColor: colors.ink,
    rounded: rounded.md,
    borderWidth: 1,
    borderColor: colors.ink,
  },
  'category-tab': {
    backgroundColor: colors.transparent,
    textColor: colors.muted,
    typography: typography['nav-link'],
    rounded: rounded.pill,
    padding: '8px 16px',
  },
  'category-tab-active': {
    backgroundColor: colors['surface-card'],
    textColor: colors.ink,
    typography: typography['nav-link'],
    rounded: rounded.pill,
  },
  'badge-pill': {
    backgroundColor: colors['surface-card'],
    textColor: colors.ink,
    typography: typography.caption,
    rounded: rounded.pill,
    padding: '4px 12px',
  },
  'expert-card': {
    backgroundColor: colors.canvas,
    textColor: colors.ink,
    typography: typography['title-md'],
    rounded: rounded.lg,
    padding: '24px',
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  'cta-band-illustrated': {
    backgroundColor: colors['surface-soft'],
    textColor: colors.ink,
    typography: typography['display-md'],
    rounded: rounded.xl,
    padding: '80px',
  },
  footer: {
    backgroundColor: colors['surface-soft'],
    textColor: colors.body,
    typography: typography['body-sm'],
    padding: '80px',
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
  if (token.textDecoration !== undefined) style.textDecoration = token.textDecoration;

  return style;
}

// ─────────────────────────────────────────────────────────────────────────────
// CSS custom properties
//
// Mirrored by apps/web/src/app/globals.css so plain CSS can reach the same
// values. Naming: `--color-*`, `--space-*`, `--radius-*`, `--font-*`, `--shadow-*`.
// ─────────────────────────────────────────────────────────────────────────────

export const cssVariables: Record<string, string> = {
  ...Object.fromEntries(Object.entries(colors).map(([name, value]) => [`--color-${name}`, value])),
  ...Object.fromEntries(Object.entries(spacing).map(([name, value]) => [`--space-${name}`, `${value}px`])),
  ...Object.fromEntries(Object.entries(rounded).map(([name, value]) => [`--radius-${name}`, `${value}px`])),
  ...Object.fromEntries(
    Object.entries(typography).map(([name, value]) => [`--text-${name}-size`, `${value.fontSize}px`]),
  ),
  '--font-display': fontStacks.display,
  '--font-sans': fontStacks.sans,
  '--font-mono': fontStacks.mono,
  '--shadow-none': shadows.none.css,
  '--shadow-subtle': shadows.subtle.css,
  '--shadow-hover': shadows.hover.css,
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
} as const;

export type Tokens = typeof tokens;

export default tokens;
