import { colors, componentStyle, spacing, typography, type ComponentName } from '@nexa/design-tokens';
import { createApiClient } from '@nexa/api-client';
import type { HealthStatus } from '@nexa/types';

// Demonstrate server-side API call and design token usage
async function getHealth(): Promise<HealthStatus | null> {
  try {
    const client = createApiClient({
      baseUrl: process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1',
    });
    return await client.health.check();
  } catch {
    return null;
  }
}

const navLinks = ['Product', 'Solutions', 'Resources', 'Pricing', 'Customers'] as const;

/** Narrows the component union to the six saturated feature-card variants. */
type FeatureCardName = Extract<ComponentName, `feature-card-${string}`>;

// Saturated feature cards cycle pink → teal → lavender (never the same colour twice in a row).
const featureCards: ReadonlyArray<{
  variant: FeatureCardName;
  kicker: string;
  title: string;
  body: string;
  snippet: string;
}> = [
  {
    variant: 'feature-card-pink',
    kicker: 'Tokens',
    title: 'One source of truth',
    body: 'Every colour, radius, and type ramp from DESIGN.md ships as a typed token.',
    snippet: "colors['brand-pink'] → #ff4d8b",
  },
  {
    variant: 'feature-card-teal',
    kicker: 'Platforms',
    title: 'Web and native',
    body: 'The same token package drives CSS-in-JS on web and StyleSheet on React Native.',
    snippet: 'mobileTypography(\'display-lg\')',
  },
  {
    variant: 'feature-card-lavender',
    kicker: 'Components',
    title: 'Recipes, not guesses',
    body: 'Buttons, cards, inputs, and pills carry the spec values straight from the design doc.',
    snippet: "componentStyle('button-primary')",
  },
];

const footerColumns: ReadonlyArray<{ heading: string; links: ReadonlyArray<{ label: string; href: string }> }> = [
  {
    heading: 'Stack',
    links: [
      { label: 'Next.js 15', href: 'https://nextjs.org/docs' },
      { label: 'Turborepo', href: 'https://turborepo.dev/docs' },
      { label: 'React Native', href: 'https://reactnative.dev/docs/getting-started' },
    ],
  },
  {
    heading: 'Packages',
    links: [
      { label: 'design-tokens', href: 'https://github.com' },
      { label: 'api-client', href: 'https://github.com' },
      { label: 'validation', href: 'https://github.com' },
    ],
  },
  {
    heading: 'API',
    links: [
      { label: 'Health endpoint', href: 'http://localhost:4000/api/v1/health' },
      { label: 'localhost:4000', href: 'http://localhost:4000/api/v1' },
    ],
  },
  {
    heading: 'Design',
    links: [{ label: 'DESIGN.md', href: 'https://clay.com' }],
  },
];

function TopNav() {
  return (
    <header
      style={{
        ...componentStyle('top-nav'),
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <div
        className="nx-container"
        style={{ display: 'flex', alignItems: 'center', gap: spacing.lg, height: '100%' }}
      >
        <span style={{ ...typography['title-md'], color: colors.ink }}>NEXA</span>

        <nav
          style={{
            display: 'flex',
            flex: 1,
            gap: spacing.lg,
            marginLeft: spacing.lg,
            flexWrap: 'wrap',
          }}
        >
          {navLinks.map((link) => (
            <a
              key={link}
              href="#status"
              style={{ ...typography['nav-link'], color: colors.ink, textDecoration: 'none' }}
            >
              {link}
            </a>
          ))}
        </nav>

        <a
          href="#status"
          style={{ ...typography.button, color: colors.ink, textDecoration: 'none' }}
        >
          Sign in
        </a>
        <a href="#status" style={{ ...componentStyle('button-primary'), textDecoration: 'none' }}>
          Try free
        </a>
      </div>
    </header>
  );
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      style={{
        ...componentStyle('badge-pill'),
        ...typography['caption-uppercase'],
        color: ok ? colors.success : colors.error,
      }}
    >
      {label}
    </span>
  );
}

function HealthCard({ health }: { health: HealthStatus | null }) {
  const ok = health?.status === 'ok';

  return (
    <div
      id="status"
      style={{
        ...componentStyle('product-mockup-card'),
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.md,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ ...typography['title-md'], color: colors.ink }}>API Status</h2>
        <StatusPill ok={ok} label={ok ? 'Live' : 'Offline'} />
      </div>

      {health ? (
        <dl style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: spacing.md }}>
            <dt style={{ ...typography['body-sm'], color: colors.muted }}>Status</dt>
            <dd
              style={{
                ...typography['body-sm'],
                color: ok ? colors.success : colors.error,
                fontWeight: '600',
              }}
            >
              {health.status}
            </dd>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: spacing.md }}>
            <dt style={{ ...typography['body-sm'], color: colors.muted }}>Version</dt>
            <dd style={{ ...typography['body-sm'], color: colors.ink }}>{health.version}</dd>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: spacing.md }}>
            <dt style={{ ...typography['body-sm'], color: colors.muted }}>Checked</dt>
            <dd style={{ ...typography['body-sm'], color: colors.ink }}>
              {new Date(health.timestamp).toLocaleTimeString()}
            </dd>
          </div>
        </dl>
      ) : (
        <p style={{ ...typography['body-sm'], color: colors.warning }}>
          API not reachable — start it with <code>pnpm dev</code>
        </p>
      )}

      <p style={{ ...typography.caption, color: colors['muted-soft'] }}>
        GET http://localhost:4000/api/v1/health
      </p>
    </div>
  );
}

function FeatureCard({
  variant,
  kicker,
  title,
  body,
  snippet,
}: {
  variant: FeatureCardName;
  kicker: string;
  title: string;
  body: string;
  snippet: string;
}) {
  const card = componentStyle(variant);

  return (
    <article
      style={{
        ...card,
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.md,
        minHeight: 240,
      }}
    >
      <span style={{ ...typography['caption-uppercase'], color: card.color, opacity: 0.7 }}>
        {kicker}
      </span>
      <h3 style={{ ...typography['title-md'], color: card.color }}>{title}</h3>
      <p style={{ ...typography['body-sm'], color: card.color, opacity: 0.85 }}>{body}</p>
      <code
        style={{
          ...typography.caption,
          color: card.color,
          background: colors.transparent,
          borderRadius: 0,
          padding: 0,
          marginTop: 'auto',
          opacity: 0.8,
        }}
      >
        {snippet}
      </code>
    </article>
  );
}

export default async function HomePage() {
  const health = await getHealth();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.canvas, color: colors.body }}>
      <TopNav />

      <main>
        {/* Hero band — {component.hero-band} on the cream canvas. The band padding is
            left to .nx-section so the 96px rhythm collapses to 48px on mobile. */}
        <section
          className="nx-section"
          style={{ ...componentStyle('hero-band'), padding: undefined }}
        >
          <div
            className="nx-container"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: spacing.xxl,
              alignItems: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: spacing.lg,
              }}
            >
              <span
                style={{
                  ...componentStyle('badge-pill'),
                  ...typography['caption-uppercase'],
                }}
              >
                Monorepo starter
              </span>
              <h1
                style={{
                  ...typography['display-xl'],
                  fontSize: 'clamp(36px, 6vw, 72px)',
                  color: colors.ink,
                }}
              >
                NEXA
              </h1>
              <p style={{ ...typography['body-md'], color: colors.body, maxWidth: 520 }}>
                Next.js, Expo, and NestJS sharing one typed design-token package — a warm cream
                canvas with saturated feature cards and no dark footer.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm }}>
                <a
                  href="#status"
                  style={{ ...componentStyle('button-primary'), textDecoration: 'none' }}
                >
                  Check API status
                </a>
                <a
                  href="https://turborepo.dev/docs"
                  style={{ ...componentStyle('button-secondary'), textDecoration: 'none' }}
                >
                  Turborepo docs
                </a>
              </div>
            </div>

            <HealthCard health={health} />
          </div>
        </section>

        {/* Feature grid — 3-up on desktop, 2-up on tablet, 1-up on mobile. */}
        <section className="nx-section" style={{ backgroundColor: colors.canvas }}>
          <div className="nx-container" style={{ display: 'flex', flexDirection: 'column', gap: spacing.xl }}>
            <h2 style={{ ...typography['display-md'], color: colors.ink }}>
              Built on one design system
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: spacing.lg,
              }}
            >
              {featureCards.map((card) => (
                <FeatureCard key={card.variant} {...card} />
              ))}
            </div>
          </div>
        </section>

        {/* CTA band — stays warm-light, rounded xl, display-md head. */}
        <section style={{ backgroundColor: colors.canvas, paddingBottom: spacing.section }}>
          <div className="nx-container">
            <div
              style={{
                ...componentStyle('cta-band-illustrated'),
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: spacing.lg,
                padding: 'clamp(40px, 8vw, 80px)',
              }}
            >
              <h2 style={{ ...typography['display-md'], color: colors.ink }}>
                Turn your growth ideas into reality today
              </h2>
              <p style={{ ...typography['body-md'], color: colors.body, maxWidth: 620 }}>
                Tokens, types, and validation are already wired across web, mobile, and API. Start
                the workspace and build the next screen on-system.
              </p>
              <a
                href="#status"
                style={{ ...componentStyle('button-primary'), textDecoration: 'none' }}
              >
                Check API status
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer — cream-tinted by design, never dark. */}
      <footer style={componentStyle('footer')}>
        <div className="nx-container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: spacing.xl,
            }}
          >
            {footerColumns.map((column) => (
              <div key={column.heading} style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                <span style={{ ...typography['caption-uppercase'], color: colors.muted }}>
                  {column.heading}
                </span>
                {column.links.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    style={{ ...typography['body-sm'], color: colors.body, textDecoration: 'none' }}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            ))}
          </div>

          <p style={{ ...typography['body-sm'], color: colors.muted, marginTop: spacing.xxl }}>
            NEXA — built with Turborepo, Next.js, Expo, and NestJS.
          </p>
        </div>
      </footer>
    </div>
  );
}
