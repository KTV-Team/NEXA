/* F4 · Calendar (web).
   GET  /calendar/events?from&to&types   → the month / week / day renderers below
   GET  /calendar/holidays?year          → the holiday strip
   POST /calendar/events                 → the "New entry" modal; a personal
   schedule entry is appended to state.data.calendar and re-rendered.
   `?day=YYYY-MM-DD` preselects a day (the todo schedules table links here). */

(() => {
  const N = window.NEXA;
  const { esc, icon, entriesOn, toDayStr, parseDay, isoDay, dayDiff, fmtDay, CAL_TYPE_META } = N;

  const VIEWS = [
    { value: 'month', label: 'Month' },
    { value: 'week', label: 'Week' },
    { value: 'day', label: 'Day' },
  ];
  const TYPE_KEYS = Object.keys(CAL_TYPE_META);
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const short = (d) => d.toLocaleDateString([], { day: 'numeric', month: 'short' });

  const fromUrl = /^\d{4}-\d{2}-\d{2}$/.test(N.param('day')) ? N.param('day') : '';
  let view = 'month';
  let selected = fromUrl || isoDay(0);
  let anchor = parseDay(selected);
  const types = Object.fromEntries(TYPE_KEYS.map((k) => [k, true]));

  let entryOpen = false;
  let entryError = '';
  const draft = { title: '', type: 'schedule', date: selected, startTime: '09:00', endTime: '10:00' };

  // ── derived data ──────────────────────────────────────────────────────────

  const visible = (day) => entriesOn(day).filter((e) => types[e.type]);
  const enabled = () => TYPE_KEYS.filter((k) => types[k]);
  /** Month cell dots follow the same filter as the agenda. `calendarMonth`
   *  treats an empty list as "show everything", so an all-off filter passes a
   *  sentinel type that matches nothing — the grid then agrees with the empty
   *  agenda instead of quietly drawing every dot again. */
  const dotTypes = () => (enabled().length ? enabled() : ['none']);

  function monthEntries() {
    const days = N.monthDays(anchor).map(toDayStr);
    return N.state.data.calendar.filter((e) => days.includes(e.date) && types[e.type]);
  }

  function periodLabel() {
    if (view === 'month') return N.monthLabel(anchor);
    if (view === 'week') {
      const week = N.weekDays(anchor);
      return `${short(week[0])} – ${short(week[6])}`;
    }
    return `${DAY_NAMES[anchor.getDay()]} ${short(anchor)}`;
  }

  function holidays() {
    return N.state.data.calendar
      .filter((e) => e.type === 'holiday')
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // ── pieces ────────────────────────────────────────────────────────────────

  function entryRow(e) {
    const meta = CAL_TYPE_META[e.type];
    const time = e.startTime ? `${e.startTime}${e.endTime ? `–${e.endTime}` : ''}` : 'All day';
    return `<div class="agenda-item">
      <span class="agenda-time t-num">${esc(time)}</span>
      <span class="agenda-rail" style="background-color:${meta.dot}"></span>
      <span class="agenda-body stack" style="gap:0">
        <span class="t-body-sm c-ink" style="font-weight:500">${esc(e.title)}</span>
        <span class="t-caption c-soft">${esc(meta.label)}${e.refId ? ` · ${esc(e.refId)}` : ''}</span>
      </span>
    </div>`;
  }

  function agendaCard() {
    const list = visible(selected);
    return `<div class="card stack gap-md">
      <div class="between gap-sm">
        <span class="stack" style="gap:0">
          <span class="t-upper">Selected day</span>
          <strong class="t-title-sm">${esc(fmtDay(selected))} <span class="c-muted t-body-sm">${esc(short(parseDay(selected)))}</span></strong>
        </span>
        <span class="badge ${list.length ? '' : 'badge-outline c-muted'}">${list.length} ${list.length === 1 ? 'entry' : 'entries'}</span>
      </div>
      ${
        list.length
          ? `<div class="stack gap-sm">${list.map(entryRow).join('')}</div>`
          : N.emptyState(
              'Nothing on this day',
              'Entries you add here, notification due dates, and countdown targets all land on this agenda.',
              `<button type="button" class="btn btn-secondary btn-sm" data-new-entry>${icon('plus', { size: 16 })} New entry</button>`,
            )
      }
    </div>`;
  }

  function typeCard() {
    return `<div class="card stack gap-sm">
      <div class="between">
        <span class="t-upper">Entry types</span>
        <span class="t-caption c-muted">${enabled().length} of ${TYPE_KEYS.length} shown</span>
      </div>
      <div class="stack gap-xs">
        ${TYPE_KEYS.map(
          (k) => `<label class="check" for="type-${k}">
            <input type="checkbox" id="type-${k}" data-type-filter="${k}" ${types[k] ? 'checked' : ''} />
            <span class="grow row gap-sm">
              <span class="cal-dot" style="background-color:${CAL_TYPE_META[k].dot}"></span>
              <span class="t-body-sm c-ink" style="font-weight:500">${esc(CAL_TYPE_META[k].label)}</span>
              <span class="t-caption c-muted" style="margin-left:auto">${visible(selected).filter((e) => e.type === k).length}</span>
            </span>
          </label>`,
        ).join('')}
      </div>
      <p class="t-caption c-muted">Filters the selected-day agenda, the month summary, and the holiday strip.</p>
    </div>`;
  }

  function nextSevenCard() {
    const days = [];
    for (let i = 0; i <= 13 && days.length < 3; i++) {
      const day = isoDay(i);
      if (visible(day).length) days.push(day);
    }
    if (!days.length) {
      return N.emptyState(
        'Nothing coming up',
        'The next two weeks are clear. Add a schedule entry or apply a todo template to fill them.',
        `<button type="button" class="btn btn-secondary btn-sm" data-new-entry>${icon('plus', { size: 16 })} New entry</button>`,
      );
    }
    return `<div class="grid grid-3">
      ${days
        .map(
          (day) => `<div class="card stack gap-sm">
            <div class="between gap-sm">
              <span class="stack" style="gap:0">
                <strong class="t-title-sm">${esc(fmtDay(day))}</strong>
                <span class="t-caption c-muted">${esc(short(parseDay(day)))} · ${visible(day).length} ${
                  visible(day).length === 1 ? 'entry' : 'entries'
                }</span>
              </span>
              <button type="button" class="link-btn t-caption" data-goto="${day}">Open day</button>
            </div>
            <div class="stack gap-xs">${visible(day).map(entryRow).join('')}</div>
          </div>`,
        )
        .join('')}
    </div>`;
  }

  function holidayStrip() {
    const list = types.holiday ? holidays() : [];
    return `<div class="card stack gap-sm">
      <div class="between">
        <span class="t-upper">Holidays</span>
        <span class="t-caption c-muted">${list.length} seeded</span>
      </div>
      ${
        list.length
          ? `<div class="stack">
              ${list
                .map((h) => {
                  const diff = dayDiff(isoDay(0), h.date);
                  const when =
                    diff === 0 ? 'Today' : diff > 0 ? `in ${diff} ${diff === 1 ? 'day' : 'days'}` : `${Math.abs(diff)} days ago`;
                  return `<button type="button" class="list-row" data-goto="${h.date}" style="width:100%;text-align:left">
                    <span class="cal-dot" style="background-color:${CAL_TYPE_META.holiday.dot}"></span>
                    <span class="grow stack" style="gap:0">
                      <span class="t-body-sm c-ink" style="font-weight:500">${esc(h.title)}</span>
                      <span class="t-caption c-muted">${esc(short(parseDay(h.date)))} · ${esc(when)}</span>
                    </span>
                    ${icon('chevronRight', { size: 15, cls: 'c-soft' })}
                  </button>`;
                })
                .join('')}
            </div>
            <span class="t-caption c-soft">GET /calendar/holidays?year=${parseDay(selected).getFullYear()}</span>`
          : `<p class="t-body-sm c-muted">The holiday layer is switched off. Turn it back on above to see the seeded public holidays.</p>`
      }
    </div>`;
  }

  function viewCard() {
    if (view === 'week') return `<div class="card">${N.calendarWeek({ anchor: toDayStr(anchor) })}</div>`;
    if (view === 'day') return `<div class="card">${N.timelineDay(selected)}</div>`;
    const count = monthEntries().length;
    return `<div class="card stack gap-md">
      <div class="between">
        <span class="t-caption c-muted">${count} ${count === 1 ? 'entry' : 'entries'} in ${esc(N.monthLabel(anchor))} · dots mark the entry types on each day</span>
        <button type="button" class="link-btn t-caption" data-nav="today">Jump to today</button>
      </div>
      ${N.calendarMonth({ month: anchor, selected, types: dotTypes() })}
    </div>`;
  }

  function entryModal() {
    if (!entryOpen) return '';
    return `<div class="scrim" id="entry-modal">
      <div class="modal" style="max-width:520px">
        <div class="between gap-md">
          <span class="stack" style="gap:0">
            <span class="t-caption c-muted">POST /calendar/events</span>
            <strong class="t-title-md">New calendar entry</strong>
          </span>
          <button type="button" class="icon-btn" data-entry-close aria-label="Close">${icon('x')}</button>
        </div>
        ${N.field('Title', N.input({ name: 'title', value: draft.title, placeholder: 'e.g. Focus block — token audit', invalid: !!entryError }), {
          error: entryError,
          hint: 'Sentence case, short enough to read in a month cell.',
        })}
        <div class="grid grid-2" style="gap:var(--space-md)">
          ${N.field(
            'Type',
            N.select({
              name: 'type',
              value: draft.type,
              options: TYPE_KEYS.map((k) => ({ value: k, label: CAL_TYPE_META[k].label })),
            }),
            { hint: 'Colour-codes the entry across every view.' },
          )}
          ${N.field('Date', N.input({ name: 'date', type: 'date', value: draft.date }))}
        </div>
        <div class="grid grid-2" style="gap:var(--space-md)">
          ${N.field('Start', N.input({ name: 'startTime', type: 'time', value: draft.startTime }))}
          ${N.field('End', N.input({ name: 'endTime', type: 'time', value: draft.endTime }), { optional: true })}
        </div>
        <div class="row gap-sm" style="justify-content:flex-end">
          <button type="button" class="btn btn-secondary" data-entry-close>Cancel</button>
          <button type="button" class="btn btn-primary" data-entry-save>Add entry</button>
        </div>
      </div>
    </div>`;
  }

  // ── render ────────────────────────────────────────────────────────────────

  function render() {
    const body = `
      <section class="between wrap gap-md">
        <div class="row wrap gap-md">
          ${N.segmented(VIEWS, view, 'data-view')}
          <div class="row gap-xs">
            <button type="button" class="icon-btn icon-btn-outline" data-nav="prev" aria-label="Previous period">${icon('chevronLeft')}</button>
            <strong class="t-title-sm center" style="min-width:190px">${esc(periodLabel())}</strong>
            <button type="button" class="icon-btn icon-btn-outline" data-nav="next" aria-label="Next period">${icon('chevronRight')}</button>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" data-nav="today">Today</button>
        </div>
        <button type="button" class="btn btn-primary" data-new-entry>${icon('plus', { size: 18 })} New entry</button>
      </section>

      <section class="grid" style="grid-template-columns:minmax(0,1fr) 340px;align-items:start">
        ${viewCard()}
        <div class="stack gap-lg">
          ${agendaCard()}
          ${typeCard()}
          ${holidayStrip()}
        </div>
      </section>

      <section class="stack gap-md">
        <div class="between">
          <h2 class="t-title-lg">Coming up</h2>
          <a class="link-btn" href="todos.html">Apply a todo template ${icon('arrowRight', { size: 14 })}</a>
        </div>
        ${nextSevenCard()}
      </section>`;

    N.$('[data-slot="shell"]').innerHTML =
      N.shellWeb({
        active: 'calendar.html',
        breadcrumb: 'Engage',
        title: 'Calendar',
        subtitle: 'One grid for your schedule, notification due dates, countdown targets, and team holidays.',
        body,
      }) + entryModal();

    // Period + view controls
    N.$$('[data-view]').forEach((btn) =>
      btn.addEventListener('click', () => {
        view = btn.dataset.view;
        render();
      }),
    );
    N.$$('[data-nav]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const dir = btn.dataset.nav;
        if (dir === 'today') {
          anchor = parseDay(isoDay(0));
          selected = isoDay(0);
        } else if (view === 'month') {
          anchor = new Date(anchor.getFullYear(), anchor.getMonth() + (dir === 'next' ? 1 : -1), 1);
          selected = toDayStr(anchor);
        } else {
          const step = view === 'week' ? 7 : 1;
          anchor = parseDay(isoDay(dayDiff(isoDay(0), toDayStr(anchor)) + (dir === 'next' ? step : -step)));
          selected = toDayStr(anchor);
        }
        render();
      }),
    );

    // Month cells drive the agenda; a cell outside the month also moves the anchor.
    N.$$('[data-day]').forEach((btn) =>
      btn.addEventListener('click', () => {
        selected = btn.dataset.day;
        const d = parseDay(selected);
        if (d.getMonth() !== anchor.getMonth() || d.getFullYear() !== anchor.getFullYear()) anchor = d;
        render();
      }),
    );

    N.$$('[data-type-filter]').forEach((box) =>
      box.addEventListener('change', () => {
        types[box.dataset.typeFilter] = box.checked;
        render();
      }),
    );

    N.$$('[data-goto]').forEach((btn) =>
      btn.addEventListener('click', () => {
        selected = btn.dataset.goto;
        anchor = parseDay(selected);
        render();
      }),
    );

    // New-entry modal
    N.$$('[data-new-entry]').forEach((btn) =>
      btn.addEventListener('click', () => {
        draft.date = selected;
        draft.title = '';
        entryError = '';
        entryOpen = true;
        render();
      }),
    );
    const modal = N.$('#entry-modal');
    if (modal) {
      N.$$('[data-entry-close]', modal).forEach((btn) =>
        btn.addEventListener('click', () => {
          entryOpen = false;
          render();
        }),
      );
      modal.addEventListener('click', (ev) => {
        if (ev.target === modal) {
          entryOpen = false;
          render();
        }
      });
      modal.addEventListener('input', (ev) => {
        const name = ev.target.name;
        if (name && name in draft) draft[name] = ev.target.value;
      });
      N.$('[data-entry-save]', modal).addEventListener('click', () => {
        const title = draft.title.trim();
        if (!title || !draft.date) {
          entryError = title ? 'Pick a date for this entry.' : 'Give the entry a title first.';
          render();
          return;
        }
        N.state.data.calendar.push({
          id: `c_ui_${N.state.data.calendar.length + 1}`,
          type: draft.type,
          title,
          date: draft.date,
          startTime: draft.startTime || undefined,
          endTime: draft.endTime || undefined,
        });
        N.persist();
        selected = draft.date;
        anchor = parseDay(draft.date);
        entryOpen = false;
        entryError = '';
        draft.title = '';
        render();
        N.toast(`Added “${title}” to ${fmtDay(draft.date)}`);
      });
    }
  }

  N.page('calendar', () => {
    N.live(render);
    render();
  });
})();
