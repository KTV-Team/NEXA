# Authentication API v1

The API provides email/password authentication for the native app and a future same-site web client. It does not implement email verification, password reset, social login, or frontend screens.

Base URL: `/api/v1`. JSON responses use `{ "success": true, "data": ... }`; errors use `{ "success": false, "error": { "code", "message", "details?" } }`. `204` responses have no body.

## Client transport

Send `X-Auth-Client: mobile` for native clients; omitting it defaults to mobile. Web requests send `X-Auth-Client: web` and an exact allowlisted `Origin` on every POST to `/auth`. The header selects token transport only; it does not authenticate a request.

Mobile receives the refresh token in JSON and sends it in refresh/logout request bodies. Web receives the refresh token only in the `nexa_rt` HttpOnly cookie (`SameSite=Lax`, `Path=/api/v1/auth`). Web fetch calls use `credentials: 'include'`; protected requests still send `Authorization: Bearer <accessToken>`. The API never reads a cookie in mobile mode or accepts a web refresh token in JSON.

## Endpoints

| Method | Path                    | Request                                                                      | Success                                   |
| ------ | ----------------------- | ---------------------------------------------------------------------------- | ----------------------------------------- |
| POST   | `/auth/register`        | `{ email, name, password }`                                                  | `201`, user and tokens; creates a session |
| POST   | `/auth/login`           | `{ email, password }`                                                        | `200`, user and tokens                    |
| POST   | `/auth/refresh`         | Mobile `{ refreshToken }`; web `{}` with cookie                              | `200`, rotated tokens                     |
| POST   | `/auth/logout`          | Mobile `{ refreshToken }` or no body with bearer AT; web no body with cookie | `204`; revokes one session                |
| GET    | `/users/me`             | Bearer AT                                                                    | `200`, authenticated user                 |
| POST   | `/auth/change-password` | `{ currentPassword, newPassword }` and bearer AT                             | `204`; revokes every session              |

Access tokens are HS256 JWTs valid for 15 minutes. Refresh tokens contain 32 random bytes, are stored as SHA-256 hashes, and expire 30 days after the session was created. Rotation replaces the stored hash without extending session expiry. Each login creates an independent session. Reusing a rotated token returns `401 INVALID_REFRESH_TOKEN`; it does not revoke the current session. Refresh callers should avoid concurrent refresh requests.

Register/login mobile responses contain `user` and `{ accessToken, refreshToken, expiresIn: 900 }`. Web responses contain `user` and `{ accessToken, expiresIn: 900 }`; the RT is set as a cookie. The user object is allowlisted (`id`, `email`, `name`, compatibility `role: "user"`, timestamps, and optional avatar URL); database system roles and credential/session data are never returned.

Password registration/new-password rules: 8–128 characters, at least one lowercase letter, uppercase letter, and digit. Email is trimmed/lowercased and capped at 254 characters; name is trimmed and 2–100 characters. Login does not return different errors for an unknown email and wrong password. A password change requires the old password and logs out every device; reset without the old password is not supported.

Common errors include `VALIDATION_ERROR` (400), `PASSWORD_UNCHANGED` (400), `CURRENT_PASSWORD_INCORRECT` (400), `INVALID_CREDENTIALS` (401), `INVALID_ACCESS_TOKEN` (401), `INVALID_REFRESH_TOKEN` (401), `SESSION_REVOKED` (401), `ORIGIN_NOT_ALLOWED` (403), `EMAIL_ALREADY_EXISTS` (409), `RATE_LIMITED` (429), and `INTERNAL_SERVER_ERROR` (500). Validation details contain field paths/messages, never submitted values.

Auth responses and `/users/me` send `Cache-Control: no-store`. Auth routes are rate-limited per process and IP: register/login 10/minute, change password 5/minute, refresh/logout 60/minute. Current limits use in-memory Nest throttler storage and are not shared across API instances.

## Local setup

Copy `apps/api/.env.example` to `apps/api/.env`. Generate an access-token key in PowerShell and put the output in `AUTH_ACCESS_SECRET`:

```powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

Set local database values and `AUTH_WEB_ORIGINS`; then start PostgreSQL and apply reviewed migrations:

```powershell
docker compose --env-file apps/api/.env up -d postgres
pnpm --filter @nexa/api db:migration:run
pnpm --filter @nexa/api dev
```

For tests, copy `.env.test.example` to the ignored `apps/api/.env.test`, set the database password, then run `pnpm --filter @nexa/api test:db`. Tests reject non-local hosts and databases other than `nexa_test`. Apply migrations only to a database you intend to modify.
