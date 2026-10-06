# NEXA Project Instructions

## Product scope

NEXA is a personal and team planning app for web and mobile. Implement the requirements in the supplied feature brief:

| ID | Feature | Required behavior |
|---|---|---|
| **F01** | Interactive Notification | Let recipients respond to a notification (for example, acknowledge or reschedule); save the response and update its status. Allow action types to grow by notification type. |
| **F02** | Event / Group RSVP | Notify members about an upcoming event and collect **Attending / Not attending / Unsure** responses. Show respondents and totals; support reminders as needed. |
| **F03** | Team Recipient Selection | Let a sender select one member, several members, or the whole team. Enforce recipient visibility and team permissions before sending. |
| **F04** | Calendar | Show schedules, created notifications, holidays, and special dates in day, week, and month views. Open a calendar item and navigate to its related schedule or notification; allow filtering by item type or team. |
| **F05** | Todo-based Scheduling | Create a reusable todo list organized by weekday and time, then apply it to another date or week. Applied tasks must be editable without changing the source template. |
| **F06** | Todo Sharing / Template Library | Publish templates to a shared, searchable library where users can discover, download, and apply them without being friends. Support template details such as author, topics, or tags when available. |
| **F07** | Countdown Notification | Create a countdown for a date, time, deadline, or event; keep the remaining time current and optionally send reminders. |
| **F08** | Authentication | Support account registration, login, logout, input validation, and authentication/session state. |
| **F09** | Notification Management | Create, view, edit, delete, send immediately, or schedule notifications. Display lifecycle states such as **Draft**, **Scheduled**, **Sent**, and **Cancelled**. |
| **F10** | Notification Center | Provide an inbox for received notifications with details, read/unread state, mark-as-read, delete, filtering, and access to notification actions. |
| **F11** | Schedule / Event Management | Create, view, edit, and delete schedules or events with date, time, location, notes, and reminders. Feed these items to Calendar and support RSVP for events. |
| **F12** | Todo List Management | Create, view, edit, delete, and complete todos; support deadlines, priority, notes, and status. Provide the todo data used by scheduling and template features. |
| **F13** | Team Management | Create and rename teams, view members, invite or remove members, and leave a team. Keep roles such as owner/admin/member extensible. |
| **F14** | Account Management | View and edit profile details, change a password, and support forgot/reset password flows. Keep profile and account settings separate from sign-in flows. |

## Implementation guidance

- Keep web, mobile, API, and shared packages within the existing pnpm/Turborepo workspace. Put shared types and validation in `packages/types` and `packages/validation`.
- Validate inputs at API boundaries and enforce ownership, authentication, and team membership for private data. Public templates must be discoverable without a friendship relationship.
- Applying a todo template must create an independently editable copy; changes to the copy must not alter the source template.
- Keep calendar items, reminders, notification states, RSVP responses, and recipient visibility consistent across clients. Use the shared design tokens for UI styling.
- Treat the feature brief as target scope. Do not document a feature as shipped unless it is implemented.
