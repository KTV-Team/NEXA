/* ───────────────────────────────────────────────────────────────────────────
   NEXA UI demo — mock dataset
   Mirrors packages/types/src/index.ts (Notification, TeamEvent, EventStats,
   CalendarEntry, TodoTemplate, TodoSchedule, Countdown) so the prototype shows
   the real payload shapes before any of it is wired to the API.

   Date convention: `TODAY` is the day the prototype is opened, and every date is
   expressed as TODAY ± n days. Seeded history is derived from the same anchor so
   the demo never looks stale.
   ─────────────────────────────────────────────────────────────────────────── */

// ── Date helpers ────────────────────────────────────────────────────────────

const DAY_MS = 86400000;

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

const TODAY = startOfDay(new Date());

/** YYYY-MM-DD for TODAY + n days, in LOCAL time.
 *  `toISOString()` is deliberately avoided here: it converts to UTC, which
 *  shifts every date back a day for any timezone east of Greenwich. */
function localDayStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isoDay(offset = 0) {
  return localDayStr(new Date(TODAY.getTime() + offset * DAY_MS));
}

const pad = (n) => String(n).padStart(2, '0');

/** ISO 8601 timestamp for a local wall-clock time at TODAY + dayOffset.
 *  The UTC conversion is correct at this level because the offset is explicit. */
function isoTime(dayOffset = 0, hour = 9, minute = 0) {
  const d = new Date(TODAY.getTime() + dayOffset * DAY_MS);
  d.setHours(hour, minute, 0, 0);
  const offsetMin = -d.getTimezoneOffset();
  const sign = offsetMin < 0 ? '-' : '+';
  const abs = Math.abs(offsetMin);
  return (
    `${localDayStr(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:00` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  );
}

/** Parse a YYYY-MM-DD string as a local date (avoids the UTC shift of new Date(str)). */
function parseDay(day) {
  const [y, m, d] = String(day).split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Whole days between two YYYY-MM-DD strings (b - a). */
function dayDiff(a, b) {
  return Math.round((parseDay(b) - parseDay(a)) / DAY_MS);
}

// ── People ──────────────────────────────────────────────────────────────────

const TEAM = { id: 'team_01', name: 'Product Design', members: 8 };

const ME = {
  id: 'u_01',
  name: 'Alex Nguyen',
  email: 'alex.nguyen@nexa.app',
  role: 'admin',
  jobTitle: 'Product Lead',
  avatarColor: 1,
  timezone: 'GMT+7 · Ho Chi Minh City',
};

const USERS = [
  ME,
  { id: 'u_02', name: 'Mai Tran', email: 'mai.tran@nexa.app', role: 'admin', jobTitle: 'Design Lead', avatarColor: 2 },
  { id: 'u_03', name: 'Daniel Park', email: 'daniel.park@nexa.app', role: 'user', jobTitle: 'Frontend Engineer', avatarColor: 3 },
  { id: 'u_04', name: 'Sofia Rossi', email: 'sofia.rossi@nexa.app', role: 'user', jobTitle: 'Product Designer', avatarColor: 4 },
  { id: 'u_05', name: 'Kenji Watanabe', email: 'kenji.w@nexa.app', role: 'user', jobTitle: 'Backend Engineer', avatarColor: 5 },
  { id: 'u_06', name: 'Linh Pham', email: 'linh.pham@nexa.app', role: 'user', jobTitle: 'QA Engineer', avatarColor: 6 },
  { id: 'u_07', name: 'Omar Haddad', email: 'omar.haddad@nexa.app', role: 'user', jobTitle: 'Data Analyst', avatarColor: 7 },
  { id: 'u_08', name: 'Grace Kim', email: 'grace.kim@nexa.app', role: 'guest', jobTitle: 'Marketing', avatarColor: 8 },
];

const userById = (id) => USERS.find((u) => u.id === id) ?? USERS[0];

// ── F1 · Notifications ──────────────────────────────────────────────────────

const ACTION_LABELS = { confirm: 'Confirm', snooze: 'Snooze', dismiss: 'Dismiss' };

const NOTIFICATIONS = [
  {
    id: 'n_01',
    title: 'Review Q3 design audit before the client call',
    body: 'The audit deck is in Figma. Please confirm once you have left comments on the three open questions so we can lock the agenda.',
    senderId: 'u_02',
    recipients: { mode: 'single', userIds: ['u_01'], teamId: TEAM.id },
    actions: ['confirm', 'snooze', 'dismiss'],
    dueAt: isoTime(0, 17, 30),
    createdAt: isoTime(0, 8, 12),
    priority: 'high',
    response: { actionKey: null, respondedAt: null, snoozedUntil: null },
    read: false,
  },
  {
    id: 'n_02',
    title: 'Standup notes are waiting for your sign-off',
    body: 'Notes from this morning are summarised in the doc. Confirm to mark the thread resolved for the whole team.',
    senderId: 'u_03',
    recipients: { mode: 'all', teamId: TEAM.id },
    actions: ['confirm', 'dismiss'],
    dueAt: isoTime(1, 10, 0),
    createdAt: isoTime(-1, 15, 40),
    priority: 'normal',
    response: { actionKey: null, respondedAt: null, snoozedUntil: null },
    read: false,
  },
  {
    id: 'n_03',
    title: 'Submit your timesheet for week 42',
    body: 'Finance closes the week on Friday 18:00. Snooze this if you need a reminder closer to the deadline.',
    senderId: 'u_07',
    recipients: { mode: 'all', teamId: TEAM.id },
    actions: ['confirm', 'snooze', 'dismiss'],
    dueAt: isoTime(2, 18, 0),
    createdAt: isoTime(-1, 9, 5),
    priority: 'normal',
    response: { actionKey: 'snooze', respondedAt: isoTime(-1, 9, 30), snoozedUntil: isoTime(1, 9, 0) },
    read: true,
  },
  {
    id: 'n_04',
    title: 'Security training module must be completed',
    body: 'The annual security module takes about 20 minutes. Completion is tracked per person and reported to the CTO.',
    senderId: 'u_02',
    recipients: { mode: 'multi', userIds: ['u_01', 'u_03', 'u_05'], teamId: TEAM.id },
    actions: ['confirm', 'snooze'],
    dueAt: isoTime(5, 23, 59),
    createdAt: isoTime(-2, 11, 20),
    priority: 'high',
    response: { actionKey: null, respondedAt: null, snoozedUntil: null },
    read: true,
  },
  {
    id: 'n_05',
    title: 'Confirm your seat for the Hanoi offsite',
    body: 'Transport is booked for 14 people. Confirm your seat so we can finalise the rooming list.',
    senderId: 'u_06',
    recipients: { mode: 'all', teamId: TEAM.id },
    actions: ['confirm', 'dismiss'],
    dueAt: isoTime(-1, 12, 0),
    createdAt: isoTime(-6, 10, 0),
    priority: 'normal',
    response: { actionKey: 'confirm', respondedAt: isoTime(-1, 12, 14), snoozedUntil: null },
    read: true,
  },
  {
    id: 'n_06',
    title: 'Laptop refresh survey',
    body: 'Tell IT which model you prefer before the budget window closes.',
    senderId: 'u_08',
    recipients: { mode: 'all', teamId: TEAM.id },
    actions: ['confirm', 'dismiss'],
    dueAt: isoTime(-3, 17, 0),
    createdAt: isoTime(-9, 8, 45),
    priority: 'low',
    response: { actionKey: 'dismiss', respondedAt: isoTime(-4, 16, 2), snoozedUntil: null },
    read: true,
  },
];

// ── F2 · Events & RSVP ──────────────────────────────────────────────────────

const EVENTS = [
  {
    id: 'e_01',
    title: 'Design system review — Q3 checkpoint',
    description:
      'Walk through the new token layer, the saturated card palette, and the mobile navigation proposal. Bring your open questions on the calendar grid.',
    location: 'Studio B · Floor 4',
    startAt: isoTime(0, 14, 0),
    endAt: isoTime(0, 15, 30),
    createdBy: 'u_02',
    recipients: { mode: 'all', teamId: TEAM.id },
    cover: 'brand-teal',
    myStatus: 'attending',
    responses: [
      { userId: 'u_01', status: 'attending', respondedAt: isoTime(-1, 9, 12) },
      { userId: 'u_02', status: 'attending', respondedAt: isoTime(-2, 10, 0) },
      { userId: 'u_03', status: 'attending', respondedAt: isoTime(-1, 11, 40) },
      { userId: 'u_04', status: 'undecided', respondedAt: isoTime(-1, 14, 5) },
      { userId: 'u_05', status: 'not_attending', respondedAt: isoTime(-1, 15, 20) },
      { userId: 'u_06', status: 'attending', respondedAt: isoTime(-2, 16, 30) },
      { userId: 'u_07', status: 'undecided', respondedAt: null },
      { userId: 'u_08', status: 'not_attending', respondedAt: isoTime(-3, 9, 0) },
    ],
  },
  {
    id: 'e_02',
    title: 'Team offsite — Hanoi',
    description:
      'Two days of planning, a design critique, and one very long dinner. Agenda draft is pinned in the project channel.',
    location: 'Hanoi · Melia Hotel',
    startAt: isoTime(12, 8, 0),
    endAt: isoTime(14, 18, 0),
    createdBy: 'u_01',
    recipients: { mode: 'all', teamId: TEAM.id },
    cover: 'brand-peach',
    myStatus: 'attending',
    responses: [
      { userId: 'u_01', status: 'attending', respondedAt: isoTime(-8, 9, 0) },
      { userId: 'u_02', status: 'attending', respondedAt: isoTime(-8, 9, 20) },
      { userId: 'u_03', status: 'attending', respondedAt: isoTime(-7, 20, 10) },
      { userId: 'u_04', status: 'attending', respondedAt: isoTime(-7, 21, 0) },
      { userId: 'u_05', status: 'undecided', respondedAt: isoTime(-6, 8, 30) },
      { userId: 'u_06', status: 'attending', respondedAt: isoTime(-6, 12, 0) },
      { userId: 'u_07', status: 'not_attending', respondedAt: isoTime(-5, 17, 45) },
      { userId: 'u_08', status: 'undecided', respondedAt: null },
    ],
  },
  {
    id: 'e_03',
    title: 'Weekly design critique',
    description: 'Round-robin critique. Two slots per session, 20 minutes each.',
    location: 'Zoom · link in calendar',
    startAt: isoTime(2, 15, 0),
    endAt: isoTime(2, 16, 0),
    createdBy: 'u_04',
    recipients: { mode: 'all', teamId: TEAM.id },
    cover: 'brand-lavender',
    myStatus: 'undecided',
    responses: [
      { userId: 'u_01', status: 'undecided', respondedAt: null },
      { userId: 'u_02', status: 'attending', respondedAt: isoTime(-1, 9, 0) },
      { userId: 'u_03', status: 'attending', respondedAt: isoTime(-1, 9, 30) },
      { userId: 'u_04', status: 'attending', respondedAt: isoTime(-2, 14, 0) },
    ],
  },
  {
    id: 'e_04',
    title: 'Retro — notification delivery epic',
    description: 'What worked in the interactive notification rollout, and what we cut.',
    location: 'Studio A · Floor 4',
    startAt: isoTime(-2, 16, 0),
    endAt: isoTime(-2, 17, 0),
    createdBy: 'u_01',
    recipients: { mode: 'multi', userIds: ['u_01', 'u_02', 'u_03', 'u_05'], teamId: TEAM.id },
    cover: 'brand-ochre',
    myStatus: 'attending',
    responses: [
      { userId: 'u_01', status: 'attending', respondedAt: isoTime(-4, 9, 0) },
      { userId: 'u_02', status: 'attending', respondedAt: isoTime(-4, 9, 30) },
      { userId: 'u_03', status: 'not_attending', respondedAt: isoTime(-3, 10, 0) },
      { userId: 'u_05', status: 'attending', respondedAt: isoTime(-3, 11, 0) },
    ],
  },
];

// ── F4 · Calendar ───────────────────────────────────────────────────────────

const CALENDAR = [
  // schedule — personal time blocks
  { id: 'c_01', type: 'schedule', title: 'Focus block — calendar grid polish', date: isoDay(0), startTime: '09:00', endTime: '11:00' },
  { id: 'c_02', type: 'schedule', title: '1:1 with Mai', date: isoDay(0), startTime: '11:30', endTime: '12:00' },
  { id: 'c_03', type: 'schedule', title: 'Deep work — token audit', date: isoDay(1), startTime: '09:00', endTime: '12:00' },
  { id: 'c_04', type: 'schedule', title: 'Product sync', date: isoDay(1), startTime: '15:00', endTime: '16:00' },
  { id: 'c_05', type: 'schedule', title: 'Design review prep', date: isoDay(2), startTime: '13:00', endTime: '14:30' },
  { id: 'c_06', type: 'schedule', title: 'Interviews — mobile engineer', date: isoDay(3), startTime: '10:00', endTime: '11:30' },
  { id: 'c_07', type: 'schedule', title: 'Focus block — countdown widget', date: isoDay(-1), startTime: '09:30', endTime: '12:30' },
  { id: 'c_08', type: 'schedule', title: 'Sprint planning', date: isoDay(-2), startTime: '14:00', endTime: '15:30' },
  { id: 'c_09', type: 'schedule', title: 'Monthly all-hands', date: isoDay(6), startTime: '16:00', endTime: '17:00' },
  { id: 'c_10', type: 'schedule', title: 'Focus block — writing', date: isoDay(-5), startTime: '09:00', endTime: '11:00' },

  // notification — pins for notifications that carry a due date
  { id: 'c_20', type: 'notification', title: 'Review Q3 design audit', date: isoDay(0), startTime: '17:30', refId: 'n_01' },
  { id: 'c_21', type: 'notification', title: 'Standup notes sign-off', date: isoDay(1), startTime: '10:00', refId: 'n_02' },
  { id: 'c_22', type: 'notification', title: 'Timesheet — week 42', date: isoDay(2), startTime: '18:00', refId: 'n_03' },
  { id: 'c_23', type: 'notification', title: 'Security training due', date: isoDay(5), startTime: '17:00', refId: 'n_04' },

  // countdown — target dates
  { id: 'c_30', type: 'countdown', title: 'NEXA public beta', date: isoDay(23), refId: 'cd_01' },
  { id: 'c_31', type: 'countdown', title: "Mai's birthday", date: isoDay(9), refId: 'cd_02' },

  // holiday — public holiday list for the current year
  { id: 'c_40', type: 'holiday', title: 'National Day', date: `${TODAY.getFullYear()}-09-02` },
  { id: 'c_41', type: 'holiday', title: 'Tet Holiday', date: `${TODAY.getFullYear() + (TODAY.getMonth() > 1 ? 1 : 0)}-02-17` },
];

// ── F5 · Todo templates & schedules ─────────────────────────────────────────

const TODO_TEMPLATES = [
  {
    id: 't_01',
    name: 'Monday kickoff',
    daysOfWeek: [1],
    ownerId: 'u_01',
    tasks: [
      { id: 'tt_1', title: 'Review the week ahead in Calendar', order: 0 },
      { id: 'tt_2', title: 'Clear the notification inbox', order: 1 },
      { id: 'tt_3', title: 'Update the sprint board', order: 2 },
      { id: 'tt_4', title: 'Post the weekly plan to the team channel', order: 3 },
    ],
  },
  {
    id: 't_02',
    name: 'Daily shutdown',
    daysOfWeek: [1, 2, 3, 4, 5],
    ownerId: 'u_01',
    tasks: [
      { id: 'tt_5', title: 'Confirm open notifications', order: 0 },
      { id: 'tt_6', title: 'Log hours for tomorrow', order: 1 },
      { id: 'tt_7', title: 'Write the handover note', order: 2 },
    ],
  },
  {
    id: 't_03',
    name: 'Release checklist',
    daysOfWeek: [3],
    ownerId: 'u_02',
    tasks: [
      { id: 'tt_8', title: 'Freeze the branch', order: 0 },
      { id: 'tt_9', title: 'Run the smoke suite', order: 1 },
      { id: 'tt_10', title: 'Update the changelog', order: 2 },
      { id: 'tt_11', title: 'Notify stakeholders', order: 3 },
    ],
  },
];

/** Which template landed on which day, plus the per-task completion snapshot. */
const TODO_SCHEDULES = [
  { id: 'ts_01', templateId: 't_01', date: isoDay(0), completed: ['tt_1', 'tt_2'] },
  { id: 'ts_02', templateId: 't_02', date: isoDay(0), completed: [] },
  { id: 'ts_03', templateId: 't_02', date: isoDay(-1), completed: ['tt_5', 'tt_6', 'tt_7'] },
  { id: 'ts_04', templateId: 't_03', date: isoDay(1), completed: ['tt_8'] },
  { id: 'ts_05', templateId: 't_01', date: isoDay(-7), completed: ['tt_1', 'tt_2', 'tt_3', 'tt_4'] },
  { id: 'ts_06', templateId: 't_02', date: isoDay(1), completed: [] },
];

// ── F6 · Countdowns ─────────────────────────────────────────────────────────

const COUNTDOWNS = [
  {
    id: 'cd_01',
    title: 'NEXA public beta',
    type: 'deadline',
    targetDate: isoDay(23),
    ownerId: 'u_01',
    note: 'Store submission closes the week before.',
    color: 'brand-teal',
  },
  {
    id: 'cd_02',
    title: "Mai's birthday",
    type: 'birthday',
    targetDate: isoDay(9),
    ownerId: 'u_01',
    note: 'Cake from the place near the studio.',
    color: 'brand-pink',
  },
  {
    id: 'cd_03',
    title: 'Work anniversary — 3 years',
    type: 'anniversary',
    targetDate: isoDay(41),
    ownerId: 'u_01',
    note: '',
    color: 'brand-lavender',
  },
  {
    id: 'cd_04',
    title: 'Design system v2 handoff',
    type: 'custom',
    targetDate: isoDay(4),
    ownerId: 'u_02',
    note: 'Token package + migration guide.',
    color: 'brand-ochre',
  },
  {
    id: 'cd_05',
    title: 'Quarterly report due',
    type: 'deadline',
    targetDate: isoDay(-3),
    ownerId: 'u_07',
    note: 'Submitted — kept for history.',
    color: 'brand-peach',
  },
];

// ── Derived views ───────────────────────────────────────────────────────────

/** EventStats, exactly as `GET /events/:id/stats` returns it. */
function eventStats(event) {
  const responses = event.responses.map((r) => ({
    id: `${event.id}_${r.userId}`,
    eventId: event.id,
    userId: r.userId,
    status: r.status,
    respondedAt: r.respondedAt,
  }));
  const count = (s) => responses.filter((r) => r.status === s).length;
  const total = event.recipients.mode === 'all' ? TEAM.members : (event.recipients.userIds ?? []).length;
  return {
    eventId: event.id,
    attending: count('attending'),
    notAttending: count('not_attending'),
    undecided: count('undecided'),
    total,
    responses,
  };
}

/** Remaining time until a YYYY-MM-DD target, as `CountdownDetail.remaining`. */
function countdownRemaining(targetDate, now = new Date()) {
  const target = parseDay(targetDate);
  target.setHours(0, 0, 0, 0);
  let ms = target.getTime() - now.getTime();
  const isPast = ms < 0;
  ms = Math.abs(ms);
  const days = Math.floor(ms / DAY_MS);
  const hours = Math.floor((ms % DAY_MS) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return { days, hours, minutes, seconds, isPast };
}

/** Everything the calendar knows about one day. */
function entriesOn(day) {
  return CALENDAR.filter((e) => e.date === day).sort((a, b) =>
    (a.startTime ?? '99').localeCompare(b.startTime ?? '99'),
  );
}

const CAL_TYPE_META = {
  schedule: { label: 'Schedule', color: 'var(--color-brand-teal)', dot: 'var(--color-brand-teal)' },
  notification: { label: 'Notification', color: 'var(--color-brand-pink)', dot: 'var(--color-brand-pink)' },
  holiday: { label: 'Holiday', color: 'var(--color-brand-ochre)', dot: 'var(--color-brand-ochre)' },
  countdown: { label: 'Countdown', color: 'var(--color-brand-coral)', dot: 'var(--color-brand-coral)' },
  todo: { label: 'Todo list', color: 'var(--color-brand-lavender)', dot: 'var(--color-brand-lavender)' },
};

const COUNTDOWN_TYPE_META = {
  deadline: { label: 'Deadline', icon: 'flag', color: 'brand-teal' },
  birthday: { label: 'Birthday', icon: 'cake', color: 'brand-pink' },
  anniversary: { label: 'Anniversary', icon: 'star', color: 'brand-lavender' },
  custom: { label: 'Custom', icon: 'sparkle', color: 'brand-ochre' },
};

const RSVP_META = {
  attending: { label: 'Attending', icon: 'check', tone: 'success' },
  not_attending: { label: 'Not attending', icon: 'x', tone: 'error' },
  undecided: { label: 'Undecided', icon: 'alert', tone: 'warning' },
};
