let loginRole = 'youth';
let session = null; // Never trust a role restored only from localStorage. Auth boot reloads role from Supabase.
const $ = (s) => document.querySelector(s);
const escapeHtml = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtDate = (v) => v ? new Date(v).toLocaleString('en-ZA', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '';

function selectRole(r) {
  loginRole = r;
  document.querySelectorAll('.login-type').forEach((b) => b.classList.toggle('active', b.dataset.role === r));
  $('#loginTitle').textContent = r === 'leader' ? 'Leader Login / Application' : r === 'admin' ? 'Admin Login' : 'Youth Login';
  $('#loginHint').textContent = r === 'leader'
    ? 'Existing leaders sign in with email. New Leader access requires Admin approval.'
    : r === 'admin'
      ? 'Secure Admin sign-in uses your verified email. Admin rights cannot be created from this screen.'
      : 'Existing youth sign in with email. New youth can complete profile setup after verification.';
  $('#youthSafeguardingFields').classList.toggle('hidden', r !== 'youth');
  $('#roleField').classList.toggle('hidden', r !== 'leader');
  $('#photoField').classList.toggle('hidden', r === 'admin');
  $('#dobField').classList.toggle('hidden', r === 'admin');
  $('#emailField').classList.remove('hidden');
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('.login-type');
  if (b) selectRole(b.dataset.role);
  const tab = e.target.closest('[data-tab]');
  if (tab && session) showTab(tab.dataset.tab);
});

function showLogin(){ $('#login').classList.remove('hidden'); }
function hideLogin(){ $('#login').classList.add('hidden'); }
function showTab(id){
  document.querySelectorAll('main > section.tab').forEach(el => el.classList.add('hidden'));
  const target = document.getElementById(id);
  if (target) target.classList.remove('hidden');
  document.querySelectorAll('.menu-item').forEach(b => b.classList.toggle('active', b.dataset.tab === id));
}

function roleAllowed(role, approval='approved') {
  return role === 'admin' || (role === 'leader' && approval === 'approved');
}

function renderShell(){
  const authenticated = Boolean(session?.uid);
  document.querySelectorAll('#mainMenu, .userbar').forEach(el => el.classList.toggle('hidden', !authenticated));
  if (!authenticated) {
    document.querySelectorAll('#home,#events,#news,#scripture,#mine,#leaders,#profile,#security,#admin').forEach(el => el.classList.add('hidden'));
    $('#currentUser').textContent = 'Not signed in';
    $('#adminMenu')?.classList.add('hidden');
    showLogin();
    return;
  }
  $('#currentUser').textContent = `${session.name || 'EFGC Member'} • ${session.role}${session.approval_status === 'pending' ? ' • Pending approval' : ''}`;
  $('#adminMenu')?.classList.toggle('hidden', session.role !== 'admin');
  hideLogin();
  showTab('home');
}

function card(title, body, meta='') {
  return `<article class="card"><h3>${escapeHtml(title)}</h3>${meta ? `<small>${escapeHtml(meta)}</small>` : ''}<p>${escapeHtml(body)}</p></article>`;
}

async function renderLiveData(){
  if (!session?.uid || !window.EFGCLive) return;
  const errors=[];
  try {
    const events = await EFGCLive.events();
    $('#eventList').innerHTML = events.length ? events.map(e => card(e.title, [e.theme,e.scripture].filter(Boolean).join(' • ') || 'EFGC Youth event', fmtDate(e.event_date))).join('') : card('No events published yet','Approved EFGC Youth events will appear here.');
  } catch(e){ errors.push(`Events: ${e.message}`); }

  try {
    const news = await EFGCLive.news();
    const html = news.length ? news.map(n => card('EFGC Youth Update', n.content, fmtDate(n.published_at))).join('') : card('Welcome to EFGC Youth','News and approved announcements will appear here.');
    $('#newsList').innerHTML = html;
    $('#homeNews').innerHTML = news.length ? news.slice(0,3).map(n => card('EFGC Youth Update', n.content, fmtDate(n.published_at))).join('') : card('Welcome to EFGC Youth','Build • Belong • Be a Light.');
  } catch(e){ errors.push(`News: ${e.message}`); }

  try {
    const leaders = await EFGCLive.approvedLeaders();
    $('#leaderList').innerHTML = `<h2>Approved Youth Leaders</h2>` + (leaders.length ? leaders.map(l => card(l.full_name, l.leader_role || 'EFGC Youth Leader', l.phone || '')).join('') : card('Leader directory','Approved leaders will appear here.'));
  } catch(e){ errors.push(`Leaders: ${e.message}`); }

  if (session.role === 'youth') {
    try {
      const rows = await EFGCLive.myAttendance(session.uid);
      const approved = rows.filter(r => r.events?.attendance_approved);
      const attended = approved.filter(r => r.status === 'present').length;
      $('#mineList').innerHTML = `<article class="card"><h3>${attended} / ${approved.length}</h3><p>Approved meetings attended / held</p></article>` + approved.map(r => card(r.events?.title || 'Youth meeting', r.status === 'present' ? 'Present' : 'Absent', fmtDate(r.events?.event_date))).join('');
    } catch(e){ errors.push(`Attendance: ${e.message}`); }
  } else {
    $('#mineList').innerHTML = card('Attendance','Personal youth attendance is shown only on Youth accounts.');
  }

  if (roleAllowed(session.role, session.approval_status)) {
    try {
      const planner = await EFGCLive.planner();
      $('#leaderYearPlanner').innerHTML = `<h2>Year Planner</h2>` + (planner.length ? planner.map(p => card(p.meeting_title || 'Youth meeting', [p.theme,p.scripture].filter(Boolean).join(' • ') || 'Planning item', p.week_start)).join('') : card('Year Planner','No published planner entries yet.'));
    } catch(e){
      $('#leaderYearPlanner').innerHTML='';
      errors.push(`Planner: ${e.message}`);
    }
  } else {
    $('#leaderYearPlanner').innerHTML='';
  }

  if (session.role === 'admin') {
    try {
      const profiles = await EFGCLive.adminProfiles();
      const pending = profiles.filter(p => p.role === 'leader' && p.approval_status === 'pending').length;
      $('#adminPanel').innerHTML = `<h2>Admin Centre</h2><article class="card"><h3>${profiles.length} account${profiles.length===1?'':'s'}</h3><p>${pending} pending leader application${pending===1?'':'s'}.</p></article>` + profiles.slice(0,25).map(p => card(p.full_name, `${p.role} • ${p.approval_status}`, p.leader_role || '')).join('');
    } catch(e){ errors.push(`Admin: ${e.message}`); }
  } else {
    $('#adminPanel').innerHTML='';
  }

  $('#profileCard').innerHTML = `<article class="card"><h2>${escapeHtml(session.name || 'EFGC Member')}</h2><p>Role: ${escapeHtml(session.role || '')}</p><p>Status: ${escapeHtml(session.approval_status || 'approved')}</p></article>`;
  if (errors.length) console.warn('EFGC live-data notices', errors);
}

async function render(){
  renderShell();
  if (session?.uid) await renderLiveData();
}

function logoutUser(){
  session=null;
  localStorage.removeItem('efgcYouthSession');
  renderShell();
}

selectRole('youth');
renderShell();
