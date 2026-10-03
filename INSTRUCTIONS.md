# NEXA — Build Instructions

> **Project:** NEXA — A team notification & scheduling platform
> **Monorepo:** Turborepo + pnpm workspaces
> **Stack:** NestJS (API) · Next.js 15 (Web) · Expo / React Native (Mobile) · TypeScript

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Repository Structure](#2-repository-structure)
3. [Tech Stack & Conventions](#3-tech-stack--conventions)
4. [Development Setup](#4-development-setup)
5. [Feature Roadmap](#5-feature-roadmap)
   - [F1 — Interactive Notifications](#f1--interactive-notifications)
   - [F2 — Event / Group RSVP](#f2--event--group-rsvp)
   - [F3 — Recipient Selector (Team Targeting)](#f3--recipient-selector-team-targeting)
   - [F4 — Calendar View](#f4--calendar-view)
   - [F5 — Todo-Based Scheduling](#f5--todo-based-scheduling)
   - [F6 — Countdown Notifications](#f6--countdown-notifications)
6. [Data Models](#6-data-models)
7. [API Endpoints](#7-api-endpoints)
8. [Shared Packages](#8-shared-packages)
9. [Testing Strategy](#9-testing-strategy)
10. [Coding Standards](#10-coding-standards)

---

## 1. Project Overview

NEXA is a **team notification and scheduling platform** that enables teams to:

- Send interactive, actionable notifications to team members
- Manage event RSVPs with attendance statistics
- Schedule tasks and reminders using a structured Todo system
- View all schedules and events in a unified Calendar
- Track countdown timers for deadlines and milestones

The platform ships as:
- `apps/api` — REST API (NestJS + Fastify)
- `apps/web` — Admin / Dashboard web app (Next.js 15)
- `apps/mobile` — End-user mobile app (Expo / React Native)

---

## 2. Repository Structure

```
nexa/
├── apps/
│   ├── api/              # NestJS backend (port 3001)
│   │   └── src/
│   │       ├── auth/
│   │       ├── users/
│   │       ├── notifications/    ← to be created
│   │       ├── events/           ← to be created
│   │       ├── calendar/         ← to be created
│   │       ├── todos/            ← to be created
│   │       └── countdowns/       ← to be created
│   ├── web/              # Next.js 15 dashboard (port 3000)
│   │   └── src/app/
│   │       ├── (auth)/
│   │       ├── (dashboard)/
│   │       │   ├── notifications/
│   │       │   ├── calendar/
│   │       │   ├── todos/
│   │       │   └── countdowns/
│   └── mobile/           # Expo app
│       └── app/
│           ├── (auth)/
│           ├── (tabs)/
│           │   ├── notifications/
│           │   ├── calendar/
│           │   └── countdowns/
├── packages/
│   ├── types/            # Shared TypeScript types (source of truth)
│   ├── validation/       # Shared Zod schemas
│   ├── api-client/       # Auto-typed HTTP client (fetch-based)
│   └── design-tokens/    # Color / spacing / typography tokens
├── turbo.json
└── package.json
```

---

## 3. Tech Stack & Conventions

| Layer | Technology | Notes |
|---|---|---|
| Monorepo | Turborepo 2 + pnpm 10 | `pnpm` only — no npm/yarn |
| Backend | NestJS 11 + Fastify | Modules, DTOs, Guards, Interceptors |
| Frontend | Next.js 15 (App Router) | React 19, server components by default |
| Mobile | Expo 57 + Expo Router 57 | React Native 0.86 |
| Validation | Zod | Shared via `@nexa/validation` |
| Types | TypeScript 5.7 | Shared via `@nexa/types` |
| API Client | `@nexa/api-client` | Used by both web and mobile |
| Formatting | Prettier | `pnpm format` |
| Lint | ESLint | `pnpm lint` |

### Conventions

- All new types **must** be added to `packages/types/src/index.ts`.
- All new Zod schemas **must** be added to `packages/validation/src/index.ts`.
- Backend modules follow NestJS layered pattern: `controller → service → repository`.
- Frontend pages use the Next.js App Router with server components; interactive pieces are marked `'use client'`.
- Mobile screens use Expo Router file-based routing.
- Avoid duplicating business logic between apps — extract to shared packages whenever possible.
- Follow [`docs/coding-rules.md`](./docs/coding-rules.md) for enforceable lint rules, styling discipline, and per-layer standards.
- Check [`docs/shared-code.md`](./docs/shared-code.md) before writing any date, envelope, label, or pagination helper — the shared version already exists or is planned there.

---

## 4. Development Setup

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 10 (`npm i -g pnpm`)

### Install

```bash
pnpm install
```

### Run all apps concurrently

```bash
pnpm dev
```

### Run specific targets

```bash
# API + Mobile only
pnpm dev:app

# API + Web only
pnpm dev:web
```

### Build

```bash
pnpm build
```

### Test

```bash
pnpm test
```

### Type-check

```bash
pnpm typecheck
```

---

## 5. Feature Roadmap

---

### F1 — Interactive Notifications

**Goal:** Allow notification recipients to take action directly on a notification without navigating away.

#### User Stories

- As a recipient, I can **confirm** that I have completed an action requested in a notification.
- As a recipient, I can **snooze / reschedule** a notification to a later time.
- As an admin, I can define **custom actions** (labels + intent) when creating a notification.

#### Required Actions (extensible enum)

| Action Key | Label | Description |
|---|---|---|
| `confirm` | ✅ Confirm | Mark as done/acknowledged |
| `snooze` | ⏰ Snooze | Pick a new reminder time |
| `dismiss` | ❌ Dismiss | Dismiss without action |

New action types can be added to the `NotificationActionType` enum in `@nexa/types`.

#### API

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/notifications` | Create a new notification |
| `GET` | `/notifications` | List notifications for the current user |
| `GET` | `/notifications/:id` | Get notification detail |
| `POST` | `/notifications/:id/respond` | Submit an action response |
| `PATCH` | `/notifications/:id/snooze` | Reschedule a snoozed notification |

#### Implementation Checklist

- [ ] `NotificationsModule` in `apps/api/src/notifications/`
- [ ] `Notification`, `NotificationAction`, `NotificationResponse` types in `@nexa/types`
- [ ] Zod schemas `CreateNotificationSchema`, `RespondNotificationSchema` in `@nexa/validation`
- [ ] Web: notification list page + action buttons per notification card
- [ ] Mobile: notification card with inline action buttons (Confirm / Snooze / Dismiss)
- [ ] Push notification delivery (e.g., Expo Push Notifications on mobile)

---

### F2 — Event / Group RSVP

**Goal:** Send an event notification to a group; collect attendance responses and display statistics.

#### User Stories

- As an admin, I can create an Event Notification with a title, description, date/time, and location.
- As a recipient, I can respond with **Attending**, **Not Attending**, or **Undecided**.
- As an admin, I can view a real-time breakdown of attendance statistics.

#### RSVP Status Values

| Value | Label |
|---|---|
| `attending` | ✅ Attending |
| `not_attending` | ❌ Not Attending |
| `undecided` | ❓ Undecided |

#### Statistics Response Shape

```ts
interface EventStats {
  eventId: ID;
  attending: number;
  notAttending: number;
  undecided: number;
  total: number;
  responses: EventRSVPResponse[];
}
```

#### API

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/events` | Create event |
| `GET` | `/events` | List all events |
| `GET` | `/events/:id` | Event detail |
| `POST` | `/events/:id/rsvp` | Submit RSVP response |
| `GET` | `/events/:id/stats` | Attendance statistics |

#### Implementation Checklist

- [ ] `EventsModule` in `apps/api/src/events/`
- [ ] `Event`, `EventRSVPResponse`, `RSVPStatus`, `EventStats` types in `@nexa/types`
- [ ] Web: event creation form + stats dashboard (bar chart / attendance counters)
- [ ] Mobile: event detail screen with RSVP action buttons
- [ ] Real-time stats refresh (polling or WebSocket)

---

### F3 — Recipient Selector (Team Targeting)

**Goal:** When creating any notification or event, allow the sender to choose one member, multiple members, or the entire team.

#### Targeting Modes

| Mode | Description |
|---|---|
| `single` | Select exactly one team member |
| `multi` | Select multiple team members via checkbox/tag picker |
| `all` | Broadcast to the entire team |

#### API

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/teams/:teamId/members` | List all members of a team |
| `POST` | `/notifications` | Body includes `recipients` field |
| `POST` | `/events` | Body includes `recipients` field |

#### `recipients` Payload Shape

```ts
// In CreateNotificationDto / CreateEventDto
interface RecipientTarget {
  mode: 'single' | 'multi' | 'all';
  userIds?: ID[];   // required for 'single' and 'multi'
  teamId?: ID;      // required for 'all'
}
```

#### Implementation Checklist

- [ ] `TeamsModule` with `GET /teams/:teamId/members` endpoint
- [ ] `RecipientTarget` type in `@nexa/types`
- [ ] Reusable `<RecipientPicker />` component for web (combobox + tags)
- [ ] Reusable `RecipientPickerModal` component for mobile
- [ ] Backend fan-out: when `mode = 'all'`, resolve all member IDs server-side

---

### F4 — Calendar View

**Goal:** Display a unified calendar showing the user's personal schedule, created notifications, and special/holiday dates.

#### Calendar Data Sources

| Layer | Source | Description |
|---|---|---|
| Schedule | User's personal schedule | Events, meetings, time blocks |
| Notifications | Notifications with a due date | Shown as calendar pins |
| Holidays | Public holidays API or static list | Highlight special dates |

#### Views

- **Month view** — default; cells show summary dots/chips
- **Week view** — detailed time blocks
- **Day view** — hour-by-hour breakdown

#### API

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/calendar/events` | Combined calendar entries for date range |
| `POST` | `/calendar/events` | Create a personal schedule entry |
| `DELETE` | `/calendar/events/:id` | Remove a personal schedule entry |
| `GET` | `/calendar/holidays?year=YYYY` | List holidays for a given year |

#### Query Parameters for `/calendar/events`

```
GET /calendar/events?from=2025-01-01&to=2025-01-31&types=schedule,notification,holiday
```

#### Implementation Checklist

- [ ] `CalendarModule` in `apps/api/src/calendar/`
- [ ] `CalendarEntry`, `CalendarEntryType`, `HolidayEntry` types in `@nexa/types`
- [ ] Web: full-page calendar with month/week/day toggle; use a calendar library (e.g., `react-big-calendar` or `fullcalendar`)
- [ ] Mobile: scrollable agenda / month calendar (e.g., `react-native-calendars`)
- [ ] Color-coding per entry type (schedule, notification, holiday)

---

### F5 — Todo-Based Scheduling

**Goal:** Create reusable Todo List templates with a fixed schedule (e.g., every Monday: Task A, B, C), then apply them to future dates automatically.

#### Core Concepts

| Concept | Description |
|---|---|
| **TodoTemplate** | A named collection of tasks tied to a day-of-week pattern |
| **TodoTask** | An individual task within a template |
| **TodoSchedule** | An instance of a template applied to a specific date range |

#### Recurrence Patterns (initial scope)

| Pattern | Description |
|---|---|
| `weekly` | Repeat on the same day(s) of the week |
| `custom` | User-defined repeat interval (days) |

#### API

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/todos/templates` | Create a new Todo template |
| `GET` | `/todos/templates` | List all templates |
| `GET` | `/todos/templates/:id` | Get template detail |
| `PUT` | `/todos/templates/:id` | Update template |
| `DELETE` | `/todos/templates/:id` | Delete template |
| `POST` | `/todos/templates/:id/apply` | Apply template to a date range |
| `GET` | `/todos/schedules` | List applied schedules |
| `PATCH` | `/todos/schedules/:id/tasks/:taskId` | Toggle task completion |

#### Apply Payload

```ts
interface ApplyTemplateDto {
  startDate: string;   // ISO date (YYYY-MM-DD)
  endDate?: string;    // optional; defaults to +4 weeks
  recurrence: 'weekly' | 'custom';
  intervalDays?: number; // used when recurrence = 'custom'
}
```

#### Implementation Checklist

- [ ] `TodosModule` in `apps/api/src/todos/`
- [ ] `TodoTemplate`, `TodoTask`, `TodoSchedule` types in `@nexa/types`
- [ ] Web: template builder UI (drag-to-reorder tasks, day-of-week picker, apply-to-future button)
- [ ] Mobile: todo schedule viewer + task check-off
- [ ] Calendar integration: applied todo schedules appear on the Calendar (F4)

---

### F6 — Countdown Notifications

**Goal:** Create a countdown timer targeting a specific future date/event; display remaining days/hours/minutes.

#### Use Cases

| Use Case | Example |
|---|---|
| Deadline | "Project submission in 3 days 4 hrs" |
| Birthday | "John's birthday in 12 days" |
| Anniversary | "Our anniversary in 30 days" |
| Custom event | "Team offsite in 7 days" |

#### Countdown Type Enum

```ts
type CountdownType = 'deadline' | 'birthday' | 'anniversary' | 'custom';
```

#### API

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/countdowns` | Create a countdown |
| `GET` | `/countdowns` | List all countdowns for current user |
| `GET` | `/countdowns/:id` | Get countdown detail + remaining time |
| `PATCH` | `/countdowns/:id` | Update countdown |
| `DELETE` | `/countdowns/:id` | Delete countdown |

#### Response Shape

```ts
interface CountdownDetail {
  id: ID;
  title: string;
  type: CountdownType;
  targetDate: string; // ISO 8601
  remaining: {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isPast: boolean;
  };
  createdAt: string;
}
```

#### Notification Triggers

| Trigger | When |
|---|---|
| T-30 days | 30 days before target |
| T-7 days | 7 days before target |
| T-1 day | 1 day before target |
| T-0 | On the day of the event |

#### Implementation Checklist

- [ ] `CountdownsModule` in `apps/api/src/countdowns/`
- [ ] `Countdown`, `CountdownType`, `CountdownDetail` types in `@nexa/types`
- [ ] Web: countdown creation form + dashboard cards with animated countdown display
- [ ] Mobile: countdown list with live-updating countdown widget
- [ ] Scheduled job (NestJS `@nestjs/schedule` + `@nestjs/cron`) to send notifications at trigger times
- [ ] Calendar integration: countdown target dates appear on the Calendar (F4)

---

## 6. Data Models

All types are defined in `packages/types/src/index.ts`. Add new types to that file, following the existing section convention.

### New Types to Add

```ts
// ─── Notifications ───────────────────────────────────────────────────────────

export type NotificationActionType = 'confirm' | 'snooze' | 'dismiss' | string;

export interface NotificationAction {
  key: NotificationActionType;
  label: string;
}

export interface Notification {
  id: ID;
  title: string;
  body: string;
  actions: NotificationAction[];
  recipients: RecipientTarget;
  createdBy: ID;
  dueAt?: string;      // ISO 8601
  createdAt: string;
  updatedAt: string;
}

export interface NotificationResponse {
  id: ID;
  notificationId: ID;
  userId: ID;
  actionKey: NotificationActionType;
  snoozedUntil?: string; // ISO 8601 — populated when actionKey = 'snooze'
  respondedAt: string;
}

// ─── Team Targeting ───────────────────────────────────────────────────────────

export type RecipientMode = 'single' | 'multi' | 'all';

export interface RecipientTarget {
  mode: RecipientMode;
  userIds?: ID[];
  teamId?: ID;
}

// ─── Events / RSVP ───────────────────────────────────────────────────────────

export type RSVPStatus = 'attending' | 'not_attending' | 'undecided';

export interface TeamEvent {
  id: ID;
  title: string;
  description?: string;
  location?: string;
  startAt: string;     // ISO 8601
  endAt?: string;      // ISO 8601
  recipients: RecipientTarget;
  createdBy: ID;
  createdAt: string;
  updatedAt: string;
}

export interface EventRSVPResponse {
  id: ID;
  eventId: ID;
  userId: ID;
  status: RSVPStatus;
  respondedAt: string;
}

export interface EventStats {
  eventId: ID;
  attending: number;
  notAttending: number;
  undecided: number;
  total: number;
  responses: EventRSVPResponse[];
}

// ─── Calendar ─────────────────────────────────────────────────────────────────

export type CalendarEntryType = 'schedule' | 'notification' | 'holiday' | 'countdown' | 'todo';

export interface CalendarEntry {
  id: ID;
  type: CalendarEntryType;
  title: string;
  date: string;         // YYYY-MM-DD
  startTime?: string;   // HH:mm
  endTime?: string;     // HH:mm
  color?: string;
  refId?: ID;           // ID of the originating entity
}

export interface HolidayEntry {
  date: string;         // YYYY-MM-DD
  name: string;
  country: string;
}

// ─── Todos ────────────────────────────────────────────────────────────────────

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Sunday

export interface TodoTask {
  id: ID;
  title: string;
  order: number;
  completed?: boolean;
}

export interface TodoTemplate {
  id: ID;
  name: string;
  tasks: TodoTask[];
  daysOfWeek: DayOfWeek[];
  ownerId: ID;
  createdAt: string;
  updatedAt: string;
}

export interface TodoSchedule {
  id: ID;
  templateId: ID;
  date: string;         // YYYY-MM-DD
  tasks: TodoTask[];    // snapshot of tasks at time of scheduling
  createdAt: string;
}

// ─── Countdowns ───────────────────────────────────────────────────────────────

export type CountdownType = 'deadline' | 'birthday' | 'anniversary' | 'custom';

export interface Countdown {
  id: ID;
  title: string;
  type: CountdownType;
  targetDate: string;   // ISO 8601 date (YYYY-MM-DD)
  ownerId: ID;
  createdAt: string;
  updatedAt: string;
}

export interface CountdownRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
}

export interface CountdownDetail extends Countdown {
  remaining: CountdownRemaining;
}
```

---

## 7. API Endpoints

### Summary Table

| Module | Method | Path | Auth Required |
|---|---|---|---|
| Auth | `POST` | `/auth/login` | No |
| Auth | `POST` | `/auth/refresh` | No |
| Auth | `POST` | `/auth/logout` | Yes |
| Users | `GET` | `/users/me` | Yes |
| Users | `PATCH` | `/users/me` | Yes |
| Teams | `GET` | `/teams/:teamId/members` | Yes |
| Notifications | `POST` | `/notifications` | Yes |
| Notifications | `GET` | `/notifications` | Yes |
| Notifications | `GET` | `/notifications/:id` | Yes |
| Notifications | `POST` | `/notifications/:id/respond` | Yes |
| Notifications | `PATCH` | `/notifications/:id/snooze` | Yes |
| Events | `POST` | `/events` | Yes |
| Events | `GET` | `/events` | Yes |
| Events | `GET` | `/events/:id` | Yes |
| Events | `POST` | `/events/:id/rsvp` | Yes |
| Events | `GET` | `/events/:id/stats` | Yes |
| Calendar | `GET` | `/calendar/events` | Yes |
| Calendar | `POST` | `/calendar/events` | Yes |
| Calendar | `DELETE` | `/calendar/events/:id` | Yes |
| Calendar | `GET` | `/calendar/holidays` | Yes |
| Todos | `POST` | `/todos/templates` | Yes |
| Todos | `GET` | `/todos/templates` | Yes |
| Todos | `GET` | `/todos/templates/:id` | Yes |
| Todos | `PUT` | `/todos/templates/:id` | Yes |
| Todos | `DELETE` | `/todos/templates/:id` | Yes |
| Todos | `POST` | `/todos/templates/:id/apply` | Yes |
| Todos | `GET` | `/todos/schedules` | Yes |
| Todos | `PATCH` | `/todos/schedules/:id/tasks/:taskId` | Yes |
| Countdowns | `POST` | `/countdowns` | Yes |
| Countdowns | `GET` | `/countdowns` | Yes |
| Countdowns | `GET` | `/countdowns/:id` | Yes |
| Countdowns | `PATCH` | `/countdowns/:id` | Yes |
| Countdowns | `DELETE` | `/countdowns/:id` | Yes |

---

## 8. Shared Packages

### `@nexa/types`

- **Path:** `packages/types/src/index.ts`
- Single source of truth for all shared TypeScript interfaces and type aliases.
- Import: `import type { Notification } from '@nexa/types'`

### `@nexa/validation`

- **Path:** `packages/validation/src/index.ts`
- Zod schemas that mirror the types; used for request body validation on the API and form validation on web/mobile.
- Import: `import { CreateNotificationSchema } from '@nexa/validation'`

### `@nexa/api-client`

- **Path:** `packages/api-client/src/`
- Typed fetch wrapper for all API endpoints.
- Every new endpoint must have a corresponding client method.

### `@nexa/design-tokens`

- **Path:** `packages/design-tokens/src/`
- Color palette, spacing scale, typography scale used by both web and mobile.
- Consume in web via CSS variables; in mobile via JavaScript objects.

---

## 9. Testing Strategy

### Backend (NestJS)

- Unit tests for each **Service** class (mock all dependencies).
- Integration tests for each **Controller** (use `@nestjs/testing` `TestingModule`).
- File naming: `*.spec.ts` alongside the source file.
- Run: `pnpm test` (via `turbo run test`).

### Web (Next.js)

- Use **Vitest** + **React Testing Library** for component tests.
- Critical paths to test: notification response flow, RSVP submission, calendar rendering.

### Mobile (Expo)

- Use **Jest** + `@testing-library/react-native`.
- Focus on action handlers and countdown display logic.

---

## 10. Coding Standards

### TypeScript

- Use `interface` for object shapes; `type` for unions, aliases, and primitives.
- Prefer `unknown` over `any`.
- All public API surface must be explicitly typed — no implicit `any`.

### NestJS (API)

- Each feature = its own NestJS **Module** (controller + service + DTOs).
- Use **class-validator** + **class-transformer** for DTO validation.
- Prefix all routes with the feature name (e.g., `/notifications`, `/events`).
- Guard all authenticated routes with a JWT `AuthGuard`.
- Return consistent `ApiResponse<T>` wrapper (defined in `@nexa/types`).

### Next.js (Web)

- Default to **Server Components**; add `'use client'` only when interactivity is needed.
- Colocate page-level data fetching in `page.tsx` using `async` server components.
- Use the `@nexa/api-client` for all HTTP calls; never call `fetch` directly in components.

### Expo / React Native (Mobile)

- Use **Expo Router** file-based routing (`app/` directory).
- Prefer **hooks** to encapsulate data-fetching logic (`useNotifications`, `useCountdowns`, etc.).
- Use `@nexa/design-tokens` for all colors and spacing — avoid hardcoded values.

### General

- All new files must have a brief JSDoc/TSDoc comment at the top of the module.
- Keep functions small and focused (single responsibility).
- Use `pnpm format` before committing to ensure consistent formatting.
