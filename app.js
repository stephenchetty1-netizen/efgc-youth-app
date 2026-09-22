let loginRole = 'youth';
let session = null; // Supabase profile is the role authority; localStorage is not.
const $ = (s) => document.querySelector(s);
const escapeHtml = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtDate = (v) => v ? new Date(v).toLocaleString('en-ZA', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '';

const dailyScriptures = [
  { ref:'Matthew 5:16', text:'Let your light so shine before men, that they may see your good works, and glorify your Father which is in heaven.' },
  { ref:'Philippians 4:13', text:'I can do all things through Christ which strengtheneth me.' },
  { ref:'Psalm 119:105', text:'Thy word is a lamp unto my feet, and a light unto my path.' },
  { ref:'Isaiah 40:31', text:'They that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles.' },
  { ref:'Joshua 1:9', text:'Be strong and of a good courage; be not afraid: for the LORD thy God is with thee whithersoever thou goest.' },
  { ref:'Psalm 46:10', text:'Be still, and know that I am God.' },
  { ref:'Romans 8:28', text:'All things work together for good to them that love God, to them who are the called according to his purpose.' },
];

function selectRole() {
  // Registration is always Youth; existing user permissions come from the verified Supabase profile.
  loginRole = 'youth';
  $('#loginTitle').textContent = 'EFGC Youth Sign In';
  $('#loginHint').textContent = 'One secure sign-in for all EFGC Youth members.';
  $('#youthSafeguardingFields')?.classList.add('hidden');
  $('#roleField')?.classList.add('hidden');
  $('#photoField')?.classList.add('hidden');
  $('#dobField')?.classList.add('hidden');
  $('#emailField')?.classList.add('hidden');
}

document.addEventListener('click', (e) => {
  const tab = e.target.closest('[data-tab]');
  if (tab && session) showTab(tab.dataset.tab);
});

document.addEventListener('change', (e) => {
  if (e.target?.id !== 'loginPhoto') return;
  const file = e.target.files?.[0];
  const preview = $('#photoPreview');
  if (!preview) return;
  preview.innerHTML = '';
  if (!file) return;
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 5 * 1024 * 1024) {
    preview.textContent = 'Use a JPG, PNG or WebP image up to 5 MB.';
    return;
  }
  const img = document.createElement('img');
  img.alt = 'Selected profile photo preview';
  img.src = URL.createObjectURL(file);
  img.onload = () => URL.revokeObjectURL(img.src);
  preview.appendChild(img);
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

function renderDailyScripture(){
  const now = new Date();
  const day = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000);
  const s = dailyScriptures[((day % dailyScriptures.length) + dailyScriptures.length) % dailyScriptures.length];
  const html = `<article class="card scripture-card"><small>DAILY SCRIPTURE • KJV</small><h3>${escapeHtml(s.ref)}</h3><p>${escapeHtml(s.text)}</p><strong>Build • Belong • Be a Light</strong></article>`;
  if ($('#scriptureCardHome')) $('#scriptureCardHome').innerHTML = html;
  if ($('#scriptureCard')) $('#scriptureCard').innerHTML = `<h2>Daily Scripture</h2>${html}`;
}

function renderShell(){
  const authenticated = Boolean(session?.uid);
  document.querySelectorAll('#mainMenu, .userbar').forEach(el => el.classList.toggle('hidden', !authenticated));
  if (!authenticated) {
    // V95 privacy: dynamically added Ministry / Planner / Attendance tabs must
    // disappear too. Do not leave an Admin's previous roster visible on logout.
    document.querySelectorAll('main > section.tab').forEach(el => {
      if (el.id !== 'login') el.classList.add('hidden');
    });
    for (const selector of [
      '#adminPanel', '#leaderList', '#profileCard', '#plannerRosterHost',
      '#attendanceAdminHost', '#leaderYearPlanner', '#v87MinistryHost',
      '#mineList', '#v87MemberList'
    ]) {
      const host = $(selector);
      if (host) host.replaceChildren();
    }
    $('#currentUser').textContent = 'Not signed in';
    $('#adminMenu')?.classList.add('hidden');
    showLogin();
    return;
  }
  $('#currentUser').textContent = `${session.name || 'EFGC Member'} • ${session.role}${session.approval_status === 'pending' ? ' • Pending approval' : ''}`;
  $('#adminMenu')?.classList.toggle('hidden', session.role !== 'admin');
  hideLogin();
  renderDailyScripture();
  showTab('home');
}

function card(title, body, meta='') {
  return `<article class="card"><h3>${escapeHtml(title)}</h3>${meta ? `<small>${escapeHtml(meta)}</small>` : ''}<p>${escapeHtml(body)}</p></article>`;
}

function adminProfileCard(p){
  const isArchived = Boolean(p.archived_at);
  const pendingLeader = !isArchived && p.role === 'leader' && p.approval_status === 'pending';
  const approvedLeader = !isArchived && p.role === 'leader' && p.approval_status === 'approved';
  const eligibleYouth = !isArchived && p.role === 'youth' && p.approval_status === 'approved';
  const approvalActions = pendingLeader
    ? `<button class="primary-login" type="button" onclick="adminSetLeaderApproval('${p.id}','approved')">Approve Leader</button><button class="ghost-login" type="button" onclick="adminSetLeaderApproval('${p.id}','rejected')">Reject</button>`
    : eligibleYouth
      ? `<button class="primary-login" type="button" onclick="adminApproveAsLeader('${p.id}')">Approve as Leader</button>`
      : approvedLeader
        ? `<button class="ghost-login" type="button" onclick="adminRevokeLeader('${p.id}')">Remove Leader Access</button>`
        : '';
  const resetAction = !isArchived && p.role !== 'admin' ? `<button class="ghost-login member-password-reset" type="button" data-user-id="${escapeHtml(p.id)}" data-user-name="${escapeHtml(p.full_name)}">Reset Password</button>` : '';
  const archiveAction = p.role !== 'admin'
    ? isArchived
      ? `<button class="ghost-login" type="button" onclick="adminArchiveMember('${p.id}',false)">Restore account</button>`
      : `<button class="ghost-login" type="button" onclick="adminArchiveMember('${p.id}',true)">Archive account</button>`
    : '';
  return `<article class="card v87-member-card" data-member-search="${escapeHtml((p.full_name+' '+(p.phone||'')+' '+p.role+' '+p.approval_status).toLowerCase())}" data-member-archived="${isArchived}">
    <h3>${escapeHtml(p.full_name)}</h3><small>${escapeHtml(p.leader_role || '')}</small>
    <p>${escapeHtml(p.role + ' • ' + (isArchived ? 'Archived' : p.approval_status))}</p>
    <div class="admin-actions">${approvalActions}${resetAction}${archiveAction}</div>
  </article>`;
}

function adminTools(){
  return `<div class="security-grid">
    <article class="card"><h3>Create Youth Event</h3><label>Event title<input id="adminEventTitle" type="text" placeholder="Youth Meeting"></label><label>Date & time<input id="adminEventDate" type="datetime-local"></label><label>Theme<input id="adminEventTheme" type="text" placeholder="Optional theme"></label><label>Scripture<input id="adminEventScripture" type="text" placeholder="e.g. Matthew 5:16"></label><button class="primary-login" type="button" onclick="adminCreateEvent()">Create Event</button></article>
    <article class="card"><h3>Publish News</h3><label>Announcement<textarea id="adminNewsContent" rows="5" placeholder="Write an approved EFGC Youth update"></textarea></label><button class="primary-login" type="button" onclick="adminPublishNews()">Publish Update</button></article>
    ${session?.phone ? '' : `<article class="card"><h3>Link your Admin cellphone</h3><p>One-time setup: use your existing Admin password to link your South African cellphone number. You can then use that number on the single login screen. Until then, sign in with username <strong>admin</strong>.</p><label>Your cellphone<input id="adminLinkPhone" type="tel" inputmode="tel" autocomplete="tel" placeholder="071 234 5678"></label><label>Confirm current Admin password<input id="adminLinkConfirmPassword" type="password" autocomplete="current-password" placeholder="Current Admin password"></label><button id="adminLinkButton" class="primary-login" type="button" onclick="linkAdminCellphone()">Link Admin cellphone</button><p id="adminLinkMessage" role="status" class="login-message"></p></article>`}
  </div><p id="adminActionMessage" class="login-message"></p>`;
}

function setAdminMessage(text){ const el=$('#adminActionMessage'); if(el) el.textContent=text; }

window.adminSetLeaderApproval = async (id, status) => {
  if (session?.role !== 'admin') return;
  try {
    setAdminMessage('Saving Leader decision…');
    await EFGCLive.adminSetLeaderApproval(id, status);
    await renderLiveData();
    setAdminMessage(status === 'approved' ? 'Leader approved successfully.' : 'Leader application rejected.');
  } catch(e){ setAdminMessage(`Could not update Leader: ${e.message}`); }
};

window.adminApproveAsLeader = async (id) => {
  if (session?.role !== 'admin' || !session.uid) return;
  // Requires an explicit decision by the signed-in Admin, never by the member.
  if (!window.confirm('Approve this Youth member for EFGC Leader access?')) return;
  try {
    setAdminMessage('Approving Leader access…');
    await EFGCLive.adminPromoteYouth(id);
    await renderLiveData();
    setAdminMessage('Youth member approved as Leader. Leader tools will unlock on their next sign-in or session refresh.');
  } catch (e) {
    setAdminMessage('Leader approval failed: ' + (e.message || 'Check Admin permissions.'));
  }
};

window.adminRevokeLeader = async (id) => {
  if (session?.role !== 'admin' || !session.uid) return;
  if (!window.confirm('Remove this member’s EFGC Leader access and return them to Youth access?')) return;
  try {
    setAdminMessage('Removing Leader access…');
    await EFGCLive.adminDemoteLeader(id);
    await renderLiveData();
    setAdminMessage('Leader access removed. This account now has Youth permissions.');
  } catch (e) {
    setAdminMessage('Could not remove Leader access: ' + (e.message || 'Check Admin permissions.'));
  }
};

window.adminCreateEvent = async () => {
  if (session?.role !== 'admin') return;
  const title=$('#adminEventTitle')?.value.trim();
  const localDate=$('#adminEventDate')?.value;
  const theme=$('#adminEventTheme')?.value.trim() || '';
  const scripture=$('#adminEventScripture')?.value.trim() || '';
  if (!title || !localDate) return setAdminMessage('Event title and date/time are required.');
  try {
    const d=new Date(localDate);
    if (Number.isNaN(d.getTime())) throw new Error('Enter a valid event date and time.');
    setAdminMessage('Creating event…');
    await EFGCLive.adminCreateEvent({ title, event_date:d.toISOString(), theme, scripture });
    await renderLiveData();
    setAdminMessage('Event created successfully.');
  } catch(e){ setAdminMessage(`Could not create event: ${e.message}`); }
};

window.adminPublishNews = async () => {
  if (session?.role !== 'admin') return;
  const content=$('#adminNewsContent')?.value.trim();
  if (!content) return setAdminMessage('Write an announcement before publishing.');
  try {
    setAdminMessage('Publishing update…');
    await EFGCLive.adminPublishNews(content);
    await renderLiveData();
    setAdminMessage('News update published.');
  } catch(e){ setAdminMessage(`Could not publish update: ${e.message}`); }
};

async function renderLiveData(){
  if (!session?.uid || !window.EFGCLive) return;
  const uidAtStart = session.uid;
  const stillCurrent = () => session?.uid === uidAtStart;
  const errors=[];
  try {
    const events = await EFGCLive.events();
    if (!stillCurrent()) return;
    $('#eventList').innerHTML = events.length ? events.map(e => card(e.title, [e.theme,e.scripture].filter(Boolean).join(' • ') || 'EFGC Youth event', fmtDate(e.event_date))).join('') : '<article class="card v94-empty-panel"><span class="v94-empty-icon" aria-hidden="true">▦</span><small>YOUTH CALENDAR</small><h3>No events published yet</h3><p>When an EFGC Youth meeting is published, its date and details will appear here.</p>'+ (session.role==='admin' ? '<button class="v94-create" type="button" data-v87-go="admin" data-v94-target="adminEventTitle">Create Youth Event →</button>' : '') + '</article>';
  } catch(e){ errors.push(`Events: ${e.message}`); }

  try {
    const news = await EFGCLive.news();
    if (!stillCurrent()) return;
    const html = news.length ? news.map(n => card('EFGC Youth Update', n.content, fmtDate(n.published_at))).join('') : '<article class="card v94-empty-panel"><span class="v94-empty-icon" aria-hidden="true">▤</span><small>EFGC YOUTH NEWS</small><h3>No announcements published yet</h3><p>Approved ministry notices and Youth updates will be displayed here.</p>'+ (session.role==='admin' ? '<button class="v94-create" type="button" data-v87-go="admin" data-v94-target="adminNewsContent">Publish announcement →</button>' : '') + '</article>';
    $('#newsList').innerHTML = html;
    $('#homeNews').innerHTML = news.length ? news.slice(0,3).map(n => card('EFGC Youth Update', n.content, fmtDate(n.published_at))).join('') : card('Stay connected','No announcements have been published yet. New EFGC Youth updates will appear here.');
  } catch(e){ errors.push(`News: ${e.message}`); }

  try {
    const leaders = await EFGCLive.approvedLeaders();
    if (!stillCurrent()) return;
    $('#leaderList').innerHTML = `<h2>Approved Youth Leaders</h2>` + (leaders.length ? leaders.map(l => card(l.full_name, l.leader_role || 'EFGC Youth Leader', l.phone || '')).join('') : card('Leader directory','Approved leaders will appear here.'));
  } catch(e){ errors.push(`Leaders: ${e.message}`); }

  if (session.role === 'youth') {
    try {
      const rows = await EFGCLive.myAttendance(session.uid);
    if (!stillCurrent()) return;
      const approved = rows.filter(r => r.events?.attendance_approved);
      const attended = approved.filter(r => r.status === 'present').length;
      $('#mineList').innerHTML = `<article class="card"><h3>${attended} / ${approved.length}</h3><p>Approved meetings attended / held</p></article>` + approved.map(r => card(r.events?.title || 'Youth meeting', r.status === 'present' ? 'Present' : r.status === 'excused' ? 'Excused' : 'Absent', fmtDate(r.events?.event_date))).join('');
    } catch(e){ errors.push(`Attendance: ${e.message}`); }
  } else {
    $('#mineList').innerHTML = card('Attendance','Personal youth attendance is shown only on Youth accounts.');
  }

  if (roleAllowed(session.role, session.approval_status)) {
    try {
      const planner = await EFGCLive.planner();
    if (!stillCurrent()) return;
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
    if (!stillCurrent()) return;
      const pending = profiles.filter(p => p.role === 'leader' && p.approval_status === 'pending').length;
      $('#adminPanel').innerHTML = `<h2>Admin Centre</h2><article class="card"><h3>${profiles.length} account${profiles.length===1?'':'s'}</h3><p>${pending} pending Leader application${pending===1?'':'s'}.</p></article>${adminTools()}<h2>Member Directory</h2><label class="v87-search">Search members<input id="v87MemberSearch" type="search" placeholder="Search name, role or cellphone" autocomplete="off"></label><label class="v87-archive-check"><input id="v87ShowArchived" type="checkbox"> Show archived accounts</label><div id="v87MemberSearchStatus" aria-live="polite"></div><div id="v87MemberList">` + profiles.map(adminProfileCard).join('') + '</div>';
    } catch(e){ errors.push(`Admin: ${e.message}`); }
  } else {
    $('#adminPanel').innerHTML='';
  }

  if (!stillCurrent()) return;
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
