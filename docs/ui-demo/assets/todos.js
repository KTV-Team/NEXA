/* F5 · Todo templates (web) — the most interactive screen in the prototype.
   GET    /todos/templates              → the left list
   PUT    /todos/templates/:id          → Save / Discard in the dirty banner
   POST   /todos/templates              → "New template"
   POST   /todos/templates/:id/apply    → "Apply to dates" (recurrence + range)
   PATCH  /todos/schedules/:id/tasks/:taskId → check-off in the schedules table
   Reordering uses native HTML5 drag-and-drop with up/down buttons as the
   keyboard-accessible fallback. */

(() => {
  const N = window.NEXA;
  const { esc, icon, parseDay, toDayStr, isoDay, dayDiff, fmtDay } = N;

  const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 0];
  const clone = (t) => JSON.parse(JSON.stringify(t));
  const addDays = (day, n) => {
    const d = parseDay(day);
    d.setDate(d.getDate() + n);
    return toDayStr(d);
  };
  const shortDay = (day) => parseDay(day).toLocaleDateString([], { day: 'numeric', month: 'short' });

  let selectedId = N.param('template') || N.state.data.templates[0].id;
  let draft = clone(N.templateById(selectedId) ?? N.state.data.templates[0]);
  let dirty = false;
  let focusIndex = null;
  let dragIndex = null;
  let seq = 0;

  const apply = { recurrence: 'weekly', intervalDays: '3', start: isoDay(0), end: isoDay(28) };

  // ── draft mutation ────────────────────────────────────────────────────────

  const original = () => N.templateById(draft.id);

  function selectTemplate(id) {
    selectedId = id;
    draft = clone(N.templateById(id));
    dirty = false;
    render();
  }

  function markDirty() {
    if (dirty) return;
    dirty = true;
    paintDirty();
  }

  function paintDirty() {
    const bar = N.$('#dirty-bar');
    if (bar) bar.classList.toggle('hidden', !dirty);
    const flag = N.$('[data-dirty-flag]');
    if (flag) flag.classList.toggle('hidden', !dirty);
  }

  function saveTemplate(silent) {
    const saved = original();
    saved.name = draft.name.trim() || 'Untitled template';
    saved.daysOfWeek = [...draft.daysOfWeek].sort();
    saved.tasks = draft.tasks.map((t, i) => ({ ...t, order: i }));
    N.persist();
    dirty = false;
    render();
    paintDirty();
    if (!silent) N.toast(`Saved “${saved.name}”`);
  }

  function discardTemplate() {
    draft = clone(original());
    dirty = false;
    render();
    N.toast('Changes discarded');
  }

  function moveTask(from, to) {
    if (to < 0 || to >= draft.tasks.length || from === to) return;
    const [task] = draft.tasks.splice(from, 1);
    draft.tasks.splice(to, 0, task);
    dirty = true;
    render();
  }

  function addTask() {
    seq += 1;
    draft.tasks.push({ id: `tt_ui_${Date.now()}_${seq}`, title: '', order: draft.tasks.length });
    draft.tasks[draft.tasks.length - 1].title = 'New task';
    dirty = true;
    focusIndex = draft.tasks.length - 1;
    render();
  }

  // ── apply-to-dates ────────────────────────────────────────────────────────

  function applyDates() {
    const out = [];
    if (!apply.start || !apply.end) return out;
    const span = dayDiff(apply.start, apply.end);
    if (span < 0) return out;
    if (apply.recurrence === 'weekly') {
      const pattern = draft.daysOfWeek.length ? draft.daysOfWeek : [parseDay(apply.start).getDay()];
      for (let i = 0; i <= span && out.length < 60; i++) {
        const day = addDays(apply.start, i);
        if (pattern.includes(parseDay(day).getDay())) out.push(day);
      }
    } else {
      const step = Math.max(1, Number(apply.intervalDays) || 1);
      for (let i = 0; i <= span && out.length < 60; i += step) out.push(addDays(apply.start, i));
    }
    return out;
  }

  function previewHtml() {
    const dates = applyDates();
    const span = apply.start && apply.end ? dayDiff(apply.start, apply.end) : -1;
    if (!apply.start || !apply.end) return `<p class="t-body-sm c-muted">Pick a start and an end date to preview the schedule.</p>`;
    if (span < 0) return `<p class="t-body-sm c-muted">The end date falls before the start date. Swap them to continue.</p>`;
    if (!dates.length) {
      return `<p class="t-body-sm c-muted">No ${
        apply.recurrence === 'weekly' ? 'selected weekdays fall' : 'dates fall'
      } inside this range. Widen it and the preview fills in.</p>`;
    }
    return `<div class="stack">
        ${dates
          .slice(0, 8)
          .map(
            (d) => `<div class="list-row" style="padding:var(--space-xs) 0">
              <span class="cal-dot" style="background-color:var(--color-brand-lavender)"></span>
              <span class="grow t-body-sm c-ink">${esc(fmtDay(d))}</span>
              <span class="t-caption c-muted">${esc(shortDay(d))} · ${esc(DAY_NAMES[parseDay(d).getDay()])}</span>
            </div>`,
          )
          .join('')}
      </div>
      <span class="t-caption c-muted">${dates.length > 8 ? `${dates.length - 8} more · ` : ''}${dates.length} ${
        dates.length === 1 ? 'day' : 'days'
      } · ${draft.tasks.length} ${draft.tasks.length === 1 ? 'task' : 'tasks'} each</span>`;
  }

  function paintPreview() {
    const host = N.$('[data-slot="apply-preview"]');
    if (host) host.innerHTML = previewHtml();
  }

  function applyTemplate() {
    const dates = applyDates();
    if (!dates.length) {
      N.toast('Nothing to apply — check the range and the weekday pattern', { tone: 'error' });
      return;
    }
    if (dirty) saveTemplate(true);
    let created = 0;
    dates.forEach((day) => {
      const exists = N.state.data.todos.some((s) => s.date === day && s.templateId === draft.id);
      if (exists) return;
      seq += 1;
      N.state.data.todos.push({ id: `ts_ui_${Date.now()}_${seq}`, templateId: draft.id, date: day, completed: [] });
      created += 1;
    });
    N.persist();
    render();
    N.toast(created ? `${created} ${created === 1 ? 'day' : 'days'} scheduled from “${draft.name}”` : 'Those days are already scheduled');
  }

  // ── pieces ────────────────────────────────────────────────────────────────

  function dowChips(days, small) {
    const style = small ? 'width:24px;height:24px' : '';
    return `<span class="dow-picker">${MONDAY_FIRST.map(
      (d) =>
        `<span class="dow ${days.includes(d) ? 'is-active' : ''}"${
          small ? ` style="${style}"` : ''
        } title="${DAY_NAMES[d]}">${DAY_LETTERS[d]}</span>`,
    ).join('')}</span>`;
  }

  function templateList() {
    const list = N.state.data.templates;
    return `<div class="card stack gap-sm">
      <div class="between">
        <span class="t-upper">Todo templates</span>
        <span class="t-caption c-muted">${list.length}</span>
      </div>
      <div class="stack gap-xs">
        ${list
          .map(
            (t) => `<button type="button" class="card card-hover stack gap-xs" data-template="${t.id}" style="padding:var(--space-sm);text-align:left;${
              t.id === selectedId ? 'border-color:var(--color-ink)' : ''
            }">
              <span class="row gap-sm">
                ${N.avatar(t.ownerId, { size: 'sm' })}
                <span class="grow stack" style="gap:0">
                  <span class="t-body-sm c-ink" style="font-weight:600">${esc(t.name)}</span>
                  <span class="t-caption c-muted">${t.tasks.length} ${t.tasks.length === 1 ? 'task' : 'tasks'}</span>
                </span>
                ${t.id === selectedId ? `<span class="badge badge-ink">Editing</span>` : ''}
              </span>
              ${dowChips(t.daysOfWeek, true)}
            </button>`,
          )
          .join('')}
      </div>
      <button type="button" class="btn btn-secondary btn-block" data-new-template>${icon('plus', { size: 18 })} New template</button>
    </div>`;
  }

  function statsCard() {
    const schedules = N.state.data.todos;
    const tasks = N.state.data.templates.reduce((n, t) => n + t.tasks.length, 0);
    const done = schedules.reduce((n, s) => n + s.completed.length, 0);
    const total = schedules.reduce((n, s) => n + N.templateById(s.templateId).tasks.length, 0);
    return `<div class="card stack gap-md">
      <span class="t-upper">Your checklist load</span>
      <div class="row wrap gap-lg">
        <div class="stat"><span class="stat-value t-num">${N.state.data.templates.length}</span><span class="t-caption c-muted">templates</span></div>
        <div class="stat"><span class="stat-value t-num">${tasks}</span><span class="t-caption c-muted">tasks defined</span></div>
        <div class="stat"><span class="stat-value t-num">${schedules.length}</span><span class="t-caption c-muted">scheduled days</span></div>
        <div class="stat"><span class="stat-value t-num">${total ? Math.round((done / total) * 100) : 0}%</span><span class="t-caption c-muted">completed</span></div>
      </div>
      ${N.progressTodo(done, total)}
    </div>`;
  }

  function todayCard() {
    const today = isoDay(0);
    const list = N.state.data.todos.filter((s) => s.date === today);
    return `<div class="card card-pad-xl stack gap-md">
      <div class="between">
        <span class="t-upper">Today’s checklists</span>
        <span class="t-caption c-muted">${esc(fmtDay(today))}</span>
      </div>
      ${
        list.length
          ? list
              .map((s) => {
                const t = N.templateById(s.templateId);
                const done = s.completed.length;
                return `<div class="stack gap-xs">
                  <div class="between gap-sm">
                    <span class="t-title-sm truncate">${esc(t.name)}</span>
                    <span class="t-caption c-muted t-num" style="white-space:nowrap">${done}/${t.tasks.length}</span>
                  </div>
                  ${N.progressTodo(done, t.tasks.length)}
                  <div class="stack">
                    ${t.tasks
                      .map(
                        (task) => `<label class="row gap-sm" style="padding:var(--space-xxs) 0;cursor:pointer">
                          <input type="checkbox" class="check-input" data-task="${task.id}" data-schedule="${s.id}" ${
                            s.completed.includes(task.id) ? 'checked' : ''
                          } style="appearance:none;width:18px;height:18px;border:1px solid var(--color-hairline);border-radius:var(--radius-xs);flex:none" />
                          <span class="t-body-sm ${
                            s.completed.includes(task.id) ? 'c-muted' : 'c-ink'
                          }" style="${s.completed.includes(task.id) ? 'text-decoration:line-through' : ''}">${esc(task.title)}</span>
                        </label>`,
                      )
                      .join('')}
                  </div>
                </div>`;
              })
              .join('<hr class="divider divider-soft" />')
          : `<p class="t-body-sm c-muted">No checklist is scheduled for today. Apply a template on the right and today’s list appears here.</p>
             <a class="link-btn" href="#apply-card">Go to apply to dates ${icon('arrowRight', { size: 14 })}</a>`
      }
    </div>`;
  }

  function howItWorks() {
    return `<div class="card card-soft stack gap-sm">
      <span class="t-upper">How templates work</span>
      <p class="t-body-sm c-muted">A template is a named checklist plus a day-of-week pattern. Apply it to a range and each matching day gets its own schedule you can tick off.</p>
      <div class="stack gap-xs">
        ${[
          ['repeat', 'Weekly patterns repeat on the days you pick'],
          ['grip', 'Drag the handle to reorder tasks, or use the arrows'],
          ['calendar', 'Applied days appear on the calendar as todo entries'],
        ]
          .map(
            ([ic, text]) => `<span class="row gap-sm t-body-sm c-body">${icon(ic, { size: 16, cls: 'c-muted' })}${esc(text)}</span>`,
          )
          .join('')}
      </div>
    </div>`;
  }

  function builderCard() {
    return `<div class="card card-pad-xl stack gap-lg">
      <div class="between wrap gap-sm">
        <div class="stack" style="gap:0">
          <span class="t-upper">Template builder</span>
          <strong class="t-title-md">${esc(draft.name || 'Untitled template')}</strong>
        </div>
        <span class="row gap-xs">
          <span class="badge badge-outline">${draft.tasks.length} ${draft.tasks.length === 1 ? 'task' : 'tasks'}</span>
          <span class="badge ${draft.daysOfWeek.length ? '' : 'badge-warning'}">${
            draft.daysOfWeek.length ? `${draft.daysOfWeek.length}×/week` : 'No weekdays yet'
          }</span>
        </span>
      </div>

      ${N.field('Template name', N.input({ name: 'template-name', value: draft.name, placeholder: 'e.g. Monday kickoff' }), {
        hint: 'Shown in the list, on the calendar, and in the schedules table.',
      })}

      <div class="stack gap-xs">
        <span class="label">Runs on</span>
        <div class="dow-picker" role="group" aria-label="Days of the week">
          ${MONDAY_FIRST.map(
            (d) =>
              `<button type="button" class="dow ${
                draft.daysOfWeek.includes(d) ? 'is-active' : ''
              }" data-dow="${d}" aria-pressed="${draft.daysOfWeek.includes(d)}" aria-label="${DAY_NAMES[d]}" title="${DAY_NAMES[d]}">${
                DAY_LETTERS[d]
              }</button>`,
          ).join('')}
        </div>
        <span class="hint">${
          draft.daysOfWeek.length
            ? `Weekly: ${MONDAY_FIRST.filter((d) => draft.daysOfWeek.includes(d))
                .map((d) => DAY_NAMES[d])
                .join(', ')}`
            : 'Pick at least one weekday, or apply the template with a custom interval instead.'
        }</span>
      </div>

      <div class="stack gap-sm">
        <div class="between">
          <span class="label">Tasks</span>
          <span class="t-caption c-muted">Drag to reorder · arrows move one step</span>
        </div>
        <div class="stack gap-xs" data-role="tasks">
          ${
            draft.tasks.length
              ? draft.tasks
                  .map(
                    (t, i) => `<div class="task-row" draggable="true" data-index="${i}">
                      <span class="drag-handle" aria-hidden="true">${icon('grip', { size: 18 })}</span>
                      <input class="input input-sm grow" data-task-title="${i}" value="${esc(t.title)}" placeholder="Describe the task" aria-label="Task ${i + 1}" />
                      <button type="button" class="icon-btn icon-btn-sm ${i === 0 ? 'c-soft' : ''}" data-move="${i}" data-dir="-1" aria-label="Move task up" ${
                        i === 0 ? 'disabled' : ''
                      }>${icon('chevronUp', { size: 16 })}</button>
                      <button type="button" class="icon-btn icon-btn-sm ${
                        i === draft.tasks.length - 1 ? 'c-soft' : ''
                      }" data-move="${i}" data-dir="1" aria-label="Move task down" ${
                        i === draft.tasks.length - 1 ? 'disabled' : ''
                      }>${icon('chevronDown', { size: 16 })}</button>
                      <button type="button" class="icon-btn icon-btn-sm" data-remove="${i}" aria-label="Delete task">${icon('trash', { size: 16 })}</button>
                    </div>`,
                  )
                  .join('')
              : N.emptyState('No tasks yet', 'Add the first task and it becomes a line on every scheduled day.', '')
          }
        </div>
        <button type="button" class="btn btn-secondary" data-add-task>${icon('plus', { size: 18 })} Add task</button>
      </div>
    </div>`;
  }

  function applyCard() {
    return `<div class="card card-pad-xl stack gap-md" id="apply-card">
      <div class="between wrap gap-sm">
        <div class="stack" style="gap:0">
          <span class="t-upper">Apply to dates</span>
          <strong class="t-title-sm">Schedule “${esc(draft.name || 'Untitled template')}” on a range</strong>
        </div>
        <span class="badge badge-outline">POST /todos/templates/:id/apply</span>
      </div>

      <div class="grid grid-3" style="gap:var(--space-md)">
        ${N.field(
          'Recurrence',
          N.select({
            name: 'recurrence',
            value: apply.recurrence,
            options: [
              { value: 'weekly', label: 'Weekly pattern' },
              { value: 'custom', label: 'Custom interval' },
            ],
          }),
        )}
        ${N.field('Every', N.input({ name: 'intervalDays', type: 'number', min: 1, max: 60, value: apply.intervalDays }), {
          hint: apply.recurrence === 'custom' ? 'Days between each schedule' : 'Used when recurrence is custom',
        })}
        ${N.field('Start', N.input({ name: 'start', type: 'date', value: apply.start }))}
      </div>

      <div class="grid grid-2" style="gap:var(--space-md)">
        ${N.field('End', N.input({ name: 'end', type: 'date', value: apply.end }), { hint: 'Defaults to four weeks out.' })}
        <div class="stack gap-xs" style="justify-content:flex-end">
          <span class="label">Result</span>
          <span class="row gap-sm">
            <button type="button" class="btn btn-primary" data-apply>${icon('calendar', { size: 18 })} Apply to dates</button>
          </span>
        </div>
      </div>

      <div class="stack gap-xs">
        <span class="t-upper">Preview</span>
        <div class="stack gap-xs" style="max-height:320px;overflow:auto" data-slot="apply-preview">${previewHtml()}</div>
      </div>
    </div>`;
  }

  function schedulesTable() {
    const list = [...N.state.data.todos].sort((a, b) => {
      const ap = dayDiff(isoDay(0), a.date) < 0;
      const bp = dayDiff(isoDay(0), b.date) < 0;
      if (ap !== bp) return ap ? 1 : -1;
      return ap ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date);
    });
    if (!list.length) {
      return N.emptyState(
        'No scheduled days yet',
        'Apply a template above and each matching day appears here with its checklist.',
        '',
      );
    }
    return `<div class="card" style="padding:var(--space-lg)">
      <table class="table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Template</th>
            <th>Checklist</th>
            <th>Progress</th>
            <th style="text-align:right">Calendar</th>
          </tr>
        </thead>
        <tbody>
          ${list
            .map((s) => {
              const t = N.templateById(s.templateId);
              const done = s.completed.length;
              const total = t.tasks.length;
              const past = dayDiff(isoDay(0), s.date) < 0;
              return `<tr>
                <td style="white-space:nowrap">
                  <span class="stack" style="gap:0">
                    <span class="t-body-sm c-ink">${esc(fmtDay(s.date))}</span>
                    <span class="t-caption c-soft">${esc(shortDay(s.date))}${past ? ' · past' : ''}</span>
                  </span>
                </td>
                <td>
                  <span class="row gap-xs">
                    <span class="cal-dot" style="background-color:${N.CAL_TYPE_META.todo.dot}"></span>
                    <span class="truncate" style="max-width:180px">${esc(t.name)}</span>
                  </span>
                </td>
                <td>
                  <span class="row wrap gap-md">
                    ${t.tasks
                      .map(
                        (task) => `<label class="row gap-xs" style="cursor:pointer">
                          <input type="checkbox" class="check-input" data-task="${task.id}" data-schedule="${s.id}" ${
                            s.completed.includes(task.id) ? 'checked' : ''
                          } style="appearance:none;width:18px;height:18px;border:1px solid var(--color-hairline);border-radius:var(--radius-xs);flex:none" />
                          <span class="t-body-sm ${
                            s.completed.includes(task.id) ? 'c-muted' : 'c-ink'
                          }" style="${s.completed.includes(task.id) ? 'text-decoration:line-through' : ''}">${esc(task.title)}</span>
                        </label>`,
                      )
                      .join('')}
                  </span>
                </td>
                <td style="white-space:nowrap">
                  <span class="row gap-sm">
                    <span style="width:88px;flex:none">${N.progressTodo(done, total)}</span>
                    <span class="t-caption c-muted t-num"><strong class="c-ink">${done}</strong>/${total}</span>
                  </span>
                </td>
                <td style="text-align:right;white-space:nowrap">
                  <a class="link-btn t-caption" href="calendar.html?day=${s.date}">View day ${icon('arrowRight', { size: 13 })}</a>
                </td>
              </tr>`;
            })
            .join('')}
        </tbody>
      </table>
    </div>`;
  }

  // ── render ────────────────────────────────────────────────────────────────

  function render() {
    if (!N.templateById(draft.id)) draft = clone(N.state.data.templates[0]);

    const body = `
      <section class="grid" style="grid-template-columns:320px minmax(0,1fr);align-items:start">
        <div class="stack gap-lg">
          ${templateList()}
          ${todayCard()}
          ${statsCard()}
          ${howItWorks()}
        </div>

        <div class="stack gap-lg">
          <div class="card card-pad-xl row between wrap gap-md feature-card feature-card-ochre hidden" id="dirty-bar">
            <span class="stack" style="gap:0">
              <strong class="t-title-sm" style="color:inherit">Unsaved changes</strong>
              <span class="t-body-sm" style="color:inherit;opacity:.8">The template list still shows the saved version until you save.</span>
            </span>
            <span class="row gap-sm">
              <button type="button" class="btn btn-on-color btn-sm" data-save>Save changes</button>
              <button type="button" class="link-btn t-caption" data-discard style="color:inherit">Discard</button>
            </span>
          </div>
          ${builderCard()}
          ${applyCard()}
        </div>
      </section>

      <section class="stack gap-md">
        <div class="between">
          <h2 class="t-title-lg">Scheduled days</h2>
          <span class="t-caption c-muted">${N.state.data.todos.length} rows · PATCH /todos/schedules/:id/tasks/:taskId</span>
        </div>
        ${schedulesTable()}
      </section>`;

    N.$('[data-slot="shell"]').innerHTML = N.shellWeb({
      active: 'todos.html',
      breadcrumb: 'Plan',
      title: 'Todo templates',
      subtitle: 'Reusable checklists on a weekly pattern — reorder the tasks, then apply the template to a run of dates.',
      actions: `<a class="btn btn-secondary" href="calendar.html">${icon('calendar', { size: 18 })} Open calendar</a>`,
      body,
    });

    paintDirty();

    // Template list
    N.$$('[data-template]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        if (btn.dataset.template === draft.id) return;
        if (!(await leaveGuard())) return;
        selectTemplate(btn.dataset.template);
      }),
    );
    const newTemplate = N.$('[data-new-template]');
    if (newTemplate) {
      newTemplate.addEventListener('click', async () => {
        if (!(await leaveGuard())) return;
        seq += 1;
        const t = {
          id: `t_ui_${Date.now()}_${seq}`,
          name: 'Untitled template',
          daysOfWeek: [1],
          ownerId: N.ME.id,
          tasks: [{ id: `tt_ui_${Date.now()}_${seq}`, title: 'First task', order: 0 }],
        };
        N.state.data.templates.push(t);
        N.persist();
        selectedId = t.id;
        draft = clone(t);
        dirty = false;
        render();
        N.toast('Template created — rename it and add tasks');
      });
    }

    // Name + task titles: local edits, no re-render (keeps the caret in place)
    const nameInput = N.$('[name="template-name"]');
    if (nameInput) {
      nameInput.addEventListener('input', () => {
        draft.name = nameInput.value;
        markDirty();
      });
    }
    N.$$('[data-task-title]').forEach((input) =>
      input.addEventListener('input', () => {
        draft.tasks[Number(input.dataset.taskTitle)].title = input.value;
        markDirty();
      }),
    );

    // Day-of-week pattern
    N.$$('[data-dow]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const day = Number(btn.dataset.dow);
        const at = draft.daysOfWeek.indexOf(day);
        if (at >= 0) draft.daysOfWeek.splice(at, 1);
        else draft.daysOfWeek.push(day);
        btn.classList.toggle('is-active', at < 0);
        btn.setAttribute('aria-pressed', String(at < 0));
        markDirty();
      }),
    );

    // Task actions
    N.$$('[data-move]').forEach((btn) =>
      btn.addEventListener('click', () => moveTask(Number(btn.dataset.move), Number(btn.dataset.move) + Number(btn.dataset.dir))),
    );
    N.$$('[data-remove]').forEach((btn) =>
      btn.addEventListener('click', () => {
        draft.tasks.splice(Number(btn.dataset.remove), 1);
        dirty = true;
        render();
      }),
    );
    const addTaskBtn = N.$('[data-add-task]');
    if (addTaskBtn) addTaskBtn.addEventListener('click', addTask);

    // Drag-and-drop reordering with the .is-dragging / .is-drop-target classes
    N.$$('.task-row').forEach((row) => {
      row.addEventListener('dragstart', (ev) => {
        dragIndex = Number(row.dataset.index);
        ev.dataTransfer.effectAllowed = 'move';
        ev.dataTransfer.setData('text/plain', row.dataset.index);
        requestAnimationFrame(() => row.classList.add('is-dragging'));
      });
      row.addEventListener('dragend', () => {
        dragIndex = null;
        row.classList.remove('is-dragging');
        N.$$('.task-row').forEach((r) => r.classList.remove('is-drop-target'));
      });
      row.addEventListener('dragover', (ev) => {
        if (dragIndex == null) return;
        ev.preventDefault();
        ev.dataTransfer.dropEffect = 'move';
        N.$$('.task-row').forEach((r) => r.classList.toggle('is-drop-target', r === row && Number(r.dataset.index) !== dragIndex));
      });
      row.addEventListener('dragleave', () => row.classList.remove('is-drop-target'));
      row.addEventListener('drop', (ev) => {
        ev.preventDefault();
        const to = Number(row.dataset.index);
        if (dragIndex == null) return;
        moveTask(dragIndex, to);
        dragIndex = null;
      });
    });

    if (focusIndex != null) {
      const input = N.$(`.task-row[data-index="${focusIndex}"] input`);
      if (input) {
        input.focus();
        input.select();
      }
      focusIndex = null;
    }

    // Dirty banner
    const saveBtn = N.$('[data-save]');
    if (saveBtn) saveBtn.addEventListener('click', () => saveTemplate(false));
    const discardBtn = N.$('[data-discard]');
    if (discardBtn) discardBtn.addEventListener('click', discardTemplate);

    // Apply-to-dates form: values live in `apply`, the preview repaints locally
    const applyCardEl = N.$('[data-apply]')?.closest('.card');
    if (applyCardEl) {
      N.$$('[name="recurrence"], [name="intervalDays"], [name="start"], [name="end"]', applyCardEl).forEach((el) =>
        el.addEventListener('input', () => {
          apply[el.name] = el.value;
          paintPreview();
        }),
      );
      N.$('[data-apply]', applyCardEl).addEventListener('click', applyTemplate);
    }

    // Schedule check-off
    N.$$('[data-task]').forEach((box) =>
      box.addEventListener('change', () => {
        N.toggleTask(box.dataset.schedule, box.dataset.task);
        render();
      }),
    );
  }

  /** Guard so switching templates cannot silently drop edits (async dialog). */
  async function leaveGuard() {
    if (!dirty) return true;
    return N.confirmDialog(
      'Discard unsaved changes?',
      'This template has edits that were never saved. Switching now keeps the saved version.',
      'Discard changes',
    );
  }

  N.page('todos', () => {
    N.live(render);
    render();
  });
})();
