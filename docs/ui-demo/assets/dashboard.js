/* Web reference · Dashboard overview.
   Reads the same state the feature pages mutate, so an RSVP or a confirmed
   notification is reflected here on the next visit. */

(() => {
  const N = window.NEXA;

  /** KPI tile: display-size number, label, and a link into the feature. */
  const KPI_ICON = { 'brand-teal': 'bell', 'brand-pink': 'calendar', 'brand-ochre': 'timer', 'brand-lavender': 'list' };

  function kpi({ value, unit, label, body, href, link, tone }) {
    return `<article class="card card-pad-xl stack gap-sm" style="justify-content:space-between">
      <div class="between">
        <span class="t-upper">${label}</span>
        <span class="empty-art" style="width:36px;height:36px;border-radius:var(--radius-md);background-color:var(--tint-${tone})">
          ${N.icon(KPI_ICON[tone] ?? 'info', { size: 18 })}
        </span>
      </div>
      <div class="row gap-xs" style="align-items:baseline">
        <span class="t-display-sm t-num">${value}</span>
        ${unit ? `<span class="t-body-sm c-muted">${unit}</span>` : ''}
      </div>
      <p class="t-body-sm c-muted">${body}</p>
      <a class="link-btn" href="${href}">${link} ${N.icon('arrowRight', { size: 14 })}</a>
    </article>`;
  }

  /** Surface token name → feature-card class suffix.
   *  Data carries the full token name (`brand-ochre`); the kit class drops the
   *  `brand-` prefix (`feature-card-ochre`) and `surface-card` maps to `cream`.
   *  Getting this wrong renders an unstyled card, so it goes through one place. */
  const cardClass = (colour) =>
    `feature-card feature-card-${colour === 'surface-card' ? 'cream' : String(colour).replace('brand-', '')}`;

  function countdownStrip() {
    const live = N.state.data.countdowns
      .map((c) => ({ ...c, remaining: N.countdownRemaining(c.targetDate) }))
      .filter((c) => !c.remaining.isPast)
      .sort((a, b) => a.remaining.days - b.remaining.days)
      .slice(0, 3);

    return `<div class="grid grid-3">
      ${live
        .map(
          (c) => `<article class="${cardClass(c.color)}" data-countdown="${c.id}" style="min-height:200px">
            <span class="t-upper" style="color:inherit;opacity:.75">${N.COUNTDOWN_TYPE_META[c.type].label}</span>
            <strong class="t-title-md" style="color:inherit;min-height:50px">${N.esc(c.title)}</strong>
            <div class="row gap-sm" style="align-items:baseline">
              <span class="countdown-num" style="font-size:var(--text-display-2xl-size);color:inherit" data-cd-days>${c.remaining.days}</span>
              <span class="t-body-sm" style="color:inherit;opacity:.8">days</span>
              <span class="countdown-num" style="font-size:var(--text-display-xs-size);color:inherit" data-cd-clock>${String(c.remaining.hours).padStart(2, '0')}:${String(c.remaining.minutes).padStart(2, '0')}:${String(c.remaining.seconds).padStart(2, '0')}</span>
            </div>
            <div class="frag">
              <div class="frag-row"><span>${N.fmtDay(c.targetDate)}</span><span>${N.icon('arrowRight', { size: 12 })}</span></div>
            </div>
          </article>`,
        )
        .join('')}
    </div>`;
  }

  function notificationList() {
    const list = [...N.state.data.notifications]
      .filter((n) => !n.response.actionKey)
      .sort((a, b) => new Date(a.dueAt ?? 0) - new Date(b.dueAt ?? 0))
      .slice(0, 4);
    if (!list.length) {
      return N.emptyState('Inbox zero', 'Every notification has an answer. New ones appear here.', '');
    }
    return `<div class="stack gap-sm">${list.map((n) => N.notifCard(n, { detail: true })).join('')}</div>`;
  }

  function upcomingEvents() {
    const list = [...N.state.data.events]
      .filter((e) => new Date(e.startAt).getTime() > Date.now() - 3600000)
      .sort((a, b) => new Date(a.startAt) - new Date(b.startAt))
      .slice(0, 3);
    return `<div class="stack gap-sm">${list
      .map((e) => {
        const stats = N.eventStats(e);
        return `<a class="card card-hover row gap-md" href="event-detail.html?id=${e.id}" style="text-decoration:none">
          <span class="stack center" style="width:52px;flex:none">
            <span class="t-upper" style="letter-spacing:1px">${new Date(e.startAt).toLocaleDateString([], { month: 'short' })}</span>
            <span class="t-display-sm t-num" style="font-size:var(--text-display-xs-size)">${new Date(e.startAt).getDate()}</span>
          </span>
          <span class="grow stack gap-xxs" style="min-width:0">
            <span class="t-title-sm truncate">${N.esc(e.title)}</span>
            <span class="t-caption c-muted">${N.fmtTime(e.startAt)} · ${N.esc(e.location)}</span>
            <span class="row gap-xs">${N.avatarStack(e.responses.map((r) => r.userId), { max: 4 })}
              <span class="t-caption c-muted"><strong class="c-ink t-num">${stats.attending}</strong> attending</span>
            </span>
          </span>
          ${N.icon('chevronRight', { size: 18, cls: 'c-soft' })}
        </a>`;
      })
      .join('')}</div>`;
  }

  function todayTodos() {
    const today = N.isoDay(0);
    const schedule = N.state.data.todos.find((s) => s.date === today && s.templateId === 't_01');
    const template = schedule ? N.templateById(schedule.templateId) : null;
    if (!schedule || !template) return '';

    const done = schedule.completed.length;
    const total = template.tasks.length;
    return `<div class="card card-pad-xl stack gap-md">
      <div class="between">
        <div class="stack" style="gap:0">
          <span class="t-title-sm">${N.esc(template.name)}</span>
          <span class="t-caption c-muted">${done} of ${total} done · applied to ${N.fmtDay(schedule.date)}</span>
        </div>
        <span class="badge ${done === total ? 'badge-success' : ''}">${done === total ? 'Complete' : 'In progress'}</span>
      </div>
      ${N.progressTodo(done, total)}
      <div class="stack">
        ${template.tasks
          .map(
            (t) => `<label class="row gap-sm" style="padding:8px 0;border-bottom:1px solid var(--color-hairline-soft);cursor:pointer">
              <input type="checkbox" class="check-input" data-task="${t.id}" data-schedule="${schedule.id}" ${schedule.completed.includes(t.id) ? 'checked' : ''} style="appearance:none;width:20px;height:20px;border:1px solid var(--color-hairline);border-radius:var(--radius-xs);flex:none" />
              <span class="t-body-sm ${schedule.completed.includes(t.id) ? 'c-muted' : 'c-ink'}" style="${schedule.completed.includes(t.id) ? 'text-decoration:line-through' : ''}">${N.esc(t.title)}</span>
            </label>`,
          )
          .join('')}
      </div>
      <a class="link-btn" href="todos.html">Open todo templates ${N.icon('arrowRight', { size: 14 })}</a>
    </div>`;
  }

  function activityFeed() {
    const items = [
      { who: 'u_02', text: 'created <strong>Design system review</strong> and invited the whole team', when: N.isoTime(-1, 16, 20), tone: 'brand-teal' },
      { who: 'u_03', text: 'confirmed <strong>Standup notes</strong>', when: N.isoTime(-1, 9, 45), tone: 'success' },
      { who: 'u_04', text: 'snoozed <strong>Timesheet — week 42</strong> to tomorrow 09:00', when: N.isoTime(-1, 15, 2), tone: 'warning' },
      { who: 'u_01', text: 'applied <strong>Release checklist</strong> to 6 upcoming Wednesdays', when: N.isoTime(-2, 10, 0), tone: 'brand-lavender' },
      { who: 'u_06', text: 'answered <strong>not attending</strong> to the Q3 checkpoint', when: N.isoTime(-1, 15, 20), tone: 'error' },
    ];
    return `<div class="stack">
      ${items
        .map(
          (i) => `<div class="list-row">
            ${N.avatar(i.who, { size: 'sm' })}
            <span class="grow stack" style="gap:0;min-width:0">
              <span class="t-body-sm c-body">${i.text}</span>
              <span class="t-caption c-soft">${N.userById(i.who).name} · ${N.fmtRelative(i.when)}</span>
            </span>
            <span class="cal-dot" style="background-color:var(--color-${i.tone === 'success' ? 'success' : i.tone === 'warning' ? 'warning' : i.tone === 'error' ? 'error' : i.tone})"></span>
          </div>`,
        )
        .join('')}
    </div>`;
  }

  function render() {
    const unread = N.unreadCount();
    const liveEvents = N.state.data.events.filter((e) => new Date(e.endAt ?? e.startAt) > new Date());
    const attending = liveEvents.reduce((sum, e) => sum + N.eventStats(e).attending, 0);
    const responses = liveEvents.reduce((sum, e) => sum + e.responses.length, 0);
    const nextEvent = liveEvents.sort((a, b) => new Date(a.startAt) - new Date(b.startAt))[0];

    const body = `
      <section class="grid grid-4">
        ${kpi({
          value: unread,
          unit: 'awaiting you',
          label: 'Notifications',
          body: 'Interactive cards with Confirm, Snooze, and Dismiss actions.',
          href: 'notifications.html',
          link: 'Open inbox',
          tone: 'brand-teal',
        })}
        ${kpi({
          value: liveEvents.length,
          unit: 'upcoming',
          label: 'Events',
          body: nextEvent ? `Next: ${N.esc(nextEvent.title)} · ${N.fmtRange(nextEvent.startAt, nextEvent.endAt)}` : 'No events scheduled.',
          href: 'events.html',
          link: 'Open events',
          tone: 'brand-pink',
        })}
        ${kpi({
          value: N.state.data.countdowns.filter((c) => !N.countdownRemaining(c.targetDate).isPast).length,
          unit: 'running',
          label: 'Countdowns',
          body: 'Live timers that also pin themselves to the calendar.',
          href: 'countdowns.html',
          link: 'Open countdowns',
          tone: 'brand-ochre',
        })}
        ${kpi({
          value: responses,
          unit: `responses · ${attending} attending`,
          label: 'RSVP activity',
          body: 'Attendance statistics refresh as responses arrive.',
          href: 'events.html',
          link: 'Open stats',
          tone: 'brand-lavender',
        })}
      </section>

      <section class="stack gap-md">
        <div class="between">
          <h2 class="t-title-lg">Live countdowns</h2>
          <a class="link-btn" href="countdowns.html">All countdowns ${N.icon('arrowRight', { size: 14 })}</a>
        </div>
        ${countdownStrip()}
      </section>

      <section class="grid grid-2" style="align-items:start">
        <div class="stack gap-md">
          <div class="between">
            <h2 class="t-title-lg">Needs your response</h2>
            <span class="badge ${unread ? 'badge-error' : 'badge-success'}">${unread ? `${unread} open` : 'All clear'}</span>
          </div>
          ${notificationList()}
        </div>

        <div class="stack gap-lg">
          <div class="stack gap-md">
            <div class="between">
              <h2 class="t-title-lg">Upcoming events</h2>
              <a class="link-btn" href="events.html">All events ${N.icon('arrowRight', { size: 14 })}</a>
            </div>
            ${upcomingEvents()}
          </div>
          ${todayTodos()}
        </div>
      </section>

      <section class="grid grid-2" style="align-items:start">
        <div class="card card-pad-xl stack gap-md">
          <div class="between">
            <h2 class="t-title-md">Activity</h2>
            <button class="icon-btn icon-btn-sm" title="Filter feed">${N.icon('filter', { size: 16 })}</button>
          </div>
          ${activityFeed()}
        </div>
        <div class="card card-soft card-pad-xl stack gap-md">
          <h2 class="t-title-md">Team snapshot</h2>
          <div class="row gap-md wrap">
            <div class="stat"><span class="stat-value t-num">${N.TEAM.members}</span><span class="t-caption c-muted">members</span></div>
            <div class="stat"><span class="stat-value t-num">${N.state.data.notifications.length}</span><span class="t-caption c-muted">notifications</span></div>
            <div class="stat"><span class="stat-value t-num">${N.state.data.events.length}</span><span class="t-caption c-muted">events</span></div>
            <div class="stat"><span class="stat-value t-num">${N.state.data.templates.length}</span><span class="t-caption c-muted">templates</span></div>
          </div>
          <hr class="divider" />
          <div class="stack gap-sm">
            ${N.USERS.slice(0, 5)
              .map(
                (u) => `<div class="list-row">
                  ${N.avatar(u, { size: 'sm' })}
                  <span class="grow stack" style="gap:0">
                    <span class="t-body-sm c-ink" style="font-weight:500">${N.esc(u.name)}</span>
                    <span class="t-caption">${N.esc(u.jobTitle)}</span>
                  </span>
                  <a class="link-btn t-caption" href="notifications.html?to=${u.id}">Message</a>
                </div>`,
              )
              .join('')}
          </div>
          <a class="btn btn-secondary btn-block" href="team.html">Manage team</a>
        </div>
      </section>`;

    N.$('[data-slot="shell"]').innerHTML = N.shellWeb({
      active: 'dashboard.html',
      breadcrumb: 'Overview',
      title: 'Dashboard',
      subtitle: `${N.ME.name} · ${N.TEAM.name} · everything the team owes you in one place.`,
      body,
    });

    // Local todo check-off
    N.$$('[data-task]').forEach((box) =>
      box.addEventListener('change', () => {
        N.toggleTask(box.dataset.schedule, box.dataset.task);
        render();
      }),
    );
  }

  /** Live timers: only the numeric part changes, so the DOM stays stable. */
  function tick() {
    N.$$('[data-countdown]').forEach((el) => {
      const c = N.countdownById(el.dataset.countdown);
      if (!c) return;
      const r = N.countdownRemaining(c.targetDate);
      const days = N.$('[data-cd-days]', el);
      const clock = N.$('[data-cd-clock]', el);
      if (days) days.textContent = r.days;
      if (clock) {
        clock.textContent = `${String(r.hours).padStart(2, '0')}:${String(r.minutes).padStart(2, '0')}:${String(r.seconds).padStart(2, '0')}`;
      }
    });
  }

  N.page('dashboard', () => {
    N.live(render);
    render();
    tick();
    setInterval(tick, 1000);
  });
})();
