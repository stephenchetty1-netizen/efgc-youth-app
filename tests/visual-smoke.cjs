// CI-only browser regression checks. All auth/data requests use synthetic fixtures.
const { chromium } = require('playwright');
const fs = require('fs');
const assert = require('node:assert/strict');
const BASE = process.env.EFGC_TEST_URL || 'http://127.0.0.1:8080/index.html';
const out = 'artifacts/v62-visual';
const sizes = [[360,800],[384,854],[412,915],[768,1024],[1440,1000]];
const user = { id:'00000000-0000-4000-8000-000000000062', email:'fixture@example.test' };
const auth = { access_token:'synthetic-test-token', refresh_token:'synthetic-refresh-token', user };
const profile = role => ({ id:user.id, full_name:'Test Member', phone:'+27710000000', birthday:'2005-01-01', face_photo_path:'fixture/photo.jpg', role, approval_status:'approved' });
const events = [{id:1,title:'Past fixture meeting',event_date:new Date(Date.now()-86400000).toISOString(),attendance_approved:true},{id:2,title:'Upcoming fixture meeting',event_date:new Date(Date.now()+86400000).toISOString(),attendance_approved:false}];
async function mockedPage(browser, size, opts = {}) {
  const page = await browser.newPage({viewport:{width:size[0],height:size[1]}});
  const errors = [], requests = [];
  page.on('pageerror', error => errors.push(error.message));
  let saved = opts.newUser ? null : profile(opts.role || 'youth');
  await page.route('https://*.supabase.co/**', async route => {
    const req=route.request(), url=new URL(req.url()); requests.push({path:url.pathname,method:req.method(),body:req.postDataJSON()});
    let body = [];
    if (url.pathname.endsWith('/user')) body=user;
    else if (url.pathname.endsWith('/token') || url.pathname.endsWith('/verify')) body=auth;
    else if (url.pathname.endsWith('/otp') || url.pathname.endsWith('/recover') || url.pathname.endsWith('/logout')) body={};
    else if (url.pathname.includes('/storage/')) body={signedURL:'/object/sign/member-photos/fixture.jpg'};
    else if (url.pathname.endsWith('/profiles')) {
      if (req.method()==='POST') saved={...(saved || profile(opts.role || 'youth')), ...req.postDataJSON()};
      body = saved ? [saved] : [];
    } else if (url.pathname.endsWith('/safeguarding_contacts')) body=[{youth_id:user.id}];
    else if (url.pathname.endsWith('/events')) body=events;
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  });
  if (opts.signedIn) await page.addInitScript(value => localStorage.setItem('efgcSupabaseAuth',JSON.stringify(value)),auth);
  return { page,errors,requests };
}
async function visible(page,selector) { await page.locator(selector).waitFor({state:'visible'}); }
async function noOverflow(page,label) {
  const dims=await page.evaluate(()=>({view:innerWidth,doc:document.documentElement.scrollWidth}));
  assert(dims.doc<=dims.view+2,`${label}: horizontal overflow ${JSON.stringify(dims)}`);
}
(async()=>{
  fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.launch({headless:true});
  try {
    for (const size of sizes) {
      const {page,errors}=await mockedPage(browser,size);
      const name=size.join('x');
      await page.goto(BASE); await visible(page,'#mockWelcome');
      await page.locator('.welcome-image').evaluate(img=>img.decode());
      await noOverflow(page,name);
      const asset=await page.locator('.welcome-image').evaluate(img=>({w:img.naturalWidth,h:img.naturalHeight}));
      assert.deepEqual(asset,{w:864,h:1536},'Supplied artwork must load unchanged');
      for (const id of ['v61Login','v61Create']) {
        const r=await page.locator('#'+id).boundingBox();
        assert(r.height>=44,`${name}: touch target too small`);
        assert(r.y+r.height<=size[1]+2,`${name}: primary action below viewport`);
      }
      await page.screenshot({path:`${out}/${name}-welcome.png`,fullPage:true});
      if (name === '384x854') console.log('EFGC_REVIEW_WELCOME='+(await page.screenshot({type:'jpeg',quality:80,fullPage:true})).toString('base64'));
      await page.click('#v61Login'); await visible(page,'#loginEmail');
      assert(!await page.locator('#nameField').isVisible(),'Existing-member login must not ask for registration details');
      await page.click('.login-type[data-role="admin"]'); await visible(page,'#passwordField'); await visible(page,'#forgotPasswordButton');
      await page.click('#forgotPasswordButton'); assert.match(await page.locator('#loginMessage').innerText(),/email address first/i);
      await noOverflow(page,`${name} login`);
      await page.screenshot({path:`${out}/${name}-admin-login.png`,fullPage:true});
      if (name === '384x854') console.log('EFGC_REVIEW_LOGIN='+(await page.screenshot({type:'jpeg',quality:80,fullPage:true})).toString('base64'));
      await page.click('.v61-back'); await page.click('#v61Create'); await visible(page,'#nameField'); await visible(page,'#youthSafeguardingFields');
      await page.click('.login-type[data-role="leader"]'); assert(!await page.locator('#youthSafeguardingFields').isVisible()); await visible(page,'#roleField');
      await noOverflow(page,`${name} registration`);
      assert.deepEqual(errors,[],`${name}: runtime errors`); await page.close();
    }
    // Sign-in and sign-up send different create_user flags; duplicate submits are blocked.
    for (const register of [false,true]) {
      const {page,requests,errors}=await mockedPage(browser,[384,854],{newUser:register});
      await page.goto(BASE); await page.click(register?'#v61Create':'#v61Login');
      await page.fill('#loginEmail',user.email); await page.click('#continueButton'); await visible(page,'#supabaseOtp');
      const otp=requests.filter(r=>r.path.endsWith('/otp'));
      assert.equal(otp.length,1); assert.equal(otp[0].body.create_user,register);
      assert(await page.locator('#continueButton').isDisabled());
      await page.fill('#supabaseOtp','123456'); await page.click('#verifyOtpButton');
      if (register) { await page.waitForFunction(()=>document.querySelector('#loginMessage').textContent.includes('Email verified. Complete your profile')); await visible(page,'#nameField'); }
      else { await visible(page,'#home'); await page.click('.userbar button'); await visible(page,'#mockWelcome'); assert(!await page.locator('.login-card').isVisible()); }
      assert.deepEqual(errors,[]); await page.close();
    }
    // Restored roles, dashboard navigation, event filtering, and logout.
    for (const role of ['youth','leader','admin']) {
      const {page,errors}=await mockedPage(browser,[412,915],{signedIn:true,role});
      await page.goto(BASE); await visible(page,'#home');
      await page.waitForFunction(()=>document.body.classList.contains('mock-authenticated'));
      for (const selector of ['.brand-logo','.hero-logo','.official-footer-logo']) {
        assert.match(await page.locator(selector).getAttribute('src'),/efgc-logo.svg\?v=62.0$/);
        await page.locator(selector).evaluate(img=>img.decode());
        assert(await page.locator(selector).evaluate(img=>img.naturalWidth>0),`${role} ${selector}: crest failed to load`);
      }
      await noOverflow(page,role+' home');
      await page.screenshot({path:`${out}/${role}-home.png`,fullPage:true});
      if (role==='admin') {
        await page.locator('#mockHomeDashboard').getByRole('button',{name:'Record Attendance',exact:true}).click();
        await visible(page,'#attendanceEventSelect');
      } else if (role==='leader') {
        await page.locator('#mockHomeDashboard').getByRole('button',{name:'Duty Roster',exact:true}).click();
        await visible(page,'#plannerRosterHost .module-heading');
      }
      await page.locator('#mockBottomNav').getByRole('button',{name:'Events',exact:true}).click();
      await visible(page,'#mockEventTabs');
      await page.getByRole('heading',{name:'Upcoming fixture meeting'}).waitFor({state:'visible'});
      assert(!await page.getByRole('heading',{name:'Past fixture meeting'}).isVisible());
      await page.locator('#mockEventTabs').getByRole('button',{name:'Past',exact:true}).click();
      await page.getByRole('heading',{name:'Past fixture meeting'}).waitFor({state:'visible'});
      await page.click('.userbar button'); await visible(page,'#mockWelcome');
      assert(!await page.locator('#attendanceAdmin').isVisible()); assert(!await page.locator('#plannerRoster').isVisible());
      assert.equal(await page.locator('#adminPanel').innerText(),'');
      assert.deepEqual(errors,[],role+' runtime errors'); await page.close();
    }
    // Real callback shape, synthetic token: recovery must show the form, never hide behind artwork.
    const {page,errors}=await mockedPage(browser,[384,854],{role:'admin'});
    await page.goto(BASE+'#access_token=synthetic-test-token&refresh_token=synthetic-refresh-token&type=recovery');
    await visible(page,'#passwordResetPanel'); assert(!await page.locator('#mockWelcome').isVisible());
    await page.screenshot({path:`${out}/password-recovery.png`,fullPage:true});
    assert.deepEqual(errors,[]); await page.close();
    console.log('V62 regression checks passed: 5 responsive sizes, login/register separation, OTP cooldown, role navigation, event filters, logout, and recovery. All auth mutations used synthetic fixtures.');
  } finally { await browser.close(); }
})().catch(error=>{ console.error(error.stack||error);process.exitCode=1; });
