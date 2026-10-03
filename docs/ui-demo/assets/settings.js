/* Account & workspace settings (web).
   PATCH /users/me        → the Profile panel writes NEXA.ME in memory
   PATCH /teams/:id       → the Workspace panel writes NEXA.TEAM
   DELETE /teams/:id/members/me and DELETE /teams/:id → the Danger zone
   Every control edits a local draft; the Save / Cancel bar appears only while the
   draft differs from the last saved snapshot (JSON comparison, no deep diffing). */

(() => {
  const N = window.NEXA;
  const { esc, icon } = N;

  const SECTIONS = [
    { value: 'profile', label: 'Profile', icon: 'user', hint: 'Your name, email, and job title' },
    { value: 'notifications', label: 'Notifications', icon: 'bell', hint: 'Delivery, digest, and quiet hours' },
    { value: 'calendar', label: 'Calendar', icon: 'calendar', hint: 'Week start, holidays, and pins' },
    { value: 'workspace', label: 'Workspace', icon: 'users', hint: 'Team name, timezone, and broadcasts' },
    { value: 'danger', label: 'Danger zone', icon: 'alert', hint: 'Leave or delete the workspace' },
  ];
  const ROLE_LABEL = { admin: 'Admin', user: 'Member', guest: 'Guest' };
  const TIMEZONES = ['GMT+7 · Ho Chi Minh City', 'GMT+8 · Singapore', 'GMT+9 · Tokyo', 'GMT+5:30 · Bengaluru', 'GMT+0 · London', 'GMT-5 · New York'];
  const REGIONS = ['Vietnam', 'Japan', 'Singapore', 'None'];
  // switchControl() forwards opts.id but not opts.name, so switches map to their
  // draft key by id (a name is still passed in case the kit starts forwarding it).
  const SWITCH_KEYS = {
    'sw-push': 'push',
    'sw-email': 'emailDigest',
    'sw-digest': 'dailyDigest',
    'sw-quiet': 'quietHours',
    'sw-pin': 'pinNotifications',
    'sw-broadcast': 'broadcastConfirm',
  };

  /** The saved snapshot the panels are compared against. */
  function snapshot() {
    return {
      name: N.ME.name,
      email: N.ME.email,
      jobTitle: N.ME.jobTitle,
      push: true,
      emailDigest: true,
      dailyDigest: false,
      quietHours: true,
      quietFrom: '18:30',
      quietTo: '08:00',
      confirmDefault: 'confirm',
      snoozeDefault: '1d',
      dismissDefault: 'read',
      weekStart: 'monday',
      holidayRegion: 'Vietnam',
      defaultView: 'month',
      pinNotifications: true,
      teamName: N.TEAM.name,
      timezone: N.ME.timezone ?? TIMEZONES[0],
      broadcastConfirm: true,
    };
  }

  let section = 'profile';
  let dirty = false;
  let draft = snapshot();
  const saved = snapshot();

  const isDirty = () =>
    Object.keys(saved).some((k) => String(saved[k]) !== String(draft[k]));

  function paintDirty() {
    dirty = isDirty();
    const bar = N.$('#save-bar');
    if (bar) bar.classList.toggle('hidden', !dirty);
  }

  function commit() {
    N.ME.name = draft.name.trim() || N.ME.name;
    N.ME.email = draft.email.trim();
    N.ME.jobTitle = draft.jobTitle.trim();
    N.ME.timezone = draft.timezone;
    N.TEAM.name = draft.teamName.trim() || N.TEAM.name;
    Object.keys(saved).forEach((k) => {
      saved[k] = draft[k];
    });
    dirty = false;
    render();
    N.toast('Settings saved');
  }

  function cancel() {
    draft = { ...saved };
    dirty = false;
    render();
    N.toast('Changes reverted');
  }

  // ── panels ────────────────────────────────────────────────────────────────

  function panelHead(title, body) {
    return `<div class="stack" style="gap:0">
      <h2 class="t-title-md">${esc(title)}</h2>
      <p class="t-body-sm c-muted">${esc(body)}</p>
    </div>`;
  }

  function profilePanel() {
    return `<div class="card card-pad-xl stack gap-lg">
      ${panelHead('Profile', 'How you appear in notifications, events, and the roster.')}
      <div class="row gap-lg wrap">
        ${N.avatar(N.ME, { size: 'xl' })}
        <div class="stack gap-xs grow">
          <span class="t-title-sm">${esc(draft.name || N.ME.name)}</span>
          <span class="t-body-sm c-muted">${esc(draft.email || N.ME.email)} · ${esc(ROLE_LABEL[N.ME.role])}</span>
          <span class="row gap-sm">
            <button type="button" class="btn btn-secondary btn-sm" data-photo>Change photo</button>
            <span class="t-caption c-soft">PNG or JPG, at least 256 × 256</span>
          </span>
        </div>
      </div>
      <div class="grid grid-2" style="gap:var(--space-md)">
        ${N.field('Full name', N.input({ name: 'name', value: draft.name }))}
        ${N.field('Email', N.input({ name: 'email', type: 'email', value: draft.email }), { hint: 'Used for the daily digest.' })}
      </div>
      <div class="grid grid-2" style="gap:var(--space-md)">
        ${N.field('Job title', N.input({ name: 'jobTitle', value: draft.jobTitle }), { hint: 'Shown on your avatar in the roster.' })}
        ${N.field('Timezone', N.select({ name: 'timezone', value: draft.timezone, options: TIMEZONES }), {
          hint: 'Deadlines and reminders follow this clock.',
        })}
      </div>
      <hr class="divider" />
      <div class="stack gap-xs">
        <span class="t-upper">Account</span>
        <dl class="stack gap-xs">
          <div class="kv"><dt>Workspace</dt><dd>${esc(N.TEAM.name)}</dd></div>
          <div class="kv"><dt>Workspace id</dt><dd>${esc(N.TEAM.id)}</dd></div>
          <div class="kv"><dt>Your role</dt><dd>${esc(ROLE_LABEL[N.ME.role])}</dd></div>
          <div class="kv"><dt>Members</dt><dd>${N.TEAM.members}</dd></div>
          <div class="kv"><dt>Signed in as</dt><dd>${esc(draft.email || N.ME.email)}</dd></div>
        </dl>
        <div class="row gap-sm">
          <button type="button" class="btn btn-secondary btn-sm" data-signout>${icon('logout', { size: 16 })} Sign out</button>
          <a class="link-btn t-caption" href="team.html">See who else is here ${icon('arrowRight', { size: 13 })}</a>
        </div>
      </div>
    </div>`;
  }

  function notificationsPanel() {
    return `<div class="card card-pad-xl stack gap-lg">
      ${panelHead('Notifications', 'Choose how NEXA reaches you, and what each action does by default.')}
      <div class="stack gap-md">
        ${N.switchControl('Push notifications', { id: 'sw-push', name: 'push', checked: draft.push, hint: 'Instant alerts on your devices.' })}
        <hr class="divider divider-soft" />
        ${N.switchControl('Email copy', { id: 'sw-email', name: 'emailDigest', checked: draft.emailDigest, hint: 'A copy of every notification that needs you.' })}
        <hr class="divider divider-soft" />
        ${N.switchControl('Daily digest at 08:00', { id: 'sw-digest', name: 'dailyDigest', checked: draft.dailyDigest, hint: 'One summary instead of individual emails.' })}
        <hr class="divider divider-soft" />
        ${N.switchControl('Quiet hours', { id: 'sw-quiet', name: 'quietHours', checked: draft.quietHours, hint: 'Hold non-urgent alerts until the morning.' })}
      </div>
      <div class="grid grid-2" style="gap:var(--space-md)">
        ${N.field('Quiet hours start', N.input({ name: 'quietFrom', type: 'time', value: draft.quietFrom }))}
        ${N.field('Quiet hours end', N.input({ name: 'quietTo', type: 'time', value: draft.quietTo }))}
      </div>
      <hr class="divider" />
      <div class="stack gap-xs">
        <span class="t-upper">Default action responses</span>
        <div class="grid grid-3" style="gap:var(--space-md)">
          ${N.field(
            'Confirm',
            N.select({
              name: 'confirmDefault',
              value: draft.confirmDefault,
              options: [
                { value: 'confirm', label: 'Confirm and mark read' },
                { value: 'confirm_note', label: 'Confirm with a note' },
              ],
            }),
          )}
          ${N.field(
            'Snooze',
            N.select({
              name: 'snoozeDefault',
              value: draft.snoozeDefault,
              options: [
                { value: '1h', label: '1 hour' },
                { value: '1d', label: 'Tomorrow 09:00' },
                { value: '1w', label: 'Next week' },
              ],
            }),
          )}
          ${N.field(
            'Dismiss',
            N.select({
              name: 'dismissDefault',
              value: draft.dismissDefault,
              options: [
                { value: 'read', label: 'Mark read silently' },
                { value: 'archive', label: 'Dismiss and archive' },
              ],
            }),
          )}
        </div>
      </div>
    </div>`;
  }

  function calendarPanel() {
    return `<div class="card card-pad-xl stack gap-lg">
      ${panelHead('Calendar', 'Defaults for the month, week, and day views.')}
      <div class="grid grid-3" style="gap:var(--space-md)">
        ${N.field(
          'Week starts on',
          N.select({
            name: 'weekStart',
            value: draft.weekStart,
            options: [
              { value: 'monday', label: 'Monday' },
              { value: 'sunday', label: 'Sunday' },
            ],
          }),
        )}
        ${N.field('Holiday region', N.select({ name: 'holidayRegion', value: draft.holidayRegion, options: REGIONS }), {
          hint: 'Feeds the holiday strip.',
        })}
        ${N.field(
          'Default view',
          N.select({
            name: 'defaultView',
            value: draft.defaultView,
            options: [
              { value: 'month', label: 'Month' },
              { value: 'week', label: 'Week' },
              { value: 'day', label: 'Day' },
            ],
          }),
        )}
      </div>
      ${N.switchControl('Pin notifications to the calendar', {
        id: 'sw-pin',
        name: 'pinNotifications',
        checked: draft.pinNotifications,
        hint: 'A notification with a due date also appears as a calendar pin.',
      })}
      <hr class="divider" />
      <div class="stack gap-xs">
        <span class="t-upper">Colour legend</span>
        <div class="row wrap gap-lg">
          ${Object.keys(N.CAL_TYPE_META)
            .map(
              (k) => `<span class="row gap-xs t-body-sm c-body">
                <span class="cal-dot" style="background-color:${N.CAL_TYPE_META[k].dot}"></span>${esc(N.CAL_TYPE_META[k].label)}
              </span>`,
            )
            .join('')}
        </div>
        <span class="t-caption c-muted">Entry types are colour-coded everywhere: the month dots, the agenda rail, and the day timeline.</span>
      </div>
    </div>`;
  }

  function workspacePanel() {
    return `<div class="card card-pad-xl stack gap-lg">
      ${panelHead('Workspace', 'Shared settings for everyone in the team.')}
      <div class="grid grid-2" style="gap:var(--space-md)">
        ${N.field('Team name', N.input({ name: 'teamName', value: draft.teamName }), { hint: `Workspace id ${N.TEAM.id}` })}
        ${N.field('Timezone', N.select({ name: 'timezone', value: draft.timezone, options: TIMEZONES }), {
          hint: 'Drives schedule dates for the whole team.',
        })}
      </div>
      ${N.switchControl('Require confirmation for team-wide broadcasts', {
        id: 'sw-broadcast',
        name: 'broadcastConfirm',
        checked: draft.broadcastConfirm,
        hint: 'Anyone sending to the whole team confirms the fan-out first.',
      })}
      <hr class="divider" />
      <div class="stack gap-xs">
        <div class="between">
          <span class="t-upper">Members</span>
          <a class="link-btn t-caption" href="team.html">Manage roster ${icon('arrowRight', { size: 13 })}</a>
        </div>
        <div class="stack">
          ${N.USERS.slice(0, 5)
            .map(
              (u) => `<div class="list-row">
                ${N.avatar(u, { size: 'sm' })}
                <span class="grow stack" style="gap:0">
                  <span class="t-body-sm c-ink" style="font-weight:500">${esc(u.name)}</span>
                  <span class="t-caption c-muted">${esc(u.email)}</span>
                </span>
                <span class="badge badge-outline">${esc(ROLE_LABEL[u.role])}</span>
              </div>`,
            )
            .join('')}
        </div>
        ${
          N.USERS.length > 5
            ? `<span class="t-caption c-muted">+ ${N.USERS.length - 5} more members in ${esc(N.TEAM.name)}</span>`
            : ''
        }
      </div>
    </div>`;
  }

  function dangerPanel() {
    return `<div class="card card-pad-xl stack gap-lg">
      ${panelHead('Danger zone', 'These actions change access for you or for the whole team.')}
      <div class="stack gap-md">
        <div class="between wrap gap-md">
          <span class="stack" style="gap:0">
            <strong class="t-title-sm">Leave team</strong>
            <span class="t-body-sm c-muted">You lose access to ${esc(N.TEAM.name)}. Existing responses stay on record.</span>
          </span>
          <button type="button" class="btn btn-secondary" data-leave style="color:var(--color-error)">Leave team</button>
        </div>
        <hr class="divider divider-soft" />
        <div class="between wrap gap-md">
          <span class="stack" style="gap:0">
            <strong class="t-title-sm">Delete workspace</strong>
            <span class="t-body-sm c-muted">Removes every notification, event, countdown, and todo template for all ${N.TEAM.members} members.</span>
          </span>
          <button type="button" class="btn btn-secondary" data-delete style="color:var(--color-error)">Delete workspace</button>
        </div>
      </div>
      <div class="card card-soft row gap-sm">
        ${icon('lock', { size: 18, cls: 'c-muted' })}
        <span class="t-body-sm c-muted grow">Deleting a workspace is permanent. Export the roster before you confirm.</span>
        <button type="button" class="link-btn t-caption" data-export>Export roster</button>
      </div>
    </div>`;
  }

  const PANELS = {
    profile: profilePanel,
    notifications: notificationsPanel,
    calendar: calendarPanel,
    workspace: workspacePanel,
    danger: dangerPanel,
  };

  // ── render ────────────────────────────────────────────────────────────────

  function render() {
    const body = `
      <section class="grid" style="grid-template-columns:248px minmax(0,1fr);align-items:start">
        <nav class="stack gap-xxs" aria-label="Settings sections">
          ${SECTIONS.map(
            (s) => `<button type="button" class="nav-item ${section === s.value ? 'is-active' : ''}" data-section="${s.value}" ${
              section === s.value ? 'aria-current="true"' : ''
            }>
              ${icon(s.icon, { size: 18 })}
              <span class="grow" style="text-align:left">${esc(s.label)}</span>
            </button>`,
          ).join('')}
          <div class="card card-soft stack gap-xxs" style="padding:var(--space-md)">
            <span class="t-caption c-ink" style="font-weight:600">${esc(SECTIONS.find((s) => s.value === section).label)}</span>
            <span class="t-caption c-muted">${esc(SECTIONS.find((s) => s.value === section).hint)}</span>
          </div>
        </nav>

        <div class="stack gap-lg">
          ${PANELS[section]()}
          <div class="card card-pad-xl row between wrap gap-md ${dirty ? '' : 'hidden'}" id="save-bar">
            <span class="stack" style="gap:0">
              <strong class="t-title-sm">Unsaved changes</strong>
              <span class="t-body-sm c-muted">Save to apply them, or cancel to go back to the stored settings.</span>
            </span>
            <span class="row gap-sm">
              <button type="button" class="btn btn-secondary" data-cancel>Cancel</button>
              <button type="button" class="btn btn-primary" data-save>Save changes</button>
            </span>
          </div>
        </div>
      </section>`;

    N.$('[data-slot="shell"]').innerHTML = N.shellWeb({
      active: 'settings.html',
      breadcrumb: 'Workspace',
      title: 'Settings',
      subtitle: `${N.ME.name} · ${N.TEAM.name} · account, notification, and workspace preferences.`,
      actions: `<a class="btn btn-secondary" href="team.html">Open team roster</a>`,
      body,
    });

    N.$$('[data-section]').forEach((btn) =>
      btn.addEventListener('click', () => {
        section = btn.dataset.section;
        render();
      }),
    );

    const main = N.$('.page');

    // Text inputs, selects, time inputs, and switches all edit the draft.
    main.addEventListener('input', (ev) => {
      const el = ev.target;
      const key = el.name || SWITCH_KEYS[el.id];
      if (!key || !(key in draft)) return;
      draft[key] = el.type === 'checkbox' ? el.checked : el.value;
      paintDirty();
    });
    main.addEventListener('change', (ev) => {
      const el = ev.target;
      const key = el.name || SWITCH_KEYS[el.id];
      if (el.type !== 'checkbox' || !key || !(key in draft)) return;
      draft[key] = el.checked;
      paintDirty();
    });

    const cancelBtn = N.$('[data-cancel]');
    if (cancelBtn) cancelBtn.addEventListener('click', cancel);
    const saveBtn = N.$('[data-save]');
    if (saveBtn) saveBtn.addEventListener('click', commit);

    const photo = N.$('[data-photo]');
    if (photo) photo.addEventListener('click', () => N.toast('Photo updated'));

    const signOut = N.$('[data-signout]');
    if (signOut) signOut.addEventListener('click', () => N.toast('Signed out — the prototype keeps you on this screen'));

    const exportBtn = N.$('[data-export]');
    if (exportBtn) exportBtn.addEventListener('click', () => N.toast(`Roster exported for ${N.TEAM.name}`));

    const leave = N.$('[data-leave]');
    if (leave) {
      leave.addEventListener('click', async () => {
        const ok = await N.confirmDialog(
          `Leave ${N.TEAM.name}?`,
          'You will stop receiving notifications and events from this team. An admin can invite you back.',
          'Leave team',
        );
        if (ok) N.toast('You left the team — the prototype keeps the demo data');
      });
    }

    const del = N.$('[data-delete]');
    if (del) {
      del.addEventListener('click', async () => {
        const ok = await N.confirmDialog(
          `Delete ${N.TEAM.name}?`,
          `This removes ${N.state.data.notifications.length} notifications, ${N.state.data.events.length} events, and ${N.state.data.countdowns.length} countdowns for all ${N.TEAM.members} members. This cannot be undone.`,
          'Delete workspace',
        );
        if (ok) N.toast('Workspace deletion needs a second admin to confirm', { tone: 'error' });
      });
    }
  }

  N.page('settings', () => {
    N.live(render);
    render();
  });
})();
