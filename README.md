# NEXA Monorepo

A scalable monorepo built with **Turborepo**, **pnpm workspaces**, and **TypeScript**.

## Stack

| App / Package | Technology |
|---|---|
| `apps/web` | Next.js 15 + React 19 |
| `apps/mobile` | Expo 53 + React Native 0.79 |
| `apps/api` | NestJS 11 + Fastify |
| `packages/types` | Shared TypeScript types |
| `packages/api-client` | Shared fetch-based API client |
| `packages/validation` | Shared Zod validation schemas |
| `packages/design-tokens` | Shared platform-agnostic design tokens (the [`DESIGN.md`](./DESIGN.md) system) |

## Repository structure

```
nexa/
├── apps/
│   ├── web/          # Next.js 15 (port 3000)
│   ├── mobile/       # Expo / React Native
│   └── api/          # NestJS + Fastify (port 4000)
│
├── packages/
│   ├── types/        # Shared TypeScript types
│   ├── api-client/   # Shared API client (fetch-based)
│   ├── validation/   # Shared Zod validation schemas
│   └── design-tokens/# Shared platform-agnostic design tokens
│
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.json
└── README.md
```

## Prerequisites

- **Node.js** ≥ 20
- **pnpm** ≥ 10 — install with `npm install -g pnpm`

## Quick start

```bash
# 1. Install all dependencies
pnpm install

# 2. Copy environment files (optional for local dev)
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env

# 3. Start everything in development mode
pnpm dev
```

This starts:
- **Web** → http://localhost:3000
- **API** → http://localhost:4000/api/v1

## Development commands

| Command | Description |
|---|---|
| `pnpm dev` | Start all apps in watch mode |
| `pnpm build` | Build all apps and packages |
| `pnpm lint` | Lint all workspaces |
| `pnpm typecheck` | Type-check all workspaces |
| `pnpm test` | Run all tests |
| `pnpm format` | Format all files with Prettier |

## Documentation

| Document | Covers |
|---|---|
| [`INSTRUCTIONS.md`](./INSTRUCTIONS.md) | Feature roadmap (F1–F6), data models, API endpoints, testing strategy |
| [`DESIGN.md`](./DESIGN.md) | The Clay-derived design system behind `@nexa/design-tokens` |
| [`docs/ui-demo/`](./docs/ui-demo/README.md) | **UI/UX prototype** — clickable HTML screens for every feature on both surfaces, the review artefact for the interface freeze |
| [`docs/shared-code.md`](./docs/shared-code.md) | `@nexa/utils` — what shared runtime code exists, what belongs in it, what does not |
| [`docs/coding-rules.md`](./docs/coding-rules.md) | ESLint configuration, styling rules, naming, and when shared code is **required** |

### UI/UX prototype

The interface is prototyped end-to-end before implementation:

```bash
# open the gallery (no server, no build step)
start docs/ui-demo/index.html

# re-render every screen and check for console errors / horizontal overflow
node docs/ui-demo/tools/cdp-check.mjs
node docs/ui-demo/tools/check-links.mjs
```

Screenshots land in `docs/ui-demo/.shots/`. Feature coverage and the
prototype → production mapping are documented in
[`docs/ui-demo/README.md`](./docs/ui-demo/README.md); the per-screen contract is
[`docs/ui-demo/BUILD-SPEC.md`](./docs/ui-demo/BUILD-SPEC.md).

### Running a single app

```bash
# Web only
pnpm dev --filter @nexa/web

# API only
pnpm dev --filter @nexa/api

# Mobile only
pnpm dev --filter @nexa/mobile

# A specific package + its dependents
pnpm build --filter @nexa/api-client...
```

## Packages

### `@nexa/types`

Pure TypeScript types shared across all apps. No runtime dependencies.

```ts
import type { User, AuthResponse, ApiResponse } from '@nexa/types';
```

### `@nexa/api-client`

Fetch-based HTTP client with full TypeScript types.

```ts
import { createApiClient } from '@nexa/api-client';

const client = createApiClient({
  baseUrl: 'http://localhost:4000/api/v1',
  getAccessToken: () => localStorage.getItem('token'),
  onUnauthorized: () => router.push('/login'),
});

const health = await client.health.check();
const me = await client.users.me();
```

### `@nexa/validation`

Zod schemas for shared form and API input validation.

```ts
import { loginSchema } from '@nexa/validation';

const result = loginSchema.safeParse({ email, password });
if (!result.success) {
  console.log(result.error.flatten());
}
```

### `@nexa/design-tokens`

The single source of truth for the interface described in [`DESIGN.md`](./DESIGN.md): cream canvas,
saturated feature cards, rounded display type, no heavy shadows. Token names mirror the design doc,
so a `{colors.brand-pink}` reference resolves to `colors['brand-pink']` in code.

```ts
import {
  colors,
  typography,
  rounded,
  spacing,
  mobileTypography,
  componentStyle,
} from '@nexa/design-tokens';

// Web — component recipes resolve to ready-to-spread style objects
const button = componentStyle('button-primary');
const heading = { ...typography['display-lg'], color: colors.ink };

// React Native — typography resolves to StyleSheet values (line-height in points)
const styles = StyleSheet.create({
  title: { ...mobileTypography('title-md'), color: colors.ink },
  card: {
    backgroundColor: colors['surface-card'],
    borderRadius: rounded.lg,
    padding: spacing.lg,
  },
});
```

Token groups: `colors`, `typography`, `fontFamily` / `fontStacks`, `rounded`, `spacing`, `layout`,
`breakpoints`, `shadows`, `elevation`, `components` — plus `cssVariables` for plain-CSS consumers.
The web app mirrors the same values as CSS custom properties in `apps/web/src/app/globals.css`.

## Turborepo task graph

```
build
  └─ depends on: ^build (dependencies built first)

dev
  └─ depends on: ^build (packages built before app dev servers)
  └─ persistent: true, cache: false

lint
  └─ depends on: ^lint
  └─ cached: yes

typecheck
  └─ depends on: ^typecheck
  └─ cached: yes

test
  └─ depends on: build
  └─ cached: yes (by inputs)
```

## Adding a new app

```bash
mkdir apps/my-app
cd apps/my-app
# Create package.json with "name": "@nexa/my-app"
# Add to pnpm-workspace.yaml (already covered by apps/* glob)
pnpm install
```

## Adding a new package

```bash
mkdir packages/my-pkg
cd packages/my-pkg
# Create package.json with "name": "@nexa/my-pkg"
pnpm install
```

Then reference it in any app:

```json
{
  "dependencies": {
    "@nexa/my-pkg": "workspace:*"
  }
}
```

## Turborepo remote caching (optional)

```bash
# Login to Vercel
npx turbo login

# Link to your team
npx turbo link
```

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | API server port |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed CORS origin |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000/api/v1` | API URL for web |
| `EXPO_PUBLIC_API_URL` | `http://localhost:4000/api/v1` | API URL for mobile |
