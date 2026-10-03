/* Account · Profile — mobile.
   Every number on this screen is derived from window.NEXA.state, so answering a
   notification or checking off a todo moves the stat row the next time the
   profile is opened. Settings controls are prototype-local (nothing is sent). */

(() => {
  const N = window.NEXA;
  const { $, $$, state, shellMobile } = N;

  /** Prototype-local settings — the real app stores these per account. */
  const settings = {
    push: true,
    email: true,
    digest: false,
    quiet: false,
    weekStart: 'Monday',
    holidayRegion: 'Vietnam',
    showOnCalendar: true,
  };

  const stats = () => ({
    answered: state.data.notifications.filter((n) => n.response.actionKey).length,
    attending: state.data.events.filter((e) => e.myStatus === 'attending').length,
    running: state.data.countdowns.filter((c) => !N.countdownRemaining(c.targetDate).isPast).length,
    todosDone: state.data.todos.reduce((n, s) => n + s.completed.length, 0),
  });

  /** Row shell: leading icon, label + hint, trailing control or chevron. */
  function row({ iconName, label, hint, control, chevron, href, action }) {
    const content = `
      <span class="empty-art" style="width:36px;height:36px;border-radius:var(--radius-md);background-color:var(--color-surface-card);flex:none;align-self:flex-start">${N.icon(
        iconName,
        { size: 20 },
      )}</span>
      <span class="grow stack" style="gap:0;min-width:0">
        <span class="t-body-sm c-ink" style="font-weight:500">${N.esc(label)}</span>
        ${hint ? `<span class="t-caption c-muted">${N.esc(hint)}</span>` : ''}
      </span>`;
    if (control) {
      return `<div class="row gap-sm" style="padding:var(--space-sm) 0;border-bottom:1px solid var(--color-hairline-soft);min-height:44px">
        ${content}${control}
      </div>`;
    }
    const tag = href ? 'a' : 'button';
    const attrs = href ? `href="${href}"` : `type="button" data-action="${action}"`;
    return `<${tag} class="row gap-sm" ${attrs} style="padding:var(--space-sm) 0;border-bottom:1px solid var(--color-hairline-soft);min-height:44px;text-decoration:none;width:100%;text-align:left">
      ${content}
      ${chevron ? N.icon('chevronRight', { size: 18, cls: 'c-soft' }) : ''}
    </${tag}>`;
  }

  function group(title, rows) {
    return `<section class="card stack" style="gap:0;padding:var(--space-sm) var(--space-md)">
      <div class="between" style="padding:var(--space-xs) 0">
        <span class="t-upper">${N.esc(title)}</span>
      </div>
      ${rows}
    </section>`;
  }

  function header() {
    return `<section class="card card-pad-xl stack gap-md">
      <div class="row gap-md wrap">
        ${N.avatar(N.ME, { size: 'xl' })}
        <div class="stack gap-xxs" style="min-width:0">
          <strong class="t-title-lg truncate">${N.esc(N.ME.name)}</strong>
          <span class="t-body-sm c-body">${N.esc(N.ME.jobTitle)}</span>
          <span class="t-caption truncate">${N.esc(N.ME.email)}</span>
        </div>
      </div>
      <div class="row gap-xs wrap">
        <span class="badge badge-ink">${N.esc(N.ME.role)}</span>
        <span class="badge badge-outline">${N.esc(N.ME.timezone ?? 'GMT+7')}</span>
      </div>
      <hr class="divider divider-soft" />
      <div class="row gap-sm" style="text-align:center">
        ${[
          { value: stats().answered, label: 'answered' },
          { value: stats().attending, label: 'attending' },
          { value: stats().running, label: 'timers' },
          { value: stats().todosDone, label: 'todos done' },
        ]
          .map(
            (s) => `<div class="stack grow" style="gap:0">
              <span class="t-display-sm t-num" style="font-size:var(--text-title-lg-size)">${s.value}</span>
              <span class="t-caption">${s.label}</span>
            </div>`,
          )
          .join('')}
      </div>
    </section>`;
  }

  function render() {
    const s = stats();
    const switchers = [
      ['push', 'Push notifications', 'RSVP and due-date alerts on this device'],
      ['email', 'Email notifications', `${N.esc(N.ME.email)}`],
      ['digest', 'Daily digest', 'One summary every morning at 08:00'],
      ['quiet', 'Quiet hours', 'Silence everything between 20:00 and 07:00'],
    ];

    $('[data-slot="shell"]').innerHTML = shellMobile({
      active: 'm-profile.html',
      title: 'Profile',
      actions: `<button class="icon-btn icon-btn-outline" data-open="account-sheet" aria-label="Account options">${N.icon('settings')}</button>`,
      body: `
        ${header()}

        ${group(
          'Notifications',
          switchers
            .map(([key, label, hint]) =>
              row({
                iconName: key === 'email' ? 'mail' : key === 'digest' ? 'sun' : key === 'quiet' ? 'moon' : 'bell',
                label,
                hint,
                control: N.switchControl('', { id: `set-${key}`, checked: settings[key] }).replace(
                  /^<div class="between gap-md">|<\/div>$/g,
                  '',
                ),
              }),
            )
            .join(''),
        )}

        ${group('Team', [
          row({
            iconName: 'users',
            label: N.TEAM.name,
            hint: `${N.TEAM.members} members · you are the ${N.ME.role}`,
            action: 'team',
            chevron: true,
          }),
          row({ iconName: 'user', label: 'Invite a teammate', hint: 'Send an email invitation', action: 'invite', chevron: true }),
        ])}

        ${group('Calendar', [
          N.field(
            'Week starts on',
            N.select({
              id: 'set-week-start',
              options: ['Monday', 'Sunday'],
              value: settings.weekStart,
            }),
          ),
          N.field(
            'Holiday region',
            N.select({
              id: 'set-holiday',
              options: ['Vietnam', 'Singapore', 'Japan', 'None'],
              value: settings.holidayRegion,
            }),
          ),
          row({
            iconName: 'calendar',
            label: 'Show notifications on calendar',
            hint: 'Due dates appear as pins on the month grid',
            control: N.switchControl('', { id: 'set-calendar', checked: settings.showOnCalendar }).replace(
              /^<div class="between gap-md">|<\/div>$/g,
              '',
            ),
          }),
        ])}

        ${group('Plan', [
          row({ iconName: 'timer', label: 'Countdowns', hint: `${s.running} running`, href: 'm-countdowns.html', chevron: true }),
          row({
            iconName: 'list',
            label: 'Todo templates',
            hint: `${state.data.templates.length} templates · ${s.todosDone} tasks completed`,
            href: 'm-todos.html',
            chevron: true,
          }),
          row({ iconName: 'calendar', label: 'Events', hint: `${s.attending} you are attending`, href: 'm-events.html', chevron: true }),
        ])}

        ${group('Appearance', [
          row({
            iconName: 'sun',
            label: 'Cream canvas',
            hint: 'Fixed by the design system — no dark mode in this prototype',
            control: `<span class="badge badge-outline">Locked</span>`,
          }),
        ])}

        <section class="card stack gap-sm" style="border-color:var(--color-hairline)">
          <span class="t-upper">Danger zone</span>
          <p class="t-body-sm c-muted">Signing out returns you to the sign-in screen. Nothing in this prototype is uploaded anywhere.</p>
          <button class="btn btn-secondary btn-block" data-action="signout">${N.icon('logout', { size: 16 })} Sign out</button>
        </section>

        ${group('Prototype', [
          row({ iconName: 'grid', label: 'All screens', hint: 'Every surface in the demo', href: 'index.html', chevron: true }),
          row({ iconName: 'sparkle', label: 'Design system', hint: 'Tokens, type scale, and components', href: 'styleguide.html', chevron: true }),
        ])}`,
    }) + `<div class="scrim sheet-host hidden" id="account-sheet">
        <div class="sheet">
          <span class="sheet-handle"></span>
          <div class="between">
            <strong class="t-title-md">Account</strong>
            <button class="icon-btn" data-close aria-label="Close">${N.icon('x')}</button>
          </div>
          <div class="row gap-sm">
            ${N.avatar(N.ME, { size: 'lg' })}
            <div class="stack" style="gap:0;min-width:0">
              <span class="t-title-sm truncate">${N.esc(N.ME.name)}</span>
              <span class="t-caption truncate">${N.esc(N.ME.email)}</span>
            </div>
          </div>
          <hr class="divider divider-soft" />
          <div class="stack gap-sm">
            <button class="btn btn-secondary btn-block" data-action="edit-profile">Edit profile</button>
            <button class="btn btn-secondary btn-block" data-action="switch-team">Switch team</button>
            <a class="btn btn-secondary btn-block" href="login.html">Sign out</a>
          </div>
        </div>
      </div>`;

    // Switches
    $$('#set-push, #set-email, #set-digest, #set-quiet, #set-calendar').forEach((input) =>
      input.addEventListener('change', () => {
        const key = {
          'set-push': 'push',
          'set-email': 'email',
          'set-digest': 'digest',
          'set-quiet': 'quiet',
          'set-calendar': 'showOnCalendar',
        }[input.id];
        settings[key] = input.checked;
        N.toast(`${input.checked ? 'On' : 'Off'} — ${key} preference saved`);
      }),
    );

    // Selects
    $('#set-week-start')?.addEventListener('change', (e) => {
      settings.weekStart = e.target.value;
      N.toast(`Week starts on ${e.target.value}`);
    });
    $('#set-holiday')?.addEventListener('change', (e) => {
      settings.holidayRegion = e.target.value;
      N.toast(`Holiday region: ${e.target.value}`);
    });

    // Toast-only actions plus the confirmed sign-out
    $$('[data-action]').forEach((el) =>
      el.addEventListener('click', async () => {
        const action = el.dataset.action;
        if (action === 'team') N.toast(`${N.TEAM.name} has ${N.TEAM.members} members`);
        else if (action === 'invite') N.toast('Invitations open in the web app');
        else if (action === 'edit-profile') N.toast('Profile editing lives in the web settings screen');
        else if (action === 'switch-team') N.toast('You are already in your only team');
        else if (action === 'signout') {
          const ok = await N.confirmDialog('Sign out of NEXA?', 'You can sign back in from the login screen at any time.', 'Sign out');
          if (ok) location.href = 'login.html';
        }
      }),
    );
  }

  N.page('m-profile', () => {
    N.live(render);
    render();
  });
})();
