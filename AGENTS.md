# NEXA Project Instructions

## Product authority

NEXA is a personal notification and friend-management application for **Android and iOS only**, with one shared backend. [docs/product-requirements.md](docs/product-requirements.md) defines the confirmed MVP and unresolved decisions. Product requirements come only from the user-supplied task “Audit and Align Project Documentation with the Confirmed Notification App Product Scope” and subsequent explicit user confirmations, including notification support in open, background and closed states. HTML samples and visual design references are for UI/UX review only; they cannot add features, define business rules, determine product purpose, or establish implementation status.

Read the PRD and relevant existing code/documentation before making product or architectural decisions. Use [docs/architecture.md](docs/architecture.md) for verified structure, [docs/api-contracts.md](docs/api-contracts.md) for route/client gaps, and [docs/roadmap.md](docs/roadmap.md) for planned work. Historical designs, comments, and roadmaps are not evidence of shipped features.

## Scope guardrails

- Prioritize native Android/iOS flows: accounts, profiles/settings, user search, friend requests/friendships, personal/friend notifications, immediate/scheduled/recurring delivery, inbox, foreground realtime updates, and native push in background/closed states.
- Preserve one shared backend. Keep the pnpm/Turborepo workspace, Expo/React Native, NestJS/Fastify, TypeScript, Zod, and Fetch client unless an explicitly approved architectural decision changes them.
- Do not add web apps, dashboards, marketing pages, external customer API keys, integrations, public customer notification APIs, external channels (email, Web Push, SMS, Telegram, Discord), or enterprise features without explicit approval. Retained `apps/web` and Expo preview do not authorize web product work.
- Do not infer any additional feature, screen list, navigation, workflow or business rule from HTML/UI samples. Any requirement beyond the supplied task and explicit user confirmations needs separate confirmation.
- Support notifications in all three states: open/foreground, background (including locked screen), and closed/terminated. Native Android/iOS push is a confirmed MVP requirement; its provider/transport is undecided. Foreground realtime alone does not fulfill this requirement.
- Backend inbox persistence and scheduled/recurring execution must not depend on app processes or background JavaScript. Handle native permissions, account-owned device tokens, token rotation/logout, unavailable devices, push failures, duplicate realtime/push signals, resume synchronization, and notification taps on warm/cold start.
- Distinguish inbox persistence, push submission/provider acceptance, OS display, and read state; do not promise unconditional delivery under denied permissions, no network, OS restrictions, or Force stop. Test all three normal lifecycle states on Android and iOS. Native push for NEXA users is permitted; excluded external channels still include email, Web Push, SMS, Telegram, and Discord.

## Engineering rules

- Keep mobile, API, and shared packages in the existing workspace. Put shared DTOs/domain types in `packages/types`, boundary schemas in `packages/validation`, and transport in `packages/api-client`.
- Inspect existing implementation and manifests before choosing dependencies, transport, storage, scheduling, or auth. Propose the smallest justified solution; avoid unnecessary services, abstractions, and over-engineering.
- Validate at API boundaries. Client validation and TypeScript DTOs do not enforce server validation. Authenticate requests and enforce ownership for accounts, notifications, inbox items, and friendship transitions; prevent cross-user mutation/disclosure.
- Sending to another user requires an accepted friendship; self-delivery is allowed. Check recipient visibility and friendship permissions server-side. Scheduled-delivery checks must follow the approved policy.
- Keep API contracts, models, documentation, processing states, read/unread state, and Android/iOS behavior consistent. Distinguish requirements, proposals, partial implementation, and verified behavior.
- Consider duplicate friend requests, concurrent accept/cancel, duplicate requests/delivery, durable scheduled execution, recurring occurrences, time zones/DST, retry/recovery, and failure handling where relevant. Never promise unestablished delivery guarantees.
- Use the existing shared design tokens and preserve verified native UI behavior. [DESIGN.md](DESIGN.md) and HTML samples are visual references only; they do not define requirements, implementation priorities or business behavior. Resolve product decisions against the supplied task and confirmed PRD.
- Add appropriate tests and update documentation when implementing future features. Cover relevant ownership, transitions, contract compatibility, scheduling/recurrence, and failures. Never report completion from a mockup, comment, or unexecuted test.
- Keep profile/account settings separate from sign-in. Do not invent auth methods, password-reset policy, or privileged roles.
- Follow [docs/commit-rules.md](docs/commit-rules.md) for contribution conventions and approved merge flow. Respect additional applicable local/user instructions, including RTK and CodeGraph instructions.
