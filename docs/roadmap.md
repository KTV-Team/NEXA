# NEXA mobile roadmap

Evidence baseline: 2026-10-06. Android/iOS use one shared backend; [PRD](product-requirements.md) defines MVP. Roadmap scope and priorities come from the supplied user task and explicit confirmations; UI samples cannot add deliverables or determine product priorities. Status is based on tracked code, not completion percentages or production readiness. No dates are committed.

## Baseline

| Area                                     | Verified status                                                                                                                 |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Foundation                               | pnpm/Turborepo, Expo Router mobile, NestJS/Fastify backend, shared types/validation/client/tokens exist                         |
| Authentication                           | Partial mobile forms/session service/tests; backend stub, no registration/credential validation; envelopes block end-to-end use |
| Profiles/settings                        | DTOs/in-memory stubs and session landing only; real profile/settings persistence absent                                         |
| Search/friends                           | No implementation evidence                                                                                                      |
| Notifications/inbox/realtime/native push | No implementation evidence; all three app states are now confirmed MVP requirements                                             |
| Scheduled/recurring processing           | No implementation evidence                                                                                                      |
| Native release                           | Android/iOS identifiers and EAS profiles exist; signed binaries, device QA/release readiness unverified                         |

## Priorities and verification gates

Reuse existing work; priorities do not authorize stack changes. Security/tests/docs apply throughout. Native integration starts early and continues through release.

| Priority                                     | Planned work                                                                                                                                            | Evidence required for completion                                                                                                                                                                      |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Foundation/auth                           | Approve persistence/auth, real accounts/registration/session lifecycle, API validation and envelopes                                                    | Contract/ownership tests; mobile registration/login/restore/logout against real backend; no sample accounts/tokens in completed flow                                                                  |
| 2. Profiles/friendships                      | Agree search/settings/privacy; implement search, all request transitions, list/unfriend                                                                 | Durable updates, participant checks, duplicate/concurrent/crossed policy tests; consistent relationships for both users                                                                               |
| 3. Immediate notifications/inbox persistence | Self/friend sends; separate intent/event/inbox/processing; social request/acceptance events                                                             | Recipient checks, history persistence, cross-user denial, duplicate handling and social event coverage                                                                                                |
| 4. Inbox/realtime/native push                | Pagination/count/read/unread/mark-all/delete/tap; approve realtime and native push transport; device-token lifecycle, permissions and delivery/recovery | Inbox consistency/ownership, foreground/background/locked/closed Android/iOS alerts, duplicate reconciliation, permission/offline/invalid-token recovery, and warm/cold authorized taps               |
| 5. Scheduled notifications                   | Approve time/zone/sender management; durable due execution with inbox persistence and native push attempts                                              | Delivery while apps are backgrounded/closed, restart/permission/duplicate/retry/overdue tests; verify both inbox and push for each due item under agreed guarantees                                   |
| 6. Recurring notifications                   | Approve rule/end/DST/missed-run policy; persist progress and independently deliver each occurrence through inbox/native push                            | Multiple occurrences in all three app states, no duplicate inbox/user alert from retries; restart/retry and series-management tests                                                                   |
| 7. Operational reliability                   | Security/rate limits/retention, CI, recovery, logs/metrics, hosting                                                                                     | Repeatable checks/deployment, secrets policy, diagnosable failures/recovery; no unsupported delivery claims                                                                                           |
| 8. Android/iOS release                       | Native devices/accessibility/session, three-state notifications, signing and provider/build configuration                                               | Both platforms against backend; foreground/background/locked/closed alerts, warm/cold tap routing, permission/token/logout/account-switch/OS-restriction checks, signed artifacts and launch criteria |

Native Android/iOS push and all three app states are confirmed MVP requirements and part of priority 4, not optional scope. Provider/transport, credentials, retry/expiry, privacy and multi-device/presentation policy still require decisions before implementation. Additional auth methods/recovery, drafts/edit/cancel and settings fields need PRD decisions before commitment.

## Retained work and verification limits

Retain the implemented native login/register forms, session handling, shared tokens/contracts, and auth unit tests. [Auth handoff](mobile-auth-implementation.md) records earlier browser/mocked API checks; this audit does not rerun/certify those results. Native runtime, live backend, scheduler, realtime, native push and release cannot be completed from those checks. Browser/mock QA is not evidence of push delivery when backgrounded or closed.

Do not copy features, screen identifiers/counts or navigation from UI samples into this roadmap. Root scripts still include the out-of-scope web scaffold; use the mobile/API path in [README](../README.md).
