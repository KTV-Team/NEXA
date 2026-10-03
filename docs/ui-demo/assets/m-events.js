/* F2 · Events & RSVP — mobile event list.
   Two things live here: the filter/list composition and the RSVP segmented
   control. The control is injected into each NEXA.eventCard() because the card
   renderer is shared; its buttons carry data-rsvp/data-event so the global
   handler in ui.js performs the mutation and re-runs this renderer. */

(() => {
  const N = window.NEXA;
  const { $, $$, state, shellMobile, eventCard, eventStats, isoDay, dayDiff, emptyState } = N;

  const FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'attending', label: 'Attending' },
    { value: 'pending', label: 'Pending' },
  ];

  let filter = 'all';

  /** Upcoming first, then most recent history. */
  const byStart = (a, b) => new Date(a.startAt) - new Date(b.startAt);

  function upcoming() {
    const now = Date.now();
    return state.data.events
      .filter((e) => new Date(e.endAt ?? e.startAt).getTime() >= now)
      .sort(byStart);
  }

  function visible() {
    const list = [...state.data.events].sort(byStart);
    if (filter === 'attending') return list.filter((e) => e.myStatus === 'attending');
    if (filter === 'pending') return list.filter((e) => !e.myStatus || e.myStatus === 'undecided');
    return list;
  }

  /** Spread onto the shared segmented recipe so the RSVP control reads as a control. */
  const SEG_BUTTONS = 'class="segmented" style="display:flex;width:100%"';

  /** The three RSVP choices for one event; the active one is the saved state. */
  function rsvpControl(e) {
    return `<div ${SEG_BUTTONS}>${['attending', 'not_attending', 'undecided']
      .map(
        (key) =>
          `<button type="button" class="${e.myStatus === key ? 'is-active' : ''}" data-rsvp="${key}" data-event="${e.id}" aria-pressed="${
            e.myStatus === key
          }" style="flex:1;padding:8px 6px">${N.esc(N.RSVP_META[key].label)}</button>`,
      )
      .join('')}</div>`;
  }

  /**
   * eventCard() is shared with the web surface, so the RSVP control is grafted
   * onto the rendered node just above the "View event" link.
   */
  function decorateRsvp() {
    $$('[data-event-card]').forEach((card) => {
      const e = N.eventById(card.dataset.eventCard);
      if (!e) return;
      $('[data-rsvp]', card)?.parentElement?.remove();
      const link = $('.link-btn', card);
      if (link) {
        // The shared card already links out; here the RSVP control takes the
        // prominent slot directly above it, so only the label is kept.
        const label = link.textContent.trim().replace(/\s+/g, ' ');
        $('svg', link)?.remove();
        link.textContent = label;
        link.style.display = 'inline-flex';
        link.style.minHeight = '0';
        link.style.paddingTop = 'var(--space-xxs)';
        link.insertAdjacentHTML('beforebegin', rsvpControl(e));
      } else {
        card.insertAdjacentHTML('beforeend', rsvpControl(e));
      }
    });
  }

  /** The soonest event gets a saturated hero with a countdown day badge. */
  function nextUp() {
    const e = upcoming()[0];
    if (!e) return '';
    const startDay = N.toDayStr(new Date(e.startAt));
    const days = Math.max(0, dayDiff(isoDay(0), startDay));
    const live = new Date(e.startAt).getTime() <= Date.now();
    const when = live ? 'Happening now' : days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`;
    // Countdown badge: the number stays display-size and the caption names the
    // moment, so it never reads "0 days to go" on the day itself.
    const badge = live ? 'Now' : String(days);
    const caption = live ? 'live' : days === 0 ? 'starts today' : days === 1 ? 'day to go' : 'days to go';
    const stats = eventStats(e);

    return `<section class="stack gap-sm">
      <div class="between">
        <span class="t-upper">Next up</span>
        <span class="t-caption c-muted">${N.esc(N.RSVP_META[e.myStatus]?.label ?? 'Needs your reply')}</span>
      </div>
      <a class="feature-card feature-card-${e.cover} stack gap-sm" href="event-detail.html?id=${e.id}" style="text-decoration:none">
        <div class="row gap-md">
          <span class="stack center gap-xxs" style="width:64px;flex:none">
            <span class="countdown-num" style="font-size:${live ? 'var(--text-title-md-size)' : '40px'};color:inherit">${badge}</span>
            <span class="t-caption" style="color:inherit;opacity:.8;white-space:nowrap">${caption}</span>
          </span>
          <span class="grow stack gap-xxs" style="min-width:0">
            <span class="t-upper" style="color:inherit;opacity:.75">${when}</span>
            <strong class="t-title-md" style="color:inherit">${N.esc(e.title)}</strong>
          </span>
        </div>
        <span class="t-body-sm" style="color:inherit;opacity:.9">${N.fmtRange(e.startAt, e.endAt)}</span>
        <div class="frag">
          <div class="frag-row">
            <span class="row gap-xs">${N.icon('mapPin', { size: 12 })}${N.esc(e.location)}</span>
            <span class="t-num">${stats.attending}/${stats.total} attending</span>
          </div>
          <div class="frag-bar"></div>
        </div>
      </a>
    </section>`;
  }

  /** Group the filtered events by calendar day. */
  function groups(list) {
    const out = [];
    list.forEach((e) => {
      const day = N.toDayStr(new Date(e.startAt));
      let g = out.find((x) => x.day === day);
      if (!g) {
        g = { day, label: N.fmtDay(day), items: [] };
        out.push(g);
      }
      g.items.push(e);
    });
    return out;
  }

  function list() {
    const items = visible();
    if (!items.length) {
      return emptyState(
        filter === 'pending' ? 'No open invitations' : 'Nothing to show',
        filter === 'pending'
          ? 'You have answered every invitation. New events land here as soon as a teammate invites you.'
          : 'No events match this filter yet.',
        `<a class="btn btn-secondary btn-sm" href="event-new.html">Create an event</a>`,
      );
    }
    return groups(items)
      .map(
        (g) => `<section class="stack gap-sm">
          <div class="between">
            <span class="t-upper">${g.label}</span>
            <span class="t-caption c-muted t-num">${g.items.length}</span>
          </div>
          <div class="stack gap-sm">
            ${g.items.map((e) => eventCard(e, { showStats: true })).join('')}
          </div>
        </section>`,
      )
      .join('');
  }

  function render() {
    const pending = state.data.events.filter((e) => !e.myStatus || e.myStatus === 'undecided').length;
    const attending = state.data.events.filter((e) => e.myStatus === 'attending').length;

    $('[data-slot="shell"]').innerHTML = shellMobile({
      active: '',
      title: 'Events',
      subtitle: `${upcoming().length} upcoming`,
      actions: `<button class="icon-btn icon-btn-outline" data-role="search" aria-label="Search events">${N.icon('search')}</button>`,
      body: `
        <div class="stack gap-sm">
          ${N.segmented(FILTERS, filter)}
          <span class="t-caption c-muted">${state.data.events.length} events · ${attending} attending · ${pending} pending</span>
        </div>
        ${nextUp()}
        ${list()}`,
      fab: `<a class="fab" href="event-new.html" aria-label="New event">${N.icon('plus', { size: 24 })}</a>`,
    });

    decorateRsvp();

    $$('[data-seg]').forEach((btn) =>
      btn.addEventListener('click', () => {
        filter = btn.dataset.seg;
        render();
      }),
    );
    $('[data-role="search"]')?.addEventListener('click', () => N.toast('Search is available in the web app'));
  }

  N.page('m-events', () => {
    N.live(render);
    render();
  });
})();
