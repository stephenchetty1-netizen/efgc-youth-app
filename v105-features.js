/** V105 Community Hub. All writes use the signed-in member and database RLS. */
(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const user = () => { try { return session?.uid && session.approval_status === 'approved' ? session : null; } catch { return null; } };
  const identity = () => { const s=user(); return s ? [s.uid,s.role,s.approval_status].join('|') : ''; };
  const admin = () => user()?.role === 'admin';
  const headers = {'Content-Type':'application/json',Prefer:'return=representation'};
  const tabs = {devotional:'Devotional',prayer:'Prayer Wall',checkin:'Check-in',group:'Groups',testimony:'Testimonies',resource:'Resources',service:'Serve',mentoring:'Mentoring',setlist:'Setlists',summary:'My Year'};
  const contentKinds = ['prayer','devotional','group','resource','service','setlist'];
  let active='devotional', generation=0, lastIdentity='', busy=false;
  const dateZA = value => new Date(value).toLocaleString('en-ZA',{timeZone:'Africa/Johannesburg',dateStyle:'medium',timeStyle:'short'});
  const today = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Johannesburg',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const safeUrl = value => { try { const u=new URL(value); return u.protocol==='https:' && !u.username && !u.password ? u.href : ''; } catch { return ''; } };
  const rest = (path, options={}) => EFGCAuth.rest(path,options);
  const card = (title,body) => '<article class="v105-card"><h3>'+esc(title)+'</h3>'+body+'</article>';
  const empty = text => '<p class="v105-empty">'+esc(text)+'</p>';
  const btn = (label,action,id='',extra='') => '<button type="button" data-v105-action="'+action+'" data-id="'+esc(id)+'" '+extra+'>'+esc(label)+'</button>';
  function note(text) { const el=$('#v105Status'); if(el)el.textContent=text; }
  function ensure() {
    if(!$('#communityHub')) {
      const section=document.createElement('section'); section.id='communityHub';section.className='tab hidden';
      section.innerHTML='<div class="v105-hero"><small>BUILD • BELONG • BE A LIGHT</small><h2>Grow together.</h2><p>Faith for every day. A place for every member.</p></div><div class="v105-tabs" aria-label="Community Hub sections">'+
        Object.entries(tabs).map(([key,label])=>'<button type="button" data-v105-tab="'+key+'" aria-pressed="false">'+label+'</button>').join('')+
        '</div><p id="v105Status" role="status" aria-live="polite"></p><div id="v105Body"></div>';
      $('main')?.appendChild(section);
    }
    if(!$('#v105Menu')) {
      const b=document.createElement('button');b.id='v105Menu';b.className='menu-item';b.dataset.tab='communityHub';
      b.innerHTML='<span class="nav-glyph">✦</span>Community Hub';$('#mainMenu')?.appendChild(b);
    }
    $('#v105Menu')?.classList.toggle('hidden',!user());
  }
  function reset() {
    const id=identity();
    if(id!==lastIdentity) {lastIdentity=id;generation++;busy=false;active='devotional';$('#v105Body')?.replaceChildren();note('');$('#communityHub')?.classList.add('hidden');}
    ensure();
  }
  function compose(kind) {
    if(!admin() && kind!=='prayer')return '';
    return card(kind==='prayer'?'Share a prayer':'Publish '+tabs[kind].toLowerCase(),
      (kind==='prayer'?'<p>After Admin approval, all signed-in members can read this prayer. Leave out personal contact details. For confidential support, use Private prayer in My Journey.</p>':'')+
      '<form id="v105ContentForm"><label>Title<input name="title" required minlength="3" maxlength="120"></label><label>'+ (kind==='setlist'?'Songs, keys and order':'Message or details')+'<textarea name="body" required minlength="3" maxlength="5000"></textarea></label>'+
      (kind==='prayer'?'':'<label>Link (optional, https)<input name="url" type="url" maxlength="1500" placeholder="https://"></label>')+
      '<button class="v105-primary" type="submit">'+(kind==='prayer'?'Submit for review':'Publish')+'</button></form>');
  }
  const reflections = [
    ['Philippians 4:13','I can do all things through Christ which strengtheneth me.','Paul speaks of strength in both need and plenty. Bring today’s challenges to Christ and take one faithful step, trusting His strength rather than your own.','Where do you need Christ’s strength today?'],
    ['Matthew 5:16','Let your light so shine before men, that they may see your good works, and glorify your Father which is in heaven.','A quiet act of kindness can point someone towards God. Choose one practical way to serve today, without needing recognition.','Who could you encourage today?'],
    ['Psalm 23:1','The LORD is my shepherd; I shall not want.','You are known and cared for by the Good Shepherd. Pause and entrust your needs to Him, asking for wisdom to follow His leading.','What worry can you bring to God?'],
    ['Isaiah 41:13','For I the LORD thy God will hold thy right hand, saying unto thee, Fear not; I will help thee.','God’s presence gives courage when the next step feels uncertain. Ask Him for help, and allow trusted people to support you too.','What faithful step can you take today?'],
    ['Hebrews 4:16','Let us therefore come boldly unto the throne of grace, that we may obtain mercy, and find grace to help in time of need.','Because of Jesus, you can approach God honestly. Prayer is a place to receive mercy and help, even when your words are simple.','What do you want to tell God honestly?'],
    ['Psalm 119:105','Thy word is a lamp unto my feet, and a light unto my path.','God’s Word guides the next step. Read slowly, reflect on what it reveals about Him, and put one truth into practice today.','Which choice needs the light of Scripture?'],
    ['Romans 12:1','I beseech you therefore, brethren, by the mercies of God, that ye present your bodies a living sacrifice, holy, acceptable unto God, which is your reasonable service.','Worship continues beyond a song. Offer God your time, your decisions and the way you treat people as a response to His mercy.','How can your everyday actions become worship?']
  ];
  async function daily() {
    const day=today(), key='v105-devotional-'+day;
    const entry=reflections[Math.floor(Date.parse(day+'T12:00:00Z')/86400000)%reflections.length];
    const progress=await rest('reading_progress?select=challenge_key&member_id=eq.'+user().uid+'&challenge_key=eq.'+key);
    return card('Today’s devotional', '<div class="v105-meta">'+esc(day)+' • Scripture: KJV • Weekly devotional cycle</div><h4>'+esc(entry[0])+'</h4><p class="v105-copy">'+esc(entry[1])+'</p><p>'+esc(entry[2])+'</p><p><strong>Reflect:</strong> '+esc(entry[3])+'</p>'+btn(progress.length?'✓ Read today':'Mark as read','read',key,progress.length?'disabled':''));
  }
  async function content(kind) {
    const list=await rest('v105_content?select=*&kind=eq.'+kind+'&order=created_at.desc&limit=50');
    const signups=['group','service'].includes(kind) ? await rest('v105_signups?select=post_id,status&member_id=eq.'+user().uid) : [];
    const html=list.map(r=>card(r.title,'<div class="v105-meta">'+esc(r.status==='published'?'Shared with members':r.status)+' • '+esc(dateZA(r.created_at))+'</div><p class="v105-copy">'+esc(r.body)+'</p>'+
      (safeUrl(r.url)?'<a class="v105-link" href="'+esc(safeUrl(r.url))+'" target="_blank" rel="noopener noreferrer">Open resource ↗</a>':'')+
      '<div class="v105-actions">'+
      (admin() && r.status==='pending'?btn('Approve','publish',r.id)+btn('Archive','archive',r.id):'')+
      (admin() && r.status==='published'?btn('Archive','archive',r.id):'')+
      (r.kind==='prayer' && r.created_by===user().uid?btn('Withdraw prayer','withdraw',r.id):'')+
      (['group','service'].includes(kind)&&r.status==='published' ? (()=>{const s=signups.find(x=>x.post_id===r.id);return s?'<span>'+esc('Your request: '+s.status)+'</span>'+btn('Withdraw request','leave',r.id):btn(kind==='group'?'Request to join':'Volunteer','join',r.id);})():'')+'</div>')).join('');
    return (kind==='devotional'?await daily():'')+compose(kind)+'<h3>'+tabs[kind]+'</h3><p class="v105-meta">Latest 50 entries</p><div class="v105-grid">'+(html||empty('No '+tabs[kind].toLowerCase()+' have been published yet.'))+'</div>'+(['group','service'].includes(kind)&&admin()?await signupQueue(kind):'');
  }
  async function signupQueue(kind) {
    const items=await rest('v105_signups?select=id,status,profiles(full_name),v105_content!inner(title,kind)&v105_content.kind=eq.'+kind+'&order=created_at.desc&limit=100');
    return card('Membership and volunteer requests',items.map(r=>'<div class="v105-card"><b>'+esc(r.profiles?.full_name||'Member')+'</b><p>'+esc(r.v105_content?.title)+' • '+esc(r.status)+'</p>'+ (r.status==='requested'?btn('Approve','signup-approve',r.id)+btn('Decline','signup-decline',r.id):'')+'</div>').join('')||empty('No requests yet.'));
  }
  async function checkin() {
    const s=user(); const now=new Date(), low=new Date(now.getTime()-6*3600000).toISOString(), high=new Date(now.getTime()+2*3600000).toISOString();
    const events=await rest('events?select=id,title,event_date&attendance_approved=eq.false&event_date=gte.'+low+'&event_date=lte.'+high+'&order=event_date');
    const checks=await rest('v105_checkins?select=event_id,member_id,created_at'+(admin()?'': '&member_id=eq.'+s.uid));
    let html=card('I’m here','<p>Youth check-in opens two hours before a meeting and closes six hours after its start. Your check-in is a request for the Admin to verify in the attendance register.</p>'+
      (s.role!=='youth'?'<p>Self check-in is for Youth accounts.</p>':events.map(e=>'<div class="v105-card"><b>'+esc(e.title)+'</b><p>'+esc(dateZA(e.event_date))+'</p>'+btn(checks.some(c=>c.event_id===e.id)?'✓ Check-in sent':'Check in','checkin',e.id,checks.some(c=>c.event_id===e.id)?'disabled':'')+'</div>').join('')||empty('No meetings are open for check-in right now.')));
    if(admin()) {
      const queue=await rest('v105_checkins?select=created_at,profiles(full_name),events(title,event_date,attendance_approved)&order=created_at.desc&limit=100');
      html+=card('Recent Youth check-ins','<p>Verify these requests in Record Attendance. A self check-in does not mark a member present automatically.</p>'+btn('Open attendance register','attendance')+queue.map(c=>'<p><b>'+esc(c.profiles?.full_name||'Member')+'</b> • '+esc(c.events?.title)+'<br>'+esc(dateZA(c.created_at))+'</p>').join(''));
    }
    return html;
  }
  async function mentoring() {
    const list=await rest('v105_mentoring?select=id,member_id,topic,status,created_at'+(admin()?',profiles(full_name)':'')+'&order=created_at.desc&limit=50');
    return card('Ask for mentoring','<p>Your request is private to you and Admins. An Admin will arrange support through EFGC’s safeguarding process. Please do not include contact details or urgent emergency information here.</p><form id="v105MentoringForm"><label>What would you like support with?<textarea name="topic" required minlength="5" maxlength="2000"></textarea></label><button type="submit" class="v105-primary">Request support</button></form>')+
      list.map(r=>card(admin()?(r.profiles?.full_name||'Member request'):'Your request','<p class="v105-copy">'+esc(r.topic)+'</p><div class="v105-meta">'+esc(r.status)+' • '+esc(dateZA(r.created_at))+'</div>'+(admin()&&r.status!=='closed'?btn('Mark contacted','mentor-contact',r.id)+btn('Close request','mentor-close',r.id):'')+(r.member_id===user().uid?btn('Withdraw','mentor-withdraw',r.id):''))).join('');
  }
  async function all(path, expected) {
    let out=[];
    for(let offset=0;offset<20000;offset+=500) {if(identity()!==expected)throw Error('Account changed.');const page=await rest(path+'&limit=500&offset='+offset);out.push(...page);if(page.length<500)return out;}
    throw Error('This summary is too large to load. Please contact an Admin.');
  }
  async function summary(year) {
    const id=identity(),uid=user().uid;
    year=Number(year)||Number(today().slice(0,4));
    // Johannesburg year boundaries, matching the community’s calendar.
    const start=year+'-01-01T00:00:00+02:00', end=(year+1)+'-01-01T00:00:00+02:00';
    const [attendance,readings,requests]=await Promise.all([
      all('attendance?select=status,event_id,events!inner(event_date,attendance_approved)&youth_id=eq.'+uid+'&events.attendance_approved=eq.true&events.event_date=gte.'+encodeURIComponent(start)+'&events.event_date=lt.'+encodeURIComponent(end)+'&order=event_id',id),
      all('reading_progress?select=challenge_key&member_id=eq.'+uid+'&completed_at=gte.'+encodeURIComponent(start)+'&completed_at=lt.'+encodeURIComponent(end)+'&order=challenge_key',id),
      all('v105_signups?select=id,status&member_id=eq.'+uid+'&created_at=gte.'+encodeURIComponent(start)+'&created_at=lt.'+encodeURIComponent(end)+'&order=id',id)
    ]);
    const present=attendance.filter(r=>['present','late'].includes(r.status)).length;
    return card('Your year with EFGC','<label>Year<select id="v105Year">'+Array.from({length:5},(_,i)=>Number(today().slice(0,4))-i).map(y=>'<option '+(y===year?'selected':'')+'>'+y+'</option>').join('')+'</select></label><p>Only your saved records are counted. Attendance includes Admin-approved registers; late arrivals count as attended.</p><div class="v105-stats">'+
      [['Meetings attended',present],['Finalised records',attendance.length],['Readings completed',readings.length],['Approved group / service requests',requests.filter(r=>r.status==='approved').length]].map(([label,n])=>'<div class="v105-card"><strong>'+n+'</strong>'+esc(label)+'</div>').join('')+'</div>');
  }
  async function render(year) {
    ensure();const id=identity();if(!id)return reset();
    const ticket=++generation, tab=active;
    document.querySelectorAll('[data-v105-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v105Tab===tab)));
    $('#v105Body').replaceChildren();note('Loading '+tabs[tab].toLowerCase()+'…');
    try {
      let html;
      if(contentKinds.includes(tab))html=await content(tab);
      else if(tab==='checkin')html=await checkin();
      else if(tab==='mentoring')html=await mentoring();
      else if(tab==='summary')html=await summary(year);
      else html=card('Your story. His glory.','<p>Share what God has done, read approved testimonies and manage your submissions in My Journey.</p>'+btn('Open testimonies','testimonies'));
      if(ticket!==generation||identity()!==id)return;
      $('#v105Body').innerHTML=html;note('');
    } catch(e) {if(ticket===generation&&identity()===id){$('#v105Body').innerHTML=empty('This section could not load. Your information has not been changed.')+btn('Try again','retry');note(e.message||'Connection failed.');}}
  }
  async function mutate(action) {
    if(busy||!user())return;busy=true;const id=identity();
    const buttons=[...$('#communityHub').querySelectorAll('button')];const enabled=buttons.filter(b=>!b.disabled);enabled.forEach(b=>b.disabled=true);
    note('Saving…');
    try {await action();if(identity()!==id)return;await render();note('Saved.');}
    catch(e){if(identity()===id)note(e.message||'Could not save. Please try again.');}
    finally{if(identity()===id){busy=false;enabled.forEach(b=>{if(b.isConnected)b.disabled=false;});}}
  }
  async function write(path, method, body) {
    const result=await rest(path,{method,headers, ...(body ? {body:JSON.stringify(body)} : {})});
    if(!Array.isArray(result)||result.length===0)throw Error('The server did not confirm this change. Refresh and try again.');
    return result;
  }
  document.addEventListener('submit',e=>{
    if(!['v105ContentForm','v105MentoringForm'].includes(e.target.id))return;
    e.preventDefault();if(!user()||!e.target.reportValidity())return;
    const form=new FormData(e.target),s=user(),kind=active;
    if(e.target.id==='v105MentoringForm')return void mutate(()=>write('v105_mentoring','POST',{member_id:s.uid,topic:String(form.get('topic')).trim()}));
    const url=String(form.get('url')||'').trim();if(url&&!safeUrl(url))return note('Use an https link without a username or password.');
    if(!contentKinds.includes(kind)||(!admin()&&kind!=='prayer'))return;
    const payload={kind,title:String(form.get('title')).trim(),body:String(form.get('body')).trim(),url:url||null,created_by:s.uid,status:kind==='prayer'?'pending':'published'};
    void mutate(()=>write('v105_content','POST',payload));
  });
  document.addEventListener('change',e=>{if(e.target.id==='v105Year'&&!busy)void render(e.target.value);});
  document.addEventListener('click',e=>{
    const tab=e.target.closest?.('[data-v105-tab]');if(tab&&!busy&&user()){active=tab.dataset.v105Tab;void render();return;}
    const b=e.target.closest?.('[data-v105-action]');if(!b||!user()||busy)return;
    const action=b.dataset.v105Action,id=b.dataset.id,uid=user().uid;
    if(action==='retry')return void render();
    if(action==='attendance')return void showTab('attendanceAdmin');
    if(action==='testimonies'){showTab('ministry');void window.EFGCV87Ministry?.render();return;}
    if(['publish','archive'].includes(action)&&admin())return void mutate(()=>write('v105_content?id=eq.'+id,'PATCH',{status:action==='publish'?'published':'archived'}));
    if(action==='withdraw')return void mutate(()=>write('v105_content?id=eq.'+id+'&created_by=eq.'+uid,'DELETE'));
    if(action==='join')return void mutate(()=>write('v105_signups','POST',{post_id:id,member_id:uid}));
    if(action==='leave')return void mutate(()=>write('v105_signups?post_id=eq.'+id+'&member_id=eq.'+uid,'DELETE'));
    if(action==='checkin')return void mutate(()=>write('v105_checkins','POST',{event_id:Number(id),member_id:uid}));
    if(action==='read')return void mutate(()=>write('reading_progress?on_conflict=member_id,challenge_key','POST',{member_id:uid,challenge_key:id}));
    if(action==='mentor-withdraw')return void mutate(()=>write('v105_mentoring?id=eq.'+id+'&member_id=eq.'+uid,'DELETE'));
    if(admin()&&['mentor-contact','mentor-close'].includes(action))return void mutate(()=>write('v105_mentoring?id=eq.'+id,'PATCH',{status:action==='mentor-contact'?'contacted':'closed'}));
    if(admin()&&['signup-approve','signup-decline'].includes(action))return void mutate(()=>write('v105_signups?id=eq.'+id,'PATCH',{status:action==='signup-approve'?'approved':'declined'}));
  });
  const previousShell=window.renderShell;
  window.renderShell=function(...args){reset();return previousShell?.apply(this,args);};
  const previousTab=window.showTab;
  window.showTab=function(id,...args){if(id==='communityHub'&&!user())return;const r=previousTab?.call(this,id,...args);if(id==='communityHub')void render();return r;};
  ensure();
  window.EFGCV105={render,reset,safeUrl,today};
})();
