/* EFGC Youth Motion Studio V105: self-contained, no paid APIs, no publishing. */
(() => {
  'use strict';
  const ROOT_ID = 'v105MotionRoot';
  const LOGO = 'assets/v74-efgc-logo.webp?v=89.1';
  const topics = [
    { title:"Why God's Silence Isn't His Absence",ref:'Isaiah 41:10',
      lines:["An unanswered prayer can feel like silence.","But silence does not prove God has left.","His promise to strengthen you remains, even in uncertain seasons.","Take the next faithful step.","God says, Fear thou not; for I am with thee."],
      punch:["UNANSWERED?","NOT ABSENT","STRENGTH REMAINS","KEEP WALKING","GOD WITH YOU"],
      heroes:['floating antique telephone with its receiver off the hook','illuminated open Bible','realistic sculpted hand supporting a stone','ascending stone staircase','luminous 3D cross'] },
    { title:'Stop Comparing Your Calling',ref:'Galatians 6:4',
      lines:["Someone else's progress can make yours seem small.","But your calling is not their timeline.","Faithfulness begins with the work God has placed before you.","Run your own race.","Let every man prove his own work."],
      punch:["COMPARISON TRAP","YOUR CALLING","BE FAITHFUL","RUN YOUR RACE","YOUR OWN WORK"],
      heroes:['two unequal ascending staircases','antique brass hourglass','open Bible on a plinth','single running shoe on a track','one sculpted gold seedling'] },
    { title:'The Real Meaning of Courage',ref:'2 Timothy 1:7',
      lines:["Courage is not the absence of fear.","It is choosing faith while fear is loud.","God has given you power, love, and a sound mind.","Take the step anyway.","Fear does not get the final word."],
      punch:["WHAT IS COURAGE?","CHOOSE FAITH","POWER • LOVE","TAKE THE STEP","NOT FEAR"],
      heroes:['sculpted stone lion','realistic shield','open Bible with warm edge light','single staircase step','broken rusted chain'] },
    { title:'Your Light Is Not Small',ref:'Matthew 5:16',
      lines:["You think your influence is too small.","But one act of kindness can point someone toward Jesus.","Your light grows visible when faith becomes action.","Be the light today.","Let your light so shine before men."],
      punch:["TOO SMALL?","ONE ACT","FAITH IN ACTION","BE THE LIGHT","LET IT SHINE"],
      heroes:['tiny illuminated candle','realistic hand holding a lantern','glowing glass lightbulb','golden lit doorway','luminous 3D cross'] },
    { title:'What Happens When You Start Again',ref:'Lamentations 3:22–23',
      lines:["Yesterday does not have to define today.","Mercy meets you in the morning.","God's compassions fail not, even when your confidence does.","Begin again with Him.","Great is thy faithfulness."],
      punch:["NOT YESTERDAY","NEW MERCIES","COMPASSION REMAINS","BEGIN AGAIN","FAITHFULNESS"],
      heroes:['antique 3D clock','sunrise behind a sculpted arch','open Bible resting on a stone table','fresh green seedling emerging from soil','golden sunrise over an open doorway'] }
  ];
  const themes = [
    {id:'editorial',name:'Signature EFGC Editorial',bg:'#f3f0e9',grid:'#d0d3d6',accent:'#2358b0',contrast:'#12243e',line:'#e1dbd2',detail:'warm off-white paper, delicate gray dashed modular grid, royal EFGC blue blocks, rich black/blue typography and restrained gold accents'},
    {id:'dark',name:'Dark Cinematic Technical',bg:'#132338',grid:'#314458',accent:'#54d9ef',contrast:'#ffffff',line:'#2b4054',detail:'slate-charcoal surface, soft technical grid, cyan/electric-blue accent planes, white typography and restrained gold EFGC identification'},
    {id:'heritage',name:'High-Contrast Editorial',bg:'#f4eadd',grid:'#d8cec2',accent:'#b65b38',contrast:'#302e30',line:'#e6dccc',detail:'pale bone paper, fine cross-dot grid, terracotta editorial curves, charcoal type and subtle official EFGC blue/gold insignia'}
  ];
  const state = {stage:1,topic:-1,theme:-1,playId:0,recording:false,logo:null,lastFrame:3500,cancelRecording:null,downloadUrl:null};
  const DURATION = 30000;
  const el = id => document.getElementById(id);
  const root = () => el(ROOT_ID);
  const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const topic = () => topics[state.topic];
  const theme = () => themes[state.theme];
  const status = s => {let e=el('v105MotionStatus');if(e)e.textContent=s;};
  const stageLabels = ['IDEAS','SCRIPT','PALETTE','POSTERS','MOTION'];
  let logo = new Image();logo.onload=()=>{state.logo=logo;if(state.stage===5&&!state.recording)drawAt(state.lastFrame);};logo.src=LOGO;
  function intro() {
    return '<div class="v105-motion-head"><img src="'+LOGO+'" alt="Official EFGC logo"><div><span class="v105-motion-kicker">EFGC Youth • Build • Belong • Be a Light</span><h2>Motion Graphics Studio</h2></div></div>'+
      '<p class="v105-motion-subtitle">Create a 30-second Christian motion explainer in five approved stages. Silent on-screen story, KJV references, 9:16 format, 6 seconds per scene. No voice-over, background music, paid API or automatic posting.</p>'+
      '<div class="v105-motion-progress" aria-label="Production stages">'+stageLabels.map((s,i)=>'<span class="'+(state.stage===i+1?'active':state.stage>i+1?'done':'')+'">'+(i+1)+' '+s+'</span>').join('')+'</div>';
  }
  function actions(back,next,label='NEXT'){
    return '<div class="v105-motion-actions">'+(back?'<button type="button" class="secondary" data-motion="back">← BACK</button>':'')+
      (next?'<button type="button" data-motion="next">'+label+' →</button>':'')+
      '</div><p class="v105-motion-status" id="v105MotionStatus" role="status" aria-live="polite"></p>';
  }
  const scenePrompt=(n)=>{
    const t=topic(),p=theme(),hero=t.heroes[n],em=t.punch[n];
    return 'Premium EFGC Youth Christian editorial keyframe poster, 9:16 vertical 1080x1920 (8K-grade detailing in source assets). '+p.detail+'. Exact background '+p.bg+' with delicate grid '+p.grid+'. Exactly two subtle translucent diagonal environmental lines colored '+p.line+' behind the composition. ONE distinct primary photorealistic 3D hero object: '+hero+'. Up to two supporting vector accents: one four-point gold starburst and one '+p.accent+' directional arc. Controlled asymmetry, 2.5D depth planes, premium studio lighting, authentic materials, soft directional drop shadow, subtle halftone only on secondary cutouts. Text in bold modern sans-serif: "'+em+'", 1–4 headline words, with an optional small elegant italic-serif accent. Place original EFGC logo small, intact and uncropped. Keep all text in centered mobile safe zone. Scripture reference: '+t.ref+'. Avoid extra objects, AI-looking faces, unverified church event details, watermarks, inaccurate Bible quotations, background music or voice-over.';
  };
  const motionPrompt=n=>{
    const t=topic(),p=theme();
    return 'Scene '+(n+1)+' — "'+t.lines[n]+'"\nMotion style: premium 2.5D editorial collage; hero: '+t.heroes[n]+'.\nBackground: '+p.detail+'. EXACTLY TWO low-contrast, translucent diagonal lines in '+p.line+' drifting independently behind foreground.\n0.0–0.5s: clean locked grid; hero and headline offscreen; lines already drifting.\n0.5–3.5s: hero slides from lower diagonal with heavy ease-out and 5–10% natural overshoot; headline "'+t.punch[n]+'" enters through masked staggered text, 5–10 frame offsets; gold starburst and '+p.accent+' arc respond subtly. Full on-screen story line: "'+t.lines[n]+'".\n3.5–4.7s: soft Z-depth parallax, subtle independent floating and light shimmer; maintain legibility.\n4.7–6.0s: soft masked headline exit and hero glide, geometry wipe to following scene; two background lines continue.\nCamera: locked with maximum 5% optical push-in. SFX: optional paper whoosh, one subtle click and soft tactile thud. NO music, NO narration, NO auto-publishing. EFGC logo remains intact; '+t.ref+' reference shown without presenting paraphrase as verbatim scripture.';
  };
  function stageHTML(){
    const t=topic();let body='';
    if(state.stage===1)body='<h3>Stage 1 — Choose a Christian video idea</h3><p>Select one topic. The next stage reveals its full silent story.</p><div class="v105-motion-grid">'+topics.map((v,i)=>'<button class="v105-motion-topic" type="button" data-motion-topic="'+i+'" aria-pressed="'+(state.topic===i)+'"><b>0'+(i+1)+'</b>'+esc(v.title)+'<small> • '+esc(v.ref)+'</small></button>').join('')+'</div>'+actions(false,state.topic>=0,'DEVELOP IDEA');
    if(state.stage===2)body='<h3>Stage 2 — Silent story script</h3><p>Five short visual beats, one 6-second shot each. KJV reference: <b>'+esc(t.ref)+'</b>. This script is on-screen copy, not voice-over.</p><ol class="v105-motion-script">'+t.lines.map(v=>'<li>'+esc(v)+'</li>').join('')+'</ol><p class="v105-motion-note">Biblical quotations are excerpts; original editorial statements are not labeled as word-for-word Bible text. No automatic posting.</p>'+actions(true,true,'LOCK SCRIPT & NEXT');
    if(state.stage===3)body='<h3>Stage 3 — Lock the visual palette</h3><p>Select one palette. The same grid, colours and exactly two drifting diagonal background lines carry across every shot.</p><div class="v105-motion-grid">'+themes.map((v,i)=>'<button type="button" class="v105-motion-option" data-motion-theme="'+i+'" aria-pressed="'+(state.theme===i)+'"><span class="v105-motion-swatch '+v.id+'"></span><strong>0'+(i+1)+' • '+esc(v.name)+'</strong>'+esc(v.detail)+'</button>').join('')+'</div>'+actions(true,state.theme>=0,'LOCK PALETTE & NEXT');
    if(state.stage===4)body='<h3>Stage 4 — Five self-contained keyframe posters</h3><p>Each prompt specifies one main 3D hero object, up to two vector accents and the locked EFGC Youth theme.</p>'+t.lines.map((v,i)=>'<article class="v105-motion-prompt"><h4>Scene '+(i+1)+' — '+esc(v)+'</h4><p><strong>Typography:</strong> '+esc(t.punch[i])+' • Bold Sans / optional Italic Serif</p><pre>'+esc(scenePrompt(i))+'</pre><button type="button" class="v105-motion-copy" data-motion-copy="poster-'+i+'">Copy poster prompt</button></article>').join('')+actions(true,true,'GENERATE MOTION PROMPTS');
    if(state.stage===5)body='<h3>Stage 5 — 6-second motion scenes</h3><p>Five scenes × six seconds = 30 seconds. The browser preview is a stylized 2.5D reference; use the prompts with realistic 3D assets for full cinematic production.</p><div class="v105-motion-preview"><canvas id="v105MotionCanvas" width="1080" height="1920" aria-label="Silent EFGC Youth motion graphic preview"></canvas><div class="v105-motion-previewinfo"><p><b>Silent visual story:</b> '+esc(t.title)+'</p><p><b>Reference:</b> '+esc(t.ref)+'</p><p>On-screen story text, EFGC logo and the locked palette. The downloadable draft contains no sound, music or voice-over.</p><div class="v105-motion-actions"><button data-motion="play" type="button">▶ Preview 30s</button><button data-motion="poster" type="button" class="secondary">Download frame PNG</button><button data-motion="export" class="v105-motion-export" type="button">Export silent WebM</button><button data-motion="cancel" class="secondary" type="button" hidden>Cancel export</button></div><p id="v105MotionDownload"></p><p class="v105-motion-note">WebM export requires MediaRecorder and canvas capture support in this browser. An MP4 or photorealistic 3D render is not claimed; on unsupported Android browsers use the copyable production prompts.</p></div></div>'+t.lines.map((v,i)=>'<article class="v105-motion-prompt"><h4>Scene '+(i+1)+' • 6 seconds</h4><pre>'+esc(motionPrompt(i))+'</pre><button type="button" class="v105-motion-copy" data-motion-copy="motion-'+i+'">Copy motion prompt</button></article>').join('')+'<div class="v105-motion-actions"><button data-motion="all" class="v105-motion-copy" type="button">Copy all prompts</button></div>'+actions(true,false);
    return '<div class="v105-motion-studio">'+intro()+'<div class="v105-motion-panel">'+body+'</div></div>';
  }
  function clearDownload(){
    if(state.downloadUrl)URL.revokeObjectURL(state.downloadUrl);
    state.downloadUrl=null;
    el('v105MotionDownload')?.replaceChildren();
  }
  function render(){if(!root())return;stopPreview();clearDownload();root().innerHTML=stageHTML();if(state.stage===5)drawAt(3500);}
  function stopAnimation(){if(state.playId)cancelAnimationFrame(state.playId);state.playId=0;}
  function stopPreview(){state.cancelRecording?.('Export cancelled. No video was saved.');stopAnimation();}
  function studioVisible(){return !document.hidden && !!el('motionStudio') && !el('motionStudio').classList.contains('hidden');}
  function leaveStudio(){
    stopPreview();clearDownload();
  }
  function fitText(ctx,text,maxWidth,maxSize){
    let size=maxSize;ctx.font='900 '+size+'px system-ui,sans-serif';
    while(size>35 && ctx.measureText(text).width>maxWidth){size-=3;ctx.font='900 '+size+'px system-ui,sans-serif';}
    return size;
  }
  function wrap(ctx,text,maxWidth){
    const out=[];let line='';
    text.split(/\s+/).forEach(w=>{let test=line?line+' '+w:w;if(line&&ctx.measureText(test).width>maxWidth){out.push(line);line=w;}else line=test;});
    if(line)out.push(line);return out;
  }
  function drawAt(ms){
    const canvas=el('v105MotionCanvas');if(!canvas||state.topic<0||state.theme<0)return;
    const ctx=canvas.getContext('2d');if(!ctx)return;
    state.lastFrame=ms;
    const W=canvas.width,H=canvas.height,p=theme(),t=topic();
    const segment=Math.min(4,Math.floor(Math.max(0,Math.min(ms,29999))/6000)),s=(ms-segment*6000)/1000;
    const enter=Math.max(0,Math.min(1,(s-.5)/2.5)),ease=1-Math.pow(1-enter,3),opacity=Math.max(0,Math.min(1,(6-s)/1.3));
    ctx.fillStyle=p.bg;ctx.fillRect(0,0,W,H);
    ctx.save();ctx.globalAlpha=.5;ctx.strokeStyle=p.grid;ctx.lineWidth=1.5;ctx.setLineDash([3,17]);
    for(let x=0;x<W;x+=48){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for(let y=0;y<H;y+=48){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    ctx.restore();
    ctx.save();ctx.globalAlpha=.3;ctx.strokeStyle=p.line;ctx.lineWidth=18;
    for(let i=0;i<2;i++){let drift=Math.sin(ms/3200+i*1.8)*34;ctx.beginPath();ctx.moveTo((i===0?-140:640)+drift,-80);ctx.lineTo((i===0?510:1250)-drift,H+80);ctx.stroke();}
    ctx.restore();
    ctx.save();ctx.globalAlpha=opacity;
    ctx.fillStyle=p.accent;ctx.beginPath();ctx.arc(900,-90,340,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=.09*opacity;ctx.fillRect(0,1470,1080,450);ctx.restore();
    ctx.save();ctx.globalAlpha=opacity;
    ctx.fillStyle=p.contrast;ctx.font='900 44px system-ui,sans-serif';ctx.textAlign='center';
    ctx.fillText('EFGC  YOUTH',W/2,145);
    if(state.logo){const sz=146;ctx.drawImage(state.logo,(W-sz)/2,177,sz,sz);}
    ctx.font='700 28px system-ui,sans-serif';ctx.fillStyle=p.accent;ctx.fillText('BUILD  •  BELONG  •  BE A LIGHT',W/2,366);
    ctx.restore();
    // A stylized placeholder for the distinct realistic hero defined in the production prompt.
    ctx.save();ctx.translate(W/2,840+(1-ease)*520+Math.sin(ms/700)*8);ctx.rotate((1-ease)*-.18);
    ctx.globalAlpha=ease*opacity;ctx.shadowColor='#00000044';ctx.shadowBlur=65;ctx.shadowOffsetY=40;
    let gr=ctx.createLinearGradient(-290,-290,290,280);gr.addColorStop(0,p.accent);gr.addColorStop(1,p.bg);
    ctx.fillStyle=gr;ctx.beginPath();ctx.roundRect(-330,-275,660,550,55);ctx.fill();
    ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.strokeStyle=p.contrast;ctx.globalAlpha=.8*ease*opacity;ctx.lineWidth=3;ctx.stroke();
    ctx.textAlign='center';ctx.fillStyle=p.contrast;ctx.font='900 54px system-ui,sans-serif';ctx.fillText('SCENE 0'+(segment+1),0,-110);
    ctx.font='800 36px system-ui,sans-serif';wrap(ctx,t.heroes[segment].toUpperCase(),560).slice(0,4).forEach((line,i)=>ctx.fillText(line,0,-15+i*57));
    ctx.restore();
    ctx.save();ctx.globalAlpha=opacity*ease;ctx.textAlign='center';ctx.fillStyle=p.contrast;
    fitText(ctx,t.punch[segment],930,106);ctx.fillText(t.punch[segment],W/2,1280+(1-ease)*130);
    ctx.font='600 43px system-ui,sans-serif';wrap(ctx,t.lines[segment],880).slice(0,4).forEach((line,i)=>ctx.fillText(line,W/2,1380+i*65));
    ctx.fillStyle=p.accent;ctx.font='900 40px system-ui,sans-serif';ctx.fillText(t.ref,W/2,1765);
    ctx.font='800 28px system-ui,sans-serif';ctx.fillText('PASS ON THE BATON',W/2,1820);
    ctx.restore();
  }
  function preview(){
    if(state.recording)return status('An export is already running.');
    stopPreview();const started=performance.now();status('Playing silent preview…');
    const tick=now=>{let t=now-started;drawAt(Math.min(29999,t));if(t<30000)state.playId=requestAnimationFrame(tick);else {state.playId=0;status('Preview complete. No audio added.');}};
    state.playId=requestAnimationFrame(tick);
  }
  function downloadBlob(blob,name){
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),20000);
  }
  function framePNG(){
    if(state.recording)return status('Finish or cancel the export before capturing a frame.');
    if(!state.logo)return status('Wait for the EFGC logo to load before exporting.');
    stopAnimation();
    // Capture the readable hold of the current scene, not its transparent entrance.
    drawAt(Math.min(4,Math.floor(state.lastFrame/6000))*6000+3500);
    const canvas=el('v105MotionCanvas');if(!canvas)return;
    try{canvas.toBlob(blob=>blob?downloadBlob(blob,'EFGC-Youth-Motion-Frame.png'):status('PNG capture failed.'),'image/png');}
    catch(e){status('PNG capture failed. Please reload and try again.');}
  }
  function record(){
    if(state.recording)return;
    const canvas=el('v105MotionCanvas');
    if(!studioVisible())return;
    if(!state.logo)return status('Wait for the EFGC logo to load before exporting.');
    if(!canvas||typeof MediaRecorder==='undefined'||typeof MediaRecorder.isTypeSupported!=='function'||typeof canvas.captureStream!=='function')return status('This browser cannot record canvas video. Copy the prompts for production instead.');
    const mime=['video/webm;codecs=vp8','video/webm;codecs=vp9','video/webm'].find(x=>MediaRecorder.isTypeSupported(x));
    if(!mime)return status('WebM export is unsupported here. Use the production prompts instead.');
    stopAnimation();clearDownload();state.recording=true;
    const chunks=[],scenes=new Set();let stream,recorder,start=0,lastTick=0,watchdog,finished=false,complete=false;
    const controls=Array.from(root().querySelectorAll('[data-motion="export"],[data-motion="play"],[data-motion="poster"],[data-motion="back"]'));
    const cancel=root().querySelector('[data-motion="cancel"]');
    controls.forEach(b=>b.disabled=true);if(cancel)cancel.hidden=false;
    const cleanup=()=>{
      if(finished)return;
      finished=true;clearTimeout(watchdog);stopAnimation();
      if(recorder){recorder.ondataavailable=null;recorder.onerror=null;recorder.onstop=null;
        try{if(recorder.state!=='inactive')recorder.stop();}catch(e){/* release tracks below */}}
      stream?.getTracks().forEach(track=>track.stop());chunks.length=0;
      state.recording=false;state.cancelRecording=null;
      controls.forEach(b=>b.disabled=false);if(cancel)cancel.hidden=true;
    };
    const fail=message=>{if(finished)return;cleanup();status(message);};
    state.cancelRecording=fail;
    try{
      drawAt(0);stream=canvas.captureStream(30);
      recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:3500000});
      recorder.ondataavailable=e=>{if(!finished&&e.data?.size)chunks.push(e.data);};
      recorder.onerror=()=>fail('Video recording failed. The incomplete export was discarded.');
      recorder.onstop=()=>{
        if(finished)return;
        if(!complete||scenes.size!==5||!studioVisible())return fail('Recording was interrupted. The incomplete export was discarded.');
        const blob=new Blob(chunks,{type:mime});
        if(blob.size<=10000)return fail('The browser did not produce a usable video. Try Chrome in your browser.');
        cleanup();
        // A deliberate tap preserves the download user gesture on mobile. This
        // confirms timeline completion, not successful disk save or decoded duration.
        try{
          const link=document.createElement('a');state.downloadUrl=URL.createObjectURL(blob);
          link.href=state.downloadUrl;link.download='EFGC-Youth-Silent-Motion-30s.webm';link.textContent='Download silent WebM';
          el('v105MotionDownload').replaceChildren(link);
          status('Recording complete. Tap Download, then check all five scenes and the full duration before sharing.');
        }catch(e){clearDownload();status('Could not prepare the download. Please try again.');}
      };
      recorder.start(1000);start=lastTick=performance.now();
      watchdog=setTimeout(()=>fail('Recording timed out. The incomplete export was discarded.'),DURATION+5000);
      status('Recording silent 30-second motion video. Keep this screen open and your phone awake.');
      const tick=now=>{
        if(finished)return;
        if(!studioVisible())return fail('Export cancelled because Motion Studio was closed.');
        if(recorder.state!=='recording'||now-lastTick>1000)return fail('Recording stalled. The incomplete export was discarded. Keep this screen open and try again.');
        lastTick=now;const elapsed=now-start;
        try{
          drawAt(Math.min(elapsed,DURATION-1));
          scenes.add(Math.min(4,Math.floor(elapsed/6000)));
          if(elapsed<DURATION)state.playId=requestAnimationFrame(tick);
          else {state.playId=0;complete=true;recorder.stop();}
        }catch(e){fail('Video rendering failed. The incomplete export was discarded.');}
      };
      state.playId=requestAnimationFrame(tick);
    }catch(e){fail('Video export failed: '+(e.message||'unsupported browser'));}
  }
  async function copy(text){
    try{if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(text);else{
      const a=document.createElement('textarea');a.value=text;root().appendChild(a);a.select();if(!document.execCommand('copy'))throw new Error('clipboard unavailable');a.remove();
    }status('Copied to clipboard.');}catch(e){status('Copy is unavailable here. Select and copy the displayed prompts.');}
  }
  document.addEventListener('click',e=>{
    const b=e.target.closest?.('[data-motion-topic],[data-motion-theme],[data-motion],[data-motion-copy]');
    if(!b||!root()?.contains(b))return;
    if(b.hasAttribute('data-motion-topic')){state.topic=Number(b.dataset.motionTopic);state.theme=-1;render();return;}
    if(b.hasAttribute('data-motion-theme')){state.theme=Number(b.dataset.motionTheme);render();return;}
    if(b.hasAttribute('data-motion-copy')){
      const [kind,i]=b.dataset.motionCopy.split('-');void copy(kind==='poster'?scenePrompt(Number(i)):motionPrompt(Number(i)));return;
    }
    const action=b.dataset.motion;
    if(action==='cancel')stopPreview();
    if(action==='back'){if(state.recording)return status('Finish the current export before leaving.');state.stage=Math.max(1,state.stage-1);render();}
    if(action==='next'){if(state.stage===1&&state.topic<0)return; if(state.stage===3&&state.theme<0)return;state.stage=Math.min(5,state.stage+1);render();}
    if(action==='play')preview();
    if(action==='poster')framePNG();
    if(action==='export')record();
    if(action==='all')void copy(topic().lines.map((_,i)=>'KEYFRAME '+(i+1)+'\n'+scenePrompt(i)+'\n\nMOTION '+(i+1)+'\n'+motionPrompt(i)).join('\n\n-----\n\n'));
  });
  let tabObserver;
  function init(){
    if(!root())return;
    render();
    if(!tabObserver){
      tabObserver=new MutationObserver(()=>{if(!studioVisible())leaveStudio();});
      tabObserver.observe(el('motionStudio'),{attributes:true,attributeFilter:['class']});
    }
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden)leaveStudio();});
  window.addEventListener('pagehide',leaveStudio);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
  window.EFGCMotionStudio={version:'105.1',init,preview,stopPreview};
})();
