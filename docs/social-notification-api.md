# Social, profile, notification and inbox API

All routes use `/api/v1`, require `Authorization: Bearer <accessToken>`, and return the existing `{ success: true, data }` envelope. A `204` response has no body. New API responses use `Cache-Control: no-store`. IDs are UUIDs and timestamps are ISO UTC strings. List routes use `page=1`, `limit=20` (maximum 100), with `meta: { page, limit, total, totalPages }`.

## Profile and people search

`PATCH /users/me` accepts `{ name?, avatarUrl? }`; include at least one field. Names are trimmed to 2–100 characters. Avatar URLs must use HTTPS and may be set to `null` to remove the avatar. The response is the existing `User` representation for the signed-in account.

`GET /users?q=<query>&page=1&limit=20` searches active accounts and excludes the caller. A valid email query matches the normalized email exactly; other queries search a case-insensitive substring of the name. Results contain `{ id, name, avatarUrl?, relationship, requestId? }`; `relationship` is `none`, `incoming`, `outgoing`, or `friend` relative to the caller, and `requestId` identifies a pending request. Email and role are never returned. `%`, `_`, and the escape character are treated literally. `GET /users/:id` remains unimplemented.

## Friend requests and friendships

| Method and route                                                    | Request                                 | Result                                                |
| ------------------------------------------------------------------- | --------------------------------------- | ----------------------------------------------------- |
| `POST /friend-requests`                                             | `{ recipientId }`                       | `201` new request; `200` same-direction pending retry |
| `GET /friend-requests?direction=incoming\|outgoing&page=1&limit=20` | No body; direction defaults to incoming | Pending requests involving caller                     |
| `POST /friend-requests/:requestId/accept`                           | No body                                 | `200 Friendship`                                      |
| `POST /friend-requests/:requestId/reject`                           | No body                                 | `200 FriendRequest`                                   |
| `DELETE /friend-requests/:requestId`                                | No body                                 | `204`; sender cancels                                 |
| `GET /friends?page=1&limit=20`                                      | No body                                 | Active friendships with the counterpart summary       |
| `DELETE /friends/:id`                                               | No body                                 | `204`; either participant may remove                  |

Friend request records have `id`, `sender`, `recipient`, `status`, `friendshipId`, `createdAt`, and `updatedAt`. Summaries contain `id`, `name`, and optional `avatarUrl`. A crossed request returns `409 INCOMING_REQUEST_EXISTS` with the incoming `requestId`; it must be accepted explicitly. Repeating a same-direction pending request returns the original row. Accept/reject is recipient-only and cancel is sender-only. Removed friendships do not revive through an old accepted request.

## Personal notifications

One notification has one recipient: the sender themself or an active friend. `POST /notifications` accepts:

```json
{
  "clientRequestId": "uuid",
  "recipientId": "uuid",
  "title": "A reminder",
  "body": "Plain text",
  "delivery": { "mode": "immediate" }
}
```

Delivery may be immediate, a one-time schedule, or a daily/weekly recurrence:

```json
{ "mode": "scheduled", "scheduledAt": "2026-10-08T10:30:00+07:00" }
```

```json
{
  "mode": "recurring",
  "rule": {
    "frequency": "weekly",
    "timeZone": "Asia/Ho_Chi_Minh",
    "localTime": "09:30",
    "startsOn": "2026-10-08",
    "endsOn": "2026-12-31",
    "weekdays": [1, 4]
  }
}
```

Weekly weekdays use ISO numbering (Monday=1 through Sunday=7). `endsOn` is inclusive. Local times use `HH:mm`; recurrence dates are calendar dates. Time zones must be valid IANA names or `UTC`. A recurrence created or edited must have a future occurrence. DST gaps move forward through the gap; repeated local times choose the earlier instant. Immediate delivery commits the notification, occurrence and inbox synchronously in the create transaction. Scheduled and recurring delivery is processed by the backend worker. The current implementation does not send push or realtime events.

`POST /notifications` returns `201` for new records and `200` for an idempotent replay. Reuse the same `clientRequestId` when retrying the same action. A changed payload with the same key returns `409 IDEMPOTENCY_KEY_REUSED`. The `PersonalNotification` response includes `id`, `senderId`, `recipientId`, `recipient`, `title`, `body`, `delivery`, `status`, `version`, `nextRunAt`, `lastDeliveredAt`, `cancelledAt`, `blockReason`, `failureCode`, `createdAt`, and `updatedAt`.

Statuses: `SCHEDULED` (one-time pending), `ACTIVE` (recurrence pending), `COMPLETED`, `CANCELLED`, `BLOCKED` (recipient no longer eligible or an account is inactive), and `FAILED` (delivery retries exhausted). `GET /notifications` lists sender-owned records; `GET /notifications/:id` is sender-only. Recipients read the delivered snapshot through inbox routes.

`PATCH /notifications/:id` accepts `{ version, title?, body?, delivery? }`. Only `SCHEDULED` or `ACTIVE` records can be changed. Recipient and delivery mode are fixed; recurring edits apply to future occurrences. If the next run is already due, reload after the worker processes it or cancel it. Stale versions return `409 VERSION_CONFLICT`. `POST /notifications/:id/cancel` accepts `{ version }` and returns the current cancelled record; repeating cancellation is idempotent. A cancelled, blocked, completed, or failed record cannot be resumed.

## Inbox

| Method and route                              | Request                      | Result                                        |
| --------------------------------------------- | ---------------------------- | --------------------------------------------- |
| `GET /inbox?page=1&limit=20&read=true\|false` | Optional literal read filter | Paginated inbox items                         |
| `GET /inbox/unread-count`                     | No body                      | `{ unreadCount }`                             |
| `GET /inbox/:itemId`                          | No body                      | One visible inbox item; does not mark it read |
| `PATCH /inbox/:itemId`                        | `{ "read": true }`           | Updated item; false marks unread              |
| `POST /inbox/read-all`                        | No body                      | `{ updatedCount }`                            |
| `DELETE /inbox/:itemId`                       | No body                      | `204`; soft-deletes only the caller's item    |

Inbox items include `id`, `notificationId`, `occurrenceId`, sender summary captured at delivery, `title` and `body` captured at delivery, `scheduledFor`, `deliveredAt`, and nullable `readAt`. Editing a notification never changes an existing inbox snapshot. Deleted inbox items stay deleted and do not contribute to the unread count.

## Errors, limits and worker configuration

Errors use `{ success: false, error: { code, message, details? } }`. Expected codes include `VALIDATION_ERROR`, `INVALID_SCHEDULE`, `SELF_FRIEND_REQUEST`, `ALREADY_FRIENDS`, `INCOMING_REQUEST_EXISTS`, `FRIEND_REQUEST_ACTION_FORBIDDEN`, `FRIEND_REQUEST_STATE_CONFLICT`, `USER_NOT_FOUND`, `FRIEND_REQUEST_NOT_FOUND`, `FRIENDSHIP_NOT_FOUND`, `RECIPIENT_NOT_ALLOWED`, `NOTIFICATION_NOT_FOUND`, `NOTIFICATION_DUE`, `NOTIFICATION_STATE_CONFLICT`, `VERSION_CONFLICT`, `IDEMPOTENCY_KEY_REUSED`, `INBOX_ITEM_NOT_FOUND`, and `RATE_LIMITED`. Validation errors contain field paths/messages, never submitted values or SQL details.

The in-process worker polls PostgreSQL once per second, up to 50 candidates per poll. Set `NOTIFICATION_WORKER_ENABLED=false` to disable it (it defaults off in test and on otherwise). Multiple API processes can run the worker; database locks and occurrence uniqueness prevent duplicate inbox rows. A one-time schedule missed during downtime is delivered once after restart. A recurring schedule coalesces overdue periods to the latest eligible occurrence. Transient delivery failures retry with 1/2/4/8/16-second backoff and then become `FAILED`. Inbox commit is the delivery boundary; it does not prove push-provider acceptance, OS display, or reading. No push, realtime, device-token registration, or mobile UI is provided by these APIs.

For local API setup, copy the API environment example, generate `AUTH_ACCESS_SECRET` as base64 for at least 32 random bytes, and configure PostgreSQL. Run migrations explicitly with `pnpm --filter @nexa/api db:migration:run`. Database startup migration and TypeORM synchronization remain disabled.

Worker failures are logged with the notification ID, a sanitized error code and event name. Recognized transient database/connection errors use the bounded retry policy; permanent failures become `FAILED` without blind retries. Failure to persist retry state is surfaced to the worker cycle and logged, so a later poll can recover from the unchanged durable schedule. Retry updates compare the attempted version and occurrence and cannot overwrite a later cancellation/edit or an already committed delivery.

## Verification

`pnpm --filter @nexa/api test:db` discovers every API test suite and runs them sequentially, including contract/unit tests. PostgreSQL suites require a local `nexa_test` database, `NODE_ENV=test`, `ALLOW_DEV_SEED=true`, a valid test `AUTH_ACCESS_SECRET` and `NOTIFICATION_WORKER_ENABLED=false`. Configure these in `apps/api/.env.test` or process environment; credentials stay outside Git. Suites delete only their own fixture IDs.

The reliability suites cover one-connection and concurrent create regressions, constant query counts for lists, inbox read/delete/count behavior, arrivals after read-all, daily/weekly processing, downtime coalescing/end boundaries, future edits/snapshots, inactive users, friendship removal/cancel versus delivery, transaction rollback, transient/permanent failures, retry-write failures and cancellation after failed-delivery rollback. DST gap/overlap and a listening HTTP smoke flow are covered separately. These checks do not establish native push or UI integration.
