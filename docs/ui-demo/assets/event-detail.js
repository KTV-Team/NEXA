/* F2 · Event detail — mobile.
   `?id=` selects the event; unknown ids fall through to NEXA.emptyState so the
   screen never renders a half-built hero. RSVP buttons carry data-rsvp /
   data-event and are performed by the global handler in ui.js, which then
   re-runs this renderer through nexa:changed. */

(() => {
  const N = window.NEXA;
  const { $, state, shellMobile, eventStats, emptyState, RSVP_META, USERS, TEAM } = N;

  /** Everyone the event was sent to — the denominator behind EventStats.total. */
  function audience(e) {
    const ids =
      e.recipients.mode === 'multi' && e.recipients.userIds?.length
        ? e.recipients.userIds
        : USERS.map((u) => u.id);
    return ids.map((id) => N.userById(id));
  }

  function rsvpControl(e) {
    return `<div class="segmented" role="group" aria-label="Your RSVP" style="display:flex;width:100%">
      ${['attending', 'not_attending', 'undecided']
        .map(
          (key) =>
            `<button type="button" class="${e.myStatus === key ? 'is-active' : ''}" data-rsvp="${key}" data-event="${e.id}" aria-pressed="${
              e.myStatus === key
            }" style="flex:1;padding:8px 6px">${N.esc(RSVP_META[key].label)}</button>`,
        )
        .join('')}
    </div>`;
  }

  function hero(e) {
    return `<article class="feature-card feature-card-${e.cover} stack gap-sm">
      <span class="t-upper" style="color:inherit;opacity:.75">${N.esc(TEAM.name)} · ${e.recipients.mode === 'all' ? 'whole team' : `${audience(e).length} invited`}</span>
      <strong class="t-display-sm" style="color:inherit">${N.esc(e.title)}</strong>
      <span class="row gap-xs t-body-sm" style="color:inherit;opacity:.92">${N.icon('clock', { size: 15 })}${N.fmtRange(e.startAt, e.endAt)}</span>
      <span class="row gap-xs t-body-sm" style="color:inherit;opacity:.92">${N.icon('mapPin', { size: 15 })}${N.esc(e.location)}</span>
      <div class="frag">
        <div class="frag-row">
          <span class="t-body-sm" style="font-weight:500">Your response</span>
          <span>${N.esc(e.myStatus ? RSVP_META[e.myStatus].label : 'Not answered yet')}</span>
        </div>
      </div>
    </article>`;
  }

  function statsBlock(e) {
    const stats = eventStats(e);
    const replied = stats.responses.filter((r) => r.respondedAt).length;
    const rate = stats.total ? Math.round((replied / stats.total) * 100) : 0;
    return `<section class="card stack gap-sm">
      <div class="between">
        <strong class="t-title-sm">Attendance</strong>
        <span class="t-caption c-muted">${stats.total} invited</span>
      </div>
      ${N.statBar(stats, stats.total)}
      <hr class="divider divider-soft" />
      <div class="kv"><dt>Replied</dt><dd>${replied} of ${stats.total} · ${rate}%</dd></div>
      <div class="kv"><dt>Your RSVP</dt><dd>${N.esc(e.myStatus ? RSVP_META[e.myStatus].label : 'Not answered yet')}</dd></div>
    </section>`;
  }

  /** One response row: identity, role, status chip, and when they answered. */
  function responseRow(e, user, response) {
    const meta = response ? RSVP_META[response.status] : null;
    const chip = meta
      ? `<span class="badge badge-${meta.tone}">${N.icon(meta.icon, { size: 13 })} ${meta.label}</span>`
      : `<span class="badge badge-outline c-muted">No reply yet</span>`;
    const when = response
      ? response.respondedAt
        ? N.fmtRelative(response.respondedAt)
        : 'Awaiting reply'
      : 'Awaiting reply';
    return `<div class="row gap-sm" style="padding:var(--space-sm) 0;border-bottom:1px solid var(--color-hairline-soft)">
      ${N.avatar(user, { size: 'sm' })}
      <span class="grow stack" style="gap:0;min-width:0">
        <span class="t-body-sm c-ink truncate" style="font-weight:500">${N.esc(user.name)}</span>
        <span class="t-caption truncate">${N.esc(user.jobTitle)} · ${when}</span>
      </span>
      ${chip}
    </div>`;
  }

  function responses(e) {
    const byUser = new Map(e.responses.map((r) => [r.userId, r]));
    const roster = audience(e);
    // Answerers first, then whoever still owes a reply.
    const ordered = [
      ...roster.filter((u) => byUser.get(u.id)?.respondedAt),
      ...roster.filter((u) => !byUser.get(u.id)?.respondedAt),
    ];
    return `<section class="card stack gap-sm">
      <div class="between">
        <strong class="t-title-sm">Responses</strong>
        <span class="t-caption c-muted">${roster.length} invited</span>
      </div>
      <div class="stack">${ordered.map((u) => responseRow(e, u, byUser.get(u.id))).join('')}</div>
    </section>`;
  }

  function unknownState(id) {
    return `<div class="stack gap-md">
      ${emptyState(
        'Event not found',
        `No event matches “${id}”. It may have been removed, or the link may be out of date.`,
        `<a class="btn btn-secondary btn-sm" href="m-events.html">Back to events</a>`,
      )}
    </div>`;
  }

  function render() {
    const id = N.param('id', state.data.events[0]?.id ?? 'e_01');
    const e = N.eventById(id);

    if (!e) {
      $('[data-slot="shell"]').innerHTML = shellMobile({
        active: '',
        title: 'Event',
        back: 'm-events.html',
        body: unknownState(id),
      });
      return;
    }

    const invitees = audience(e);
    $('[data-slot="shell"]').innerHTML = shellMobile({
      active: '',
      title: 'Event',
      subtitle: N.fmtDay(N.toDayStr(new Date(e.startAt))),
      back: 'm-events.html',
      actions: `<button class="icon-btn icon-btn-outline" data-role="share" aria-label="Share event">${N.icon('link')}</button>`,
      body: `
        ${hero(e)}
        <section class="stack gap-sm">
          <span class="t-upper">Your response</span>
          ${rsvpControl(e)}
        </section>
        ${statsBlock(e)}
        <section class="card stack gap-sm">
          <strong class="t-title-sm">About this event</strong>
          <p class="t-body-sm c-body">${N.esc(e.description)}</p>
          <hr class="divider divider-soft" />
          <div class="kv"><dt>Host</dt><dd>${N.esc(N.userById(e.createdBy).name)}</dd></div>
          <div class="kv"><dt>Invited</dt><dd>${invitees.length} ${invitees.length === 1 ? 'person' : 'people'}</dd></div>
          <div class="kv"><dt>Location</dt><dd>${N.esc(e.location)}</dd></div>
        </section>
        ${responses(e)}
        <div class="stack gap-sm">
          <button class="btn btn-secondary btn-block" data-role="calendar">${N.icon('calendar', { size: 16 })} Add to calendar</button>
          <button class="btn btn-ghost btn-block" data-role="message">${N.icon('send', { size: 16 })} Message attendees</button>
        </div>`,
    });

    $('[data-role="calendar"]')?.addEventListener('click', () =>
      N.toast('Draft calendar entry created for this event'),
    );
    $('[data-role="message"]')?.addEventListener('click', () =>
      N.toast(`Opening a message to ${invitees.length} attendees`),
    );
    $('[data-role="share"]')?.addEventListener('click', () => N.toast('Event link copied'));
  }

  N.page('event-detail', () => {
    N.live(render);
    render();
  });
})();
