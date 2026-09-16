/** EFGC Youth v46 — client-side high-quality image processing before secure Supabase upload. */
(() => {
  const $ = (s) => document.querySelector(s);
  const MAX_INPUT = 12 * 1024 * 1024;
  const ALLOWED = ['image/jpeg','image/png','image/webp'];

  function validateSource(file){
    if(!file) throw new Error('Choose a photo first.');
    if(!ALLOWED.includes(file.type)) throw new Error('Use JPG, PNG or WebP.');
    if(file.size > MAX_INPUT) throw new Error('Photo must be 12 MB or smaller.');
    return true;
  }

  async function optimizeImage(file,{maxEdge=1800,quality=.91,name='efgc-photo.webp'}={}){
    validateSource(file);
    let bitmap;
    try { bitmap = await createImageBitmap(file,{imageOrientation:'from-image'}); }
    catch { bitmap = await createImageBitmap(file); }
    const sw=bitmap.width, sh=bitmap.height;
    const scale=Math.min(1,maxEdge/Math.max(sw,sh));
    const w=Math.max(1,Math.round(sw*scale)), h=Math.max(1,Math.round(sh*scale));
    const canvas=document.createElement('canvas'); canvas.width=w; canvas.height=h;
    const ctx=canvas.getContext('2d',{alpha:false});
    ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high';
    ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,w,h); ctx.drawImage(bitmap,0,0,w,h);
    bitmap.close?.();
    const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Photo processing failed.')),'image/webp',quality));
    if(blob.size > 5*1024*1024 && quality>.78) return optimizeImage(file,{maxEdge:1500,quality:.82,name});
    return new File([blob],name,{type:'image/webp',lastModified:Date.now()});
  }

  async function uploadEventImageHQ(file){
    if(!file) return null;
    const processed=await optimizeImage(file,{maxEdge:2000,quality:.92,name:`event-${Date.now()}.webp`});
    const auth=window.EFGCAuth?.session?.(); const c=window.EFGC_SUPABASE;
    if(!auth?.access_token||!c?.url||!c?.publishableKey) throw new Error('Authentication required for event image upload.');
    const path=`events/${Date.now()}-${Math.random().toString(36).slice(2,8)}.webp`;
    const encoded=path.split('/').map(encodeURIComponent).join('/');
    const r=await fetch(`${c.url}/storage/v1/object/event-images/${encoded}`,{method:'POST',headers:{apikey:c.publishableKey,Authorization:`Bearer ${auth.access_token}`,'Content-Type':'image/webp','x-upsert':'false'},body:processed});
    if(!r.ok){const b=await r.json().catch(()=>({}));throw new Error(b.message||b.error||'Event image upload failed.');}
    return path;
  }

  function installProfileUpgrade(){
    if(!window.EFGCPhotoSecurity || window.EFGCPhotoSecurity.v46) return;
    const svc=window.EFGCPhotoSecurity;
    svc.maxInputBytes=MAX_INPUT;
    svc.maxBytes=5*1024*1024;
    svc.validate=validateSource;
    svc.upload=async function(file){
      validateSource(file);
      if(!window.EFGCLive?.uploadOwnPhoto) throw new Error('Secure photo service is unavailable.');
      const optimized=await optimizeImage(file,{maxEdge:1600,quality:.91,name:`profile-${Date.now()}.webp`});
      return window.EFGCLive.uploadOwnPhoto(optimized);
    };
    svc.v46=true;
  }

  function installEventUpgrade(){
    window.adminCreateEvent = async () => {
      let s=null; try{s=session}catch{}
      if(s?.role!=='admin') return;
      const title=$('#adminEventTitle')?.value.trim(); const localDate=$('#adminEventDate')?.value;
      const theme=$('#adminEventTheme')?.value.trim()||''; const scripture=$('#adminEventScripture')?.value.trim()||'';
      const post_content=$('#adminEventPost')?.value.trim()||''; const file=$('#adminEventImage')?.files?.[0]||null;
      if(!title||!localDate) return window.setAdminMessage?.('Event title and date/time are required.');
      try{
        window.setAdminMessage?.(file?'Optimising and publishing event image…':'Publishing event…');
        const image_path=file?await uploadEventImageHQ(file):null;
        const d=new Date(localDate); if(Number.isNaN(d.getTime())) throw new Error('Enter a valid event date and time.');
        await window.EFGCLive.adminCreateEvent({title,event_date:d.toISOString(),theme,scripture,post_content,image_path});
        await window.renderLiveData?.();
        window.setAdminMessage?.('Event published successfully. Image optimised for sharp mobile display.');
      }catch(e){window.setAdminMessage?.(`Could not publish event: ${e.message}`);}
    };
  }

  function labelPhotoInputs(){
    const help='High-quality upload • automatically optimised for mobile';
    ['#loginPhoto','#ownProfileFile','#adminEventImage'].forEach(sel=>{
      const input=$(sel); if(!input||input.dataset.v46Media==='1') return;
      input.dataset.v46Media='1';
      const note=document.createElement('small'); note.className='v46-media-note'; note.textContent=help; input.insertAdjacentElement('afterend',note);
    });
  }

  document.addEventListener('DOMContentLoaded',()=>{installProfileUpgrade();installEventUpgrade();labelPhotoInputs();setTimeout(labelPhotoInputs,500)});
  const mo=new MutationObserver(()=>{installProfileUpgrade();labelPhotoInputs()});
  setTimeout(()=>mo.observe(document.body,{childList:true,subtree:true}),20);
})();
