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
| `packages/design-tokens` | Shared platform-agnostic design tokens |

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

Platform-agnostic design primitives.

```ts
import { colors, spacing, fontSize, borderRadius } from '@nexa/design-tokens';

// Web (inline styles / CSS-in-JS)
const style = {
  color: colors.primary[500],
  padding: spacing[4],
};

// React Native (StyleSheet)
const styles = StyleSheet.create({
  text: { color: colors.primary[500], fontSize: fontSize.base },
});
```

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
