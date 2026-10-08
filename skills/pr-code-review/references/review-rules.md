# Review criteria

These are review criteria, not a mandate to redesign code or add unapproved features. Repository/user requirements determine product behavior and architecture. Apply general criteria where relevant; suggest improvements rather than blocking a PR based on taste. Use framework guidance matching installed versions when a finding depends on a version-specific behavior.

## Quality rules

| ID | Criterion | Evidence to look for |
| --- | --- | --- |
| COR-01 | Correct behavior and boundaries | Concrete input/state producing wrong output, empty/null handling, pagination boundaries, time calculations. |
| COR-02 | Concurrent transitions | Lost updates, accept/cancel races, double submission, state transitions that violate an established invariant. |
| COR-03 | Explicit error behavior | Swallowed failures, misleading success UI, unhandled rejection, missing recovery from a real failure path. |
| ARC-01 | Smallest suitable owner | Local code stays local; feature-owned code stays in the feature; shared contracts/transport follow repository boundaries. |
| ARC-02 | Justified common/shared extraction | Real consumers and a stable shared responsibility; avoid feature switches in generic components and speculative reuse. Similar code can legitimately stay separate when its responsibilities differ. |
| ARC-03 | Dependency direction | Shared code does not depend on private feature/screen code; no problematic cycles or bypassed public APIs. |
| ARC-04 | Proportionate complexity | Unnecessary abstraction, services, or dependencies with a concrete maintenance cost; do not demand arbitrary patterns or file/function length limits. |
| MAI-01 | Clear responsibilities and naming | Names and interfaces communicate behavior; confusing state/units/ownership introduce a demonstrated misuse risk. |
| MAI-02 | Consistent sources of truth | Duplicated business rules, schemas, or state can drift; distinguish this from harmless repetition. |
| MAI-03 | Useful documentation | Changed contracts, configuration, build/test/release behavior are documented; comments explain non-obvious reasons and remain accurate. |
| SEC-01 | Boundary validation | Server validates untrusted inputs; TypeScript DTOs and client validation alone do not establish runtime validity. |
| SEC-02 | Authorization and ownership | Every affected operation enforces required permissions server-side, including object IDs, lists, transitions, and delayed execution. Authentication alone is insufficient. |
| SEC-03 | Sensitive data and secrets | Tokens/credentials/private data are not exposed in responses, logs, source, unsafe storage, or report excerpts. |
| SEC-04 | Injection and abuse paths | Untrusted values reach query/command/URL construction or costly operations without appropriate controls; establish reachability and impact. |
| CON-01 | Contract compatibility | DTOs, boundary schemas, transport, and consumers agree; removed/changed exports and API fields do not silently break clients. |
| CON-02 | Sound type boundaries | Unsafe assertions or any hide a concrete invalid state; unknown input is narrowed/validated before use. Do not flag every assertion mechanically. |
| RN-01 | Pure render and immutable state | Render has no external side effects; state/props are not mutated in a way that causes incorrect rendering. |
| RN-02 | Effects and lifecycle | Subscriptions/listeners/timers are cleaned up; stale closures, dependency mistakes, and asynchronous races have a concrete failure path. |
| RN-03 | Native user states | Loading/error/empty states, permissions, navigation, resume and cold-start paths behave correctly where affected. |
| RN-04 | Accessibility and layout | Changed controls remain usable with assistive technology and supported screen/text sizes; cite code evidence or actual visual/native validation. |
| REL-01 | Duplicate-safe operations | Retries/realtime/push signals do not duplicate effects or corrupt state; persistence and business guarantees match approved requirements. |
| REL-02 | Recovery and retry | Retry is bounded, classifies failures, and does not claim successful delivery or persistence prematurely. |
| REL-03 | Scheduling and time | Durable execution, recurrence, time zones/DST, restart recovery, and recipient eligibility follow approved policies when involved. |
| TST-01 | Meaningful regression coverage | Tests fail for the demonstrated regression and assert observable behavior instead of mirroring implementation. |
| TST-02 | Relevant failure coverage | Ownership, transitions, contracts, concurrency, and failure cases are exercised in proportion to the change. |
| TST-03 | Trustworthy verification | Tests discover intended files, assertions matter, mocks do not hide the relevant boundary, and checks correspond to the reviewed SHA. |
| PERF-01 | Bounded work and data | Unbounded queries/lists, N+1 requests, expensive repeated work, or memory growth have a realistic affected path. |
| PERF-02 | Measured/provable user impact | Avoid speculative optimization and blanket memoization; explain scale/complexity or cite profiling evidence. |
| GOV-01 | Reviewable change and safeguards | Rule/CI/test exclusions are not weakened merely to make checks pass; unrelated refactors obscure a material behavior change. |

## Severity and confidence

Severity describes impact and reach. Confidence describes the strength of the evidence. A severe hypothesis is a verification gap until there is a defensible execution path.

| Level | Definition | Typical examples, only when supported |
| --- | --- | --- |
| Critical | Severe exploitable compromise, broad sensitive-data exposure, irreversible substantial data loss, or broad service failure on a reachable path. | Exposed production credential with demonstrated scope; authorization bypass exposing many users' private data; destructive operation affecting all accounts. |
| High | Serious functional/security failure in a core flow with limited reach or recoverable damage. | Cross-account mutation; broken sign-in or delivery for a supported state; recurring job duplicating important effects on restart. |
| Medium | Meaningful bug in a narrower scenario or a definite architecture/contract/testing rule violation with a concrete consequence. | Pagination skips items; leaked subscription accumulates work; private feature import makes shared code depend on feature internals. |
| Low | Small verified defect or explicit convention/documentation violation with limited impact. | Incorrect documented parameter; required naming/colocation violation without demonstrated functional breakage. |

Record confidence as High (direct proof/reproduction), Medium (complete code path with explicit assumptions), or Low (unresolved hypothesis; put in Verification gaps instead of issue counts). Do not assign severity from labels like SOLID/DRY, changed-line count, or personal preferences. A test gap can inherit meaningful impact only when a concrete behavior/regression risk is established.

## Sources and maintenance

The criteria draw on these primary sources. They are supporting rationale, not replacements for approved product requirements or proof that every rule is mandatory in every repository:

- [Google: What to look for in a code review](https://google.github.io/eng-practices/review/reviewer/looking-for.html): design, functionality, concurrency, complexity, tests, naming, documentation, and separating style preferences from mandatory corrections.
- [OWASP: Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html): authorization at the right boundaries, ownership, permission checks, and authorization tests.
- [React: Components and Hooks must be pure](https://react.dev/reference/rules/components-and-hooks-must-be-pure): pure render, side effects outside render, and immutable props/state.

Last source review: 2026-10-07. Refresh a relevant official source when a finding depends on changing framework behavior. Do not fetch the entire source set on every review.
