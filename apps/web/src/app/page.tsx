import { colors, spacing, fontSize } from '@nexa/design-tokens';
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

export default async function HomePage() {
  const health = await getHealth();

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing[6],
        gap: spacing[4],
      }}
    >
      <h1
        style={{
          fontSize: fontSize['4xl'],
          fontWeight: 700,
          color: colors.primary[600],
        }}
      >
        NEXA Web
      </h1>

      <p style={{ fontSize: fontSize.lg, color: colors.gray[600] }}>
        Next.js + Turborepo monorepo
      </p>

      <div
        style={{
          marginTop: spacing[4],
          padding: spacing[4],
          border: `1px solid ${colors.gray[200]}`,
          borderRadius: 8,
          minWidth: 300,
        }}
      >
        <h2
          style={{
            fontSize: fontSize.base,
            fontWeight: 600,
            marginBottom: spacing[2],
          }}
        >
          API Status
        </h2>

        {health ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
            <p>
              Status:{' '}
              <span
                style={{
                  color: health.status === 'ok' ? colors.success.main : colors.error.main,
                  fontWeight: 600,
                }}
              >
                {health.status}
              </span>
            </p>
            <p style={{ color: colors.gray[500], fontSize: fontSize.sm }}>
              Version: {health.version}
            </p>
            <p style={{ color: colors.gray[500], fontSize: fontSize.sm }}>
              Checked: {new Date(health.timestamp).toLocaleTimeString()}
            </p>
          </div>
        ) : (
          <p style={{ color: colors.warning.main }}>
            ⚠ API not reachable — start it with{' '}
            <code
              style={{
                background: colors.gray[100],
                padding: '2px 6px',
                borderRadius: 4,
                fontSize: fontSize.sm,
              }}
            >
              pnpm dev
            </code>
          </p>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          gap: spacing[3],
          marginTop: spacing[4],
          fontSize: fontSize.sm,
          color: colors.gray[500],
        }}
      >
        <a href="http://localhost:4000/api/v1/health" target="_blank" rel="noreferrer">
          API Health ↗
        </a>
        <span>·</span>
        <a href="https://turborepo.dev/docs" target="_blank" rel="noreferrer">
          Turborepo Docs ↗
        </a>
        <span>·</span>
        <a href="https://nextjs.org/docs" target="_blank" rel="noreferrer">
          Next.js Docs ↗
        </a>
      </div>
    </main>
  );
}
