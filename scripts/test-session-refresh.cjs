const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const code = fs.readFileSync('v60-auth-adapter.js', 'utf8');
function setup(fetch) {
  const storage = () => { const values = new Map(); return {getItem:k=>values.get(k)||null, setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)}; };
  const ctx = {window:{EFGC_SUPABASE:{url:'https://test.invalid',publishableKey:'test'}},localStorage:storage(),sessionStorage:storage(),fetch};
  vm.runInNewContext(code,ctx);
  return ctx.window.EFGCAuth;
}
const session = (id='A',token='old') => ({user:{id},access_token:token,refresh_token:'refresh-'+token});
const response = (data,status=200) => ({ok:status===200,status,headers:{get:()=> 'application/json'},json:async()=>data});
const deferred = () => {let resolve; const promise=new Promise(r=>resolve=r); return {promise,resolve};};
test('parallel expired requests share one refresh and all retry',async()=>{
  let refreshes=0;const gate=deferred();
  const auth=setup(async(url,options)=>{
    if(url.includes('/token?')){refreshes++;await gate.promise;return response(session('A','new'));}
    return options.headers.Authorization==='Bearer new'?response([{ok:true}]):response({message:'expired'},401);
  });
  auth.setSession(session());
  const reads=[auth.rest('profiles'),auth.rest('events'),auth.rest('attendance')];
  await new Promise(r=>setImmediate(r));
  assert.equal(refreshes,1);gate.resolve();
  assert.equal((await Promise.all(reads)).length,3);
  assert.equal(auth.accessToken(),'new');
});
test('logout during refresh cannot restore the previous account',async()=>{
  const gate=deferred();const auth=setup(async url=>url.includes('/token?')?gate.promise:response({}));
  auth.setSession(session());const refresh=auth.refresh();await auth.signOut();
  gate.resolve(response(session('A','new')));assert.equal(await refresh,null);assert.equal(auth.session(),null);
});
test('old refresh cannot replace a newly signed-in account',async()=>{
  const gate=deferred();const auth=setup(()=>gate.promise);
  auth.setSession(session());const refresh=auth.refresh();auth.setSession(session('B','B-token'));
  gate.resolve(response(session('A','new')));assert.equal(await refresh,null);assert.equal(auth.userId(),'B');
});
test('slow session restore cannot overwrite another account',async()=>{
  const gate=deferred();const auth=setup(()=>gate.promise);
  auth.setSession(session());const restore=auth.restoreSession();auth.setSession(session('B','B-token'));
  gate.resolve(response({id:'A'}));assert.equal(await restore,null);assert.equal(auth.userId(),'B');
});
test('temporary offline startup retains saved credentials',async()=>{
  const auth=setup(async()=>{throw new TypeError('Failed to fetch');});auth.setSession(session());
  assert.equal(await auth.restoreSession(),null);assert.equal(auth.userId(),'A');
});
