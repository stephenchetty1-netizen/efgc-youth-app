/** EFGC Youth v43 — discoverable Planner, Duty Roster and Attendance systems. */
(() => {
  const $ = (s) => document.querySelector(s);
  const esc = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const enc = (v) => encodeURIComponent(String(v));
  const jsonHeaders = { 'Content-Type':'application/json', Prefer:'return=representation' };
  const DUTIES = ['welcome','energizer','lesson','closing'];
  const dutyLabel = {welcome:'Welcome',energizer:'Energizer',lesson:'Lesson',closing:'Closing'};
  let plannerCache = [];
  let dutyCache = [];
  let leaderCache = [];
  let eventCache = [];
  let youthCache = [];
  let activeAttendanceEventId = null;
  let attendanceLoadVersion = 0;
  let attendanceMutationBusy = false;
  let activeRosterPlannerId = null;

  function currentSession(){ try { return typeof session !== 'undefined' ? session : null; } catch { return null; } }
  function approvedStaff(s=currentSession()){ return Boolean(s && (s.role==='admin' || (s.role==='leader' && s.approval_status==='approved'))); }
  function isAdmin(){ return currentSession()?.role === 'admin'; }
  function setLine(id,text,kind=''){ const el=$(id); if(el){ el.textContent=text; el.className=`toast-line ${kind}`.trim(); } }
  function formatDate(v){ if(!v) return ''; const d=new Date(`${v}T00:00:00`); return d.toLocaleDateString('en-ZA',{weekday:'short',day:'2-digit',month:'short',year:'numeric'}); }
  function formatEventDate(v){ if(!v) return ''; return new Date(v).toLocaleString('en-ZA',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}); }
  function dutyStatusClass(v){ return ['confirmed','replacement_requested','pending'].includes(v) ? v : 'pending'; }
  function statusText(v){ return v==='confirmed'?'Confirmed':v==='replacement_requested'?'Needs replacement':'Pending'; }
  async function rest(path, options={}){ return EFGCAuth.rest(path, options); }

  function syncRoleMenus(){
    const s=currentSession();
    const staff=approvedStaff(s);
    $('#plannerMenu')?.classList.toggle('hidden', !staff);
    $('#attendanceMenu')?.classList.toggle('hidden', s?.role !== 'admin');
    document.querySelector('[data-tab="mine"]')?.classList.toggle('hidden', Boolean(s && s.role !== 'youth'));
    if (!staff) $('#plannerRoster')?.classList.add('hidden');
    if (s?.role !== 'admin') $('#attendanceAdmin')?.classList.add('hidden');
    if (!s) {
      $('#plannerMenu')?.classList.add('hidden');
      $('#attendanceMenu')?.classList.add('hidden');
    }
  }

  function staffEmpty(title,body){ return `<div class="empty-state"><strong>${esc(title)}</strong><div class="section-note" style="margin-top:6px">${esc(body)}</div></div>`; }

  async function loadPlannerData(){
    const [plans,duties,leaders] = await Promise.all([EFGCLive.planner(), EFGCLive.duties(), EFGCLive.approvedLeaders()]);
    plannerCache = plans || [];
    dutyCache = duties || [];
    leaderCache = leaders || [];
  }

  function assignmentsFor(plannerId){ return dutyCache.filter(d => Number(d.planner_id)===Number(plannerId)); }
  function leaderName(id){ return leaderCache.find(l => l.leader_id===id)?.full_name || 'Unassigned'; }

  function renderDutyChip(duty, assignment, s){
    if(!assignment) return `<div class="duty-chip"><b>${dutyLabel[duty]}</b><span>Unassigned</span><span class="status-pill risk">Gap</span></div>`;
    const mine = s?.role==='leader' && assignment.leader_id===s.uid;
    const response = mine ? `<div class="duty-response"><button class="mini-button success" type="button" onclick="respondToDuty(${Number(assignment.id)},'confirmed')">Confirm</button><button class="mini-button warn" type="button" onclick="requestDutyReplacement(${Number(assignment.id)})">Request replacement</button></div>` : '';
    return `<div class="duty-chip"><b>${dutyLabel[duty]}</b><span>${esc(leaderName(assignment.leader_id))}</span><span class="status-pill ${dutyStatusClass(assignment.status)}">${statusText(assignment.status)}</span>${response}</div>`;
  }

  function plannerAdminControls(){
    const year = new Date().getFullYear();
    return `<div class="module-grid">
      <article class="module-card"><span class="module-kicker">Annual planner</span><h3>Generate weekly planner</h3><p>Create the 52/53-week planning structure for a year. Existing weeks are kept.</p><div class="control-grid"><label>Year<input id="plannerYear" type="number" min="2024" max="2100" value="${year}"></label></div><div class="inline-actions"><button class="mini-button primary" type="button" onclick="generateYearPlanner()">Generate year</button></div><div id="plannerGenerateMessage" class="toast-line"></div></article>
      <article class="module-card"><span class="module-kicker">Week plan</span><h3>Add or update a week</h3><div class="control-grid"><label>Week starting<input id="plannerWeekStart" type="date"></label><label>Meeting title<input id="plannerMeetingTitle" type="text" placeholder="Youth Meeting"></label><label>Theme<input id="plannerTheme" type="text" placeholder="Theme"></label><label>Scripture<input id="plannerScripture" type="text" placeholder="e.g. Matthew 5:16"></label><label>Published<select id="plannerPublished"><option value="false">Draft</option><option value="true">Published</option></select></label></div><div class="inline-actions"><button class="mini-button primary" type="button" onclick="savePlannerWeek()">Save week</button><button class="mini-button" type="button" onclick="clearPlannerForm()">Clear</button></div><div id="plannerSaveMessage" class="toast-line"></div></article>
    </div>`;
  }

  function plannerSummary(){
    const published=plannerCache.filter(p=>p.published).length;
    const gaps=plannerCache.reduce((n,p)=>n + DUTIES.filter(d=>!assignmentsFor(p.id).some(a=>a.duty_type===d)).length,0);
    const replacements=dutyCache.filter(d=>d.status==='replacement_requested').length;
    return `<div class="summary-strip"><div class="summary-box"><strong>${plannerCache.length}</strong><span>PLANNED WEEKS</span></div><div class="summary-box"><strong>${published}</strong><span>PUBLISHED</span></div><div class="summary-box"><strong>${dutyCache.length}</strong><span>DUTIES ASSIGNED</span></div><div class="summary-box"><strong>${gaps+replacements}</strong><span>GAPS / AT RISK</span></div></div>`;
  }

  function plannerWeekCard(p,s){
    const asg=assignmentsFor(p.id);
    const byType=new Map(asg.map(a=>[a.duty_type,a]));
    const manage=isAdmin()?`<div class="inline-actions"><button class="mini-button primary" type="button" onclick="openRosterEditor(${Number(p.id)})">Manage roster</button><button class="mini-button" type="button" onclick="editPlannerWeek(${Number(p.id)})">Edit week</button></div>`:'';
    return `<article class="module-card planner-week ${p.published?'':'unpublished'}"><div class="planner-week-head"><div><div class="planner-date">${esc(formatDate(p.week_start))}</div><h3>${esc(p.meeting_title||'Youth Meeting')}</h3><div class="planner-meta">${esc([p.theme,p.scripture].filter(Boolean).join(' • ')||'Theme and Scripture not set')}</div></div><span class="status-pill ${p.published?'published':'draft'}">${p.published?'Published':'Draft'}</span></div><div class="duty-chips">${DUTIES.map(d=>renderDutyChip(d,byType.get(d),s)).join('')}</div>${manage}</article>`;
  }

  window.renderPlannerRoster = async () => {
    const host=$('#plannerRosterHost'); if(!host) return;
    const s=currentSession();
    if(!approvedStaff(s)){ host.innerHTML=staffEmpty('Restricted','Year Planner and Duty Roster are available only to approved Leaders and Admin.'); return; }
    host.innerHTML='<article class="module-card"><p>Loading Year Planner and Duty Roster…</p></article>';
    try{
      await loadPlannerData();
      const visiblePlans=s.role==='admin'?plannerCache:plannerCache.filter(p=>p.published);
      const controls=s.role==='admin'?plannerAdminControls():'';
      const rosterEditor='<div id="rosterEditor"></div>';
      const list=visiblePlans.length?`<div class="planner-list">${visiblePlans.map(p=>plannerWeekCard(p,s)).join('')}</div>`:staffEmpty('No planner weeks yet',s.role==='admin'?'Generate the annual planner or add the first week above.':'The Admin has not published the ministry planner yet.');
      host.innerHTML=`<div class="module-heading"><div><span class="module-kicker">Passing on the Baton</span><h2>Year Planner & Duty Roster</h2><p>Welcome • Energizer • Lesson • Closing — planned, assigned and confirmed.</p></div></div>${controls}${plannerSummary()}${rosterEditor}${list}`;
      if(activeRosterPlannerId && isAdmin()) openRosterEditor(activeRosterPlannerId,false);
    }catch(e){ host.innerHTML=staffEmpty('Planner could not load',e.message); }
  };

  window.clearPlannerForm = () => {
    ['#plannerWeekStart','#plannerMeetingTitle','#plannerTheme','#plannerScripture'].forEach(id=>{if($(id)) $(id).value='';});
    if($('#plannerPublished')) $('#plannerPublished').value='false';
    setLine('#plannerSaveMessage','');
  };

  window.editPlannerWeek = (id) => {
    const p=plannerCache.find(x=>Number(x.id)===Number(id)); if(!p) return;
    $('#plannerWeekStart').value=p.week_start||'';
    $('#plannerMeetingTitle').value=p.meeting_title||'';
    $('#plannerTheme').value=p.theme||'';
    $('#plannerScripture').value=p.scripture||'';
    $('#plannerPublished').value=String(Boolean(p.published));
    $('#plannerWeekStart').scrollIntoView({behavior:'smooth',block:'center'});
  };

  window.savePlannerWeek = async () => {
    if(!isAdmin()) return;
    const week_start=$('#plannerWeekStart')?.value;
    const meeting_title=$('#plannerMeetingTitle')?.value.trim()||'Youth Meeting';
    const theme=$('#plannerTheme')?.value.trim()||null;
    const scripture=$('#plannerScripture')?.value.trim()||null;
    const published=$('#plannerPublished')?.value==='true';
    if(!week_start) return setLine('#plannerSaveMessage','Choose the week starting date.','error');
    try{
      setLine('#plannerSaveMessage','Saving week…');
      await rest('year_planner?on_conflict=week_start',{method:'POST',headers:{'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify({week_start,meeting_title,theme,scripture,published})});
      setLine('#plannerSaveMessage','Week saved.','ok');
      activeRosterPlannerId=null;
      await renderPlannerRoster();
    }catch(e){ setLine('#plannerSaveMessage',`Could not save week: ${e.message}`,'error'); }
  };

  window.generateYearPlanner = async () => {
    if(!isAdmin()) return;
    const year=Number($('#plannerYear')?.value);
    if(!Number.isInteger(year)||year<2024||year>2100) return setLine('#plannerGenerateMessage','Enter a valid year.','error');
    const rows=[];
    let d=new Date(Date.UTC(year,0,1));
    while(d.getUTCDay()!==1) d.setUTCDate(d.getUTCDate()+1);
    while(d.getUTCFullYear()===year){ rows.push({week_start:d.toISOString().slice(0,10),meeting_title:'Youth Meeting',published:false}); d.setUTCDate(d.getUTCDate()+7); }
    try{
      setLine('#plannerGenerateMessage',`Creating ${rows.length} planner weeks…`);
      await rest('year_planner?on_conflict=week_start',{method:'POST',headers:{'Content-Type':'application/json',Prefer:'resolution=ignore-duplicates,return=minimal'},body:JSON.stringify(rows)});
      setLine('#plannerGenerateMessage',`${rows.length}-week planner ready. Existing weeks were kept.`,'ok');
      await renderPlannerRoster();
    }catch(e){ setLine('#plannerGenerateMessage',`Could not generate planner: ${e.message}`,'error'); }
  };

  window.openRosterEditor = (plannerId,scroll=true) => {
    if(!isAdmin()) return;
    activeRosterPlannerId=Number(plannerId);
    const host=$('#rosterEditor'); if(!host) return;
    const p=plannerCache.find(x=>Number(x.id)===activeRosterPlannerId); if(!p) return;
    const existing=assignmentsFor(activeRosterPlannerId);
    const byType=new Map(existing.map(a=>[a.duty_type,a]));
    const leaderOptions=(selected)=>`<option value="">Unassigned</option>${leaderCache.map(l=>`<option value="${esc(l.leader_id)}" ${l.leader_id===selected?'selected':''}>${esc(l.full_name)}${l.leader_role?` — ${esc(l.leader_role)}`:''}</option>`).join('')}`;
    host.innerHTML=`<article class="module-card roster-editor"><span class="module-kicker">Roster editor</span><h3>${esc(p.meeting_title||'Youth Meeting')} — ${esc(formatDate(p.week_start))}</h3>${leaderCache.length?'':`<div class="section-note">No approved Leaders are available yet. Approve Leader accounts in Admin Centre before assigning duties.</div>`}${DUTIES.map(d=>{const a=byType.get(d);return `<div class="roster-row"><div class="roster-duty">${dutyLabel[d]}</div><select class="roster-leader-select" data-duty="${d}" data-current-id="${a?.id||''}" data-current-leader="${esc(a?.leader_id||'')}">${leaderOptions(a?.leader_id||'')}</select><span class="status-pill ${dutyStatusClass(a?.status)}">${a?statusText(a.status):'Gap'}</span></div>`;}).join('')}<div class="inline-actions"><button class="mini-button primary" type="button" onclick="saveRosterAssignments()">Save roster</button><button class="mini-button" type="button" onclick="closeRosterEditor()">Close</button></div><div id="rosterSaveMessage" class="toast-line"></div></article>`;
    if(scroll) host.scrollIntoView({behavior:'smooth',block:'start'});
  };

  window.closeRosterEditor = () => { activeRosterPlannerId=null; if($('#rosterEditor')) $('#rosterEditor').innerHTML=''; };

  window.saveRosterAssignments = async () => {
    if(!isAdmin()||!activeRosterPlannerId) return;
    const selects=[...document.querySelectorAll('.roster-leader-select')];
    try{
      setLine('#rosterSaveMessage','Saving roster…');
      for(const sel of selects){
        const duty_type=sel.dataset.duty;
        const currentId=Number(sel.dataset.currentId||0);
        const currentLeader=sel.dataset.currentLeader||'';
        const leader_id=sel.value||'';
        if(!leader_id && currentId){ await rest(`duty_assignments?id=eq.${currentId}`,{method:'DELETE',headers:{Prefer:'return=minimal'}}); continue; }
        if(!leader_id || leader_id===currentLeader) continue;
        await rest('duty_assignments?on_conflict=planner_id,duty_type',{method:'POST',headers:{'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify({planner_id:activeRosterPlannerId,duty_type,leader_id,status:'pending',replacement_note:null})});
      }
      setLine('#rosterSaveMessage','Roster saved and new assignments marked Pending.','ok');
      await renderPlannerRoster();
    }catch(e){ setLine('#rosterSaveMessage',`Could not save roster: ${e.message}`,'error'); }
  };

  window.respondToDuty = async (id,status) => {
    const s=currentSession(); if(s?.role!=='leader'||!['confirmed','replacement_requested'].includes(status)) return;
    try{
      await rest(`duty_assignments?id=eq.${Number(id)}&leader_id=eq.${enc(s.uid)}`,{method:'PATCH',headers:jsonHeaders,body:JSON.stringify({status,replacement_note:status==='confirmed'?null:undefined})});
      await renderPlannerRoster();
    }catch(e){ alert(`Duty response could not be saved: ${e.message}`); }
  };

  window.requestDutyReplacement = async (id) => {
    const s=currentSession(); if(s?.role!=='leader') return;
    const note=prompt('Optional note for the Admin about the replacement request:','') ?? null;
    if(note===null) return;
    try{
      await rest(`duty_assignments?id=eq.${Number(id)}&leader_id=eq.${enc(s.uid)}`,{method:'PATCH',headers:jsonHeaders,body:JSON.stringify({status:'replacement_requested',replacement_note:note.trim()||null})});
      await renderPlannerRoster();
    }catch(e){ alert(`Replacement request could not be saved: ${e.message}`); }
  };

  function attendanceCreateCard(){
    return '<article class="module-card v101-attendance-create"><span class="module-kicker">Start the attendance register</span>'+
      '<h3>Create a Youth meeting</h3><p>Attendance can only be recorded against a saved Youth meeting. Creating a meeting does not mark anybody present or send invitations.</p>'+
      '<div class="control-grid"><label>Meeting title<input id="attendanceNewTitle" type="text" value="Youth Meeting" maxlength="100"></label>'+
      '<label>Date & time<input id="attendanceNewDate" type="datetime-local" required></label>'+
      '<label>Theme<input id="attendanceNewTheme" type="text" placeholder="Optional" maxlength="160"></label>'+
      '<label>Scripture<input id="attendanceNewScripture" type="text" placeholder="Optional" maxlength="160"></label></div>'+
      '<div class="inline-actions"><button class="mini-button primary" type="button" id="v101CreateEvent" onclick="createAttendanceEvent()">Create Youth meeting</button></div>'+
      '<p id="attendanceCreateMessage" role="status" class="toast-line" aria-live="polite"></p></article>';
  }

  function attendanceYouthRegister(){
    const youth=(Array.isArray(youthCache)?youthCache:[]);
    return '<article class="module-card v101-youth-register"><span class="module-kicker">Approved members • Attendance eligibility</span>'+
      '<h3>Youth Register <span class="v101-count">'+youth.length+'</span></h3>'+
      '<p>These are registered, approved Youth accounts from the secure EFGC database. Only these Youth appear in meeting attendance. Leaders are listed separately in Members.</p>'+
      (youth.length ?
        '<div class="v101-youth-rows">'+youth.map(p=>
          '<div class="v101-youth-row"><span aria-hidden="true">✓</span><strong>'+esc(p.full_name||'Youth member')+'</strong><small>YOUTH</small></div>'
        ).join('')+'</div>' :
        '<div class="empty-state"><strong>No approved Youth in this register</strong><div>Check member registration and account status in Admin Centre.</div></div>')+
      '<div class="inline-actions"><button type="button" class="mini-button" data-tab="staffDirectory">View Youth & Leaders directory</button>'+
      '<button type="button" class="mini-button" data-tab="admin">Open Admin Centre</button></div></article>';
  }

  window.renderAttendanceAdmin = async (preferredEventId=null) => {
    const host=$('#attendanceAdminHost');
    if(!host) return;
    const s=currentSession(), request=++attendanceLoadVersion;
    if(!s || s.role!=='admin' || s.approval_status!=='approved'){
      eventCache=[];youthCache=[];activeAttendanceEventId=null;
      host.innerHTML=staffEmpty('Admin only','Only approved EFGC Admins can record or finalize Youth attendance.');
      return;
    }
    const uid=s.uid;
    // Show meaningful content before any network promise settles: never a white/blank tab.
    host.innerHTML='<div class="module-heading"><div><span class="module-kicker">EFGC • SAFEGUARDED</span>'+
      '<h2>Attendance Register</h2><p>Checking meeting records and approved Youth…</p></div></div>'+
      '<article class="module-card" role="status">Loading your Youth register…</article>';
    try{
      const profile=await EFGCAuth.getMyProfile();
      if(request!==attendanceLoadVersion || currentSession()?.uid!==uid) return;
      if(!profile || profile.id!==uid || profile.archived_at ||
         profile.role!=='admin' || profile.approval_status!=='approved'){
        host.innerHTML=staffEmpty('Admin access could not be verified',
          'Sign in again with your approved Admin account to open protected attendance records.');
        return;
      }
      const [eventRows,youthRows] = await Promise.all([
        EFGCLive.events(),EFGCLive.adminYouthProfiles()
      ]);
      if(request!==attendanceLoadVersion || currentSession()?.uid!==uid ||
          $('#attendanceAdmin')?.classList.contains('hidden')) return;
      if(!Array.isArray(eventRows)||!Array.isArray(youthRows))
        throw new Error('Invalid records received. Try refreshing.');
      eventCache=eventRows;
      youthCache=youthRows;
      const events=[...eventCache].sort((a,b)=>new Date(b.event_date)-new Date(a.event_date));
      if(preferredEventId) activeAttendanceEventId=Number(preferredEventId);
      if(!activeAttendanceEventId && events.length) activeAttendanceEventId=Number(events[0].id);
      if(activeAttendanceEventId && !events.some(e=>Number(e.id)===activeAttendanceEventId))
        activeAttendanceEventId=events.length?Number(events[0].id):null;
      const eventSelect=events.length?
        '<div class="attendance-toolbar"><label>Select meeting<select id="attendanceEventSelect">'+
        events.map(e=>'<option value="'+Number(e.id)+'" '+
          (Number(e.id)===activeAttendanceEventId?'selected':'')+'>'+esc(e.title)+
          ' — '+esc(formatEventDate(e.event_date))+
          (e.attendance_approved?' • Finalized':'')+'</option>').join('')+
        '</select></label><button class="mini-button primary" type="button" onclick="openAttendanceEvent()">Open register</button></div>':
        staffEmpty('No Youth meetings are in the app yet',
          'Create a Youth meeting below, then choose Present, Absent or Excused for each approved Youth.');
      host.innerHTML='<div class="module-heading"><div><span class="module-kicker">Record • complete • approve</span>'+
        '<h2>Attendance Register</h2><p>Select a saved meeting, mark each Youth, then Save. Finalize only when the register is correct.</p></div></div>'+
        '<div class="summary-strip"><div class="summary-box"><strong>'+events.length+'</strong><span>MEETINGS</span></div>'+
        '<div class="summary-box"><strong>'+youthCache.length+'</strong><span>REGISTERED YOUTH</span></div>'+
        '<div class="summary-box"><strong>'+events.filter(e=>e.attendance_approved).length+
        '</strong><span>FINALIZED</span></div></div>'+
        eventSelect+'<div id="attendanceRegisterHost"></div>'+
        attendanceYouthRegister()+attendanceCreateCard();
      if(activeAttendanceEventId) await renderAttendanceRegister(activeAttendanceEventId,request,uid);
    }catch(e){
      if(request!==attendanceLoadVersion || currentSession()?.uid!==uid) return;
      host.innerHTML='<div class="module-heading"><h2>Attendance Register</h2></div>'+
        staffEmpty('Attendance could not refresh',e?.message||'Check your connection.')+
        '<button id="v101AttendanceRetry" type="button" class="mini-button primary">Retry loading</button>';
    }
  };

  window.openAttendanceEvent = async () => {
    if(!isAdmin()||currentSession()?.approval_status!=='approved')return;
    const id=Number($('#attendanceEventSelect')?.value);
    if(!id)return;
    activeAttendanceEventId=id;
    await renderAttendanceRegister(id,attendanceLoadVersion,currentSession()?.uid);
  };

  async function renderAttendanceRegister(eventId,request=attendanceLoadVersion,uid=currentSession()?.uid){
    const host=$('#attendanceRegisterHost');
    if(!host)return;
    const event=eventCache.find(e=>Number(e.id)===Number(eventId));
    if(!event)return;
    host.innerHTML='<article class="module-card"><p>Opening Youth attendance…</p></article>';
    try{
      const existing=await EFGCLive.adminAttendance(eventId);
      if(request!==attendanceLoadVersion||currentSession()?.uid!==uid ||
        Number(activeAttendanceEventId)!==Number(eventId) || !host.isConnected)return;
      if(!Array.isArray(existing))throw new Error('Attendance records were not returned.');
      const byYouth=new Map(existing.map(r=>[r.youth_id,r.status]));
      const present=[...byYouth.values()].filter(v=>v==='present').length;
      const rows=youthCache.length?youthCache.map(y=>{
        const st=byYouth.get(y.id)||'';
        return '<div class="attendance-row"><h3>'+esc(y.full_name)+
          '</h3><label>Status<select class="attendance-page-status" data-youth-id="'+esc(y.id)+
          '" '+(event.attendance_approved?'disabled':'')+'>'+
          '<option value="" '+(!st?'selected':'')+'>Select status…</option>'+
          '<option value="present" '+(st==='present'?'selected':'')+'>Present</option>'+
          '<option value="absent" '+(st==='absent'?'selected':'')+'>Absent</option>'+
          '<option value="excused" '+(st==='excused'?'selected':'')+'>Excused</option></select></label></div>';
      }).join(''):staffEmpty('No approved Youth yet','Youth accounts must be approved before recording attendance.');
      const controls=event.attendance_approved?
        '<div class="inline-actions"><span class="status-pill finalized">Finalized & locked</span>'+
        '<span class="attendance-count">'+present+' present</span></div>':
        '<div class="inline-actions"><button class="mini-button primary" type="button" id="v101SaveAttendance" onclick="saveAttendancePage(false)" '+
        (!youthCache.length?'disabled':'')+'>Save register</button>'+
        '<button class="mini-button success" type="button" id="v101FinalizeAttendance" onclick="saveAttendancePage(true)" '+
        (!youthCache.length || new Date(event.event_date).getTime()>Date.now()?'disabled':'')+'>Save & finalize</button></div>'+
        (new Date(event.event_date).getTime()>Date.now()?'<p class="section-note">You can save a draft now. Finalization becomes available after the meeting starts; reopen the register then.</p>':'');
      host.innerHTML='<article class="module-card"><div class="planner-week-head"><div>'+
        '<span class="module-kicker">Attendance</span><h3>'+esc(event.title)+'</h3>'+
        '<div class="planner-meta">'+esc(formatEventDate(event.event_date))+
        (event.theme?' • '+esc(event.theme):'')+'</div></div>'+
        '<span class="status-pill '+(event.attendance_approved?'finalized':'pending')+'">'+
        (event.attendance_approved?'Finalized':'Open')+'</span></div>'+
        '<div style="margin-top:10px">'+rows+'</div>'+controls+
        '<p id="attendanceSaveMessage" role="status" class="toast-line" aria-live="polite"></p></article>';
    }catch(e){
      if(request!==attendanceLoadVersion||currentSession()?.uid!==uid)return;
      host.innerHTML=staffEmpty('Register could not open',e?.message||'Retry opening the meeting.');
    }
  }

  function collectAttendance(){
    const selects=[...document.querySelectorAll('#attendanceRegisterHost .attendance-page-status')];
    if(!selects.length)throw new Error('There are no approved Youth in this meeting register.');
    const ids=new Set();
    return selects.map(s=>{
      if(!['present','absent','excused'].includes(s.value))
        throw new Error('Mark every Youth Present, Absent or Excused before saving.');
      const youth_id=s.dataset.youthId;
      if(ids.has(youth_id))throw new Error('Duplicate Youth in attendance form.');
      ids.add(youth_id);
      return {youth_id,status:s.value};
    });
  }

  window.saveAttendancePage = async(finalize=false) => {
    if(!isAdmin()||currentSession()?.approval_status!=='approved'||!activeAttendanceEventId||attendanceMutationBusy)return;
    const event=eventCache.find(e=>Number(e.id)===Number(activeAttendanceEventId));
    if(!event || event.attendance_approved)return setLine('#attendanceSaveMessage','This register is already finalized and locked.','error');
    if(finalize && new Date(event.event_date).getTime()>Date.now())
      return setLine('#attendanceSaveMessage','Attendance can only be finalized after the meeting starts.','error');
    const eventId=activeAttendanceEventId, uid=currentSession().uid, request=attendanceLoadVersion;
    const current=()=>currentSession()?.uid===uid && isAdmin() && currentSession()?.approval_status==='approved';
    const sameForm=()=>current() && request===attendanceLoadVersion && activeAttendanceEventId===eventId;
    attendanceMutationBusy=true;
    const btns=[...document.querySelectorAll('#v101SaveAttendance,#v101FinalizeAttendance')];
    btns.forEach(b=>b.disabled=true);
    try{
      const entries=collectAttendance();
      setLine('#attendanceSaveMessage',finalize?'Saving and finalizing…':'Saving attendance…');
      const saved=await EFGCLive.adminSaveAttendance(eventId,entries);
      if(!Array.isArray(saved)||saved.length!==entries.length)
        throw new Error('Not every attendance record was confirmed by the server. Register not finalized.');
      if(!current())return;
      if(finalize)await EFGCLive.adminFinalizeAttendance(eventId);
      if(!sameForm())return;
      await window.renderAttendanceAdmin(eventId);
      if(!current() || activeAttendanceEventId!==eventId)return;
      setLine('#attendanceSaveMessage',
        finalize?'Attendance finalized and locked.':'Attendance saved. You can continue editing before finalizing.','ok');
    }catch(e){if(sameForm())setLine('#attendanceSaveMessage','Could not save attendance: '+(e?.message||'Check your connection.'),'error');}
    finally{attendanceMutationBusy=false;btns.forEach(b=>{if(b.isConnected)b.disabled=b.id==='v101FinalizeAttendance' && new Date(event.event_date).getTime()>Date.now();});}
  };

  window.createAttendanceEvent = async() => {
    if(!isAdmin()||currentSession()?.approval_status!=='approved'||attendanceMutationBusy)return;
    const title=$('#attendanceNewTitle')?.value.trim()||'Youth Meeting';
    const localDate=$('#attendanceNewDate')?.value;
    const theme=$('#attendanceNewTheme')?.value.trim()||'';
    const scripture=$('#attendanceNewScripture')?.value.trim()||'';
    if(!localDate)return setLine('#attendanceCreateMessage','Choose the meeting date and time.','error');
    const date=new Date(localDate);
    if(!Number.isFinite(date.getTime()))
      return setLine('#attendanceCreateMessage','Choose a valid meeting date.','error');
    attendanceMutationBusy=true;
    const uid=currentSession().uid, request=attendanceLoadVersion;
    const button=$('#v101CreateEvent');if(button)button.disabled=true;
    try{
      setLine('#attendanceCreateMessage','Creating meeting…');
      const event=await EFGCLive.adminCreateEvent({title,event_date:date.toISOString(),theme,scripture});
      if(!event?.id)throw new Error('The server did not confirm a new meeting.');
      if(currentSession()?.uid!==uid || request!==attendanceLoadVersion)return;
      await window.renderAttendanceAdmin(event.id);
      setLine('#attendanceCreateMessage','Meeting created. The Youth register is ready to record attendance.','ok');
    }catch(e){if(currentSession()?.uid===uid && request===attendanceLoadVersion)setLine('#attendanceCreateMessage','Could not create meeting: '+(e?.message||'Check your connection.'),'error');}
    finally{attendanceMutationBusy=false;if(button?.isConnected)button.disabled=false;}
  };

  function renderAdminShortcuts(){
    const panel=$('#adminPanel'); if(!panel||!isAdmin()||$('#v43AdminShortcuts')) return;
    const box=document.createElement('div'); box.id='v43AdminShortcuts'; box.className='admin-shortcuts';
    box.innerHTML='<button class="admin-shortcut" type="button" data-tab="attendanceAdmin">✓ Record Attendance<span>Create a meeting, mark Youth, save and finalize</span></button><button class="admin-shortcut" type="button" data-tab="staffDirectory">☷ Youth Register<span>View approved Youth and Leaders</span></button><button class="admin-shortcut" type="button" data-tab="plannerRoster">≡ Planner & Duty Roster<span>Plan weeks, assign leaders and track confirmations</span></button>';
    panel.prepend(box);
  }

  document.addEventListener('click',(e)=>{
    const tab=e.target.closest('[data-tab]')?.dataset.tab;
    if(tab==='plannerRoster') setTimeout(renderPlannerRoster,0);
    // Attendance is loaded exactly once by the V101 showTab route hook.
    if(e.target.closest?.('#v101AttendanceRetry')) void window.renderAttendanceAdmin?.();
  });

  const priorRenderShell=window.renderShell;
  if(typeof priorRenderShell==='function') window.renderShell=function(...args){ const r=priorRenderShell.apply(this,args); syncRoleMenus(); return r; };
  const priorRenderLive=window.renderLiveData;
  if(typeof priorRenderLive==='function') window.renderLiveData=async function(...args){ const r=await priorRenderLive.apply(this,args); const legacy=$('#leaderYearPlanner'); if(legacy) legacy.innerHTML=''; syncRoleMenus(); renderAdminShortcuts(); return r; };

  syncRoleMenus();
  setTimeout(()=>{syncRoleMenus();renderAdminShortcuts();},500);
})();
