// Deterministic failure-path tests. These mocks do not certify an Android encoder.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const code = fs.readFileSync('v105-motion-studio.js','utf8');

function setup({supported=true, logoReady=true, constructorFails=false}={}) {
  const listeners={},windowListeners={},timers=new Map(),frames=new Map(),downloads=[],draws=[];
  let clock=0,serial=0,observer;
  const track={stopped:false,stop(){this.stopped=true;}};
  const ctx={globalAlpha:1,stack:[],save(){this.stack.push(this.globalAlpha);},restore(){this.globalAlpha=this.stack.pop();},
    fillText(text){draws.push({text,alpha:this.globalAlpha});},measureText(t){return {width:t.length*20};},
    createLinearGradient(){return {addColorStop(){}};}};
  for(const k of ['fillRect','setLineDash','beginPath','moveTo','lineTo','stroke','arc','fill','drawImage','translate','rotate','roundRect'])ctx[k]=()=>{};
  const canvas={width:1080,height:1920,getContext:()=>ctx,captureStream:()=>({getTracks:()=>[track]}),toBlob(cb){cb(new Blob(['png']));}};
  const controls=[{},{},{},{}],cancel={hidden:true},status={textContent:''};
  const download={children:[],replaceChildren(...items){this.children=items;}};
  const section={hidden:false,classList:{contains(){return section.hidden;}}};
  const root={innerHTML:'',contains:()=>true,querySelectorAll:()=>controls,querySelector:()=>cancel};
  const document={hidden:false,readyState:'complete',getElementById(id){return ({v105MotionRoot:root,v105MotionStatus:status,v105MotionDownload:download,motionStudio:section,v105MotionCanvas:root.innerHTML.includes('id="v105MotionCanvas"')?canvas:null})[id];},
    addEventListener(type,fn){listeners[type]=fn;},createElement(){return {click(){downloads.push(this.download);},remove(){}};},body:{appendChild(){}}};
  class Recorder {
    static isTypeSupported(){return supported;}
    constructor(){if(constructorFails)throw new Error('encoder unavailable');Recorder.last=this;this.state='inactive';}
    start(){this.state='recording';}
    stop(){this.state='inactive';this.onstop?.();}
    data(size=20000){this.ondataavailable?.({data:new Blob(['x'.repeat(size)])});}
  }
  const sandbox={document,window:{addEventListener(type,fn){windowListeners[type]=fn;}},
    Image:class{set src(value){if(logoReady)this.onload();}},MutationObserver:class{constructor(fn){observer=fn;}observe(){}},
    navigator:{},performance:{now:()=>clock},requestAnimationFrame(fn){frames.set(++serial,fn);return serial;},cancelAnimationFrame(id){frames.delete(id);},
    setTimeout(fn,delay){timers.set(++serial,{fn,delay});return serial;},clearTimeout(id){timers.delete(id);},
    URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},Blob,MediaRecorder:Recorder};
  vm.runInNewContext(code,sandbox);
  function click(dataset){const button={dataset,hasAttribute(name){return ({'data-motion-topic':'motionTopic','data-motion-theme':'motionTheme','data-motion-copy':'motionCopy'})[name] in dataset;}};listeners.click({target:{closest:()=>button}});}
  function ready(t=0,p=0){click({motionTopic:String(t)});click({motion:'next'});click({motion:'next'});click({motionTheme:String(p)});click({motion:'next'});click({motion:'next'});}
  function advance(to){clock=to;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn(clock));}
  return {root,status,controls,cancel,download,draws,downloads,Recorder,track,canvas,click,ready,advance,frames,timers,
    hide(){document.hidden=true;listeners.visibilitychange();},leave(){section.hidden=true;observer();},pagehide(){windowListeners.pagehide();},stop(){sandbox.window.EFGCMotionStudio.stopPreview();}};
}

test('all 15 wizard choices retain five prompts and a readable PNG',()=>{
  for(let topic=0;topic<5;topic++)for(let palette=0;palette<3;palette++){
    const s=setup();s.click({motion:'next'});assert.match(s.root.innerHTML,/Stage 1/);
    s.click({motionTopic:String(topic)});s.click({motion:'next'});assert.match(s.root.innerHTML,/Stage 2/);
    s.click({motion:'next'});s.click({motion:'next'});assert.match(s.root.innerHTML,/Stage 3/);
    s.click({motionTheme:String(palette)});s.click({motion:'next'});assert.equal((s.root.innerHTML.match(/Copy poster prompt/g)||[]).length,5);
    s.click({motion:'next'});assert.equal((s.root.innerHTML.match(/Copy motion prompt/g)||[]).length,5);
    s.draws.length=0;s.click({motion:'poster'});
    assert(s.draws.some(d=>d.text==='SCENE 01'&&d.alpha>0.7));
    assert(s.draws.some(d=>d.text==='PASS ON THE BATON'&&d.alpha===1));
    assert.equal(s.downloads.length,1);
  }
});
test('only a complete foreground timeline exposes a deliberate download link',()=>{
  const s=setup();s.ready();s.click({motion:'export'});s.Recorder.last.data();
  for(let ms=0;ms<=30000;ms+=100)s.advance(ms);
  assert.equal(s.download.children.length,1);assert.equal(s.downloads.length,0);
  assert.match(s.status.textContent,/Tap Download/);assert(s.track.stopped);assert(s.controls.every(b=>!b.disabled));
  assert.equal(s.frames.size,0);assert.equal(s.timers.size,0);
});
test('error followed by late data and stop cannot publish a partial recording',()=>{
  const s=setup();s.ready();s.click({motion:'export'});const r=s.Recorder.last;
  const lateStop=r.onstop,lateData=r.ondataavailable;r.data();r.onerror();lateData({data:new Blob(['x'.repeat(20000)])});lateStop();
  assert.equal(s.download.children.length,0);assert.match(s.status.textContent,/failed/);assert(s.track.stopped);
});
for(const action of ['hide','leave','pagehide','stop'])test(action+' cancels and allows retry',()=>{
  const s=setup();s.ready();s.click({motion:'export'});s.Recorder.last.data();s[action]();
  assert.equal(s.download.children.length,0);assert(s.track.stopped);assert(s.cancel.hidden);assert(s.controls.every(b=>!b.disabled));
  assert.equal(s.frames.size,0);assert.equal(s.timers.size,0);
});
test('cancel button and early recorder stop discard data',()=>{
  for(const kind of ['cancel','early']){const s=setup();s.ready();s.click({motion:'export'});s.Recorder.last.data();
    if(kind==='cancel')s.click({motion:'cancel'});else s.Recorder.last.stop();
    assert.equal(s.download.children.length,0);assert(s.track.stopped);}
});
test('watchdog and long frame gaps fail closed',()=>{
  for(const kind of ['timeout','gap']){const s=setup();s.ready();s.click({motion:'export'});s.Recorder.last.data();
    if(kind==='timeout')[...s.timers.values()].find(t=>t.delay===35000).fn();else s.advance(1500);
    assert.equal(s.download.children.length,0);assert(s.track.stopped);assert(s.controls.every(b=>!b.disabled));}
});
test('PNG cannot rewind an active recording; repeated export cannot create another recorder',()=>{
  const s=setup();s.ready();s.click({motion:'export'});const recorder=s.Recorder.last;s.draws.length=0;
  s.click({motion:'poster'});s.click({motion:'export'});assert.equal(s.draws.length,0);assert.equal(s.downloads.length,0);assert.equal(s.Recorder.last,recorder);
});
test('unsupported encoder, missing logo and constructor failure recover cleanly',()=>{
  for(const options of [{supported:false},{logoReady:false},{constructorFails:true}]){
    const s=setup(options);s.ready();s.click({motion:'export'});assert.equal(s.download.children.length,0);assert(s.controls.every(b=>!b.disabled));
    if(options.constructorFails)assert(s.track.stopped);
  }
});
test('render failure during recording releases resources',()=>{
  const s=setup();s.ready();s.click({motion:'export'});s.canvas.getContext=()=>{throw new Error('lost context');};s.advance(100);
  assert.equal(s.download.children.length,0);assert(s.track.stopped);assert.match(s.status.textContent,/rendering failed/);
});
test('Motion Studio no longer uses Community Hub status or style names',()=>{
  assert(!code.includes('id="v105Status"'));assert(!code.includes('class="v105-actions"'));
  assert(!fs.readFileSync('v105-motion-studio.css','utf8').includes('.v105-actions'));
});
