# NEXA architecture and data model

Audited 2026-10-06. [Product requirements](product-requirements.md) define Android/iOS and a shared backend. Native Android/iOS push is confirmed for open/background/closed notification behavior. Requirements come from the supplied user task and explicit confirmations, not UI samples. This separates verified source-code structure from proposed work; this audit implements no infrastructure or schema.

## Verified structure

```text
Android / iOS
  apps/mobile: Expo + React Native + Expo Router
  auth forms -> AuthProvider -> AuthService
  session persistence -> Expo SecureStore (native)
  HTTP -> packages/api-client (Fetch)
             |
             v
  apps/api: NestJS + Fastify, /api/v1
    HealthModule: raw health response
    AuthModule: login/refresh/logout stubs
    UsersModule: two in-memory sample users

Shared: packages/types, validation (Zod), design-tokens
Workspace: pnpm + Turborepo
Retained outside MVP: apps/web (Next.js)
```

Evidence: [mobile layout](../apps/mobile/app/_layout.tsx), [auth service](../apps/mobile/src/features/auth/auth-service.ts), [session storage](../apps/mobile/src/features/auth/session-storage.ts), [Fetch client](../packages/api-client/src/index.ts), [API bootstrap](../apps/api/src/main.ts), and [modules](../apps/api/src/app.module.ts). No unverified database, worker, socket, broker, or OS push path is included.

Mobile sends email/password DTOs and expects access/refresh tokens; these do not prove real JWT/password services. SecureStore stores session data, not passwords; remember-off keeps sessions in memory. Browser preview uses tab sessionStorage for development. The protected landing displays session details, with no inbox/friendship screens.

Backend uses Fastify logging, CORS, port 4000 by default, and listens on all interfaces. There is no ConfigModule/dotenv loader, API validation pipe, auth guard, or response-envelope interceptor in inspected API code. Overrides must reach `process.env`; copying API `.env` alone does not load it. See [API contracts](api-contracts.md) for response mismatch.

## Persistence and security evidence

No tracked database/ORM schema, migrations, durable store, job processor, realtime transport, device-token registration, FCM/APNs integration, or message broker was found. API modules contain only health/auth/users controllers. Users are mutable process-local samples and reset on restart; `/users/me` always selects the first sample. Login does not verify passwords and returns fixed tokens; logout does not revoke anything. Refresh logs its supplied token, a finding to remove during real auth implementation.

These stubs cannot provide production authentication, user ownership, or durable scheduled/recurring delivery. Shared schema presence does not establish server validation. Sample `admin` data does not approve a privileged product role.

## Current types versus required concepts

[Shared types](../packages/types/src/index.ts) define `User`, create/update user DTOs, login/register/token responses, health, and generic pagination/envelopes. [Validation](../packages/validation/src/index.ts) provides auth, profile-update, and page/limit schemas. No friendship/notification/schedule types or database entities exist.

The following is a **conceptual proposal**, not a physical schema, migration, payload, or approved table-per-concept design:

| Required concept              | Minimum information/invariant to resolve                                                      | Current evidence / gap                                                   |
| ----------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Account/session               | Identity, credential storage, permitted profile/settings, authenticated owner, revocation     | DTOs/client session flow only; no durable account store                  |
| Friend request                | Sender/recipient, pending/terminal state, actor/time; one request viewed as incoming/outgoing | Absent; uniqueness, crossed/concurrent transitions, retention unresolved |
| Friendship                    | Accepted pair, permission checks, removal for both participants                               | Absent; may use accepted relationship state rather than another table    |
| Notification intent/recipient | Creator, self/friend recipient, content, creation time, delivery mode                         | Absent; cardinality and permission timing unresolved                     |
| Inbox item                    | Recipient ownership, event/occurrence linkage, persistence time, read/deletion state          | Absent; read state distinct from sender processing                       |
| Scheduled work                | Due instant, processing/retry/recovery state, uniqueness linkage                              | Absent; phone timers are insufficient                                    |
| Recurrence/progress           | Rule, zone/end policy, next/last processing state, occurrence identity                        | Absent; rule/progress may share intent storage if justified              |
| Processing result             | Occurrence/recipient identity, persisted/failure/retry information                            | Absent; prevent duplicate inbox creation independently of realtime retry |

Logical relationship: account -> authored intent -> permitted recipient; immediate/scheduled/recurring occurrence -> recipient-owned inbox item. Requests and accepted friendships authorize friend sending. Inbox persistence is independent from connected-client signals and required native OS push. Define “delivered” explicitly; socket emission alone is not durable delivery.

## Smallest reasonable proposals, not approved changes

1. Preserve the existing backend/modules/workspace. Choose persistence and genuine auth through an approved decision; align server validation/envelopes with existing shared contracts first.
2. Add friendship and notification/inbox behavior within current API structure. Reuse shared types/validation and enforce owner/participant/recipient checks. Separate concepts logically without assuming microservices or one table per noun.
3. Persist due/recurring work and processing state. Evaluate a backend due-work loop using the chosen durable store with safe claim/uniqueness handling. Deployment replicas, load, retry, and restart recovery determine whether a dedicated worker/queue is justified. An in-process timer without durable state cannot satisfy requirements.
4. Choose foreground realtime after lifecycle, auth, hosting, and reconnect needs are agreed. Define signal/history reconciliation; no WebSocket/SSE provider is selected.
5. Implement the confirmed native push requirement after approving its transport/provider design: backend submission, authenticated device registration, permissions, token rotation/invalidation/logout and attempt/failure handling. Native push reaches backgrounded/closed clients through the OS, while active clients keep realtime inbox updates. This confirms the feature, not a specific provider or new dependency.

This selects no Redis, broker, FCM, APNs, WebSockets, SSE, ORM, or database. Record approved choices with rationale and operational implications.

## Required notification paths — design proposal, not implemented

```text
Shared backend: immediate/social event or due scheduled/recurring occurrence
  -> durable recipient inbox item and authoritative unread state
  -> foreground realtime signal -> active Android/iOS UI
  -> selected native push transport -> Android/iOS system alert
                                      (background/locked/closed)

Resume or tap -> authenticate/restore session -> fetch owned item/history
             -> reconcile by item/occurrence identity -> permitted target
```

This is the minimum logical design for the newly confirmed three-state requirement, not the verified architecture diagram above. Backend scheduling and persistence must continue without relying on a mobile socket, JavaScript task, or the sender/recipient app staying alive. Durable inbox state survives missing/failed push. Realtime and push can both refer to the same item; retries must not create extra inbox records or duplicate user alerts.

Additional conceptual data needs, not a table-per-concept mandate:

| Concept                   | Information and invariant to design                                                                                                         | Status                                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Device/token registration | Account-owned device identity, platform, valid push token/provider context, token rotation/invalidation and logout/account-switch lifecycle | No types/routes/storage/integration found; policy and representation undecided                      |
| Push delivery attempt     | Link to recipient inbox item/occurrence and target device, submission/provider result, retry/expiry state and failure details               | Absent; store separately from read state and distinguish provider acceptance from actual OS display |

An intermediary push service or direct platform transport may satisfy the native requirement; selection needs a justified decision. No provider has been chosen and no Redis/broker/new service is required by this document. Keep credentials on the backend/build-signing side; never bundle secrets into EXPO_PUBLIC variables. Registration and removal must authenticate token/account ownership; account switching/logout must prevent alerts for a previous user.

Permission denial, offline/invalid tokens, user/OS notification settings and Android Force stop are operational constraints. Test them and recover history on reopen; do not substitute silent background processing for a system alert or promise that arbitrary background code executes. Push/inbox target resolution must recheck authorization on warm and cold launch. Decisions remain for multi-device fan-out, foreground presentation/sound, lock-screen payload privacy, retry/expiry and invalid-token handling.

## Time, reliability, and permissions

Keep due instants distinct from creation/read state. An unambiguous execution instant plus agreed recurrence zone/rule is a reasonable proposal; UTC storage and DST/local-time rules require approval. Use occurrence/recipient uniqueness and transactional processing suited to the chosen store; guarantees/retry/backoff remain open.

Authenticate and validate at boundaries; distrust client roles/recipients. Define discovery privacy, request transition authorization, and execution-time friendship policy. Scope inbox/history/count to the session owner. Reconnect must not create duplicate inbox records; deleting an item must not silently remove the sender's series.

## Testing and operations

Mobile Vitest covers form/DTO normalization, client envelope/204/timeout, stub rejection, remembered sessions, restore, refresh, and logout using mocked transport/storage. It does not verify live auth, native SecureStore, scheduled delivery, push in any app state, or release readiness. [Auth handoff](mobile-auth-implementation.md) retains historical browser QA with explicit limits.

API has Jest configuration but no tracked spec tests. No tracked CI pipeline or backend deployment configuration was found. [EAS profiles](../apps/mobile/eas.json) exist; hosting, signing, device testing, secrets, recovery, and observability are unverified. API `start` runs compiled output; it is not a deployment plan. Before release, test foreground, background/locked and normal closed/terminated alerts on Android and iOS devices, token rotation/account switching, permission denial, offline recovery, push failure/duplicates and notification taps that cold-start the app. Browser preview is not native push verification. See [roadmap](roadmap.md) verification gates.
