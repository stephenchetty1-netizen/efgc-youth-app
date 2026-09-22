(function EFGCV87Ministry() {
  'use strict';
  const $ = s => document.querySelector(s);
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const current = () => { try { return session?.uid ? session : null; } catch (_) { return null; } };
  const isAdmin = () => current()?.role === 'admin';
  const isLeader = () => current()?.role === 'leader' && current()?.approval_status === 'approved';
  const isStaff = () => isAdmin() || isLeader();
  const uuid = id => /^[0-9a-f-]{36}$/i.test(String(id || ''));
  const headers = { 'Content-Type':'application/json', Prefer:'return=representation' };
  const stamp = value => new Date(value).toLocaleString('en-ZA', {day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
  const challenges = [
    ['matthew-5-16','Matthew 5:16','Let your light shine.'],
    ['philippians-4-13','Philippians 4:13','Find strength in Christ.'],
    ['psalm-23','Psalm 23','Remember the Good Shepherd.'],
    ['isaiah-41-10','Isaiah 41:10','Choose faith over fear.'],
    ['romans-12-1','Romans 12:1','Live a life of worship.'],
    ['jeremiah-29-11','Jeremiah 29:11','Trust God with your future.'],
    ['hebrews-12-1','Hebrews 12:1–2','Run with perseverance.']
  ];
  let lastEvents = [];
  let lastDrafts = [];
  let lastProgress = new Set();
  let loadSerial = 0;
  function weekId() {
    const d = new Date();
    const utc = new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));
    utc.setUTCDate(utc.getUTCDate()+4-(utc.getUTCDay()||7));
    const year = utc.getUTCFullYear();
    return year+'-W'+String(Math.ceil((((utc-new Date(Date.UTC(year,0,1)))/86400000)+1)/7)).padStart(2,'0');
  }
  function ensure() {
    let section = $('#ministry');
    if (!section) {
      section = document.createElement('section');
      section.id = 'ministry';
      section.className = 'tab hidden';
      section.innerHTML = '<div id="v87MinistryHost" aria-live="polite"></div>';
      const main = document.querySelector('main');
      if (main) main.insertBefore(section, $('#profile') || $('#admin') || null);
    }
    return section;
  }
  function status(text, id='v87JourneyStatus') {
    const el = $('#'+id);
    if (el) el.textContent = String(text || '');
  }
  const panel = (title, body, kicker='BUILD • BELONG • BE A LIGHT') =>
    '<article class="v87-panel"><small>'+esc(kicker)+'</small><h3>'+esc(title)+'</h3>'+body+'</article>';
  const empty = text => '<p class="v87-muted">'+esc(text)+'</p>';
  function readingHtml() {
    const prefix='v87-'+weekId()+'-';
    return '<p class="v87-muted">A private weekly Bible-reading checklist. No streak rankings or public scores.</p>'+
      challenges.map(([key,ref,prompt]) => {
        const item=prefix+key, done=lastProgress.has(item);
        return '<div class="v87-list-row"><div><strong>'+esc(ref)+'</strong><p>'+esc(prompt)+'</p></div>'+
          '<button type="button" data-v87-reading="'+esc(item)+'" class="'+(done?'v87-success':'')+'">'+
          (done?'✓ Completed':'Mark read')+'</button></div>';
      }).join('');
  }
  function preferencesHtml(prefs) {
    const ck = key => prefs?.[key] ? ' checked' : '';
    return panel('My sharing preferences',
      '<p class="v87-muted">Nothing below is an automatic post or message. Turn on only what you agree EFGC Youth may use. A guardian’s permission is also required for under-18 birthday publication.</p>'+
      '<label class="v87-check"><input type="checkbox" id="v87BirthdayOptIn"'+ck('birthday_opt_in')+'>Birthday greeting may be shared publicly</label>'+
      '<label class="v87-check"><input type="checkbox" id="v87PhotoOptIn"'+ck('photo_opt_in')+'>My photo may appear in an approved greeting</label>'+
      '<label class="v87-check"><input type="checkbox" id="v87WhatsAppOptIn"'+ck('whatsapp_opt_in')+'>I agree to receive EFGC ministry updates on WhatsApp</label>'+
      '<button type="button" id="v87SavePreferences" class="primary-login">Save my preferences</button>'+
      '<p id="v87PreferencesStatus" role="status"></p>', 'PRIVACY • YOUR CHOICE');
  }
  function prayersHtml(rows) {
    const s = current();
    const list = rows.map(row => '<div class="v87-entry"><small>'+
      (row.requester_id===s.uid?'Your request':isAdmin()?'Member request':'Shared with approved Leaders')+
      ' • '+esc(stamp(row.created_at))+
      ' • '+esc(row.sharing_scope==='admin_only'?'Admin only':'Approved Leaders')+
      '</small><p>'+esc(row.prayer_text)+'</p><span class="v87-pill">'+esc(row.status)+'</span>'+
      (isAdmin() && row.status==='open'
        ? '<button type="button" data-v87-prayer-close="'+esc(row.id)+'">Mark closed</button>':'')+
      '</div>').join('');
    return panel('Private prayer requests',
      '<p class="v87-muted">Choose who is allowed to read your prayer request. It never appears in the public News Feed.</p>'+
      '<label>Your request<textarea id="v87PrayerText" maxlength="2500" rows="4" placeholder="How can we pray with you?"></textarea></label>'+
      '<label>Share with<select id="v87PrayerScope"><option value="admin_only">Admin only</option>'+
      '<option value="approved_leaders">Admin and approved Leaders</option></select></label>'+
      '<button type="button" id="v87SendPrayer" class="primary-login">Submit private prayer request</button>'+
      '<p id="v87PrayerStatus" role="status"></p><h4>Prayer requests visible to you</h4>'+
      (list || empty('No prayer requests to show.')), 'PRAYER • PROTECTED');
  }
  function testimoniesHtml(rows) {
    const s = current();
    const content=rows.slice(0,25).map(r=>'<div class="v87-entry"><small>'+
      esc(r.status==='approved'?'Approved testimony':r.status==='pending'?'Pending Admin review':'Not approved')+
      ' • '+esc(stamp(r.created_at))+'</small><p>'+esc(r.testimony_text)+'</p>'+
      (isAdmin() && r.status==='pending' ?
       '<div class="v87-actions"><button data-v87-testimony="'+esc(r.id)+'" data-v87-decision="approved">Approve</button>'+
       '<button data-v87-testimony="'+esc(r.id)+'" data-v87-decision="rejected">Reject</button></div>':'')+
      '</div>').join('');
    return panel('Testimonies',
      '<p class="v87-muted">Share what God has done. Your testimony is reviewed by an Admin before other members can read it.</p>'+
      '<label>Your testimony<textarea id="v87TestimonyText" maxlength="3000" rows="4" placeholder="Share your testimony…"></textarea></label>'+
      '<button type="button" id="v87SubmitTestimony" class="primary-login">Send for review</button>'+
      '<p id="v87TestimonyStatus" role="status"></p><h4>Approved testimonies and your submissions</h4>'+
      (content || empty('No testimonies have been shared yet.')), 'YOUR STORY • HIS GLORY');
  }
  function draftHtml(d) {
    const approved=d.status==='approved';
    const mine=d.author_id===current()?.uid;
    return '<div class="v87-entry"><small>'+esc(d.status)+' • '+esc(stamp(d.created_at))+'</small>'+
      '<p>'+esc(d.content)+'</p><div class="v87-actions">'+
      (isAdmin() && d.status==='pending' ?
        '<button data-v87-draft="'+esc(d.id)+'" data-v87-draft-decision="approved">Approve text</button>'+
        '<button data-v87-draft="'+esc(d.id)+'" data-v87-draft-decision="rejected">Reject</button>':'')+
      (approved && (isAdmin()||mine) ?
        '<button data-v87-copy="'+esc(d.id)+'">Copy approved text</button>'+
        '<a class="v87-share" href="https://wa.me/?text='+encodeURIComponent(d.content)+'" target="_blank" rel="noopener noreferrer">Open WhatsApp</a>':'')+
      '</div></div>';
  }
  function whatsappHtml(drafts) {
    const upcoming=lastEvents.filter(e=>new Date(e.event_date).getTime()>=Date.now()).slice(0,30);
    return panel('WhatsApp communication drafts',
      '<p class="v87-muted">Create a meeting reminder. Only an Admin-approved draft can be shared from this screen. Opening WhatsApp does not send a message automatically. Send direct updates only to members who opted in, with guardian permission where required.</p>'+
      '<label>Upcoming event<select id="v87DraftEvent"><option value="">Select a meeting (optional)</option>'+
      upcoming.map(e=>'<option value="'+Number(e.id)+'">'+esc(e.title)+' • '+esc(stamp(e.event_date))+'</option>').join('')+
      '</select></label>'+
      '<label>Message<textarea id="v87DraftContent" maxlength="2000" rows="5" placeholder="Write the reminder, venue and any transport arrangements…"></textarea></label>'+
      '<button type="button" id="v87SubmitDraft" class="primary-login">Save for Admin approval</button>'+
      '<p id="v87DraftStatus" role="status"></p><h4>Messages visible to you</h4>'+
      (drafts.map(draftHtml).join('') || empty('No WhatsApp drafts yet.')), 'COMMUNICATE • WITH CARE');
  }
  async function render() {
    const s = current();
    const section=ensure();
    const host=$('#v87MinistryHost');
    if (!section || !host) return;
    if (!s) { section.classList.add('hidden'); host.replaceChildren(); return; }
    const serial=++loadSerial;
    host.innerHTML='<div class="v87-journey-head"><small>EFGC YOUTH</small><h2>'+
      (isAdmin()?'Ministry Centre':isLeader()?'Leader Hub':'My Faith Journey')+
      '</h2><p>Fun, fellowship, faith and safe communication.</p></div>'+
      '<p id="v87JourneyStatus" role="status">Loading your ministry information…</p>'+
      '<div id="v87JourneyBody"></div>';
    const queries=[
      EFGCAuth.rest('member_preferences?select=member_id,birthday_opt_in,photo_opt_in,whatsapp_opt_in&member_id=eq.'+encodeURIComponent(s.uid)),
      EFGCAuth.rest('prayer_requests?select=id,requester_id,prayer_text,sharing_scope,status,created_at&order=created_at.desc&limit=35'),
      EFGCAuth.rest('testimonies?select=id,author_id,testimony_text,status,created_at&order=created_at.desc&limit=35'),
      EFGCAuth.rest('reading_progress?select=challenge_key&member_id=eq.'+encodeURIComponent(s.uid)),
      isStaff() ? EFGCAuth.rest('whatsapp_message_drafts?select=id,event_id,author_id,content,status,created_at&order=created_at.desc&limit=30') : Promise.resolve([]),
      isStaff() ? EFGCLive.events() : Promise.resolve([])
    ];
    const settled=await Promise.allSettled(queries);
    if (!current() || current().uid!==s.uid || serial!==loadSerial || !$('#v87JourneyBody')) return;
    const take=(i)=>settled[i].status==='fulfilled' && Array.isArray(settled[i].value) ? settled[i].value : [];
    const prefs=take(0)[0]||null, prayers=take(1), testimonies=take(2), progress=take(3);
    lastDrafts=take(4);lastEvents=take(5);
    lastProgress=new Set(progress.map(p=>p.challenge_key));
    const failed=settled.map((r,i)=>r.status==='rejected'?['preferences','prayers','testimonies','reading','WhatsApp drafts','events'][i]:null).filter(Boolean);
    const title=failed.length?'Some sections could not load: '+failed.join(', ')+'. Use Retry connection.':'Your information is up to date.';
    status(title);
    $('#v87JourneyBody').innerHTML =
      '<div class="v87-panels">'+
      preferencesHtml(prefs)+panel('Bible-reading challenge',readingHtml(),'FAITH • ONE DAY AT A TIME')+
      prayersHtml(prayers)+testimoniesHtml(testimonies)+
      (isStaff()?whatsappHtml(lastDrafts):'')+'</div>';
  }
  async function savePreferences() {
    const s=current(),button=$('#v87SavePreferences');if(!s||!button)return;
    button.disabled=true;
    try{
      const changes={
        member_id:s.uid,
        birthday_opt_in:Boolean($('#v87BirthdayOptIn')?.checked),
        photo_opt_in:Boolean($('#v87PhotoOptIn')?.checked),
        whatsapp_opt_in:Boolean($('#v87WhatsAppOptIn')?.checked),
        updated_at:new Date().toISOString()
      };
      const rows=await EFGCAuth.rest('member_preferences?on_conflict=member_id',{
        method:'POST',headers:{...headers,Prefer:'resolution=merge-duplicates,return=representation'},
        body:JSON.stringify(changes)
      });
      if(!rows?.length)throw Error('Your preferences were not saved.');
      status('Preferences saved. Your choice controls future sharing.','v87PreferencesStatus');
    }catch(e){status(e.message||'Could not save preferences.','v87PreferencesStatus');}
    finally{if(button.isConnected)button.disabled=false;}
  }
  async function submitPrayer() {
    const s=current(),button=$('#v87SendPrayer'),value=$('#v87PrayerText')?.value.trim()||'';
    if(!s||!button)return;
    if(value.length<3)return status('Write your prayer request first.','v87PrayerStatus');
    button.disabled=true;
    try{
      const rows=await EFGCAuth.rest('prayer_requests',{
        method:'POST',headers,body:JSON.stringify({
          requester_id:s.uid,prayer_text:value,
          sharing_scope:$('#v87PrayerScope')?.value==='approved_leaders'?'approved_leaders':'admin_only'
        })
      });
      if(!rows?.length)throw Error('Prayer request was not saved.');
      await render();
      status('Your private prayer request has been submitted.','v87PrayerStatus');
    }catch(e){status(e.message||'Could not submit prayer request.','v87PrayerStatus');}
    finally{if(button.isConnected)button.disabled=false;}
  }
  async function submitTestimony() {
    const s=current(),button=$('#v87SubmitTestimony'),value=$('#v87TestimonyText')?.value.trim()||'';
    if(!s||!button)return;
    if(value.length<10)return status('Please write at least 10 characters.','v87TestimonyStatus');
    button.disabled=true;
    try{
      const rows=await EFGCAuth.rest('testimonies',{
        method:'POST',headers,body:JSON.stringify({author_id:s.uid,testimony_text:value,status:'pending'})
      });
      if(!rows?.length)throw Error('Testimony was not saved.');
      await render();
      status('Testimony received for Admin review. Nothing has been published yet.','v87TestimonyStatus');
    }catch(e){status(e.message||'Could not submit testimony.','v87TestimonyStatus');}
    finally{if(button.isConnected)button.disabled=false;}
  }
  async function respondTestimony(id,decision) {
    if(!isAdmin()||!uuid(id)||!['approved','rejected'].includes(decision))return;
    try{
      const rows=await EFGCAuth.rest('testimonies?id=eq.'+encodeURIComponent(id)+'&status=eq.pending',{
        method:'PATCH',headers,body:JSON.stringify({
          status:decision,reviewed_by:EFGCAuth.userId(),reviewed_at:new Date().toISOString()
        })
      });
      if(!rows?.length)throw Error('This submission is no longer pending.');
      await render();status(decision==='approved'?'Testimony approved.':'Testimony not approved.');
    }catch(e){status(e.message||'Could not save review.');}
  }
  async function toggleReading(key) {
    const s=current(),b=document.querySelector('[data-v87-reading="'+key+'"]');
    if(!s||!/^v87-\d{4}-W\d{2}-[a-z0-9-]+$/.test(key)||!b)return;
    b.disabled=true;
    try{
      if(lastProgress.has(key)){
        await EFGCAuth.rest('reading_progress?member_id=eq.'+encodeURIComponent(s.uid)+'&challenge_key=eq.'+encodeURIComponent(key),{
          method:'DELETE',headers:{Prefer:'return=minimal'}
        });
        lastProgress.delete(key);
      }else{
        const rows=await EFGCAuth.rest('reading_progress',{
          method:'POST',headers,body:JSON.stringify({member_id:s.uid,challenge_key:key})
        });
        if(!rows?.length)throw Error('Could not mark this reading complete.');
        lastProgress.add(key);
      }
      b.textContent=lastProgress.has(key)?'✓ Completed':'Mark read';
      b.classList.toggle('v87-success',lastProgress.has(key));
    }catch(e){status(e.message||'Could not save progress.');}
    finally{if(b.isConnected)b.disabled=false;}
  }
  function prefillDraft() {
    const id=Number($('#v87DraftEvent')?.value);
    const event=lastEvents.find(e=>Number(e.id)===id);
    if(!event)return;
    const body=$('#v87DraftContent');
    if(body)body.value='Shalom EFGC Youth! 🙏 Reminder: '+event.title+
      ' on '+stamp(event.event_date)+'. Venue: [confirm location]. Please reply if you need transport. Bring a friend! God bless.';
  }
  async function saveDraft() {
    const s=current(),button=$('#v87SubmitDraft'),value=$('#v87DraftContent')?.value.trim()||'';
    if(!isStaff()||!s||!button)return;
    if(value.length<10)return status('Write a complete reminder first.','v87DraftStatus');
    button.disabled=true;
    try{
      const eventId=Number($('#v87DraftEvent')?.value);
      const rows=await EFGCAuth.rest('whatsapp_message_drafts',{
        method:'POST',headers,body:JSON.stringify({
          author_id:s.uid,event_id:eventId||null,content:value,status:'pending'
        })
      });
      if(!rows?.length)throw Error('Draft was not saved.');
      await render();status('Draft saved for Admin approval. No WhatsApp message was sent.','v87DraftStatus');
    }catch(e){status(e.message||'Could not save the draft.','v87DraftStatus');}
    finally{if(button.isConnected)button.disabled=false;}
  }
  async function reviewDraft(id,decision) {
    if(!isAdmin()||!uuid(id)||!['approved','rejected'].includes(decision))return;
    try{
      const rows=await EFGCAuth.rest('whatsapp_message_drafts?id=eq.'+encodeURIComponent(id)+'&status=eq.pending',{
        method:'PATCH',headers,body:JSON.stringify({
          status:decision,approved_by:EFGCAuth.userId(),approved_at:new Date().toISOString()
        })
      });
      if(!rows?.length)throw Error('The draft is no longer pending.');
      await render();status(decision==='approved'?'Message text approved. Share it manually when ready.':'Message draft rejected.','v87DraftStatus');
    }catch(e){status(e.message||'Could not save review.','v87DraftStatus');}
  }
  async function copyDraft(id) {
    const d=lastDrafts.find(x=>x.id===id && x.status==='approved');
    if(!d)return;
    try{
      if(navigator.clipboard?.writeText){
        await navigator.clipboard.writeText(d.content);
        status('Approved message copied.','v87DraftStatus');
      }else{
        window.prompt('Copy approved EFGC message:',d.content);
      }
    }catch(e){status('Copy unavailable. Use Open WhatsApp to review the approved message.','v87DraftStatus');}
  }
  async function closePrayer(id) {
    if(!isAdmin()||!uuid(id))return;
    try{
      const rows=await EFGCAuth.rest('prayer_requests?id=eq.'+encodeURIComponent(id),{
        method:'PATCH',headers,body:JSON.stringify({status:'closed'})
      });
      if(!rows?.length)throw Error('Prayer request was not updated.');
      await render();status('Prayer request marked closed.','v87PrayerStatus');
    }catch(e){status(e.message||'Could not update request.','v87PrayerStatus');}
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest?.('button');
    if(!button || !current())return;
    if(button.id==='v87SavePreferences')savePreferences();
    else if(button.id==='v87SendPrayer')submitPrayer();
    else if(button.id==='v87SubmitTestimony')submitTestimony();
    else if(button.id==='v87SubmitDraft')saveDraft();
    else if(button.dataset.v87Reading)toggleReading(button.dataset.v87Reading);
    else if(button.dataset.v87Testimony)respondTestimony(button.dataset.v87Testimony,button.dataset.v87Decision);
    else if(button.dataset.v87Draft)reviewDraft(button.dataset.v87Draft,button.dataset.v87DraftDecision);
    else if(button.dataset.v87Copy)copyDraft(button.dataset.v87Copy);
    else if(button.dataset.v87PrayerClose)closePrayer(button.dataset.v87PrayerClose);
    else if(button.dataset.tab==='ministry' || button.dataset.mockTab==='ministry')setTimeout(render,0);
  });
  document.addEventListener('change',event=>{
    if(event.target.id==='v87DraftEvent')prefillDraft();
  });
  const previousLive=window.renderLiveData;
  if(typeof previousLive==='function')window.renderLiveData=async function(...args){
    const r=await previousLive.apply(this,args);
    if(current())await render();else $('#ministry')?.classList.add('hidden');
    return r;
  };
  const previousShell=window.renderShell;
  if(typeof previousShell==='function')window.renderShell=function(...args){
    const r=previousShell.apply(this,args);
    if(!current()) { ++loadSerial; $('#ministry')?.classList.add('hidden'); }
    return r;
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensure,{once:true});
  else ensure();
  window.EFGCV87Ministry={render};
})();
