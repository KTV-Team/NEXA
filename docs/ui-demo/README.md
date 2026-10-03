# NEXA — UI/UX prototype

A clickable, high-fidelity prototype of the entire NEXA system, built as plain
HTML + CSS + JavaScript so it can be reviewed and frozen **before** the Next.js 15
web app and the Expo / React Native app are written.

Open **[`index.html`](./index.html)** — that is the review entry point.

```text
docs/ui-demo/
├── index.html                  ← gallery: every screen, framed and linked
├── styleguide.html             ← the design system as implemented
│
├── login.html  register.html  forgot-password.html  verify-otp.html
│
├── m-notifications.html        F1  interactive notifications (inbox)
├── m-notification-detail.html  F1  single notification + action history
├── notification-new.html       F1  + F3  three-step composer
├── m-events.html               F2  event list with inline RSVP
├── event-detail.html           F2  attendance statistics + responses
├── event-new.html              F2  + F3  event composer
├── m-calendar.html             F4  month / week / day
├── m-countdowns.html           F6  live timers
├── countdown-new.html          F6  create a countdown
├── m-todos.html                F5  today's checklist + templates
├── m-profile.html                  account & preferences
│
├── dashboard.html              web  overview
├── notifications.html          web  F1 + F3 management + composer
├── events.html                 web  F2 statistics
├── calendar.html               web  F4 full-page calendar
├── todos.html                  web  F5 template builder
├── countdowns.html             web  F6
├── team.html                   web  F3 roster & targeting
├── settings.html               web  account & workspace
│
├── assets/
│   ├── tokens.css              design tokens (mirrors @nexa/design-tokens)
│   ├── components.css          component recipes from DESIGN.md
│   ├── auth.css                auth surface layout
│   ├── gallery.css             gallery + documentation layout
│   ├── icons.js                inline SVG icon set
│   ├── data.js                 mock dataset in the shape of @nexa/types
│   ├── ui.js                   UI kit: shells, renderers, interactions
│   ├── screens.js              generated gallery manifest
│   └── <page>.js               one script per page
├── tools/
│   ├── pages.mjs               screen manifest (viewport, feature, copy)
│   ├── cdp-check.mjs           headless render + overflow/contrast/console checks
│   ├── check-links.mjs         every internal reference resolves
│   ├── check-tokens.mjs        no raw hex / radius / font-size outside tokens.css
│   ├── check-hygiene.mjs       valid UTF-8, no BOM, every script parses
│   ├── summarize-sweep.mjs     one-line verdict per page from a sweep
│   ├── fix-encoding.mjs        repair a cp1252/UTF-8 round-trip (if it ever recurs)
│   └── build-manifest.mjs      regenerate assets/screens.js
├── BUILD-SPEC.md               contract every screen follows
└── .shots/                     generated screenshots (device + full page)
```

## How to review it

Everything runs from the filesystem — no server, no install, no network:

1. Open `docs/ui-demo/index.html` in Chrome or Edge.
2. Walk a feature end to end, for example F1:
   `login.html` → `m-notifications.html` → Confirm / Snooze / Dismiss →
   `notification-new.html` → send one and watch it land in the inbox.
3. Switch surfaces for the same feature: the mobile RSVP flow in
   `m-events.html` versus the admin statistics in `events.html`.
4. Check the design system in `styleguide.html` before signing off on styling.

Interactions are real within the prototype: confirming a notification, changing
an RSVP, ticking a todo task, filtering the calendar, or resizing a countdown all
mutate shared state and persist to `localStorage`, so a decision made in one
screen is visible in the others (the dashboard, the calendar, the event stats).

## What is real and what is mocked

| Real | Mocked |
|---|---|
| Every layout, token, and responsive breakpoint | The NestJS API — state lives in `assets/data.js` + `localStorage` |
| Validation rules, error, empty, and loading states | Authentication — any credentials sign in |
| Feature interactions (F1–F6) and cross-screen state | Push notification delivery, WebSocket stat refresh |
| The data shapes (`Notification`, `TeamEvent`, `EventStats`, `CalendarEntry`, `TodoTemplate`, `TodoSchedule`, `Countdown`) | Anything requiring a server clock or a second device |

## Design system

The prototype is locked to [`DESIGN.md`](../../DESIGN.md) and
[`@nexa/design-tokens`](../../packages/design-tokens/src/index.ts):
cream canvas, near-black primary CTAs, six saturated surfaces cycled
pink → teal → lavender → peach → ochre → cream, display type at weight 500 with
negative tracking, Inter everywhere else, and no heavy shadows. `assets/tokens.css`
carries the same names as the package (`--color-brand-pink`, `--space-lg`,
`--radius-xl`, `--text-display-md-size`) so the values port without translation.

## Regenerating screenshots and checking the prototype

```bash
node docs/ui-demo/tools/cdp-check.mjs                 # every screen
node docs/ui-demo/tools/cdp-check.mjs calendar.html   # one screen
node docs/ui-demo/tools/cdp-check.mjs dashboard.html@1024   # a responsive breakpoint

node docs/ui-demo/tools/summarize-sweep.mjs           # one-line verdict per page
node docs/ui-demo/tools/check-links.mjs               # every internal reference resolves
node docs/ui-demo/tools/check-tokens.mjs              # no raw colour/radius/font-size
node docs/ui-demo/tools/check-hygiene.mjs             # UTF-8, no BOM, scripts parse
node docs/ui-demo/tools/build-manifest.mjs            # refresh the gallery index
```

`cdp-check.mjs` drives headless Chrome over the DevTools Protocol and reports, per
page: horizontal overflow (must be `0`), text with a collapsed box, text clipped
without an ellipsis, text at the same colour as its background, console errors,
failed sub-resources, and the rendered heading (which proves the shell mounted).
It writes `<name>.png` (device frame) plus `<name>.full.png` (whole page) into
`.shots/`.

Append `@<width>` to check a responsive state — e.g. `dashboard.html@1024` for
the collapsed sidebar, `dashboard.html@768` for the stacked layout. The 430px
mobile viewports are emulated with `mobile: true`, which is what Chrome requires
before it will honour a sub-500px layout viewport.

> **Windows note:** never rewrite these files with a PowerShell
> `Get-Content | Set-Content` round trip — it decodes UTF-8 as cp1252 and turns
> every `—` into `â€"`. Use the Node scripts above, and run
> `check-hygiene.mjs` (or `fix-encoding.mjs`) if it ever happens.

## Adding a screen

1. Read [`BUILD-SPEC.md`](./BUILD-SPEC.md) — it documents the page skeleton, the
   full `window.NEXA` API, the interaction contract, and the copy deck.
2. Add an entry to `tools/pages.mjs`.
3. Build the page as `<name>.html` + `assets/<name>.js`.
4. Run the checker, look at the screenshot, and fix overflow before shipping.
5. Run `build-manifest.mjs` so the gallery picks it up.

## From prototype to production

| Prototype artefact | Becomes |
|---|---|
| `shellWeb()` | `apps/web` route group `(dashboard)/layout.tsx` + sidebar/topbar components |
| `shellMobile()` | `apps/mobile/app/(tabs)/_layout.tsx` + the tab bar and app bar |
| `notifCard()` | `<NotificationCard />` in `apps/web` and `apps/mobile` |
| `eventCard()` / `statBar()` | `<EventCard />`, `<AttendanceStats />` |
| `recipientPicker()` | `<RecipientPicker />` (web) and `RecipientPickerModal` (mobile) — feature F3 |
| `calendarMonth/Week/Day` | Calendar views built on `react-big-calendar` (web) and `react-native-calendars` (mobile) |
| the task template builder | `TodoTemplateBuilder` on `/todos` |
| `assets/data.js` shapes | `@nexa/types` interfaces and the NestJS DTOs |
| `assets/tokens.css` | `packages/design-tokens` + `apps/web/src/app/globals.css` |
