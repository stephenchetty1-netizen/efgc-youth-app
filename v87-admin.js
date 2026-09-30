(function EFGCV87Admin() {
  'use strict';
  const $ = s => document.querySelector(s);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
  const admin = () => { try { return Boolean(session?.uid && session.role==='admin' && session.approval_status==='approved'); } catch (_) { return false; } };
  let people = [];
  let audit = [];
  let serial = 0;
  function say(text,id='v87AdminStatus') {const n=$('#'+id);if(n)n.textContent=String(text||'');}
  function visibleMembers() {
    const q=($('#v87MemberSearch')?.value||'').trim().toLowerCase();
    const archived=Boolean($('#v87ShowArchived')?.checked);
    const rows=[...document.querySelectorAll('#v87MemberList .v87-member-card')];
    let count=0;
    rows.forEach(row=>{
      const isArchived=row.dataset.memberArchived==='true';
      const show=(archived || !isArchived) && (!q || (row.dataset.memberSearch||'').includes(q));
      row.hidden=!show;
      if(show)count++;
    });
    if($('#v87MemberSearchStatus'))$('#v87MemberSearchStatus').textContent=
      count+' member'+(count===1?'':'s')+' shown'+(archived?' (including archived)':'');
  }
  function ensure() {
    if (!admin()) {$('#v87AdminExtensions')?.remove();return null;}
    const panel=$('#adminPanel');
    if(!panel)return null;
    if($('#v87AdminExtensions'))return $('#v87AdminExtensions');
    const host=document.createElement('div');
    host.id='v87AdminExtensions';
    host.className='v87-admin-extensions';
    host.innerHTML='<div class="v87-panel"><small>EFGC ADMIN • PROTECTED</small><h3>Permission management</h3>'+
      '<p>Leader approvals and account archives are recorded in a read-only audit trail.</p>'+
      '<p id="v87AdminStatus" role="status"></p>'+
      '<div id="v87RoleAudit">Loading access history…</div></div>'+
      '<div class="v87-panel"><small>SAFEGUARDING • VERIFIED BY ADMIN</small><h3>Guardian permission register</h3>'+
      '<p class="v87-muted">Verify birthday sharing with a parent or guardian once for an under-18 member. This approval stays recorded for future annual 08h00 birthday posts unless changed. Members must also opt in themselves. WhatsApp permission remains a separate choice.</p>'+
      '<label>Member<select id="v87GuardianMember"><option value="">Choose a registered member</option></select></label>'+
      '<p id="v87GuardianAge" class="v87-muted"></p>'+
      '<label class="v87-check"><input type="checkbox" id="v87GuardianBirthday">Guardian authorises birthday greeting / photo</label>'+
      '<label class="v87-check"><input type="checkbox" id="v87GuardianWhatsApp">Guardian authorises EFGC WhatsApp updates</label>'+
      '<label class="v87-check"><input type="checkbox" id="v87GuardianVerified">I verified these permissions with a parent or guardian</label>'+
      '<button id="v87SaveGuardian" type="button" class="primary-login">Record verified permission</button>'+
      '<p id="v87GuardianStatus" role="status"></p>'+ 
      '<p id="v108BirthdayPermissionQueue" class="v87-muted" role="status">Checking birthday requests…</p></div>';
    const heading=[...panel.querySelectorAll('h2')].find(h=>/member directory|accounts/i.test(h.textContent||''));
    if(heading)heading.before(host);
    else panel.appendChild(host);
    return host;
  }
  async function render() {
    if(!admin())return;
    const host=ensure();if(!host)return;
    const n=++serial;
    visibleMembers();
    const results=await Promise.allSettled([
      EFGCLive.adminProfiles(), EFGCLive.auditLog(),
      EFGCAuth.rest('member_preferences?select=member_id,birthday_opt_in'),
      EFGCAuth.rest('member_guardian_permissions?select=member_id,birthday_and_photo_authorized'),
    ]);
    if(!admin()||n!==serial||!$('#v87AdminExtensions'))return;
    people=results[0].status==='fulfilled'?results[0].value||[]:[];
    audit=results[1].status==='fulfilled'?results[1].value||[]:[];
    const queue=$('#v108BirthdayPermissionQueue');
    if(queue){
      if(results[0].status!=='fulfilled'||results[2].status!=='fulfilled'||results[3].status!=='fulfilled'){
        queue.textContent='Birthday sharing requests could not be checked. Retry Admin Centre.';
      }else{
        const opted=new Set((results[2].value||[]).filter(p=>p.birthday_opt_in).map(p=>p.member_id));
        const verified=new Set((results[3].value||[]).filter(p=>p.birthday_and_photo_authorized).map(p=>p.member_id));
        const today=new Date();
        const cutoff=new Date(today.getFullYear()-18,today.getMonth(),today.getDate());
        const pending=people.filter(p=>p.archived_at==null && p.birthday &&
          p.approval_status==='approved' && opted.has(p.id) && !verified.has(p.id) &&
          new Date(p.birthday+'T12:00:00')>cutoff);
        queue.textContent=pending.length ?
          'One-time birthday permission still to verify ('+pending.length+'): '+
            pending.map(p=>p.full_name).join(' • ')+'. Select a member above, confirm permission and save once.' :
          'No opted-in under-18 birthday greetings await guardian verification.';
      }
    }
    const select=$('#v87GuardianMember');
    if(select)select.innerHTML='<option value="">Choose a registered member</option>'+
      people.filter(p=>p.role!=='admin'&&!p.archived_at)
        .map(p=>'<option value="'+esc(p.id)+'">'+esc(p.full_name)+' ('+esc(p.role)+')</option>').join('');
    const box=$('#v87RoleAudit');
    if(box)box.innerHTML=audit.length?audit.slice(0,20).map(item=>
      '<div class="v87-entry"><strong>'+esc(item.target_name)+'</strong><p>'+
      esc(item.action.replace('_',' '))+' • '+esc(item.previous_role||'—')+' → '+esc(item.new_role||'—')+
      '</p><small>By '+esc(people.find(p=>p.id===item.actor_id)?.full_name||'Admin (account unavailable)')+
      ' • '+esc(new Date(item.changed_at).toLocaleString('en-ZA'))+'</small></div>').join(''):
      '<p class="v87-muted">No access changes recorded since the audit was enabled.</p>';
    if(results.some(r=>r.status==='rejected'))say('Some Admin details could not be loaded. Use Retry connection.');
    else say('Account roles and guardian permissions are protected by database access controls.');
  }
  async function guardianChanged() {
    if(!admin())return;
    const id=$('#v87GuardianMember')?.value||'';
    const p=people.find(person=>person.id===id);
    const b=$('#v87GuardianBirthday'),w=$('#v87GuardianWhatsApp'),v=$('#v87GuardianVerified');
    if(b)b.checked=false;if(w)w.checked=false;if(v)v.checked=false;
    if(!p){say('Choose a member.','v87GuardianAge');return;}
    const dob=p.birthday?new Date(p.birthday+'T12:00:00'):null;
    const ageKnown=dob&&!Number.isNaN(dob.getTime());
    const minorOrUnknown=!ageKnown||dob>new Date(new Date().setFullYear(new Date().getFullYear()-18));
    say(minorOrUnknown?'Under 18 or date of birth missing: guardian confirmation required before birthday publication.':
      'Adult account. Personal opt-in is still required for birthday sharing.','v87GuardianAge');
    try{
      const rows=await EFGCLive.guardianPermission(id);
      if($('#v87GuardianMember')?.value!==id)return;
      const g=rows?.[0]||{};
      if(b)b.checked=Boolean(g.birthday_and_photo_authorized);
      if(w)w.checked=Boolean(g.whatsapp_authorized);
      say(g.verified_at?'Existing verification: '+new Date(g.verified_at).toLocaleString('en-ZA'):
        'No guardian verification recorded.','v87GuardianStatus');
    }catch(e){say(e.message||'Could not load guardian permission.','v87GuardianStatus');}
  }
  async function saveGuardian() {
    if(!admin())return;
    const id=$('#v87GuardianMember')?.value||'';
    const birthday=Boolean($('#v87GuardianBirthday')?.checked);
    const whatsapp=Boolean($('#v87GuardianWhatsApp')?.checked);
    const verified=Boolean($('#v87GuardianVerified')?.checked);
    const button=$('#v87SaveGuardian');
    if(!people.some(p=>p.id===id))return say('Choose a valid member.','v87GuardianStatus');
    if((birthday||whatsapp)&&!verified)
      return say('Confirm that you verified this permission with the parent or guardian.','v87GuardianStatus');
    if(button)button.disabled=true;
    try{
      await EFGCLive.adminSaveGuardianPermission(id,birthday,whatsapp);
      say('Guardian permission recorded. Member opt-in is still required before publication or direct messaging.','v87GuardianStatus');
      if($('#v87GuardianVerified'))$('#v87GuardianVerified').checked=false;
    }catch(e){say(e.message||'Permission was not recorded.','v87GuardianStatus');}
    finally{if(button?.isConnected)button.disabled=false;}
  }
  window.adminArchiveMember=async(id,archive)=>{
    if(!admin()||!people.some(p=>p.id===id && p.role!=='admin'))return;
    const p=people.find(p=>p.id===id);
    if(!window.confirm((archive?'Archive ':'Restore ')+p.full_name+'? '+(archive?
      'They will not be able to sign in until restored. Existing records remain available to authorised Admins.':
      'This will allow the member to sign in again.')))return;
    try{
      say((archive?'Archiving':'Restoring')+' account…');
      await EFGCLive.adminArchiveMember(id,archive);
      await renderLiveData();
      say(archive?'Member account archived.':'Member account restored.');
    }catch(e){say('Could not update account: '+(e.message||'Check Admin access.'));}
  };
  document.addEventListener('input',e=>{
    if(e.target.id==='v87MemberSearch')visibleMembers();
  });
  document.addEventListener('change',e=>{
    if(e.target.id==='v87ShowArchived')visibleMembers();
    if(e.target.id==='v87GuardianMember')guardianChanged();
  });
  document.addEventListener('click',e=>{
    if(e.target.closest?.('#v87SaveGuardian'))saveGuardian();
    if(e.target.closest?.('[data-tab="admin"]'))setTimeout(render,100);
  });
  const previousLive=window.renderLiveData;
  if(typeof previousLive==='function')window.renderLiveData=async function(...args){
    const r=await previousLive.apply(this,args);
    if(admin())await render();
    return r;
  };
  window.EFGCV87Admin={render,visibleMembers};
})();
