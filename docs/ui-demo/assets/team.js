/* F3 · Team roster (web).
   GET    /teams/:teamId/members        → the table + side panel
   POST   /teams/:teamId/invitations    → "Invite member"
   PATCH  /teams/:teamId/members/:id    → "Change role"
   DELETE /teams/:teamId/members/:id    → "Remove" (confirmDialog)
   The targeting preview mounts the same NEXA.recipientPicker the composers use
   and prints the RecipientTarget payload underneath. */

(() => {
  const N = window.NEXA;
  const { esc, icon, fmtRelative, RSVP_META, userById } = N;

  const ROLES = [
    { value: 'admin', label: 'Admin', hint: 'Can create events, notifications, and countdowns for everyone.' },
    { value: 'user', label: 'Member', hint: 'Can respond, and create for themselves.' },
    { value: 'guest', label: 'Guest', hint: 'Can respond only — read-only on creation.' },
  ];
  const ROLE_LABEL = { admin: 'Admin', user: 'Member', guest: 'Guest' };
  const ROLE_TINT = { admin: 'brand-teal', user: 'brand-lavender', guest: 'brand-peach' };

  let inviteOpen = false;
  let inviteError = '';
  const invite = { email: '', role: 'user' };
  let roleTargetId = null;

  // ── derived data ──────────────────────────────────────────────────────────

  const recipientsOf = (item) =>
    item.recipients.mode === 'all' ? N.USERS.map((u) => u.id) : item.recipients.userIds ?? [];

  function reach(userId) {
    return {
      notifications: N.state.data.notifications.filter((n) => recipientsOf(n).includes(userId)).length,
      events: N.state.data.events.filter((e) => recipientsOf(e).includes(userId)).length,
    };
  }

  const byRole = () =>
    ROLES.map((r) => ({
      ...r,
      count: N.USERS.filter((u) => u.role === r.value).length,
      members: N.USERS.filter((u) => u.role === r.value),
    }));

  function mostTargeted() {
    return N.USERS.map((u) => ({ user: u, ...reach(u.id) }))
      .sort((a, b) => b.notifications + b.events - (a.notifications + a.events))
      .slice(0, 4);
  }

  /** Recent activity is derived from the seeded responses and sends — nothing invented. */
  function activity() {
    const items = [];
    N.state.data.events.forEach((e) =>
      e.responses.forEach((r) => {
        if (r.respondedAt) {
          items.push({
            userId: r.userId,
            at: r.respondedAt,
            text: `answered <strong>${esc(RSVP_META[r.status].label.toLowerCase())}</strong> to ${esc(e.title)}`,
          });
        }
      }),
    );
    N.state.data.notifications.forEach((n) =>
      items.push({ userId: n.senderId, at: n.createdAt, text: `sent ${esc(n.title)}` }),
    );
    return items.sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 5);
  }

  // ── pieces ────────────────────────────────────────────────────────────────

  function memberTable() {
    return `<div class="card" style="padding:var(--space-lg)">
      <table class="table">
        <thead>
          <tr>
            <th>Member</th>
            <th>Role</th>
            <th>Job title</th>
            <th>Reach</th>
            <th style="text-align:right">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${N.USERS.map((u) => {
            const r = reach(u.id);
            return `<tr>
              <td>
                <span class="row gap-sm">
                  ${N.avatar(u, { size: 'sm' })}
                  <span class="stack" style="gap:0">
                    <span class="t-body-sm c-ink" style="font-weight:600">${esc(u.name)}${u.id === N.ME.id ? ' (you)' : ''}</span>
                    <span class="row gap-xs t-caption c-muted"><span class="c-soft">${icon('mail', { size: 13 })}</span><span class="truncate" style="max-width:190px">${esc(
                      u.email,
                    )}</span></span>
                  </span>
                </span>
              </td>
              <td>
                <span class="badge" style="background-color:var(--tint-${ROLE_TINT[u.role]})">${esc(ROLE_LABEL[u.role])}</span>
              </td>
              <td><span class="truncate" style="max-width:170px">${esc(u.jobTitle)}</span></td>
              <td>
                <span class="stack" style="gap:0">
                  <span class="t-body-sm c-ink t-num">${r.notifications} notifications</span>
                  <span class="t-caption c-muted t-num">${r.events} events</span>
                </span>
              </td>
              <td style="text-align:right;white-space:nowrap">
                <button type="button" class="link-btn t-caption" data-role-for="${u.id}">Change role</button>
                ${
                  u.id === N.ME.id
                    ? ''
                    : `<button type="button" class="link-btn t-caption" data-remove="${u.id}" style="margin-left:var(--space-sm)">Remove</button>`
                }
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
  }

  function rolesCard() {
    return `<div class="card stack gap-sm">
      <div class="between">
        <span class="t-upper">Members by role</span>
        <span class="badge badge-outline">${N.TEAM.members} total</span>
      </div>
      <div class="stack gap-xs">
        ${byRole()
          .map(
            (r) => `<div class="between gap-sm">
              <span class="row gap-xs">
                <span class="cal-dot" style="background-color:var(--color-${ROLE_TINT[r.value]})"></span>
                <span class="t-body-sm c-ink">${esc(r.label)}</span>
              </span>
              <span class="row gap-xs">
                ${N.avatarStack(r.members.map((m) => m.id), { max: 4, size: 'sm' })}
                <strong class="t-body-sm t-num c-ink">${r.count}</strong>
              </span>
            </div>`,
          )
          .join('')}
      </div>
      <p class="t-caption c-muted">Admins create for everyone, members create for themselves, guests only respond.</p>
    </div>`;
  }

  function targetedCard() {
    return `<div class="card stack gap-sm">
      <span class="t-upper">Most-targeted members</span>
      <div class="stack">
        ${mostTargeted()
          .map(
            (m) => `<div class="list-row">
              ${N.avatar(m.user, { size: 'sm' })}
              <span class="grow stack" style="gap:0">
                <span class="t-body-sm c-ink" style="font-weight:500">${esc(m.user.name)}</span>
                <span class="t-caption c-muted">${m.notifications} notifications · ${m.events} events</span>
              </span>
              <span class="badge badge-outline">${ROLE_LABEL[m.user.role]}</span>
            </div>`,
          )
          .join('')}
      </div>
    </div>`;
  }

  function activityCard() {
    return `<div class="card stack gap-sm">
      <div class="between">
        <span class="t-upper">Recent activity</span>
        <span class="t-caption c-muted">From seeded responses</span>
      </div>
      <div class="stack">
        ${activity()
          .map(
            (a) => `<div class="list-row">
              ${N.avatar(a.userId, { size: 'sm' })}
              <span class="grow stack" style="gap:0">
                <span class="t-body-sm c-body">${a.text}</span>
                <span class="t-caption c-soft">${esc(userById(a.userId).name)} · ${esc(fmtRelative(a.at))}</span>
              </span>
            </div>`,
          )
          .join('')}
      </div>
    </div>`;
  }

  const DEFAULT_SELECTION = ['u_02', 'u_03'];

  function payloadFor(mode, ids) {
    if (mode === 'all') return `{\n  "mode": "all",\n  "teamId": "${N.TEAM.id}"\n}`;
    const body = ids.length ? `[\n${ids.map((id) => `    "${id}"`).join(',\n')}\n  ]` : '[]';
    return `{\n  "mode": "${mode}",\n  "userIds": ${body}\n}`;
  }

  function noteFor(mode, count) {
    if (mode === 'all') return `Resolves to ${N.TEAM.members} members when the notification is delivered.`;
    return `${count} ${count === 1 ? 'person' : 'people'} selected · ${N.TEAM.members} in ${N.TEAM.name}`;
  }

  function targetingCard() {
    return `<div class="card card-pad-xl stack gap-md">
      <div class="between wrap gap-sm">
        <div class="stack" style="gap:0">
          <span class="t-upper">Targeting preview</span>
          <strong class="t-title-md">The recipient picker every composer mounts</strong>
        </div>
        <span class="badge badge-outline">POST /notifications · recipients</span>
      </div>
      <p class="t-body-sm c-muted" style="max-width:640px">
        One person, several people, or the whole team. <strong class="c-ink">Whole team</strong> fans out server-side, so the payload
        only carries the team id.
      </p>
      <div class="grid grid-2" style="align-items:start">
        <div class="card card-soft">
          ${N.recipientPicker({ mode: 'multi', selected: DEFAULT_SELECTION })}
        </div>
        <div class="stack gap-xs">
          <span class="label">RecipientTarget payload</span>
          <pre class="card card-soft t-body-sm" style="margin:0;white-space:pre-wrap" data-slot="payload">${esc(
            payloadFor('multi', DEFAULT_SELECTION),
          )}</pre>
          <span class="t-caption c-muted" data-slot="payload-note">${esc(noteFor('multi', DEFAULT_SELECTION.length))}</span>
        </div>
      </div>
    </div>`;
  }

  function inviteModal() {
    if (!inviteOpen) return '';
    return `<div class="scrim" id="invite-modal">
      <div class="modal" style="max-width:480px">
        <div class="between gap-md">
          <span class="stack" style="gap:0">
            <span class="t-caption c-muted">POST /teams/${esc(N.TEAM.id)}/invitations</span>
            <strong class="t-title-md">Invite a member</strong>
          </span>
          <button type="button" class="icon-btn" data-invite-close aria-label="Close">${icon('x')}</button>
        </div>
        ${N.field('Email', N.input({ name: 'email', type: 'email', value: invite.email, placeholder: 'name@nexa.app', invalid: !!inviteError }), {
          error: inviteError,
          hint: 'They receive an invite link for this workspace.',
        })}
        ${N.field(
          'Role',
          N.select({ name: 'role', value: invite.role, options: ROLES.map((r) => ({ value: r.value, label: r.label })) }),
          { hint: ROLES.find((r) => r.value === invite.role)?.hint },
        )}
        <div class="row gap-sm" style="justify-content:flex-end">
          <button type="button" class="btn btn-secondary" data-invite-close>Cancel</button>
          <button type="button" class="btn btn-primary" data-invite-send>${icon('send', { size: 18 })} Send invite</button>
        </div>
      </div>
    </div>`;
  }

  function roleModal() {
    if (!roleTargetId) return '';
    const u = userById(roleTargetId);
    return `<div class="scrim" id="role-modal">
      <div class="modal" style="max-width:440px">
        <div class="between gap-md">
          <span class="stack" style="gap:0">
            <span class="t-caption c-muted">PATCH /teams/${esc(N.TEAM.id)}/members/${esc(u.id)}</span>
            <strong class="t-title-md">Change role for ${esc(u.name)}</strong>
          </span>
          <button type="button" class="icon-btn" data-role-close aria-label="Close">${icon('x')}</button>
        </div>
        ${N.field('Role', N.select({ name: 'role', value: u.role, options: ROLES.map((r) => ({ value: r.value, label: r.label })) }), {
          hint: ROLES.find((r) => r.value === u.role)?.hint,
        })}
        <div class="row gap-sm" style="justify-content:flex-end">
          <button type="button" class="btn btn-secondary" data-role-close>Cancel</button>
          <button type="button" class="btn btn-primary" data-role-save>Save role</button>
        </div>
      </div>
    </div>`;
  }

  // ── render ────────────────────────────────────────────────────────────────

  function render() {
    const admins = N.USERS.filter((u) => u.role === 'admin').length;
    const guests = N.USERS.filter((u) => u.role === 'guest').length;

    const body = `
      <section class="card card-soft card-pad-xl row between wrap gap-md">
        <div class="row gap-md">
          ${N.avatarStack(N.USERS.map((u) => u.id), { max: 6, size: 'lg' })}
          <div class="stack" style="gap:0">
            <strong class="t-title-lg">${esc(N.TEAM.name)}</strong>
            <span class="t-body-sm c-muted">${N.TEAM.members} members · ${admins} admins · ${guests} ${guests === 1 ? 'guest' : 'guests'} · workspace ${esc(
              N.TEAM.id,
            )}</span>
          </div>
        </div>
        <div class="row gap-lg">
          <div class="stat"><span class="stat-value t-num">${N.state.data.notifications.length}</span><span class="t-caption c-muted">notifications sent</span></div>
          <div class="stat"><span class="stat-value t-num">${N.state.data.events.length}</span><span class="t-caption c-muted">events run</span></div>
        </div>
      </section>

      <section class="grid" style="grid-template-columns:minmax(0,1fr) 340px;align-items:start">
        <div class="stack gap-md">
          <div class="between">
            <h2 class="t-title-lg">Members</h2>
            <span class="t-caption c-muted">Roles control who can create notifications, events, and countdowns</span>
          </div>
          ${memberTable()}
        </div>
        <div class="stack gap-lg">
          ${rolesCard()}
          ${targetedCard()}
        </div>
      </section>

      <section class="grid" style="grid-template-columns:minmax(0,1fr) 340px;align-items:start">
        ${targetingCard()}
        ${activityCard()}
      </section>`;

    N.$('[data-slot="shell"]').innerHTML =
      N.shellWeb({
        active: 'team.html',
        breadcrumb: 'Workspace',
        title: 'Team',
        subtitle: `${N.TEAM.name} · invite people, set their role, and see how targeting resolves.`,
        actions: `<button type="button" class="btn btn-primary" data-invite-open>${icon('plus', { size: 18 })} Invite member</button>
          <a class="btn btn-secondary" href="settings.html">Workspace settings</a>`,
        body,
      }) + inviteModal() + roleModal();

    // Target picker: mounted, wired, and mirrored into the payload preview.
    const picker = N.$('[data-recipient-picker]');
    if (picker) {
      N.wireRecipientPicker(picker);
      const paint = () => {
        const host = N.$('[data-slot="payload"]');
        const note = N.$('[data-slot="payload-note"]');
        const mode = picker.dataset.mode;
        const ids = N.$$('[data-picker-check]:checked, [data-picker-radio]:checked', picker).map((i) => i.value);
        if (host) host.textContent = payloadFor(mode, ids);
        if (note) note.textContent = noteFor(mode, ids.length);
      };
      picker.addEventListener('click', paint);
      picker.addEventListener('input', paint);
      paint();
    }

    N.$$('[data-invite-open]').forEach((btn) =>
      btn.addEventListener('click', () => {
        inviteOpen = true;
        inviteError = '';
        render();
      }),
    );

    const inv = N.$('#invite-modal');
    if (inv) {
      N.$$('[data-invite-close]', inv).forEach((btn) =>
        btn.addEventListener('click', () => {
          inviteOpen = false;
          render();
        }),
      );
      inv.addEventListener('click', (ev) => {
        if (ev.target === inv) {
          inviteOpen = false;
          render();
        }
      });
      inv.addEventListener('input', (ev) => {
        const name = ev.target.name;
        if (name && name in invite) invite[name] = ev.target.value;
      });
      // The role hint belongs to the select, so repaint when it changes.
      const roleSelect = N.$('[name="role"]', inv);
      if (roleSelect) {
        roleSelect.addEventListener('change', () => {
          invite.role = roleSelect.value;
          render();
        });
      }
      N.$('[data-invite-send]', inv).addEventListener('click', () => {
        const email = invite.email.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          inviteError = email ? 'That does not look like an email address.' : 'Enter the email address to invite.';
          render();
          return;
        }
        inviteOpen = false;
        inviteError = '';
        invite.email = '';
        render();
        N.toast(`Invitation sent to ${email} as ${ROLE_LABEL[invite.role].toLowerCase()}`);
      });
    }

    N.$$('[data-role-for]').forEach((btn) =>
      btn.addEventListener('click', () => {
        roleTargetId = btn.dataset.roleFor;
        render();
      }),
    );
    const rm = N.$('#role-modal');
    if (rm) {
      N.$$('[data-role-close]', rm).forEach((btn) =>
        btn.addEventListener('click', () => {
          roleTargetId = null;
          render();
        }),
      );
      rm.addEventListener('click', (ev) => {
        if (ev.target === rm) {
          roleTargetId = null;
          render();
        }
      });
      N.$('[data-role-save]', rm).addEventListener('click', () => {
        const u = userById(roleTargetId);
        const next = N.$('[name="role"]', rm).value;
        u.role = next;
        roleTargetId = null;
        render();
        N.toast(`Saved — ${u.name} is now ${ROLE_LABEL[next].toLowerCase()}`);
      });
    }

    N.$$('[data-remove]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        const u = userById(btn.dataset.remove);
        const ok = await N.confirmDialog(
          `Remove ${u.name}?`,
          `${u.name} loses access to ${N.TEAM.name}. Notifications and events that already targeted them keep their history.`,
          'Remove member',
        );
        if (!ok) return;
        const at = N.USERS.findIndex((x) => x.id === u.id);
        if (at < 0) return;
        N.USERS.splice(at, 1);
        N.TEAM.members = N.USERS.length;
        render();
        N.toast(`${u.name} removed from ${N.TEAM.name}`);
      }),
    );
  }

  N.page('team', () => {
    N.live(render);
    render();
  });
})();
