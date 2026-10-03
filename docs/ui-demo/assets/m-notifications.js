/* F1 · Interactive notifications — recipient inbox (mobile).
   Filter chips re-render the list; Confirm / Snooze / Dismiss are delegated to
   the global handler in ui.js, which then re-runs this renderer via nexa:changed
   (see NEXA.live at the bottom). */

(() => {
  const {
    $, $$, state, shellMobile, notifCard, unreadCount, isoDay, dayDiff, emptyState,
  } = window.NEXA;

  const FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'unread', label: 'Needs you' },
    { value: 'snoozed', label: 'Snoozed' },
    { value: 'done', label: 'Done' },
  ];

  // The inbox opens on "Needs you": the demo should land on an actionable view,
  // with the volume of everything else visible in the chip counts.
  let filter = 'unread';

  /** Buckets used by both the chip counts and the list filter. */
  function buckets() {
    const list = state.data.notifications;
    return {
      all: list,
      unread: list.filter((n) => !n.response.actionKey),
      snoozed: list.filter((n) => n.response.actionKey === 'snooze'),
      done: list.filter((n) => ['confirm', 'dismiss'].includes(n.response.actionKey)),
    };
  }

  /** Group a list of notifications by urgency: today, this week, earlier. */
  function groups(list) {
    const out = [
      { label: 'Due today', items: [] },
      { label: 'This week', items: [] },
      { label: 'Earlier', items: [] },
    ];
    list.forEach((n) => {
      const due = n.dueAt ? dayDiff(isoDay(0), n.dueAt.slice(0, 10)) : 99;
      if (due <= 0) out[0].items.push(n);
      else if (due <= 7) out[1].items.push(n);
      else out[2].items.push(n);
    });
    return out.filter((g) => g.items.length);
  }

  function chipRow() {
    const b = buckets();
    return `<div class="scroll-x" data-role="filters">
      ${FILTERS.map(
        (f) => `<button class="pill-tab ${filter === f.value ? 'is-active' : ''}" data-filter="${f.value}">
          ${f.label}
          <span class="badge badge-outline" style="padding:0 8px;min-width:22px;justify-content:center">${b[f.value].length}</span>
        </button>`,
      ).join('')}
    </div>`;
  }

  function list() {
    const items = buckets()[filter];
    if (!items.length) {
      return emptyState(
        filter === 'unread' ? 'Inbox zero' : 'Nothing here',
        filter === 'unread'
          ? 'Every notification has been answered. New ones land here the moment they arrive.'
          : 'No notifications match this filter yet.',
        `<a class="btn btn-secondary btn-sm" href="notification-new.html">Send a notification</a>`,
      );
    }
    return groups(items)
      .map(
        (g) => `<section class="stack gap-sm">
          <div class="between">
            <span class="t-upper">${g.label}</span>
            <span class="t-caption c-muted t-num">${g.items.length}</span>
          </div>
          ${g.items.map((n) => notifCard(n, { detail: true })).join('')}
        </section>`,
      )
      .join('');
  }

  function render() {
    const needs = unreadCount();
    const shell = shellMobile({
      active: 'm-notifications.html',
      title: 'Inbox',
      subtitle: `${needs} awaiting your response · ${state.data.notifications.length} total`,
      actions: `<a class="icon-btn icon-btn-outline" href="notification-new.html" aria-label="New notification">${window.NEXA.icon('plus')}</a>
        <button class="icon-btn icon-btn-outline" data-open="filter-sheet" aria-label="Filter">${window.NEXA.icon('filter')}</button>`,
      body: `${chipRow()}<div class="stack gap-md" data-role="list">${list()}</div>`,
      fab: '',
    });

    $('[data-slot="shell"]').innerHTML =
      shell +
      `<div class="scrim sheet-host hidden" id="filter-sheet">
        <div class="sheet">
          <span class="sheet-handle"></span>
          <div class="between">
            <strong class="t-title-md">Filter inbox</strong>
            <button class="icon-btn" data-close>${window.NEXA.icon('x')}</button>
          </div>
          <div class="stack gap-sm">
            ${['High priority only', 'Only team broadcasts', 'Only direct to me']
              .map((l) => window.NEXA.check(l, { checked: false }))
              .join('')}
          </div>
          <button class="btn btn-primary btn-block" data-close>Apply</button>
        </div>
      </div>`;

    // Filter chips re-render just the list.
    $$('[data-filter]').forEach((btn) =>
      btn.addEventListener('click', () => {
        filter = btn.dataset.filter;
        render();
      }),
    );
  }

  window.NEXA.page('m-notifications', () => {
    window.NEXA.live(render);
    render();
  });
})();
