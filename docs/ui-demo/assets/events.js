/* F2 · Event management (web).
   GET  /events            → the table below
   GET  /events/:id/stats  → N.eventStats(event), rendered in the side panel
   POST /events/:id/rsvp   → wired globally in ui.js via data-rsvp/data-event;
                             the resulting nexa:changed event re-runs render(). */

(() => {
  const N = window.NEXA;
  const { esc, icon, eventStats, fmtDay, fmtTime, fmtRelative, userById, RSVP_META } = N;

  const FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'week', label: 'This week' },
    { value: 'past', label: 'Past' },
    { value: 'awaiting', label: 'Awaiting my reply' },
  ];

  const RSVP_ORDER = ['attending', 'not_attending', 'undecided'];

  let filter = 'all';
  let openEventId = null;

  // ── derived data ──────────────────────────────────────────────────────────

  const endsAt = (e) => new Date(e.endAt ?? e.startAt).getTime();
  const isPast = (e) => endsAt(e) < Date.now();
  const responded = (stats) => stats.attending + stats.notAttending + stats.undecided;
  const audience = (e) =>
    e.recipients.mode === 'all'
      ? `All of ${N.TEAM.name}`
      : e.recipients.mode === 'single'
        ? 'One person'
        : `${(e.recipients.userIds ?? []).length} people`;

  /** Short form for the table cell, where the full label would truncate. */
  const audienceShort = (e) =>
    e.recipients.mode === 'all' ? 'Whole team' : e.recipients.mode === 'single' ? 'One person' : `${(e.recipients.userIds ?? []).length} people`;

  function rows(value) {
    const list = [...N.state.data.events];
    if (value === 'week') {
      return list
        .filter((e) => {
          const d = N.dayDiff(N.isoDay(0), e.startAt.slice(0, 10));
          return d >= 0 && d <= 7;
        })
        .sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
    }
    if (value === 'past') return list.filter(isPast).sort((a, b) => new Date(b.startAt) - new Date(a.startAt));
    if (value === 'awaiting') return list.filter((e) => !e.myStatus).sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
    return list.sort((a, b) => {
      const ap = isPast(a);
      const bp = isPast(b);
      if (ap !== bp) return ap ? 1 : -1;
      return ap ? new Date(b.startAt) - new Date(a.startAt) : new Date(a.startAt) - new Date(b.startAt);
    });
  }

  function summary() {
    const all = N.state.data.events;
    const upcoming = all.filter((e) => !isPast(e));
    const stats = upcoming.map(eventStats);
    const responses = all.reduce((n, e) => n + e.responses.length, 0);
    const attending = stats.reduce((n, s) => n + s.attending, 0);
    const answered = stats.reduce((n, s) => n + responded(s), 0);
    const awaiting = stats.reduce((n, s) => n + Math.max(0, s.total - responded(s)), 0);
    return {
      upcoming: upcoming.length,
      responses,
      rate: answered ? Math.round((attending / answered) * 100) : 0,
      awaiting,
      next: upcoming.sort((a, b) => new Date(a.startAt) - new Date(b.startAt))[0],
    };
  }

  // ── pieces ────────────────────────────────────────────────────────────────

  const KPI_ICON = { 'brand-teal': 'calendar', 'brand-pink': 'users', 'brand-ochre': 'check', 'brand-lavender': 'chart' };

  function kpi(o) {
    return `<article class="card card-pad-xl stack gap-sm" style="justify-content:space-between">
      <div class="between">
        <span class="t-upper">${esc(o.label)}</span>
        <span class="empty-art" style="width:36px;height:36px;border-radius:var(--radius-md);background-color:var(--tint-${o.tone})">
          ${icon(KPI_ICON[o.tone] ?? 'info', { size: 18 })}
        </span>
      </div>
      <div class="row gap-xs" style="align-items:baseline">
        <span class="t-display-sm t-num">${o.value}</span>
        ${o.unit ? `<span class="t-body-sm c-muted">${esc(o.unit)}</span>` : ''}
      </div>
      <p class="t-body-sm c-muted">${o.body}</p>
    </article>`;
  }

  /** Compact split bar for the table: attending / not attending / undecided. */
  function miniBar(counts) {
    return N.progressBar(counts);
  }

  /**
   * POST /events/:id/rsvp control. The table uses the icon-only variant so the
   * seven columns stay inside the 1144px content well; the attendance panel
   * spells the three options out.
   */
  function rsvpControl(e, opts = {}) {
    const active = e.myStatus;
    const label = `Your RSVP for ${e.title}`;
    if (opts.labels) {
      return `<div class="segmented" role="group" aria-label="${esc(label)}">
        ${RSVP_ORDER.map(
          (k) => `<button type="button" data-rsvp="${k}" data-event="${e.id}" class="${
            active === k ? 'is-active' : ''
          }" aria-pressed="${active === k}" aria-label="${esc(RSVP_META[k].label)}" title="${esc(
            RSVP_META[k].label,
          )}">${icon(RSVP_META[k].icon, { size: 15 })}<span style="margin-left:var(--space-xxs)">${esc(
            RSVP_META[k].label,
          )}</span></button>`,
        ).join('')}
      </div>`;
    }
    return `<div class="row gap-xs" role="group" aria-label="${esc(label)}" style="width:136px">
      ${RSVP_ORDER.map(
        (k) => `<button type="button" class="icon-btn ${
          active === k ? '' : 'icon-btn-outline'
        }" data-rsvp="${k}" data-event="${e.id}" aria-pressed="${active === k}" aria-label="${esc(
          RSVP_META[k].label,
        )}" title="${esc(RSVP_META[k].label)}"${
          active === k ? ' style="background-color:var(--color-ink);color:var(--color-on-primary)"' : ''
        }>${icon(RSVP_META[k].icon, { size: 17 })}</button>`,
      ).join('')}
    </div>`;
  }

  function statusBadge(status) {
    const meta = RSVP_META[status];
    const tone = status === 'attending' ? 'badge-success' : status === 'not_attending' ? 'badge-error' : 'badge-warning';
    return `<span class="badge ${tone}">${icon(meta.icon, { size: 13 })} ${esc(meta.label)}</span>`;
  }

  function table() {
    const list = rows(filter);
    if (!list.length) {
      return N.emptyState(
        filter === 'awaiting' ? 'Nothing waiting on you' : 'No events in this range',
        filter === 'awaiting'
          ? 'Every invitation has an answer. New events that need your RSVP will appear here.'
          : 'No events match this filter yet. Create one to start collecting RSVPs.',
        `<a class="btn btn-secondary btn-sm" href="event-new.html">Create event</a>`,
      );
    }
    return `<div class="card" style="padding:var(--space-lg)">
      <table class="table">
        <thead>
          <tr>
            <th>Event</th>
            <th>When</th>
            <th>Where</th>
            <th>Audience</th>
            <th>Attending</th>
            <th style="width:160px">Your RSVP</th>
            <th style="text-align:right">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${list.map((e) => {
            const stats = eventStats(e);
            const pct = stats.total ? Math.round((stats.attending / stats.total) * 100) : 0;
            return `<tr data-row="${e.id}">
              <td>
                <span class="row gap-sm">
                  <span class="cal-dot" style="width:10px;height:10px;background-color:var(--color-${e.cover})"></span>
                  <span class="stack grow" style="gap:0">
                    <span class="t-body-sm c-ink truncate" style="font-weight:600">${esc(e.title)}</span>
                    <span class="t-caption c-soft">Organised by ${esc(userById(e.createdBy).name)}</span>
                  </span>
                </span>
              </td>
              <td style="white-space:nowrap">
                <span class="stack" style="gap:0">
                  <span class="t-body-sm c-ink">${esc(fmtDay(e.startAt.slice(0, 10)))}</span>
                  <span class="t-caption c-soft t-num">${esc(fmtTime(e.startAt))}${
                    e.endAt ? `–${esc(fmtTime(e.endAt))}` : ''
                  }</span>
                </span>
              </td>
              <td><span class="row gap-xs"><span class="c-soft">${icon('mapPin', { size: 14 })}</span><span class="truncate" style="max-width:165px">${esc(
                e.location,
              )}</span></span></td>
              <td><span class="row gap-xs">${N.avatarStack(
                e.responses.map((r) => r.userId),
                { max: 3, size: 'sm' },
              )}<span class="t-caption c-muted truncate" style="max-width:96px" title="${esc(audience(e))}">${esc(
                audienceShort(e),
              )}</span></span></td>
              <td>
                <span class="row gap-sm">
                  <span style="width:72px;flex:none" title="${pct}% attending">${miniBar({
                    attending: stats.attending,
                    notAttending: stats.notAttending,
                    undecided: stats.undecided,
                  })}</span>
                  <span class="t-caption c-muted t-num" style="white-space:nowrap"><strong class="c-ink">${stats.attending}</strong>/${stats.total}</span>
                </span>
              </td>
              <td>${rsvpControl(e)}</td>
              <td style="text-align:right;white-space:nowrap">
                <button type="button" class="link-btn t-caption" data-event-open="${e.id}">Stats</button>
                <a class="link-btn t-caption" href="event-detail.html?id=${e.id}" style="margin-left:var(--space-sm)">Open</a>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
  }

  /** Recipients of an event, responders first, non-responders marked awaiting. */
  function responseRows(e) {
    const stats = eventStats(e);
    const ids =
      e.recipients.mode === 'all'
        ? N.USERS.map((u) => u.id)
        : e.recipients.mode === 'single'
          ? e.recipients.userIds ?? []
          : e.recipients.userIds ?? [];
    const order = { attending: 0, undecided: 1, not_attending: 2 };
    const records = ids.map((id) => {
      const r = stats.responses.find((x) => x.userId === id);
      return { userId: id, status: r ? r.status : null, respondedAt: r ? r.respondedAt : null };
    });
    records.sort((a, b) => {
      const ao = a.status ? order[a.status] : 3;
      const bo = b.status ? order[b.status] : 3;
      if (ao !== bo) return ao - bo;
      return userById(a.userId).name.localeCompare(userById(b.userId).name);
    });
    return records;
  }

  function panel() {
    const e = openEventId ? N.eventById(openEventId) : null;
    if (!e) return '';
    const stats = eventStats(e);
    const records = responseRows(e);
    return `<div class="scrim" id="event-panel">
      <div class="modal" style="max-width:680px">
        <div class="between gap-md">
          <span class="stack" style="gap:0">
            <span class="t-caption c-muted">Attendance statistics</span>
            <strong class="t-title-md">${esc(e.title)}</strong>
          </span>
          <button type="button" class="icon-btn" data-panel-close aria-label="Close">${icon('x')}</button>
        </div>

        <div class="grid grid-2" style="gap:var(--space-md)">
          <div class="stack gap-xxs">
            <span class="t-upper">When</span>
            <span class="t-body-sm c-ink">${esc(fmtRange(e.startAt, e.endAt))}</span>
          </div>
          <div class="stack gap-xxs">
            <span class="t-upper">Where</span>
            <span class="t-body-sm c-ink">${esc(e.location)}</span>
          </div>
          <div class="stack gap-xxs">
            <span class="t-upper">Audience</span>
            <span class="row gap-xs">${N.avatarStack(
              records.map((r) => r.userId),
              { max: 5, size: 'sm' },
            )}<span class="t-body-sm c-ink">${esc(audience(e))}</span></span>
          </div>
          <div class="stack gap-xxs">
            <span class="t-upper">Organiser</span>
            <span class="row gap-xs">${N.avatar(e.createdBy, { size: 'sm' })}<span class="t-body-sm c-ink">${esc(
              userById(e.createdBy).name,
            )}</span></span>
          </div>
        </div>

        <div class="card card-soft stack gap-sm">
          <div class="between">
            <span class="t-title-sm">Responses</span>
            <span class="badge badge-outline">${stats.total} invited</span>
          </div>
          ${N.statBar(stats, stats.total)}
        </div>

        <div class="stack gap-xs">
          <div class="between">
            <span class="t-upper">Your RSVP</span>
            <span class="t-caption c-muted">Updates the table and stats live</span>
          </div>
          ${rsvpControl(e, { labels: true })}
        </div>

        <div class="stack gap-xs">
          <div class="between">
            <span class="t-upper">Per-person responses</span>
            <span class="t-caption c-muted">${records.length} ${records.length === 1 ? 'person' : 'people'} invited</span>
          </div>
          <div class="stack" style="max-height:260px;overflow:auto">
            ${records
              .map((r) => {
                const u = userById(r.userId);
                return `<div class="list-row">
                  ${N.avatar(u, { size: 'sm' })}
                  <span class="grow stack" style="gap:0">
                    <span class="t-body-sm c-ink" style="font-weight:500">${esc(u.name)}</span>
                    <span class="t-caption c-soft">${esc(u.jobTitle)}</span>
                  </span>
                  ${
                    r.status
                      ? `<span class="stack" style="gap:0;align-items:flex-end">
                          ${statusBadge(r.status)}
                          <span class="t-caption c-soft">${r.respondedAt ? esc(fmtRelative(r.respondedAt)) : 'No timestamp'}</span>
                        </span>`
                      : `<span class="badge badge-outline c-muted">${icon('clock', { size: 13 })} Awaiting reply</span>`
                  }
                </div>`;
              })
              .join('')}
          </div>
        </div>

        <div class="row gap-sm" style="justify-content:flex-end">
          <a class="btn btn-secondary btn-sm" href="event-detail.html?id=${e.id}">Open event</a>
          <button type="button" class="btn btn-primary btn-sm" data-panel-close>Done</button>
        </div>
      </div>
    </div>`;
  }

  // ── render ────────────────────────────────────────────────────────────────

  function render() {
    const s = summary();
    const counts = Object.fromEntries(FILTERS.map((f) => [f.value, rows(f.value).length]));

    const body = `
      <section class="grid grid-4">
        ${kpi({
          value: s.upcoming,
          unit: 'upcoming',
          label: 'Upcoming events',
          body: s.next
            ? `Next: ${esc(s.next.title)} · ${esc(fmtDay(s.next.startAt.slice(0, 10)))}`
            : 'No events on the calendar yet.',
          tone: 'brand-teal',
        })}
        ${kpi({
          value: s.responses,
          unit: 'responses',
          label: 'Total responses',
          body: 'Every RSVP collected across scheduled and finished events.',
          tone: 'brand-pink',
        })}
        ${kpi({
          value: `${s.rate}%`,
          unit: 'attending',
          label: 'Attendance rate',
          body: 'Share of answers that are attending, across upcoming events.',
          tone: 'brand-ochre',
        })}
        ${kpi({
          value: s.awaiting,
          unit: 'people',
          label: 'Awaiting reply',
          body: 'Invitees who have not answered yet. Nudge them from the panel.',
          tone: 'brand-lavender',
        })}
      </section>

      <section class="stack gap-md">
        <div class="between wrap gap-sm">
          <div class="pill-tabs" role="group" aria-label="Filter events">
            ${FILTERS.map(
              (f) => `<button type="button" class="pill-tab ${filter === f.value ? 'is-active' : ''}" data-filter="${f.value}">
                ${esc(f.label)}
                <span class="badge badge-outline" style="padding:0 8px;min-width:22px;justify-content:center">${counts[f.value]}</span>
              </button>`,
            ).join('')}
          </div>
          <span class="t-caption c-muted">${rows(filter).length} of ${N.state.data.events.length} events</span>
        </div>
        ${table()}
      </section>`;

    N.$('[data-slot="shell"]').innerHTML =
      N.shellWeb({
        active: 'events.html',
        breadcrumb: 'Engage',
        title: 'Events',
        subtitle: 'Collect RSVPs, watch attendance build, and see who still owes you an answer.',
        actions: `<a class="btn btn-primary" href="event-new.html">${icon('plus', { size: 18 })} Create event</a>
          <a class="btn btn-secondary" href="calendar.html">Open calendar</a>`,
        body,
      }) + panel();

    N.$$('[data-filter]').forEach((btn) =>
      btn.addEventListener('click', () => {
        filter = btn.dataset.filter;
        render();
      }),
    );

    N.$$('[data-event-open]').forEach((btn) =>
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        openEventId = btn.dataset.eventOpen;
        render();
      }),
    );

    // A row is a shortcut into the same attendance panel.
    N.$$('[data-row]').forEach((tr) =>
      tr.addEventListener('click', (ev) => {
        if (ev.target.closest('button, a')) return;
        openEventId = tr.dataset.row;
        render();
      }),
    );

    const scrim = N.$('#event-panel');
    if (scrim) {
      N.$$('[data-panel-close]', scrim).forEach((btn) =>
        btn.addEventListener('click', () => {
          openEventId = null;
          render();
        }),
      );
      scrim.addEventListener('click', (ev) => {
        if (ev.target === scrim) {
          openEventId = null;
          render();
        }
      });
    }
  }

  N.page('events', () => {
    N.live(render);
    render();
  });
})();
