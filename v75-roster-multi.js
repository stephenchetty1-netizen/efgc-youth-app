/** EFGC Youth v75 — multi-leader roster assignments. */
(() => {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const esc = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const DUTIES = ['welcome','energizer','lesson','closing'];
  const DUTY_LABEL = { welcome:'Welcome', energizer:'Energizer', lesson:'Lesson', closing:'Closing' };
  let plannerCache = [];
  let dutyCache = [];
  let leaderCache = [];
  let pendingLoad = null;
  let renderVersion = 0;

  function currentSession(){
    try { return session || null; } catch (_) { return null; }
  }

  function isAdmin(){ return currentSession()?.role === 'admin'; }
  function isApprovedStaff(){
    const s = currentSession();
    return Boolean(s && (s.role === 'admin' || (s.role === 'leader' && s.approval_status === 'approved')));
  }

  function fmtDate(v){
    if(!v) return '';
    return new Date(`${v}T12:00:00`).toLocaleDateString('en-ZA',{weekday:'short',day:'2-digit',month:'short',year:'numeric'});
  }

  function isoWeek(dateString){
    const d=new Date(`${dateString}T12:00:00`);
    const u=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));
    const day=u.getUTCDay()||7;
    u.setUTCDate(u.getUTCDate()+4-day);
    const yearStart=new Date(Date.UTC(u.getUTCFullYear(),0,1));
    return Math.ceil((((u-yearStart)/86400000)+1)/7);
  }

  function statusLabel(status){
    return status==='confirmed'?'Confirmed':status==='replacement_requested'?'Needs replacement':'Pending';
  }

  async function loadPlanner(){
    const account=currentSession();
    if(!pendingLoad || pendingLoad.account!==account){
      const request={account};
      request.promise=Promise.all([EFGCLive.planner(),EFGCLive.duties(),EFGCLive.approvedLeaders()])
        .finally(()=>{if(pendingLoad===request)pendingLoad=null;});
      pendingLoad=request;
    }
    const [plans,duties,leaders]=await pendingLoad.promise;
    if(currentSession()!==account) return;
    plannerCache=plans||[];
    dutyCache=duties||[];
    leaderCache=leaders||[];
  }

  function assignments(plannerId){ return dutyCache.filter(d=>Number(d.planner_id)===Number(plannerId)); }
  function dutyAssignments(plannerId,dutyType){ return assignments(plannerId).filter(a=>a.duty_type===dutyType); }

  function plannerControls(){
    const year=new Date().getFullYear();
    return `<div class="module-grid v44-planner-controls"><article class="module-card"><span class="module-kicker">Annual planner</span><h3>Generate Friday youth weeks</h3><p>Create every weekly Friday date for the year. Existing dates are kept.</p><label>Year<input id="v44PlannerYear" type="number" min="2024" max="2100" value="${year}"></label><button class="mini-button primary" type="button" onclick="generateYearPlannerV44()">Generate year</button><div id="v44GenerateMessage" class="toast-line"></div></article><article class="module-card"><span class="module-kicker">Week details</span><h3>Add / update a week</h3><div class="control-grid"><label>Date<input id="v44WeekDate" type="date"></label><label>Meeting title<input id="v44WeekTitle" value="Youth Meeting"></label><label>Theme<input id="v44WeekTheme" placeholder="Theme"></label><label>Scripture<input id="v44WeekScripture" placeholder="e.g. Matthew 5:16"></label><label>Published<select id="v44WeekPublished"><option value="false">Draft</option><option value="true">Published</option></select></label></div><div class="inline-actions"><button class="mini-button primary" type="button" onclick="savePlannerWeekV44()">Save week</button></div><div id="v44WeekMessage" class="toast-line"></div></article></div>`;
  }

  function leaderPicker(plannerId,dutyType){
    const current=dutyAssignments(plannerId,dutyType);
    const byLeader=new Map(current.map(a=>[a.leader_id,a]));
    const selected=leaderCache.filter(l=>byLeader.has(l.leader_id));
    const summary=!selected.length?'Select leaders':selected.length===1?selected[0].full_name:`${selected.length} leaders • ${selected.map(l=>l.full_name).join(', ')}`;
    const options=leaderCache.length?leaderCache.map(l=>{
      const a=byLeader.get(l.leader_id);
      return `<label class="v75-roster-option"><input type="checkbox" data-roster-leader data-duty="${esc(dutyType)}" value="${esc(l.leader_id)}" ${a?'checked':''}><span class="v75-roster-option-name">${esc(l.full_name)}${l.leader_role?`<small>${esc(l.leader_role)}</small>`:''}</span>${a?`<em class="v75-roster-option-status ${a.status==='confirmed'?'confirmed':a.status==='replacement_requested'?'replacement':''}">${esc(statusLabel(a.status))}</em>`:''}</label>`;
    }).join(''):'<div class="v75-roster-empty">No approved leaders available.</div>';
    return `<details class="v75-roster-picker" data-duty-picker="${esc(dutyType)}"><summary><span class="v75-roster-summary">${esc(summary)}</span><b aria-hidden="true">＋</b></summary><div class="v75-roster-options">${options}</div></details>`;
  }

  function rosterAdminRow(p){
    return `<div class="v44-roster-row v75-roster-row" data-planner-id="${Number(p.id)}"><div class="v44-week"><strong>Week ${isoWeek(p.week_start)}</strong><span>${p.published?'Published':'Draft'}</span></div><div class="v44-date"><strong>${esc(fmtDate(p.week_start))}</strong><button class="text-button" type="button" onclick="editPlannerWeekV44(${Number(p.id)})">Edit details</button></div>${DUTIES.map(d=>{const count=dutyAssignments(p.id,d).length;return `<div class="v44-duty v75-duty"><span>${DUTY_LABEL[d]}</span>${leaderPicker(p.id,d)}<small>${count?`${count} leader${count===1?'':'s'} assigned`:'Not allocated'}</small></div>`;}).join('')}<div class="v44-save v75-save"><button class="mini-button primary" type="button" onclick="saveRosterWeekV75(${Number(p.id)})">Save roles</button><small>Select multiple leaders for the same duty. Tick every leader you want assigned.</small></div></div>`;
  }

  function rosterLeaderRow(p,s){
    const mine=assignments(p.id).filter(a=>a.leader_id===s.uid);
    if(!mine.length) return '';
    return `<article class="module-card"><span class="module-kicker">Week ${isoWeek(p.week_start)} • ${esc(fmtDate(p.week_start))}</span><h3>${esc(p.meeting_title||'Youth Meeting')}</h3><div class="duty-chips">${mine.map(a=>`<div class="duty-chip"><b>${DUTY_LABEL[a.duty_type]||esc(a.duty_type)}</b><span>${esc(statusLabel(a.status))}</span><div class="duty-response"><button class="mini-button success" onclick="respondToDuty(${Number(a.id)},'confirmed')">Confirm</button><button class="mini-button warn" onclick="requestDutyReplacement(${Number(a.id)})">Request replacement</button></div></div>`).join('')}</div></article>`;
  }

  window.renderPlannerRoster=async()=>{
    const host=$('#plannerRosterHost'); if(!host) return;
    const s=currentSession(), version=++renderVersion;
    const valid=()=>currentSession()===s && version===renderVersion && isApprovedStaff();
    if(!isApprovedStaff()){host.innerHTML='<article class="module-card"><p>Planner & Roster is restricted to approved Leaders and Admin.</p></article>';return;}
    host.innerHTML='<article class="module-card"><p>Loading Year Planner & Duty Roster…</p></article>';
    try{
      await loadPlanner();
      if(!valid()) return;
      if(isAdmin()){
        const summary=`<div class="summary-strip"><div class="summary-box"><strong>${plannerCache.length}</strong><span>WEEKS</span></div><div class="summary-box"><strong>${leaderCache.length}</strong><span>LEADERS</span></div><div class="summary-box"><strong>${dutyCache.filter(d=>d.status==='confirmed').length}</strong><span>CONFIRMED DUTIES</span></div><div class="summary-box"><strong>${dutyCache.filter(d=>d.status==='replacement_requested').length}</strong><span>REPLACEMENTS</span></div></div>`;
        const rows=plannerCache.length?`<div class="v44-roster-table"><div class="v44-roster-head"><span>Week</span><span>Date</span><span>Welcome</span><span>Energizer</span><span>Lesson</span><span>Closing</span><span></span></div>${plannerCache.map(rosterAdminRow).join('')}</div>`:'<div class="empty-state"><strong>No planner weeks yet.</strong><div>Generate the annual planner above.</div></div>';
        host.innerHTML=`<div class="module-heading"><div><span class="module-kicker">Passing on the Baton</span><h2>Year Planner & Duty Roster</h2><p>Assign multiple leaders to any duty. Tick all leaders needed for Welcome, Energizer, Lesson or Closing.</p></div></div>${plannerControls()}${summary}${rows}`;
      }else{
        const visible=plannerCache.filter(p=>p.published);
        const rows=visible.map(p=>rosterLeaderRow(p,s)).filter(Boolean).join('');
        host.innerHTML=`<div class="module-heading"><div><span class="module-kicker">My ministry duties</span><h2>Year Planner & Duty Roster</h2><p>Your allocated Welcome, Energizer, Lesson and Closing duties.</p></div></div>${rows||'<div class="empty-state">No published duties have been allocated to you yet.</div>'}`;
      }
    }catch(e){if(!valid())return;host.innerHTML=`<article class="module-card"><p>${esc(`Planner could not load: ${e?.message||'Unknown error'}`)}</p></article>`;}
  };

  window.saveRosterWeekV75=async(plannerId)=>{
    if(!isAdmin()) return;
    const account=currentSession();
    const checkAccount=()=>{if(currentSession()!==account)throw new Error('Account changed. Reopen the roster before saving.');};
    const row=document.querySelector(`.v44-roster-row[data-planner-id="${Number(plannerId)}"]`); if(!row) return;
    const button=row.querySelector('.v75-save .mini-button');
    if(button){button.disabled=true;button.textContent='Saving…';}
    try{
      for(const dutyType of DUTIES){
        const existing=dutyAssignments(plannerId,dutyType);
        const selectedIds=[...row.querySelectorAll(`input[data-roster-leader][data-duty="${dutyType}"]:checked`)].map(el=>el.value).filter(Boolean);
        const selectedSet=new Set(selectedIds);
        const existingByLeader=new Map(existing.map(a=>[a.leader_id,a]));
        for(const a of existing.filter(a=>!selectedSet.has(a.leader_id))){
          checkAccount();
          await EFGCAuth.rest(`duty_assignments?id=eq.${Number(a.id)}`,{method:'DELETE',headers:{Prefer:'return=minimal'}});
        }
        const add=selectedIds.filter(id=>!existingByLeader.has(id));
        if(add.length){
          checkAccount();
          const payload=add.map(leader_id=>({planner_id:Number(plannerId),duty_type:dutyType,leader_id,status:'pending',replacement_note:null}));
          await EFGCAuth.rest('duty_assignments?on_conflict=planner_id,duty_type,leader_id',{method:'POST',headers:{'Content-Type':'application/json',Prefer:'resolution=ignore-duplicates,return=representation'},body:JSON.stringify(payload)});
        }
      }
      checkAccount();
      await window.renderPlannerRoster();
      if(window.EFGCDutyPanel?.refresh) await window.EFGCDutyPanel.refresh();
    }catch(e){
      if(button){button.disabled=false;button.textContent='Save roles';}
      alert(`Could not save roster: ${e?.message||'Unknown error'}`);
    }
  };

  document.addEventListener('change',e=>{
    const input=e.target.closest?.('input[data-roster-leader]'); if(!input) return;
    const picker=input.closest('.v75-roster-picker'); if(!picker) return;
    const names=[...picker.querySelectorAll('input[data-roster-leader]:checked')].map(box=>leaderCache.find(l=>l.leader_id===box.value)?.full_name||'Leader');
    const summary=picker.querySelector('.v75-roster-summary');
    if(summary) summary.textContent=!names.length?'Select leaders':names.length===1?names[0]:`${names.length} leaders • ${names.join(', ')}`;
  });

  document.addEventListener('click',e=>{
    const tab=e.target.closest?.('[data-tab]')?.dataset.tab;
    if(tab==='plannerRoster') setTimeout(()=>window.renderPlannerRoster?.(),0);
  });

  if($('#plannerRoster')&&!$('#plannerRoster').classList.contains('hidden')) setTimeout(()=>window.renderPlannerRoster?.(),50);
  window.EFGCMultiLeaderRoster={version:'82.0',refresh:()=>window.renderPlannerRoster?.()};
})();
