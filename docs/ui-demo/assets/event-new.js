/* F2 + F3 · Create event, mobile.
   Step 1 details, step 2 recipients. Validation gates the step, the preview card
   mirrors what `m-events.html` will render, and submitting prepends the event to
   the shared state so the events list and the dashboard both pick it up. */

(() => {
  const N = window.NEXA;

  const COVERS = ['brand-teal', 'brand-peach', 'brand-lavender', 'brand-ochre', 'brand-pink'];

  /** Draft state in the shape of TeamEvent, so the preview is the real card. */
  const draft = {
    title: '',
    description: '',
    location: '',
    date: N.isoDay(1),
    startTime: '14:00',
    endTime: '15:30',
    cover: 'brand-teal',
    recipients: { mode: 'single', userIds: [], teamId: N.TEAM.id },
    step: 1,
  };

  const touched = { title: false, location: false, recipients: false };

  /** Compose a TeamEvent-shaped object from the draft for the preview + submit. */
  function toEvent(id) {
    const startAt = `${draft.date}T${draft.startTime}:00`;
    const endAt = draft.endTime ? `${draft.date}T${draft.endTime}:00` : undefined;
    return {
      id,
      title: draft.title || 'Untitled event',
      description: draft.description,
      location: draft.location || 'Location to be confirmed',
      startAt,
      endAt,
      createdBy: N.ME.id,
      recipients: draft.recipients,
      cover: draft.cover,
      myStatus: null,
      responses: [],
    };
  }

  /** The same card the events list will render, driven by the draft. */
  function preview() {
    const event = toEvent('preview');
    const audience =
      draft.recipients.mode === 'all'
        ? `All of ${N.TEAM.name}`
        : draft.recipients.mode === 'single'
          ? draft.recipients.userIds.length
            ? N.userById(draft.recipients.userIds[0]).name
            : 'No recipient yet'
          : draft.recipients.userIds.length
            ? `${draft.recipients.userIds.length} people`
            : 'No recipients yet';

    return `<article class="card stack gap-sm" style="border-color:var(--color-surface-strong)">
      <div class="row gap-sm">
        <span class="cal-dot" style="width:10px;height:10px;background-color:var(--color-${draft.cover})"></span>
        <strong class="t-title-sm grow">${N.esc(draft.title || 'Untitled event')}</strong>
        <span class="badge badge-outline">${N.esc(audience)}</span>
      </div>
      <div class="stack gap-xxs t-body-sm c-muted">
        <span class="row gap-xs">${N.icon('clock', { size: 14 })} ${N.fmtRange(toEvent('p').startAt, toEvent('p').endAt)}</span>
        <span class="row gap-xs">${N.icon('mapPin', { size: 14 })} ${N.esc(draft.location || 'Location to be confirmed')}</span>
      </div>
      ${
        draft.description
          ? `<p class="t-body-sm c-body clamp-2">${N.esc(draft.description)}</p>`
          : ''
      }
      <div class="row gap-xs">
        <span class="badge badge-success">${N.icon('check', { size: 13 })} Attending</span>
        <span class="badge badge-error">${N.icon('x', { size: 13 })} Not attending</span>
        <span class="badge badge-warning">${N.icon('alert', { size: 13 })} Undecided</span>
      </div>
    </article>`;
  }

  function steps() {
    const items = [
      { n: 1, label: 'Event' },
      { n: 2, label: 'Recipients' },
    ];
    return `<div class="steps">
      ${items
        .map(
          (s, i) => `${i ? '<span class="step-sep"></span>' : ''}
          <span class="step ${draft.step === s.n ? 'is-active' : ''} ${draft.step > s.n ? 'is-done' : ''}">
            <span class="step-index">${draft.step > s.n ? N.icon('check', { size: 12 }) : s.n}</span>
            ${s.label}
          </span>`,
        )
        .join('')}
    </div>`;
  }

  const titleError = () => (touched.title && !draft.title.trim() ? 'Give the event a title.' : '');
  const locationError = () => (touched.location && !draft.location.trim() ? 'Where is it happening?' : '');
  const recipientError = () =>
    touched.recipients && draft.recipients.mode !== 'all' && !draft.recipients.userIds.length
      ? 'Pick at least one recipient.'
      : '';

  function stepOne() {
    return `<div class="card stack gap-md">
      ${N.field('Title', N.input({ name: 'title', value: draft.title, placeholder: 'Design system review — Q3 checkpoint' }), {
        error: titleError(),
      })}
      ${N.field(
        'Description',
        N.textarea({ name: 'description', value: draft.description, rows: 3, placeholder: 'What should people expect?' }),
        { optional: true, hint: 'Shown in the event detail screen.' },
      )}
      <div class="row gap-sm wrap" style="align-items:flex-start">
        <div class="grow" style="min-width:140px">
          ${N.field('Date', N.input({ name: 'date', type: 'date', value: draft.date }))}
        </div>
        <div class="grow" style="min-width:110px">
          ${N.field('Starts', N.input({ name: 'startTime', type: 'time', value: draft.startTime }))}
        </div>
        <div class="grow" style="min-width:110px">
          ${N.field('Ends', N.input({ name: 'endTime', type: 'time', value: draft.endTime }), { optional: true })}
        </div>
      </div>
      ${N.field(
        'Location',
        `<span class="input-group">${N.icon('mapPin', { size: 18 })}<input class="input" name="location" placeholder="Studio B · Floor 4" value="${N.esc(draft.location)}" /></span>`,
        { error: locationError() },
      )}
      <div class="field">
        <span class="label">Card colour</span>
        <div class="row gap-xs wrap">
          ${COVERS.map((c) => {
            const onDark = c === 'brand-teal' || c === 'brand-pink';
            const active = draft.cover === c;
            return `<button type="button" class="swatch-choice ${active ? 'is-active' : ''} ${onDark ? 'swatch-choice-on-dark' : ''}"
              data-cover="${c}" aria-label="${c}" aria-pressed="${active}"
              style="background-color:var(--color-${c});${active ? 'box-shadow:0 0 0 2px var(--color-canvas), 0 0 0 3px var(--color-ink)' : ''}">
              ${active ? N.icon('check', { size: 16 }) : ''}
            </button>`;
          }).join('')}
        </div>
        <span class="hint">Cycle the six surfaces — avoid reusing the same colour on consecutive events.</span>
      </div>
    </div>`;
  }

  function stepTwo() {
    return `<div class="card stack gap-md">
      <div class="stack" style="gap:2px">
        <span class="t-title-sm">Who is invited?</span>
        <span class="t-caption c-muted">Everyone receives an RSVP card they can answer from the notification.</span>
      </div>
      ${N.recipientPicker({ mode: draft.recipients.mode, selected: draft.recipients.userIds, idPrefix: 'evt' })}
      ${recipientError() ? `<span class="error-text">${recipientError()}</span>` : ''}
      <div class="card card-cream stack gap-xs">
        <span class="t-upper">Payload preview</span>
        <code style="white-space:pre-wrap;background:none;padding:0">${N.esc(
          JSON.stringify(
            {
              mode: draft.recipients.mode,
              userIds: draft.recipients.mode === 'all' ? undefined : draft.recipients.userIds,
              teamId: draft.recipients.mode === 'all' ? N.TEAM.id : undefined,
            },
            null,
            2,
          ),
        )}</code>
      </div>
    </div>`;
  }

  function render() {
    const canContinue = draft.title.trim() && draft.location.trim();

    N.$('[data-slot="shell"]').innerHTML = N.shellMobile({
      title: 'New event',
      subtitle: draft.step === 1 ? 'Step 1 of 2 · Event' : 'Step 2 of 2 · Recipients',
      back: 'm-events.html',
      hideTabbar: true,
      actions: `<button class="btn btn-primary btn-sm" data-submit ${canContinue ? '' : 'disabled'}>${
        draft.step === 1 ? 'Next' : 'Create'
      }</button>`,
      body: `
        ${steps()}
        ${draft.step === 1 ? stepOne() : stepTwo()}
        <div class="stack gap-xs">
          <span class="t-upper">Live preview</span>
          ${preview()}
        </div>
        <div class="row gap-sm">
          <button class="btn btn-secondary grow" data-back>${draft.step === 1 ? 'Cancel' : 'Back'}</button>
          <button class="btn btn-primary grow" data-next>${draft.step === 1 ? 'Continue' : 'Send invitations'}</button>
        </div>`,
    });

    wire();
  }

  function wire() {
    const root = document;

    N.$$('input[name], textarea[name]').forEach((el) =>
      el.addEventListener('input', () => {
        if (el.name in draft) draft[el.name] = el.value;
        if (el.name === 'title' || el.name === 'location') touched[el.name] = true;
        // Preserve focus and caret while re-rendering the preview.
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

    N.$$('[data-cover]').forEach((btn) =>
      btn.addEventListener('click', () => {
        draft.cover = btn.dataset.cover;
        render();
      }),
    );

    const picker = N.$('[data-recipient-picker]');
    N.wireRecipientPicker(picker);
    // Mirror picker changes into the draft on every selection.
    picker?.addEventListener('change', syncRecipients);
    picker?.addEventListener('click', () => setTimeout(syncRecipients, 0));

    N.$('[data-next]')?.addEventListener('click', submit);
    N.$('[data-submit]')?.addEventListener('click', submit);
    N.$('[data-back]')?.addEventListener('click', () => {
      if (draft.step === 1) {
        location.href = 'm-events.html';
      } else {
        draft.step = 1;
        render();
      }
    });
  }

  function syncRecipients() {
    const root = N.$('[data-recipient-picker]');
    if (!root) return;
    const mode = root.dataset.mode;
    const ids = N.$$('[data-picker-check]:checked, [data-picker-radio]:checked', root).map((i) => i.value);
    draft.recipients = {
      mode,
      userIds: mode === 'all' ? undefined : ids,
      teamId: N.TEAM.id,
    };
  }

  function submit() {
    if (draft.step === 1) {
      touched.title = true;
      touched.location = true;
      if (!draft.title.trim() || !draft.location.trim()) {
        N.toast('Add a title and a location first', { tone: 'error' });
        render();
        return;
      }
      draft.step = 2;
      render();
      return;
    }

    syncRecipients();
    touched.recipients = true;
    if (draft.recipients.mode !== 'all' && !draft.recipients.userIds.length) {
      N.toast('Pick at least one recipient', { tone: 'error' });
      render();
      return;
    }

    const id = `e_${Date.now().toString(36)}`;
    N.state.data.events = [toEvent(id), ...N.state.data.events];
    N.persist();
    N.toast('Event created — invitations sent');
    location.href = `event-detail.html?id=${id}`;
  }

  N.page('event-new', () => {
    render();
  });
})();
