/* Web · Notifications — F1 management surface (with F3 recipient targets).
   Filter pills + search + a dense action table, and a detail panel below the
   list for the selected row. Confirm / Snooze / Dismiss are delegated to the
   global handler in ui.js (they dispatch `nexa:changed`), so this page only
   keeps local UI state and re-renders through NEXA.live. */

(() => {
  const N = window.NEXA;
  const { $, $$, esc, state } = N;

  const FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'unread', label: 'Needs you' },
    { value: 'snoozed', label: 'Snoozed' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'dismissed', label: 'Dismissed' },
  ];

  const HEADING = {
    all: 'All notifications',
    unread: 'Needs your response',
    snoozed: 'Snoozed',
    confirmed: 'Confirmed',
    dismissed: 'Dismissed',
  };

  const EMPTY = {
    all: ['No notifications yet', 'Notifications sent to you or broadcast to the team appear here.'],
    unread: ['Inbox zero', 'Every notification has an answer. New ones land here the moment they arrive.'],
    snoozed: ['No snoozed reminders', 'Notifications you snooze come back here at the time you picked.'],
    confirmed: ['Nothing confirmed yet', 'Confirmed notifications are archived here with the time you answered.'],
    dismissed: ['Nothing dismissed', 'Dismissed notifications stay here for reference.'],
  };

  // ── Local UI state ────────────────────────────────────────────────────────
  let filter = 'all';
  let query = '';
  let selectedId = 'n_01';
  let scrollToPanel = false;

  const all = () => state.data.notifications;
  const actionOf = (n) => n.response.actionKey;

  /** Filter buckets — also the source of the live counts on the pills. */
  function buckets() {
    const list = all();
    return {
      all: list,
      unread: list.filter((n) => !actionOf(n)),
      snoozed: list.filter((n) => actionOf(n) === 'snooze'),
      confirmed: list.filter((n) => actionOf(n) === 'confirm'),
      dismissed: list.filter((n) => actionOf(n) === 'dismiss'),
    };
  }

  /** F3 audience label, as the list column shows it. */
  const audience = (n) =>
    n.recipients.mode === 'all'
      ? 'Team broadcast'
      : n.recipients.mode === 'single'
        ? 'Only you'
        : `${n.recipients.userIds.length} people`;

  const audienceLong = (n) =>
    n.recipients.mode === 'all'
      ? `Broadcast to all ${N.TEAM.members} members of ${N.TEAM.name}`
      : n.recipients.mode === 'single'
        ? 'Sent directly to you'
        : `Sent to ${n.recipients.userIds.length} members of ${N.TEAM.name}`;

  /** Resolved recipients; mode 'all' fans out to the roster server-side. */
  const recipientsOf = (n) =>
    n.recipients.mode === 'all' ? N.USERS.map((u) => u.id) : (n.recipients.userIds ?? []).slice();

  const dueLabel = (n) => (n.dueAt ? `${N.fmtDay(n.dueAt.slice(0, 10))} · ${N.fmtTime(n.dueAt)}` : 'No due date');

  /** Filtered + sorted list: anything still waiting on you floats to the top. */
  function visible() {
    const q = query.trim().toLowerCase();
    return buckets()[filter]
      .filter(
        (n) =>
          !q ||
          [n.title, n.body, N.userById(n.senderId).name].some((t) => String(t ?? '').toLowerCase().includes(q)),
      )
      .sort((a, b) => {
        const pa = actionOf(a) ? 1 : 0;
        const pb = actionOf(b) ? 1 : 0;
        if (pa !== pb) return pa - pb;
        return new Date(a.dueAt ?? 0) - new Date(b.dueAt ?? 0);
      });
  }

  // ── KPI row ───────────────────────────────────────────────────────────────

  function kpi(label, value, caption, dot) {
    return `<article class="card stack gap-xxs">
      <div class="between">
        <span class="t-upper">${label}</span>
        <span class="cal-dot" style="background-color:${dot}"></span>
      </div>
      <span class="t-display-sm t-num">${value}</span>
      <span class="t-caption c-muted">${esc(caption)}</span>
    </article>`;
  }

  /** Same local calendar day — answeredAt is a UTC timestamp, "today" is local. */
  function isToday(iso) {
    if (!iso) return false;
    const then = new Date(iso);
    const now = new Date();
    return (
      then.getFullYear() === now.getFullYear() &&
      then.getMonth() === now.getMonth() &&
      then.getDate() === now.getDate()
    );
  }

  function kpiRow() {
    const list = all();
    const awaiting = list.filter((n) => !actionOf(n)).length;
    const snoozed = list.filter((n) => actionOf(n) === 'snooze').length;
    const confirmedToday = list.filter((n) => actionOf(n) === 'confirm' && isToday(n.response.respondedAt)).length;

    return `<section class="grid grid-4">
      ${kpi('Total', list.length, 'Notifications in this workspace', 'var(--color-ink)')}
      ${kpi(
        'Awaiting you',
        awaiting,
        awaiting ? 'Confirm, snooze, or dismiss inline' : 'Nothing is waiting on you',
        'var(--color-warning)',
      )}
      ${kpi(
        'Snoozed',
        snoozed,
        snoozed ? 'Reminders rescheduled by you' : 'No snoozed reminders',
        'var(--color-brand-lavender)',
      )}
      ${kpi(
        'Confirmed today',
        confirmedToday,
        confirmedToday ? 'Answers sent today' : 'No confirmations yet today',
        'var(--color-success)',
      )}
    </section>`;
  }

  // ── Filter bar ────────────────────────────────────────────────────────────

  function filterBar() {
    const b = buckets();
    return `<section class="card card-soft row wrap gap-sm" style="padding:var(--space-sm)">
      <div class="pill-tabs" data-role="filters">
        ${FILTERS.map(
          (f) => `<button class="pill-tab ${filter === f.value ? 'is-active' : ''}" data-filter="${f.value}" aria-pressed="${
            filter === f.value
          }">
            ${f.label}
            <span class="badge badge-outline t-num" style="padding:0 8px;min-width:22px;justify-content:center">${
              b[f.value].length
            }</span>
          </button>`,
        ).join('')}
      </div>
      <span class="row grow gap-sm" style="justify-content:flex-end">
        <span class="grow" style="max-width:260px">${N.input({
          icon: 'search',
          name: 'notif-search',
          value: query,
          placeholder: 'Search notifications…',
        })}</span>
        <a class="btn btn-primary" href="notification-new.html">${N.icon('plus', { size: 16 })} New notification</a>
      </span>
    </section>`;
  }

  // ── Dense action table ────────────────────────────────────────────────────

  function row(n) {
    const sender = N.userById(n.senderId);
    const selected = n.id === selectedId;
    return `<tr data-row="${n.id}"${selected ? ' style="background-color:var(--color-surface-soft)"' : ''}>
      <td>
        <div class="row gap-sm wrap">
          ${N.avatar(sender, { size: 'sm' })}
          <div class="grow stack" style="gap:0">
            <div class="row gap-xs wrap">
              <button class="link-btn" data-select="${n.id}" style="text-align:left;white-space:normal" title="Show this notification">${esc(
                n.title,
              )}</button>
              ${n.priority === 'high' ? '<span class="badge badge-error">High</span>' : ''}
            </div>
            <span class="t-caption c-muted truncate">${esc(sender.name)} · ${N.fmtRelative(
              n.createdAt,
            )} · ${audience(n)}</span>
          </div>
        </div>
      </td>
      <td>
        <div class="stack" style="gap:0">
          <span class="t-body-sm c-ink">${n.dueAt ? N.fmtDay(n.dueAt.slice(0, 10)) : '—'}</span>
          <span class="t-caption c-muted">${n.dueAt ? N.fmtTime(n.dueAt) : 'No due date'}</span>
        </div>
      </td>
      <td>${N.notifStatus(n)}</td>
      <td>${N.actionButtons(n)}</td>
    </tr>`;
  }

  function table(items) {
    return `<div class="card" style="padding:var(--space-md) var(--space-lg) var(--space-sm)">
      <table class="table">
        <thead>
          <tr>
            <th style="width:38%">Notification</th>
            <th style="width:12%">Due</th>
            <th style="width:18%">State</th>
            <th style="width:32%">Actions</th>
          </tr>
        </thead>
        <tbody>${items.map(row).join('')}</tbody>
      </table>
    </div>`;
  }

  function emptyFor() {
    const [title, body] = EMPTY[filter] ?? EMPTY.all;
    if (query.trim()) {
      return N.emptyState(
        'No matches',
        `Nothing in “${query.trim()}” matches ${HEADING[filter].toLowerCase()}. Try another word, or clear the search.`,
        `<button class="btn btn-secondary btn-sm" data-clear-filters>Clear search</button>`,
      );
    }
    return N.emptyState(
      title,
      body,
      `<a class="btn btn-secondary btn-sm" href="notification-new.html">Send a notification</a>`,
    );
  }

  function resultsBlock() {
    const items = visible();
    return `<div class="between wrap gap-sm">
        <h2 class="t-title-lg">${HEADING[filter]}</h2>
        <span class="t-caption c-muted">${items.length} of ${all().length} notifications${
          query.trim() ? ` · matching “${esc(query.trim())}”` : ''
        }</span>
      </div>
      ${items.length ? table(items) : emptyFor()}`;
  }

  // ── Detail panel ──────────────────────────────────────────────────────────

  function recipientRow(id, n) {
    const u = N.userById(id);
    const mine = id === N.ME.id;
    return `<div class="list-row">
      ${N.avatar(u, { size: 'sm' })}
      <span class="grow stack" style="gap:0;min-width:0">
        <span class="t-body-sm c-ink" style="font-weight:500">${esc(u.name)}${
          mine ? ' <span class="c-soft">(you)</span>' : ''
        }</span>
        <span class="t-caption">${esc(u.jobTitle)}</span>
      </span>
      ${mine ? N.notifStatus(n) : '<span class="badge badge-outline c-muted">Awaiting reply</span>'}
    </div>`;
  }

  function timelineRow(tone, title, when) {
    return `<div class="row gap-sm" style="align-items:stretch">
      <span class="agenda-rail" style="background-color:${tone}"></span>
      <span class="grow stack" style="gap:0">
        <span class="t-body-sm c-ink">${title}</span>
        <span class="t-caption c-muted">${esc(when)}</span>
      </span>
    </div>`;
  }

  function history(n) {
    const sender = N.userById(n.senderId);
    const a = actionOf(n);
    const rows = [
      timelineRow('var(--color-ink)', `Created by ${esc(sender.name)}`, N.fmtRelative(n.createdAt)),
      timelineRow(
        'var(--color-brand-lavender)',
        `Audience — ${esc(audienceLong(n))}`,
        N.fmtRelative(n.createdAt),
      ),
      timelineRow(
        'var(--color-brand-pink)',
        n.dueAt ? `Due ${esc(dueLabel(n))}` : 'No due date on this notification',
        n.dueAt ? N.fmtDay(n.dueAt.slice(0, 10)) : '—',
      ),
    ];

    if (a) {
      const tone =
        a === 'confirm' ? 'var(--color-success)' : a === 'snooze' ? 'var(--color-warning)' : 'var(--color-muted-soft)';
      rows.push(
        timelineRow(
          tone,
          `${esc(N.ACTION_LABELS[a] ?? a)} by you`,
          n.response.respondedAt ? N.fmtRelative(n.response.respondedAt) : 'just now',
        ),
      );
      if (a === 'snooze' && n.response.snoozedUntil) {
        rows.push(
          timelineRow(
            'var(--color-brand-lavender)',
            `Reminder rescheduled to ${esc(dueLabel({ dueAt: n.response.snoozedUntil }))}`,
            N.fmtRelative(n.response.respondedAt),
          ),
        );
      }
    } else {
      rows.push(timelineRow('var(--color-warning)', 'Awaiting your response', 'No action taken yet'));
    }
    return rows.join('');
  }

  function detailPanel() {
    const n = N.notifById(selectedId) ?? visible()[0];
    if (!n) {
      return N.emptyState(
        'No notification selected',
        'Choose a row above to read the full message, the recipient list, and the action history.',
        '',
      );
    }
    const sender = N.userById(n.senderId);
    const ids = recipientsOf(n);

    return `<div class="between wrap gap-sm">
        <div class="stack" style="gap:0">
          <span class="t-upper">Selected notification</span>
          <h2 class="t-title-lg">${esc(n.title)}</h2>
          <span class="t-caption c-muted">${audience(n)} · from ${esc(sender.name)} · ${N.fmtRelative(
            n.createdAt,
          )}</span>
        </div>
        <a class="btn btn-secondary" href="m-notification-detail.html?id=${n.id}">Open full view ${N.icon(
          'arrowRight',
          { size: 14 },
        )}</a>
      </div>

      <div class="card card-pad-xl grid grid-3" style="align-items:start">
        <div class="stack gap-sm">
          <span class="t-upper">Message</span>
          <div class="row gap-sm">
            ${N.avatar(sender, { size: 'lg' })}
            <span class="stack" style="gap:0">
              <span class="t-title-sm">${esc(sender.name)}</span>
              <span class="t-caption c-muted">${esc(sender.jobTitle)}</span>
            </span>
          </div>
          <p class="t-body c-body">${esc(n.body)}</p>
          <div class="row gap-xs t-caption c-muted">${N.icon('clock', { size: 14 })} Due ${esc(dueLabel(n))}</div>
          <div class="row gap-xs wrap">
            ${N.notifStatus(n)}
            ${n.priority === 'high' ? '<span class="badge badge-error">High priority</span>' : ''}
          </div>
          <div class="notif-actions">${N.actionButtons(n)}</div>
        </div>

        <div class="stack gap-sm">
          <div class="between">
            <span class="t-upper">Recipients</span>
            <span class="badge badge-outline t-num">${ids.length}</span>
          </div>
          <span class="t-caption c-muted">${esc(audienceLong(n))}. Answers appear here as each person responds.</span>
          <div>${ids.map((id) => recipientRow(id, n)).join('')}</div>
        </div>

        <div class="stack gap-sm">
          <span class="t-upper">Action history</span>
          <div class="stack gap-sm">${history(n)}</div>
          <hr class="divider" />
          <div class="kv"><dt>Notification id</dt><dd class="t-num">${esc(n.id)}</dd></div>
          <div class="kv"><dt>Interactive actions</dt><dd>${n.actions
            .map((k) => esc(N.ACTION_LABELS[k] ?? k))
            .join(' · ')}</dd></div>
          <div class="kv"><dt>Priority</dt><dd>${esc(
            n.priority === 'high' ? 'High' : n.priority === 'low' ? 'Low' : 'Normal',
          )}</dd></div>
        </div>
      </div>`;
  }

  // ── Render + local wiring ─────────────────────────────────────────────────

  function render() {
    $('[data-slot="shell"]').innerHTML = N.shellWeb({
      active: 'notifications.html',
      breadcrumb: 'Engage',
      title: 'Notifications',
      subtitle:
        'Every interactive notification for you and your team, with the response each one is waiting for.',
      search: false,
      body: `${kpiRow()}${filterBar()}
        <section class="stack gap-md">
          <div class="stack gap-md" data-role="results">${resultsBlock()}</div>
        </section>
        <section class="stack gap-md" data-role="detail">${detailPanel()}</section>`,
    });
    wire();
  }

  function patchResults() {
    $('[data-role="results"]').innerHTML = resultsBlock();
  }

  function patchDetail() {
    const host = $('[data-role="detail"]');
    host.innerHTML = detailPanel();
    if (scrollToPanel) {
      scrollToPanel = false;
      host.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  function select(id) {
    selectedId = id;
    scrollToPanel = true;
    patchResults();
    patchDetail();
  }

  function wire() {
    $$('[data-filter]').forEach((btn) =>
      btn.addEventListener('click', () => {
        filter = btn.dataset.filter;
        render();
      }),
    );

    const search = $('[name="notif-search"]');
    if (search) {
      search.addEventListener('input', () => {
        query = search.value;
        patchResults();
      });
    }

    const results = $('[data-role="results"]');
    results.addEventListener('click', (e) => {
      if (e.target.closest('[data-clear-filters]')) {
        query = '';
        render();
        return;
      }
      const sel = e.target.closest('[data-select]');
      if (sel) {
        select(sel.dataset.select);
        return;
      }
      // Confirm / Snooze / Dismiss belong to the global handler in ui.js.
      if (e.target.closest('[data-act]')) return;
      const rowEl = e.target.closest('[data-row]');
      if (rowEl) select(rowEl.dataset.row);
    });
  }

  N.page('notifications', () => {
    N.live(render);
    render();
  });
})();
