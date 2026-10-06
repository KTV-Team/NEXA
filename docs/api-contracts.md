# NEXA API contracts and gaps

Audited 2026-10-06 against controller source and shared Fetch client. Base path: `/api/v1`. These are internal Android/iOS contracts to one backend, not public customer APIs. Existing routes come from source code; proposed capabilities come only from the supplied user task and explicit confirmations. UI samples provide neither API requirements nor contracts. No OpenAPI/generated specification was found; this is manually maintained source-grounded documentation.

## Existing server routes

“Stub” means the route exists, not that product behavior/security is implemented. All non-204 successes below return raw data without the client-required envelope.

| Method/path relative to base | Body/query consumed                                   | Actual return/behavior                                                | Evidence/status                                                                      |
| ---------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| GET `/health`                | None                                                  | Raw `{ status, timestamp, version }`                                  | [HealthController](../apps/api/src/health/health.controller.ts); process health only |
| POST `/auth/login`           | Typed `LoginDto` with email/password; only email used | HTTP 200, raw user/tokens with sample user and fixed token strings    | [AuthController](../apps/api/src/auth/auth.controller.ts); no credential validation  |
| POST `/auth/logout`          | None                                                  | HTTP 204; empty method, no revocation                                 | AuthController stub                                                                  |
| POST `/auth/refresh`         | `{ refreshToken }`                                    | HTTP 200, raw fixed `AuthTokens`; supplied token logged               | AuthController stub; no validation/rotation                                          |
| GET `/users`                 | No search/pagination query consumed                   | Raw data/meta, fixed page 1, limit 20, all sample users, totalPages 1 | [UsersController](../apps/api/src/users/users.controller.ts); not user search        |
| GET `/users/me`              | No authenticated user context                         | First sample `User`                                                   | UsersController stub; no ownership                                                   |
| GET `/users/:id`             | Path id                                               | Sample user; generic Error when absent                                | UsersController stub; no privacy/authorization                                       |
| PATCH `/users/me`            | Optional name/avatarUrl in `UpdateUserDto`            | HTTP 200, mutates first sample for truthy supplied fields             | UsersController stub; no validation/ownership/durability                             |

No `POST /auth/register` controller exists. No friend, inbox, notification, schedule, recurrence, realtime, or native push device-registration routes/events exist. TypeScript annotations do not validate runtime input. Path names do not prove authentication or authorization.

## Existing client expectations, not fulfilled server contracts

Evidence: [ApiClient](../packages/api-client/src/index.ts), [types](../packages/types/src/index.ts), [AuthService](../apps/mobile/src/features/auth/auth-service.ts), [auth handoff](mobile-auth-implementation.md).

- Sends JSON, optional `Authorization: Bearer <accessToken>`, default timeout 15 seconds. Timeout cancellation does not prove the server canceled an operation.
- Non-204 success requires `{ success: true, data: T }`; errors expect `{ success: false, error: { code, message, details? } }` and appropriate HTTP status. HTTP 204 requires no JSON. Current controllers **do not implement** this envelope.
- Auth helpers call login/register/refresh/logout paths above. Registration sends only name/email/password, never confirmation or a client-assigned role.
- User helpers call GET/PATCH `/users/me`, `/users`, and `/users/:id`. List accepts page/limit queries in the client, ignored by the controller; it is not a searchable directory.
- Mobile restore checks saved session shape, refreshes near expiry, fetches current user, clears broken/revoked sessions, and retains saved data for connection retry. Server session validation is absent.
- Mobile schemas normalize name/email and preserve password content; client checks are not API security.

Envelope-only illustration of a **client-required** success, not a current server response:

```text
{ success: true, data: <AuthResponse> }
```

Actual fields come from shared types. Mobile unit tests intentionally reject current raw stub login responses. Even health through the shared client rejects raw health data.

## Planned capabilities with no agreed wire contracts

These are required semantics, **not implemented endpoint names, payloads, schemas, or realtime identifiers**. Approve contracts against [PRD](product-requirements.md) before adding routes/types.

| Capability                        | Required semantics                                                                                                                                                                           | Missing decision/evidence                                                                                                                             |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accounts/profile/settings         | Real registration/credential checking, authenticated current-user access/update, refresh/logout                                                                                              | Registration absent, others stub; fields/recovery/verification unresolved                                                                             |
| User search                       | Approved searchable/public fields and bounded discovery                                                                                                                                      | No search; matching/privacy/pagination unresolved                                                                                                     |
| Requests                          | Send/list incoming/outgoing, accept/reject/cancel with actor/state checks                                                                                                                    | No contracts/types; duplicate/crossed/concurrent policy unresolved                                                                                    |
| Friends/unfriend                  | Owner-scoped accepted list; either participant can unfriend                                                                                                                                  | No contracts/types; retention and permission effects unresolved                                                                                       |
| Immediate notifications           | Self/accepted friend, content constraints, duplicates, persistence result                                                                                                                    | Absent; cardinality/idempotency unresolved                                                                                                            |
| Scheduled notifications           | Distinct creation/due time and observable processing/failure                                                                                                                                 | No scheduler; editing/canceling, overdue/retry, execution-time friendship unresolved                                                                  |
| Recurrence                        | Rule/zone/end, occurrence/progress, series management                                                                                                                                        | Absent; recurrence vocabulary and DST/missed runs unresolved                                                                                          |
| Inbox/history/count               | Recipient-owned paginated history and authoritative unread count                                                                                                                             | Absent; ordering/pagination/count boundaries unresolved                                                                                               |
| Read/unread/mark-all/delete       | Owned mutations with consistent unread state during arrivals                                                                                                                                 | Absent; bulk boundary/deletion retention/tap-to-read unresolved                                                                                       |
| Tap target                        | Resolve the owned persisted item/resource from inbox or native push; check access after session restoration/sign-in on warm/cold launch                                                      | No contract; unavailable/deleted-target and tap-to-read policy unresolved                                                                             |
| Foreground realtime               | Authenticated changes, reconnect/resync, persisted recovery                                                                                                                                  | No transport/routes/event identifiers/guarantees selected                                                                                             |
| Native push registration/delivery | Authenticated device-token registration/update/removal, account binding/rotation/logout; recipient-scoped push attempts for immediate/social/scheduled/recurring items and owned tap targets | Confirmed requirement; no routes/types/provider integration. Provider, multi-device, retry/expiry, permissions/presentation/privacy policy unresolved |

## Native push contract requirements — proposed, not implemented

The requirement to support open/background/closed app states is approved. Wire paths, payload fields, event names and response schemas below are intentionally not invented; no existing API supports them.

- Registration/update/removal must authenticate and bind a device token to the account allowed to receive its alerts. Define rotation, invalid tokens, logout/account switching and multi-device semantics; clients cannot register tokens for another account.
- Backend notification processing must persist inbox state independently of push. Link each push attempt to its logical item/occurrence and device; establish duplicate handling, retry/backoff/expiry and observable submission/failure results. A push retry must not create a new inbox item.
- A push identifies a relevant persisted item/resource, not authority to access it. A tap must restore/request authentication then fetch and authorize the target; support warm/cold launch and unavailable resources. Agree which content may appear on a locked screen.
- Active clients reconcile realtime/push with authoritative history/count and an agreed presentation policy. On reopen/reconnect fetch missed state; permission denial, offline device, OS restriction or invalid token must not remove persisted history.
- Keep lifecycle/status concepts distinct: inbox persisted, push submitted, provider accepted/rejected, OS presentation where observable, and recipient read/unread. Do not expose one misleading delivered flag for all of them.
- Signing/provider credentials stay outside public mobile configuration; configuration names and deployment steps need an approved provider decision. Current .env examples need no new values for this documentation-only task.

Native tests must cover self/friend/social notifications plus due scheduled/recurring occurrences in foreground, background/locked and normal closed states, with permissions granted and connectivity. Also cover denied permission, token rotation/account switch, invalid token, offline expiry/recovery, duplicate signals, and authorized taps after cold start. Force stop is a separately documented platform restriction, not ordinary closed-state delivery.

## Event and processing boundaries

Friend request received, request accepted, friend notification received, scheduled receipt, and recurring receipt are required conceptual events, not existing wire identifiers.

Acceptance may generate an event but is not scheduled work. A due job executes work but is not yet an inbox record. Inbox persistence creates history/read state; realtime signals active clients and does not replace persistence. Native Android/iOS push in background/closed states is a confirmed MVP requirement. It is a separate delivery mechanism whose transport/provider remains undecided; provider acceptance and OS presentation are not read acknowledgement.

Future tests must cover owner/participant access, invalid transitions, duplicates, envelopes, pagination/unread state, due/recurring execution, disconnects, and failures. Stub routes and mocked client tests do not cover these product flows.
