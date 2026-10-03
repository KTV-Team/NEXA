/* Auth screens — sign in, sign up, reset, verification.
   Client-side validation only: the prototype demonstrates states and flow, not
   the real POST /auth/login. Every screen mounts into the same auth shell. */

(() => {
  const N = window.NEXA;

  // ── Shared pieces ─────────────────────────────────────────────────────────

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function brand() {
    return `<a class="auth-brand" href="login.html">
      <span class="brand-mark">N</span>
      <span class="brand-name">NEXA</span>
    </a>`;
  }

  function note(message, tone = 'info') {
    const cls = tone === 'error' ? 'auth-note-error' : tone === 'success' ? 'auth-note-success' : '';
    const name = tone === 'error' ? 'alert' : tone === 'success' ? 'checkCircle' : 'info';
    return `<div class="auth-note ${cls}">${N.icon(name, { size: 18 })}<span>${message}</span></div>`;
  }

  /**
   * The right-hand illustration card: one saturated surface, a headline, a
   * supporting line, and a product fragment at the bottom.
   * @param {{variant:'teal'|'lavender'|'ochre'|'peach', eyebrow:string, title:string, body:string, frag?:string, points?:string[]}} o
   */
  function art(o) {
    return `<aside class="auth-art auth-art-${o.variant}">
      <span class="t-upper" style="color:inherit;opacity:.7">${o.eyebrow}</span>
      <h2 class="t-display-sm" style="color:inherit">${o.title}</h2>
      <p class="t-body" style="color:inherit;opacity:.85">${o.body}</p>
      ${
        o.points
          ? `<div class="auth-list">${o.points
              .map((p) => `<span class="auth-list-item">${N.icon('check', { size: 18 })}<span>${p}</span></span>`)
              .join('')}</div>`
          : ''
      }
      ${o.frag ?? ''}
    </aside>`;
  }

  /** Product fragment used inside the illustration cards. */
  function artFragment() {
    return `<div class="frag" style="margin-top:0">
      <div class="frag-row"><span>Standup notes sign-off</span><span>Confirmed</span></div>
      <div class="frag-bar" style="width:72%"></div>
      <div class="frag-row" style="opacity:.75"><span>2 of 3 answered</span><span>Just now</span></div>
    </div>`;
  }

  function shell(panel, artCard) {
    return `<div class="auth-shell">
      <div class="auth-panel">${panel}</div>
      ${artCard ?? ''}
    </div>`;
  }

  /** Wire "show password" toggles and simple field validation on an auth form. */
  function wireAuthForm(root, rules, onSubmit) {
    const form = N.$('form', root);
    const submit = N.$('[data-submit]', root);

    const values = () => Object.fromEntries(new FormData(form).entries());

    function validateField(name) {
      const rule = rules[name];
      if (!rule) return true;
      const value = (values()[name] ?? '').toString();
      const message = rule(value, values());
      const errorSlot = N.$(`[data-error="${name}"]`, form);
      const input = form.elements[name];
      if (errorSlot) errorSlot.textContent = message ?? '';
      if (input) {
        if (message) input.setAttribute('aria-invalid', 'true');
        else input.removeAttribute('aria-invalid');
      }
      return !message;
    }

    function validateAll() {
      const names = Object.keys(rules);
      return names.map(validateField).every(Boolean);
    }

    function paintSubmit() {
      if (!submit) return;
      const ready = validateAllSilent();
      submit.disabled = !ready;
    }

    /** Validation without painting errors, used for the disabled state. */
    function validateAllSilent() {
      return Object.keys(rules).every((name) => !rules[name]((values()[name] ?? '').toString(), values()));
    }

    form.addEventListener('input', (e) => {
      const name = e.target.name;
      if (name && rules[name]) {
        // Only clear/set the error once the user has typed something.
        if (String(e.target.value).length > 0 && !N.$(`[data-error="${name}"]`, form).textContent) validateField(name);
        else if (N.$(`[data-error="${name}"]`, form).textContent) validateField(name);
      }
      paintSubmit();
      if (onSubmit?.onInput) onSubmit.onInput(e, values());
    });

    form.addEventListener('blur', (e) => {
      if (e.target.name && rules[e.target.name]) validateField(e.target.name);
    }, true);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validateAll()) {
        const first = N.$('[aria-invalid="true"]', form);
        first?.focus();
        return;
      }
      onSubmit?.submit(values(), form);
    });

    N.$$('[data-toggle-password]', root).forEach((btn) =>
      btn.addEventListener('click', () => {
        const input = N.$(`#${btn.dataset.togglePassword}`, root);
        if (!input) return;
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        btn.innerHTML = N.icon(show ? 'eye' : 'lock', { size: 18 });
        btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      }),
    );

    paintSubmit();
    return { validateAll, values, paintSubmit };
  }

  /** Password field with a show/hide toggle. */
  function passwordField(label, opts = {}) {
    const id = opts.id ?? 'password';
    return `<div class="field">
      <div class="between">
        <label class="label" for="${id}">${label}</label>
        ${opts.aside ?? ''}
      </div>
      <span class="input-group">
        ${N.icon('lock', { size: 18 })}
        <input class="input" id="${id}" name="${opts.name ?? id}" type="password" autocomplete="${
          opts.autocomplete ?? 'current-password'
        }" placeholder="${opts.placeholder ?? '••••••••'}" value="${N.esc(opts.value ?? '')}" />
        <button type="button" class="icon-btn icon-btn-sm" data-toggle-password="${id}" aria-label="Show password" style="margin-right:4px">${N.icon(
          'eye',
          { size: 18 },
        )}</button>
      </span>
      <span class="error-text" data-error="${opts.name ?? id}"></span>
      ${opts.hint ? `<span class="hint">${opts.hint}</span>` : ''}
    </div>`;
  }

  function emailField(opts = {}) {
    const name = opts.name ?? 'email';
    return `<div class="field">
      <label class="label" for="${name}">${opts.label ?? 'Work email'}</label>
      <span class="input-group">
        ${N.icon('mail', { size: 18 })}
        <input class="input" id="${name}" name="${name}" type="email" autocomplete="${opts.autocomplete ?? 'email'}" placeholder="you@nexa.app" value="${N.esc(
          opts.value ?? '',
        )}" />
      </span>
      <span class="error-text" data-error="${name}"></span>
    </div>`;
  }

  // ── Sign in ───────────────────────────────────────────────────────────────

  N.page('login', () => {
    const panel = `
      ${brand()}
      <div class="auth-head">
        <h1 class="t-display-md">Welcome back</h1>
        <p class="t-body c-muted">Sign in to answer notifications, RSVP to events, and pick up your todo list.</p>
      </div>
      <div class="auth-card">
        <form class="auth-form" novalidate>
          ${emailField({ value: 'alex.nguyen@nexa.app' })}
          ${passwordField('Password', {
            value: 'nexa-demo-2024',
            hint: 'Prototype: any 8+ character password signs in.',
            aside: `<a class="link-btn t-caption" href="forgot-password.html">Forgot password?</a>`,
          })}
          <div class="auth-row">
            ${N.check('Keep me signed in on this device', { checked: true })}
          </div>
          <div data-slot="form-note"></div>
          <button class="btn btn-primary btn-lg btn-block" type="submit" data-submit>${N.icon('arrowRight', {
            size: 16,
          })} Sign in</button>
        </form>

        <div class="auth-divider">or continue with</div>
        <div class="auth-alt">
          <button class="btn btn-secondary btn-block" data-sso="Google">${N.icon('globe', { size: 16 })} Google Workspace</button>
          <button class="btn btn-secondary btn-block" data-sso="SSO">${N.icon('lock', { size: 16 })} Company SSO</button>
        </div>

        <p class="auth-foot">New to NEXA? <a href="register.html">Create your team account</a></p>
      </div>`;

    const artCard = art({
      variant: 'teal',
      eyebrow: 'Interactive notifications',
      title: 'Answer the notification, not the app.',
      body: 'Confirm, snooze, or dismiss straight from the card. The sender sees the response instantly — no thread to open, no meeting to book.',
      points: ['Attendance statistics update live', 'Snoozed items return on schedule'],
      frag: artFragment(),
    });

    N.$('[data-slot="shell"]').innerHTML = shell(panel, artCard);

    const root = N.$('.auth-panel');
    wireAuthForm(
      root,
      {
        email: (v) => (!v.trim() ? 'Enter your work email.' : !EMAIL_RE.test(v) ? 'That does not look like an email address.' : null),
        password: (v) => (!v ? 'Enter your password.' : v.length < 8 ? 'Passwords are at least 8 characters.' : null),
      },
      {
        submit: (values) => {
          N.$('[data-slot="form-note"]').innerHTML = note(
            `Signing in as <strong>${N.esc(values.email)}</strong>…`,
            'success',
          );
          setTimeout(() => {
            location.href = 'm-notifications.html';
          }, 700);
        },
      },
    );

    // Demo shortcut: a wrong password shows the error state.
    N.$$('[data-sso]').forEach((btn) =>
      btn.addEventListener('click', () => N.toast(`${btn.dataset.sso} sign-in is stubbed in the prototype`)),
    );
  });

  // ── Sign up ───────────────────────────────────────────────────────────────

  N.page('register', () => {
    function score(v) {
      let s = 0;
      if (v.length >= 8) s++;
      if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++;
      if (/\d/.test(v)) s++;
      if (/[^A-Za-z0-9]/.test(v)) s++;
      return Math.min(s, 4);
    }

    const panel = `
      ${brand()}
      <div class="auth-head">
        <h1 class="t-display-md">Create your workspace</h1>
        <p class="t-body c-muted">Set up the team, invite people later, and start with the notification and calendar features.</p>
      </div>
      <div class="auth-card">
        <form class="auth-form" novalidate>
          <div class="row gap-sm wrap" style="align-items:flex-start">
            <div class="grow" style="min-width:200px">
              <div class="field">
                <label class="label" for="fullName">Full name</label>
                <span class="input-group">${N.icon('user', { size: 18 })}<input class="input" id="fullName" name="fullName" autocomplete="name" placeholder="Alex Nguyen" /></span>
                <span class="error-text" data-error="fullName"></span>
              </div>
            </div>
            <div class="grow" style="min-width:200px">
              <div class="field">
                <label class="label" for="teamName">Team name</label>
                <span class="input-group">${N.icon('users', { size: 18 })}<input class="input" id="teamName" name="teamName" placeholder="Product Design" /></span>
                <span class="error-text" data-error="teamName"></span>
              </div>
            </div>
          </div>
          ${emailField()}
          ${passwordField('Password', {
            autocomplete: 'new-password',
            hint: 'At least 8 characters with a number and an uppercase letter.',
          })}
          <div class="strength" data-slot="strength" data-score="0"><span></span><span></span><span></span><span></span></div>
          ${passwordField('Confirm password', { id: 'confirm', name: 'confirm', autocomplete: 'new-password', placeholder: 'Repeat it' })}
          ${N.check('I agree to the acceptable-use policy for team broadcasts', { checked: false, id: 'terms' })}
          <span class="error-text" data-error="terms"></span>
          <div data-slot="form-note"></div>
          <button class="btn btn-primary btn-lg btn-block" type="submit" data-submit>Create account</button>
        </form>
        <p class="auth-foot">Already have an account? <a href="login.html">Sign in</a></p>
        <p class="auth-foot t-caption c-soft">Next step: verify your email with a 6-digit code.</p>
      </div>`;

    const artCard = art({
      variant: 'lavender',
      eyebrow: 'Todo-based scheduling',
      title: 'Monday always looks the same. Build it once.',
      body: 'Save a task list as a template, attach it to a day of the week, and apply it to any date range. Every instance stays checkable.',
      points: ['Reusable templates with drag-to-reorder', 'Applied schedules land on the calendar'],
    });

    N.$('[data-slot="shell"]').innerHTML = shell(panel, artCard);

    const root = N.$('.auth-panel');
    const strength = N.$('[data-slot="strength"]', root);

    wireAuthForm(
      root,
      {
        fullName: (v) => (!v.trim() ? 'Enter your full name.' : v.trim().length < 2 ? 'That seems too short.' : null),
        teamName: (v) => (!v.trim() ? 'Name the team people will see.' : null),
        email: (v) => (!v.trim() ? 'Enter your work email.' : !EMAIL_RE.test(v) ? 'That does not look like an email address.' : null),
        password: (v) =>
          !v
            ? 'Choose a password.'
            : v.length < 8
              ? 'At least 8 characters.'
              : !/[A-Z]/.test(v) || !/[a-z]/.test(v) || !/\d/.test(v)
                ? 'Mix uppercase, lowercase, and a number.'
                : null,
        confirm: (v, all) => (!v ? 'Repeat your password.' : v !== all.password ? 'Passwords do not match.' : null),
      },
      {
        onInput: (e) => {
          if (e.target.name === 'password') strength.dataset.score = score(e.target.value);
        },
        submit: (values) => {
          const terms = N.$('#terms', root);
          const termsError = N.$('[data-error="terms"]', root);
          if (!terms.checked) {
            termsError.textContent = 'Accept the policy to continue.';
            return;
          }
          termsError.textContent = '';
          N.$('[data-slot="form-note"]').innerHTML = note(
            `Workspace <strong>${N.esc(values.teamName)}</strong> is ready. Check ${N.esc(values.email)} for the 6-digit code.`,
            'success',
          );
          setTimeout(() => {
            location.href = 'verify-otp.html';
          }, 900);
        },
      },
    );
  });

  // ── Forgot password ───────────────────────────────────────────────────────

  N.page('forgot-password', () => {
    const panel = `
      ${brand()}
      <a class="link-btn t-caption" href="login.html">${N.icon('arrowLeft', { size: 14 })} Back to sign in</a>
      <div class="auth-head">
        <h1 class="t-display-md">Reset your password</h1>
        <p class="t-body c-muted">Tell us the email on the account and we will send a reset link that expires in 30 minutes.</p>
      </div>
      <div class="auth-card">
        <form class="auth-form" novalidate>
          ${emailField({ value: 'alex.nguyen@nexa.app' })}
          <div data-slot="form-note"></div>
          <button class="btn btn-primary btn-lg btn-block" type="submit" data-submit>${N.icon('send', { size: 16 })} Send reset link</button>
        </form>
        <div class="auth-note">
          ${N.icon('info', { size: 18 })}
          <span>No email? Check that you typed the address your admin invited, or ask them to re-send the invite.</span>
        </div>
        <div class="auth-divider">or</div>
        <button class="btn btn-secondary btn-block" data-alt="sso">${N.icon('lock', { size: 16 })} Use company SSO instead</button>
        <p class="auth-foot">Remembered it? <a href="login.html">Sign in</a></p>
      </div>`;

    const artCard = art({
      variant: 'ochre',
      eyebrow: 'Countdown notifications',
      title: 'Never miss the deadline that matters.',
      body: 'Countdowns tick live, pin themselves to the calendar, and nudge at T-30, T-7, T-1, and on the day.',
      points: ['Deadlines, birthdays, anniversaries, custom', 'Reminders at four trigger points'],
    });

    N.$('[data-slot="shell"]').innerHTML = shell(panel, artCard);

    wireAuthForm(
      N.$('.auth-panel'),
      { email: (v) => (!v.trim() ? 'Enter your work email.' : !EMAIL_RE.test(v) ? 'That does not look like an email address.' : null) },
      {
        submit: (values) => {
          N.$('[data-slot="form-note"]').innerHTML = note(
            `If <strong>${N.esc(values.email)}</strong> has an account, the reset link is on its way.`,
            'success',
          );
          N.$('[data-submit]').disabled = true;
        },
      },
    );

    N.$('[data-alt="sso"]').addEventListener('click', () => N.toast('Company SSO is stubbed in the prototype'));
  });

  // ── Verify OTP ────────────────────────────────────────────────────────────

  N.page('verify-otp', () => {
    const panel = `
      ${brand()}
      <a class="link-btn t-caption" href="register.html">${N.icon('arrowLeft', { size: 14 })} Back</a>
      <div class="auth-head">
        <h1 class="t-display-md">Check your inbox</h1>
        <p class="t-body c-muted">We sent a 6-digit code to <strong class="c-ink">alex.nguyen@nexa.app</strong>. It expires in 10 minutes.</p>
      </div>
      <div class="auth-card">
        <form class="auth-form" novalidate>
          <div class="field">
            <label class="label" for="otp-0">Verification code</label>
            <div class="otp-row" data-slot="otp">
              ${Array.from({ length: 6 }, (_, i) => `<input class="otp-box" id="otp-${i}" inputmode="numeric" maxlength="1" autocomplete="one-time-code" aria-label="Digit ${i + 1}" />`).join('')}
            </div>
            <span class="error-text" data-error="otp"></span>
          </div>
          <div class="between">
            <span class="t-caption c-muted">Didn't get it? <button class="link-btn t-caption" type="button" data-resend>Resend code</button></span>
            <span class="t-caption c-muted t-num" data-slot="countdown">10:00</span>
          </div>
          <div class="auth-device">
            ${N.avatar(N.ME, { size: 'sm' })}
            <span class="grow stack" style="gap:0">
              <span class="t-body-sm c-ink" style="font-weight:500">Trust this device for 30 days</span>
              <span class="t-caption">Skip the code next time on this browser</span>
            </span>
            <input type="checkbox" class="switch" checked />
          </div>
          <div data-slot="form-note"></div>
          <button class="btn btn-primary btn-lg btn-block" type="submit" data-submit disabled>Verify and continue</button>
        </form>
        <div class="auth-note">${N.icon('info', { size: 18 })}<span>Prototype shortcut: type any 6 digits, for example <strong>204815</strong>.</span></div>
      </div>`;

    const artCard = art({
      variant: 'peach',
      eyebrow: 'One calendar',
      title: 'Your schedule, their events, and the holidays.',
      body: 'Month, week, and day views merge personal time blocks, notification due dates, countdown targets, applied todo lists, and public holidays.',
      points: ['Colour-coded per entry type', 'Week and day views show time blocks'],
    });

    N.$('[data-slot="shell"]').innerHTML = shell(panel, artCard);

    const boxes = N.$$('.otp-box');
    const form = N.$('form');
    const submit = N.$('[data-submit]');
    const errorSlot = N.$('[data-error="otp"]');

    const code = () => boxes.map((b) => b.value).join('');

    function paint() {
      const ready = code().length === 6;
      submit.disabled = !ready;
      errorSlot.textContent = '';
      boxes.forEach((b) => b.setAttribute('data-filled', String(b.value.length === 1)));
    }

    boxes.forEach((box, i) => {
      box.addEventListener('input', () => {
        box.value = box.value.replace(/\D/g, '').slice(0, 1);
        if (box.value && boxes[i + 1]) boxes[i + 1].focus();
        paint();
      });
      box.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !box.value && boxes[i - 1]) boxes[i - 1].focus();
        if (e.key === 'ArrowLeft' && boxes[i - 1]) boxes[i - 1].focus();
        if (e.key === 'ArrowRight' && boxes[i + 1]) boxes[i + 1].focus();
      });
      box.addEventListener('paste', (e) => {
        const text = (e.clipboardData?.getData('text') ?? '').replace(/\D/g, '').slice(0, 6);
        if (!text) return;
        e.preventDefault();
        text.split('').forEach((ch, k) => {
          if (boxes[k]) boxes[k].value = ch;
        });
        boxes[Math.min(text.length, 5)].focus();
        paint();
      });
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (code().length !== 6) {
        errorSlot.textContent = 'Enter all six digits.';
        return;
      }
      N.$('[data-slot="form-note"]').innerHTML = note('Code accepted. Setting up your workspace…', 'success');
      setTimeout(() => {
        location.href = 'm-notifications.html';
      }, 800);
    });

    // Live expiry countdown
    let left = 600;
    const slot = N.$('[data-slot="countdown"]');
    setInterval(() => {
      left = Math.max(0, left - 1);
      slot.textContent = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
      if (left === 0) slot.textContent = 'Expired';
    }, 1000);

    N.$('[data-resend]').addEventListener('click', () => {
      left = 600;
      N.toast('A new code is on its way');
    });

    boxes[0].focus();
    paint();
  });
})();
