/* F5 · Todo scheduling — mobile checklist.
   Today / This week / Templates. Check-off goes through NEXA.toggleTask() and
   then re-renders by dispatching nexa:changed, which is the pattern the store
   expects (mutations fire no event of their own). The "Apply to dates" sheet
   previews how many days a recurrence would generate before the toast. */

(() => {
  const N = window.NEXA;
  const { $, $$, state, shellMobile, templateById, emptyState, progressTodo, parseDay, toDayStr, dayDiff } = N;

  const VIEWS = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This week' },
    { value: 'templates', label: 'Templates' },
  ];

  const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  let view = 'today';
  let applyTemplateId = state.data.templates[0]?.id ?? 't_01';

  const schedulesOn = (day) => state.data.todos.filter((s) => s.date === day);
  const change = () => document.dispatchEvent(new CustomEvent('nexa:changed'));

  /** Monday-first week containing today — the same window the calendar uses. */
  function weekBounds() {
    const today = parseDay(N.isoDay(0));
    const shift = (today.getDay() + 6) % 7;
    const start = new Date(today);
    start.setDate(today.getDate() - shift);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start: toDayStr(start), end: toDayStr(end) };
  }

  /** The day-of-week pattern as .dow chips (the F5 signature detail). Sized so
   *  a five-day pattern still fits one row inside a card on a 430px screen. */
  const dowChips = (days) =>
    (days ?? [])
      .slice()
      .sort((a, b) => a - b)
      .map(
        (d) =>
          `<span class="dow is-active" style="width:auto;min-width:34px;height:34px;padding:0 var(--space-xs);font-size:var(--text-caption-size)">${DOW_SHORT[d]}</span>`,
      )
      .join('');

  const dowLabel = (days) =>
    (days ?? []).length === 7
      ? 'Every day'
      : (days ?? [])
          .slice()
          .sort((a, b) => a - b)
          .map((d) => DOW_SHORT[d])
          .join(' · ');

  /** One scheduled checklist: header, progress, then the real checkboxes. */
  function scheduleCard(s) {
    const tpl = templateById(s.templateId);
    if (!tpl) return '';
    const done = s.completed.length;
    const total = tpl.tasks.length;
    const complete = done === total;
    return `<article class="card stack gap-sm" data-schedule-card="${s.id}">
      <div class="between gap-sm">
        <div class="stack" style="gap:0;min-width:0">
          <strong class="t-title-sm truncate">${N.esc(tpl.name)}</strong>
          <span class="t-caption c-muted">${N.esc(N.userById(tpl.ownerId).name)} · ${N.fmtDay(s.date)}</span>
        </div>
        <span class="badge ${complete ? 'badge-success' : 'badge-outline'} t-num">${done}/${total}</span>
      </div>
      ${progressTodo(done, total)}
      <div class="stack">
        ${tpl.tasks
          .map((t) => {
            const checked = s.completed.includes(t.id);
            return `<label class="check" data-toggle="${s.id}:${t.id}" style="padding:var(--space-xs) 0;min-height:44px">
              <input type="checkbox" ${checked ? 'checked' : ''} />
              <span class="grow">
                <span class="t-body-sm ${checked ? 'c-muted' : 'c-ink'}" style="${checked ? 'text-decoration:line-through' : ''}">${N.esc(t.title)}</span>
              </span>
            </label>`;
          })
          .join('')}
      </div>
    </article>`;
  }

  /** Today: the live checklist plus a progress summary for the whole day. */
  function todayPane() {
    const today = N.isoDay(0);
    const list = schedulesOn(today);
    if (!list.length) {
      return emptyState(
        'Nothing scheduled for today',
        `No todo template is applied to ${N.fmtDay(today).toLowerCase()}. Apply a template to turn the day into a checklist.`,
        `<button class="btn btn-secondary btn-sm" data-goto="templates">Browse templates</button>`,
      );
    }
    const done = list.reduce((n, s) => n + s.completed.length, 0);
    const total = list.reduce((n, s) => n + (templateById(s.templateId)?.tasks.length ?? 0), 0);
    return `<section class="card card-cream stack gap-sm">
        <div class="between gap-sm">
          <div class="stack" style="gap:0;min-width:0">
            <strong class="t-title-sm">${done} of ${total} done</strong>
            <span class="t-caption">${N.fmtDay(today)} · ${list.length} ${list.length === 1 ? 'schedule' : 'schedules'}</span>
          </div>
          <span class="badge ${done === total ? 'badge-success' : 'badge-warning'}">${done === total ? 'All clear' : 'In progress'}</span>
        </div>
        ${progressTodo(done, total)}
      </section>
      ${list.map(scheduleCard).join('')}`;
  }

  /** The rest of the current week, grouped by day. */
  function weekPane() {
    const { start, end } = weekBounds();
    const days = [];
    const span = dayDiff(start, end);
    for (let i = 0; i <= span; i++) days.push(N.isoDay(dayDiff(N.isoDay(0), start) + i));

    const withWork = days.filter((d) => schedulesOn(d).length);
    if (!withWork.length) {
      return emptyState(
        'No todos this week',
        'Nothing is applied to the days ahead. Apply a template to fill the week.',
        `<button class="btn btn-secondary btn-sm" data-goto="templates">Browse templates</button>`,
      );
    }
    return withWork
      .map(
        (day) => `<section class="stack gap-sm">
          <div class="between">
            <span class="t-upper">${N.fmtDay(day)}</span>
            <span class="t-caption c-muted t-num">${schedulesOn(day).length}</span>
          </div>
          ${schedulesOn(day).map(scheduleCard).join('')}
        </section>`,
      )
      .join('');
  }

  /** Templates: pattern chips, lifetime progress, tasks, and the apply action. */
  function templatesPane() {
    const list = state.data.templates;
    if (!list.length) {
      return emptyState('No templates yet', 'Todo templates you create will be listed here.', '');
    }
    return list
      .map((t) => {
        const applied = state.data.todos.filter((s) => s.templateId === t.id);
        const done = applied.reduce((n, s) => n + s.completed.length, 0);
        const total = applied.length * t.tasks.length;
        const pct = total ? Math.round((done / total) * 100) : 0;
        return `<article class="card stack gap-sm">
          <div class="between gap-sm">
            <div class="stack" style="gap:0;min-width:0">
              <strong class="t-title-sm truncate">${N.esc(t.name)}</strong>
              <span class="t-caption c-muted truncate">${dowLabel(t.daysOfWeek)} · ${N.esc(N.userById(t.ownerId).name)}</span>
            </div>
            <span class="badge badge-outline t-num">${pct}%</span>
          </div>
          <div class="dow-picker" style="gap:var(--space-xxs)">${dowChips(t.daysOfWeek)}</div>
          <div class="between t-caption c-muted">
            <span>${done}/${total} tasks completed</span>
            <span>${applied.length} ${applied.length === 1 ? 'day applied' : 'days applied'}</span>
          </div>
          ${progressTodo(done, total)}
          <hr class="divider divider-soft" />
          <div class="stack gap-xs">
            ${t.tasks
              .map(
                (task) => `<div class="row gap-sm">
                  <span class="drag-handle" aria-hidden="true">${N.icon('grip', { size: 18 })}</span>
                  <span class="t-body-sm c-body grow">${N.esc(task.title)}</span>
                </div>`,
              )
              .join('')}
          </div>
          <button class="btn btn-secondary btn-block" data-apply="${t.id}">${N.icon('calendar', { size: 16 })} Apply to dates</button>
        </article>`;
      })
      .join('');
  }

  /** How many days the current sheet settings would generate. */
  function preview() {
    const tpl = templateById($('#apply-task')?.value ?? applyTemplateId);
    const recurrence = $('#apply-recurrence')?.value ?? 'weekly';
    const interval = Math.max(1, Number($('#apply-interval')?.value || 7));
    const start = $('#apply-start')?.value || N.isoDay(1);
    const end = $('#apply-end')?.value || N.isoDay(28);
    const span = dayDiff(start, end);
    if (!tpl || !Number.isFinite(span) || span < 0) return 'Pick a start date that falls before the end date.';
    const match = (offset) => {
      if (recurrence === 'custom') return offset % interval === 0;
      const day = N.isoDay(dayDiff(N.isoDay(0), start) + offset);
      return tpl.daysOfWeek.includes(parseDay(day).getDay());
    };
    let count = 0;
    for (let i = 0; i <= span; i++) if (match(i)) count++;
    if (!count) return 'No day in this range matches the pattern. Widen the range or switch recurrence.';
    return `${count} ${count === 1 ? 'day' : 'days'} would be generated between ${N.fmtDay(start)} and ${N.fmtDay(end)}.`;
  }

  function applySheet() {
    const tpl = templateById(applyTemplateId) ?? state.data.templates[0];
    return `<div class="scrim sheet-host hidden" id="apply-sheet">
      <div class="sheet">
        <span class="sheet-handle"></span>
        <div class="between">
          <strong class="t-title-md">Apply to dates</strong>
          <button class="icon-btn" data-close aria-label="Close">${N.icon('x')}</button>
        </div>
        ${N.field(
          'Todo template',
          N.select({
            id: 'apply-task',
            options: state.data.templates.map((t) => ({ value: t.id, label: t.name })),
            value: tpl.id,
          }),
        )}
        ${N.field(
          'Recurrence',
          N.select({
            id: 'apply-recurrence',
            options: [
              { value: 'weekly', label: `Weekly · ${dowLabel(tpl.daysOfWeek)}` },
              { value: 'custom', label: 'Custom interval (days)' },
            ],
            value: 'weekly',
          }),
        )}
        ${N.field('Repeat every (days)', N.input({ id: 'apply-interval', type: 'number', value: '7', min: 1 }), {
          hint: 'Used when the recurrence is custom.',
        })}
        ${N.field('Start date', N.input({ id: 'apply-start', type: 'date', value: N.isoDay(1) }))}
        ${N.field('End date', N.input({ id: 'apply-end', type: 'date', value: N.isoDay(28) }))}
        <p class="hint" data-role="preview"></p>
        <button class="btn btn-primary btn-block" data-role="apply">Apply template</button>
      </div>
    </div>`;
  }

  function paintPreview() {
    const host = $('[data-role="preview"]');
    if (host) host.textContent = preview();
  }

  function render() {
    const doneToday = schedulesOn(N.isoDay(0)).reduce((n, s) => n + s.completed.length, 0);
    const panes = { today: todayPane, week: weekPane, templates: templatesPane };

    $('[data-slot="shell"]').innerHTML =
      shellMobile({
        active: 'm-todos.html',
        title: 'Todos',
        subtitle: `${doneToday} ${doneToday === 1 ? 'task' : 'tasks'} completed today`,
        actions: `<button class="icon-btn icon-btn-outline" data-role="calendar" aria-label="Open calendar">${N.icon('calendar')}</button>`,
        body: `
          <section class="stack gap-sm">
            ${N.segmented(VIEWS, view)}
            <span class="t-caption c-muted">${state.data.templates.length} templates · ${state.data.todos.length} applied days</span>
          </section>
          <div data-role="pane" class="stack gap-md">${panes[view]()}</div>`,
      }) + applySheet();

    // View switch
    $$('[data-seg]').forEach((btn) =>
      btn.addEventListener('click', () => {
        view = btn.dataset.seg;
        render();
      }),
    );

    // Task check-off — mutate, then ask NEXA.live to repaint.
    $$('[data-toggle]').forEach((label) =>
      label.addEventListener('change', () => {
        const [scheduleId, taskId] = label.dataset.toggle.split(':');
        N.toggleTask(scheduleId, taskId);
        change();
      }),
    );

    // Empty-state shortcut into the template pane
    $$('[data-goto]').forEach((btn) =>
      btn.addEventListener('click', () => {
        view = btn.dataset.goto;
        render();
      }),
    );

    // Apply-to-dates sheet
    $$('[data-apply]').forEach((btn) =>
      btn.addEventListener('click', () => {
        applyTemplateId = btn.dataset.apply;
        render();
        N.openSheet('apply-sheet');
        paintPreview();
      }),
    );

    $$('#apply-sheet input, #apply-sheet select').forEach((input) =>
      input.addEventListener('input', () => {
        if (input.id === 'apply-task') applyTemplateId = input.value;
        paintPreview();
      }),
    );

    $('[data-role="apply"]')?.addEventListener('click', () => {
      const tpl = templateById(applyTemplateId) ?? state.data.templates[0];
      N.toast(`Applied “${tpl.name}” — ${preview()}`);
      N.closeSheet('apply-sheet');
    });

    $('[data-role="calendar"]')?.addEventListener('click', () =>
      N.toast('Applied todo schedules appear on the calendar'),
    );
  }

  N.page('m-todos', () => {
    N.live(render);
    render();
  });
})();
