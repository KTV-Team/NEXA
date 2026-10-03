/* F6 · Countdowns (web).
   GET    /countdowns                 → the card grid below
   GET    /countdowns/:id             → remaining time, recomputed every second
   POST   /countdowns                 → "New countdown" (title, type, target, note)
   PATCH  /countdowns/:id             → edit modal
   DELETE /countdowns/:id             → confirmDialog then remove
   A countdown also pins itself to the calendar (CalendarEntry type 'countdown'). */

(() => {
  const N = window.NEXA;
  const { esc, icon, isoDay, dayDiff, fmtDay, parseDay, COUNTDOWN_TYPE_META } = N;

  // The six sanctioned saturated surfaces, in the fixed rotation order.
  const SURFACES = ['brand-pink', 'brand-teal', 'brand-lavender', 'brand-peach', 'brand-ochre', 'surface-card'];
  const SURFACE_LABEL = {
    'brand-pink': 'Pink',
    'brand-teal': 'Teal',
    'brand-lavender': 'Lavender',
    'brand-peach': 'Peach',
    'brand-ochre': 'Ochre',
    'surface-card': 'Cream',
  };
  const FILTERS = [{ value: 'all', label: 'All' }, ...Object.keys(COUNTDOWN_TYPE_META).map((k) => ({ value: k, label: COUNTDOWN_TYPE_META[k].label }))];

  const pad = (n) => String(n).padStart(2, '0');
  const clock = (r) => `${pad(r.hours)}:${pad(r.minutes)}:${pad(r.seconds)}`;

  let filter = 'all';
  let formOpen = false;
  let editingId = null;
  let formError = '';
  const form = { title: '', type: 'deadline', targetDate: isoDay(7), note: '', color: 'brand-teal' };
  let seq = 0;

  // ── derived data ──────────────────────────────────────────────────────────

  const withRemaining = () =>
    N.state.data.countdowns.map((c) => ({ ...c, remaining: N.countdownRemaining(c.targetDate) }));

  const running = () => withRemaining().filter((c) => !c.remaining.isPast).sort((a, b) => a.remaining.days - b.remaining.days);
  const past = () => withRemaining().filter((c) => c.remaining.isPast).sort((a, b) => b.remaining.days - a.remaining.days);
  const listFor = (value) =>
    (value === 'all' ? withRemaining() : withRemaining().filter((c) => c.type === value)).sort(
      (a, b) => Number(a.remaining.isPast) - Number(b.remaining.isPast) || (a.remaining.isPast ? b.remaining.days - a.remaining.days : a.remaining.days - b.remaining.days),
    );

  /** Feature cards never repeat the same saturated surface twice in a row. */
  function stagger(colours) {
    const out = [];
    colours.forEach((c, i) => {
      let pick = SURFACES.includes(c) ? c : SURFACES[i % SURFACES.length];
      if (i > 0 && pick === out[i - 1]) pick = SURFACES[(SURFACES.indexOf(pick) + 1) % SURFACES.length];
      out.push(pick);
    });
    return out;
  }

  function summary() {
    const live = running();
    return {
      running: live.length,
      past: past().length,
      next: live[0],
      longest: [...live].sort((a, b) => b.remaining.days - a.remaining.days)[0],
    };
  }

  // ── calendar cross-link ───────────────────────────────────────────────────

  function syncCalendar(c) {
    const entry = N.state.data.calendar.find((e) => e.type === 'countdown' && e.refId === c.id);
    if (entry) {
      entry.title = c.title;
      entry.date = c.targetDate;
      return;
    }
    N.state.data.calendar.push({ id: `c_cd_${c.id}`, type: 'countdown', title: c.title, date: c.targetDate, refId: c.id });
  }

  function dropCalendar(id) {
    N.state.data.calendar = N.state.data.calendar.filter((e) => !(e.type === 'countdown' && e.refId === id));
  }

  // ── pieces ────────────────────────────────────────────────────────────────

  const KPI_ICON = { 'brand-teal': 'timer', 'brand-pink': 'flag', 'brand-ochre': 'alert', 'brand-lavender': 'chart' };

  function kpi(o) {
    return `<article class="card card-pad-xl stack gap-sm" style="justify-content:space-between">
      <div class="between">
        <span class="t-upper">${esc(o.label)}</span>
        <span class="empty-art" style="width:36px;height:36px;border-radius:var(--radius-md);background-color:var(--tint-${o.tone})">
          ${icon(KPI_ICON[o.tone] ?? 'timer', { size: 18 })}
        </span>
      </div>
      <div class="row gap-xs" style="align-items:baseline">
        <span class="t-display-sm t-num">${o.value}</span>
        ${o.unit ? `<span class="t-body-sm c-muted">${esc(o.unit)}</span>` : ''}
      </div>
      <p class="t-body-sm c-muted">${o.body}</p>
    </article>`;
  }

  function readout(c, big) {
    const size = big ? 't-display-md' : 't-display-sm';
    const clockSize = big ? 't-title-lg' : 't-title-md';
    // On a saturated feature card the type tokens must defer to the card colour.
    const inherit = big ? 'color:inherit;' : '';
    return `<div class="row gap-sm wrap" style="align-items:baseline">
      <span class="row gap-xs" style="align-items:baseline">
        <span class="countdown-num ${size}" style="${inherit}" data-cd-days>${c.remaining.days}</span>
        <span class="t-body-sm" style="${inherit}${big ? 'opacity:.8' : ''}">${c.remaining.days === 1 ? 'day' : 'days'}</span>
      </span>
      <span class="countdown-num ${clockSize} ${big ? '' : 'c-muted'}" style="${inherit}" data-cd-clock>${clock(c.remaining)}</span>
    </div>`;
  }

  function cardActions(c) {
    return `<span class="row gap-xxs">
      <button type="button" class="icon-btn icon-btn-sm" data-cd-edit="${c.id}" aria-label="Edit ${esc(c.title)}" title="Edit">${icon(
        'edit',
        { size: 16, cls: 'c-soft' },
      )}</button>
      <button type="button" class="icon-btn icon-btn-sm" data-cd-delete="${c.id}" aria-label="Delete ${esc(c.title)}" title="Delete">${icon(
        'trash',
        { size: 16, cls: 'c-soft' },
      )}</button>
    </span>`;
  }

  function featureCard(c, colour) {
    const meta = COUNTDOWN_TYPE_META[c.type];
    // The kit class drops the token's `brand-` prefix (`feature-card-ochre`).
    const suffix = colour === 'surface-card' ? 'cream' : colour.replace('brand-', '');
    return `<article class="feature-card feature-card-${suffix} stack gap-sm" data-countdown="${c.id}">
      <div class="between">
        <span class="row gap-xs t-upper" style="color:inherit;opacity:.8">${icon(meta.icon, { size: 15 })} ${esc(meta.label)}</span>
        <span class="row gap-xxs">
          <button type="button" class="icon-btn icon-btn-sm" data-cd-edit="${c.id}" aria-label="Edit ${esc(c.title)}" title="Edit" style="color:inherit">${icon(
            'edit',
            { size: 16 },
          )}</button>
          <button type="button" class="icon-btn icon-btn-sm" data-cd-delete="${c.id}" aria-label="Delete ${esc(
            c.title,
          )}" title="Delete" style="color:inherit">${icon('trash', { size: 16 })}</button>
        </span>
      </div>
      <strong class="t-title-md" style="color:inherit">${esc(c.title)}</strong>
      ${readout(c, true)}
      ${c.note ? `<p class="t-body-sm" style="color:inherit;opacity:.85">${esc(c.note)}</p>` : ''}
      <div class="frag">
        <div class="frag-row"><span>Target · ${esc(fmtDay(c.targetDate))}</span><span class="t-num">${esc(c.targetDate)}</span></div>
        <div class="frag-row">
          <span class="row gap-xs">${N.avatar(c.ownerId, { size: 'sm' })}<span>${esc(N.userById(c.ownerId).name)}</span></span>
          <a class="link-btn t-caption" href="calendar.html?day=${c.targetDate}">View on calendar ${icon('arrowRight', { size: 13 })}</a>
        </div>
      </div>
    </article>`;
  }

  function plainCard(c) {
    const meta = COUNTDOWN_TYPE_META[c.type];
    const days = dayDiff(isoDay(0), c.targetDate);
    return `<article class="card card-hover stack gap-sm" data-countdown="${c.id}">
      <div class="between">
        <span class="row gap-xs">
          <span class="cal-dot" style="width:10px;height:10px;background-color:var(--color-${c.color === 'surface-card' ? 'surface-card' : c.color})"></span>
          <span class="t-upper">${esc(meta.label)}</span>
        </span>
        ${cardActions(c)}
      </div>
      <strong class="t-title-sm">${esc(c.title)}</strong>
      ${
        c.remaining.isPast
          ? `<span class="row gap-sm" style="align-items:baseline">
              <span class="countdown-num t-display-sm c-muted">${c.remaining.days}</span>
              <span class="t-body-sm c-muted">${c.remaining.days === 1 ? 'day' : 'days'} ago</span>
              <span class="badge badge-outline c-muted">Past due</span>
            </span>`
          : readout(c, false)
      }
      ${c.note ? `<p class="t-body-sm c-muted">${esc(c.note)}</p>` : ''}
      <hr class="divider divider-soft" />
      <div class="between gap-sm">
        <span class="row gap-xs">
          ${N.avatar(c.ownerId, { size: 'sm' })}
          <span class="stack" style="gap:0">
            <span class="t-caption c-ink">${esc(N.userById(c.ownerId).name)}</span>
            <span class="t-caption c-soft">${days === 0 ? 'Target is today' : `Target ${esc(fmtDay(c.targetDate))}`}</span>
          </span>
        </span>
        <a class="link-btn t-caption" href="calendar.html?day=${c.targetDate}">View on calendar ${icon('arrowRight', { size: 13 })}</a>
      </div>
    </article>`;
  }

  function grid() {
    const list = listFor(filter);
    if (!list.length) {
      return N.emptyState(
        'No countdowns here',
        'Countdowns are live timers to a deadline, birthday, anniversary, or any custom date. Create one and it appears here and on the calendar.',
        `<button type="button" class="btn btn-secondary btn-sm" data-new-countdown>${icon('plus', { size: 16 })} New countdown</button>`,
      );
    }
    const live = list.filter((c) => !c.remaining.isPast);
    const done = list.filter((c) => c.remaining.isPast);
    const colours = stagger(live.slice(0, 3).map((c) => c.color));

    return `<div class="stack gap-xl">
      ${
        live.length
          ? `<div class="grid" style="grid-template-columns:repeat(3,minmax(0,1fr))">
              ${live
                .map((c, i) => (i < 3 ? featureCard(c, colours[i]) : plainCard(c)))
                .join('')}
            </div>`
          : ''
      }
      ${
        done.length
          ? `<div class="stack gap-md">
              <div class="between">
                <h2 class="t-title-md">Past due</h2>
                <span class="t-caption c-muted">Kept for history — delete them whenever you like</span>
              </div>
              <div class="grid" style="grid-template-columns:repeat(3,minmax(0,1fr))">${done.map(plainCard).join('')}</div>
            </div>`
          : ''
      }
    </div>`;
  }

  function colourPicker() {
    return `<div class="stack gap-xs">
      <span class="label">Card colour</span>
      <div class="row wrap gap-xs" role="group" aria-label="Card colour">
        ${SURFACES.map(
          (c) => `<button type="button" class="chip" data-color="${c}" aria-pressed="${form.color === c}" style="border-color:${
            form.color === c ? 'var(--color-ink)' : 'var(--color-hairline)'
          }">
            <span class="cal-dot" style="width:12px;height:12px;background-color:var(--color-${c})"></span>
            ${SURFACE_LABEL[c]}
          </button>`,
        ).join('')}
      </div>
      <span class="hint">The six sanctioned surfaces. Urgent cards use them in rotation so no two neighbours match.</span>
    </div>`;
  }

  function formModal() {
    if (!formOpen) return '';
    return `<div class="scrim" id="countdown-form">
      <div class="modal" style="max-width:560px">
        <div class="between gap-md">
          <span class="stack" style="gap:0">
            <span class="t-caption c-muted">${editingId ? `PATCH /countdowns/${esc(editingId)}` : 'POST /countdowns'}</span>
            <strong class="t-title-md">${editingId ? 'Edit countdown' : 'New countdown'}</strong>
          </span>
          <button type="button" class="icon-btn" data-form-close aria-label="Close">${icon('x')}</button>
        </div>

        ${N.field('Title', N.input({ name: 'title', value: form.title, placeholder: 'e.g. NEXA public beta', invalid: !!formError }), {
          error: formError,
        })}

        <div class="grid grid-2" style="gap:var(--space-md)">
          ${N.field(
            'Type',
            N.select({
              name: 'type',
              value: form.type,
              options: Object.keys(COUNTDOWN_TYPE_META).map((k) => ({ value: k, label: COUNTDOWN_TYPE_META[k].label })),
            }),
            { hint: 'Sets the icon on the card.' },
          )}
          ${N.field('Target date', N.input({ name: 'targetDate', type: 'date', value: form.targetDate }), {
            hint: 'The timer counts down to 00:00 on this day.',
          })}
        </div>

        ${N.field('Note', N.textarea({ name: 'note', value: form.note, rows: 2, placeholder: 'Anything the team should know' }), {
          optional: true,
        })}

        ${colourPicker()}

        <div class="row gap-sm" style="justify-content:flex-end">
          <button type="button" class="btn btn-secondary" data-form-close>Cancel</button>
          <button type="button" class="btn btn-primary" data-form-save>${editingId ? 'Save countdown' : 'Create countdown'}</button>
        </div>
      </div>
    </div>`;
  }

  // ── render ────────────────────────────────────────────────────────────────

  function render() {
    const s = summary();
    const counts = Object.fromEntries(FILTERS.map((f) => [f.value, listFor(f.value).length]));

    const body = `
      <section class="grid grid-4">
        ${kpi({
          value: s.running,
          unit: 'running',
          label: 'Countdowns',
          body: 'Live timers recomputed every second from the target date.',
          tone: 'brand-teal',
        })}
        ${kpi({
          value: s.next ? s.next.remaining.days : 0,
          unit: s.next ? 'days to go' : 'nothing scheduled',
          label: 'Next milestone',
          body: s.next ? `${esc(s.next.title)} · ${esc(fmtDay(s.next.targetDate))}` : 'Add a countdown to start tracking a date.',
          tone: 'brand-pink',
        })}
        ${kpi({
          value: s.past,
          unit: 'past due',
          label: 'Past due',
          body: 'Finished timers stay listed so nothing disappears silently.',
          tone: 'brand-ochre',
        })}
        ${kpi({
          value: s.longest ? s.longest.remaining.days : 0,
          unit: 'days',
          label: 'Longest running',
          body: s.longest ? `${esc(s.longest.title)} is the furthest target on the board.` : 'No running countdown yet.',
          tone: 'brand-lavender',
        })}
      </section>

      <section class="between wrap gap-md">
        <div class="range-chips" role="group" aria-label="Filter by countdown type">
          ${FILTERS.map(
            (f) => `<button type="button" class="range-chip ${filter === f.value ? 'is-active' : ''}" data-filter="${f.value}">${
              esc(f.label)
            } <span class="t-num">${counts[f.value]}</span></button>`,
          ).join('')}
        </div>
        <span class="t-caption c-muted">Sorted by urgency · the three nearest render as feature cards</span>
      </section>

      ${grid()}`;

    N.$('[data-slot="shell"]').innerHTML =
      N.shellWeb({
        active: 'countdowns.html',
        breadcrumb: 'Plan',
        title: 'Countdowns',
        subtitle: 'Deadlines, birthdays, and anniversaries as live timers — each one also pins itself to the calendar.',
        actions: `<button type="button" class="btn btn-primary" data-new-countdown>${icon('plus', { size: 18 })} New countdown</button>
          <a class="btn btn-secondary" href="calendar.html">Open calendar</a>`,
        body,
      }) + formModal();

    N.$$('[data-filter]').forEach((btn) =>
      btn.addEventListener('click', () => {
        filter = btn.dataset.filter;
        render();
      }),
    );

    N.$$('[data-new-countdown]').forEach((btn) =>
      btn.addEventListener('click', () => {
        editingId = null;
        formError = '';
        form.title = '';
        form.type = 'deadline';
        form.targetDate = isoDay(7);
        form.note = '';
        form.color = 'brand-teal';
        formOpen = true;
        render();
      }),
    );

    N.$$('[data-cd-edit]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const c = N.countdownById(btn.dataset.cdEdit);
        if (!c) return;
        editingId = c.id;
        formError = '';
        form.title = c.title;
        form.type = c.type;
        form.targetDate = c.targetDate;
        form.note = c.note ?? '';
        form.color = c.color;
        formOpen = true;
        render();
      }),
    );

    N.$$('[data-cd-delete]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        const c = N.countdownById(btn.dataset.cdDelete);
        if (!c) return;
        const ok = await N.confirmDialog(
          `Delete “${c.title}”?`,
          'The timer disappears from this board and the matching pin is removed from the calendar.',
          'Delete countdown',
        );
        if (!ok) return;
        N.state.data.countdowns = N.state.data.countdowns.filter((x) => x.id !== c.id);
        dropCalendar(c.id);
        N.persist();
        render();
        N.toast('Countdown deleted');
      }),
    );

    const modal = N.$('#countdown-form');
    if (modal) {
      N.$$('[data-form-close]', modal).forEach((btn) =>
        btn.addEventListener('click', () => {
          formOpen = false;
          render();
        }),
      );
      modal.addEventListener('click', (ev) => {
        if (ev.target === modal) {
          formOpen = false;
          render();
        }
      });
      modal.addEventListener('input', (ev) => {
        const name = ev.target.name;
        if (name && name in form) form[name] = ev.target.value;
      });
      N.$$('[data-color]', modal).forEach((btn) =>
        btn.addEventListener('click', () => {
          form.color = btn.dataset.color;
          N.$$('[data-color]', modal).forEach((b) => {
            const on = b === btn;
            b.setAttribute('aria-pressed', String(on));
            b.style.borderColor = on ? 'var(--color-ink)' : 'var(--color-hairline)';
          });
        }),
      );
      N.$('[data-form-save]', modal).addEventListener('click', () => {
        const title = form.title.trim();
        if (!title) {
          formError = 'Give the countdown a title so the card and the calendar pin agree.';
          render();
          return;
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(form.targetDate)) {
          formError = 'Pick a target date.';
          render();
          return;
        }
        if (editingId) {
          const c = N.countdownById(editingId);
          Object.assign(c, { title, type: form.type, targetDate: form.targetDate, note: form.note, color: form.color });
          syncCalendar(c);
          N.persist();
          formOpen = false;
          render();
          N.toast(`Updated “${title}”`);
          return;
        }
        seq += 1;
        const created = {
          id: `cd_ui_${Date.now()}_${seq}`,
          title,
          type: form.type,
          targetDate: form.targetDate,
          ownerId: N.ME.id,
          note: form.note,
          color: form.color,
        };
        N.state.data.countdowns.push(created);
        syncCalendar(created);
        N.persist();
        formOpen = false;
        render();
        N.toast(`${title} counted down on the calendar too`);
      });
    }
  }

  /** One interval for the whole page; only the numeric nodes change. */
  function tick() {
    N.$$('[data-countdown]').forEach((el) => {
      const c = N.countdownById(el.dataset.countdown);
      if (!c) return;
      const r = N.countdownRemaining(c.targetDate);
      if (r.isPast) return;
      const days = N.$('[data-cd-days]', el);
      const time = N.$('[data-cd-clock]', el);
      if (days) days.textContent = r.days;
      if (time) time.textContent = clock(r);
    });
  }

  N.page('countdowns', () => {
    N.live(render);
    render();
    tick();
    setInterval(tick, 1000);
  });
})();
