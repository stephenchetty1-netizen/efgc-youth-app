/** V101: resilient attendance route; clear stale Admin data on account switch. */
(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const admin = () => { try {
    return Boolean(session?.uid && session.role==='admin' &&
      session.approval_status==='approved');
  } catch { return false; } };
  let lastAccount=null;
  const host = () => $('#attendanceAdminHost');
  function clearIfDifferent(){
    const id=(()=>{try{return session?.uid||null;}catch{return null;}})();
    if(id===lastAccount)return;
    lastAccount=id;
    const h=host();
    if(h)h.innerHTML='<div class="module-heading"><h2>Attendance Register</h2>'+
      '<p>Select Record Attendance to load authorised meeting records.</p></div>';
    $('#attendanceAdmin')?.classList.add('hidden');
    if(!admin())$('#attendanceMenu')?.classList.add('hidden');
  }
  const beforeShell=window.renderShell;
  if(typeof beforeShell==='function')window.renderShell=function(...args){
    clearIfDifferent();
    return beforeShell.apply(this,args);
  };
  const beforeTab=window.showTab;
  if(typeof beforeTab==='function')window.showTab=function(id,...args){
    if(id==='attendanceAdmin'&&!admin())return;
    const result=beforeTab.call(this,id,...args);
    if(id==='attendanceAdmin'&&admin()){
      const h=host();
      // Discard old form immediately: a delayed refresh must not replace inputs
      // after the Admin starts typing a new event date.
      if(h)h.innerHTML='<article class="module-card" role="status"><h2>Attendance Register</h2>'+
        '<p>Loading approved Youth and meetings…</p></article>';
      // Preserve existing data if already displayed; the route click handler
      // will refresh it, including any empty-state or permission error.
      if(typeof window.renderAttendanceAdmin==='function')
        queueMicrotask(()=>{if(!$('#attendanceAdmin')?.classList.contains('hidden'))
          void window.renderAttendanceAdmin();});
    }
    return result;
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',clearIfDifferent,{once:true});
  else clearIfDifferent();
  window.EFGCV101Attendance={clearIfDifferent};
})();