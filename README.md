# NEXA

NEXA is a web and mobile app for personal planning and team coordination. Its target scope covers account management, teams, notifications and RSVP, calendars, schedules, todos, reusable templates, and countdown reminders. See [AGENTS.md](./AGENTS.md) for the concise feature requirements and implementation guidance.

## Project status

The repository is currently a starter scaffold: the web and mobile apps demonstrate API health checks, and the API includes health plus placeholder authentication and user endpoints. The feature list describes the intended product scope; it does not imply that every feature is implemented.

## Tech stack

| Workspace | Purpose | Technology |
|---|---|---|
| `apps/web` | Web client | Next.js, React, TypeScript |
| `apps/mobile` | Mobile client | Expo, React Native, TypeScript |
| `apps/api` | HTTP API | NestJS, Fastify, TypeScript |
| `packages/types` | Shared domain and API types | TypeScript |
| `packages/validation` | Shared input schemas | Zod |
| `packages/api-client` | Typed API client | Fetch |
| `packages/design-tokens` | Shared UI tokens | TypeScript |

The workspace uses pnpm and Turborepo. `DESIGN.md` and `packages/design-tokens` define the current shared visual system.

## Repository layout

```text
apps/
  api/                 NestJS API
  mobile/              Expo / React Native app
  web/                 Next.js app
packages/
  api-client/          Shared API client
  design-tokens/       Shared design tokens
  types/               Shared TypeScript types
  validation/          Shared Zod schemas
docs/                  Project documentation
```

## Prerequisites

- Node.js 20 or later
- pnpm 10 or later

## Quick start

```bash
pnpm install
```

Copy the example environment files if you need to override local defaults:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env.local
Copy-Item apps/mobile/.env.example apps/mobile/.env
```

Start all apps and packages in development mode:

```bash
pnpm dev
```

The web app is at `http://localhost:3000`; the API base URL is `http://localhost:4000/api/v1` and its health endpoint is `/health`.

## Development commands

| Command | Description |
|---|---|
| `pnpm dev` | Start all workspace development servers |
| `pnpm dev:web` | Start the API and web app |
| `pnpm dev:app` | Start the API and mobile app |
| `pnpm build` | Build all workspaces |
| `pnpm lint` | Lint supported workspaces |
| `pnpm typecheck` | Type-check all workspaces |
| `pnpm test` | Run available workspace tests |
| `pnpm format` | Format TypeScript, JavaScript, JSON, and Markdown files |

## Environment variables

See each app's `.env.example` for defaults:

| Variable | Used by | Default |
|---|---|---|
| `PORT` | API | `4000` |
| `CORS_ORIGIN` | API | `http://localhost:3000` |
| `NEXT_PUBLIC_API_URL` | Web | `http://localhost:4000/api/v1` |
| `EXPO_PUBLIC_API_URL` | Mobile | `http://localhost:4000/api/v1` |
