# NEXA Project Instructions

## Mandatory Codex quality rules

- At the start of every coding task (implementation, bug fix, refactor, or test change), read [docs/rules.md](docs/rules.md) in full before editing code. Apply it throughout implementation and self-review; a link or remembered summary is not a substitute for reading it.
- Read the assigned member spec and relevant handoff contracts before implementation. The A/B/C specs contain draft proposals; only explicit leader-approved decisions establish product or contract requirements.
- After context compaction or resuming work, ensure these rules are available in context; re-read them if missing, uncertain, or changed. Do not re-read unchanged rules before every individual edit.
- Before handing off, review the complete task diff against these rules and report actual checks and unresolved gaps. Do not treat self-review as independent approval or permission to merge.

## Product authority

NEXA is a personal notification and friend-management application for **Android and iOS only**, with one shared backend. [docs/app-functions-and-screens.md](docs/app-functions-and-screens.md) summarizes the confirmed app functions and screens. Product requirements come only from the user-supplied task “Audit and Align Project Documentation with the Confirmed Notification App Product Scope” and subsequent explicit user confirmations, including notification support in open, background and closed states. HTML samples and visual design references are for UI/UX review only; they cannot add features, define business rules, determine product purpose, or establish implementation status.

Read the function/screen summary and inspect relevant source code and manifests before making product or architectural decisions. Verify structure, routes, and implementation status from the current code. Historical designs, comments, and roadmaps are not evidence of shipped features.

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
- Use the existing shared design tokens and preserve verified native UI behavior. [DESIGN.md](DESIGN.md) and HTML samples are visual references only; they do not define requirements, implementation priorities or business behavior. Resolve product decisions against the supplied task, explicit user confirmations, and the function/screen summary.
- Add appropriate tests and update documentation when implementing future features. Cover relevant ownership, transitions, contract compatibility, scheduling/recurrence, and failures. Never report completion from a mockup, comment, or unexecuted test.
- Keep profile/account settings separate from sign-in. Do not invent auth methods, password-reset policy, or privileged roles.
- Follow [docs/commit-rules.md](docs/commit-rules.md) for contribution conventions and approved merge flow. Respect additional applicable local/user instructions, including RTK and CodeGraph instructions.

## Colocation rules

- Keep `apps/mobile/app/` for Expo Router route/layout entry points. Put screen implementations outside it, under the owning feature.
- Put code used by one screen or component beside it. Keep component styles in a neighboring `<component>.styles.ts` file; a small style object whose values depend on runtime state may stay inline. Props/types, local constants, and small helpers may remain in the implementation file when that stays clear.
- Put tests in a `tests/` directory at the root of their app or package, outside `src/`. Mirror the source path below `src/` within `tests/`; update test runner, lint, and typecheck configuration to discover and check that directory.
- Code used across screens in one feature stays in that feature. Promote it to app-level `src/components` or another shared location only when there is a real consumer outside the owning feature and a stable common responsibility.
- Keep shared UI components in `apps/mobile/src/components`, with one component per file. Component styles stay in an adjacent `<component>.styles.ts` file; prop types stay with that component.
- Keep transport contracts in `packages/types`, boundary schemas in `packages/validation`, and HTTP transport/endpoints in `packages/api-client`. UI-only form fields and schemas stay with the screen that owns them.
- Keep backend handlers and services in their existing NestJS business-module directories. Share through a module's explicit public providers; do not add abstraction layers or empty folders solely to match a template.
- Common/shared code must not import from an owning screen or feature's private implementation. Prefer the smallest owner and move code upward only when reuse is demonstrated.
