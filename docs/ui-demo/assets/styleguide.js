/* Prototype reference — the design system, rendered from the live CSS variables
   so the documentation can never drift from tokens.css. */

(() => {
  const N = window.NEXA;

  /** Read a CSS custom property off :root. */
  const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  const COLOR_GROUPS = [
    {
      title: 'Primary & text',
      names: ['primary', 'primary-active', 'primary-disabled', 'ink', 'body-strong', 'body', 'muted', 'muted-soft'],
    },
    {
      title: 'Surfaces (cream throughout)',
      names: ['canvas', 'surface-soft', 'surface-card', 'surface-strong', 'surface-dark', 'surface-dark-elevated'],
    },
    {
      title: 'Brand — the six surfaces plus illustration accents',
      names: ['brand-pink', 'brand-teal', 'brand-lavender', 'brand-peach', 'brand-ochre', 'brand-mint', 'brand-coral'],
    },
    { title: 'Semantic', names: ['success', 'warning', 'error'] },
    { title: 'Hairlines & on-colour', names: ['hairline', 'hairline-soft', 'on-primary', 'on-dark', 'on-dark-soft'] },
  ];

  const TYPE_STEPS = [
    ['display-xl', '72px / 500 / -2.5px', 'Marketing hero only — the prototype uses display-lg at most.', 'The whole system, on screen'],
    ['display-lg', '56px / 500 / -2px', 'Page hero on the gallery and reference pages.', 'The whole NEXA system'],
    ['display-md', '40px / 500 / -1px', 'Section heads, auth page titles, countdown totals.', 'Welcome back'],
    ['display-sm', '32px / 500 / -0.5px', 'Feature card titles, CTA band heads, KPI numbers.', 'Answer the notification'],
    ['title-lg', '24px / 600', 'Page titles in the app shell, panel heads.', 'Notifications'],
    ['title-md', '18px / 600', 'Card titles, app bar titles, sheet headers.', 'Compose notification'],
    ['title-sm', '16px / 600', 'List item titles, notification titles.', 'Review Q3 design audit'],
    ['body-md', '16px / 400', 'Default running text and inputs.', 'Confirm once you have left comments on the three open questions.'],
    ['body-sm', '14px / 400', 'Dense UI text, table cells, helper copy.', 'Snoozed until Tomorrow · 09:00'],
    ['caption', '13px / 500', 'Badges, metadata, captions.', 'Mai Tran · 6h ago · Only you'],
    ['caption-uppercase', '12px / 600 / 1.5px', 'Section labels and eyebrows.', 'Due today'],
    ['button', '14px / 600', 'Every button label.', 'Confirm'],
    ['nav-link', '14px / 500', 'Sidebar, tab bar, pill tabs, segmented controls.', 'Calendar'],
  ];

  const RADII = [
    ['xs', '6px', 'Small badges, dropdown items, checkbox corners'],
    ['sm', '8px', 'Small buttons, chips, calendar day cells'],
    ['md', '12px', 'Buttons, text inputs, task rows, notification cards (inner)'],
    ['lg', '16px', 'Content cards, testimonial cards, event cards'],
    ['xl', '24px', 'Saturated feature cards, phone frames, sheets'],
    ['pill', '9999px', 'Pill tabs, badges, progress bars, segmented controls'],
  ];

  const SPACING = [
    ['xxs', '4px', 'Icon-to-label gaps'],
    ['xs', '8px', 'Inline clusters, button groups'],
    ['sm', '12px', 'Form rows, list padding'],
    ['md', '16px', 'Card padding (content), mobile screen gutters'],
    ['lg', '24px', 'Card padding, grid gaps, container gutters'],
    ['xl', '32px', 'Feature card padding, section gaps'],
    ['xxl', '48px', 'Page rhythm on mobile, doc hero'],
    ['section', '96px', 'Vertical rhythm between major editorial bands'],
  ];

  function swatches() {
    return COLOR_GROUPS.map(
      (group) => `<div class="stack gap-sm">
        <span class="t-upper">${group.title}</span>
        <div class="swatch-grid">
          ${group.names
            .map((name) => {
              const value = cssVar(`--color-${name}`);
              return `<div class="swatch">
                <div class="swatch-chip" style="background-color: var(--color-${name})"></div>
                <div class="swatch-body">
                  <span class="swatch-name">${name}</span>
                  <span class="swatch-value">${value}</span>
                </div>
              </div>`;
            })
            .join('')}
        </div>
      </div>`,
    ).join('');
  }

  function typeScale() {
    return TYPE_STEPS.map(
      ([token, spec, note, sample]) => `<div class="spec-row">
        <span class="spec-key">${token}</span>
        <span class="spec-demo"><span class="t-${token}">${sample}</span></span>
        <span class="spec-note">${spec}<br />${note}</span>
      </div>`,
    ).join('');
  }

  function scales() {
    return `<div class="grid grid-2" style="align-items:start">
      <div class="stack">
        <span class="t-upper">Border radius</span>
        ${RADII.map(
          ([token, value, note]) => `<div class="spec-row">
            <span class="spec-key">rounded.${token}</span>
            <span class="spec-demo row gap-sm">
              <span style="width:56px;height:40px;background-color:var(--color-surface-card);border:1px solid var(--color-hairline);border-radius:var(--radius-${token})"></span>
              <span class="t-body-sm c-muted">${value}</span>
            </span>
            <span class="spec-note">${note}</span>
          </div>`,
        ).join('')}
      </div>
      <div class="stack">
        <span class="t-upper">Spacing — base unit 4px</span>
        ${SPACING.map(
          ([token, value, note]) => `<div class="spec-row">
            <span class="spec-key">spacing.${token}</span>
            <span class="spec-demo row gap-sm">
              <span style="width:var(--space-${token});height:16px;background-color:var(--color-brand-teal);border-radius:var(--radius-xs)"></span>
              <span class="t-body-sm c-muted">${value}</span>
            </span>
            <span class="spec-note">${note}</span>
          </div>`,
        ).join('')}
      </div>
    </div>`;
  }

  function surfaces() {
    const cards = [
      ['feature-card-pink', 'Outbound / broadcasts'],
      ['feature-card-teal', 'Featured, enterprise, next-up'],
      ['feature-card-lavender', 'AI-assisted / templates'],
      ['feature-card-peach', 'Warm general surface'],
      ['feature-card-ochre', 'Community, milestones'],
      ['feature-card-cream', 'Low-emphasis feature'],
    ];
    return `<div class="grid grid-3">
      ${cards
        .map(
          ([cls, label]) => `<article class="feature-card ${cls}">
            <span class="t-upper" style="color:inherit;opacity:.7">${cls.replace('feature-card-', '')}</span>
            <strong class="t-title-md" style="color:inherit">${label}</strong>
            <p class="t-body-sm" style="color:inherit;opacity:.85">Never the same surface twice in a row. Text colour flips with the saturation.</p>
            <div class="frag"><div class="frag-row"><span>Product fragment</span><span>↗</span></div><div class="frag-bar" style="width:64%"></div></div>
          </article>`,
        )
        .join('')}
    </div>`;
  }

  function buttons() {
    return `<div class="stack gap-md">
      <div class="demo-block">
        <button class="btn btn-primary">Primary</button>
        <button class="btn btn-secondary">Secondary</button>
        <button class="btn btn-ghost">Ghost</button>
        <button class="btn btn-primary" disabled>Disabled</button>
        <button class="btn btn-primary btn-sm">Small primary</button>
        <button class="btn btn-secondary btn-lg">Large secondary</button>
        <a class="link-btn" href="#buttons">Text link button</a>
      </div>
      <div class="demo-block" style="background-color:var(--color-brand-teal)">
        <button class="btn btn-on-color">On-colour button</button>
        <span class="badge" style="background-color:var(--tint-on-dark);color:var(--color-on-dark)">Badge on saturated</span>
      </div>
      <div class="demo-block">
        <div class="segmented">
          <button class="is-active">Month</button><button>Week</button><button>Day</button>
        </div>
        <div class="pill-tabs">
          <span class="pill-tab is-active">All <span class="badge badge-outline">6</span></span>
          <span class="pill-tab">Needs you <span class="badge badge-outline">3</span></span>
        </div>
        <span class="range-chips"><span class="range-chip is-active">Deadline</span><span class="range-chip">Birthday</span></span>
      </div>
      <div class="demo-block">
        <span class="badge">Default</span>
        <span class="badge badge-outline">Outlined</span>
        <span class="badge badge-ink">Ink</span>
        <span class="badge badge-success">${N.icon('check', { size: 13 })} Confirmed</span>
        <span class="badge badge-warning">${N.icon('snooze', { size: 13 })} Snoozed</span>
        <span class="badge badge-error">High</span>
        <span class="badge badge-info">Team broadcast</span>
        <span class="count-badge">3</span>
      </div>
      <div class="demo-block">
        ${N.avatar(N.ME)}
        ${N.avatar(N.userById('u_02'), { size: 'sm' })}
        ${N.avatar(N.userById('u_03'), { size: 'lg' })}
        ${N.avatarStack(['u_01', 'u_02', 'u_03', 'u_04', 'u_05', 'u_06', 'u_07'], { max: 4 })}
      </div>
    </div>`;
  }

  function forms() {
    return `<div class="grid grid-2" style="align-items:start">
      <div class="stack gap-md">
        ${N.field('Title', N.input({ placeholder: 'Review Q3 design audit', value: 'Review Q3 design audit' }))}
        ${N.field('Search with icon', N.input({ icon: 'search', placeholder: 'Search teammates…' }))}
        ${N.field('Invalid state', N.input({ value: 'not-an-email', invalid: true }), { error: 'That does not look like an email address.' })}
        ${N.field('Select', N.select({ options: ['Confirm', 'Snooze', 'Dismiss'], value: 'Confirm' }))}
        ${N.field('Notes', N.textarea({ placeholder: 'Add context for the recipients…', rows: 3 }), { hint: 'Shown in the expanded notification detail.' })}
      </div>
      <div class="stack gap-md">
        <div class="card stack gap-md">
          ${N.check('Send me a push notification', { checked: true, hint: 'Delivered through the Expo push service.' })}
          ${N.check('Email me a daily digest', { checked: false, hint: 'One summary at 08:00 local time.' })}
          <hr class="divider divider-soft" />
          ${N.switchControl('Require confirmation for team-wide broadcasts', { checked: true, hint: 'Adds a review step before fan-out.' })}
          ${N.switchControl('Quiet hours', { checked: false, hint: 'Hold non-urgent notifications overnight.' })}
        </div>
        <div class="recipient-picker" data-recipient-picker data-mode="multi" id="sg-picker">
          <span class="t-upper">Recipient picker — F3</span>
          <div data-role="panel"></div>
        </div>
      </div>
    </div>`;
  }

  function dataDisplay() {
    return `<div class="grid grid-2" style="align-items:start">
      <div class="card card-pad-xl stack gap-md">
        <span class="t-upper">Statistics & progress</span>
        <span class="t-caption c-muted">Attendance split — RSVP only</span>
        ${N.statBar({ attending: 4, notAttending: 2, undecided: 1 }, 8)}
        <span class="t-caption c-muted" style="margin-top:var(--space-xs)">Completion — todos</span>
        ${N.progressTodo(2, 4)}
        <hr class="divider divider-soft" />
        <div class="row gap-xl wrap">
          <div class="stat"><span class="stat-value t-num">23</span><span class="t-caption c-muted">days to beta</span></div>
          <div class="stat"><span class="stat-value t-num">4</span><span class="t-caption c-muted">live timers</span></div>
          <div class="stat"><span class="stat-value t-num">92%</span><span class="t-caption c-muted">response rate</span></div>
        </div>
        <hr class="divider divider-soft" />
        <dl class="stack gap-xs">
          <div class="kv"><dt>Audience</dt><dd>All of Product Design</dd></div>
          <div class="kv"><dt>Actions</dt><dd>Confirm · Snooze · Dismiss</dd></div>
          <div class="kv"><dt>Due</dt><dd>Today · 17:30</dd></div>
        </dl>
      </div>
      <div class="card card-pad-xl stack gap-md">
        <span class="t-upper">Table</span>
        <table class="table">
          <thead><tr><th>Member</th><th>Role</th><th>Response</th></tr></thead>
          <tbody>
            ${['u_02', 'u_03', 'u_04', 'u_05']
              .map((id, i) => {
                const u = N.userById(id);
                const states = ['badge-success', 'badge-error', 'badge-warning'];
                const labels = ['Attending', 'Not attending', 'Undecided'];
                return `<tr>
                  <td><span class="row gap-xs">${N.avatar(u, { size: 'sm' })}<span class="c-ink">${N.esc(u.name)}</span></span></td>
                  <td>${u.role}</td>
                  <td><span class="badge ${states[i % 3]}">${labels[i % 3]}</span></td>
                </tr>`;
              })
              .join('')}
          </tbody>
        </table>
      </div>
    </div>`;
  }

  function states() {
    return `<div class="grid grid-3">
      <div class="stack gap-sm">
        <span class="t-upper">Empty state</span>
        ${N.emptyState('Inbox zero', 'Every notification has an answer. New ones appear here.', '<button class="btn btn-secondary btn-sm">Send a notification</button>')}
      </div>
      <div class="stack gap-sm">
        <span class="t-upper">Loading skeleton</span>
        <div class="card stack gap-sm">
          <div class="row gap-sm">
            <div class="skeleton" style="width:28px;height:28px;border-radius:var(--radius-pill)"></div>
            <div class="stack gap-xxs grow">
              <div class="skeleton" style="height:12px;width:70%"></div>
              <div class="skeleton" style="height:10px;width:45%"></div>
            </div>
          </div>
          <div class="skeleton" style="height:12px;width:100%"></div>
          <div class="skeleton" style="height:12px;width:88%"></div>
          <div class="row gap-xs">
            <div class="skeleton" style="height:32px;flex:1"></div>
            <div class="skeleton" style="height:32px;flex:1"></div>
          </div>
        </div>
      </div>
      <div class="stack gap-sm">
        <span class="t-upper">Overlays</span>
        <div class="card stack gap-sm">
          <button class="btn btn-secondary btn-sm" data-demo-toast>Show toast</button>
          <button class="btn btn-secondary btn-sm" data-demo-error>Show error toast</button>
          <button class="btn btn-secondary btn-sm" data-demo-confirm>Confirm dialog</button>
          <button class="btn btn-secondary btn-sm" data-demo-sheet>Bottom sheet</button>
          <p class="t-caption c-muted">Toasts stack bottom-right on web and above the tab bar on mobile.</p>
        </div>
      </div>
    </div>`;
  }

  function calendarDemo() {
    return `<div class="grid grid-2" style="align-items:start">
      <div class="card card-pad-xl stack gap-sm">
        <span class="t-upper">Month grid — F4</span>
        ${N.calendarMonth({ month: new Date(), selected: N.isoDay(0) })}
      </div>
      <div class="stack gap-md">
        <div class="card card-pad-xl stack gap-sm">
          <span class="t-upper">Entry types</span>
          ${Object.entries(N.CAL_TYPE_META)
            .map(
              ([key, meta]) => `<div class="row gap-sm">
                <span class="cal-dot" style="background-color:${meta.dot}"></span>
                <span class="t-body-sm c-ink" style="width:110px">${meta.label}</span>
                <span class="t-caption c-muted"><code>type: '${key}'</code></span>
              </div>`,
            )
            .join('')}
        </div>
        <div class="card card-pad-xl stack gap-sm">
          <span class="t-upper">Notification actions</span>
          ${N.notifCard(N.state.data.notifications[0], { detail: false })}
        </div>
      </div>
    </div>`;
  }

  function contracts() {
    const yes = [
      ['Cream canvas floor', 'Every page sits on --color-canvas. No cool greys, no dark sections.'], // token-audit-ignore
      ['Six saturated surfaces', 'Pink, teal, lavender, peach, ochre, cream. Cycle them; never repeat in a row.'],
      ['Display 500 with negative tracking', 'Headlines use the display stack at weight 500. Never bolder.'],
      ['Inter for everything else', 'Body, UI, buttons, and navigation stay on the sans stack.'],
      ['Generous radii', '12px buttons and inputs, 16px cards, 24px feature cards.'],
      ['Cream footer', 'The footer stays warm-light. There is no dark footer anywhere in the system.'],
      ['Depth from colour', 'Only a faint hover lift (--shadow-hover). No heavy drop shadows.'],
      ['44px touch targets', 'Every button and input is at least 44px tall on mobile.'],
    ];
    const no = [
      ['No seventh brand colour', 'Do not introduce a new saturated hue for a new feature.'],
      ['No display weight above 500', 'Bold display type reads as bombastic against the rounded face.'],
      ['No dark mode inversion', 'The cream-throughout palette is a contract, not a preference.'],
      ['No flat vector art where an illustration belongs', 'Hero and CTA bands use product fragments or crafted illustration, not clip art.'],
      ['No new type sizes', 'Extend the ramp in DESIGN.md and @nexa/design-tokens instead.'],
      ['No hardcoded hex or px', 'Reference the token so web and React Native stay in sync.'],
    ];
    const card = (list, kind) =>
      list
        .map(
          ([title, body]) => `<div class="contract contract-${kind}">
            ${N.icon(kind === 'yes' ? 'check' : 'x', { size: 18 })}
            <span class="stack" style="gap:2px">
              <strong class="t-title-sm">${title}</strong>
              <span class="t-caption c-muted">${body}</span>
            </span>
          </div>`,
        )
        .join('');
    return `<div class="stack gap-md">
      <span class="t-upper">Always</span>
      <div class="contract-list">${card(yes, 'yes')}</div>
      <span class="t-upper" style="margin-top:var(--space-md)">Never</span>
      <div class="contract-list">${card(no, 'no')}</div>
    </div>`;
  }

  function icons() {
    return `<div class="demo-block" style="gap:var(--space-md)">${ICON_NAMES.map(
      (name) => `<span class="stack center gap-xxs" style="width:64px">
        <span class="c-ink">${N.icon(name, { size: 20 })}</span>
        <span class="t-caption c-soft" style="font-size:var(--text-micro-size)">${name}</span>
      </span>`,
    ).join('')}</div>`;
  }

  function render() {
    N.$('[data-slot="shell"]').innerHTML = `
      <nav class="doc-nav">
        <a class="brand" href="index.html">
          <span class="brand-mark">N</span>
          <span class="brand-name">NEXA</span>
        </a>
        <div class="doc-nav-links">
          <a href="#colours">Colour</a>
          <a href="#type">Type</a>
          <a href="#scale">Scale</a>
          <a href="#components">Components</a>
          <a href="#contracts">Contracts</a>
          <a class="btn btn-primary btn-sm" href="dashboard.html">Open the app</a>
        </div>
      </nav>

      <div class="nx-container doc-hero">
        <span class="badge badge-outline">${N.icon('sparkle', { size: 13 })} DESIGN.md → CSS → every screen</span>
        <h1 class="t-display-lg" style="margin-top:var(--space-md)">The design system, as built</h1>
        <p class="t-body c-body">
          Everything below is rendered from the live custom properties in
          <code>assets/tokens.css</code>, which mirror <code>@nexa/design-tokens</code> and DESIGN.md.
          If a value changes in one place it changes here too — this page cannot drift.
        </p>
        <div class="doc-stats">
          <div class="doc-stat"><strong>${Object.keys(N.CAL_TYPE_META).length}</strong><span>calendar entry types</span></div>
          <div class="doc-stat"><strong>${COLOR_GROUPS.reduce((n, g) => n + g.names.length, 0)}</strong><span>colour tokens</span></div>
          <div class="doc-stat"><strong>${TYPE_STEPS.length}</strong><span>type steps</span></div>
          <div class="doc-stat"><strong>${ICON_NAMES.length}</strong><span>icons</span></div>
        </div>
      </div>

      <section class="doc-section" id="colours">
        <div class="nx-container">
          <header><h2>Colour</h2><p class="doc-note">Cream canvas, near-black ink, six saturated surfaces, and a small semantic set. Values shown are read from the DOM at runtime.</p></header>
          <div class="stack gap-lg">${swatches()}</div>
        </div>
      </section>

      <section class="doc-section" id="type">
        <div class="nx-container">
          <header><h2>Typography</h2><p class="doc-note">Plain Black at weight 500 handles display; Inter handles everything else. The prototype falls back to Inter 500 with negative tracking, which is the documented substitute.</p></header>
          <div class="stack">${typeScale()}</div>
        </div>
      </section>

      <section class="doc-section" id="scale">
        <div class="nx-container">
          <header><h2>Radius & spacing</h2><p class="doc-note">Base unit 4px. Section rhythm is 96px; cards take 16px of padding, feature cards 32px.</p></header>
          ${scales()}
        </div>
      </section>

      <section class="doc-section" id="surfaces">
        <div class="nx-container">
          <header><h2>Saturated surfaces</h2><p class="doc-note">The six feature-card fills, in the recommended cycle order. Pink and teal take white text; lavender, peach, and ochre take ink.</p></header>
          ${surfaces()}
        </div>
      </section>

      <section class="doc-section" id="components">
        <div class="nx-container">
          <header><h2>Components</h2><p class="doc-note">Buttons, badges, avatars, segmented controls, and tabs — every recipe is a class in <code>assets/components.css</code>.</p></header>
          <div class="stack gap-xl">
            ${buttons()}
            <div class="stack gap-md">
              <span class="t-upper">Forms</span>
              ${forms()}
            </div>
            <div class="stack gap-md">
              <span class="t-upper">Data display</span>
              ${dataDisplay()}
            </div>
            <div class="stack gap-md">
              <span class="t-upper">Feedback & empty states</span>
              ${states()}
            </div>
            <div class="stack gap-md">
              <span class="t-upper">Calendar & notification patterns</span>
              ${calendarDemo()}
            </div>
            <div class="stack gap-md">
              <span class="t-upper">Icons</span>
              ${icons()}
            </div>
          </div>
        </div>
      </section>

      <section class="doc-section" id="contracts">
        <div class="nx-container">
          <header><h2>System contracts</h2><p class="doc-note">The rules from DESIGN.md that the prototype is allowed to encode. Treat anything in the right-hand list as a review blocker.</p></header>
          ${contracts()}
        </div>
      </section>

      <footer style="background-color:var(--color-surface-soft);padding:var(--space-xxl) 0">
        <div class="nx-container between wrap gap-md">
          <span class="t-body-sm c-muted">Rendered from <code>assets/tokens.css</code> at runtime · NEXA UI/UX prototype</span>
          <a class="btn btn-secondary btn-sm" href="index.html">${N.icon('arrowLeft', { size: 14 })} All screens</a>
        </div>
      </footer>`;

    // Pickers + demo overlays
    const picker = N.$('#sg-picker');
    N.$('[data-role="panel"]', picker).innerHTML =
      '<div class="row gap-xs" style="align-items:center"></div>';
    picker.addEventListener('nexa-noop', () => {});
    // Re-render the picker with the shared renderer so the demo matches the app.
    picker.querySelector('[data-role="panel"]').innerHTML = `
      <div class="row gap-xs" style="align-items:center">
        ${N.input({ icon: 'search', placeholder: 'Search teammates…' })}
        <button class="link-btn" type="button" data-picker-all>Select all</button>
      </div>
      <div class="row gap-xs wrap" data-role="chips"></div>
      <div class="picker-list">${N.USERS.filter((u) => u.id !== N.ME.id)
        .map(
          (u) => `<label class="picker-row" data-member="${u.id}" data-name="${N.esc(u.name.toLowerCase())}">
            <input type="checkbox" data-picker-check value="${u.id}" />
            ${N.avatar(u, { size: 'sm' })}
            <span class="grow stack" style="gap:0">
              <span class="t-body-sm c-ink" style="font-weight:500">${N.esc(u.name)}</span>
              <span class="t-caption">${N.esc(u.jobTitle)}</span>
            </span>
            <span class="badge badge-outline">${u.role}</span>
          </label>`,
        )
        .join('')}</div>`;
    const modeInput = N.$('[data-role="mode-input"]', picker);
    if (modeInput) modeInput.value = 'multi';
    N.wireRecipientPicker(picker);

    N.$('[data-demo-toast]')?.addEventListener('click', () => N.toast('Confirmed — the sender is notified'));
    N.$('[data-demo-error]')?.addEventListener('click', () => N.toast('Could not reach the API — retrying', { tone: 'error' }));
    N.$('[data-demo-confirm]')?.addEventListener('click', async () => {
      const ok = await N.confirmDialog('Delete this template?', 'Applied schedules keep their task snapshots.', 'Delete template');
      N.toast(ok ? 'Template deleted' : 'Cancelled', { tone: ok ? 'success' : 'success' });
    });
    N.$('[data-demo-sheet]')?.addEventListener('click', () => {
      N.$('[data-slot="shell"]').insertAdjacentHTML(
        'beforeend',
        `<div class="scrim sheet-host" id="sg-sheet">
          <div class="sheet">
            <span class="sheet-handle"></span>
            <div class="between"><strong class="t-title-md">Bottom sheet</strong><button class="icon-btn" data-close>${N.icon('x')}</button></div>
            <p class="t-body-sm c-muted">Mobile creation flows and option pickers use this sheet: handle, title, content, primary action pinned at the bottom.</p>
            <button class="btn btn-primary btn-block" data-close>Got it</button>
          </div>
        </div>`,
      );
    });
  }

  N.page('styleguide', () => render());
})();
