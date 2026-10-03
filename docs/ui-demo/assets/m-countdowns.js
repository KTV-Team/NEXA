/* F6 · Countdowns (mobile).
   Summary strip, type filter, a featured next-up timer with a live d/h/m/s
   readout, upcoming cards, and a collapsed past section. The 1s clock is
   created once for the life of the page (never from render) and only rewrites
   the [data-cd-*] numbers, so the DOM stays stable between ticks. */

(() => {
  const N = window.NEXA;
  const {
    $, $$, esc, icon, state, shellMobile, emptyState, field, input, select, toast,
    persist, openSheet, isoDay, fmtDay, dayDiff, COUNTDOWN_TYPE_META,
    countdownById, countdownRemaining, ME,
  } = N;

  const TYPES = ['deadline', 'birthday', 'anniversary', 'custom'];
  const FILTERS = [{ value: 'all', label: 'All' }].concat(
    TYPES.map((t) => ({ value: t, label: COUNTDOWN_TYPE_META[t].label })),
  );

  /** Countdown colours are token names ('brand-teal'); the feature-card variants
   *  drop the prefix ('feature-card-teal'). Anything else falls back to cream. */
  const FEATURE_TONE = {
    'brand-pink': 'pink',
    'brand-teal': 'teal',
    'brand-lavender': 'lavender',
    'brand-peach': 'peach',
    'brand-ochre': 'ochre',
    'surface-card': 'cream',
  };
  const tone = (color) => FEATURE_TONE[color] ?? 'cream';

  // ── Page state ────────────────────────────────────────────────────────────
  let filter = 'all';
  let showPast = false;
  let sheet = null; // 'create-sheet' | 'edit-sheet'
  let editId = null;
  let draft = null; // typed values kept when validation fails
  let formError = '';
  let tickId = null;
  let localSeq = 0;

  const pad = (n) => String(n).padStart(2, '0');
  /** Same wording in the app bar and the summary strip: "4 timers running". */
  const timerNoun = (n) => `${n} ${n === 1 ? 'timer' : 'timers'}`;
  const withRemaining = () => state.data.countdowns.map((c) => ({ ...c, r: countdownRemaining(c.targetDate) }));
  const matches = (c) => filter === 'all' || c.type === filter;
  const bySoonest = (a, b) =>
    a.r.days - b.r.days || a.r.hours - b.r.hours || a.r.minutes - b.r.minutes || a.r.seconds - b.r.seconds;

  // ── Sections ──────────────────────────────────────────────────────────────

  /** Next milestone, running timers, and past timers — the whole dataset. */
  function summary() {
    const all = withRemaining();
    const next = all.filter((c) => !c.r.isPast).sort(bySoonest)[0];
    const running = all.filter((c) => !c.r.isPast).length;
    const done = all.length - running;
    const cells = [
      { value: next ? next.r.days : '—', label: 'days to next' },
      { value: running, label: running === 1 ? 'timer running' : 'timers running' },
      { value: done, label: done === 1 ? 'timer past' : 'timers past' },
    ];
    return `<div class="card card-soft row" style="padding:var(--space-md)">
      ${cells
        .map(
          (c, i) => `${
            i ? `<span style="flex:none;width:1px;height:34px;background-color:var(--color-hairline)"></span>` : ''
          }
        <span class="grow stack center" style="gap:0">
          <span class="stat-value t-num">${c.value}</span>
          <span class="t-caption">${esc(c.label)}</span>
        </span>`,
        )
        .join('')}
    </div>`;
  }

  function typeFilter() {
    const all = withRemaining();
    return `<div class="range-chips">
      ${FILTERS.map((f) => {
        const n = f.value === 'all' ? all.length : all.filter((c) => c.type === f.value).length;
        return `<button class="range-chip ${filter === f.value ? 'is-active' : ''}" data-type="${f.value}" aria-pressed="${
          filter === f.value
        }">${esc(f.label)}${n ? ` · ${n}` : ''}</button>`;
      }).join('')}
    </div>`;
  }

  function clockCell(key, value, unit, size) {
    return `<span class="stack center" style="gap:0">
      <span class="countdown-num t-num" style="font-size:${size}" data-cd-${key}>${value}</span>
      <span class="t-caption" style="color:inherit;opacity:.75">${unit}</span>
    </span>`;
  }

  function featured(c) {
    const meta = COUNTDOWN_TYPE_META[c.type];
    return `<article class="feature-card feature-card-${tone(c.color)}" data-countdown="${c.id}">
      <div class="between gap-sm">
        <span class="t-upper" style="color:inherit;opacity:.8">Next up · ${esc(meta.label)}</span>
        <span class="badge">${icon('timer', { size: 13 })} Live</span>
      </div>
      <strong class="t-title-lg" style="color:inherit">${esc(c.title)}</strong>
      <div class="row" style="justify-content:space-between;align-items:flex-end;white-space:nowrap">
        ${clockCell('days', pad(c.r.days), 'days', 'var(--text-display-md-size)')}
        ${clockCell('hours', pad(c.r.hours), 'hrs', 'var(--text-display-sm-size)')}
        ${clockCell('minutes', pad(c.r.minutes), 'min', 'var(--text-display-sm-size)')}
        ${clockCell('seconds', pad(c.r.seconds), 'sec', 'var(--text-display-sm-size)')}
      </div>
      ${c.note ? `<p class="t-body-sm" style="color:inherit;opacity:.85">${esc(c.note)}</p>` : ''}
      <div class="row gap-sm">
        <a class="btn btn-on-color grow" href="m-calendar.html?day=${c.targetDate}">${icon('calendar', { size: 16 })} Calendar</a>
        <button class="btn btn-on-color grow" data-edit="${c.id}" aria-label="Edit ${esc(c.title)}">${icon('edit', {
          size: 16,
        })} Edit</button>
      </div>
    </article>`;
  }

  function card(c) {
    const meta = COUNTDOWN_TYPE_META[c.type];
    const num = c.r.days > 0 ? c.r.days : c.r.hours;
    const unit = c.r.days > 0 ? (c.r.days === 1 ? 'day' : 'days') : c.r.hours === 1 ? 'hour' : 'hours';
    return `<article class="card stack gap-sm" data-countdown="${c.id}">
      <div class="row gap-sm">
        <span class="empty-art" style="width:40px;height:40px;border-radius:var(--radius-md);background-color:var(--tint-${meta.color})">${icon(
          meta.icon,
          { size: 18 },
        )}</span>
        <span class="grow stack" style="gap:0;min-width:0">
          <span class="t-title-sm truncate">${esc(c.title)}</span>
          <span class="row gap-xs wrap">
            <span class="badge badge-outline">${esc(meta.label)}</span>
            <span class="t-caption">${esc(fmtDay(c.targetDate))}</span>
          </span>
        </span>
        <span class="stack center" style="gap:0;flex:none">
          <span class="countdown-num t-num" style="font-size:var(--text-title-lg-size)">${num}</span>
          <span class="t-caption">${unit}</span>
        </span>
      </div>
      ${c.note ? `<p class="t-body-sm c-muted">${esc(c.note)}</p>` : ''}
      <div class="row gap-xs">
        <a class="btn btn-secondary grow" href="m-calendar.html?day=${c.targetDate}">${icon('calendar', {
          size: 16,
        })} Open in calendar</a>
        <button class="btn btn-secondary" data-edit="${c.id}">${icon('edit', { size: 16 })} Edit</button>
      </div>
    </article>`;
  }

  function pastCard(c) {
    const meta = COUNTDOWN_TYPE_META[c.type];
    const ago = c.r.days;
    return `<article class="card card-soft card-pad-sm row gap-sm" data-countdown="${c.id}">
      <span class="empty-art" style="width:36px;height:36px;border-radius:var(--radius-md);background-color:var(--color-surface-strong)">${icon(
        meta.icon,
        { size: 16 },
      )}</span>
      <span class="grow stack" style="gap:0;min-width:0">
        <span class="t-body-sm c-muted truncate" style="font-weight:500">${esc(c.title)}</span>
        <span class="t-caption c-soft">${esc(meta.label)} · ${esc(fmtDay(c.targetDate))}</span>
      </span>
      <span class="badge badge-outline c-muted">${ago === 0 ? 'today' : `${ago} ${ago === 1 ? 'day' : 'days'} ago`}</span>
    </article>`;
  }

  function upcomingSection(upcoming, pastList) {
    if (!upcoming.length) {
      return `<section class="stack gap-xs">
        <span class="t-upper">Upcoming</span>
        <p class="t-body-sm c-muted">${
          pastList.length
            ? 'Nothing is counting down in this filter — the past section below keeps the history.'
            : 'Nothing is counting down in this filter yet. Switch the filter to see the other timers.'
        }</p>
      </section>`;
    }
    return `<section class="stack gap-sm">
      <div class="between">
        <span class="t-upper">Upcoming · ${upcoming.length}</span>
        <span class="t-caption">soonest first</span>
      </div>
      ${upcoming.map(card).join('')}
    </section>`;
  }

  function pastSection(pastList) {
    if (!pastList.length) return '';
    return `<section class="stack gap-sm">
      <button class="card card-soft card-pad-sm between" data-toggle-past aria-expanded="${showPast}" style="width:100%">
        <span class="t-upper">Past · ${pastList.length}</span>
        <span class="row gap-xs t-caption">${showPast ? 'Hide' : 'Show'} ${icon(showPast ? 'chevronUp' : 'chevronDown', {
          size: 16,
        })}</span>
      </button>
      ${showPast ? `<div class="stack gap-xs">${pastList.map(pastCard).join('')}</div>` : ''}
    </section>`;
  }

  function nothing() {
    const filtered = filter !== 'all';
    return emptyState(
      filtered ? 'No countdowns of this type' : 'No countdowns yet',
      filtered
        ? `Nothing is tracking a ${COUNTDOWN_TYPE_META[
            filter
          ].label.toLowerCase()} date yet. Switch the filter, or create a countdown to start the clock.`
        : 'Countdowns track the dates you are waiting for — a deadline, a birthday, a launch. Create one and the days tick down here.',
      `<a class="btn btn-secondary btn-sm" href="countdown-new.html">New countdown</a>`,
    );
  }

  // ── Sheet ─────────────────────────────────────────────────────────────────

  function sheetHtml() {
    const editing = sheet === 'edit-sheet';
    const c = editing ? countdownById(editId) : null;
    const values = draft ?? {
      title: c ? c.title : '',
      type: c ? c.type : 'deadline',
      date: c ? c.targetDate : isoDay(7),
    };
    const meta = COUNTDOWN_TYPE_META[values.type];

    return `<div class="scrim sheet-host hidden" id="${editing ? 'edit-sheet' : 'create-sheet'}">
      <div class="sheet">
        <span class="sheet-handle"></span>
        <div class="between">
          <strong class="t-title-md">${editing ? 'Edit countdown' : 'New countdown'}</strong>
          <button class="icon-btn" data-close aria-label="Close">${icon('x')}</button>
        </div>
        <p class="t-body-sm c-muted">${
          editing
            ? 'Change the title, type, or target date — the live timer follows the new date.'
            : 'Set a target date and the timer starts counting down immediately.'
        }</p>
        ${field(
          'Title',
          input({ name: 'cd-title', value: values.title, placeholder: 'Design system v2 handoff', invalid: !!formError }),
          formError ? { error: formError } : {},
        )}
        ${field(
          'Type',
          select({
            name: 'cd-type',
            options: TYPES.map((t) => ({ value: t, label: COUNTDOWN_TYPE_META[t].label })),
            value: values.type,
          }),
        )}
        ${field('Target date', input({ name: 'cd-date', type: 'date', value: values.date }), {
          hint: 'Reminders fire 30, 7, and 1 day before the target.',
        })}
        <span class="row gap-xs t-body-sm c-muted">
          <span class="cal-dot" style="background-color:var(--color-${meta.color})"></span>Also appears on your calendar as a countdown entry
        </span>
        <button class="btn btn-primary btn-block" data-save>${editing ? 'Save changes' : 'Create countdown'}</button>
      </div>
    </div>`;
  }

  function save() {
    const editing = sheet === 'edit-sheet';
    const title = ($('[name="cd-title"]')?.value ?? '').trim();
    const type = $('[name="cd-type"]')?.value ?? 'deadline';
    const date = $('[name="cd-date"]')?.value ?? '';

    draft = { title, type, date };
    formError = '';
    if (!title) formError = 'Give the countdown a title so you know what it marks.';
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) formError = 'Choose a target date.';
    else if (!editing && dayDiff(isoDay(0), date) < 0) formError = 'Pick today or a later date — past countdowns move to the Past list.';

    if (formError) {
      render();
      return;
    }

    if (editing && editId) {
      const c = countdownById(editId);
      if (c) Object.assign(c, { title, type, targetDate: date });
      toast('Countdown updated');
    } else {
      state.data.countdowns.push({
        id: `cd_local_${++localSeq}`,
        title,
        type,
        targetDate: date,
        ownerId: ME.id,
        note: '',
        color: COUNTDOWN_TYPE_META[type].color,
      });
      filter = 'all';
      toast('Countdown created — the clock is live');
    }

    persist();
    formError = '';
    draft = null;
    sheet = null;
    editId = null;
    document.dispatchEvent(new CustomEvent('nexa:changed'));
  }

  // ── Wiring ────────────────────────────────────────────────────────────────

  function wire() {
    $$('[data-type]').forEach((btn) =>
      btn.addEventListener('click', () => {
        filter = btn.dataset.type;
        render();
      }),
    );

    const create = $('[data-new]');
    if (create) {
      create.addEventListener('click', () => {
        sheet = 'create-sheet';
        editId = null;
        draft = null;
        formError = '';
        render();
      });
    }

    $$('[data-edit]').forEach((btn) =>
      btn.addEventListener('click', () => {
        sheet = 'edit-sheet';
        editId = btn.dataset.edit;
        draft = null;
        formError = '';
        render();
      }),
    );

    const toggle = $('[data-toggle-past]');
    if (toggle) {
      toggle.addEventListener('click', () => {
        showPast = !showPast;
        render();
      });
    }

    const saveBtn = $('[data-save]');
    if (saveBtn) saveBtn.addEventListener('click', save);

    // Keep the local sheet bookkeeping in step with the global close handler.
    $$('.scrim').forEach((scrim) =>
      scrim.addEventListener('click', (e) => {
        if (e.target === scrim || e.target.closest('[data-close]')) {
          sheet = null;
          editId = null;
          draft = null;
          formError = '';
        }
      }),
    );
  }

  // ── Live clock ────────────────────────────────────────────────────────────

  /** Only the numeric nodes change, so the DOM stays stable between ticks. */
  function tick() {
    $$('[data-countdown]').forEach((el) => {
      const c = countdownById(el.dataset.countdown);
      if (!c) return;
      const r = countdownRemaining(c.targetDate);
      const set = (key, value) => {
        const node = $(`[data-cd-${key}]`, el);
        if (node) node.textContent = value;
      };
      set('days', pad(r.days));
      set('hours', pad(r.hours));
      set('minutes', pad(r.minutes));
      set('seconds', pad(r.seconds));
    });
  }

  /** Started once per page load — never from render(). */
  function startClock() {
    if (tickId) clearInterval(tickId);
    tick();
    tickId = setInterval(tick, 1000);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  function render() {
    const all = withRemaining();
    const shown = all.filter(matches).sort(bySoonest);
    const upcoming = shown.filter((c) => !c.r.isPast);
    const pastList = shown.filter((c) => c.r.isPast).sort((a, b) => a.r.days - b.r.days);
    const running = all.filter((c) => !c.r.isPast).length;
    const done = all.length - running;

    const body = `<div class="stack gap-md">
      ${summary()}
      ${typeFilter()}
      ${
        shown.length
          ? `${upcoming.length ? featured(upcoming[0]) : ''}${upcomingSection(upcoming, pastList)}${pastSection(pastList)}`
          : nothing()
      }
    </div>`;

    const shell = shellMobile({
      active: 'm-countdowns.html',
      title: 'Timers',
      subtitle: `${timerNoun(running)} running · ${timerNoun(done)} past`,
      actions: `<button class="icon-btn icon-btn-outline" data-new aria-label="New countdown">${icon('plus')}</button>`,
      body,
      fab: `<a class="fab" href="countdown-new.html" aria-label="New countdown">${icon('plus', { size: 24 })}</a>`,
    });

    $('[data-slot="shell"]').innerHTML = shell + sheetHtml();
    if (sheet) openSheet(sheet);
    wire();
  }

  N.page('m-countdowns', () => {
    N.live(render);
    render();
    startClock();
  });
})();
