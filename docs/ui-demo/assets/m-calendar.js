/* F4 · Unified calendar (mobile).
   One entry list, three views: a month grid, week blocks, and a day timeline.
   Tapping a day drives the agenda under the grid; the type filter narrows both
   the agenda and the grid dots. View, selection, selection month, and filter
   state live in this file — data.js keeps only the entries. */

(() => {
  const N = window.NEXA;
  const {
    $, $$, esc, icon, state, shellMobile, calendarMonth, calendarWeek, timelineDay,
    emptyState, segmented, field, input, check, toast, persist, confirmDialog,
    openSheet, isoDay, fmtDay, parseDay, toDayStr, dayDiff, monthLabel, weekDays,
    CAL_TYPE_META, entriesOn, ME,
  } = N;

  const TYPE_KEYS = ['schedule', 'notification', 'holiday', 'countdown', 'todo'];
  const FILTER_HINT = {
    schedule: 'Time blocks you add yourself.',
    notification: 'Notifications that carry a due date.',
    holiday: 'Public holidays for the year.',
    countdown: 'Target dates from your timers.',
    todo: 'Todo templates applied to a day.',
  };
  const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

  // ── Page state ────────────────────────────────────────────────────────────
  let view = 'month';
  let selected = DAY_RE.test(N.param('day')) ? N.param('day') : isoDay(0);
  let cursor = parseDay(selected);
  let types = { schedule: true, notification: true, holiday: true, countdown: true, todo: true };
  let sheet = null; // sheet to re-open after a re-render
  let entryId = null; // entry shown in the detail sheet
  let draft = null; // typed values kept when validation fails
  let formError = '';
  let localSeq = 0;

  const visible = (e) => types[e.type] !== false;
  const hiddenTypes = () => TYPE_KEYS.filter((k) => !types[k]);

  /** F5 → F4: an applied todo schedule is a calendar entry too. The seed list
   *  only carries the schedule rows, so the calendar mirrors them on load. */
  function mirrorTodoSchedules() {
    state.data.todos.forEach((s) => {
      const id = `c_todo_${s.id}`;
      if (state.data.calendar.some((e) => e.id === id)) return;
      const template = N.templateById(s.templateId);
      if (!template) return;
      state.data.calendar.push({
        id,
        type: 'todo',
        title: template.name,
        date: s.date,
        refId: s.id,
        tasks: template.tasks.length,
        done: s.completed.length,
      });
    });
  }

  // ── Derived helpers ───────────────────────────────────────────────────────

  function jumpTo(day) {
    if (!DAY_RE.test(day)) return;
    selected = day;
    cursor = parseDay(day);
  }

  function shift(delta) {
    if (view === 'month') {
      const next = new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1);
      const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
      cursor = next;
      // Keep a selected cell on screen so the agenda always has a highlighted day.
      selected = toDayStr(new Date(next.getFullYear(), next.getMonth(), Math.min(parseDay(selected).getDate(), lastDay)));
      return;
    }
    jumpTo(isoDay(dayDiff(isoDay(0), selected) + delta * (view === 'week' ? 7 : 1)));
  }

  function timeLabel(entry) {
    if (!entry.startTime) return 'All day';
    return entry.endTime ? `${entry.startTime}–${entry.endTime}` : entry.startTime;
  }

  function monthDates(d) {
    return N.monthDays(d).filter((x) => x.getMonth() === d.getMonth());
  }

  function countOn(days) {
    return days.reduce((n, d) => n + entriesOn(toDayStr(d)).filter(visible).length, 0);
  }

  // ── Views ─────────────────────────────────────────────────────────────────

  /**
   * The kit paints the grid dots from the shared entry list, so the type filter
   * is applied by handing `N.calendarMonth` a temporarily narrowed list and
   * restoring it straight after the synchronous render. The filter itself
   * (`types`) never leaves this file.
   */
  function filteredGrid() {
    const list = state.data.calendar;
    const full = list.slice();
    try {
      list.length = 0;
      full.filter(visible).forEach((e) => list.push(e));
      return calendarMonth({ month: cursor, selected });
    } finally {
      list.length = 0;
      full.forEach((e) => list.push(e));
    }
  }

  function viewSwitch() {
    return `<div class="row" style="justify-content:center">
      ${segmented(
        [
          { value: 'month', label: 'Month' },
          { value: 'week', label: 'Week' },
          { value: 'day', label: 'Day' },
        ],
        view,
        'data-view',
      )}
    </div>`;
  }

  function header() {
    let label = monthLabel(cursor);
    let sub = `${countOn(monthDates(cursor))} entries this month`;
    let prev = 'Previous month';
    let next = 'Next month';

    if (view === 'week') {
      const week = weekDays(parseDay(selected));
      const short = (d) => d.toLocaleDateString([], { day: 'numeric', month: 'short' });
      label = `${short(week[0])} – ${short(week[6])}`;
      sub = `${countOn(week)} entries this week`;
      prev = 'Previous week';
      next = 'Next week';
    } else if (view === 'day') {
      label = fmtDay(selected);
      sub = parseDay(selected).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
      prev = 'Previous day';
      next = 'Next day';
    }

    return `<div class="between gap-xs">
      <button class="icon-btn icon-btn-outline" data-nav="-1" aria-label="${prev}">${icon('chevronLeft')}</button>
      <span class="stack center grow" style="gap:0">
        <strong class="t-title-md truncate">${esc(label)}</strong>
        <span class="t-caption">${esc(sub)}</span>
      </span>
      <button class="icon-btn icon-btn-outline" data-nav="1" aria-label="${next}">${icon('chevronRight')}</button>
    </div>`;
  }

  /** Week view day picker — the week strip itself is not interactive. */
  function weekPicker() {
    const week = weekDays(parseDay(selected));
    return `<div class="range-chips">
      ${week
        .map((d) => {
          const day = toDayStr(d);
          const count = entriesOn(day).filter(visible).length;
          return `<button class="range-chip ${day === selected ? 'is-active' : ''}" data-day="${day}" aria-pressed="${
            day === selected
          }" aria-label="${esc(fmtDay(day))}, ${count} ${count === 1 ? 'entry' : 'entries'}">
            ${d.toLocaleDateString([], { weekday: 'short' })} ${d.getDate()}${count ? ` · ${count}` : ''}
          </button>`;
        })
        .join('')}
    </div>`;
  }

  function legend() {
    return `<div class="card card-soft card-pad-sm stack gap-xs">
      <span class="t-upper">Entry types</span>
      <div class="row wrap gap-md">
        ${TYPE_KEYS.map((key) => {
          const meta = CAL_TYPE_META[key];
          const on = types[key];
          return `<span class="row gap-xxs t-body-sm ${on ? 'c-body' : 'c-soft'}">
            <span class="cal-dot" style="background-color:${meta.dot};opacity:${on ? 1 : 0.3}"></span>${esc(meta.label)}
          </span>`;
        }).join('')}
      </div>
    </div>`;
  }

  function views() {
    if (view === 'week') return `${weekPicker()}${calendarWeek({ anchor: selected })}${legend()}`;
    if (view === 'day') return `${timelineDay(selected)}${legend()}`;
    return `${filteredGrid()}${legend()}`;
  }

  // ── Agenda ────────────────────────────────────────────────────────────────

  function agendaRow(entry) {
    const meta = CAL_TYPE_META[entry.type];
    return `<button class="row gap-sm" data-entry="${entry.id}" style="padding:10px;border-radius:var(--radius-md);border:1px solid var(--color-hairline);background-color:var(--color-canvas);text-align:left">
      <span class="cal-dot" style="background-color:${meta.dot}"></span>
      <span class="grow stack" style="gap:0;min-width:0">
        <span class="t-body-sm c-ink truncate" style="font-weight:500">${esc(entry.title)}</span>
        <span class="t-caption">${esc(meta.label)} · ${esc(timeLabel(entry))}</span>
      </span>
      ${icon('chevronRight', { size: 16, cls: 'c-soft' })}
    </button>`;
  }

  function agenda() {
    const entries = entriesOn(selected).filter(visible);
    const head = `<div class="between">
      <span class="t-upper">Agenda · ${esc(fmtDay(selected))}</span>
      <span class="t-caption t-num">${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}</span>
    </div>`;

    if (entries.length) {
      return `<section class="stack gap-sm">${head}${entries.map(agendaRow).join('')}</section>`;
    }

    const hidden = hiddenTypes();
    const cta = hidden.length
      ? `<button class="btn btn-secondary btn-sm" data-reset>Show all types</button>`
      : `<button class="btn btn-secondary btn-sm" data-sheet="add-sheet">Add a schedule entry</button>`;
    const body = hidden.length
      ? `No entries match the current type filter on ${fmtDay(selected)}. Show all types to see the full day.`
      : `Nothing is booked for ${fmtDay(selected)} yet. Add a personal schedule entry to block the time.`;

    return `<section class="stack gap-sm">${head}${emptyState('Nothing scheduled', body, cta)}</section>`;
  }

  // ── Sheets ────────────────────────────────────────────────────────────────

  function filterSheet() {
    const on = TYPE_KEYS.filter((k) => types[k]).length;
    return `<div class="scrim sheet-host hidden" id="filter-sheet">
      <div class="sheet">
        <span class="sheet-handle"></span>
        <div class="between">
          <strong class="t-title-md">Filter calendar</strong>
          <button class="icon-btn" data-close aria-label="Close">${icon('x')}</button>
        </div>
        <p class="t-body-sm c-muted">Choose which entry types show up in the grid and the agenda.</p>
        <div class="stack gap-xs">
          ${TYPE_KEYS.map(
            (key) => `<div class="card card-soft card-pad-sm">
              ${check(CAL_TYPE_META[key].label, { id: `filt-${key}`, checked: types[key], hint: FILTER_HINT[key] })}
            </div>`,
          ).join('')}
        </div>
        <span class="t-caption center">${on} of ${TYPE_KEYS.length} types shown</span>
        <div class="row gap-sm">
          <button class="btn btn-secondary grow" data-reset>Show all</button>
          <button class="btn btn-primary grow" data-close>Done</button>
        </div>
      </div>
    </div>`;
  }

  function addSheet() {
    const values = draft ?? { title: '', date: selected, start: '09:00', end: '10:00' };
    return `<div class="scrim sheet-host hidden" id="add-sheet">
      <div class="sheet">
        <span class="sheet-handle"></span>
        <div class="between">
          <strong class="t-title-md">Add a personal schedule entry</strong>
          <button class="icon-btn" data-close aria-label="Close">${icon('x')}</button>
        </div>
        <p class="t-body-sm c-muted">It lands on your calendar straight away and only you see it.</p>
        ${field(
          'Title',
          input({ name: 'entry-title', value: values.title, placeholder: 'Focus block — token audit', invalid: !!formError }),
          formError ? { error: formError } : {},
        )}
        ${field('Date', input({ name: 'entry-date', type: 'date', value: values.date }))}
        <div class="row gap-sm">
          <span class="grow">${field('Starts', input({ name: 'entry-start', type: 'time', value: values.start }))}</span>
          <span class="grow">${field('Ends', input({ name: 'entry-end', type: 'time', value: values.end }), { optional: true })}</span>
        </div>
        <span class="row gap-xs t-body-sm c-muted">
          <span class="cal-dot" style="background-color:${CAL_TYPE_META.schedule.dot}"></span>Saved as a schedule entry
        </span>
        <button class="btn btn-primary btn-block" data-add-entry>Add to calendar</button>
      </div>
    </div>`;
  }

  function entrySheet() {
    const entry = state.data.calendar.find((e) => e.id === entryId);
    if (!entry) return '';
    const meta = CAL_TYPE_META[entry.type];
    const kv = (term, value) =>
      `<div class="kv"><span class="t-body-sm c-muted">${esc(term)}</span><span class="t-body-sm c-ink">${value}</span></div>`;

    const links = [];
    if (entry.type === 'notification' && entry.refId) {
      links.push(
        `<a class="btn btn-secondary btn-block" href="m-notification-detail.html?id=${entry.refId}">${icon('bell', { size: 16 })} Open notification</a>`,
      );
    }
    if (entry.type === 'countdown') {
      links.push(`<a class="btn btn-secondary btn-block" href="m-countdowns.html">${icon('timer', { size: 16 })} Open timer</a>`);
    }
    if (entry.type === 'todo') {
      links.push(`<a class="btn btn-secondary btn-block" href="m-todos.html">${icon('list', { size: 16 })} Open todo list</a>`);
    }
    if (entry.type === 'schedule') {
      links.push(
        `<button class="btn btn-secondary btn-block" data-remove-entry>${icon('trash', { size: 16 })} Remove entry</button>`,
      );
    }

    return `<div class="scrim sheet-host hidden" id="entry-sheet">
      <div class="sheet">
        <span class="sheet-handle"></span>
        <div class="between">
          <span class="row gap-xs t-caption">
            <span class="cal-dot" style="background-color:${meta.dot}"></span>${esc(meta.label)}
          </span>
          <button class="icon-btn" data-close aria-label="Close">${icon('x')}</button>
        </div>
        <strong class="t-title-lg">${esc(entry.title)}</strong>
        <div class="stack gap-xs">
          ${kv('Date', `${esc(fmtDay(entry.date))} · ${entry.date}`)}
          ${kv('Time', esc(timeLabel(entry)))}
          ${entry.type === 'todo' && entry.tasks ? kv('Progress', `${entry.done} of ${entry.tasks} tasks done`) : ''}
          ${kv('Owner', esc(ME.name))}
        </div>
        <div class="stack gap-xs">
          ${links.join('')}
          <button class="btn btn-primary btn-block" data-show-day>Open in day view</button>
        </div>
      </div>
    </div>`;
  }

  // ── Mutations ─────────────────────────────────────────────────────────────

  function submitEntry() {
    const title = ($('[name="entry-title"]')?.value ?? '').trim();
    const date = $('[name="entry-date"]')?.value ?? '';
    const start = $('[name="entry-start"]')?.value ?? '';
    const end = $('[name="entry-end"]')?.value ?? '';

    formError = '';
    if (!title) formError = 'Add a title so the block is recognisable later.';
    else if (!DAY_RE.test(date)) formError = 'Choose the day this entry belongs to.';
    else if (!start) formError = 'Set a start time.';
    else if (end && end <= start) formError = 'The end time has to be after the start time.';

    if (formError) {
      draft = { title, date, start, end };
      sheet = 'add-sheet';
      render();
      return;
    }

    state.data.calendar.push({
      id: `c_local_${++localSeq}`,
      type: 'schedule',
      title,
      date,
      startTime: start,
      endTime: end || undefined,
    });
    persist();
    formError = '';
    draft = null;
    sheet = null;
    jumpTo(date);
    toast('Added to your calendar');
    document.dispatchEvent(new CustomEvent('nexa:changed'));
  }

  async function removeEntry() {
    const entry = state.data.calendar.find((e) => e.id === entryId);
    if (!entry) return;
    const ok = await confirmDialog(
      'Remove this entry?',
      `“${entry.title}” disappears from your calendar. Notifications, holidays, and timers are not affected.`,
      'Remove',
    );
    if (!ok) return;
    const i = state.data.calendar.findIndex((e) => e.id === entryId);
    if (i >= 0) state.data.calendar.splice(i, 1);
    persist();
    sheet = null;
    entryId = null;
    toast('Entry removed');
    document.dispatchEvent(new CustomEvent('nexa:changed'));
  }

  // ── Wiring ────────────────────────────────────────────────────────────────

  function wire() {
    $$('[data-view]').forEach((btn) =>
      btn.addEventListener('click', () => {
        view = btn.dataset.view;
        sheet = null;
        render();
      }),
    );

    $$('[data-nav]').forEach((btn) =>
      btn.addEventListener('click', () => {
        shift(Number(btn.dataset.nav));
        render();
      }),
    );

    const today = $('[data-today]');
    if (today) {
      today.addEventListener('click', () => {
        jumpTo(isoDay(0));
        render();
      });
    }

    $$('[data-sheet]').forEach((btn) =>
      btn.addEventListener('click', () => {
        sheet = btn.dataset.sheet;
        draft = null;
        formError = '';
        render();
      }),
    );

    $$('[data-day]').forEach((btn) =>
      btn.addEventListener('click', () => {
        jumpTo(btn.dataset.day);
        sheet = null;
        render();
      }),
    );

    $$('[data-entry]').forEach((btn) =>
      btn.addEventListener('click', () => {
        entryId = btn.dataset.entry;
        sheet = 'entry-sheet';
        render();
      }),
    );

    TYPE_KEYS.forEach((key) => {
      const box = $(`#filt-${key}`);
      if (box) {
        box.addEventListener('change', () => {
          types[key] = box.checked;
          sheet = 'filter-sheet';
          render();
        });
      }
    });

    $$('[data-reset]').forEach((btn) =>
      btn.addEventListener('click', () => {
        types = { schedule: true, notification: true, holiday: true, countdown: true, todo: true };
        render();
      }),
    );

    const add = $('[data-add-entry]');
    if (add) add.addEventListener('click', submitEntry);

    const remove = $('[data-remove-entry]');
    if (remove) remove.addEventListener('click', removeEntry);

    const dayView = $('[data-show-day]');
    if (dayView) {
      dayView.addEventListener('click', () => {
        view = 'day';
        sheet = null;
        entryId = null;
        render();
      });
    }

    // Keep the local sheet bookkeeping in step with the global close handler.
    $$('.scrim').forEach((scrim) =>
      scrim.addEventListener('click', (e) => {
        if (e.target === scrim || e.target.closest('[data-close]')) {
          sheet = null;
          entryId = null;
          draft = null;
          formError = '';
        }
      }),
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  function render() {
    const all = state.data.calendar;
    const shown = all.filter(visible).length;

    const shell = shellMobile({
      active: 'm-calendar.html',
      title: 'Calendar',
      subtitle: `${shown} of ${all.length} entries shown`,
      actions: `<button class="icon-btn icon-btn-outline" data-today aria-label="Jump to today">${icon('target')}</button>
        <button class="icon-btn icon-btn-outline" data-sheet="filter-sheet" aria-label="Filter entry types">${icon('filter')}</button>`,
      body: `<div class="stack gap-md">${viewSwitch()}${header()}${views()}${agenda()}</div>`,
      fab: `<button class="fab" data-sheet="add-sheet" aria-label="Add a schedule entry">${icon('plus', { size: 24 })}</button>`,
    });

    $('[data-slot="shell"]').innerHTML = shell + filterSheet() + addSheet() + entrySheet();
    if (sheet) openSheet(sheet);
    wire();
  }

  N.page('m-calendar', () => {
    mirrorTodoSchedules();
    N.live(render);
    render();
  });
})();
