/** EFGC Youth v63 — Leader weekly duty acknowledgement + two-step swaps. */
(() => {
  if (window.EFGCDutyPanel) return;
  function snapshot(){ try { return session; } catch { return null; } }
  const POLL_MS = 15000;
  const DUTY_LABEL = { welcome:'Welcome', energizer:'Energizer', lesson:'Lesson', closing:'Closing' };
  let timer = null;
  let busy = false;
  let state = { profile:null, plans:[], duties:[], leaders:[], swaps:[] };

  const $ = (s) => document.querySelector(s);
  const esc = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const jsonHeaders = { 'Content-Type':'application/json', Prefer:'return=representation' };

  function uid(){ return window.EFGCAuth?.userId?.() || null; }
  function approvedLeader(p){ return Boolean(p && p.role === 'leader' && p.approval_status === 'approved'); }
  function ymd(d){ return new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,10); }
  function mondayOf(date = new Date()){
    const d = new Date(date); d.setHours(0,0,0,0);
    const day = d.getDay(); const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff); return d;
  }
  function addDays(date, days){ const d = new Date(date); d.setDate(d.getDate()+days); return d; }
  function formatWeek(v){
    if(!v) return '';
    const d = new Date(`${v}T00:00:00`);
    try { return d.toLocaleDateString('en-ZA',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}); }
    catch { return v; }
  }
  function leaderName(id){ return state.leaders.find(l => l.leader_id === id)?.full_name || 'Leader'; }
  function planForDuty(d){ return state.plans.find(p => Number(p.id) === Number(d.planner_id)); }
  function pendingOutgoingFor(assignmentId){ return state.swaps.find(s => Number(s.duty_assignment_id) === Number(assignmentId) && s.status === 'pending' && s.requester_leader_id === uid()); }
  function statusLabel(s){ return s === 'confirmed' ? 'READY' : s === 'replacement_requested' ? 'NOT READY' : 'ACTION REQUIRED'; }
  function statusClass(s){ return s === 'confirmed' ? 'ready' : s === 'replacement_requested' ? 'not-ready' : 'pending'; }

  function ensureHost(){
    let host = $('#efgcDutyAckPanel');
    if(host) return host;
    const anchor = $('#leaderReminder') || $('#home .v49-heading');
    if(!anchor) return null;
    host = document.createElement('section');
    host.id = 'efgcDutyAckPanel';
    host.className = 'efgc-duty-panel hidden';
    anchor.insertAdjacentElement('afterend', host);
    return host;
  }

  function setPlannerBadge(count){
    const menu = $('#plannerMenu'); if(!menu) return;
    let badge = $('#efgcDutyMenuBadge');
    if(!badge){ badge = document.createElement('b'); badge.id = 'efgcDutyMenuBadge'; badge.className = 'efgc-duty-menu-badge'; menu.appendChild(badge); }
    badge.textContent = String(count);
    badge.classList.toggle('hidden', count < 1);
  }

  function toast(title, body){
    let wrap = $('#efgcDutyToasts');
    if(!wrap){ wrap=document.createElement('div'); wrap.id='efgcDutyToasts'; wrap.className='efgc-duty-toasts'; document.body.appendChild(wrap); }
    const el=document.createElement('button'); el.type='button'; el.className='efgc-duty-toast';
    el.innerHTML=`<span>✅</span><div><strong>${esc(title)}</strong><small>${esc(body)}</small></div>`;
    el.addEventListener('click',()=>{ document.querySelector('[data-tab="home"]')?.click(); $('#efgcDutyAckPanel')?.scrollIntoView({behavior:'smooth',block:'start'}); el.remove(); });
    wrap.appendChild(el); requestAnimationFrame(()=>el.classList.add('show'));
    setTimeout(()=>{ el.classList.remove('show'); setTimeout(()=>el.remove(),250); },7500);
  }

  function notifyNewActions(myDuties, incoming){
    const id = uid(); if(!id) return;
    const aKey=`efgcDutyV63:${id}:assignments`, sKey=`efgcDutyV63:${id}:swaps`;
    let seenA=null, seenS=null;
    try{ seenA=JSON.parse(localStorage.getItem(aKey)||'null'); seenS=JSON.parse(localStorage.getItem(sKey)||'null'); }catch{}
    const currentA=myDuties.filter(d=>d.status==='pending').map(d=>String(d.id));
    const currentS=incoming.map(s=>String(s.id));
    if(!Array.isArray(seenA)||!Array.isArray(seenS)){
      localStorage.setItem(aKey,JSON.stringify(currentA)); localStorage.setItem(sKey,JSON.stringify(currentS)); return;
    }
    const oldA=new Set(seenA), oldS=new Set(seenS);
    myDuties.filter(d=>d.status==='pending'&&!oldA.has(String(d.id))).forEach(d=>{
      const p=planForDuty(d); toast('Duty acknowledgement required',`${DUTY_LABEL[d.duty_type]||d.duty_type} • ${formatWeek(p?.week_start)}`);
    });
    incoming.filter(s=>!oldS.has(String(s.id))).forEach(s=>{
      const d=state.duties.find(x=>Number(x.id)===Number(s.duty_assignment_id)); const p=d?planForDuty(d):null;
      toast('Duty swap request',`${leaderName(s.requester_leader_id)} asked you to take ${DUTY_LABEL[d?.duty_type]||'a duty'} • ${formatWeek(p?.week_start)}`);
    });
    localStorage.setItem(aKey,JSON.stringify(currentA)); localStorage.setItem(sKey,JSON.stringify(currentS));
  }

  function renderIncoming(s){
    const d=state.duties.find(x=>Number(x.id)===Number(s.duty_assignment_id));
    const p=d?planForDuty(d):null;
    return `<article class="efgc-duty-card swap-request">
      <div class="efgc-duty-card-top"><span class="efgc-duty-kicker">SWAP REQUEST</span><span class="efgc-duty-status pending">ACKNOWLEDGE</span></div>
      <h4>${esc(DUTY_LABEL[d?.duty_type]||'Duty')} • ${esc(formatWeek(p?.week_start))}</h4>
      <p><strong>${esc(leaderName(s.requester_leader_id))}</strong> has selected you to take this duty. The duty will not move to you until you accept.</p>
      <div class="efgc-duty-actions"><button type="button" class="efgc-duty-btn ready" onclick="respondDutySwap(${Number(s.id)},true)">Accept Swap</button><button type="button" class="efgc-duty-btn not-ready" onclick="respondDutySwap(${Number(s.id)},false)">Decline</button></div>
    </article>`;
  }

  function renderMine(d){
    const p=planForDuty(d); const pendingSwap=pendingOutgoingFor(d.id);
    const swapState = pendingSwap ? `<div class="efgc-duty-swap-wait"><strong>Swap awaiting acknowledgement</strong><span>${esc(leaderName(pendingSwap.requested_leader_id))} must accept before the duty changes.</span><button type="button" onclick="cancelDutySwap(${Number(pendingSwap.id)})">Cancel swap request</button></div>` : '';
    return `<article class="efgc-duty-card">
      <div class="efgc-duty-card-top"><span class="efgc-duty-kicker">YOUR WEEKLY DUTY</span><span class="efgc-duty-status ${statusClass(d.status)}">${statusLabel(d.status)}</span></div>
      <h4>${esc(DUTY_LABEL[d.duty_type]||d.duty_type)} • ${esc(formatWeek(p?.week_start))}</h4>
      <p>${esc(p?.meeting_title||'Youth Meeting')}${p?.theme?` • ${esc(p.theme)}`:''}</p>
      ${d.replacement_note?`<div class="efgc-duty-note">${esc(d.replacement_note)}</div>`:''}
      ${swapState}
      <div class="efgc-duty-actions">
        <button type="button" class="efgc-duty-btn ready" onclick="acknowledgeDuty(${Number(d.id)},'confirmed')">Ready</button>
        <button type="button" class="efgc-duty-btn not-ready" onclick="acknowledgeDuty(${Number(d.id)},'replacement_requested')">Not Ready</button>
        <button type="button" class="efgc-duty-btn swap" onclick="openDutySwap(${Number(d.id)})" ${pendingSwap?'disabled':''}>Swap Duty</button>
      </div>
    </article>`;
  }

  function render(){
    const host=ensureHost(); if(!host) return;
    if(!approvedLeader(state.profile)){ host.classList.add('hidden'); setPlannerBadge(0); return; }
    const start=ymd(mondayOf()), end=ymd(addDays(mondayOf(),42));
    const visiblePlanIds=new Set(state.plans.filter(p=>p.published && p.week_start>=start && p.week_start<=end).map(p=>Number(p.id)));
    const mine=state.duties.filter(d=>d.leader_id===uid() && visiblePlanIds.has(Number(d.planner_id))).sort((a,b)=>(planForDuty(a)?.week_start||'').localeCompare(planForDuty(b)?.week_start||''));
    const incoming=state.swaps.filter(s=>s.status==='pending' && s.requested_leader_id===uid());
    const actionCount=mine.filter(d=>d.status!=='confirmed').length + incoming.length;
    setPlannerBadge(actionCount); notifyNewActions(mine,incoming);
    host.classList.remove('hidden');
    const cards=[...incoming.map(renderIncoming),...mine.map(renderMine)].join('');
    host.innerHTML=`<div class="efgc-duty-head"><div><small>LEADER NOTIFICATIONS</small><h3>Weekly Duty Acknowledgement</h3><p>Confirm whether you are ready. If you need a swap, the selected Leader must accept before the duty transfers.</p></div><span class="efgc-duty-count ${actionCount?'attention':''}">${actionCount} action${actionCount===1?'':'s'}</span></div>${cards||'<div class="efgc-duty-empty">No duty acknowledgement is required right now.</div>'}`;
  }

  async function load(){
    if(busy || !window.EFGCAuth?.accessToken?.()) return;
    busy=true;
    const account=uid(), shell=snapshot();
    const valid=()=>uid()===account && snapshot()===shell;
    try{
      const profile=await EFGCAuth.getMyProfile();
      if(!valid()) return;
      if(!approvedLeader(profile)){ state={profile,plans:[],duties:[],leaders:[],swaps:[]}; render(); return; }
      const [plans,duties,leaders,swaps]=await Promise.all([
        EFGCLive.planner(), EFGCLive.duties(), EFGCLive.approvedLeaders(),
        EFGCAuth.rest('duty_swap_requests?select=id,duty_assignment_id,requester_leader_id,requested_leader_id,status,created_at,responded_at,updated_at&order=created_at.desc&limit=50')
      ]);
      if(!valid()) return;
      state={profile,plans:plans||[],duties:duties||[],leaders:leaders||[],swaps:swaps||[]};
      render();
    }catch(e){
      const host=ensureHost(); if(host && valid() && uid()){ host.classList.remove('hidden'); host.innerHTML=`<div class="efgc-duty-error">Duty notifications could not load: ${esc(e?.message||'Unknown error')}</div>`; }
    }finally{ busy=false; }
  }

  async function patchDuty(id,status,note){
    const rows=await EFGCAuth.rest(`duty_assignments?id=eq.${Number(id)}`,{method:'PATCH',headers:jsonHeaders,body:JSON.stringify({status,replacement_note:note,updated_at:new Date().toISOString()})});
    if(!rows?.length) throw new Error('Duty was not updated. Check that it is still assigned to you.');
    return rows[0];
  }

  window.acknowledgeDuty=async(id,status)=>{
    if(!['confirmed','replacement_requested'].includes(status)) return;
    try{
      const pending=pendingOutgoingFor(id);
      if(status==='confirmed' && pending){ await EFGCAuth.rest('rpc/cancel_duty_swap',{method:'POST',headers:jsonHeaders,body:JSON.stringify({p_request_id:Number(pending.id)})}); }
      await patchDuty(id,status,status==='confirmed'?null:'Leader marked Not Ready');
      toast(status==='confirmed'?'Duty marked Ready':'Duty marked Not Ready',status==='confirmed'?'Thank you. Your acknowledgement has been recorded.':'You can now choose Swap Duty if another Leader can cover.');
      await load();
      if(typeof window.renderPlannerRoster==='function') window.renderPlannerRoster();
    }catch(e){ alert(`Duty could not be updated: ${e?.message||'Unknown error'}`); }
  };

  window.openDutySwap=(assignmentId)=>{
    const duty=state.duties.find(d=>Number(d.id)===Number(assignmentId));
    if(!duty || duty.leader_id!==uid()) return;
    let modal=$('#efgcDutySwapModal');
    if(!modal){ modal=document.createElement('div'); modal.id='efgcDutySwapModal'; modal.className='efgc-duty-modal'; document.body.appendChild(modal); }
    const options=state.leaders.filter(l=>l.leader_id!==uid()).map(l=>`<option value="${esc(l.leader_id)}">${esc(l.full_name)}${l.leader_role?` — ${esc(l.leader_role)}`:''}</option>`).join('');
    modal.innerHTML=`<div class="efgc-duty-modal-card"><button type="button" class="efgc-duty-modal-close" onclick="closeDutySwap()">×</button><small>SWAP DUTY</small><h3>Select another Leader</h3><p>The selected Leader must acknowledge and accept the swap. After accepting, they must still mark themselves Ready or Not Ready.</p><label>Replacement Leader<select id="efgcDutySwapLeader"><option value="">Choose Leader</option>${options}</select></label><div class="efgc-duty-actions"><button type="button" class="efgc-duty-btn swap" onclick="submitDutySwap(${Number(assignmentId)})">Send Swap Request</button><button type="button" class="efgc-duty-btn plain" onclick="closeDutySwap()">Cancel</button></div><div id="efgcDutySwapMessage" class="efgc-duty-modal-message"></div></div>`;
    modal.classList.add('open');
  };
  window.closeDutySwap=()=>$('#efgcDutySwapModal')?.classList.remove('open');

  window.submitDutySwap=async(assignmentId)=>{
    const target=$('#efgcDutySwapLeader')?.value; const msg=$('#efgcDutySwapMessage');
    if(!target){ if(msg) msg.textContent='Select a Leader first.'; return; }
    try{
      if(msg) msg.textContent='Sending swap request…';
      await EFGCAuth.rest('rpc/request_duty_swap',{method:'POST',headers:jsonHeaders,body:JSON.stringify({p_assignment_id:Number(assignmentId),p_requested_leader_id:target})});
      closeDutySwap(); toast('Swap request sent',`${leaderName(target)} must acknowledge the request before the duty changes.`); await load();
      if(typeof window.renderPlannerRoster==='function') window.renderPlannerRoster();
    }catch(e){ if(msg) msg.textContent=`Could not send swap request: ${e?.message||'Unknown error'}`; }
  };

  window.respondDutySwap=async(requestId,accept)=>{
    try{
      await EFGCAuth.rest('rpc/respond_to_duty_swap',{method:'POST',headers:jsonHeaders,body:JSON.stringify({p_request_id:Number(requestId),p_accept:Boolean(accept)})});
      toast(accept?'Swap accepted':'Swap declined',accept?'The duty is now assigned to you. Please mark Ready or Not Ready.':'The original Leader still has the duty and can choose another replacement.');
      await load(); if(typeof window.renderPlannerRoster==='function') window.renderPlannerRoster();
    }catch(e){ alert(`Swap response failed: ${e?.message||'Unknown error'}`); }
  };

  window.cancelDutySwap=async(requestId)=>{
    try{
      await EFGCAuth.rest('rpc/cancel_duty_swap',{method:'POST',headers:jsonHeaders,body:JSON.stringify({p_request_id:Number(requestId)})});
      toast('Swap request cancelled','You can select another Leader if needed.'); await load();
    }catch(e){ alert(`Swap request could not be cancelled: ${e?.message||'Unknown error'}`); }
  };

  function boot(){
    ensureHost(); setTimeout(load,2200); timer=setInterval(load,POLL_MS);
    window.addEventListener('focus',load);
    document.addEventListener('visibilitychange',()=>{ if(!document.hidden) load(); });
    window.addEventListener('storage',(e)=>{ if(e.key==='efgcSupabaseAuth'||e.key==='efgcYouthSession') setTimeout(load,500); });
  }

  window.EFGCDutyPanel={ refresh:load };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();
