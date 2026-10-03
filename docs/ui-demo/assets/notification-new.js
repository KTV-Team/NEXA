/* F1 + F3 · New notification — mobile composer.
   One draft object drives three steps (content → card actions → recipients), a
   live notifCard preview, inline validation, and the success sheet. Submitting
   appends the notification to the shared mock store so the inbox reflects it. */

(() => {
  const N = window.NEXA;
  const { $, $$, esc, state } = N;

  const STEPS = ['Content', 'Actions', 'Recipients'];

  const ACTIONS = [
    { key: 'confirm', label: 'Confirm', hint: 'Mark as done or acknowledged' },
    { key: 'snooze', label: 'Snooze', hint: 'Reschedule the reminder for later' },
    { key: 'dismiss', label: 'Dismiss', hint: 'Close without taking action' },
  ];

  const PRIORITIES = [
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'High priority' },
    { value: 'low', label: 'Low' },
  ];

  // ── Draft + local UI state ────────────────────────────────────────────────
  let step = 0;
  let sent = null;

  const emptyDraft = () => ({
    title: '',
    body: '',
    priority: 'normal',
    dueDate: N.isoDay(0),
    dueTime: '09:00',
    actions: { confirm: true, snooze: false, dismiss: false },
    custom: [],
    mode: 'single',
    selected: [],
  });

  const draft = Object.assign(emptyDraft(), {
    title: 'Onboarding checklist review',
    body: 'The updated checklist is in the shared doc — read steps 3–5 and confirm.',
    priority: 'high',
    dueTime: '17:30',
    actions: { confirm: true, snooze: true, dismiss: false },
    mode: 'single',
    selected: ['u_02'],
  });

  const touched = {};

  // ── Derived draft values ──────────────────────────────────────────────────

  const actionList = () => [...ACTIONS.filter((a) => draft.actions[a.key]).map((a) => a.key), ...draft.custom];
  const labelFor = (key) => N.ACTION_LABELS[key] ?? key;
  const iconFor = (key) => (key === 'confirm' ? 'check' : key === 'snooze' ? 'snooze' : 'x');

  const recipientCount = () => (draft.mode === 'all' ? N.TEAM.members : draft.selected.length);

  const audienceLabel = () => {
    if (draft.mode === 'all') return `All ${N.TEAM.members} of ${N.TEAM.name}`;
    if (draft.mode === 'multi') return `${draft.selected.length} people`;
    const u = draft.selected[0] ? N.userById(draft.selected[0]) : null;
    return u ? u.name : 'No recipient yet';
  };

  const recipientNames = () =>
    draft.mode === 'all'
      ? `all ${N.TEAM.members} members of ${N.TEAM.name}`
      : draft.selected.map((id) => N.userById(id).name).join(', ');

  const dueAt = () => (draft.dueDate && draft.dueTime ? new Date(`${draft.dueDate}T${draft.dueTime}:00`).toISOString() : null);

  /** In-memory notification the preview card renders — never added to the store as is. */
  function draftNotif() {
    return {
      id: 'draft',
      title: draft.title.trim() || 'Your notification title',
      body: draft.body.trim() || 'The message body appears here as you type.',
      senderId: N.ME.id,
      recipients: { mode: draft.mode, userIds: draft.selected, teamId: N.TEAM.id },
      actions: actionList(),
      dueAt: dueAt(),
      createdAt: new Date().toISOString(),
      priority: draft.priority,
      response: { actionKey: null, respondedAt: null, snoozedUntil: null },
      read: false,
    };
  }

  // ── Validation ────────────────────────────────────────────────────────────

  function errors() {
    return {
      title: draft.title.trim() ? '' : 'Add a title so recipients know what this is about.',
      body: draft.body.trim() ? '' : 'Write the message recipients will read.',
      actions: actionList().length ? '' : 'Keep at least one action on the card.',
      recipients:
        draft.mode === 'all' || draft.selected.length
          ? ''
          : draft.mode === 'multi'
            ? 'Select at least one teammate.'
            : 'Choose the person who should receive this.',
    };
  }

  const stepValid = (i) => {
    const e = errors();
    if (i === 0) return !e.title && !e.body;
    if (i === 1) return !e.actions;
    return !e.recipients;
  };

  const navDisabled = () => (step === 2 ? !(stepValid(0) && stepValid(1) && stepValid(2)) : !stepValid(step));

  // ── Pieces ────────────────────────────────────────────────────────────────

  const fieldBlock = (key, control) => `<span class="stack gap-xxs" data-field="${key}">${control}</span>`;

  function stepIndicator() {
    return `<div class="steps">
      ${STEPS.map(
        (label, i) =>
          `${i ? '<span class="step-sep"></span>' : ''}<span class="step ${i === step ? 'is-active' : ''} ${
            i < step ? 'is-done' : ''
          }"${i <= step ? '' : ' aria-hidden="true"'}>
            <span class="step-index">${i < step ? N.icon('check', { size: 12 }) : i + 1}</span>${label}
          </span>`,
      ).join('')}
    </div>`;
  }

  function stepContent() {
    return `<div class="card card-pad-sm stack gap-md">
      ${fieldBlock('title', N.field('Title', N.input({ name: 'title', value: draft.title, placeholder: 'What do you need from the team?' })))}
      ${fieldBlock(
        'body',
        N.field(
          'Message',
          N.textarea({ name: 'body', rows: 3, value: draft.body, placeholder: 'Add the detail recipients need to answer.' }),
        ),
      )}
      ${N.field('Priority', N.select({ name: 'priority', value: draft.priority, options: PRIORITIES }))}
      <div class="row gap-sm" style="align-items:flex-start">
        <span class="grow">${N.field('Due date', N.input({ type: 'date', name: 'dueDate', value: draft.dueDate }))}</span>
        <span class="grow">${N.field('Time', N.input({ type: 'time', name: 'dueTime', value: draft.dueTime }))}</span>
      </div>
    </div>`;
  }

  function stepActions() {
    return `<div class="card card-pad-sm stack gap-md">
      <div class="stack" style="gap:0">
        <span class="t-title-sm">Which buttons appear on the card?</span>
        <span class="t-caption c-muted">Recipients answer without leaving their inbox.</span>
      </div>
      <div class="stack gap-sm">
        ${ACTIONS.map(
          (a) => `<div class="between gap-md">
            <span class="grow stack" style="gap:0">
              <span class="t-body-sm c-ink" style="font-weight:500">${a.label}</span>
              <span class="t-caption">${a.hint}</span>
            </span>
            <input type="checkbox" class="switch" data-action="${a.key}" aria-label="${a.label}" ${
              draft.actions[a.key] ? 'checked' : ''
            } />
          </div>`,
        ).join('')}
      </div>
      <span class="error-text hidden" data-error="actions"></span>
      <hr class="divider" />
      <div class="stack" style="gap:0">
        <span class="t-upper">Custom action</span>
        <span class="t-caption c-muted">Optional — add a labelled button, e.g. Approve.</span>
      </div>
      <div class="row gap-sm">
        <span class="grow">${N.input({ name: 'custom-action', placeholder: 'e.g. Approve' })}</span>
        <button class="btn btn-secondary" type="button" data-add-custom>Add</button>
      </div>
      <div class="row wrap gap-xs" data-role="custom-list">${customChips()}</div>
    </div>`;
  }

  function customChips() {
    if (!draft.custom.length) return '<span class="t-caption c-soft">No custom actions yet.</span>';
    return draft.custom
      .map(
        (label, i) => `<span class="chip">${esc(label)}<button type="button" data-custom-remove="${i}" aria-label="Remove ${esc(
          label,
        )}">${N.icon('x', { size: 12 })}</button></span>`,
      )
      .join('');
  }

  function stepRecipients() {
    return `<div class="card card-pad-sm stack gap-md">
      <div class="stack" style="gap:0">
        <span class="t-title-sm">Who receives this?</span>
        <span class="t-caption c-muted">One person, several people, or a broadcast to the team.</span>
      </div>
      ${N.recipientPicker({ mode: draft.mode, selected: draft.selected, idPrefix: 'notif-rcp' })}
      <span class="error-text hidden" data-error="recipients"></span>
    </div>`;
  }

  function navRow() {
    return `<div class="row gap-sm">
      ${
        step === 0
          ? `<a class="btn btn-secondary" href="m-notifications.html">Cancel</a>`
          : `<button class="btn btn-secondary" type="button" data-nav="back">Back</button>`
      }
      <button class="btn btn-primary grow" type="button" data-nav="next" ${navDisabled() ? 'disabled' : ''}>${
        step === 2 ? 'Send notification' : 'Next'
      }</button>
    </div>`;
  }

  function previewInner() {
    const keys = actionList();
    return `<div class="between wrap gap-sm">
        <span class="t-upper">Live preview</span>
        <span class="row wrap gap-xs">
          <span class="badge badge-outline truncate">To ${esc(audienceLabel())}</span>
          ${
            keys.length
              ? keys
                  .map(
                    (key) =>
                      `<span class="badge badge-outline">${N.icon(iconFor(key), { size: 12 })} ${esc(labelFor(key))}</span>`,
                  )
                  .join('')
              : '<span class="badge badge-outline c-muted">Read only</span>'
          }
        </span>
      </div>
      ${N.notifCard(draftNotif(), { actions: false })}
      <span class="t-caption c-soft">Recipients see this card in their inbox and answer without opening anything else.</span>`;
  }

  function sentSheet() {
    if (!sent) return '<div class="scrim hidden" id="sent-sheet"><div class="modal"></div></div>';
    return `<div class="scrim hidden" id="sent-sheet">
      <div class="modal">
        <div class="row gap-sm">
          <span class="empty-art" style="width:44px;height:44px;border-radius:var(--radius-md);background-color:var(--tint-success);color:var(--color-success)">${N.icon(
            'checkCircle',
            { size: 22 },
          )}</span>
          <span class="grow stack" style="gap:0">
            <strong class="t-title-md">Notification sent</strong>
            <span class="t-caption c-muted">${sent.recipients} ${
              sent.recipients === 1 ? 'recipient' : 'recipients'
            } · ${esc(sent.audience)}</span>
          </span>
          <button class="icon-btn" type="button" data-close aria-label="Close">${N.icon('x')}</button>
        </div>
        <div class="card card-cream stack gap-xs">
          <div class="kv"><dt>Title</dt><dd>${esc(sent.title)}</dd></div>
          <div class="kv"><dt>Actions</dt><dd>${esc(sent.actions.join(' · '))}</dd></div>
          <div class="kv"><dt>Recipients</dt><dd>${sent.recipients} · ${esc(sent.audience)}</dd></div>
          <div class="kv"><dt>Due</dt><dd>${esc(sent.due)}</dd></div>
        </div>
        <button class="btn btn-primary btn-block" type="button" data-close data-send-another>Send another</button>
        <a class="btn btn-secondary btn-block" href="m-notifications.html">Back to inbox</a>
      </div>
    </div>`;
  }

  // ── Render + patching ─────────────────────────────────────────────────────

  function render() {
    $('[data-slot="shell"]').innerHTML =
      N.shellMobile({
        title: 'New notification',
        subtitle: `Step ${step + 1} of 3 · ${STEPS[step]}`,
        back: 'm-notifications.html',
        hideTabbar: true,
        body: `${stepIndicator()}${
          step === 0 ? stepContent() : step === 1 ? stepActions() : stepRecipients()
        }${navRow()}<div class="stack gap-sm" data-role="preview">${previewInner()}</div>`,
      }) + sentSheet();

    N.wireRecipientPicker($('[data-recipient-picker]'));
    syncValidation();
  }

  /** Repaint the preview, the inline errors, and the primary button — no full re-render,
      so the focused field keeps focus and the recipient picker keeps its state. */
  function refresh() {
    const preview = $('[data-role="preview"]');
    if (preview) preview.innerHTML = previewInner();
    const customList = $('[data-role="custom-list"]');
    if (customList) customList.innerHTML = customChips();
    syncValidation();
  }

  function setError(key, inputName, message) {
    const wrap = $(`[data-field="${key}"]`);
    let el = wrap ? $('[data-error]', wrap) : null;
    if (wrap && !el) {
      el = document.createElement('span');
      el.className = 'error-text';
      el.dataset.error = key;
      wrap.appendChild(el);
    }
    if (!el) el = $(`[data-error="${key}"]`);
    if (el) {
      el.textContent = message;
      el.classList.toggle('hidden', !message);
    }
    const input = inputName ? $(`[name="${inputName}"]`) : null;
    if (input) input.setAttribute('aria-invalid', message ? 'true' : 'false');
  }

  function syncValidation() {
    const e = errors();
    setError('title', 'title', touched.title ? e.title : '');
    setError('body', 'body', touched.body ? e.body : '');
    const actionsErr = $('[data-error="actions"]');
    if (actionsErr) {
      actionsErr.textContent = touched.actions ? e.actions : '';
      actionsErr.classList.toggle('hidden', !(touched.actions && e.actions));
    }
    const recipientsErr = $('[data-error="recipients"]');
    if (recipientsErr) {
      recipientsErr.textContent = touched.recipients ? e.recipients : '';
      recipientsErr.classList.toggle('hidden', !(touched.recipients && e.recipients));
    }
    const next = $('[data-nav="next"]');
    if (next) next.disabled = navDisabled();
  }

  // ── Interactions ──────────────────────────────────────────────────────────

  /** Mirror the picker DOM back into the draft (mode buttons and per-person picks). */
  function syncSelection() {
    const root = $('[data-recipient-picker]');
    if (!root) return;
    draft.mode = $('[data-role="mode-input"]', root)?.value ?? draft.mode;
    draft.selected = $$('[data-picker-check]:checked, [data-picker-radio]:checked', root).map((i) => i.value);
    touched.recipients = true;
  }

  function addCustom(name) {
    const label = name.trim();
    if (!label) return;
    const taken = [...ACTIONS.map((a) => a.label), ...draft.custom].some(
      (l) => l.toLowerCase() === label.toLowerCase(),
    );
    if (taken) {
      N.toast(`“${label}” is already on this card`, { tone: 'error' });
      return;
    }
    draft.custom.push(label);
    touched.actions = true;
  }

  function submit() {
    const e = errors();
    touched.title = touched.body = touched.actions = touched.recipients = true;
    if (e.title || e.body || e.actions || e.recipients) {
      syncValidation();
      N.toast('Check the highlighted fields before sending', { tone: 'error' });
      return;
    }
    const n = draftNotif();
    const created = { ...n, id: `n_${Date.now().toString(36)}` };
    state.data.notifications.unshift(created);
    N.persist();
    sent = {
      title: created.title,
      actions: created.actions.map(labelFor),
      recipients: recipientCount(),
      audience: audienceLabel(),
      due: created.dueAt ? `${N.fmtDay(created.dueAt.slice(0, 10))} · ${N.fmtTime(created.dueAt)}` : 'No due date',
    };
    render();
    N.openSheet('sent-sheet');
    N.toast(
      sent.recipients === 1
        ? `Notification sent to ${recipientNames()}`
        : `Notification sent to ${sent.recipients} recipients`,
    );
  }

  function onClick(e) {
    const add = e.target.closest('[data-add-custom]');
    if (add) {
      const field = $('[name="custom-action"]');
      addCustom(field ? field.value : '');
      render();
      return;
    }
    const remove = e.target.closest('[data-custom-remove]');
    if (remove) {
      draft.custom.splice(Number(remove.dataset.customRemove), 1);
      touched.actions = true;
      render();
      return;
    }
    if (e.target.closest('[data-send-another]')) {
      Object.assign(draft, emptyDraft());
      step = 0;
      sent = null;
      render();
      return;
    }
    // Recipient picker: update the draft after wireRecipientPicker has re-rendered the panel.
    const picker = e.target.closest('[data-recipient-picker]');
    if (picker) {
      syncSelection();
      refresh();
      return;
    }
    const nav = e.target.closest('[data-nav]');
    if (!nav || nav.disabled) return;
    if (nav.dataset.nav === 'back') {
      step = Math.max(0, step - 1);
      render();
      return;
    }
    if (step < 2) {
      touched.title = touched.body = true;
      step += 1;
      render();
    } else {
      submit();
    }
  }

  function onChange(e) {
    const t = e.target;
    if (t.name === 'priority') {
      draft.priority = t.value;
      refresh();
      return;
    }
    if (t.dataset.action) {
      draft.actions[t.dataset.action] = t.checked;
      touched.actions = true;
      refresh();
      return;
    }
    if (t.matches('[data-picker-check], [data-picker-radio]')) {
      syncSelection();
      refresh();
    }
  }

  function onInput(e) {
    const t = e.target;
    if (t.name === 'title') {
      draft.title = t.value;
      touched.title = true;
      refresh();
    } else if (t.name === 'body') {
      draft.body = t.value;
      touched.body = true;
      refresh();
    } else if (t.name === 'dueDate') {
      draft.dueDate = t.value;
      refresh();
    } else if (t.name === 'dueTime') {
      draft.dueTime = t.value;
      refresh();
    }
  }

  N.page('notification-new', () => {
    const host = $('[data-slot="shell"]');
    host.addEventListener('click', onClick);
    host.addEventListener('change', onChange);
    host.addEventListener('input', onInput);
    host.addEventListener('focusout', (e) => {
      if (e.target.name === 'title' || e.target.name === 'body') {
        touched[e.target.name] = true;
        refresh();
      }
    });
    N.live(render);
    render();
  });
})();
