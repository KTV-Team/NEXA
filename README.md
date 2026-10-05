# NEXA Monorepo

A scalable monorepo built with **Turborepo**, **pnpm workspaces**, and **TypeScript**.

## Stack

| App / Package | Technology |
|---|---|
| `apps/web` | Next.js 15 + React 19 |
| `apps/mobile` | Expo 57 + React Native 0.86 |
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
| `CORS_ORIGIN` | `http://localhost:3000` | Comma-separated allowed web origins |
| `DB_HOST` | `127.0.0.1` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `nexa_dev` | Local database name |
| `DB_USER` / `DB_PASSWORD` | Set locally | Local database credentials |
| `DB_SSL` | `false` | Enable verified TLS for remote PostgreSQL |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000/api/v1` | Web API URL |
| `EXPO_PUBLIC_API_URL` | `http://localhost:4000/api/v1` | Mobile API URL; Android emulator uses `10.0.2.2` |

## PostgreSQL foundation (development)

1. Copy `apps/api/.env.example` to `apps/api/.env` and set a local `DB_PASSWORD`.
2. Start PostgreSQL from the repository root:

   ```powershell
   rtk docker compose --env-file apps/api/.env up -d postgres
   ```

3. Apply the reviewed TypeORM migrations and seed local data:

   ```powershell
   rtk pnpm.cmd --filter @nexa/api db:migration:run
   rtk pnpm.cmd --filter @nexa/api db:seed
   ```

   Set `ALLOW_DEV_SEED=true` and `DEV_SEED_PASSWORD` only in the local API env file before seeding. The seed command rejects production and databases other than local `nexa_dev`/`nexa_test`.

4. Start the API with `rtk pnpm.cmd --filter @nexa/api dev`. The database demo is at `http://localhost:4000/api/v1/dev/demo`; the web view is `/dev/demo`. The mobile home screen displays the same API result in development.

Migration changes are reviewed before applying them. Production uses the compiled `db:migration:run:prod` command as a deployment step; TypeORM schema synchronization and startup migrations stay disabled.

For integration tests, copy `apps/api/.env.test.example` to the ignored `apps/api/.env.test`, set a test password, create a dedicated local `nexa_test` database, then run `rtk pnpm.cmd --filter @nexa/api test:db`. Never point this test configuration at a development or production database.
