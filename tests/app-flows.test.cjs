const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const scripts = [
  'app.js', 'v22-live-data.js', 'v23-photo-security.js',
  'v60-no-email-auth.js', 'v43-ministry-tools.js', 'v44-updates.js',
  'v45-theme.js', 'v54-stable-welcome.js', 'v64-event-rsvp.js',
  'v66-whatsapp-otp.js',
];

async function fixture(t) {
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), {
    url: 'https://example.test/efgc-youth-app/', runScripts: 'outside-only', pretendToBeVisual: true,
  });
  const w = dom.window;
  const observers = [];
  const Observer = w.MutationObserver;
  w.MutationObserver = class extends Observer {
    constructor(callback) { super(callback); observers.push(this); }
  };
  t.after(() => { observers.forEach(observer => observer.disconnect()); w.close(); });
  w.scrollTo = () => {};
  w.Element.prototype.scrollIntoView = () => {};
  w.matchMedia = () => ({ matches: false });
  const state = { profile: null, events: [], attendance: [], responses: [], requests: [], profileWrites: [], fetches: [] };
  w.EFGCAuth = {
    restoreSession: async () => null,
    session: () => state.profile ? { user: { id: state.profile.id } } : null,
    userId: () => state.profile?.id || null,
    accessToken: () => state.profile ? 'test-only-token' : null,
    getMyProfile: async () => state.profile,
    normalizeZA: phone => phone,
    upsertProfile: async data => { state.profileWrites.push(data); Object.assign(state.profile, data); return state.profile; },
    signOut: async () => { state.profile = null; },
    rest: async (route, options = {}) => {
      state.requests.push({ route, ...options });
      if (route.startsWith('events?')) return state.events;
      if (route.startsWith('attendance?')) {
        if (state.attendanceError) throw new Error('Connection unavailable');
        return state.attendance;
      }
      if (route.startsWith('event_rsvps?')) {
        if (options.method === 'POST') {
          const row = JSON.parse(options.body);
          state.responses = state.responses.filter(r => r.event_id !== row.event_id).concat(row);
          return [row];
        }
        return state.responses;
      }
      return [];
    },
  };
  w.fetch = async (...args) => { state.fetches.push(args); throw new Error('Unexpected network request in isolated test'); };
  for (const file of scripts) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), dom.getInternalVMContext(), { filename: file });
  await delay(30);
  const signIn = (role, approval = 'approved') => {
    state.profile = { id: 'test-member', full_name: 'Test Member', phone: 'test-phone', role, approval_status: approval };
    vm.runInContext(`session = ${JSON.stringify({ uid: 'test-member', name: 'Test Member', role, approval_status: approval })}`, dom.getInternalVMContext());
    w.renderShell();
  };
  const click = selector => {
    const element = w.document.querySelector(selector);
    assert.ok(element, `Missing control: ${selector}`);
    element.click();
  };
  return { w, state, signIn, click, doc: w.document };
}

test('Create Account opens registration, keeps Leader registration selected, and survives delayed welcome callbacks', async t => {
  const { w, doc, click } = await fixture(t);
  click('#v57Create');
  assert.equal(doc.querySelector('#loginTitle').textContent, 'Youth Registration');
  assert.equal(doc.querySelector('#nameField').classList.contains('hidden'), false);
  assert.equal(doc.querySelector('#youthSafeguardingFields').classList.contains('hidden'), false);
  assert.equal(doc.querySelector('#loginPassword').autocomplete, 'new-password');
  click('.login-type[data-role="leader"]');
  assert.equal(doc.querySelector('#loginTitle').textContent, 'Leader Application');
  assert.equal(doc.querySelector('#roleField').classList.contains('hidden'), false);
  await delay(1100);
  assert.equal(doc.querySelector('.login-card').classList.contains('mock-login-hidden'), false);
  assert.equal(doc.querySelector('#loginTitle').textContent, 'Leader Application');
  click('.v57-back');
  click('#v57Login');
  assert.equal(doc.querySelector('#loginTitle').textContent, 'Youth Login');
  assert.equal(doc.querySelector('#nameField').classList.contains('hidden'), true);
  w.selectRole('admin');
  assert.equal(doc.querySelector('#phoneField').classList.contains('hidden'), true);
  assert.equal(doc.querySelector('#emailField').classList.contains('hidden'), true);
});

test('Registration rejects unsupported photos before creating an account or sending an OTP', async t => {
  const { w, doc, click, state } = await fixture(t);
  click('#v57Create');
  click('.login-type[data-role="leader"]');
  for (const [id, value] of Object.entries({ loginName: 'Test Member', loginPhone: '0712345678', loginPassword: 'test-only-password', loginDob: '2000-01-01' })) doc.getElementById(id).value = value;
  Object.defineProperty(doc.querySelector('#loginPhoto'), 'files', { value: [new w.File(['test'], 'test.gif', { type: 'image/gif' })] });
  await w.loginUser();
  assert.match(doc.querySelector('#loginMessage').textContent, /JPG, PNG or WebP/);
  assert.equal(state.fetches.length, 0);
});

test('Admin dashboard shortcuts load attendance and planner once; Youth cannot open either', async t => {
  const { w, doc, signIn, click, state } = await fixture(t);
  signIn('admin');
  await w.renderLiveData();
  click('#mockHomeDashboard [data-mock-tab="attendanceAdmin"]');
  await delay(30);
  assert.match(doc.querySelector('#attendanceAdminHost').textContent, /Attendance Register/);
  assert.match(doc.querySelector('#attendanceAdminHost').textContent, /No attendance events yet/);
  let plannerCalls = 0;
  w.renderPlannerRoster = async () => { plannerCalls++; };
  click('#mockHomeDashboard [data-mock-tab="plannerRoster"]');
  await delay(10);
  assert.equal(plannerCalls, 1);
  signIn('youth');
  assert.equal(w.showTab('admin'), false);
  assert.equal(w.showTab('attendanceAdmin'), false);
  assert.equal(w.showTab('plannerRoster'), false);
  await w.logoutUser();
  assert.equal(state.profile, null);
  assert.equal(doc.querySelector('#plannerRoster').classList.contains('hidden'), true);
  assert.equal(doc.querySelector('#attendanceAdmin').classList.contains('hidden'), true);
});

test('Profiles distinguish Youth, pending and rejected Leaders, approved Leaders, and Admin', async t => {
  const { w, doc, signIn } = await fixture(t);
  const cases = [
    ['youth', 'approved', 'Youth Member', false],
    ['leader', 'pending', 'Leader application pending', true],
    ['leader', 'rejected', 'Leader application not approved', true],
    ['leader', 'approved', 'Approved Leader', true],
    ['admin', 'approved', 'Admin', true],
  ];
  for (const [role, approval, label, leadershipField] of cases) {
    signIn(role, approval);
    w.showTab('profile');
    await delay(10);
    assert.equal(doc.querySelector('#profileCard .status-pill').textContent, label);
    assert.equal(Boolean(doc.querySelector('#ownProfileRole')), leadershipField);
    if (role === 'leader' && approval !== 'approved') assert.equal(w.showTab('plannerRoster'), false);
  }
});

test('Youth profile saves omit leadership and authorization fields and retain success feedback', async t => {
  const { w, doc, signIn, state } = await fixture(t);
  signIn('youth');
  w.showTab('profile');
  await delay(10);
  doc.querySelector('#ownProfileName').value = 'Updated Test Member';
  await w.saveOwnLeaderProfile();
  assert.equal(state.profileWrites.length, 1);
  assert.equal(state.profileWrites[0].full_name, 'Updated Test Member');
  for (const field of ['leader_role', 'role', 'approval_status']) assert.equal(field in state.profileWrites[0], false);
  assert.equal(doc.querySelector('#ownProfileMessage').textContent, 'Profile saved.');
});

test('Attendance shows empty and error states and counts only approved completed meetings', async t => {
  const { w, doc, signIn, state } = await fixture(t);
  signIn('youth');
  w.showTab('mine');
  await delay(10);
  assert.match(doc.querySelector('#mineList').textContent, /No approved attendance records yet/);
  state.attendance = [
    { status: 'present', events: { attendance_approved: true, event_date: '2000-01-01' } },
    { status: 'absent', events: { attendance_approved: true, event_date: '2000-01-02' } },
    { status: 'present', events: { attendance_approved: false, event_date: '2000-01-03' } },
    { status: 'present', events: { attendance_approved: true, event_date: '2100-01-01' } },
  ];
  w.showTab('mine');
  await delay(10);
  assert.equal(doc.querySelector('.mock-ring strong').textContent, '1 / 2');
  state.attendanceError = true;
  w.showTab('mine');
  await delay(10);
  assert.match(doc.querySelector('#mineList').textContent, /Attendance could not load/);
});

test('RSVP rendering settles without self-triggered requests, preserves buttons, and saves against stable event IDs', async t => {
  const { w, doc, signIn, state } = await fixture(t);
  state.events = [
    { id: 7, title: 'Test event one', event_date: '2100-01-01T18:30:00Z' },
    { id: 2, title: 'Test event two', event_date: '2100-01-02T18:30:00Z' },
  ];
  signIn('youth');
  w.showTab('events');
  await delay(1100); // Let all legacy startup callbacks finish.
  const responseReads = () => state.requests.filter(r => r.route.startsWith('event_rsvps?') && !r.method).length;
  const before = responseReads();
  const panel = doc.querySelector('#event-rsvp-7');
  assert.ok(panel);
  await delay(500);
  assert.equal(responseReads(), before, 'Panel mutations must not trigger another fetch');
  await w.EFGCEventRSVP.refresh();
  assert.equal(doc.querySelector('#event-rsvp-7'), panel, 'An unchanged panel must retain focus and listeners');
  doc.querySelector('.event-feed').prepend(doc.querySelector('.event-card[data-event-id="2"]'));
  panel.querySelector('[data-response="attending"]').click();
  await delay(20);
  const save = state.requests.find(r => r.route.startsWith('event_rsvps?') && r.method === 'POST');
  assert.equal(JSON.parse(save.body).event_id, 7);
  assert.equal(panel.querySelector('[data-response="attending"]').getAttribute('aria-pressed'), 'true');
  const savedMessage = panel.querySelector('.event-rsvp-message').textContent;
  await w.EFGCEventRSVP.refresh();
  assert.equal(doc.querySelector('#event-rsvp-7'), panel);
  assert.equal(panel.querySelector('.event-rsvp-message').textContent, savedMessage);
  w.showTab('home');
  const hiddenCount = responseReads();
  await w.EFGCEventRSVP.refresh();
  assert.equal(responseReads(), hiddenCount, 'Hidden events must not poll');
});

test('Backend configuration does not inject duplicate duty scripts or styles', () => {
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), { runScripts: 'outside-only' });
  dom.window.eval(fs.readFileSync(path.join(root, 'backend-adapter.js'), 'utf8'));
  assert.equal(dom.window.document.querySelectorAll('script[src^="v63-duty-ack.js"]').length, 1);
  assert.equal(dom.window.document.querySelectorAll('link[href^="v63-duty-ack.css"]').length, 1);
  dom.window.close();
});
