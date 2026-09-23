/** EFGC Youth v44 — main-leader profile, event media, week/date roster and branding fixes. */
(() => {
  const $ = (s) => document.querySelector(s);
  const esc = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const encPath = (path='') => String(path).split('/').map(encodeURIComponent).join('/');
  const jsonHeaders = { 'Content-Type':'application/json', Prefer:'return=representation' };
  const DUTIES = ['welcome','energizer','lesson','closing'];
  const DUTY_LABEL = { welcome:'Welcome', energizer:'Energizer', lesson:'Lesson', closing:'Closing' };
  let plannerCache = [], dutyCache = [], leaderCache = [];

  function currentSession(){ try { return session || null; } catch { return null; } }
  function isAdmin(){ return currentSession()?.role === 'admin'; }
  function isApprovedStaff(){ const s=currentSession(); return Boolean(s && (s.role==='admin' || (s.role==='leader' && s.approval_status==='approved'))); }
  function setText(id,text,kind=''){ const el=$(id); if(el){ el.textContent=text; el.className=`toast-line ${kind}`.trim(); } }
  function fmtDate(v){ if(!v) return ''; return new Date(`${v}T12:00:00`).toLocaleDateString('en-ZA',{weekday:'short',day:'2-digit',month:'short',year:'numeric'}); }
  function fmtEvent(v){ if(!v) return ''; return new Date(v).toLocaleString('en-ZA',{weekday:'short',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}); }
  function isoWeek(dateString){ const d=new Date(`${dateString}T12:00:00`); const u=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())); const day=u.getUTCDay()||7; u.setUTCDate(u.getUTCDate()+4-day); const yearStart=new Date(Date.UTC(u.getUTCFullYear(),0,1)); return Math.ceil((((u-yearStart)/86400000)+1)/7); }
  function eventImageUrl(path){ const c=window.EFGC_SUPABASE; return path&&c?.url ? `${c.url}/storage/v1/object/public/event-images/${encPath(path)}` : ''; }

  // v44 data fields.
  if (window.EFGCLive && window.EFGCAuth) {
    EFGCLive.events = async () => EFGCAuth.rest('events?select=id,title,event_date,theme,scripture,attendance_approved,post_content,image_path&order=event_date.asc');
    EFGCLive.approvedLeaders = async () => EFGCAuth.rest('leader_directory?select=leader_id,full_name,phone,leader_role,face_photo_path&order=full_name.asc');
    EFGCLive.adminCreateEvent = async ({title,event_date,theme=null,scripture=null,post_content=null,image_path=null}) => {
      const rows = await EFGCAuth.rest('events',{method:'POST',headers:jsonHeaders,body:JSON.stringify({title,event_date,theme:theme||null,scripture:scripture||null,post_content:post_content||null,image_path:image_path||null,attendance_approved:false})});
      if(!rows?.[0]?.id) throw new Error('The server did not confirm the new event. Please refresh before trying again.');
      return rows[0];
    };
  }

  async function uploadEventImage(file){
    if(!file) return null;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Event image must be JPG, PNG or WebP.');
    if(file.size>5*1024*1024) throw new Error('Event image must be 5 MB or smaller.');
    const auth=EFGCAuth.session(); const c=window.EFGC_SUPABASE;
    if(!auth?.access_token||!c?.url||!c?.publishableKey) throw new Error('Authentication required for event image upload.');
    const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';
    const path=`events/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
    const r=await fetch(`${c.url}/storage/v1/object/event-images/${encPath(path)}`,{method:'POST',headers:{apikey:c.publishableKey,Authorization:`Bearer ${auth.access_token}`,'Content-Type':file.type,'x-upsert':'false'},body:file});
    if(!r.ok){ const b=await r.json().catch(()=>({})); throw new Error(b.message||b.error||'Event image upload failed.'); }
    return path;
  }

  async function loadPrivatePhoto(img,path){
    if(!img||!path) return;
    try{
      const auth=EFGCAuth.session(); const c=window.EFGC_SUPABASE;
      if(!auth?.access_token||!c?.url) return;
      const r=await fetch(`${c.url}/storage/v1/object/authenticated/member-photos/${encPath(path)}`,{headers:{apikey:c.publishableKey,Authorization:`Bearer ${auth.access_token}`}});
      if(!r.ok) return;
      const blob=await r.blob(); const url=URL.createObjectURL(blob);
      img.src=url; img.classList.add('has-photo'); img.onload=()=>URL.revokeObjectURL(url);
    } catch {}
  }

  function enhanceAdminEventForm(){
    if(!isAdmin()) return;
    const cards=[...document.querySelectorAll('#adminPanel article.card')];
    const card=cards.find(c=>c.querySelector('h3')?.textContent.trim()==='Create Youth Event');
    if(!card||card.querySelector('#adminEventPost')) return;
    const button=card.querySelector('button'); if(!button) return;
    button.insertAdjacentHTML('beforebegin',`<label>Event post / details<textarea id="adminEventPost" rows="4" placeholder="Add the event message, instructions or announcement"></textarea></label><label>Event image / poster<input id="adminEventImage" type="file" accept="image/jpeg,image/png,image/webp"></label><div id="adminEventMediaPreview" class="event-media-preview"></div>`);
    button.textContent='Create / Publish Event';
    button.setAttribute('onclick','adminCreateEvent()');
    $('#adminEventImage')?.addEventListener('change',e=>{ const file=e.target.files?.[0],host=$('#adminEventMediaPreview'); if(!host) return; host.innerHTML=''; if(!file) return; const img=document.createElement('img'); img.src=URL.createObjectURL(file); img.onload=()=>URL.revokeObjectURL(img.src); host.appendChild(img); });
  }

  let publishingEvent=false;
  window.adminCreateEvent = async () => {
    if(!isAdmin() || publishingEvent) return;
    const account=currentSession();
    const title=$('#adminEventTitle')?.value.trim(); const localDate=$('#adminEventDate')?.value;
    const theme=$('#adminEventTheme')?.value.trim()||''; const scripture=$('#adminEventScripture')?.value.trim()||'';
    const post_content=$('#adminEventPost')?.value.trim()||''; const file=$('#adminEventImage')?.files?.[0]||null;
    if(!title||!localDate) return setAdminMessage?.('Event title and date/time are required.');
    publishingEvent=true;
    try{
      setAdminMessage?.('Publishing event…');
      const image_path=await uploadEventImage(file);
      if(currentSession()!==account) return;
      const d=new Date(localDate); if(Number.isNaN(d.getTime())) throw new Error('Enter a valid event date and time.');
      await EFGCLive.adminCreateEvent({title,event_date:d.toISOString(),theme,scripture,post_content,image_path});
      if(currentSession()!==account) return;
      await renderLiveData();
      if(currentSession()!==account) return;
      setAdminMessage?.('Event published successfully with its post/image.');
    }catch(e){ if(currentSession()===account)setAdminMessage?.(`Could not publish event: ${e.message}`); }
    finally{publishingEvent=false;}
  };

  let eventsVersion=0, leadersVersion=0;
  async function renderEventsV44(){
    const host=$('#eventList'), account=currentSession(), version=++eventsVersion;
    const valid=()=>currentSession()===account && version===eventsVersion;
    if(!host||!account?.uid) return;
    try{
      const rows=await EFGCLive.events();
      if(!valid()) return;
      if(!rows.length){
        const create = currentSession()?.role==='admin' ?
          '<button class="v94-create" type="button" data-v87-go="admin" data-v94-target="adminEventTitle">Create Youth Event →</button>' : '';
        host.innerHTML='<article class="card v94-empty-panel"><span class="v94-empty-icon" aria-hidden="true">▦</span><small>YOUTH CALENDAR</small><h3>No events published yet</h3><p>When an EFGC Youth meeting is published, its date and details will appear here.</p>'+create+'</article>';
        return;
      }
      host.innerHTML=`<div class="event-feed">${rows.map(e=>{ const img=e.image_path?`<img class="event-cover" src="${esc(eventImageUrl(e.image_path))}" alt="${esc(e.title)} event image">`:''; const post=e.post_content?`<p class="event-post">${esc(e.post_content)}</p>`:''; const details=[e.theme,e.scripture].filter(Boolean).join(' • '); return `<article class="card event-card" data-event-id="${Number(e.id)}" data-event-date="${esc(e.event_date)}">${img}<div class="event-card-body"><span class="module-kicker">${esc(fmtEvent(e.event_date))}</span><h3>${esc(e.title)}</h3>${details?`<div class="planner-meta">${esc(details)}</div>`:''}${post}</div></article>`;}).join('')}</div>`;
    }catch(e){ if(!valid())return; host.innerHTML=`<article class="card"><p>${esc(`Could not load events: ${e.message}`)}</p></article>`; }
  }

  // Profile titles and access come only from the server. A Youth member must
  // never be presented as an Approved Leader or shown a Main Leader edit box.
  async function syncOwnProfile(){
    const signedIn=currentSession();
    if(!signedIn?.uid) return null;
    const p=await EFGCAuth.getMyProfile();
    if(!p || p.id!==signedIn.uid || currentSession()?.uid!==signedIn.uid) return null;
    try{
      session.name=p.full_name;
      session.phone=p.phone||'';
      session.role=p.role;
      session.approval_status=p.approval_status||'approved';
      localStorage.removeItem('efgcYouthSession');
      sessionStorage.removeItem('efgcYouthSession');
      (EFGCAuth.remembersDevice() ? localStorage : sessionStorage)
        .setItem('efgcYouthSession',JSON.stringify(session));
    }catch{}
    const label=$('#currentUser');
    if(label){
      const title=(p.role==='admin'||p.role==='leader')&&p.approval_status==='approved'
        ? ' • '+(p.leader_role|| (p.role==='admin'?'Main Youth Leader':'Youth Leader')) : '';
      label.textContent=(p.full_name||'EFGC Member')+title+' • '+(p.role==='admin'?'Admin':p.role);
    }
    return p;
  }

  async function renderOwnProfileV44(){
    const host=$('#profileCard');
    if(!host||!currentSession()?.uid) return;
    const signedInId=currentSession().uid;
    try{
      const p=await syncOwnProfile();
      if(!p||currentSession()?.uid!==signedInId) return;
      const staff=p.role==='admin'||(p.role==='leader'&&p.approval_status==='approved');
      const title=staff?(p.leader_role||(p.role==='admin'?'Main Youth Leader':'Youth Leader')):'EFGC Youth Member';
      const badge=p.role==='admin'?'Admin + Main Leader':
        staff?'Approved Leader':p.role==='leader'?'Leader approval pending':'Youth Member';
      const initials=(p.full_name||'EFGC').split(/\\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase();
      host.innerHTML=`<article class="card leader-self-card"><div class="leader-profile-top"><div class="profile-photo-wrap"><div class="profile-photo-placeholder">${esc(initials)}</div><img id="ownProfilePhoto" class="profile-photo" alt="${esc(p.full_name)} profile photo"></div><div><span class="module-kicker">EFGC Youth ${staff?'Leadership':'Family'}</span><h2>${esc(p.full_name)}</h2><p><strong>${esc(title)}</strong></p>${p.phone?`<p>${esc(p.phone)}</p>`:''}<span class="status-pill confirmed">${esc(badge)}</span></div></div><hr><h3>Update my profile</h3>${!staff?'<p class="v87-muted">Leader access and leadership titles are assigned by the EFGC Admin. They cannot be changed in your personal profile.</p>':''}<div class="control-grid"><label>Display name<input id="ownProfileName" value="${esc(p.full_name||'')}"></label><label>Contact number<input id="ownProfilePhone" value="${esc(p.phone||'')}"></label><label>Profile picture<input id="ownProfileFile" type="file" accept="image/jpeg,image/png,image/webp"></label></div><div class="inline-actions"><button class="mini-button primary" type="button" onclick="saveOwnLeaderProfile()">Save Profile</button></div><div id="ownProfileMessage" class="toast-line" role="status"></div></article>`;
      if(p.face_photo_path) loadPrivatePhoto($('#ownProfilePhoto'),p.face_photo_path);
    }catch(e){
      if(currentSession()?.uid===signedInId) host.innerHTML=`<article class="card"><p>${esc('Profile could not load: '+e.message)}</p><button type="button" data-tab="profile">Try again</button></article>`;
    }
  }

  window.saveOwnLeaderProfile = async () => {
    const signedInId=currentSession()?.uid;
    if(!signedInId) return;
    const name=$('#ownProfileName')?.value.trim();
    const phone=$('#ownProfilePhone')?.value.trim();
    const file=$('#ownProfileFile')?.files?.[0];
    if(!name) return setText('#ownProfileMessage','Enter your display name.','error');
    try{
      setText('#ownProfileMessage','Saving profile…');
      const p=await EFGCAuth.getMyProfile();
      if(!p||p.id!==signedInId||currentSession()?.uid!==signedInId)
        throw new Error('Your sign-in has changed. Sign in again.');
      let face_photo_path=p.face_photo_path||null;
      if(file){
        EFGCPhotoSecurity.validate(file);
        face_photo_path=await EFGCPhotoSecurity.upload(file);
      }
      const rows=await EFGCAuth.rest('profiles?id=eq.'+encodeURIComponent(signedInId),{
        method:'PATCH',headers:{'Content-Type':'application/json',Prefer:'return=representation'},
        body:JSON.stringify({full_name:name,phone:EFGCAuth.normalizeZA(phone),face_photo_path})
      });
      if(!rows?.length||rows[0].id!==signedInId)
        throw new Error('Your profile was not saved. Please retry or contact an Admin.');
      // Never PATCH role, approval_status or leader_role from a member screen.
      await renderLiveData();
      await renderOwnProfileV44();
      setText('#ownProfileMessage','Profile saved.','ok');
    }catch(e){
      setText('#ownProfileMessage','Could not save profile: '+(e.message||'Please retry.'),'error');
    }
  };

  async function renderLeaderDirectoryV44(){
    const host=$('#leaderList'), account=currentSession(), version=++leadersVersion;
    const valid=()=>currentSession()===account && version===leadersVersion;
    if(!host||!account?.uid) return;
    try{
      const leaders=await EFGCLive.approvedLeaders();
      if(!valid()) return;
      if(!leaders.length){ host.innerHTML='<h2>Approved Youth Leaders</h2><article class="card"><p>Approved leaders will appear here.</p></article>'; return; }
      host.innerHTML=`<h2>EFGC Youth Leadership</h2><div class="leader-grid">${leaders.map((l,i)=>{ const initials=(l.full_name||'L').split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase(); return `<article class="card leader-directory-card"><div class="profile-photo-wrap small"><div class="profile-photo-placeholder">${esc(initials)}</div><img id="leaderPhoto${i}" class="profile-photo" alt="${esc(l.full_name)} profile photo"></div><div><h3>${esc(l.full_name)}</h3><p><strong>${esc(l.leader_role||'Youth Leader')}</strong></p>${l.phone?`<p>${esc(l.phone)}</p>`:''}</div></article>`;}).join('')}</div>`;
      leaders.forEach((l,i)=>{ if(l.face_photo_path) loadPrivatePhoto($(`#leaderPhoto${i}`),l.face_photo_path); });
    }catch(e){ if(host&&valid()&&currentSession()?.uid) host.innerHTML='<h2>EFGC Youth Leadership</h2><article class="card"><p>'+esc('Could not load the Leader directory: '+(e.message||'Connection error'))+'</p><button type="button" data-tab="leaders">Retry</button></article>'; console.warn('Leader directory v44',e); }
  }

  async function loadPlanner(){
    const [plans,duties,leaders]=await Promise.all([EFGCLive.planner(),EFGCLive.duties(),EFGCLive.approvedLeaders()]);
    plannerCache=plans||[]; dutyCache=duties||[]; leaderCache=leaders||[];
  }
  function assignments(plannerId){ return dutyCache.filter(d=>Number(d.planner_id)===Number(plannerId)); }
  function leaderOptions(selected=''){ return `<option value="">Unassigned</option>${leaderCache.map(l=>`<option value="${esc(l.leader_id)}" ${l.leader_id===selected?'selected':''}>${esc(l.full_name)}${l.leader_role?` — ${esc(l.leader_role)}`:''}</option>`).join('')}`; }

  function plannerControls(){
    const year=new Date().getFullYear();
    return `<div class="module-grid v44-planner-controls"><article class="module-card"><span class="module-kicker">Annual planner</span><h3>Generate Friday youth weeks</h3><p>Create every weekly Friday date for the year. Existing dates are kept.</p><label>Year<input id="v44PlannerYear" type="number" min="2024" max="2100" value="${year}"></label><button class="mini-button primary" type="button" onclick="generateYearPlannerV44()">Generate year</button><div id="v44GenerateMessage" class="toast-line"></div></article><article class="module-card"><span class="module-kicker">Week details</span><h3>Add / update a week</h3><div class="control-grid"><label>Date<input id="v44WeekDate" type="date"></label><label>Meeting title<input id="v44WeekTitle" value="Youth Meeting"></label><label>Theme<input id="v44WeekTheme" placeholder="Theme"></label><label>Scripture<input id="v44WeekScripture" placeholder="e.g. Matthew 5:16"></label><label>Published<select id="v44WeekPublished"><option value="false">Draft</option><option value="true">Published</option></select></label></div><div class="inline-actions"><button class="mini-button primary" type="button" onclick="savePlannerWeekV44()">Save week</button></div><div id="v44WeekMessage" class="toast-line"></div></article></div>`;
  }

  function rosterAdminRow(p){
    const byType=new Map(assignments(p.id).map(a=>[a.duty_type,a]));
    return `<div class="v44-roster-row" data-planner-id="${Number(p.id)}"><div class="v44-week"><strong>Week ${isoWeek(p.week_start)}</strong><span>${p.published?'Published':'Draft'}</span></div><div class="v44-date"><strong>${esc(fmtDate(p.week_start))}</strong><button class="text-button" type="button" onclick="editPlannerWeekV44(${Number(p.id)})">Edit details</button></div>${DUTIES.map(d=>{const a=byType.get(d); return `<label class="v44-duty"><span>${DUTY_LABEL[d]}</span><select data-duty="${d}" data-current-id="${a?.id||''}" data-current-leader="${esc(a?.leader_id||'')}">${leaderOptions(a?.leader_id||'')}</select><small>${a?.status==='confirmed'?'Confirmed':a?.status==='replacement_requested'?'Needs replacement':a?'Pending':'Not allocated'}</small></label>`;}).join('')}<div class="v44-save"><button class="mini-button primary" type="button" onclick="saveRosterWeekV44(${Number(p.id)})">Save roles</button></div></div>`;
  }

  function rosterLeaderRow(p,s){
    const mine=assignments(p.id).filter(a=>a.leader_id===s.uid);
    if(!mine.length) return '';
    return `<article class="module-card"><span class="module-kicker">Week ${isoWeek(p.week_start)} • ${esc(fmtDate(p.week_start))}</span><h3>${esc(p.meeting_title||'Youth Meeting')}</h3><div class="duty-chips">${mine.map(a=>`<div class="duty-chip"><b>${DUTY_LABEL[a.duty_type]||esc(a.duty_type)}</b><span>${a.status==='confirmed'?'Confirmed':a.status==='replacement_requested'?'Needs replacement':'Pending'}</span><div class="duty-response"><button class="mini-button success" onclick="respondToDuty(${Number(a.id)},'confirmed')">Confirm</button><button class="mini-button warn" onclick="requestDutyReplacement(${Number(a.id)})">Request replacement</button></div></div>`).join('')}</div></article>`;
  }

  window.renderPlannerRoster = async () => {
    const host=$('#plannerRosterHost'); if(!host) return;
    const s=currentSession(); if(!isApprovedStaff()){ host.innerHTML='<article class="module-card"><p>Planner & Roster is restricted to approved Leaders and Admin.</p></article>'; return; }
    host.innerHTML='<article class="module-card"><p>Loading Year Planner & Duty Roster…</p></article>';
    try{
      await loadPlanner();
      if(isAdmin()){
        const summary=`<div class="summary-strip"><div class="summary-box"><strong>${plannerCache.length}</strong><span>WEEKS</span></div><div class="summary-box"><strong>${leaderCache.length}</strong><span>LEADERS</span></div><div class="summary-box"><strong>${dutyCache.filter(d=>d.status==='confirmed').length}</strong><span>CONFIRMED DUTIES</span></div><div class="summary-box"><strong>${dutyCache.filter(d=>d.status==='replacement_requested').length}</strong><span>REPLACEMENTS</span></div></div>`;
        const rows=plannerCache.length?`<div class="v44-roster-table"><div class="v44-roster-head"><span>Week</span><span>Date</span><span>Welcome</span><span>Energizer</span><span>Lesson</span><span>Closing</span><span></span></div>${plannerCache.map(rosterAdminRow).join('')}</div>`:'<div class="empty-state"><strong>No planner weeks yet.</strong><div>Generate the annual planner above.</div></div>';
        host.innerHTML=`<div class="module-heading"><div><span class="module-kicker">Passing on the Baton</span><h2>Year Planner & Duty Roster</h2><p>Week number • Date • Welcome • Energizer • Lesson • Closing</p></div></div>${plannerControls()}${summary}${rows}`;
      } else {
        const visible=plannerCache.filter(p=>p.published); const rows=visible.map(p=>rosterLeaderRow(p,s)).filter(Boolean).join('');
        host.innerHTML=`<div class="module-heading"><div><span class="module-kicker">My ministry duties</span><h2>Year Planner & Duty Roster</h2><p>Your allocated Welcome, Energizer, Lesson and Closing duties.</p></div></div>${rows||'<div class="empty-state">No published duties have been allocated to you yet.</div>'}`;
      }
    }catch(e){ host.innerHTML=`<article class="module-card"><p>${esc(`Planner could not load: ${e.message}`)}</p></article>`; }
  };

  window.generateYearPlannerV44 = async () => {
    if(!isAdmin()) return;
    const year=Number($('#v44PlannerYear')?.value); if(!Number.isInteger(year)||year<2024||year>2100) return setText('#v44GenerateMessage','Enter a valid year.','error');
    const rows=[]; let d=new Date(Date.UTC(year,0,1)); while(d.getUTCDay()!==5) d.setUTCDate(d.getUTCDate()+1);
    while(d.getUTCFullYear()===year){ rows.push({week_start:d.toISOString().slice(0,10),meeting_title:'Youth Meeting',published:false}); d.setUTCDate(d.getUTCDate()+7); }
    try{ setText('#v44GenerateMessage',`Creating ${rows.length} Friday weeks…`); await EFGCAuth.rest('year_planner?on_conflict=week_start',{method:'POST',headers:{'Content-Type':'application/json',Prefer:'resolution=ignore-duplicates,return=minimal'},body:JSON.stringify(rows)}); await renderPlannerRoster(); }catch(e){ setText('#v44GenerateMessage',`Could not generate planner: ${e.message}`,'error'); }
  };

  window.savePlannerWeekV44 = async () => {
    if(!isAdmin()) return;
    const week_start=$('#v44WeekDate')?.value; if(!week_start) return setText('#v44WeekMessage','Choose the date.','error');
    const meeting_title=$('#v44WeekTitle')?.value.trim()||'Youth Meeting'; const theme=$('#v44WeekTheme')?.value.trim()||null; const scripture=$('#v44WeekScripture')?.value.trim()||null; const published=$('#v44WeekPublished')?.value==='true';
    try{ setText('#v44WeekMessage','Saving week…'); await EFGCAuth.rest('year_planner?on_conflict=week_start',{method:'POST',headers:{'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify({week_start,meeting_title,theme,scripture,published})}); await renderPlannerRoster(); }catch(e){ setText('#v44WeekMessage',`Could not save week: ${e.message}`,'error'); }
  };

  window.editPlannerWeekV44 = (id) => {
    const p=plannerCache.find(x=>Number(x.id)===Number(id)); if(!p) return;
    $('#v44WeekDate').value=p.week_start||''; $('#v44WeekTitle').value=p.meeting_title||'Youth Meeting'; $('#v44WeekTheme').value=p.theme||''; $('#v44WeekScripture').value=p.scripture||''; $('#v44WeekPublished').value=String(Boolean(p.published)); $('#v44WeekDate').scrollIntoView({behavior:'smooth',block:'center'});
  };

  window.saveRosterWeekV44 = async (plannerId) => {
    if(!isAdmin()) return;
    const row=document.querySelector(`.v44-roster-row[data-planner-id="${Number(plannerId)}"]`); if(!row) return;
    try{
      for(const sel of row.querySelectorAll('select[data-duty]')){
        const duty_type=sel.dataset.duty; const leader_id=sel.value||''; const currentId=Number(sel.dataset.currentId||0); const currentLeader=sel.dataset.currentLeader||'';
        if(!leader_id&&currentId){ await EFGCAuth.rest(`duty_assignments?id=eq.${currentId}`,{method:'DELETE',headers:{Prefer:'return=minimal'}}); continue; }
        if(!leader_id||leader_id===currentLeader) continue;
        await EFGCAuth.rest('duty_assignments?on_conflict=planner_id,duty_type',{method:'POST',headers:{'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify({planner_id:Number(plannerId),duty_type,leader_id,status:'pending',replacement_note:null})});
      }
      await renderPlannerRoster();
    }catch(e){ alert(`Could not save roster: ${e.message}`); }
  };

  async function afterRenderV44(){
    enhanceAdminEventForm();
    await Promise.allSettled([renderEventsV44(),renderOwnProfileV44(),renderLeaderDirectoryV44()]);
    if($('#plannerRoster')&&!$('#plannerRoster').classList.contains('hidden')) await renderPlannerRoster();
  }

  const previousRender=window.renderLiveData;
  if(typeof previousRender==='function'){
    window.renderLiveData=async function(){ await previousRender(); await afterRenderV44(); };
  }

  document.addEventListener('click',e=>{ const tab=e.target.closest('[data-tab]')?.dataset.tab; if(tab==='plannerRoster') setTimeout(()=>renderPlannerRoster(),0); if(tab==='profile') setTimeout(()=>renderOwnProfileV44(),0); if(tab==='events') setTimeout(()=>renderEventsV44(),0); });
  document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{ enhanceAdminEventForm(); if(currentSession()?.uid) afterRenderV44(); },250));
  setTimeout(()=>{ if(currentSession()?.uid) afterRenderV44(); },900);
})();
