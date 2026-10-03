/* F1 · Notification detail, mobile.
   The action history is derived from `response` plus the seeded creation events,
   and the action row reuses the global `data-act` handler in ui.js so responding
   here is identical to responding in the inbox. */

(() => {
  const N = window.NEXA;

  const notificationId = N.param('id', 'n_01');

  /** Response history for a notification, newest first. */
  function history(n) {
    const rows = [
      {
        icon: 'send',
        tone: 'brand-teal',
        title: `${N.userById(n.senderId).name} sent this to ${audience(n)}`,
        when: n.createdAt,
      },
    ];

    if (n.response.respondedAt) {
      const map = {
        confirm: { icon: 'check', tone: 'success', title: 'You confirmed it' },
        dismiss: { icon: 'x', tone: 'error', title: 'You dismissed it' },
        snooze: { icon: 'snooze', tone: 'warning', title: 'You snoozed it' },
      };
      const meta = map[n.response.actionKey] ?? { icon: 'check', tone: 'success', title: 'You responded' };
      rows.push({ ...meta, when: n.response.respondedAt });
      if (n.response.snoozedUntil) {
        rows.push({
          icon: 'clock',
          tone: 'muted',
          title: `Returns ${N.fmtDay(n.response.snoozedUntil.slice(0, 10))} at ${N.fmtTime(n.response.snoozedUntil)}`,
          when: null,
        });
      }
    } else {
      rows.push({ icon: 'eye', tone: 'muted', title: 'Delivered — waiting for your response', when: n.createdAt });
    }
    return rows.reverse();
  }

  function audience(n) {
    if (n.recipients.mode === 'all') return `all of ${N.TEAM.name}`;
    if (n.recipients.mode === 'single') return 'you';
    return `${n.recipients.userIds.length} people`;
  }

  /** Who else received it, and (for team broadcasts) how they answered. */
  function recipientList(n) {
    const ids =
      n.recipients.mode === 'all'
        ? N.USERS.map((u) => u.id)
        : n.recipients.mode === 'single'
          ? n.recipients.userIds ?? []
          : n.recipients.userIds ?? [];

    return ids
      .map((id) => {
        const u = N.userById(id);
        const mine = id === N.ME.id;
        const state =
          mine && n.response.actionKey
            ? { label: N.ACTION_LABELS[n.response.actionKey], tone: n.response.actionKey === 'confirm' ? 'badge-success' : n.response.actionKey === 'dismiss' ? 'badge-outline' : 'badge-warning' }
            : mine
              ? { label: 'Awaiting you', tone: 'badge-ink' }
              : { label: 'Sent', tone: 'badge-outline' };
        return `<div class="list-row">
          ${N.avatar(u, { size: 'sm' })}
          <span class="grow stack" style="gap:0;min-width:0">
            <span class="t-body-sm c-ink" style="font-weight:500">${N.esc(u.name)}${mine ? ' (you)' : ''}</span>
            <span class="t-caption truncate">${N.esc(u.jobTitle)}</span>
          </span>
          <span class="badge ${state.tone}">${N.esc(state.label)}</span>
        </div>`;
      })
      .join('');
  }

  function render() {
    const n = N.notifById(notificationId);
    const sender = n ? N.userById(n.senderId) : null;

    if (!n) {
      N.$('[data-slot="shell"]').innerHTML = N.shellMobile({
        title: 'Notification',
        back: 'm-notifications.html',
        hideTabbar: true,
        body: N.emptyState(
          'Notification not found',
          'This notification may have been dismissed or deleted. Open the inbox to see what is waiting.',
          `<a class="btn btn-secondary btn-sm" href="m-notifications.html">Back to inbox</a>`,
        ),
      });
      return;
    }

    const responded = Boolean(n.response.actionKey);
    const overdue = n.dueAt && new Date(n.dueAt) < new Date() && !responded;

    N.$('[data-slot="shell"]').innerHTML = N.shellMobile({
      title: 'Notification',
      subtitle: N.fmtRelative(n.createdAt),
      back: 'm-notifications.html',
      hideTabbar: true,
      actions: `<button class="icon-btn icon-btn-outline" data-open="detail-actions" aria-label="More">${N.icon('menu')}</button>`,
      body: `
        <article class="card stack gap-md">
          <div class="row gap-sm">
            ${N.avatar(sender, { size: 'lg' })}
            <div class="grow stack" style="gap:0;min-width:0">
              <span class="t-title-sm truncate">${N.esc(sender.name)}</span>
              <span class="t-caption">${N.esc(sender.jobTitle)} · ${N.TEAM.name}</span>
            </div>
            ${N.notifStatus(n)}
          </div>

          <div class="stack gap-xs">
            <h1 class="t-title-lg">${N.esc(n.title)}</h1>
            ${n.priority === 'high' ? `<span class="badge badge-error" style="align-self:flex-start">${N.icon('alert', { size: 13 })} High priority</span>` : ''}
          </div>

          <p class="t-body c-body">${N.esc(n.body)}</p>

          <div class="row wrap gap-sm">
            <span class="badge badge-outline">${N.icon('users', { size: 13 })} ${N.esc(audience(n))}</span>
            ${
              n.dueAt
                ? `<span class="badge ${overdue ? 'badge-error' : 'badge-outline'}">${N.icon('clock', { size: 13 })} Due ${N.fmtDay(
                    n.dueAt.slice(0, 10),
                  )} · ${N.fmtTime(n.dueAt)}</span>`
                : ''
            }
          </div>

          <hr class="divider divider-soft" />

          <div class="stack gap-sm">
            <span class="t-upper">${responded ? 'Your response' : 'Respond'}</span>
            <div class="notif-actions">
              ${n.actions
                .map((key) => {
                  const active = n.response.actionKey === key;
                  const iconName = key === 'confirm' ? 'check' : key === 'snooze' ? 'snooze' : 'x';
                  return `<button class="btn ${active ? 'btn-primary' : 'btn-secondary'} btn-sm" data-act="${key}" data-notif="${n.id}" ${
                    active ? 'aria-pressed="true"' : ''
                  }>${N.icon(iconName, { size: 15 })} ${N.ACTION_LABELS[key] ?? key}</button>`;
                })
                .join('')}
            </div>
            ${
              responded
                ? `<span class="t-caption c-muted">You responded ${N.fmtRelative(n.response.respondedAt)}${
                    n.response.snoozedUntil
                      ? ` · returns ${N.fmtDay(n.response.snoozedUntil.slice(0, 10))} at ${N.fmtTime(n.response.snoozedUntil)}`
                      : ''
                  }. Choosing another action replaces it.</span>`
                : `<span class="t-caption c-muted">Your answer is visible to ${N.esc(sender.name)} straight away.</span>`
            }
          </div>
        </article>

        <section class="card stack gap-xs">
          <div class="between">
            <span class="t-upper">Recipients</span>
            <span class="t-caption c-muted">${
              n.recipients.mode === 'all' ? `${N.TEAM.members} members` : `${(n.recipients.userIds ?? []).length} selected`
            }</span>
          </div>
          ${recipientList(n)}
        </section>

        <section class="card stack gap-sm">
          <span class="t-upper">History</span>
          <div class="stack">
            ${history(n)
              .map(
                (h) => `<div class="row gap-sm" style="align-items:flex-start;padding:8px 0">
                  <span class="empty-art" style="width:32px;height:32px;border-radius:var(--radius-md);background-color:var(--tint-${
                    h.tone === 'muted' ? 'brand-mint' : h.tone
                  })">${N.icon(h.icon, { size: 15 })}</span>
                  <span class="grow stack" style="gap:0">
                    <span class="t-body-sm c-ink" style="font-weight:500">${N.esc(h.title)}</span>
                    ${h.when ? `<span class="t-caption c-muted">${N.fmtRelative(h.when)}</span>` : ''}
                  </span>
                </div>`,
              )
              .join('')}
          </div>
        </section>

        <div class="row gap-sm">
          <button class="btn btn-secondary grow" data-share>${N.icon('link', { size: 15 })} Copy link</button>
          <a class="btn btn-secondary grow" href="m-notifications.html">${N.icon('inbox', { size: 15 })} Back to inbox</a>
        </div>

        <div class="scrim sheet-host hidden" id="detail-actions">
          <div class="sheet">
            <span class="sheet-handle"></span>
            <div class="between">
              <strong class="t-title-md">Notification options</strong>
              <button class="icon-btn" data-close>${N.icon('x')}</button>
            </div>
            <button class="row gap-sm card card-hover" style="text-align:left" data-open="snooze-sheet">
              <span class="empty-art" style="width:40px;height:40px;border-radius:var(--radius-md);background-color:var(--tint-warning)">${N.icon('snooze', { size: 18 })}</span>
              <span class="grow stack" style="gap:0"><span class="t-title-sm">Snooze</span><span class="t-caption">Remind me later</span></span>
            </button>
            <button class="row gap-sm card card-hover" style="text-align:left" data-mark-unread>
              <span class="empty-art" style="width:40px;height:40px;border-radius:var(--radius-md);background-color:var(--tint-brand-mint)">${N.icon('eye', { size: 18 })}</span>
              <span class="grow stack" style="gap:0"><span class="t-title-sm">Mark as unread</span><span class="t-caption">Keep it in Needs you</span></span>
            </button>
            <button class="row gap-sm card card-hover" style="text-align:left" data-archive>
              <span class="empty-art" style="width:40px;height:40px;border-radius:var(--radius-md);background-color:var(--tint-brand-lavender)">${N.icon('archive', { size: 18 })}</span>
              <span class="grow stack" style="gap:0"><span class="t-title-sm">Archive</span><span class="t-caption">Hide from the inbox</span></span>
            </button>
            <hr class="divider" />
            <button class="row gap-sm card card-hover" style="text-align:left" data-delete>
              <span class="empty-art" style="width:40px;height:40px;border-radius:var(--radius-md);background-color:var(--tint-error)">${N.icon('trash', { size: 18 })}</span>
              <span class="grow stack" style="gap:0"><span class="t-title-sm c-error">Delete notification</span><span class="t-caption">Removes it for you only</span></span>
            </button>
          </div>
        </div>

        <div class="scrim sheet-host hidden" id="snooze-sheet">
          <div class="sheet">
            <span class="sheet-handle"></span>
            <div class="between">
              <strong class="t-title-md">Snooze until</strong>
              <button class="icon-btn" data-close>${N.icon('x')}</button>
            </div>
            <div class="stack gap-sm">
              ${[
                ['Later today · 18:00', N.isoTime(0, 18, 0)],
                ['Tomorrow · 09:00', N.isoTime(1, 9, 0)],
                ['In three days · 09:00', N.isoTime(3, 9, 0)],
                ['Next week · Monday 09:00', N.isoTime(((8 - new Date().getDay()) % 7) || 7, 9, 0)],
              ]
                .map(
                  ([label, iso]) => `<button class="btn btn-secondary btn-block" data-snooze-until="${iso}">${label}</button>`,
                )
                .join('')}
            </div>
            <div class="field">
              <span class="label">Or pick a time</span>
              <div class="row gap-sm">
                <input class="input" type="date" value="${N.isoDay(1)}" data-snooze-date />
                <input class="input" type="time" value="09:00" data-snooze-time />
              </div>
            </div>
            <button class="btn btn-primary btn-block" data-snooze-custom>${N.icon('snooze', { size: 15 })} Snooze</button>
          </div>
        </div>`,
    });

    wire();
  }

  function wire() {
    const n = N.notifById(notificationId);
    if (!n) return;

    N.$$('[data-snooze-until]').forEach((btn) =>
      btn.addEventListener('click', () => {
        N.notifyAction(n.id, 'snooze', btn.dataset.snoozeUntil);
        N.toast(`Snoozed until ${N.fmtDay(btn.dataset.snoozeUntil.slice(0, 10))} · ${N.fmtTime(btn.dataset.snoozeUntil)}`);
        render();
      }),
    );

    N.$('[data-snooze-custom]')?.addEventListener('click', () => {
      const date = N.$('[data-snooze-date]').value;
      const time = N.$('[data-snooze-time]').value || '09:00';
      if (!date) {
        N.toast('Pick a date to snooze until', { tone: 'error' });
        return;
      }
      const iso = `${date}T${time}:00`;
      N.notifyAction(n.id, 'snooze', iso);
      N.toast(`Snoozed until ${N.fmtDay(date)} · ${time}`);
      render();
    });

    N.$('[data-mark-unread]')?.addEventListener('click', () => {
      n.response = { actionKey: null, respondedAt: null, snoozedUntil: null };
      n.read = false;
      N.persist();
      N.toast('Moved back to Needs you');
      render();
    });

    N.$('[data-archive]')?.addEventListener('click', () => {
      N.toast('Archived — you can still find it in Done');
      render();
    });

    N.$('[data-delete]')?.addEventListener('click', async () => {
      const ok = await N.confirmDialog('Delete this notification?', 'It disappears from your inbox. Other recipients keep theirs.', 'Delete');
      if (!ok) return;
      N.state.data.notifications = N.state.data.notifications.filter((x) => x.id !== n.id);
      N.persist();
      N.toast('Notification deleted');
      location.href = 'm-notifications.html';
    });

    N.$$('[data-share]').forEach((btn) =>
      btn.addEventListener('click', () => N.toast('Link copied to the clipboard')),
    );

    // Responding here uses the same global handler as the inbox; re-render the
    // page when the shared state changes so the history stays accurate.
    document.addEventListener('nexa:changed', (e) => {
      if (e.detail?.kind === 'notification' && e.detail.id === notificationId) render();
    });
  }

  N.page('m-notification-detail', () => {
    render();
  });
})();
