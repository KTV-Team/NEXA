# NEXA

NEXA is a personal notification and friend-management mobile application for Android and iOS. Users will manage friendships, create notifications for themselves or existing friends, send immediately or configure scheduled/recurring delivery, and manage received items in an in-app inbox. Both mobile platforms use one shared backend. Notifications must work while the app is open, in the background (including a locked screen), and closed: active clients receive realtime inbox updates, and native Android/iOS push provides system alerts when backgrounded or closed.

This is the confirmed direction, not a list of shipped features. Web applications, developer notification platforms, customer API keys, dashboards, integrations, and external channels such as email, Web Push, SMS, Telegram, and Discord are outside the current MVP. Native Android/iOS push for NEXA users is an approved MVP requirement, not one of those exclusions.

## Documentation authority

| Document                                                       | Responsibility                        |
| -------------------------------------------------------------- | ------------------------------------- |
| [AGENTS.md](AGENTS.md)                                         | Engineering and coding-agent rules    |
| [App functions and screens](docs/app-functions-and-screens.md) | Confirmed MVP function/screen summary |
| [Git rules](docs/commit-rules.md)                              | Commit, branch, and merge conventions |
| [Mobile guide](apps/mobile/README.md)                          | Mobile setup and build limitations    |

Product requirements come only from the user-supplied task “Audit and Align Project Documentation with the Confirmed Notification App Product Scope” and subsequent explicit user confirmations, including notification support in open, background and closed states. The function/screen summary is a concise reference; source code establishes implementation status. HTML samples and visual references do not add features or business rules.

## Current implementation

Product status audited on 2026-10-06; source organization updated on 2026-10-07. The repository is an early scaffold, not production-ready. The source refactor colocates mobile screens with their feature code and splits shared packages by responsibility; it does not add product capabilities.

- Mobile has native login/register forms, shared validation, session restoration/refresh handling, protected routes, local logout, and SecureStore persistence. The authenticated landing only displays account/session information.
- The API has health, authentication stubs, and in-memory user endpoints. Login does not verify credentials; registration is missing; authentication guards and ownership checks are missing.
- The shared Fetch client expects a success/error envelope; API routes return raw data. Mobile authentication therefore does not work end to end against the current backend.
- Friends, notifications, inbox, scheduling, recurrence, realtime, and native push have no implementation evidence. No tracked database schema, migration, scheduler, or OS push integration was found.
- `apps/web` is retained historical scaffold, outside current scope. Expo browser preview is a development aid, not a supported web product.

## Required behavior across app states

These are requirements, not implemented capabilities:

| App state                | Required behavior                                                                                                                                               |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Open/foreground          | Update inbox and unread count automatically; reconcile realtime and any push received for the same item without duplicates.                                     |
| Background/locked screen | Backend continues immediate/scheduled/recurring processing and inbox persistence; native push supplies system alerts without requiring the app to keep running. |
| Closed/terminated        | Backend processing continues; the OS can show native push. Tapping launches NEXA, restores/requests authentication, and opens an authorized relevant target.    |

Inbox persistence is required regardless of push availability. On resume/reopen, fetch missed history and authoritative unread state. Permission denial, offline devices, OS restrictions and Android Force stop affect alert delivery; they must not lose backend inbox history. Provider acceptance is not proof of display or reading. Native push transport/provider, retry/expiry, presentation and privacy policies still need design decisions; the requirement to support all three states is already confirmed. See the [app function and screen summary](docs/app-functions-and-screens.md).

## Stack and repository

| Path                     | Verified responsibility and technology                                              |
| ------------------------ | ----------------------------------------------------------------------------------- |
| `apps/mobile`            | Expo 57, React Native 0.86, React 19, TypeScript, Expo Router                       |
| `apps/mobile/src`        | Mobile screens/feature code and adjacent component style modules; tests live under `apps/mobile/tests` |
| `apps/api`               | NestJS 11, Fastify adapter, TypeScript; shared Android/iOS HTTP backend             |
| `apps/web`               | Retained Next.js 15 scaffold; out of MVP scope                                      |
| `packages/types`         | Shared TypeScript DTOs and response types split by domain                           |
| `packages/validation`    | Shared Zod 3 boundary schemas split by domain                                       |
| `packages/api-client`    | Shared Fetch transport with endpoint groups                                         |
| `packages/design-tokens` | Shared visual tokens and mobile typography                                          |
| `docs`                   | App function/screen summary and Git commit rules                                    |
| `miro/DESIGN.md`         | Historical visual reference                                                         |

pnpm/Turborepo remain the foundation. [DESIGN.md](DESIGN.md) supplies existing visual primitives; its Miro marketing examples do not define NEXA features. No database, broker, or push provider has been selected by this audit.

## Local development

Requirements from the root manifest: Node.js >=20 and pnpm >=10; the pinned package manager is `pnpm@10.29.3`. Native Android builds require an Android development environment; local iOS builds require macOS/Xcode. This audit did not install dependencies or validate native toolchains.

From the repository root:

```powershell
pnpm install
Copy-Item apps/mobile/.env.example apps/mobile/.env
pnpm dev:app
```

`dev:app` targets `@nexa/api` and `@nexa/mobile`. Configure the mobile URL before starting Metro: the example uses `localhost`, which must be changed for an Android emulator or physical device. Without this variable, mobile defaults to `10.0.2.2` on Android and `localhost` elsewhere.

The API listens on `0.0.0.0:4000`, uses base path `/api/v1`, and exposes health at `http://localhost:4000/api/v1/health`. Its `.env.example` is a reference; there is no dotenv/ConfigModule loader in API bootstrap. Supply overrides through the process environment, for example in a separate PowerShell terminal:

```powershell
$env:PORT = '4000'
$env:CORS_ORIGIN = 'http://localhost:8081'
pnpm --filter @nexa/api dev
```

When starting API and mobile separately, run `pnpm --filter @nexa/mobile dev` in another terminal. HTTP health being reachable does not prove auth or other product features work.

## Environment variables

| Variable              | Consumer                | Default / requirement                                                           |
| --------------------- | ----------------------- | ------------------------------------------------------------------------------- |
| `PORT`                | API process             | `4000`                                                                          |
| `CORS_ORIGIN`         | API process             | `http://localhost:3000`; set to actual origin for optional Expo browser preview |
| `EXPO_PUBLIC_API_URL` | Mobile                  | Full URL including `/api/v1`; example `http://localhost:4000/api/v1`            |
| `NODE_ENV`            | API example             | `development` in example; no product-specific behavior verified                 |
| `NEXT_PUBLIC_API_URL` | Historical web scaffold | `http://localhost:4000/api/v1`; not required for mobile MVP                     |

For Android emulator use `http://10.0.2.2:4000/api/v1`; for iOS simulator use `http://localhost:4000/api/v1`; for physical devices use the reachable API machine's LAN address. Restart Metro after URL changes. `EXPO_PUBLIC_*` values are bundled into the client and must not contain secrets. Release API URL and deployment environment remain to be defined.

## Testing and build commands

The following scripts exist; existence is not evidence that all checks pass:

| Command                                                  | Purpose / limitation                                                                   |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `pnpm dev:app`                                           | API + mobile development                                                               |
| `pnpm --filter @nexa/mobile typecheck`                   | Mobile TypeScript check                                                                |
| `pnpm --filter @nexa/mobile lint`                        | Mobile ESLint                                                                          |
| `pnpm --filter @nexa/mobile test`                        | Vitest auth/transport/session tests under `apps/mobile/tests`                         |
| `pnpm --filter @nexa/mobile build`                       | Expo bundle export; includes browser output under current config, not a signed APK/IPA |
| `pnpm --filter @nexa/mobile android`                     | Local Android native build/run                                                         |
| `pnpm --filter @nexa/mobile ios`                         | Local iOS native build/run on macOS                                                    |
| `pnpm --filter @nexa/api typecheck`                      | API TypeScript check                                                                   |
| `pnpm --filter @nexa/api build`                          | Nest build                                                                             |
| `pnpm --filter @nexa/api start`                          | Start compiled backend after build; still a stub                                       |
| `pnpm build`, `pnpm typecheck`, `pnpm test`, `pnpm lint` | Workspace-wide commands; may include historical web or incomplete checks               |

Root `pnpm dev` includes the retained web workspace; use `dev:app` for current scope. `dev:web` remains a historical script. API Jest discovers `apps/api/tests/**/*.spec.ts`; no API spec tests currently exist. API lint uses ESLint without applying fixes, while shared package lint scripts are placeholders. There is no tracked CI pipeline or backend deployment configuration. EAS profiles exist, but signing, native runtime testing, backend integration, and store release are unverified.
