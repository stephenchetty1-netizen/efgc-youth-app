/* EFGC Youth V105 Community Hub: hooks up the already-migrated Supabase tables.
   All permissions are enforced by Supabase RLS; UI role checks only guide users. */
(() => {
  "use strict";
  const $=q=>document.querySelector(q);
  const h=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const kinds=[["prayer","Prayer Wall"],["devotional","Devotionals"],["group","Groups"],["resource","Resources"],["service","Serve Together"],["setlist","Worship Setlists"]];
  const kindLabel=Object.fromEntries(kinds);
  const signed=()=>{try{return session?.uid && window.EFGCAuth?.userId?.()===session.uid ? session:null;}catch{return null;}};
  const admin=()=>signed()?.role==="admin" && signed()?.approval_status==="approved";
  const fmt=v=>{const d=new Date(v);return Number.isFinite(d.getTime())?d.toLocaleString("en-ZA",{day:"numeric",month:"short",year:"numeric"}):""};
  let tab="prayer",seq=0,rows=[],signups=[],events=[],checkins=[],mentoring=[],summary=null;
  let pending=false;
  const status=(msg,bad=false)=>{
    const node=$("#v105Status");if(node){node.textContent=msg;node.dataset.error=bad?"yes":"no";}
  };
  function boot(){
    const main=$("main"),nav=$("#mainMenu");
    if(!main||!nav)return;
    if(!$("#communityHub")){
      const section=document.createElement("section");
      section.id="communityHub";section.className="tab hidden";
      section.innerHTML='<div class="v105-heading"><small>EFGC YOUTH • BUILD • BELONG • BE A LIGHT</small><h2>Community & Ministry</h2><p>Pray, learn, serve and grow together in Christ.</p></div>'+
        '<div id="v105Nav" class="v105-nav" aria-label="Community features"></div>'+
        '<p id="v105Status" role="status" aria-live="polite"></p>'+
        '<div id="v105Content"></div>';
      main.appendChild(section);
    }
    if(!$("#v105Menu")){
      const b=document.createElement("button");
      b.id="v105Menu";b.type="button";b.className="menu-item";b.dataset.tab="communityHub";
      b.innerHTML='<span class="nav-glyph" aria-hidden="true">✝</span>Community';
      nav.appendChild(b);
    }
    $("#v105Menu")?.classList.toggle("hidden",!signed());
    if(!signed()){$("#v105Content")?.replaceChildren();seq++;return;}
  }
  const api=(path,options)=>window.EFGCAuth.rest(path,options);
  const json=(body,method="POST")=>({method,headers:{"Content-Type":"application/json",Prefer:"return=representation"},body:JSON.stringify(body)});
  const message=e=>e?.message||"Please check your connection and try again.";
  function nav(){
    const options=[...kinds,["testimonies","Testimonies"],["mentoring","Mentoring"],["checkin","Meeting Check-in"],["summary","Year Summary"]];
    $("#v105Nav").innerHTML=options.map(([k,label])=>'<button type="button" data-v105-tab="'+h(k)+'" class="'+(tab===k?'active':'')+'" aria-pressed="'+(tab===k)+'">'+h(label)+'</button>').join("");
  }
  function postCard(p){
    const owned=p.created_by===signed()?.uid;
    const canJoin=p.status==="published"&&["group","service"].includes(p.kind);
    const joined=signups.find(s=>s.post_id===p.id&&s.member_id===signed()?.uid);
    const href=p.url&&/^https:\/\/[^\s]+$/i.test(p.url)?'<a class="v105-resource-link" href="'+h(p.url)+'" target="_blank" rel="noopener noreferrer">Open resource ↗</a>':"";
    const moderation=admin()?'<div class="v105-actions">'+
      (p.status!=="published"?'<button data-v105-review="'+h(p.id)+'" data-state="published">Publish</button>':"")+
      (p.status!=="archived"?'<button data-v105-review="'+h(p.id)+'" data-state="archived">Archive</button>':"")+'</div>':"";
    return '<article class="v105-card"><small>'+h(kindLabel[p.kind]||p.kind)+' • '+h(fmt(p.created_at))+
      (p.status!=="published"?' • '+h(p.status):"")+'</small><h3>'+h(p.title)+'</h3><p>'+h(p.body)+'</p>'+
      href+(canJoin?(joined?'<span class="v105-pill">Sign-up: '+h(joined.status)+'</span>':
      '<button type="button" data-v105-join="'+h(p.id)+'">Request to join</button>'):"")+
      (owned&&!admin()&&p.status==="pending"?'<button type="button" data-v105-withdraw="'+h(p.id)+'">Withdraw draft</button>':"")+
      moderation+'</article>';
  }
  function renderContent(){
    if(!signed())return;
    nav();
    const container=$("#v105Content");if(!container)return;
    if(kinds.some(([k])=>k===tab)){
      const isPrayer=tab==="prayer";
      const visible=rows.filter(p=>p.kind===tab);
      const create=admin()||isPrayer;
      const form=create?'<form id="v105PostForm" class="v105-card v105-form"><h3>'+
        (isPrayer?"Submit a Prayer Wall request":"Publish "+h(kindLabel[tab]))+'</h3>'+
        (isPrayer?'<p>Prayer Wall submissions are moderated by an Admin before appearing here. For private prayer support, use My Journey instead.</p>':"")+
        '<label>Title<input name="title" maxlength="120" minlength="3" required placeholder="Give this post a short title"></label>'+
        '<label>Message<textarea name="body" rows="4" minlength="3" maxlength="5000" required placeholder="Write your message"></textarea></label>'+
        (admin()?'<label>Optional HTTPS resource link<input name="url" type="url" maxlength="1500" placeholder="https://…"></label>':"")+
        '<button type="submit">'+(admin()?"Publish post":"Submit for review")+'</button></form>':"";
      const list=visible.map(postCard).join("")||'<article class="v105-card"><p>No '+h(kindLabel[tab]).toLowerCase()+' published yet.</p></article>';
      const queue=admin()?'<p class="v105-note">Admin: only you can publish member Prayer Wall submissions. Private prayer requests remain separate.</p>':"";
      container.innerHTML=form+queue+'<div class="v105-post-list">'+list+'</div>';
      return;
    }
    if(tab==="testimonies"){
      container.innerHTML='<article class="v105-card"><h3>Share your testimony</h3><p>Testimonies are submitted and reviewed in My Journey. Pending testimonies are not visible to other members.</p><button type="button" data-v105-journey>Open My Journey</button></article>';
      return;
    }
    if(tab==="mentoring"){
      const list=mentoring.map(m=>'<article class="v105-card"><small>'+h(fmt(m.created_at))+' • '+h(m.status)+'</small><p>'+h(m.topic)+'</p>'+
        (admin()?'<div class="v105-actions"><button data-v105-mentoring="'+h(m.id)+'" data-state="contacted">Mark contacted</button><button data-v105-mentoring="'+h(m.id)+'" data-state="closed">Mark closed</button></div>':"")+'</article>').join("");
      container.innerHTML='<form id="v105MentoringForm" class="v105-card v105-form"><h3>Ask for mentoring</h3><p>Your request is private to you and authorised Admins. Do not share urgent safeguarding concerns here.</p><label>What would you like support with?<textarea name="topic" minlength="5" maxlength="2000" rows="4" required></textarea></label><button type="submit">Send private request</button></form>'+list;
      return;
    }
    if(tab==="checkin"){
      const now=Date.now();
      const eligible=events.filter(e=>!e.attendance_approved && now>=new Date(e.event_date).getTime()-7200000 && now<=new Date(e.event_date).getTime()+21600000);
      const items=eligible.map(e=>{
        const already=checkins.some(x=>String(x.event_id)===String(e.id)&&x.member_id===signed().uid);
        return '<article class="v105-card"><small>'+h(fmt(e.event_date))+'</small><h3>'+h(e.title)+'</h3><button type="button" data-v105-checkin="'+h(e.id)+'" '+(already||signed().role!=="youth"?"disabled":"")+'>'+(already?"Check-in requested":signed().role!=="youth"?"Youth check-in only":"Request check-in")+'</button></article>';
      }).join("");
      const own=checkins.map(x=>'<li>'+h(events.find(e=>String(e.id)===String(x.event_id))?.title||"Youth meeting")+' • '+h(fmt(x.created_at))+'</li>').join("");
      container.innerHTML='<article class="v105-card"><h3>Meeting check-in</h3><p>Check-in opens two hours before a meeting and closes six hours after its start. A request does not mark your attendance; an authorised leader still records and finalises attendance.</p></article>'+
        (items||'<article class="v105-card"><p>No meetings are open for check-in right now.</p></article>')+
        (own?'<article class="v105-card"><h3>Your check-in requests</h3><ul>'+own+'</ul></article>':"");
      return;
    }
    if(tab==="summary"){
      if(!summary){container.innerHTML='<article class="v105-card"><p>Year summary is loading…</p></article>';return;}
      container.innerHTML='<article class="v105-card"><h3>Your '+h(summary.year)+' faith journey</h3>'+
        '<div class="v105-stats"><div><strong>'+h(summary.present)+'</strong><span>Meetings recorded present</span></div>'+
        '<div><strong>'+h(summary.readings)+'</strong><span>Bible readings marked complete</span></div>'+
        '<div><strong>'+h(summary.requests)+'</strong><span>Check-in requests</span></div></div>'+
        '<p>These are your saved activity records, not a measure of faith or a public ranking.</p></article>';
    }
  }
  async function refresh(){
    const s=signed();if(!s)return;
    boot();const version=++seq;status("Loading Community Hub…");
    const needsContent=kinds.some(([k])=>k===tab);
    const queries=needsContent?[
      api("v105_content?select=id,kind,title,body,url,status,created_by,created_at&order=created_at.desc&limit=100"),
      api("v105_signups?select=id,post_id,member_id,status,created_at&order=created_at.desc&limit=100")
    ]:tab==="mentoring"?[
      api("v105_mentoring?select=id,member_id,topic,status,created_at&order=created_at.desc&limit=100")
    ]:tab==="checkin"?[
      window.EFGCLive.events(),api("v105_checkins?select=event_id,member_id,created_at&order=created_at.desc&limit=100")
    ]:tab==="summary"?[
      window.EFGCLive.myAttendance(s.uid),
      api("reading_progress?select=challenge_key,completed_at&member_id=eq."+encodeURIComponent(s.uid)),
      api("v105_checkins?select=event_id,created_at&member_id=eq."+encodeURIComponent(s.uid))
    ]:[];
    try {
      const result=await Promise.all(queries);
      if(version!==seq||signed()?.uid!==s.uid)return;
      if(needsContent){rows=result[0]||[];signups=result[1]||[];}
      if(tab==="mentoring")mentoring=result[0]||[];
      if(tab==="checkin"){events=result[0]||[];checkins=result[1]||[];}
      if(tab==="summary"){
        const year=new Date().getFullYear();
        summary={year,present:(result[0]||[]).filter(x=>x.status==="present" && new Date(x.events?.event_date||x.recorded_at).getFullYear()===year).length,
          readings:(result[1]||[]).filter(x=>new Date(x.completed_at).getFullYear()===year).length,
          requests:(result[2]||[]).filter(x=>new Date(x.created_at).getFullYear()===year).length};
      }
      renderContent();status("");
    }catch(e){if(version!==seq)return;status("Could not load Community Hub: "+message(e),true);}
  }
  async function run(button,fn){
    if(pending)return;pending=true;
    if(button)button.disabled=true;
    try{await fn();await refresh();status("Saved.");}
    catch(e){status(message(e),true);}
    finally{pending=false;if(button?.isConnected)button.disabled=false;}
  }
  document.addEventListener("click",e=>{
    const a=e.target.closest?.("[data-v105-tab]");
    if(a){tab=a.dataset.v105Tab;refresh();return;}
    if(e.target.closest?.("[data-tab='communityHub']")){setTimeout(refresh,0);return;}
    if(e.target.closest?.("[data-v105-journey]")){window.showTab?.("ministry");return;}
    const join=e.target.closest?.("[data-v105-join]");
    if(join){run(join,async()=>{const r=await api("v105_signups",json({post_id:join.dataset.v105Join,member_id:signed().uid,status:"requested"}));if(!Array.isArray(r)||!r.length)throw Error("Your sign-up was not recorded.");});return;}
    const withdraw=e.target.closest?.("[data-v105-withdraw]");
    if(withdraw){run(withdraw,async()=>{await api("v105_content?id=eq."+encodeURIComponent(withdraw.dataset.v105Withdraw),{method:"DELETE"});});return;}
    const review=e.target.closest?.("[data-v105-review]");
    if(review&&admin()){run(review,async()=>{const r=await api("v105_content?id=eq."+encodeURIComponent(review.dataset.v105Review),json({status:review.dataset.state},"PATCH"));if(!Array.isArray(r)||!r.length)throw Error("The content was not updated.");});return;}
    const mentor=e.target.closest?.("[data-v105-mentoring]");
    if(mentor&&admin()){run(mentor,async()=>{const r=await api("v105_mentoring?id=eq."+encodeURIComponent(mentor.dataset.v105Mentoring),json({status:mentor.dataset.state},"PATCH"));if(!Array.isArray(r)||!r.length)throw Error("The mentoring request was not updated.");});return;}
    const ci=e.target.closest?.("[data-v105-checkin]");
    if(ci){run(ci,async()=>{const r=await api("v105_checkins",json({event_id:Number(ci.dataset.v105Checkin),member_id:signed().uid}));if(!Array.isArray(r)||!r.length)throw Error("Check-in was not recorded.");});}
  });
  document.addEventListener("submit",e=>{
    if(e.target.id==="v105PostForm"){
      e.preventDefault();const form=e.target,fd=new FormData(form),button=form.querySelector("button[type=submit]");
      const title=String(fd.get("title")||"").trim(),body=String(fd.get("body")||"").trim(),url=String(fd.get("url")||"").trim();
      if(title.length<3||body.length<3)return status("Enter a title and message.",true);
      if(url&&!/^https:\/\/[^\s]+$/i.test(url))return status("Resource links must start with https://",true);
      run(button,async()=>{const r=await api("v105_content",json({kind:tab,title,body,url:admin()?url||null:null,status:admin()?"published":"pending",created_by:signed().uid}));if(!Array.isArray(r)||!r.length)throw Error("The post was not saved.");});return;
    }
    if(e.target.id==="v105MentoringForm"){
      e.preventDefault();const form=e.target,topic=String(new FormData(form).get("topic")||"").trim();
      if(topic.length<5)return status("Please describe the mentoring request.",true);
      run(form.querySelector("button[type=submit]"),async()=>{const r=await api("v105_mentoring",json({member_id:signed().uid,topic,status:"requested"}));if(!Array.isArray(r)||!r.length)throw Error("Your mentoring request was not saved.");});
    }
  });
  const oldShell=window.renderShell;
  if(typeof oldShell==="function")window.renderShell=function(...args){const r=oldShell.apply(this,args);boot();return r;};
  const init=()=>boot();
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
  window.EFGCV105Community={refresh,boot};
})();
