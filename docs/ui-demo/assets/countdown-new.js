/* F6 · Create countdown, mobile.
   Type drives the icon, the colour default, and the wording of the reminder
   schedule. The preview card matches `m-countdowns.html` and ticks live. */

(() => {
  const N = window.NEXA;

  /** Trigger schedule shown per type, mirroring the F6 spec (T-30/7/1/0). */
  const TRIGGERS = [
    { at: 'T-30', label: '30 days before' },
    { at: 'T-7', label: '7 days before' },
    { at: 'T-1', label: '1 day before' },
    { at: 'T-0', label: 'On the day' },
  ];

  const draft = {
    title: '',
    type: 'deadline',
    targetDate: N.isoDay(14),
    note: '',
    color: 'brand-teal',
    triggers: ['T-7', 'T-1', 'T-0'],
  };

  const touched = { title: false };

  const titleError = () => (touched.title && !draft.title.trim() ? 'What are we counting down to?' : '');
  const dateError = () => {
    const r = N.countdownRemaining(draft.targetDate);
    return r.isPast && r.days > 0 ? 'Pick a date in the future for a live countdown.' : '';
  };

  /** Preview card, ticking — the same markup family as m-countdowns.html. */
  function preview() {
    const meta = N.COUNTDOWN_TYPE_META[draft.type];
    const r = N.countdownRemaining(draft.targetDate);
    return `<article class="feature-card feature-card-${draft.color}" data-cd-preview style="gap:var(--space-sm)">
      <span class="t-upper" style="color:inherit;opacity:.75">${meta.label}</span>
      <strong class="t-title-md" style="color:inherit">${N.esc(draft.title || 'Untitled countdown')}</strong>
      <div class="row gap-sm" style="align-items:baseline">
        <span class="countdown-num" style="font-size:var(--text-display-2xl-size)" data-cd-days>${r.days}</span>
        <span class="t-body-sm" style="opacity:.8">${r.isPast ? 'days ago' : 'days'}</span>
        <span class="countdown-num" style="font-size:var(--text-display-xs-size)" data-cd-clock>${pad(r.hours)}:${pad(r.minutes)}:${pad(r.seconds)}</span>
      </div>
      <div class="frag">
        <div class="frag-row"><span>${N.fmtDay(draft.targetDate)}</span><span>${N.icon('timer', { size: 12 })}</span></div>
        ${
          draft.note
            ? `<div class="frag-row" style="opacity:.75"><span class="truncate">${N.esc(draft.note)}</span></div>`
            : ''
        }
      </div>
    </article>`;
  }

  const pad = (n) => String(n).padStart(2, '0');

  function render() {
    const valid = draft.title.trim().length > 0 && !dateError();

    N.$('[data-slot="shell"]').innerHTML = N.shellMobile({
      title: 'New countdown',
      subtitle: 'Live timer with reminders',
      back: 'm-countdowns.html',
      hideTabbar: true,
      actions: `<button class="btn btn-primary btn-sm" data-save ${valid ? '' : 'disabled'}>Save</button>`,
      body: `
        <div class="card stack gap-md">
          ${N.field('Title', N.input({ name: 'title', value: draft.title, placeholder: 'NEXA public beta' }), {
            error: titleError(),
          })}

          <div class="field">
            <span class="label">Type</span>
            <div class="row gap-xs wrap">
              ${Object.entries(N.COUNTDOWN_TYPE_META)
                .map(
                  ([key, meta]) => `<button type="button" class="range-chip ${draft.type === key ? 'is-active' : ''}" data-type="${key}">
                    ${N.icon(meta.icon, { size: 14 })} ${meta.label}
                  </button>`,
                )
                .join('')}
            </div>
          </div>

          ${N.field('Target date', `<span class="input-group">${N.icon('calendar', { size: 18 })}<input class="input" type="date" name="targetDate" value="${draft.targetDate}" /></span>`, {
            error: dateError(),
            hint: 'Reminders fire at T-30, T-7, T-1, and on the day.',
          })}

          <div class="row gap-xs wrap">
            ${[7, 14, 30, 90]
              .map((d) => `<button type="button" class="range-chip" data-quick="${d}">+${d} days</button>`)
              .join('')}
          </div>

          ${N.field(
            'Note',
            N.textarea({ name: 'note', value: draft.note, rows: 2, placeholder: 'Store submission closes the week before.' }),
            { optional: true },
          )}

          <div class="field">
            <span class="label">Colour</span>
            <div class="row gap-xs wrap">
              ${['brand-teal', 'brand-pink', 'brand-lavender', 'brand-ochre', 'brand-peach', 'surface-card']
                .map((c) => {
                  const active = draft.color === c;
                  const onDark = c === 'brand-teal' || c === 'brand-pink';
                  return `<button type="button" class="swatch-choice ${active ? 'is-active' : ''} ${onDark ? 'swatch-choice-on-dark' : ''}"
                    data-color="${c}" aria-label="${c}" aria-pressed="${active}"
                    style="background-color:var(--color-${c});${active ? 'box-shadow:0 0 0 2px var(--color-canvas), 0 0 0 3px var(--color-ink)' : ''}">
                    ${active ? N.icon('check', { size: 16 }) : ''}
                  </button>`;
                })
                .join('')}
            </div>
          </div>
        </div>

        <div class="card stack gap-sm">
          <div class="between">
            <span class="t-title-sm">Reminders</span>
            <span class="t-caption c-muted">${draft.triggers.length} of 4 on</span>
          </div>
          ${TRIGGERS.map(
            (t, i) => `<div data-trigger-row="${t.at}">
              ${N.switchControl(t.label, { checked: draft.triggers.includes(t.at), id: `trigger_${i}` })}
            </div>`,
          ).join('')}
        </div>

        <div class="stack gap-xs">
          <span class="t-upper">Live preview</span>
          ${preview()}
        </div>

        <div class="row gap-sm">
          <a class="btn btn-secondary grow" href="m-countdowns.html">Cancel</a>
          <button class="btn btn-primary grow" data-save ${valid ? '' : 'disabled'}>Create countdown</button>
        </div>`,
    });

    wire();
  }

  function wire() {
    N.$$('input[name], textarea[name]').forEach((el) =>
      el.addEventListener('input', () => {
        if (el.name in draft) draft[el.name] = el.value;
        if (el.name === 'title') touched.title = true;
        const active = document.activeElement?.name;
        const pos = document.activeElement?.selectionStart;
        render();
        if (active) {
          const next = N.$(`[name="${active}"]`);
          if (next) {
            next.focus();
            if (pos != null && next.setSelectionRange) next.setSelectionRange(pos, pos);
          }
        }
      }),
    );

    N.$$('[data-type]').forEach((btn) =>
      btn.addEventListener('click', () => {
        draft.type = btn.dataset.type;
        draft.color = N.COUNTDOWN_TYPE_META[draft.type].color;
        render();
      }),
    );

    N.$$('[data-quick]').forEach((btn) =>
      btn.addEventListener('click', () => {
        draft.targetDate = N.isoDay(Number(btn.dataset.quick));
        render();
      }),
    );

    N.$$('[data-color]').forEach((btn) =>
      btn.addEventListener('click', () => {
        draft.color = btn.dataset.color;
        render();
      }),
    );

    N.$$('[data-trigger-row]').forEach((row) => {
      const key = row.dataset.triggerRow;
      N.$('.switch', row)?.addEventListener('change', (e) => {
        const i = draft.triggers.indexOf(key);
        if (e.target.checked && i < 0) draft.triggers.push(key);
        else if (!e.target.checked && i >= 0) draft.triggers.splice(i, 1);
        render();
      });
    });

    N.$$('[data-save]').forEach((btn) =>
      btn.addEventListener('click', () => {
        touched.title = true;
        if (!draft.title.trim()) {
          N.toast('Give the countdown a title', { tone: 'error' });
          render();
          return;
        }
        if (dateError()) {
          N.toast('Pick a future date', { tone: 'error' });
          render();
          return;
        }
        const id = `cd_${Date.now().toString(36)}`;
        N.state.data.countdowns = [
          {
            id,
            title: draft.title.trim(),
            type: draft.type,
            targetDate: draft.targetDate,
            ownerId: N.ME.id,
            note: draft.note.trim(),
            color: draft.color,
          },
          ...N.state.data.countdowns,
        ];
        // Countdown targets also surface on the calendar (F4 integration).
        N.state.data.calendar = [
          ...N.state.data.calendar,
          { id: `c_${id}`, type: 'countdown', title: draft.title.trim(), date: draft.targetDate, refId: id },
        ];
        N.persist();
        N.toast('Countdown created and pinned to the calendar');
        location.href = 'm-countdowns.html';
      }),
    );
  }

  /** Only the numeric nodes change, so focus and scroll stay put. */
  function tick() {
    const host = N.$('[data-cd-preview]');
    if (!host) return;
    const r = N.countdownRemaining(draft.targetDate);
    const days = N.$('[data-cd-days]', host);
    const clock = N.$('[data-cd-clock]', host);
    if (days) days.textContent = r.days;
    if (clock) clock.textContent = `${pad(r.hours)}:${pad(r.minutes)}:${pad(r.seconds)}`;
  }

  N.page('countdown-new', () => {
    render();
    setInterval(tick, 1000);
  });
})();
