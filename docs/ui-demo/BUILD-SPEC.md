# NEXA UI demo — build spec

Contract for every page in `docs/ui-demo/`. Read this before adding a screen.
The prototype exists to **lock UI/UX before the Next.js / React Native build**,
so markup decisions here become component boundaries later.

## 1 · Ground rules

1. **No build step, no network.** Plain HTML + CSS + JS, opened straight from
   the filesystem (`file://`). No CDN, no fonts to download, no bundler, no
   `fetch` to a server. Inter / Plain Black are referenced by name and fall back
   gracefully.
2. **No inline `<script>`.** Every page loads classic scripts in this order:
   ```html
   <script src="assets/icons.js"></script>
   <script src="assets/data.js"></script>
   <script src="assets/ui.js"></script>
   <script src="assets/<page>.js"></script>
   ```
3. **Design tokens only.** Never write a raw hex, px radius, or font size in a
   page. Use `var(--color-*)`, `var(--space-*)`, `var(--radius-*)`,
   `var(--text-*-size)`, `var(--font-*)`, `var(--shadow-*)`, or the utility
   classes from `tokens.css`. The one exception is a data-driven colour passed
   through `style="background-color: var(--color-brand-pink)"` — the variable
   name, never the hex.
4. **DESIGN.md contracts hold everywhere:**
   - cream canvas floor (`--color-canvas`); never a cool grey page, never a dark
     footer;
   - one primary ink CTA per view (near-black), secondary actions are hairline
     outlined;
   - the six saturated surfaces are `brand-pink`, `brand-teal`, `brand-lavender`,
     `brand-peach`, `brand-ochre`, `surface-card` — never a seventh, never the
     same one twice in a row;
   - radii: `md` 12px for buttons/inputs, `lg` 16px for cards, `xl` 24px for
     feature/hero cards;
   - display type is weight 500 with negative tracking (`.t-display-*`), body
     and UI are Inter (`.t-body*`, `.t-title*`, `.t-caption`);
   - depth comes from saturated colour on cream — no heavy shadows.
5. **English UI copy**, sentence case, second person. Empty states explain what
   will appear and offer the next action.
6. **Accessibility:** real `<button>` / `<a>` / `<label for>`, `aria-label` on
   icon-only controls, visible focus comes free from `:focus-visible`. Every
   interactive control is at least 44px tall on mobile.

## 2 · Page skeleton

Every page is one of two shapes.

### Mobile screen

`<html>` → `<body class="mobile" data-page="m-notifications">`, viewport meta
with `viewport-fit=cover`, and a template the bootstrap replaces:

```html
<body class="mobile" data-page="m-events">
  <template id="page-template"><div data-slot="shell"></div></template>
  …scripts…
</body>
```

The page script renders `shellMobile()` into `[data-slot="shell"]` and handles
its own interactions:

```js
(() => {
  const N = window.NEXA;
  function render() {
    N.$('[data-slot="shell"]').innerHTML = N.shellMobile({ … });
    /* wire local interactions */
  }
  N.page('m-events', () => { N.live(render); render(); });
})();
```

### Web page

`<body data-page="notifications">` with the same template, rendering
`shellWeb()`. The web shell supplies the sidebar, topbar, quick-create sheet, and
page padding; a page only contributes its body.

```js
N.$('[data-slot="shell"]').innerHTML = N.shellWeb({
  active: 'notifications.html',
  breadcrumb: 'Engage',
  title: 'Notifications',
  actions: `<a class="btn btn-primary" href="notification-new.html">New notification</a>`,
  body: `…page sections…`,
});
```

`data-page` must match the key passed to `NEXA.page()`, otherwise nothing
renders. Full-page reference implementations: `m-notifications.html` +
`assets/m-notifications.js` (mobile), `dashboard.html` + `assets/dashboard.js`
(web).

## 3 · Available API (`window.NEXA`)

**Shells**
| Call | Notes |
|---|---|
| `shellMobile({active,title,subtitle,back,actions,body,appbar,fab,flush,hideTabbar,hideAppbar})` | `active` matches a `NAV_MOBILE` href; `fab` is raw HTML for the floating action button; `flush` removes body padding for edge-to-edge content; `back` is a href. |
| `shellWeb({active,breadcrumb,title,subtitle,actions,body,search})` | `search:false` hides the topbar search; `actions` is raw HTML placed under the title. |
| `quickCreateSheet()` | Already mounted inside `shellWeb`; open it with `data-open="quick-create"`. Mobile pages mount their own if they need one. |

**Business renderers**
| Call | Notes |
|---|---|
| `notifCard(notification, {detail,actions})` | Full F1 card with live Confirm/Snooze/Dismiss buttons (handled globally). Pass `detail:true` for a Detail button. |
| `notifStatus(notification)` | Just the state chip. |
| `eventCard(event, {ctaLabel,showStats})` | F2 card: time, place, avatar stack, attendance bar, link to `event-detail.html?id=`. |
| `statBar(counts, total)` | Attending / not attending / undecided breakdown with the awaiting-reply count. |
| `progressBar({attending,notAttending,undecided})` | Attendance split bar (green / red / amber) — RSVP only. |
| `progressTodo(done, total)` | Single-value completion bar (one green fill) — todo and checklist progress. Never use the attendance bar for tasks. |
| `recipientPicker({mode,selected,idPrefix})` + `wireRecipientPicker(el)` | F3 selector. After rendering, call `wireRecipientPicker(N.$('[data-recipient-picker]'))`. |
| `calendarMonth({month,selected})` | F4 month grid — 6 weeks, Monday-first, `data-day` buttons, type dots. |
| `calendarWeek({anchor})`, `timelineDay(day)`, `calendarAgenda(from,to)`, `monthDays(date)` | F4 views + the raw 42-day date list. |
| `avatar(userOrId,{size:'sm'|'lg'|'xl'})`, `avatarStack(ids,{max,size})` | Deterministic colour per user. |
| `emptyState(title, body, ctaHtml)` | Dashed placeholder for empty/zero states. |
| `field(label, control, {hint,error,optional})`, `input({icon,placeholder,value,type})`, `textarea`, `select({options,value})`, `check(label,{checked,hint})`, `switchControl(label,{checked,hint})`, `segmented(items,active)` | Form primitives — use these instead of hand-written inputs. |
| `toast(message, {tone:'success'|'error'})` | Non-blocking confirmation. |
| `confirmDialog(title, body, confirmLabel)` → `Promise<boolean>` | Destructive actions. |
| `openSheet(id)` / `closeSheet(id)` / `confirmDialog` | Overlays. A `.scrim` closes when the backdrop or any `[data-close]` inside it is clicked. |
| `icon(name,{size,cls})` | Any key from `assets/icons.js`. In static markup use `<span data-icon="bell" data-size="18"></span>` — the bootstrap hydrates it. |

**Formatting** — `fmtTime(iso)`, `fmtDay(day)`, `fmtRelative(iso)`,
`fmtRange(start,end)`, `monthLabel(date)`, `weekDays(date)`,
`monthDays(date)`, `toDayStr(date)`, `parseDay(day)`, `dayDiff(a,b)`,
`isoDay(offset)`, `isoTime(dayOffset,hour,minute)`.

**Data & mutations** — `state.data.{notifications,events,countdowns,todos,templates}`,
`ME`, `TEAM`, `USERS`, `userById(id)`, `notifById`, `eventById`,
`countdownById`, `templateById`, `eventStats(event)`,
`countdownRemaining(targetDate)`, `entriesOn(day)`, `unreadCount()`,
`pendingRsvpCount()`, `notifyAction(id,action)`, `setRsvp(eventId,status)`,
`toggleTask(scheduleId,taskId)`, `persist()`.
Mutations fire no event themselves; dispatch
`document.dispatchEvent(new CustomEvent('nexa:changed'))` after a local change so
`NEXA.live` re-renders.

Metadata maps: `CAL_TYPE_META` (schedule / notification / holiday / countdown /
todo → label + dot colour), `COUNTDOWN_TYPE_META`, `RSVP_META`,
`ACTION_LABELS`.

**Helpers** — `$`, `$$`, `esc`, `param(key)`, `page(name, fn)`, `mount()`,
`live(fn)`.

## 4 · Interaction contract

Every screen must feel like the product, using local state and toasts:

| Feature | Screen | Interaction |
|---|---|---|
| F1 | `m-notifications.html`, `notifications.html` | Confirm / Snooze / Dismiss mutate the notification and persist; the card shows the resulting state chip; a toast confirms. Filters and grouping react. |
| F1 | `notification-new.html`, `notifications.html?compose=1` | Composer: title, body, custom action set, due date, recipient target. Submitting shows a success sheet with a summary and returns to the list. |
| F2 | `m-events.html`, `events.html` | RSVP segmented buttons write `myStatus`; the attendance bar, avatar stack, and counters update immediately. |
| F2 | `event-detail.html` | RSVP control plus per-person response table and stats. |
| F3 | both composers | Receiver mode switch changes the panel: one person (radio list + search), several (checkbox list + chips + select all), whole team (fan-out explanation). |
| F4 | `m-calendar.html`, `calendar.html` | Month / week / day toggle, prev / next / today, day cells with type dots, selecting a day drives the agenda below. Legend per entry type. |
| F5 | `todos.html`, `m-todos.html` | Template list, task check-off (strike-through + persisted), day-of-week pattern chips, drag handles visible, "Apply to dates" sheet with recurrence + range and a preview of generated days. Mobile shows today's checklist with progress. |
| F6 | `m-countdowns.html`, `countdowns.html` | Live ticking timers (1s interval), type filter, create form with target date, upcoming vs past grouping, calendar cross-link. |
| Auth | `login.html`, `register.html`, `forgot-password.html`, `verify-otp.html` | Client-side validation with inline errors, disabled submit until valid, success path navigates to `m-notifications.html`. |

Rules: validate before showing success; never use `alert()`; destructive actions
go through `confirmDialog`; a `file://` page must still work with localStorage
unavailable (the in-memory state is enough).

## 5 · Screen inventory

| File | Viewport | Surface | Feature | Owner |
|---|---|---|---|---|
| `index.html` | desktop | gallery | — | prototype shell |
| `styleguide.html` | desktop | reference | design system | prototype shell |
| `login.html` | 430×932 | auth | — | auth |
| `register.html` | 430×932 | auth | — | auth |
| `forgot-password.html` | 430×932 | auth | — | auth |
| `verify-otp.html` | 430×932 | auth | — | auth |
| `m-notifications.html` | 430×932 | mobile | F1 | reference |
| `m-notification-detail.html` | 430×932 | mobile | F1 | mobile A |
| `notification-new.html` | 430×932 | mobile | F1 + F3 | composer |
| `event-new.html` | 430×932 | mobile | F2 + F3 | composer |
| `m-events.html` | 430×932 | mobile | F2 | mobile B |
| `event-detail.html` | 430×932 | mobile | F2 | mobile A |
| `m-calendar.html` | 430×932 | mobile | F4 | mobile B |
| `m-countdowns.html` | 430×932 | mobile | F6 | mobile B |
| `countdown-new.html` | 430×932 | mobile | F6 | composer |
| `m-todos.html` | 430×932 | mobile | F5 | mobile A |
| `m-profile.html` | 430×932 | mobile | account | mobile A |
| `dashboard.html` | desktop | web | overview | reference |
| `notifications.html` | desktop | web | F1 + F3 | web A |
| `events.html` | desktop | web | F2 | web B |
| `calendar.html` | desktop | web | F4 | web B |
| `todos.html` | desktop | web | F5 | web A |
| `countdowns.html` | desktop | web | F6 | web B |
| `team.html` | desktop | web | F3 roster | web B |
| `settings.html` | desktop | web | account | web B |

## 6 · Copy deck

Names, roles, and titles come from `assets/data.js` — never invent people.
Product nouns: **notification**, **event**, **RSVP**, **calendar entry**,
**todo template**, **todo schedule**, **countdown**, **recipient target**.
Navigation labels: Inbox, Calendar, Timers, Todos, Profile (mobile); Dashboard,
Notifications, Events, Calendar, Todo templates, Countdowns, Team, Settings (web).

## 7 · Registering a new page

1. Add the file to the `PAGES` map in `tools/cdp-check.mjs` with its viewport.
2. Add it to `NAV_WEB` / `NAV_MOBILE` in `assets/ui.js` only if it is a
   first-class destination.
3. Add a card to `index.html` and, if it introduces a pattern, a section to
   `styleguide.html`.
4. Run `node tools/cdp-check.mjs <file>.html` and fix overflow / errors before
   calling it done.
5. Run `node tools/build-manifest.mjs` so the gallery picks the screen up.

## 8 · Verification

```bash
node docs/ui-demo/tools/cdp-check.mjs                # every page
node docs/ui-demo/tools/cdp-check.mjs calendar.html  # one page
node docs/ui-demo/tools/cdp-check.mjs dashboard.html@1024   # a breakpoint

node docs/ui-demo/tools/summarize-sweep.mjs          # one line per page
node docs/ui-demo/tools/check-links.mjs              # internal references
node docs/ui-demo/tools/check-tokens.mjs             # no raw design values
node docs/ui-demo/tools/check-hygiene.mjs            # UTF-8 / BOM / parse
```

`cdp-check.mjs` drives headless Chrome over the DevTools Protocol and reports, per
page:

| Field | Must be | Meaning |
|---|---|---|
| `overflow` | `0` | `scrollWidth - clientWidth`, i.e. horizontal scroll |
| `offenders` | `[]` | elements wider than the viewport (a `.scroll-x` strip is fine) |
| `invisible` | `[]` | text node with a collapsed box — invisible text |
| `clipped` | `[]` | text hidden by `overflow:hidden` with no ellipsis |
| `lowContrast` | `[]` | text at ~the same colour as its background (invisible) |
| `consoleErrors` | `[]` | anything logged at `console.error` |
| `loadFailures` | `[]` | failed sub-resource requests |
| `heading` | non-null | proves the shell mounted and the page rendered |
| `viewportWarning` | `null` | the emulated width actually applied |

It writes `<name>.png` (device frame) and `<name>.full.png` (whole page) into
`.shots/`, so a reviewer can see below-the-fold content without scrolling.

**Three passes must be clean before a screen is done:** `cdp-check`,
`check-links`, `check-tokens`. `check-hygiene` guards the shared files against
encoding damage and syntax breakage.

> **Windows:** never edit these files through a PowerShell `Get-Content |
> Set-Content` round trip. It decodes UTF-8 as cp1252 and corrupts every em dash
> and middot across the whole file. Use Node (`tools/fix-encoding.mjs` reverses
> the damage if it happens).
