/* ───────────────────────────────────────────────────────────────────────────
   NEXA UI demo — UI kit
   Shells (web sidebar / mobile app bar + tab bar), business renderers, mock
   persistence, and the interaction handlers for every screen in the prototype.

   Public surface — window.NEXA:
     shellWeb({active, title, subtitle, actions, body, search})
     shellMobile({active, title, back, actions, body, appbar, fab, flush})
     notifCard / eventCard / statBar / avatar / avatarStack / progressBar
     calendarMonth / calendarWeek / calendarAgenda / timelineDay
     field / input / textarea / select / check / switchControl / segmented
     toast / openSheet / closeSheet / openModal / closeModal / confirmDialog
     fmtDay / fmtTime / fmtRelative / fmtRange / monthLabel / weekDays
     notifyAction / setRsvp / toggleTask / state
   ─────────────────────────────────────────────────────────────────────────── */

const NEXA = {};

// ── Tiny DOM helpers ────────────────────────────────────────────────────────

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// ── Formatting ──────────────────────────────────────────────────────────────

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function fmtTime(iso) {
  if (!iso) return '';
  const d = iso.length === 5 ? null : new Date(iso);
  if (!d) return iso;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function fmtDay(day) {
  const d = parseDay(day);
  const diff = dayDiff(isoDay(0), day);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return `${DOW_LONG[d.getDay()].slice(0, 3)} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
}

function monthLabel(d) {
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function fmtRelative(iso) {
  const then = new Date(iso).getTime();
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short' });
}

function fmtRange(startIso, endIso) {
  const s = new Date(startIso);
  const e = endIso ? new Date(endIso) : null;
  const date = `${DOW_LONG[s.getDay()].slice(0, 3)} ${s.getDate()} ${MONTHS[s.getMonth()].slice(0, 3)}`;
  if (!e) return `${date} · ${fmtTime(startIso)}`;
  const sameDay = s.toDateString() === e.toDateString();
  return sameDay
    ? `${date} · ${fmtTime(startIso)}–${fmtTime(endIso)}`
    : `${date} ${fmtTime(startIso)} → ${DOW_LONG[e.getDay()].slice(0, 3)} ${e.getDate()} ${MONTHS[e.getMonth()].slice(0, 3)} ${fmtTime(endIso)}`;
}

/** Six-week grid (42 days) covering the month that contains `d`. */
function monthDays(d) {
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

/** Monday-first week containing `d`. */
function weekDays(d) {
  const start = new Date(d);
  const shift = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - shift);
  return Array.from({ length: 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

function toDayStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Mock persistence ────────────────────────────────────────────────────────
// The prototype keeps the seed arrays in memory and mirrors mutations into
// localStorage so a reload continues where the review left off. Nothing here is
// API-shaped on purpose — the real state arrives with the NestJS modules.

const STORE_KEY = 'nexa.ui-demo.v1';

const state = {
  data: {
    notifications: NOTIFICATIONS,
    events: EVENTS,
    countdowns: COUNTDOWNS,
    todos: TODO_SCHEDULES,
    templates: TODO_TEMPLATES,
    calendar: CALENDAR,
  },
};

function persist() {
  try {
    const d = state.data;
    localStorage.setItem(
      STORE_KEY,
      JSON.stringify({
        notifications: d.notifications,
        events: d.events,
        countdowns: d.countdowns,
        todos: d.todos,
        templates: d.templates,
      }),
    );
  } catch {
    /* file:// with storage disabled — the in-memory copy still works. */
  }
}

function rehydrate() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    Object.assign(state.data, saved);
  } catch {
    /* ignore malformed payloads */
  }
}

function notifById(id) {
  return state.data.notifications.find((n) => n.id === id);
}
function eventById(id) {
  return state.data.events.find((e) => e.id === id);
}
function countdownById(id) {
  return state.data.countdowns.find((c) => c.id === id);
}
function templateById(id) {
  return state.data.templates.find((t) => t.id === id);
}

// ── Interaction handlers (the demo's "API calls") ───────────────────────────

/**
 * POST /notifications/:id/respond — applied locally.
 * @param {string} id notification id
 * @param {'confirm'|'snooze'|'dismiss'} actionKey
 * @param {string} [snoozedUntil] ISO timestamp when actionKey is 'snooze'
 */
function notifyAction(id, actionKey, snoozedUntil) {
  const n = notifById(id);
  if (!n) return;
  n.response = {
    actionKey,
    respondedAt: new Date().toISOString(),
    snoozedUntil: actionKey === 'snooze' ? snoozedUntil ?? isoTime(1, 9, 0) : null,
  };
  n.read = true;
  persist();
  return n;
}

/** POST /events/:id/rsvp */
function setRsvp(eventId, status) {
  const e = eventById(eventId);
  if (!e) return;
  e.myStatus = status;
  const mine = e.responses.find((r) => r.userId === ME.id);
  if (mine) {
    mine.status = status;
    mine.respondedAt = new Date().toISOString();
  } else {
    e.responses.push({ userId: ME.id, status, respondedAt: new Date().toISOString() });
  }
  persist();
  return e;
}

/** PATCH /todos/schedules/:id/tasks/:taskId */
function toggleTask(scheduleId, taskId) {
  const s = state.data.todos.find((t) => t.id === scheduleId);
  if (!s) return;
  const i = s.completed.indexOf(taskId);
  if (i >= 0) s.completed.splice(i, 1);
  else s.completed.push(taskId);
  persist();
  return s;
}

const unreadCount = () => state.data.notifications.filter((n) => !n.response.actionKey).length;
const pendingRsvpCount = () => state.data.events.filter((e) => !e.myStatus).length;

// ── Small renderers ─────────────────────────────────────────────────────────

function avatar(userOrId, opts = {}) {
  const u = typeof userOrId === 'string' ? userById(userOrId) : userOrId;
  const size = opts.size === 'sm' ? 'avatar-sm' : opts.size === 'lg' ? 'avatar-lg' : opts.size === 'xl' ? 'avatar-xl' : '';
  const initials = u.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('');
  return `<span class="avatar ${size}" style="background-color: var(--avatar-${u.avatarColor ?? 1})" title="${esc(u.name)}">${esc(initials)}</span>`;
}

function avatarStack(userIds, opts = {}) {
  const max = opts.max ?? 4;
  const shown = userIds.slice(0, max);
  const rest = userIds.length - shown.length;
  return `<span class="avatar-stack ${opts.size === 'sm' ? 'avatar-stack-sm' : ''}">${shown
    .map((id) => avatar(id, { size: opts.size ?? 'sm' }))
    .join('')}${
    rest > 0
      ? `<span class="avatar avatar-sm" style="background-color: var(--color-surface-strong); color: var(--color-ink)">+${rest}</span>`
      : ''
  }</span>`;
}

function progressBar(counts) {
  const total = Math.max(1, counts.attending + counts.notAttending + counts.undecided);
  const pct = (n) => (n / total) * 100;
  return `<div class="progress">
    <span class="progress-attending" style="width:${pct(counts.attending)}%"></span>
    <span class="progress-not" style="width:${pct(counts.notAttending)}%"></span>
    <span class="progress-undecided" style="width:${pct(counts.undecided)}%"></span>
  </div>`;
}

/**
 * Single-value progress bar for task completion (F5). Distinct from
 * `progressBar`, which splits an attendance count into three statuses.
 * @param {number} done
 * @param {number} total
 */
function progressTodo(done, total) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return `<div class="progress" role="progressbar" aria-valuenow="${done}" aria-valuemin="0" aria-valuemax="${total}">
    <span class="progress-done" style="width:${pct}%"></span>
  </div>`;
}

/**
 * F2 statistics block: split bar plus a legend row and the awaiting-reply count.
 * Accepts either key style — `eventStats()` returns camelCase (`notAttending`)
 * while the RSVP status enum is snake_case (`not_attending`) — so a caller can
 * pass an `eventStats()` object straight through.
 * @param {{attending:number, notAttending?:number, not_attending?:number, undecided:number}} counts
 * @param {number} [total]
 */
function statBar(counts, total) {
  const pick = (camel, snake) => counts[camel] ?? counts[snake] ?? 0;
  const resolved = {
    attending: pick('attending', 'attending'),
    notAttending: pick('notAttending', 'not_attending'),
    undecided: pick('undecided', 'undecided'),
  };
  const answered = resolved.attending + resolved.notAttending + resolved.undecided;
  const awaiting = Math.max(0, (total ?? answered) - answered);

  const items = [
    { key: 'attending', label: 'Attending', tone: 'success' },
    { key: 'notAttending', label: 'Not attending', tone: 'error' },
    { key: 'undecided', label: 'Undecided', tone: 'warning' },
  ];
  return `<div class="stack gap-sm">
    ${progressBar(resolved)}
    <div class="row wrap gap-md">
      ${items
        .map(
          (i) => `<span class="row gap-xs t-body-sm">
            <span class="cal-dot" style="background-color: var(--color-${i.tone})"></span>
            <strong class="t-num" style="color:var(--color-ink)">${resolved[i.key]}</strong>
            <span class="c-muted">${i.label}</span>
          </span>`,
        )
        .join('')}
      <span class="row gap-xs t-body-sm" style="margin-left:auto">
        <span class="c-muted">Awaiting reply</span>
        <strong class="t-num c-ink">${awaiting}</strong>
      </span>
    </div>
  </div>`;
}

function actionButtons(n, opts = {}) {
  const a = n.response.actionKey;
  return `<div class="notif-actions">
    ${n.actions
      .map((key) => {
        const active = a === key;
        const cls = active ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
        const iconName = key === 'confirm' ? 'check' : key === 'snooze' ? 'snooze' : 'x';
        return `<button class="${cls}" data-act="${key}" data-notif="${n.id}" ${active ? 'aria-pressed="true"' : ''}>${icon(iconName, {
          size: 15,
        })} ${ACTION_LABELS[key] ?? key}</button>`;
      })
      .join('')}
    ${opts.detail ? `<button class="btn btn-secondary btn-sm" data-notif-open="${n.id}">Detail</button>` : ''}
  </div>`;
}

/** State chip for a notification's response. */
function notifStatus(n) {
  const a = n.response.actionKey;
  if (!a) return `<span class="badge badge-outline c-muted">Awaiting you</span>`;
  if (a === 'confirm') return `<span class="badge badge-success">${icon('check', { size: 13 })} Confirmed</span>`;
  if (a === 'dismiss') return `<span class="badge badge-outline c-muted">${icon('x', { size: 13 })} Dismissed</span>`;
  // A snoozed notification points at a FUTURE time, so fmtRelative's past-tense
  // formatting would read "just now" — describe the wake-up time instead.
  const when = n.response.snoozedUntil ? new Date(n.response.snoozedUntil) : null;
  const label = when
    ? `${fmtDay(toDayStr(when))} ${fmtTime(n.response.snoozedUntil)}`
    : 'Snoozed';
  return `<span class="badge badge-warning">${icon('snooze', { size: 13 })} Snoozed → ${esc(label)}</span>`;
}

function notifCard(n, opts = {}) {
  const sender = userById(n.senderId);
  const audience =
    n.recipients.mode === 'all'
      ? `All of ${TEAM.name}`
      : n.recipients.mode === 'single'
        ? 'Only you'
        : `${n.recipients.userIds.length} people`;
  return `<article class="notif ${n.response.actionKey ? 'is-done' : 'is-unread'}" data-notif-card="${n.id}">
    <div class="notif-head">
      ${avatar(sender, { size: 'sm' })}
      <div class="notif-meta">
        <div class="row gap-xs wrap">
          <span class="notif-title">${esc(n.title)}</span>
          ${n.priority === 'high' ? `<span class="badge badge-error">High</span>` : ''}
        </div>
        <div class="t-caption c-muted">${esc(sender.name)} · ${fmtRelative(n.createdAt)} · ${audience}</div>
      </div>
      ${notifStatus(n)}
    </div>
    <p class="t-body-sm c-body">${esc(n.body)}</p>
    ${
      n.dueAt
        ? `<div class="row gap-xs t-caption c-muted">${icon('clock', { size: 14 })} Due ${fmtDay(n.dueAt.slice(0, 10))} · ${fmtTime(n.dueAt)}</div>`
        : ''
    }
    ${opts.actions === false ? '' : actionButtons(n, { detail: opts.detail })}
  </article>`;
}

function eventCard(e, opts = {}) {
  const stats = eventStats(e);
  const rsvp = e.myStatus ? RSVP_META[e.myStatus].label : 'Needs your reply';
  return `<article class="card card-hover stack gap-sm" data-event-card="${e.id}">
    <div class="row gap-sm">
      <span class="cal-dot" style="width:10px;height:10px;background-color:var(--color-${e.cover})"></span>
      <strong class="t-title-sm grow">${esc(e.title)}</strong>
      <span class="badge ${e.myStatus === 'attending' ? 'badge-success' : e.myStatus === 'not_attending' ? 'badge-error' : 'badge-warning'}">${esc(rsvp)}</span>
    </div>
    <div class="stack gap-xxs t-body-sm c-muted">
      <span class="row gap-xs">${icon('clock', { size: 14 })} ${fmtRange(e.startAt, e.endAt)}</span>
      <span class="row gap-xs">${icon('mapPin', { size: 14 })} ${esc(e.location)}</span>
    </div>
    <div class="between gap-sm">
      ${avatarStack(e.responses.map((r) => r.userId), { max: 5 })}
      <span class="t-caption c-muted"><strong class="c-ink t-num">${stats.attending}</strong>/${stats.total} attending</span>
    </div>
    ${
      opts.showStats === false
        ? ''
        : `<div class="stack gap-xs">
            ${progressBar({ attending: stats.attending, notAttending: stats.notAttending, undecided: stats.undecided })}
          </div>`
    }
    <a class="link-btn" href="event-detail.html?id=${e.id}">${opts.ctaLabel ?? 'View event'} ${icon('arrowRight', { size: 14 })}</a>
  </article>`;
}

// ── Form primitives ─────────────────────────────────────────────────────────

function field(label, control, opts = {}) {
  return `<label class="field">
    <span class="label">${esc(label)}${opts.optional ? ' <span class="c-soft">(optional)</span>' : ''}</span>
    ${control}
    ${opts.hint ? `<span class="hint">${esc(opts.hint)}</span>` : ''}
    ${opts.error ? `<span class="error-text">${esc(opts.error)}</span>` : ''}
  </label>`;
}

function input(opts = {}) {
  const attrs = [
    `type="${opts.type ?? 'text'}"`,
    opts.name ? `name="${opts.name}"` : '',
    opts.id ? `id="${opts.id}"` : '',
    opts.value != null ? `value="${esc(opts.value)}"` : '',
    opts.placeholder ? `placeholder="${esc(opts.placeholder)}"` : '',
    opts.required ? 'required' : '',
    opts.disabled ? 'disabled' : '',
    opts.invalid ? 'aria-invalid="true"' : '',
    opts.min != null ? `min="${opts.min}"` : '',
    opts.max != null ? `max="${opts.max}"` : '',
    opts.autocomplete ? `autocomplete="${opts.autocomplete}"` : '',
    opts.cls ? `class="${opts.cls}"` : 'class="input"',
  ];
  if (opts.icon || opts.suffix) {
    return `<span class="input-group">
      ${opts.icon ? icon(opts.icon, { size: 18 }) : ''}
      <input ${attrs.filter(Boolean).join(' ')} class="input" />
      ${opts.suffix ? `<span class="suffix">${esc(opts.suffix)}</span>` : ''}
    </span>`;
  }
  return `<input ${attrs.filter(Boolean).join(' ')} />`;
}

function textarea(opts = {}) {
  return `<textarea class="textarea" ${opts.name ? `name="${opts.name}"` : ''} ${
    opts.rows ? `rows="${opts.rows}"` : ''
  } placeholder="${esc(opts.placeholder ?? '')}">${esc(opts.value ?? '')}</textarea>`;
}

function select(opts = {}) {
  return `<select class="select" ${opts.id ? `id="${opts.id}"` : ''} ${opts.name ? `name="${opts.name}"` : ''}>
    ${(opts.options ?? [])
      .map((o) => {
        const value = typeof o === 'string' ? o : o.value;
        const label = typeof o === 'string' ? o : o.label;
        return `<option value="${esc(value)}" ${value === opts.value ? 'selected' : ''}>${esc(label)}</option>`;
      })
      .join('')}
  </select>`;
}

function check(label, opts = {}) {
  const id = opts.id ?? `chk_${Math.random().toString(36).slice(2, 8)}`;
  return `<label class="check" for="${id}">
    <input type="${opts.type ?? 'checkbox'}" id="${id}" ${opts.name ? `name="${opts.name}"` : ''} ${
      opts.checked ? 'checked' : ''
    } ${opts.value ? `value="${esc(opts.value)}"` : ''} />
    <span class="grow">
      <span class="t-body-sm c-ink" style="font-weight:500">${esc(label)}</span>
      ${opts.hint ? `<span class="hint" style="display:block">${esc(opts.hint)}</span>` : ''}
    </span>
  </label>`;
}

/** Toggle with a label; used for preference rows. */
function switchControl(label, opts = {}) {
  const id = opts.id ?? `sw_${Math.random().toString(36).slice(2, 8)}`;
  return `<div class="between gap-md">
    <span class="grow">
      <span class="t-body-sm c-ink" style="font-weight:500">${esc(label)}</span>
      ${opts.hint ? `<span class="hint" style="display:block">${esc(opts.hint)}</span>` : ''}
    </span>
    <input type="checkbox" class="switch" id="${id}" ${opts.name ? `name="${esc(opts.name)}"` : ''} ${opts.checked ? 'checked' : ''} />
  </div>`;
}

function segmented(items, active, dataAttr = 'data-seg') {
  return `<div class="segmented" role="tablist">
    ${items
      .map(
        (i) =>
          `<button role="tab" ${dataAttr}="${esc(i.value)}" class="${i.value === active ? 'is-active' : ''}" aria-selected="${
            i.value === active
          }">${esc(i.label)}</button>`,
      )
      .join('')}
  </div>`;
}

function emptyState(title, body, cta) {
  return `<div class="empty">
    <span class="empty-art">${icon('inbox', { size: 40 })}</span>
    <strong class="t-title-sm">${esc(title)}</strong>
    <p class="t-body-sm c-muted" style="max-width:320px">${esc(body)}</p>
    ${cta ?? ''}
  </div>`;
}

// ── Navigation model ────────────────────────────────────────────────────────

const NAV_WEB = [
  {
    label: 'Overview',
    items: [{ href: 'dashboard.html', icon: 'grid', label: 'Dashboard' }],
  },
  {
    label: 'Engage',
    items: [
      { href: 'notifications.html', icon: 'bell', label: 'Notifications', count: 'unread' },
      { href: 'events.html', icon: 'calendar', label: 'Events' },
      { href: 'calendar.html', icon: 'calendar', label: 'Calendar' },
    ],
  },
  {
    label: 'Plan',
    items: [
      { href: 'todos.html', icon: 'list', label: 'Todo templates' },
      { href: 'countdowns.html', icon: 'timer', label: 'Countdowns' },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { href: 'team.html', icon: 'users', label: 'Team' },
      { href: 'settings.html', icon: 'settings', label: 'Settings' },
    ],
  },
  {
    label: 'Prototype',
    items: [
      { href: 'index.html', icon: 'grid', label: 'All screens' },
      { href: 'styleguide.html', icon: 'sparkle', label: 'Design system' },
    ],
  },
];

const NAV_MOBILE = [
  { href: 'm-notifications.html', icon: 'bell', label: 'Inbox', count: 'unread' },
  { href: 'm-calendar.html', icon: 'calendar', label: 'Calendar' },
  { href: 'm-countdowns.html', icon: 'timer', label: 'Timers' },
  { href: 'm-todos.html', icon: 'list', label: 'Todos' },
  { href: 'm-profile.html', icon: 'user', label: 'Profile' },
];

function navCount(kind) {
  return kind === 'unread' ? unreadCount() : kind === 'rsvp' ? pendingRsvpCount() : 0;
}

// ── Shells ──────────────────────────────────────────────────────────────────

/**
 * Web app shell: cream sidebar + topbar + page body.
 * @param {{active:string,title:string,subtitle?:string,actions?:string,body:string,search?:string,breadcrumb?:string}} o
 */
function shellWeb(o) {
  const nav = NAV_WEB.map(
    (group) => `<div class="nav-group">
      <span class="nav-label">${group.label}</span>
      ${group.items
        .map((item) => {
          const count = item.count ? navCount(item.count) : 0;
          return `<a class="nav-item ${item.href === o.active ? 'is-active' : ''}" href="${item.href}">
            ${icon(item.icon)}
            <span>${item.label}</span>
            ${count ? `<span class="count-badge">${count}</span>` : ''}
          </a>`;
        })
        .join('')}
    </div>`,
  ).join('');

  return `<div class="shell">
    <aside class="sidebar">
      <a class="brand" href="index.html">
        <span class="brand-mark">N</span>
        <span class="brand-name">NEXA</span>
      </a>
      ${nav}
      <div class="sidebar-foot">
        ${avatar(ME)}
        <div class="grow stack" style="gap:0">
          <span class="t-body-sm c-ink" style="font-weight:600">${esc(ME.name)}</span>
          <span class="t-caption">${esc(TEAM.name)}</span>
        </div>
        ${icon('chevronDown', { size: 16, cls: 'c-muted' })}
      </div>
    </aside>

    <div class="main">
      <header class="topbar">
        <div class="grow stack" style="gap:0">
          ${o.breadcrumb ? `<span class="t-caption c-muted">${o.breadcrumb}</span>` : ''}
          <h1 class="t-title-lg">${esc(o.title)}</h1>
        </div>
        ${
          o.search === false
            ? ''
            : `<span class="input-group" style="width:min(280px,28vw)">${icon('search', { size: 18 })}<input class="input" placeholder="Search notifications, events, people…" /></span>`
        }
        <button class="icon-btn icon-btn-outline" data-open="quick-create" title="Create">${icon('plus')}</button>
        <button class="icon-btn icon-btn-outline" title="Notifications" onclick="location.href='notifications.html'">${icon('bell')}</button>
        ${avatar(ME, { size: 'sm' })}
      </header>
      <main class="page">
        ${o.subtitle ? `<p class="t-body c-muted" style="max-width:760px">${esc(o.subtitle)}</p>` : ''}
        ${o.actions ? `<div class="row wrap gap-sm">${o.actions}</div>` : ''}
        ${o.body}
      </main>
    </div>
  </div>`;
}

/**
 * Mobile shell: app bar + body + fixed tab bar (+ optional FAB).
 * @param {{active?:string,title?:string,subtitle?:string,back?:string,actions?:string,
 *          body:string,appbar?:string,fab?:string,flush?:boolean,hideTabbar?:boolean,
 *          hideAppbar?:boolean,scrollBody?:boolean}} o
 */
function shellMobile(o) {
  const appbar =
    o.appbar ??
    `<header class="appbar">
      ${o.back ? `<a class="icon-btn" href="${o.back}" aria-label="Back">${icon('arrowLeft')}</a>` : ''}
      <div class="grow stack" style="gap:0">
        ${o.title ? `<span class="appbar-title truncate">${esc(o.title)}</span>` : ''}
        ${o.subtitle ? `<span class="t-caption">${esc(o.subtitle)}</span>` : ''}
      </div>
      ${o.actions ?? ''}
    </header>`;

  const tabbar = o.hideTabbar
    ? ''
    : `<nav class="tabbar">
        ${NAV_MOBILE.map((t) => {
          const count = t.count ? navCount(t.count) : 0;
          return `<a class="tab ${t.href === o.active ? 'is-active' : ''}" href="${t.href}">
            ${icon(t.icon)}
            <span>${t.label}</span>
            ${count ? `<span class="count-badge">${count}</span>` : ''}
          </a>`;
        }).join('')}
      </nav>`;

  return `<div class="screen" data-screen="${o.active ?? ''}">
    ${o.hideAppbar ? '' : appbar}
    <div class="screen-body ${o.flush ? 'screen-body-flush' : ''}">${o.body}</div>
    ${o.fab ?? ''}
    ${tabbar}
  </div>`;
}

/** Bottom sheet used for in-flow creation from mobile. */
function quickCreateSheet() {
  const item = (href, iconName, title, body, tone) => `<a class="row gap-sm card card-hover" href="${href}" style="padding:var(--space-sm);text-decoration:none">
      <span class="empty-art" style="width:44px;height:44px;border-radius:var(--radius-md);background-color:${tone}">${icon(iconName, { size: 20 })}</span>
      <span class="grow stack" style="gap:0">
        <span class="t-title-sm">${title}</span>
        <span class="t-caption">${body}</span>
      </span>
      ${icon('chevronRight', { size: 18, cls: 'c-soft' })}
    </a>`;
  return `<div class="scrim sheet-host hidden" id="quick-create" data-close-self>
    <div class="sheet">
      <span class="sheet-handle"></span>
      <div class="between">
        <strong class="t-title-md">Create</strong>
        <button class="icon-btn" data-close>${icon('x')}</button>
      </div>
      ${item('notification-new.html', 'bell', 'Notification', 'Interactive actions, due date, recipients', 'var(--tint-brand-pink)')}
      ${item('event-new.html', 'calendar', 'Event', 'RSVP collection with attendance stats', 'var(--tint-brand-teal)')}
      ${item('countdown-new.html', 'timer', 'Countdown', 'Live timer to a target date', 'var(--tint-brand-ochre)')}
      ${item('todos.html', 'list', 'Todo template', 'Reusable checklist on a weekly pattern', 'var(--tint-brand-lavender)')}
    </div>
  </div>`;
}

// ── Calendar renderers ──────────────────────────────────────────────────────

/**
 * Type dots for one day.
 * @param {string} day YYYY-MM-DD
 * @param {{types?: string[]}} [opts] restrict to these calendar entry types
 */
function dotRow(day, opts = {}) {
  let entries = entriesOn(day);
  if (opts.types?.length) entries = entries.filter((e) => opts.types.includes(e.type));
  const types = [...new Set(entries.map((e) => e.type))].slice(0, 4);
  return types.map((t) => `<span class="cal-dot" style="background-color:${CAL_TYPE_META[t].dot}"></span>`).join('');
}

/**
 * Month grid.
 * @param {{month?:Date, selected?:string, types?:string[]}} o
 *   `types` restricts the per-day dots to those calendar entry types, so a
 *   caller can filter the grid without touching the shared data array.
 */
function calendarMonth(o = {}) {
  const month = o.month ?? new Date();
  const selected = o.selected ?? isoDay(0);
  const days = monthDays(month);
  const dotTypes = o.types?.length ? { types: o.types } : {};
  const dow = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  // Monday-first column order
  const ordered = [1, 2, 3, 4, 5, 6, 0];
  return `<div class="cal-grid" style="grid-template-columns:repeat(7,1fr)">
    ${ordered.map((i) => `<span class="cal-dow">${dow[(i + 6) % 7]}</span>`).join('')}
    ${days
      .map((d) => {
        const day = toDayStr(d);
        const out = d.getMonth() !== month.getMonth();
        const cls = [
          'cal-cell',
          out ? 'is-out' : '',
          day === isoDay(0) ? 'is-today' : '',
          day === selected ? 'is-selected' : '',
        ]
          .filter(Boolean)
          .join(' ');
        return `<button class="${cls}" data-day="${day}">
          <span>${d.getDate()}</span>
          <span class="row gap-xxs" style="flex-wrap:wrap">${out ? '' : dotRow(day, dotTypes)}</span>
        </button>`;
      })
      .join('')}
  </div>`;
}

/** Week strip with time blocks (agenda-free, colour by entry type). */
function calendarWeek(o = {}) {
  const week = weekDays(o.anchor ? parseDay(o.anchor) : new Date());
  return `<div class="stack gap-sm">
    ${week
      .map((d) => {
        const day = toDayStr(d);
        const entries = entriesOn(day);
        return `<div class="stack gap-xs">
          <div class="between">
            <span class="t-title-sm ${day === isoDay(0) ? '' : 'c-body'}">
              ${DOW_LONG[d.getDay()]} <span class="c-muted t-body-sm">${d.getDate()}/${d.getMonth() + 1}</span>
              ${day === isoDay(0) ? '<span class="badge badge-ink">Today</span>' : ''}
            </span>
            <span class="t-caption c-muted">${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}</span>
          </div>
          ${
            entries.length
              ? entries
                  .map(
                    (e) => `<div class="row gap-sm" style="padding:8px 10px;border-radius:var(--radius-md);background-color:var(--color-surface-soft)">
                      <span class="agenda-rail" style="background-color:${CAL_TYPE_META[e.type].dot}"></span>
                      <span class="grow stack" style="gap:0">
                        <span class="t-body-sm c-ink" style="font-weight:500">${esc(e.title)}</span>
                        <span class="t-caption">${CAL_TYPE_META[e.type].label}${e.startTime ? ` · ${e.startTime}${e.endTime ? `–${e.endTime}` : ''}` : ''}</span>
                      </span>
                    </div>`,
                  )
                  .join('')
              : `<span class="t-caption c-soft">No entries</span>`
          }
        </div>`;
      })
      .join('')}
  </div>`;
}

/** Day agenda: hour rail with entries dropped into their slots. */
function timelineDay(day = isoDay(0)) {
  const entries = entriesOn(day);
  const hours = Array.from({ length: 12 }, (_, i) => 8 + i);
  return `<div>
    ${hours
      .map((h) => {
        const inHour = entries.filter((e) => e.startTime && Number(e.startTime.slice(0, 2)) === h);
        return `<div class="timeline-hour">
          <span>${String(h).padStart(2, '0')}:00</span>
          <div class="timeline-slot">
            ${inHour
              .map(
                (e) => `<div class="row gap-sm" style="padding:8px 10px;border-radius:var(--radius-md);background-color:var(--color-surface-soft)">
                  <span class="agenda-rail" style="background-color:${CAL_TYPE_META[e.type].dot}"></span>
                  <span class="grow stack" style="gap:0">
                    <span class="t-body-sm c-ink" style="font-weight:500">${esc(e.title)}</span>
                    <span class="t-caption">${CAL_TYPE_META[e.type].label}${e.endTime ? ` · until ${e.endTime}` : ''}</span>
                  </span>
                </div>`,
              )
              .join('')}
          </div>
        </div>`;
      })
      .join('')}
  </div>`;
}

/** Grouped agenda list for a date range. */
function calendarAgenda(fromDay, toDay) {
  const days = [];
  const span = Math.max(1, dayDiff(fromDay, toDay));
  for (let i = 0; i <= span; i++) days.push(isoDay(dayDiff(isoDay(0), fromDay) + i));
  const withEntries = days.filter((d) => entriesOn(d).length);
  if (!withEntries.length) return emptyState('Nothing scheduled', 'No calendar entries in this range yet.', '');
  return withEntries
    .map(
      (day) => `<div class="stack gap-xs">
        <div class="between">
          <strong class="t-title-sm">${fmtDay(day)}</strong>
          <span class="t-caption c-muted">${parseDay(day).getDate()}/${parseDay(day).getMonth() + 1}</span>
        </div>
        ${entriesOn(day)
          .map(
            (e) => `<div class="row gap-sm" style="padding:10px;border-radius:var(--radius-md);border:1px solid var(--color-hairline)">
              <span class="cal-dot" style="background-color:${CAL_TYPE_META[e.type].dot}"></span>
              <span class="grow stack" style="gap:0">
                <span class="t-body-sm c-ink" style="font-weight:500">${esc(e.title)}</span>
                <span class="t-caption">${CAL_TYPE_META[e.type].label}${e.startTime ? ` · ${e.startTime}${e.endTime ? `–${e.endTime}` : ''}` : ' · all day'}</span>
              </span>
              ${icon('chevronRight', { size: 16, cls: 'c-soft' })}
            </div>`,
          )
          .join('')}
      </div>`,
    )
    .join('<hr class="divider divider-soft" />');
}

// ── F3 · Recipient targeting ────────────────────────────────────────────────
// Shared by the notification composer, the event composer, and countdown
// sharing. `mode` mirrors RecipientTarget in @nexa/types.

/**
 * Segmented single / multi / all switcher plus the matching body panel.
 * @param {{mode:'single'|'multi'|'all', selected?:string[], idPrefix?:string, compact?:boolean}} o
 */
function recipientPicker(o = {}) {
  const mode = o.mode ?? 'single';
  const selected = o.selected ?? [];
  const p = o.idPrefix ?? 'rcp';
  const modes = [
    { value: 'single', label: 'One person' },
    { value: 'multi', label: 'Several' },
    { value: 'all', label: 'Whole team' },
  ];

  const panels = {
    single: panelFor('single', selected, p),
    multi: panelFor('multi', selected, p),
    all: panelForAll(),
  };

  return `<div class="recipient-picker" data-recipient-picker data-mode="${mode}" id="${p}">
    <div class="segmented" role="tablist">
      ${modes
        .map(
          (m) =>
            `<button type="button" role="tab" data-mode="${m.value}" class="${m.value === mode ? 'is-active' : ''}">${m.label}</button>`,
        )
        .join('')}
    </div>
    <div data-role="panel">${panels[mode]}</div>
    <input type="hidden" name="recipientMode" value="${mode}" data-role="mode-input" />
  </div>`;
}

/**
 * Wire a rendered recipient picker: mode switching, search, chip list, and
 * select-all. Leaves the markup in charge of the visuals.
 */
function wireRecipientPicker(root) {
  if (!root) return;
  const panel = $('[data-role="panel"]', root);
  const modeInput = $('[data-role="mode-input"]', root);
  const chips = () => $('[data-role="chips"]', root);

  const selectedIds = () => $$('[data-picker-check]:checked, [data-picker-radio]:checked', root).map((i) => i.value);

  function paintChips() {
    const host = chips();
    if (!host) return;
    host.innerHTML = selectedIds()
      .map((id) => {
        const u = userById(id);
        return `<span class="chip">${esc(u.name)}<button type="button" data-chip-remove="${id}" aria-label="Remove">${icon('x', { size: 12 })}</button></span>`;
      })
      .join('');
  }

  root.addEventListener('click', (e) => {
    const modeBtn = e.target.closest('[data-mode]');
    if (modeBtn) {
      const next = modeBtn.dataset.mode;
      root.dataset.mode = next;
      modeInput.value = next;
      $$('[data-mode]', root).forEach((b) => b.classList.toggle('is-active', b === modeBtn));
      panel.innerHTML = next === 'all' ? panelForAll() : panelFor(next, selectedIds(), root.id);
      if (next === 'multi') paintChips();
      return;
    }
    const removeBtn = e.target.closest('[data-chip-remove]');
    if (removeBtn) {
      const box = $(`[data-picker-check][value="${removeBtn.dataset.chipRemove}"]`, root);
      if (box) box.checked = false;
      paintChips();
      return;
    }
    if (e.target.closest('[data-picker-all]')) {
      $$('[data-picker-check]', root).forEach((b) => (b.checked = true));
      paintChips();
    }
  });

  root.addEventListener('input', (e) => {
    if (e.target.matches('input[type="search"], input[placeholder^="Search"]')) {
      const q = e.target.value.trim().toLowerCase();
      $$('[data-member]', root).forEach((row) => {
        row.classList.toggle('hidden', q.length > 0 && !row.dataset.name.includes(q));
      });
    } else if (e.target.matches('[data-picker-check]')) {
      paintChips();
    }
  });

  if (root.dataset.mode === 'multi') paintChips();
}

/** Body panel for the single / multi modes, seeding the current selection. */
function panelFor(mode, selected = [], idPrefix = 'rcp') {
  const multi = mode === 'multi';
  const roster = USERS.filter((u) => u.id !== ME.id)
    .map(
      (u) => `<label class="picker-row" data-member="${u.id}" data-name="${esc(u.name.toLowerCase())}">
        <input type="${multi ? 'checkbox' : 'radio'}" ${multi ? 'data-picker-check' : `name="${idPrefix}-member" data-picker-radio`} value="${u.id}" ${selected.includes(u.id) ? 'checked' : ''} />
        ${avatar(u, { size: 'sm' })}
        <span class="grow stack" style="gap:0">
          <span class="t-body-sm c-ink" style="font-weight:500">${esc(u.name)}</span>
          <span class="t-caption">${esc(u.jobTitle)}</span>
        </span>
        <span class="badge badge-outline">${u.role}</span>
      </label>`,
    )
    .join('');

  return `<div class="stack gap-sm">
    ${
      multi
        ? `<div class="row gap-xs" style="align-items:center">${input({ icon: 'search', placeholder: 'Search teammates…' })}<button class="link-btn" type="button" data-picker-all>Select all</button></div>
           <div class="row gap-xs wrap" data-role="chips"></div>`
        : input({ icon: 'search', placeholder: `Search ${TEAM.members} teammates…` })
    }
    <div class="picker-list">${roster}</div>
  </div>`;
}

function panelForAll() {
  return `<div class="stack gap-sm">
    <div class="card card-cream row gap-sm">
      ${icon('users', { size: 20 })}
      <span class="grow stack" style="gap:0">
        <span class="t-title-sm">Everyone in ${esc(TEAM.name)}</span>
        <span class="t-caption">Fan-out resolves ${TEAM.members} members server-side</span>
      </span>
    </div>
    <div class="row wrap gap-xs">${USERS.map((u) => avatar(u, { size: 'sm' })).join('')}</div>
  </div>`;
}

// ── Overlays ────────────────────────────────────────────────────────────────

function toast(message, opts = {}) {
  let host = $('.toast-host');
  if (!host) {
    host = document.createElement('div');
    host.className = 'toast-host';
    document.body.appendChild(host);
  }
  // A bottom sheet occupies the lower part of the screen, so the toast host sits
  // above the tab bar normally but above an open sheet when one is visible —
  // otherwise a confirmation raised just before opening a sheet covers its
  // action row for the toast's lifetime.
  const isMobile = document.body.classList.contains('mobile') || window.innerWidth < 520;
  const sheetOpen = $$('.scrim').some((el) => !el.classList.contains('hidden'));
  if (isMobile) {
    const bottom = sheetOpen
      ? 'calc(100% - 96px)'
      : 'calc(var(--mobile-bottom-nav) + 16px)';
    host.style.cssText = `left:16px;right:16px;bottom:${bottom};`;
  } else {
    host.style.cssText = 'right:24px;bottom:24px';
  }
  const el = document.createElement('div');
  const tone = opts.tone ?? 'success';
  el.className = `toast toast-${tone}`;
  el.innerHTML = `${icon(tone === 'error' ? 'alert' : 'checkCircle', { size: 18 })}<span>${esc(message)}</span>`;
  host.appendChild(el);
  setTimeout(() => el.remove(), opts.duration ?? 2600);
}

function openSheet(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}
function closeSheet(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}
function openModal(id) {
  openSheet(id);
}
function closeModal(id) {
  closeSheet(id);
}

/** Lightweight confirm used instead of window.confirm so the demo stays on-system. */
function confirmDialog(title, body, confirmLabel = 'Delete') {
  const id = 'confirm-dialog';
  const existing = document.getElementById(id);
  if (existing) existing.remove();
  const host = document.createElement('div');
  host.id = id;
  host.className = 'scrim';
  host.innerHTML = `<div class="modal" style="max-width:420px">
    <strong class="t-title-md">${esc(title)}</strong>
    <p class="t-body-sm c-muted">${esc(body)}</p>
    <div class="row gap-sm" style="justify-content:flex-end">
      <button class="btn btn-secondary" data-close>Cancel</button>
      <button class="btn btn-primary" data-confirm>${esc(confirmLabel)}</button>
    </div>
  </div>`;
  document.body.appendChild(host);
  return new Promise((resolve) => {
    host.addEventListener('click', (e) => {
      if (e.target === host || e.target.closest('[data-close]')) {
        host.remove();
        resolve(false);
      } else if (e.target.closest('[data-confirm]')) {
        host.remove();
        resolve(true);
      }
    });
  });
}

// ── Global delegated interactions ───────────────────────────────────────────
// One listener on document drives every screen: notification actions work from
// the list, the detail sheet, or a calendar card without any page wiring.

function wireGlobal() {
  document.addEventListener('click', async (e) => {
    // Close buttons and sheet openers
    const closeBtn = e.target.closest('[data-close]');
    if (closeBtn) {
      const host = closeBtn.closest('.scrim');
      if (host) host.classList.add('hidden');
      return;
    }
    const opener = e.target.closest('[data-open]');
    if (opener) {
      openSheet(opener.dataset.open);
      return;
    }
    if (e.target.classList?.contains('scrim') && !e.target.dataset.sticky) {
      e.target.classList.add('hidden');
      return;
    }

    // F1 — POST /notifications/:id/respond
    const actBtn = e.target.closest('[data-act]');
    if (actBtn) {
      const { act, notif } = actBtn.dataset;
      if (act === 'snooze') {
        const until = isoTime(1, 9, 0);
        notifyAction(notif, 'snooze', until);
        toast(`Snoozed until ${fmtDay(until.slice(0, 10))} · ${fmtTime(until)}`);
      } else if (act === 'confirm') {
        notifyAction(notif, 'confirm');
        toast('Confirmed — the sender is notified');
      } else if (act === 'dismiss') {
        notifyAction(notif, 'dismiss');
        toast('Notification dismissed');
      } else {
        notifyAction(notif, act);
        toast('Response recorded');
      }
      document.dispatchEvent(new CustomEvent('nexa:changed', { detail: { kind: 'notification', id: notif } }));
      return;
    }

    // F2 — POST /events/:id/rsvp
    const rsvpBtn = e.target.closest('[data-rsvp]');
    if (rsvpBtn) {
      const { rsvp, event } = rsvpBtn.dataset;
      setRsvp(event, rsvp);
      toast(`RSVP saved — ${RSVP_META[rsvp].label.toLowerCase()}`);
      document.dispatchEvent(new CustomEvent('nexa:changed', { detail: { kind: 'event', id: event } }));
    }
  });
}

/** Hydrate declarative placeholders: [data-icon] → inline SVG (data-size, data-cls). */
function hydrateIcons(root = document) {
  $$('[data-icon]', root).forEach((slot) => {
    const span = document.createElement('span');
    span.style.display = 'inline-flex';
    span.innerHTML = icon(slot.dataset.icon, {
      size: Number(slot.dataset.size ?? 20),
      cls: slot.dataset.cls,
    });
    slot.replaceWith(span.firstElementChild);
  });
  $$('[data-role="unread"]', root).forEach((el) => (el.textContent = unreadCount()));
}

// ── Page bootstrap ──────────────────────────────────────────────────────────

const PAGES = {};
/** Register an initialiser for `body[data-page]`. */
function page(name, fn) {
  PAGES[name] = fn;
}

function mount() {
  const name = document.body.dataset.page;
  const tpl = document.getElementById('page-template');
  if (tpl) tpl.outerHTML = tpl.innerHTML;
  hydrateIcons();
  if (PAGES[name]) PAGES[name]();
  document.dispatchEvent(new CustomEvent('nexa:mounted'));
}

/** Read a query-string parameter (used by detail screens). */
function param(key, fallback = '') {
  return new URLSearchParams(location.search).get(key) ?? fallback;
}

/**
 * Register a page renderer that runs on load and again after any interaction
 * mutates state. `fn(ctx)` receives `{ first: boolean }`.
 */
function live(fn) {
  let first = true;
  const run = () => {
    fn({ first });
    first = false;
  };
  document.addEventListener('nexa:changed', run);
  return run;
}

rehydrate();
wireGlobal();
document.addEventListener('DOMContentLoaded', mount);

Object.assign(NEXA, {
  // helpers
  $, $$, esc, icon, param,
  // formatting
  fmtTime, fmtDay, fmtRelative, fmtRange, monthLabel, weekDays, monthDays, toDayStr, parseDay, dayDiff, isoDay, isoTime,
  // renderers
  avatar, avatarStack, progressBar, progressTodo, statBar, notifCard, notifStatus, actionButtons, eventCard,
  field, input, textarea, select, check, switchControl, segmented, emptyState,
  calendarMonth, calendarWeek, calendarAgenda, timelineDay, dotRow,
  // shells
  shellWeb, shellMobile, quickCreateSheet,
  // overlays
  toast, openSheet, closeSheet, openModal, closeModal, confirmDialog,
  // data + mutations
  state, persist, notifById, eventById, countdownById, templateById,
  notifyAction, setRsvp, toggleTask, eventStats, countdownRemaining, entriesOn,
  unreadCount, pendingRsvpCount,
  // meta
  ME, TEAM, USERS, userById, ACTION_LABELS, CAL_TYPE_META, COUNTDOWN_TYPE_META, RSVP_META,
  NAV_WEB, NAV_MOBILE,
  // F3 — recipient picker is used by the composers on every surface
  recipientPicker, wireRecipientPicker,
  // bootstrap
  page, mount, hydrateIcons, live,
});

window.NEXA = NEXA;
