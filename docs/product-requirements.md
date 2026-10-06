# NEXA product requirements

Confirmed scope as of 2026-10-06. Product requirements come only from the user-supplied task “Audit and Align Project Documentation with the Confirmed Notification App Product Scope” and subsequent explicit user confirmations, including notification support in open, background and closed states. HTML samples and visual design references are for UI/UX review only; they cannot add features, define business rules, determine product purpose, or establish implementation status. This document defines requirements, not shipped functionality. Implementation evidence belongs in [architecture](architecture.md), [API contracts](api-contracts.md), and the [roadmap](roadmap.md).

## Vision and users

Help individuals exchange personal reminders with accepted friends and manage their own notifications in one mobile inbox. Target users are individual account holders and friends, not third-party developers or enterprise teams. Supported clients are Android and iOS, sharing the existing backend and contracts. Confirmed on 2026-10-06: notification support covers open/foreground, background/locked-screen, and closed/terminated states. Native push is part of MVP.

## Roles and authorization

- Unauthenticated people use registration/sign-in; access to discovery before sign-in is unresolved and must not default to exposing private data.
- Authenticated users control their own profile/settings, outgoing friend requests, and received inbox items. They may send to themselves or accepted friends.
- Only the intended recipient may accept/reject a pending request; only its sender may cancel it. Either participant may unfriend.
- Recipients may read/unread or delete their own inbox items. This does not grant control over another recipient's data or the sender's schedule.
- Existing `admin/user/guest` types are scaffold types, not approved administrator/guest product features. Clients must not assign privileged roles. Current API stubs do not implement ownership or relationship checks.

## MVP requirements and acceptance criteria

All rows are confirmed target requirements. Most are absent; account UI/session handling is partial.

| ID  | Requirement                        | Acceptance criteria for future implementation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| N01 | Registration, sign-in/out, session | Valid registration creates a real account; invalid/duplicate input is rejected; sign-in checks credentials; protected operations validate session; logout clears local state and applies agreed revocation. Existing email/password forms and access/refresh DTOs are the integration starting point, not proof of backend auth.                                                                                                                                                                                                                                                  |
| N02 | Profile and settings               | Users view/edit only permitted own-account fields. Updates persist through the shared backend on both platforms. Settings beyond existing name/avatar DTOs require agreement.                                                                                                                                                                                                                                                                                                                                                                                                     |
| N03 | User search                        | Signed-in users discover accounts using approved searchable/public fields and bounded results, without exposing private data. Matching fields and pagination remain open.                                                                                                                                                                                                                                                                                                                                                                                                         |
| N04 | Friend requests                    | Send, receive, accept, reject, and cancel pending outgoing requests. UI distinguishes incoming/outgoing; transitions enforce participants, state, and agreed duplicate/conflict handling.                                                                                                                                                                                                                                                                                                                                                                                         |
| N05 | Friendships                        | Acceptance produces a relationship visible in both friend lists; either participant can unfriend. Unrelated users cannot read/mutate another user's relationships.                                                                                                                                                                                                                                                                                                                                                                                                                |
| N06 | Immediate notification             | Create for self or accepted friends; valid immediate processing creates a recipient-owned inbox item. Reject invalid recipients; handle duplicate submissions/delivery under the agreed idempotency policy.                                                                                                                                                                                                                                                                                                                                                                       |
| N07 | Scheduled notification             | Store future execution separately from creation; backend processing creates inbox items when due under agreed retry/execution policy, without needing the sender's phone active.                                                                                                                                                                                                                                                                                                                                                                                                  |
| N08 | Recurring notification             | Store a recurrence definition and execution state; process distinct due occurrences under agreed zone/DST, end/stop, missed-run, and duplicate policies. First delivery does not complete a series.                                                                                                                                                                                                                                                                                                                                                                               |
| N09 | Inbox and history                  | View received items/unread total, mark individual read or unread, mark all read, delete owned items, and paginate history. Count/history stay consistent with concurrent changes and ownership.                                                                                                                                                                                                                                                                                                                                                                                   |
| N10 | Tap navigation                     | Tapping an inbox item or native push opens a relevant authorized mobile target from a warm or cold start, after session restoration/sign-in when necessary; handle deleted/unavailable targets. Whether tapping marks read is unresolved.                                                                                                                                                                                                                                                                                                                                         |
| N11 | Foreground realtime                | Active connected clients receive relevant changes and update inbox/unread views. History is recoverable after disconnect; transport and resynchronization contracts are unselected.                                                                                                                                                                                                                                                                                                                                                                                               |
| N12 | Social/system events               | Friend-request receipt/acceptance, friend notification, scheduled delivery and each recurring occurrence produce recipient-visible inbox items and the applicable alert behavior in all three app states. Keep event persistence, push attempt and read status distinct.                                                                                                                                                                                                                                                                                                          |
| N13 | Native push and all app states     | On Android and iOS, eligible immediate/social/scheduled/recurring items support alerts while backgrounded or closed, including locked-screen behavior under user/OS settings. Implement permission handling, authenticated device-token lifecycle and OS presentation/tap behavior; foreground realtime/push must not duplicate inbox items or user alerts. With notifications allowed and device connected, verify all three normal app states. Denied/offline/restricted/Force-stop cases retain inbox data and resynchronize on reopen rather than claiming guaranteed alerts. |

## Main user flows

1. Register/sign in through existing mobile forms, establish a real backend session, view/edit agreed profile/settings, and sign out. The current backend blocks completing this flow.
2. Search for an account and send a request: outgoing for sender, incoming for recipient. Accept/reject or cancel. Acceptance updates both friend lists and generates an acceptance event for the sender; unfriend removes the active relationship for both.
3. Compose a notification for self or an accepted friend and choose immediate, future, or recurring execution. Validate content/recipient/permissions; save processing information and show the agreed sender status.
4. Backend executes immediate/due work and persists the recipient inbox item independently of the mobile lifecycle. Signal active clients and submit native push under the agreed presentation policy so backgrounded/closed clients receive OS alerts. Offline clients fetch missed history upon reconnect.
5. If a push is tapped, restore or request sign-in, resolve the item by its trusted identity, recheck authorization and open the related screen from either a running app or a cold launch. If access/target is unavailable, show an appropriate fallback without exposing another account's data.
6. Recipient paginates history, sees unread count, opens permitted targets, marks read/unread or all read, and deletes owned items.

These flows are derived from the supplied task and explicit user confirmations. UI samples cannot add or change them.

## Friendship lifecycle

These are conceptual requirements, not existing enums or database tables.

| Current state                | Actor/action                      | Result                                                                              |
| ---------------------------- | --------------------------------- | ----------------------------------------------------------------------------------- |
| No active friendship/request | Send to another account           | Pending request: outgoing for sender, incoming for recipient                        |
| Pending                      | Recipient accepts                 | Accepted friendship; no longer pending; acceptance event for sender                 |
| Pending                      | Recipient rejects                 | Rejected request; no friendship                                                     |
| Pending                      | Sender cancels                    | Canceled request; no friendship                                                     |
| Accepted friendship          | Either participant unfriends      | No active friendship                                                                |
| Terminal/non-pending         | Duplicate or competing transition | No second friendship or invalid action; error/idempotent response policy unresolved |

Incoming/outgoing are perspectives on one request, not two relationships. Define self-request restrictions and pair uniqueness explicitly. Retention of rejected/canceled requests, re-request cooldowns, crossed requests, and blocking/reporting are unresolved; blocking/reporting is not automatically MVP.

## Notification lifecycle and delivery concepts

| Concept                    | Meaning                                                                                                                                                                                            |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Creation                   | Record intent/content, permitted recipients, and creation time                                                                                                                                     |
| Notification event         | Domain occurrence such as friend acceptance or a recurring occurrence; not a job or transport                                                                                                      |
| Scheduled execution        | Backend work due at a future instant distinct from creation                                                                                                                                        |
| Recurrence                 | Rule plus execution/progress state; each due occurrence needs identity                                                                                                                             |
| Processing/delivery status | Pending/due, processing, inbox persisted, or failed are useful conceptual states; exact enums/retries/guarantees are not approved                                                                  |
| Persisted inbox item       | Recipient-owned durable history; distinct from signaling a connected app                                                                                                                           |
| Realtime mechanism         | Signals active clients about changes; not yet chosen                                                                                                                                               |
| Read/unread                | Recipient engagement, independent of processing status                                                                                                                                             |
| OS push                    | Confirmed native Android/iOS alert delivery for background/closed states; a separate mechanism from inbox persistence and foreground realtime. Provider and operational policies remain undecided. |

Immediate sends progress from validated creation to processing and inbox persistence. Scheduled sends first record pending future work; due processing creates the inbox item. Each recurring occurrence is processed independently and advances execution state. Failures must be observable/recoverable under the agreed policy; “created,” “queued,” or “signaled” must not automatically mean “delivered.”

The supplied task requires managing schedules and configuring recurrence but does not fully define how existing schedules/series may be changed or stopped. Record those policies as unresolved before adding contracts. Deleting a received item must not silently cancel the sender's future occurrences.

## Scheduling, recurrence, and reliability

- Durable backend execution is needed while phones are offline; mobile timers/local state alone are insufficient.
- Keep creation time, due instant, inbox persistence time, push attempt/provider result, OS presentation, read state, and realtime signaling separate.
- Decide zone storage/display, recurrence frequency/end conditions, DST, overdue/missed runs, retries, duplicates, and delivery-time friendship checks before contracts. Do not infer exactly-once, instant, or background delivery guarantees.
- Unread totals derive from persisted recipient state. Pagination/mark-all behavior needs agreed boundaries under concurrent arrivals.
- Define content limits, retention/deletion, discovery privacy, authorization, rate limits, and failure visibility before release.

## App-state behavior and native push acceptance

| State                                                       | Required recipient experience                                                                            | Verification gate                                                                                                                                                               |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Foreground/open                                             | Inbox and unread count update without manual refresh; apply the agreed in-app/banner/sound policy.       | Receive self/friend/social and due scheduled/recurring items; reconcile push/realtime by the same logical item/occurrence; no duplicate inbox entries or duplicate user alerts. |
| Background/locked screen                                    | OS presents permitted native notifications; backend execution does not rely on a running mobile process. | Test switching apps and locking the screen on real Android/iOS devices with permission granted; tap returns to the relevant authorized item.                                    |
| Closed/terminated                                           | OS presents permitted native notifications without the app UI being open; tap cold-starts the app.       | Test normal closed/terminated states on both platforms; restore session or request sign-in before target access. Test Force stop separately as an OS restriction.               |
| Offline, denied permission, expired token or OS restriction | No false promise of visible alert delivery; persisted inbox remains available.                           | Permission-denial flow, token refresh/invalidation, retry/expiry policy, logout/account switch, and missed-history/count recovery on reopen.                                    |

Persist inbox data before or consistently with delivery attempts so push failure cannot remove history. Push payloads identify the persisted item/occurrence; a push receipt or banner is not read confirmation. Authenticate device registration/update/removal and bind tokens to the appropriate account; handle rotation, invalid tokens and logout/account switching to avoid sending one user's alerts to another. Do not assume a single device per account; its supported multi-device behavior and lock-screen privacy defaults must be agreed.

Native system push is required for the product; it does not mean background app code will always execute. Notification permission, OS settings, connectivity, delivery expiry and platform restrictions can delay/prevent presentation. In particular Android Force stop in Settings requires reopening before notifications work again. These are documented/tested conditions, not removal of the three-state requirement. See [Expo app-state and notification behavior](https://docs.expo.dev/push-notifications/what-you-need-to-know/).

The exact push transport/provider, credentials, field names, retries, alert style/sound and privacy settings are not selected here. No feature or infrastructure has been implemented by this documentation update.

## Explicit exclusions and requirement boundaries

MVP excludes web apps/dashboards, marketing sites, developer notification platforms, customer API keys, public external-customer notification APIs, third-party integrations, unconfirmed enterprise functionality, and external channels including email, Web Push, SMS, Telegram, and Discord. The internal mobile API does not make NEXA a public developer platform.

Only the supplied task and explicit user confirmations establish product scope. Static UI/UX samples do not establish additional requirements, exclusions, future commitments, screen counts or business rules. Browser preview is development tooling, not a supported web product.

Password change/reset/recovery, email verification, additional auth methods, and advanced account settings require confirmation. Additional account functionality must be decided from the supplied task and implementation gaps, not sample UI content. Native Android/iOS push is now explicitly confirmed for MVP and is distinct from Web Push and foreground realtime; provider/transport selection remains open.

## Known limitations and decisions to confirm

Existing mobile auth cannot complete against stub responses; there is no durable account/friend/notification data or delivery infrastructure. See [architecture](architecture.md) and [API contracts](api-contracts.md).

Prioritize decisions affecting security and modeling:

1. Persistence choice, real credential validation, token/revocation policy, account settings; whether recovery/verification is needed for launch.
2. Searchable/public fields, discoverability, pair uniqueness/crossed requests, retention/cooldowns; whether pending sends survive unfriending or recheck friendship at execution.
3. Content/limits, recipient cardinality, sender schedule/series management, recurrence/end rules, zones/DST, retries/missed runs, delivery guarantees.
4. Realtime transport/reconnect, pagination ordering/cursors, unread/mark-all boundaries; native push provider/transport, retries/expiry, foreground presentation, lock-screen content privacy, permissions, token/account binding and multi-device policy. Supporting background/closed-app alerts is confirmed, not an open scope question.
5. Target navigation/access behavior, hosting/signing, observability and Android/iOS launch criteria.

Record answers here and in affected contracts/architecture before implementation. This audit selects no stack or provider.
