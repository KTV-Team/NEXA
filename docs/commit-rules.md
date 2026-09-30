# Git Rules

## 1. Commit message

Format:

```text
<type>(<scope>): <description>

[optional body]

[optional footer]
```

- `type`: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`.
- `scope` is optional; use the changed module, for example `auth`.
- `description` is lowercase, short, and imperative. Do not end it with a period.
- Add `!` after type/scope for a breaking change.
- Use the body for the reason or impact; use the footer for references or breaking-change details.

Example:

```text
feat(auth): add login retry

Retry once when the session expires.

Refs: #123
```

## 2. Branch name

Format:

```text
<type>/<short-description>
```

- Use the same types as commits.
- Use lowercase kebab-case.
- Keep it short and specific.

Example: `feat/login-retry`

## 3. Merge request

1. Create a branch from `main`.
2. Push only that branch.
3. Create a Merge Request (MR) into `main`.
4. Merge only through the approved MR.

Never push directly to `main`, including force-pushes.
